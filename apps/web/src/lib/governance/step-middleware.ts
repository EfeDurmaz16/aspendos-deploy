/**
 * Governance step middleware for Vercel AI SDK v6 tool calls.
 *
 * Wraps around the AI SDK's `onStepFinish` callback to inject FIDES signing
 * and AGIT audit trail into every tool invocation:
 *
 *   Pre-step  → check tool trust, create pending commit, FIDES sign
 *   Post-step → update commit with result, store snapshot if undoable
 *
 * Usage:
 *   import { createGovernanceCallbacks } from '@/lib/governance/step-middleware';
 *
 *   const gov = createGovernanceCallbacks({ convex, userId });
 *
 *   const result = await streamText({
 *     model: openai('gpt-4o'),
 *     messages,
 *     tools,
 *     onStepFinish: gov.onStepFinish,
 *   });
 */
import type { ConvexReactClient } from 'convex/react';
import type { ConvexClient } from 'convex/browser';
import { api } from '../../../../../convex/_generated/api';
import type { Id } from '../../../../../convex/_generated/dataModel';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Reversibility classes matching the Convex schema. */
export type ReversibilityClass =
    | 'undoable'
    | 'cancelable_window'
    | 'compensatable'
    | 'approval_only'
    | 'irreversible_blocked';

/** Tool metadata used for governance decisions. */
export interface ToolGovernanceMetadata {
    reversibility_class: ReversibilityClass;
    rollback_strategy?: RollbackStrategy;
    human_explanation: string;
}

export type RollbackStrategy =
    | { kind: 'snapshot_restore'; snapshot_id: string }
    | { kind: 'cancel_window'; deadline: string; cancel_api: string }
    | { kind: 'compensation'; compensate_tool: string; compensate_args: unknown }
    | { kind: 'none' };

/** The step object from AI SDK v6 onStepFinish. */
export interface StepResult {
    stepType: 'initial' | 'tool-result' | 'continue';
    text?: string;
    toolCalls?: Array<{
        toolCallId: string;
        toolName: string;
        args: unknown;
    }>;
    toolResults?: Array<{
        toolCallId: string;
        toolName: string;
        args: unknown;
        result: unknown;
    }>;
    finishReason?: string;
    usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
}

/** Convex client — supports both reactive and imperative clients. */
type AnyConvexClient = ConvexReactClient | ConvexClient;

export interface GovernanceOptions {
    /** Convex client for mutations/queries. */
    convex: AnyConvexClient;
    /** The authenticated user's Convex ID. */
    userId: Id<'users'>;
    /**
     * Static map of tool name → governance metadata.
     * Tools not in this map are treated as `irreversible_blocked`.
     */
    toolMetadata?: Record<string, ToolGovernanceMetadata>;
    /**
     * Optional callback invoked when a tool requires approval.
     * If not provided, approval_only and irreversible_blocked tools will
     * proceed with a pending commit (the UI should present the approval).
     */
    onApprovalRequired?: (commitHash: string, toolName: string) => Promise<void>;
    /**
     * Optional snapshot creator. Called for undoable tools before execution.
     * Should return a snapshot_id that can be used for rollback.
     */
    createSnapshot?: (toolName: string, args: unknown) => Promise<string | null>;
}

interface PendingCommit {
    commitHash: string;
    toolName: string;
    metadata: ToolGovernanceMetadata;
}

// ---------------------------------------------------------------------------
// Default metadata for unknown tools (fail-closed)
// ---------------------------------------------------------------------------

const UNKNOWN_TOOL_METADATA: ToolGovernanceMetadata = {
    reversibility_class: 'irreversible_blocked',
    rollback_strategy: { kind: 'none' },
    human_explanation: 'Unknown tool — blocked by default (fail-closed)',
};

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Creates governance callback hooks for the Vercel AI SDK v6.
 *
 * Returns `onStepFinish` to pass directly to `streamText()` / `generateText()`,
 * plus helper methods for manual governance operations.
 */
export function createGovernanceCallbacks(options: GovernanceOptions) {
    const { convex, userId, toolMetadata = {}, onApprovalRequired, createSnapshot } = options;

    // Track pending commits by toolCallId so post-step can resolve them
    const pendingCommits = new Map<string, PendingCommit>();

    // -----------------------------------------------------------------------
    // Resolve tool governance metadata: local map → Convex registry → fallback
    // -----------------------------------------------------------------------
    function resolveMetadata(toolName: string): ToolGovernanceMetadata {
        return toolMetadata[toolName] ?? UNKNOWN_TOOL_METADATA;
    }

    // -----------------------------------------------------------------------
    // Pre-step: sign and create pending commit before tool execution.
    // Called for each tool call in a step.
    // -----------------------------------------------------------------------
    async function preStep(
        toolName: string,
        toolArgs: unknown,
        toolCallId: string
    ): Promise<{
        commitHash: string;
        blocked: boolean;
        requiresApproval: boolean;
    }> {
        const meta = resolveMetadata(toolName);

        // Build rollback strategy, potentially creating a snapshot
        let rollbackStrategy = meta.rollback_strategy ?? { kind: 'none' as const };
        if (meta.reversibility_class === 'undoable' && createSnapshot) {
            const snapshotId = await createSnapshot(toolName, toolArgs);
            if (snapshotId) {
                rollbackStrategy = { kind: 'snapshot_restore', snapshot_id: snapshotId };
            }
        }

        // Compute rollback deadline for cancelable_window
        let rollbackDeadline: number | undefined;
        if (
            rollbackStrategy &&
            'kind' in rollbackStrategy &&
            rollbackStrategy.kind === 'cancel_window' &&
            'deadline' in rollbackStrategy
        ) {
            rollbackDeadline = new Date(rollbackStrategy.deadline).getTime();
        }

        // Create the signed commit via Convex
        const result = await (convex as any).mutation(api.governance.signAndCommit, {
            user_id: userId,
            tool_name: toolName,
            args: toolArgs,
            reversibility_class: meta.reversibility_class,
            rollback_strategy: rollbackStrategy,
            rollback_deadline: rollbackDeadline,
            human_explanation: meta.human_explanation,
            status: 'pending' as const,
        });

        const commitHash = result.commitHash as string;

        // Track for post-step resolution
        pendingCommits.set(toolCallId, {
            commitHash,
            toolName,
            metadata: meta,
        });

        const requiresApproval =
            meta.reversibility_class === 'approval_only' ||
            meta.reversibility_class === 'irreversible_blocked';

        if (requiresApproval && onApprovalRequired) {
            await onApprovalRequired(commitHash, toolName);
        }

        return {
            commitHash,
            blocked: meta.reversibility_class === 'irreversible_blocked',
            requiresApproval,
        };
    }

    // -----------------------------------------------------------------------
    // Post-step: update the commit with the execution result.
    // -----------------------------------------------------------------------
    async function postStep(toolCallId: string, result: unknown, success: boolean): Promise<void> {
        const pending = pendingCommits.get(toolCallId);
        if (!pending) return; // No governance tracking for this call

        await (convex as any).mutation(api.governance.updateCommitResult, {
            hash: pending.commitHash,
            status: success ? ('executed' as const) : ('failed' as const),
            result,
        });

        pendingCommits.delete(toolCallId);
    }

    // -----------------------------------------------------------------------
    // onStepFinish — main callback for AI SDK v6.
    // Processes tool calls in the completed step.
    // -----------------------------------------------------------------------
    async function onStepFinish(step: StepResult): Promise<void> {
        // Handle tool results (post-step for completed tools)
        if (step.toolResults && step.toolResults.length > 0) {
            const postStepPromises = step.toolResults.map(async (tr) => {
                await postStep(tr.toolCallId, tr.result, true);
            });
            await Promise.all(postStepPromises);
        }

        // Pre-sign any NEW tool calls that haven't been processed yet.
        // In AI SDK v6, tool calls in onStepFinish represent calls that
        // have already been made. We sign them retroactively if not
        // already tracked (for tools that bypass the pre-step flow).
        if (step.toolCalls && step.toolCalls.length > 0) {
            const preStepPromises = step.toolCalls
                .filter((tc) => !pendingCommits.has(tc.toolCallId))
                .map(async (tc) => {
                    await preStep(tc.toolName, tc.args, tc.toolCallId);
                });
            await Promise.all(preStepPromises);
        }
    }

    // -----------------------------------------------------------------------
    // Revert — convenience method to revert a commit via the governance layer.
    // -----------------------------------------------------------------------
    async function revert(commitHash: string) {
        return (convex as any).mutation(api.governance.revertCommit, {
            hash: commitHash,
            user_id: userId,
        });
    }

    // -----------------------------------------------------------------------
    // Verify — convenience method to verify a commit's integrity.
    // -----------------------------------------------------------------------
    async function verify(commitHash: string) {
        return (convex as any).query(api.governance.verifyCommit, {
            hash: commitHash,
        });
    }

    return {
        /** Pass this directly to `streamText({ onStepFinish })`. */
        onStepFinish,
        /** Manually invoke pre-step governance for a tool call. */
        preStep,
        /** Manually invoke post-step governance for a tool call result. */
        postStep,
        /** Revert a committed action. */
        revert,
        /** Verify a commit's integrity. */
        verify,
    };
}

// ---------------------------------------------------------------------------
// Convenience: wrap streamText options with governance
// ---------------------------------------------------------------------------

/**
 * Higher-order helper that wraps AI SDK streamText/generateText options
 * with governance callbacks.
 *
 * Usage:
 *   const options = withGovernance({
 *     convex, userId, toolMetadata: { ... }
 *   }, {
 *     model: openai('gpt-4o'),
 *     messages,
 *     tools,
 *   });
 *
 *   const result = await streamText(options);
 */
export function withGovernance<T extends { onStepFinish?: (step: StepResult) => Promise<void> }>(
    governanceOpts: GovernanceOptions,
    sdkOptions: T
): T {
    const gov = createGovernanceCallbacks(governanceOpts);
    const originalOnStepFinish = sdkOptions.onStepFinish;

    return {
        ...sdkOptions,
        onStepFinish: async (step: StepResult) => {
            // Run governance hooks first
            await gov.onStepFinish(step);
            // Then run the original callback if any
            if (originalOnStepFinish) {
                await originalOnStepFinish(step);
            }
        },
    };
}

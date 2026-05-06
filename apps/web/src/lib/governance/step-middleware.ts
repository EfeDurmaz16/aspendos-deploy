/**
 * Governance step middleware for Vercel AI SDK v6 tool calls.
 *
 * Wraps AI SDK tools to inject FIDES signing and AGIT audit trail into every
 * tool invocation:
 *
 *   Pre-step  → check tool trust, create pending commit, FIDES sign
 *   Post-step → append result commit, store snapshot if undoable
 *
 * Usage:
 *   import { createGovernanceCallbacks } from '@/lib/governance/step-middleware';
 *
 *   const gov = createGovernanceCallbacks({ convex, userId });
 *
 *   const result = await streamText(withGovernance({
 *     convex, userId
 *   }, {
 *     model: openai('gpt-5'),
 *     messages,
 *     tools,
 *   }));
 */

import type { ConvexClient } from 'convex/browser';
import type { ConvexReactClient } from 'convex/react';
import { api } from '../../../../../convex/_generated/api';
import type { Id } from '../../../../../convex/_generated/dataModel';
import { signGovernanceCommit } from './fides';

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
    approval_required?: boolean;
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
type GovernedTool = {
    execute?: (args: unknown, options?: { toolCallId?: string }) => unknown | Promise<unknown>;
    [key: string]: unknown;
};

function getConvexServiceSecret() {
    const secret = process.env.CONVEX_SERVICE_SECRET;
    if (!secret) {
        throw new Error('CONVEX_SERVICE_SECRET is not configured');
    }
    return secret;
}

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
     * If not provided, approval_only tools proceed with a pending commit
     * that the UI should present for human approval.
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
    const completedToolCalls = new Set<string>();

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

        const signature = await signGovernanceCommit({
            args: toolArgs,
            reversibility_class: meta.reversibility_class,
            status: 'pending',
            tool_name: toolName,
        });

        // Create the signed commit via Convex
        const result = await (convex as any).mutation(api.governance.signAndCommit, {
            service_secret: getConvexServiceSecret(),
            user_id: userId,
            tool_name: toolName,
            args: toolArgs,
            reversibility_class: meta.reversibility_class,
            rollback_strategy: rollbackStrategy,
            rollback_deadline: rollbackDeadline,
            human_explanation: meta.human_explanation,
            status: 'pending' as const,
            ...signature,
        });

        const commitHash = result.commitHash as string;

        // Track for post-step resolution
        pendingCommits.set(toolCallId, {
            commitHash,
            toolName,
            metadata: meta,
        });

        const requiresApproval =
            meta.approval_required === true || meta.reversibility_class === 'approval_only';

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
    // Post-step: append an immutable result commit after tool execution.
    // -----------------------------------------------------------------------
    async function postStep(toolCallId: string, result: unknown, success: boolean): Promise<void> {
        const pending = pendingCommits.get(toolCallId);
        if (!pending) {
            throw new Error(`Tool result ${toolCallId} has no pre-execution governance commit`);
        }

        const signature = await signGovernanceCommit({
            args: {
                prior_commit_hash: pending.commitHash,
                outcome: 'tool_result',
            },
            result,
            reversibility_class: pending.metadata.reversibility_class,
            status: success ? 'executed' : 'failed',
            tool_name: pending.toolName,
        });

        await (convex as any).mutation(api.governance.signAndCommit, {
            service_secret: getConvexServiceSecret(),
            user_id: userId,
            tool_name: pending.toolName,
            args: {
                prior_commit_hash: pending.commitHash,
                outcome: 'tool_result',
            },
            status: success ? ('executed' as const) : ('failed' as const),
            result,
            reversibility_class: pending.metadata.reversibility_class,
            rollback_strategy: pending.metadata.rollback_strategy,
            human_explanation: `Result for ${pending.metadata.human_explanation}`,
            ...signature,
        });

        pendingCommits.delete(toolCallId);
        completedToolCalls.add(toolCallId);
    }

    // -----------------------------------------------------------------------
    // onStepFinish — main callback for AI SDK v6.
    // Processes tool calls in the completed step.
    // -----------------------------------------------------------------------
    async function onStepFinish(step: StepResult): Promise<void> {
        // Handle tool results (post-step for completed tools)
        if (step.toolResults && step.toolResults.length > 0) {
            const postStepPromises = step.toolResults.map(async (tr) => {
                if (completedToolCalls.has(tr.toolCallId)) {
                    return;
                }
                await postStep(tr.toolCallId, tr.result, true);
            });
            await Promise.all(postStepPromises);
        }

        if (step.toolCalls && step.toolCalls.length > 0) {
            const ungoverned = step.toolCalls.filter(
                (tc) => !pendingCommits.has(tc.toolCallId) && !completedToolCalls.has(tc.toolCallId)
            );
            if (ungoverned.length > 0) {
                throw new Error(
                    `Tool calls reached onStepFinish without pre-execution governance: ${ungoverned
                        .map((tc) => tc.toolName)
                        .join(', ')}`
                );
            }
        }
    }

    // -----------------------------------------------------------------------
    // Revert — convenience method to revert a commit via the governance layer.
    // -----------------------------------------------------------------------
    async function revert(commitHash: string) {
        return (convex as any).mutation(api.governance.revertCommit, {
            service_secret: getConvexServiceSecret(),
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

function wrapGovernedTools(
    gov: ReturnType<typeof createGovernanceCallbacks>,
    tools: Record<string, GovernedTool>
) {
    let generatedToolCallId = 0;
    return Object.fromEntries(
        Object.entries(tools).map(([toolName, tool]) => {
            if (typeof tool.execute !== 'function') {
                return [toolName, tool];
            }

            const originalExecute = tool.execute.bind(tool);
            return [
                toolName,
                {
                    ...tool,
                    execute: async (args: unknown, options?: { toolCallId?: string }) => {
                        const toolCallId =
                            options?.toolCallId ?? `${toolName}:${generatedToolCallId++}`;
                        const pre = await gov.preStep(toolName, args, toolCallId);
                        if (pre.blocked) {
                            throw new Error(
                                `Tool ${toolName} blocked by governance before execution`
                            );
                        }
                        if (pre.requiresApproval) {
                            throw new Error(`Tool ${toolName} requires approval before execution`);
                        }

                        try {
                            const result = await originalExecute(args, options);
                            await gov.postStep(toolCallId, result, true);
                            return result;
                        } catch (error) {
                            await gov.postStep(
                                toolCallId,
                                {
                                    error: error instanceof Error ? error.message : 'Unknown error',
                                },
                                false
                            );
                            throw error;
                        }
                    },
                },
            ];
        })
    );
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
 *     model: openai('gpt-5'),
 *     messages,
 *     tools,
 *   });
 *
 *   const result = await streamText(options);
 */
export function withGovernance<
    T extends {
        onStepFinish?: (step: StepResult) => Promise<void>;
        tools?: Record<string, GovernedTool>;
    },
>(governanceOpts: GovernanceOptions, sdkOptions: T): T {
    const gov = createGovernanceCallbacks(governanceOpts);
    const originalOnStepFinish = sdkOptions.onStepFinish;

    return {
        ...sdkOptions,
        ...(sdkOptions.tools ? { tools: wrapGovernedTools(gov, sdkOptions.tools) } : {}),
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

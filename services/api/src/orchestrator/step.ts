import { getAgit } from '../audit/agit';
import { commitConvexGovernance } from '../governance/convex-governance';
import { getFides } from '../governance/fides';
import { createDefaultGuardChain } from '../lib/agent-guards';
import type { ReversibilityMetadata, ToolContext, ToolResult } from '../reversibility/types';
import { registry } from '../tools/registry';

export interface StepResult {
    toolName: string;
    metadata: ReversibilityMetadata;
    commitHash: string;
    result: ToolResult;
    blocked: boolean;
    awaitingApproval: boolean;
}

async function appendBlockedAuditCommit(
    toolName: string,
    args: unknown,
    ctx: ToolContext,
    metadata: ReversibilityMetadata,
    result: ToolResult
) {
    const fides = getFides();
    const signature = await fides.signGovernanceCommit(toolName, args, metadata, {
        result,
        status: 'failed',
    });

    const convexCommit = await commitConvexGovernance({
        userId: ctx.userId,
        toolName,
        args,
        metadata,
        fidesSignature: signature.signature,
        fidesDid: signature.did,
        status: 'failed',
        result,
    });
    if (convexCommit) {
        return convexCommit.commitHash;
    }

    const agit = getAgit();
    const commit = await agit.commitAction({
        userId: ctx.userId,
        toolName,
        args,
        metadata,
        fidesSignature: signature.signature,
        fidesDid: signature.did,
        type: 'blocked',
        result,
    });
    return commit.hash;
}

export async function runToolStep(
    toolName: string,
    args: unknown,
    ctx: ToolContext
): Promise<StepResult> {
    if (!ctx.sessionId) {
        throw new Error('Tool execution sessionId is required');
    }

    const metadata = registry.classify(toolName, args);
    const guardResult = await createDefaultGuardChain().evaluate({
        toolName,
        toolArgs: (args && typeof args === 'object' ? args : { value: args }) as Record<
            string,
            unknown
        >,
        userId: ctx.userId,
        sessionId: ctx.sessionId,
        agentId: ctx.agentId,
        toolCallCount: ctx.toolCallCount ?? 0,
        toolCallCountByName: ctx.toolCallCountByName ?? {},
        previousActions: ctx.previousActions ?? [],
    });

    if (guardResult.decision.type === 'block') {
        const blockedMetadata = {
            ...metadata,
            reversibility_class: 'irreversible_blocked' as const,
            approval_required: false,
            rollback_strategy: { kind: 'none' as const },
            human_explanation: guardResult.decision.reason,
        };
        const result = {
            success: false,
            error: guardResult.decision.reason,
        };
        const commitHash = await appendBlockedAuditCommit(
            toolName,
            args,
            ctx,
            blockedMetadata,
            result
        );
        return {
            toolName,
            metadata: blockedMetadata,
            commitHash,
            result,
            blocked: true,
            awaitingApproval: false,
        };
    }

    if (metadata.reversibility_class === 'irreversible_blocked') {
        const result = {
            success: false,
            error: metadata.human_explanation,
        };
        const commitHash = await appendBlockedAuditCommit(toolName, args, ctx, metadata, result);
        return {
            toolName,
            metadata,
            commitHash,
            result,
            blocked: true,
            awaitingApproval: false,
        };
    }

    const fides = getFides();
    const preGovernanceSignature = await fides.signGovernanceCommit(toolName, args, metadata, {
        status: 'pending',
    });

    const agit = getAgit();
    const convexPreCommit = await commitConvexGovernance({
        userId: ctx.userId,
        toolName,
        args,
        metadata,
        fidesSignature: preGovernanceSignature.signature,
        fidesDid: preGovernanceSignature.did,
        status: 'pending',
    });
    let preCommitHash = convexPreCommit?.commitHash;
    if (!preCommitHash) {
        const preCommit = await agit.commitAction({
            userId: ctx.userId,
            toolName,
            args,
            metadata,
            fidesSignature: preGovernanceSignature.signature,
            fidesDid: preGovernanceSignature.did,
            type: 'pre',
        });
        preCommitHash = preCommit.hash;
    }

    if (metadata.approval_required) {
        return {
            toolName,
            metadata,
            commitHash: preCommitHash,
            result: {
                success: false,
                error: 'Awaiting human approval',
            },
            blocked: false,
            awaitingApproval: true,
        };
    }

    const tool = registry.get(toolName);
    let result: ToolResult;

    if (tool) {
        try {
            result = await tool.execute(args, {
                ...ctx,
                commitHash: preCommitHash,
            });
        } catch (e: any) {
            result = { success: false, error: e?.message ?? 'Execution failed' };
        }
    } else {
        result = { success: false, error: `Tool ${toolName} not found` };
    }

    const postStatus = result.success ? 'executed' : 'failed';
    const postGovernanceSignature = await fides.signGovernanceCommit(toolName, args, metadata, {
        result,
        status: postStatus,
    });
    const convexPostCommit = await commitConvexGovernance({
        userId: ctx.userId,
        toolName,
        args,
        metadata,
        fidesSignature: postGovernanceSignature.signature,
        fidesDid: postGovernanceSignature.did,
        status: postStatus,
        result,
    });

    if (convexPreCommit && !convexPostCommit) {
        throw new Error('Convex governance post-commit failed after pre-commit');
    }

    if (!convexPostCommit) {
        await agit.commitAction({
            userId: ctx.userId,
            toolName,
            args,
            metadata,
            fidesSignature: postGovernanceSignature.signature,
            fidesDid: postGovernanceSignature.did,
            type: 'post',
            result,
        });
    }

    return {
        toolName,
        metadata,
        commitHash: preCommitHash,
        result,
        blocked: false,
        awaitingApproval: false,
    };
}

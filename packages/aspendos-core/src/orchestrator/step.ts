import { getAgit } from '../audit/agit';
import { getFides } from '../governance/fides';
import type { ReversibilityMetadata, ToolContext, ToolResult } from '../reversibility/types';
import { createDefaultGuardChain } from '../security/agent-guards';
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

    const approvalMetadata =
        guardResult.decision.type === 'require_approval'
            ? {
                  ...metadata,
                  approval_required: true,
                  human_explanation: guardResult.decision.reason,
              }
            : metadata;

    const fides = getFides();
    const preSignature = await fides.signGovernanceCommit(toolName, args, approvalMetadata, {
        status: 'pending',
    });

    const agit = getAgit();
    const preCommit = await agit.commitAction({
        userId: ctx.userId,
        toolName,
        args,
        metadata: approvalMetadata,
        fidesSignature: preSignature.signature,
        fidesDid: preSignature.did,
        type: 'pre',
    });

    if (approvalMetadata.approval_required) {
        return {
            toolName,
            metadata: approvalMetadata,
            commitHash: preCommit.hash,
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
                commitHash: preCommit.hash,
            });
        } catch (e: any) {
            result = { success: false, error: e?.message ?? 'Execution failed' };
        }
    } else {
        result = { success: false, error: `Tool ${toolName} not found` };
    }

    const postSignature = await fides.signGovernanceCommit(toolName, args, approvalMetadata, {
        parentHash: preCommit.hash,
        result,
        status: result.success ? 'executed' : 'failed',
    });

    await agit.commitAction({
        userId: ctx.userId,
        toolName,
        args,
        metadata: approvalMetadata,
        fidesSignature: postSignature.signature,
        fidesDid: postSignature.did,
        parentHash: preCommit.hash,
        type: 'post',
        result,
    });

    return {
        toolName,
        metadata: approvalMetadata,
        commitHash: preCommit.hash,
        result,
        blocked: false,
        awaitingApproval: false,
    };
}

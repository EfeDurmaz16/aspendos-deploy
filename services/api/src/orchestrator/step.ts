import { getAgit } from '../audit/agit';
import { commitConvexGovernance } from '../governance/convex-governance';
import { getFides } from '../governance/fides';
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

export async function runToolStep(
    toolName: string,
    args: unknown,
    ctx: ToolContext
): Promise<StepResult> {
    const metadata = registry.classify(toolName, args);

    if (metadata.reversibility_class === 'irreversible_blocked') {
        return {
            toolName,
            metadata,
            commitHash: '',
            result: {
                success: false,
                error: metadata.human_explanation,
            },
            blocked: true,
            awaitingApproval: false,
        };
    }

    const fides = getFides();
    const signResult = await fides.signToolCall(toolName, args, metadata);

    const agit = getAgit();
    const convexPreCommit = await commitConvexGovernance({
        userId: ctx.userId,
        toolName,
        args,
        metadata,
        status: 'pending',
    });
    let preCommitHash = convexPreCommit?.commitHash;
    if (!preCommitHash) {
        const preCommit = await agit.commitAction({
            userId: ctx.userId,
            toolName,
            args,
            metadata,
            fidesSignature: signResult.signature,
            fidesDid: signResult.did,
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

    const convexPostCommit = await commitConvexGovernance({
        userId: ctx.userId,
        toolName,
        args,
        metadata,
        status: result.success ? 'executed' : 'failed',
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
            fidesSignature: signResult.signature,
            fidesDid: signResult.did,
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

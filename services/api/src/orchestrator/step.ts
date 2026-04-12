import { getAgit } from '../audit/agit';
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
    ctx: ToolContext,
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
    const preCommit = await agit.commitAction({
        userId: ctx.userId,
        toolName,
        args,
        metadata,
        fidesSignature: signResult.signature,
        fidesDid: signResult.did,
        type: 'pre',
    });

    if (metadata.approval_required) {
        return {
            toolName,
            metadata,
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

    return {
        toolName,
        metadata,
        commitHash: preCommit.hash,
        result,
        blocked: false,
        awaitingApproval: false,
    };
}

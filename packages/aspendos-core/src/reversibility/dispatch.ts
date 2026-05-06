import { registry } from '../tools/registry';
import type { ReverseResult, ReversibilityMetadata, ToolContext } from './types';

export async function dispatchReverse(
    toolName: string,
    metadata: ReversibilityMetadata,
    ctx: ToolContext
): Promise<ReverseResult> {
    const tool = registry.get(toolName);
    if (!tool) {
        return { success: false, message: `Unknown tool: ${toolName}` };
    }

    if (!tool.reverse) {
        return { success: false, message: `Tool ${toolName} does not support reversal` };
    }

    const { reversibility_class } = metadata;

    if (reversibility_class === 'irreversible_blocked') {
        return {
            success: false,
            message: 'Action was blocked and never executed — nothing to reverse',
        };
    }

    if (reversibility_class === 'approval_only') {
        return { success: false, message: 'Approval-only actions must be reversed manually' };
    }

    if (!ctx.commitHash) {
        return { success: false, message: 'No commit hash — cannot identify action to reverse' };
    }

    if (reversibility_class === 'cancelable_window' && metadata.rollback_deadline) {
        const deadline = new Date(metadata.rollback_deadline).getTime();
        if (Date.now() > deadline) {
            return { success: false, message: 'Cancel window has expired' };
        }
    }

    return tool.reverse(ctx.commitHash, ctx);
}

import { dispatchReverse } from '../reversibility/dispatch';
import type { ReversibilityMetadata, ToolContext } from '../reversibility/types';
import { getAgit } from './agit';

export interface UndoResult {
    success: boolean;
    message: string;
    commitHash?: string;
    toolName?: string;
}

export async function handleUndoCommand(userId: string): Promise<UndoResult> {
    const agit = getAgit();
    const history = await agit.historyForUser(userId, 10);

    if (history.length === 0) {
        return { success: false, message: 'No actions to undo.' };
    }

    const latest = history[0];

    if (!latest.toolName || !latest.reversibilityClass || !latest.rollbackStrategy) {
        return {
            success: false,
            message: 'Last action is missing rollback metadata and cannot be safely undone.',
            commitHash: latest.hash,
        };
    }

    const ctx: ToolContext = {
        userId,
        commitHash: latest.hash,
    };

    const metadata: ReversibilityMetadata = {
        reversibility_class: latest.reversibilityClass,
        approval_required: false,
        rollback_strategy: latest.rollbackStrategy,
        human_explanation: latest.humanExplanation ?? 'Undo last action',
    };

    const result = await dispatchReverse(latest.toolName, metadata, ctx);

    if (result.success) {
        return {
            success: true,
            message: result.message,
            commitHash: latest.hash,
            toolName: latest.toolName,
        };
    }

    return {
        success: false,
        message: result.message,
        commitHash: latest.hash,
        toolName: latest.toolName,
    };
}

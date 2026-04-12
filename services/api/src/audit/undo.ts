import { getAgit } from './agit';
import { dispatchReverse } from '../reversibility/dispatch';
import type { ReversibilityMetadata, ToolContext } from '../reversibility/types';

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

    const ctx: ToolContext = {
        userId,
        commitHash: latest.hash,
    };

    const metadata: ReversibilityMetadata = {
        reversibility_class: 'undoable',
        approval_required: false,
        rollback_strategy: { kind: 'snapshot_restore', snapshot_id: latest.hash },
        human_explanation: 'Undo last action',
    };

    const result = await dispatchReverse('file.write', metadata, ctx);

    if (result.success) {
        return {
            success: true,
            message: result.message,
            commitHash: latest.hash,
        };
    }

    return {
        success: false,
        message: result.message,
        commitHash: latest.hash,
    };
}

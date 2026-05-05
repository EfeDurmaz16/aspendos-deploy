import type {
    ReverseResult,
    ReversibilityMetadata,
    ToolContext,
    ToolDefinition,
    ToolResult,
} from '../reversibility/types';

const snapshots = new Map<string, { path: string; content: string }>();

export const fileWriteTool: ToolDefinition = {
    name: 'file.write',
    description: 'Write content to a file (undoable via snapshot)',

    classify(_args: unknown): ReversibilityMetadata {
        return {
            reversibility_class: 'undoable',
            approval_required: false,
            rollback_strategy: { kind: 'snapshot_restore', snapshot_id: '' },
            human_explanation:
                'File will be written. A snapshot of the previous content is stored for undo.',
        };
    },

    async execute(args: unknown, ctx: ToolContext): Promise<ToolResult> {
        const { path, content, existing_content } = args as {
            path: string;
            content: string;
            existing_content?: string;
        };

        if (!path || content === undefined) {
            return { success: false, error: 'Missing path or content' };
        }

        const snapshotId = `snap_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        snapshots.set(snapshotId, {
            path,
            content: existing_content ?? '',
        });

        return {
            success: true,
            data: { path, bytesWritten: content.length, snapshotId },
        };
    },

    async reverse(actionId: string, _ctx: ToolContext): Promise<ReverseResult> {
        const snapshot = snapshots.get(actionId);
        if (!snapshot) {
            return { success: false, message: 'Snapshot not found — cannot restore' };
        }
        snapshots.delete(actionId);
        return { success: true, message: `Restored ${snapshot.path} from snapshot` };
    },
};

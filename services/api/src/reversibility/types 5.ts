export type ReversibilityClass =
    | 'undoable'
    | 'cancelable_window'
    | 'compensatable'
    | 'approval_only'
    | 'irreversible_blocked';

export type RollbackStrategy =
    | { kind: 'snapshot_restore'; snapshot_id: string }
    | { kind: 'cancel_window'; deadline: string; cancel_api: string }
    | { kind: 'compensation'; compensate_tool: string; compensate_args: unknown }
    | { kind: 'none' };

export interface ReversibilityMetadata {
    reversibility_class: ReversibilityClass;
    approval_required: boolean;
    rollback_strategy: RollbackStrategy;
    rollback_deadline?: string;
    human_explanation: string;
}

export const BADGE_COLOR: Record<ReversibilityClass, string> = {
    undoable: '#22c55e',
    cancelable_window: '#22c55e',
    compensatable: '#eab308',
    approval_only: '#f59e0b',
    irreversible_blocked: '#ef4444',
};

export const BADGE_LABEL: Record<ReversibilityClass, string> = {
    undoable: 'Undoable',
    cancelable_window: 'Cancel Window',
    compensatable: 'Compensatable',
    approval_only: 'Approval Required',
    irreversible_blocked: 'Blocked',
};

export interface ToolDefinition {
    name: string;
    description: string;
    classify(args: unknown): ReversibilityMetadata;
    execute(args: unknown, ctx: ToolContext): Promise<ToolResult>;
    reverse?(actionId: string, ctx: ToolContext): Promise<ReverseResult>;
}

export interface ToolContext {
    userId: string;
    commitHash?: string;
    snapshotId?: string;
}

export interface ToolResult {
    success: boolean;
    data?: unknown;
    error?: string;
}

export interface ReverseResult {
    success: boolean;
    message: string;
}

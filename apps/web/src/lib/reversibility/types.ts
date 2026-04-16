/**
 * Reversibility Model — Type Definitions
 *
 * Every agent action is classified by how reversible it is.
 * This determines the UI treatment (badge color, undo capability)
 * and the runtime behavior (block, hold, approve, or execute).
 */

// ── Core enum ────────────────────────────────────────────────
export type ReversibilityClass =
    | 'undoable'
    | 'cancelable_window'
    | 'compensatable'
    | 'approval_only'
    | 'irreversible_blocked';

// ── Rollback strategy discriminated union ────────────────────
export type RollbackStrategy =
    | { kind: 'snapshot_restore'; snapshot_id: string }
    | { kind: 'cancel_window'; deadline_ms: number; cancel_endpoint: string }
    | { kind: 'compensation'; compensate_tool: string; compensate_args: Record<string, unknown> }
    | { kind: 'manual'; instructions: string }
    | { kind: 'none' };

// ── Per-class visual + behavioral metadata ───────────────────
export interface ReversibilitySpec {
    label: string;
    emoji: string;
    color: string; // tailwind bg class token
    textColor: string; // tailwind text class token
    borderColor: string; // tailwind border class token
    description: string;
    canUndo: boolean;
}

export const REVERSIBILITY_SPECS: Record<ReversibilityClass, ReversibilitySpec> = {
    undoable: {
        label: 'Undoable',
        emoji: '\u{1F7E2}', // green circle
        color: 'bg-green-500/20',
        textColor: 'text-green-400',
        borderColor: 'border-green-500/30',
        description: 'Instant undo via snapshot restore. Zero risk.',
        canUndo: true,
    },
    cancelable_window: {
        label: 'Cancel Window',
        emoji: '\u{1F7E1}', // yellow circle
        color: 'bg-yellow-500/20',
        textColor: 'text-yellow-400',
        borderColor: 'border-yellow-500/30',
        description: 'Action is held for a cancel window before execution.',
        canUndo: true,
    },
    compensatable: {
        label: 'Compensatable',
        emoji: '\u{1F7E0}', // orange circle
        color: 'bg-orange-500/20',
        textColor: 'text-orange-400',
        borderColor: 'border-orange-500/30',
        description: 'A reverse action can undo the effect (e.g. delete the created resource).',
        canUndo: true,
    },
    approval_only: {
        label: 'Approval Required',
        emoji: '\u{1F534}', // red circle
        color: 'bg-red-500/20',
        textColor: 'text-red-400',
        borderColor: 'border-red-500/30',
        description: 'Requires human approval before execution. Shown in approval card.',
        canUndo: false,
    },
    irreversible_blocked: {
        label: 'Blocked',
        emoji: '\u26D4', // no entry
        color: 'bg-red-700/20',
        textColor: 'text-red-500',
        borderColor: 'border-red-700/40',
        description: 'Agent refuses to execute. Too dangerous without explicit human override.',
        canUndo: false,
    },
};

// ── Commit shape (mirrors Convex schema) ─────────────────────
export interface AgitCommit {
    _id: string;
    user_id: string;
    parent_hash?: string;
    hash: string;
    ancestor_chain?: string[];
    tool_name: string;
    args: unknown;
    status: 'pending' | 'executed' | 'reverted' | 'failed';
    result?: unknown;
    reversibility_class: ReversibilityClass;
    rollback_strategy?: RollbackStrategy;
    rollback_deadline?: number;
    human_explanation?: string;
    fides_signature?: string;
    fides_signer_did?: string;
    counter_signature?: string;
    counter_signer_did?: string;
    timestamp: number;
}

// ── Tool definition interface ────────────────────────────────
export interface ReversibleToolDef {
    name: string;
    description: string;
    reversibility_class: ReversibilityClass;
    classify(args: Record<string, unknown>): {
        reversibility_class: ReversibilityClass;
        rollback_strategy: RollbackStrategy;
        human_explanation: string;
    };
    execute(args: Record<string, unknown>): Promise<ToolExecutionResult>;
    rollback?(commit: AgitCommit): Promise<RollbackResult>;
}

export interface ToolExecutionResult {
    success: boolean;
    data?: unknown;
    error?: string;
    snapshot_id?: string;
}

export interface RollbackResult {
    success: boolean;
    message: string;
    reverted_commit_hash?: string;
}

// ── Undo request/response ────────────────────────────────────
export interface UndoRequest {
    commit_hash: string;
}

export interface UndoResponse {
    success: boolean;
    message: string;
    reverted_hashes?: string[];
}

export interface RewindRequest {
    target_hash: string;
    user_id: string;
}

export interface RewindResponse {
    success: boolean;
    message: string;
    reverted_count: number;
    reverted_hashes: string[];
    failed_hashes: string[];
}

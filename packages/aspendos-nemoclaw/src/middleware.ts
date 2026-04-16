import type { GovernedResult, NemoClawContext } from './types';

type ReversibilityClass =
    | 'undoable'
    | 'cancelable_window'
    | 'compensatable'
    | 'approval_only'
    | 'irreversible_blocked';

const BADGE: Record<ReversibilityClass, string> = {
    undoable: '🟢',
    cancelable_window: '🟢',
    compensatable: '🟡',
    approval_only: '🟠',
    irreversible_blocked: '🔴',
};

export async function governedToolCall(
    toolName: string,
    args: unknown,
    ctx: NemoClawContext,
    executeFn: (args: unknown) => Promise<unknown>,
    classifyFn?: (toolName: string, args: unknown) => ReversibilityClass
): Promise<GovernedResult> {
    const cls = classifyFn?.(toolName, args) ?? 'compensatable';

    if (cls === 'irreversible_blocked') {
        return {
            status: 'blocked',
            commitHash: '',
            reversibilityClass: cls,
            badge: BADGE[cls],
            sandboxId: ctx.sandboxId,
            error: `Action "${toolName}" blocked by governance policy`,
        };
    }

    const commitHash = `nemo_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

    if (cls === 'approval_only') {
        return {
            status: 'awaiting_approval',
            commitHash,
            reversibilityClass: cls,
            badge: BADGE[cls],
            sandboxId: ctx.sandboxId,
        };
    }

    try {
        const result = await executeFn(args);
        return {
            status: 'executed',
            commitHash,
            reversibilityClass: cls,
            badge: BADGE[cls],
            sandboxId: ctx.sandboxId,
            result,
        };
    } catch (e: any) {
        return {
            status: 'blocked',
            commitHash,
            reversibilityClass: cls,
            badge: BADGE[cls],
            sandboxId: ctx.sandboxId,
            error: e?.message ?? 'Execution failed',
        };
    }
}

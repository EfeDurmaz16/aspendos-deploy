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

function normalizeForHash(value: unknown): unknown {
    if (Array.isArray(value)) {
        return value.map(normalizeForHash);
    }

    if (value && typeof value === 'object') {
        return Object.fromEntries(
            Object.entries(value)
                .sort(([left], [right]) => left.localeCompare(right))
                .map(([key, entry]) => [key, normalizeForHash(entry)])
        );
    }

    return value;
}

function canonicalJson(value: unknown): string {
    return JSON.stringify(normalizeForHash(value));
}

async function sha256Hex(payload: string): Promise<string> {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(payload));
    return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join(
        ''
    );
}

async function createCommitHash(
    toolName: string,
    args: unknown,
    ctx: NemoClawContext,
    reversibilityClass: ReversibilityClass
): Promise<string> {
    const payload = canonicalJson({
        actionId: ctx.actionId ?? null,
        args,
        reversibilityClass,
        sandboxId: ctx.sandboxId,
        securityProfile: ctx.securityProfile ?? null,
        toolName,
        userId: ctx.userId,
    });
    const digest = await sha256Hex(payload);

    return `nemo_${digest.slice(0, 40)}`;
}

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

    const commitHash = await createCommitHash(toolName, args, ctx, cls);

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

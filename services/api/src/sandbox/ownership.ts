import type { SandboxContext } from './types';

export function getSandboxOwnerKey(ctx: SandboxContext | undefined): string {
    const userId = ctx?.userId?.trim();
    if (!userId) {
        throw new Error('Sandbox user context required');
    }

    const sessionId = ctx?.sessionId?.trim();
    if (!sessionId) {
        throw new Error('Sandbox session context required');
    }

    return `${userId}:${sessionId}`;
}

export function assertSandboxOwner(
    owners: ReadonlyMap<string, string>,
    sandboxId: string,
    ctx: SandboxContext | undefined
) {
    const expectedOwner = owners.get(sandboxId);
    if (!expectedOwner) {
        throw new Error('Sandbox not found. Create a sandbox first.');
    }

    const ownerKey = getSandboxOwnerKey(ctx);
    if (ownerKey !== expectedOwner) {
        throw new Error('Sandbox does not belong to the current execution context');
    }
}

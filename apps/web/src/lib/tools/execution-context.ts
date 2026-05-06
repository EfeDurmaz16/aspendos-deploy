import type { ToolExecutionOptions } from 'ai';

type ToolContext = {
    userId?: unknown;
    sessionId?: unknown;
};

export function getToolOwnerKey(options: ToolExecutionOptions | undefined): string {
    const context = options?.experimental_context as ToolContext | undefined;
    const userId = typeof context?.userId === 'string' ? context.userId.trim() : '';
    if (!userId) {
        throw new Error('Tool execution user context required');
    }

    const sessionId = typeof context?.sessionId === 'string' ? context.sessionId.trim() : '';
    if (!sessionId) {
        throw new Error('Tool execution session context required');
    }

    return `${userId}:${sessionId}`;
}

export function assertToolOwner(
    expectedOwnerKey: string,
    options: ToolExecutionOptions | undefined
) {
    const ownerKey = getToolOwnerKey(options);
    if (ownerKey !== expectedOwnerKey) {
        throw new Error('Tool session does not belong to the current execution context');
    }
}

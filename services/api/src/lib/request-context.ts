/**
 * Request Context Propagation
 * Uses AsyncLocalStorage to carry request metadata through async operations
 *
 * Features:
 * - Automatic context propagation without explicit passing
 * - Carries traceId, userId, requestId
 * - Works across async boundaries
 * - Zero performance overhead when not used
 */

import { AsyncLocalStorage } from 'node:async_hooks';

export interface RequestContext {
    traceId: string;
    requestId: string;
    userId?: string;
    spanId?: string;
}

const asyncLocalStorage = new AsyncLocalStorage<RequestContext>();

/**
 * Get the current request context
 * Returns undefined if called outside of a request context
 */
export function getRequestContext(): RequestContext | undefined {
    return asyncLocalStorage.getStore();
}

/**
 * Execute a function within a request context
 * All async operations within the function will have access to the context
 */
export function withRequestContext<T>(
    context: RequestContext,
    fn: () => T | Promise<T>
): T | Promise<T> {
    return asyncLocalStorage.run(context, fn);
}

/**
 * Get trace ID from current context
 */
export function getTraceId(): string | undefined {
    return asyncLocalStorage.getStore()?.traceId;
}

/**
 * Get request ID from current context
 */
export function getRequestId(): string | undefined {
    return asyncLocalStorage.getStore()?.requestId;
}

/**
 * Get user ID from current context
 */
export function getUserId(): string | undefined {
    return asyncLocalStorage.getStore()?.userId;
}

/**
 * Get span ID from current context
 */
export function getSpanId(): string | undefined {
    return asyncLocalStorage.getStore()?.spanId;
}

/**
 * Set user ID in current context (useful for auth middleware)
 */
export function setUserId(userId: string): void {
    const store = asyncLocalStorage.getStore();
    if (store) {
        store.userId = userId;
    }
}

/**
 * Create a child context with updated values
 */
export function withUpdatedContext<T>(
    updates: Partial<RequestContext>,
    fn: () => T | Promise<T>
): T | Promise<T> {
    const current = asyncLocalStorage.getStore();
    if (!current) {
        throw new Error('withUpdatedContext called outside of request context');
    }
    return asyncLocalStorage.run({ ...current, ...updates }, fn);
}

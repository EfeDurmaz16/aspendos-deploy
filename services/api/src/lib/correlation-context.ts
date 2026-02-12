/**
 * Correlation Context Propagation
 * Uses AsyncLocalStorage to propagate correlation IDs across async boundaries
 *
 * Features:
 * - Automatic correlation ID propagation without explicit passing
 * - Carries correlationId, requestId, userId, traceId, spanId, startTime
 * - Works across async boundaries (timers, promises, event handlers)
 * - Supports nested contexts with inherited values
 * - Zero performance overhead when not used
 *
 * Unlike request-context.ts which focuses on trace/span propagation for
 * distributed tracing, this module provides a higher-level correlation
 * context that ties together all identifiers for a single logical operation.
 */

import { AsyncLocalStorage } from 'node:async_hooks';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CorrelationContext {
    /** Stable ID that follows a request across service boundaries */
    correlationId: string;
    /** Unique ID for this specific HTTP request */
    requestId: string;
    /** Authenticated user ID, set after auth middleware resolves */
    userId?: string;
    /** Distributed trace ID (W3C / OpenTelemetry compatible) */
    traceId?: string;
    /** Current span ID within the trace */
    spanId?: string;
    /** Timestamp (ms) when the context was created */
    startTime: number;
}

// ─── Storage ──────────────────────────────────────────────────────────────────

export const correlationStorage = new AsyncLocalStorage<CorrelationContext>();

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Generate a new correlation ID.
 * Uses crypto.randomUUID which is available in Node 19+ and all Bun versions.
 */
function generateCorrelationId(): string {
    return crypto.randomUUID();
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Execute a function within a correlation context.
 * Merges the provided partial context with sensible defaults.
 * Any field not supplied will be auto-generated or left undefined.
 */
export function runWithContext<T>(
    context: Partial<CorrelationContext>,
    fn: () => Promise<T>,
): Promise<T> {
    const fullContext: CorrelationContext = {
        correlationId: context.correlationId ?? generateCorrelationId(),
        requestId: context.requestId ?? generateCorrelationId(),
        userId: context.userId,
        traceId: context.traceId,
        spanId: context.spanId,
        startTime: context.startTime ?? Date.now(),
    };

    return correlationStorage.run(fullContext, fn);
}

/**
 * Get the current correlation context.
 * Returns undefined if called outside of a correlation context.
 */
export function getContext(): CorrelationContext | undefined {
    return correlationStorage.getStore();
}

/**
 * Get the current correlation ID.
 * If no context is active, generates and returns a new UUID
 * so callers always receive a usable value for logging / headers.
 */
export function getCorrelationId(): string {
    const store = correlationStorage.getStore();
    if (store) {
        return store.correlationId;
    }
    return generateCorrelationId();
}

/**
 * Get the current request ID from the active context.
 */
export function getRequestId(): string | undefined {
    return correlationStorage.getStore()?.requestId;
}

/**
 * Get the current user ID from the active context.
 */
export function getUserId(): string | undefined {
    return correlationStorage.getStore()?.userId;
}

/**
 * Mutate the userId on the current context in place.
 * Useful when the auth middleware resolves after the context is created.
 */
export function setUserId(userId: string): void {
    const store = correlationStorage.getStore();
    if (store) {
        store.userId = userId;
    }
}

/**
 * Get elapsed time (ms) since the context was created.
 * Returns 0 if no context is active.
 */
export function getElapsedTime(): number {
    const store = correlationStorage.getStore();
    if (store) {
        return Date.now() - store.startTime;
    }
    return 0;
}

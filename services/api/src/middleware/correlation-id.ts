/**
 * Correlation ID Middleware for Hono
 * Wraps each incoming request in a CorrelationContext so that every async
 * operation spawned during request handling can access a stable correlation ID.
 *
 * Behaviour:
 * - Extracts an existing correlation ID from the `X-Correlation-Id` request header
 * - If absent, generates a new UUID
 * - Captures requestId, traceId, and spanId from the Hono context (set by
 *   earlier middleware such as the tracing middleware)
 * - Enriches the context with userId once auth middleware has resolved
 * - Sets `X-Correlation-Id` on every response for downstream traceability
 *
 * This middleware is designed to sit early in the middleware stack, ideally
 * right after the tracing middleware so that traceId / spanId are available.
 */

import type { Context, Next } from 'hono';
import {
    runWithContext,
    setUserId as setCorrelationUserId,
    type CorrelationContext,
} from '../lib/correlation-context';

/**
 * Create the correlation ID middleware.
 * Returns a standard Hono middleware function.
 */
export function correlationIdMiddleware() {
    return async (c: Context, next: Next) => {
        // 1. Extract or generate the correlation ID
        const incomingCorrelationId = c.req.header('x-correlation-id');
        const correlationId = incomingCorrelationId || crypto.randomUUID();

        // 2. Read IDs that earlier middleware may have placed on the context
        const requestId: string = c.get('requestId') || crypto.randomUUID();
        const traceId: string | undefined = c.get('traceId') || undefined;
        const spanId: string | undefined = c.get('spanId') || undefined;

        // 3. Build the partial context
        const partial: Partial<CorrelationContext> = {
            correlationId,
            requestId,
            traceId,
            spanId,
            startTime: Date.now(),
        };

        // Capture userId if it is already available (e.g. from session middleware)
        const userId: string | undefined = c.get('userId') || undefined;
        if (userId) {
            partial.userId = userId;
        }

        // 4. Set the response header early so it is present even on errors
        c.header('X-Correlation-Id', correlationId);

        // 5. Run the remaining middleware chain inside the correlation context
        await runWithContext(partial, async () => {
            await next();

            // After downstream middleware (including auth) has run, capture
            // the userId into the correlation context if it was not available
            // at context creation time.
            if (!userId) {
                const resolvedUserId: string | undefined = c.get('userId') || undefined;
                if (resolvedUserId) {
                    setCorrelationUserId(resolvedUserId);
                }
            }
        });
    };
}

export default correlationIdMiddleware;

import type { AuthUser } from '../middleware/auth';

declare module 'hono' {
    interface ContextVariableMap {
        user: AuthUser | null;
        userId: string | null;
        session: unknown | null;
        requestId: string;
        traceId: string;
        spanId: string;
        rootSpan: unknown;
        trace: unknown;
        currentSpan: unknown;
        cspNonce: string;
        validatedBody: unknown;
        validatedQuery: unknown;
        validatedParams: unknown;
    }
}

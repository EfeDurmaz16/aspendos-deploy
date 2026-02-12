import * as Sentry from '@sentry/node';

export function initSentry() {
    if (!process.env.SENTRY_DSN) {
        console.warn('[Sentry] DSN not configured, error tracking disabled');
        return;
    }

    Sentry.init({
        dsn: process.env.SENTRY_DSN,
        environment: process.env.NODE_ENV || 'development',
        tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,
        enabled: process.env.NODE_ENV === 'production',
        integrations: [
            Sentry.httpIntegration(),
            Sentry.captureConsoleIntegration({ levels: ['error'] }),
        ],
    });

    console.log('[Sentry] Initialized for API service');
}

/**
 * Set user context in Sentry for better error attribution
 */
export function setSentryUserContext(userId: string, tier?: string) {
    Sentry.setUser({ id: userId });
    if (tier) {
        Sentry.setTag('user.tier', tier);
    }
}

/**
 * Set request context in Sentry for better debugging
 */
export function setSentryRequestContext(requestId: string, path: string, method: string) {
    Sentry.setTag('request.id', requestId);
    Sentry.setTag('request.path', path);
    Sentry.setTag('request.method', method);
}

/**
 * Start a performance transaction
 */
export function startTransaction(name: string, op: string) {
    return Sentry.startSpan({ name, op });
}

/**
 * Measure async operation performance
 */
export function measureAsync<T>(name: string, op: string, fn: () => Promise<T>): Promise<T> {
    return Sentry.startSpan({ name, op }, async () => {
        return fn();
    });
}

/**
 * Capture API error with rich context and classification
 */
export function captureApiError(
    error: Error,
    context: {
        userId?: string;
        action?: string;
        severity?: 'fatal' | 'error' | 'warning' | 'info';
    }
) {
    Sentry.withScope((scope) => {
        if (context.userId) scope.setUser({ id: context.userId });
        if (context.action) scope.setTag('action', context.action);
        if (context.severity) scope.setLevel(context.severity);
        scope.setTag('source', 'api');
        Sentry.captureException(error);
    });
}

export { Sentry };

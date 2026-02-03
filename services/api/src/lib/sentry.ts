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

export { Sentry };

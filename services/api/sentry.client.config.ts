/**
 * Sentry Client Configuration for Next.js
 *
 * This file configures Sentry for the browser/client side.
 */
import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;
const ENVIRONMENT = process.env.NEXT_PUBLIC_ENVIRONMENT || process.env.NODE_ENV || 'development';

if (SENTRY_DSN) {
    Sentry.init({
        dsn: SENTRY_DSN,
        environment: ENVIRONMENT,

        // Adjust this value in production, or use tracesSampler for greater control
        tracesSampleRate: ENVIRONMENT === 'production' ? 0.1 : 1.0,

        // Setting this option to true will print useful information to the console while you're setting up Sentry.
        debug: false,

        // Replay configuration
        replaysOnErrorSampleRate: ENVIRONMENT === 'production' ? 1.0 : 0,
        replaysSessionSampleRate: ENVIRONMENT === 'production' ? 0.1 : 0,

        integrations: [
            Sentry.replayIntegration({
                maskAllText: true,
                blockAllMedia: true,
            }),
        ],

        // Filter out errors we don't care about
        ignoreErrors: [
            // Browser extensions
            'ResizeObserver loop limit exceeded',
            'Non-Error promise rejection captured',
            // Network errors
            'NetworkError',
            'Failed to fetch',
        ],

        beforeSend(event) {
            // Don't send events if in development
            if (ENVIRONMENT === 'development') {
                return null;
            }
            return event;
        },
    });

    console.log('[Sentry] Initialized for client (Next.js)');
} else {
    console.log('[Sentry] DSN not configured for client, error tracking disabled');
}

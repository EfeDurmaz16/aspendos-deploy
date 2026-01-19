/**
 * Sentry Server Configuration for Next.js
 *
 * This file configures Sentry for the server side (API routes, SSR).
 */
import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.SENTRY_DSN;
const ENVIRONMENT = process.env.NODE_ENV || 'development';

if (SENTRY_DSN) {
    Sentry.init({
        dsn: SENTRY_DSN,
        environment: ENVIRONMENT,

        // Adjust this value in production
        tracesSampleRate: ENVIRONMENT === 'production' ? 0.1 : 1.0,

        // Setting this option to true will print useful information to the console while you're setting up Sentry.
        debug: false,

        integrations: [
            Sentry.httpIntegration(),
            Sentry.captureConsoleIntegration({ levels: ['error'] }),
        ],

        beforeSend(event) {
            // Don't send events if in development
            if (ENVIRONMENT === 'development') {
                return null;
            }
            return event;
        },
    });

    console.log('[Sentry] Initialized for server (Next.js)');
} else {
    console.log('[Sentry] DSN not configured for server, error tracking disabled');
}

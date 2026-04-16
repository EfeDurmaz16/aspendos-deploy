/**
 * Sentry Server Configuration
 *
 * This file configures Sentry for the server-side (Node.js).
 */
import * as Sentry from '@sentry/nextjs';

Sentry.init({
    dsn: process.env.SENTRY_DSN,

    // Set environment
    environment: process.env.NODE_ENV || 'development',

    // Adjust this value in production, or use tracesSampler for greater control
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // Setting this option to true will print useful information to the console while you're setting up Sentry.
    debug: false,

    integrations: [
        Sentry.httpIntegration(),
        Sentry.captureConsoleIntegration({ levels: ['error'] }),
    ],

    // Filter out local development errors
    beforeSend(event) {
        // Don't send events in development unless explicitly enabled
        if (process.env.NODE_ENV === 'development' && !process.env.SENTRY_DSN) {
            return null;
        }
        return event;
    },
});

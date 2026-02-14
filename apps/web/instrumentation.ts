import * as Sentry from '@sentry/nextjs';
import { validateEnv } from '@/lib/env';

export async function register() {
    validateEnv();

    if (process.env.NEXT_RUNTIME === 'nodejs') {
        await import('./sentry.server.config');
    }

    if (process.env.NEXT_RUNTIME === 'edge') {
        // Edge runtime Sentry config can be added here if needed
    }
}

export const onRequestError = Sentry.captureRequestError;

import type { Context, Next } from 'hono';

/**
 * Request timeout middleware.
 * Uses Promise.race to actually abort hung requests.
 */
export function requestTimeout(ms: number = 30000) {
    return async (c: Context, next: Next) => {
        const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('Request timeout')), ms);
        });

        try {
            await Promise.race([next(), timeoutPromise]);
        } catch (error) {
            if (error instanceof Error && error.message === 'Request timeout') {
                return c.json({ error: 'Request timeout', code: 'REQUEST_TIMEOUT' }, 408);
            }
            throw error;
        }
    };
}

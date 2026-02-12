import type { Context, Next } from 'hono';

/**
 * Request timeout middleware.
 * Prevents hung requests from consuming server resources.
 */
export function requestTimeout(ms: number = 30000) {
    return async (_c: Context, next: Next) => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), ms);

        try {
            await next();
        } finally {
            clearTimeout(timeout);
        }
    };
}

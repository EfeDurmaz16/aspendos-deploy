import { ConvexHttpClient } from 'convex/browser';

let _client: ConvexHttpClient | null = null;

/**
 * Server-side Convex client for use in API routes and server components.
 * Lazy-initialized to avoid build-time env var checks.
 */
export function getConvexServer(): ConvexHttpClient {
    if (_client) return _client;
    const url = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!url) throw new Error('NEXT_PUBLIC_CONVEX_URL is not set');
    _client = new ConvexHttpClient(url);
    return _client;
}

/** @deprecated Use getConvexServer() */
export const convexServer = new Proxy({} as ConvexHttpClient, {
    get(_, prop) {
        return (getConvexServer() as any)[prop];
    },
});

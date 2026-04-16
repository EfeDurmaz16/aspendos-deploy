import { ConvexHttpClient } from 'convex/browser';

if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
    throw new Error('NEXT_PUBLIC_CONVEX_URL is not set');
}

/**
 * Server-side Convex client for use in API routes and server components.
 * This is a stateless HTTP client — no WebSocket connection.
 */
export const convexServer = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

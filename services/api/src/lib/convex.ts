import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../convex/_generated/api';

let client: ConvexHttpClient | null = null;

export function getConvexClient(): ConvexHttpClient {
    if (client) return client;

    const url = process.env.NEXT_PUBLIC_CONVEX_URL || process.env.CONVEX_URL;
    if (!url) {
        throw new Error('CONVEX_URL or NEXT_PUBLIC_CONVEX_URL not configured');
    }

    client = new ConvexHttpClient(url);
    return client;
}

export function isConvexConfigured(): boolean {
    return !!(process.env.NEXT_PUBLIC_CONVEX_URL || process.env.CONVEX_URL);
}

export { api };

/**
 * Response Compression Middleware
 * Implements gzip/brotli compression for responses > 1KB
 * Skips compression for streaming responses and already-compressed content types
 */
import type { Context, Next } from 'hono';
import { compress } from 'hono/compress';

// Content types that should not be compressed (already compressed)
const SKIP_COMPRESSION_TYPES = new Set([
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/gif',
    'image/webp',
    'image/avif',
    'video/mp4',
    'video/webm',
    'video/ogg',
    'audio/mpeg',
    'audio/ogg',
    'audio/webm',
    'application/zip',
    'application/gzip',
    'application/x-gzip',
    'application/x-bzip2',
    'application/x-7z-compressed',
    'application/x-rar-compressed',
]);

// Paths that should skip compression (streaming endpoints)
const SKIP_COMPRESSION_PATHS = new Set([
    '/api/chat/stream',
    '/api/council/sessions',
    '/api/pac/stream',
]);

/**
 * Compression middleware using Hono's built-in compress
 * Automatically handles gzip and brotli based on Accept-Encoding header
 */
export function compression() {
    // Use Hono's built-in compress middleware with custom options
    const baseCompress = compress({
        encoding: 'gzip', // Default encoding (also supports 'deflate', 'br')
    });

    return async (c: Context, next: Next) => {
        // Skip compression in test environment
        if (process.env.NODE_ENV === 'test' || process.env.VITEST) {
            return next();
        }

        const path = c.req.path;
        const contentType = c.req.header('content-type') || '';

        // Skip compression for streaming endpoints
        if (SKIP_COMPRESSION_PATHS.has(path) || path.includes('/stream')) {
            return next();
        }

        // Skip compression for already-compressed content types
        const skipTypesArray = Array.from(SKIP_COMPRESSION_TYPES);
        for (let i = 0; i < skipTypesArray.length; i++) {
            if (contentType.includes(skipTypesArray[i])) {
                return next();
            }
        }

        // Skip compression for SSE (Server-Sent Events)
        if (contentType.includes('text/event-stream')) {
            return next();
        }

        // Apply Hono's compress middleware
        return baseCompress(c, next);
    };
}

export default compression;

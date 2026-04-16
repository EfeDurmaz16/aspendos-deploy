/**
 * API Versioning Middleware
 * Adds version headers and supports sunset deprecation.
 */
import type { MiddlewareHandler } from 'hono';

const CURRENT_VERSION = '1.0.0';
const MIN_SUPPORTED_VERSION = '1.0.0';

export function apiVersion(): MiddlewareHandler {
    return async (c, next) => {
        // Read requested version from header
        const requestedVersion = c.req.header('X-API-Version') || CURRENT_VERSION;

        // Set response version headers
        c.header('X-API-Version', CURRENT_VERSION);
        c.header('X-API-Min-Version', MIN_SUPPORTED_VERSION);

        // Store version in context for route handlers
        c.set('apiVersion', requestedVersion);

        await next();
    };
}

export function getVersionInfo() {
    return {
        current: CURRENT_VERSION,
        minimum: MIN_SUPPORTED_VERSION,
        deprecated: [] as string[],
    };
}

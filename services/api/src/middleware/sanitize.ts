/**
 * Input Sanitization Middleware
 *
 * XSS protection and input length validation for API requests.
 * Lightweight implementation without external dependencies.
 */

import type { Context, Next } from 'hono';

// ============================================
// XSS SANITIZATION
// ============================================

/**
 * Sanitize input string to prevent XSS attacks
 * - Strips HTML tags by replacing < > with HTML entities
 * - Removes script injections
 * - Trims whitespace
 */
export function sanitizeInput(input: string): string {
    if (typeof input !== 'string') return input;

    return (
        input
            .trim()
            // Remove script tags and their content (before entity encoding)
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            // Remove javascript: protocol
            .replace(/javascript:/gi, '')
            // Remove on* event handlers
            .replace(/on\w+\s*=/gi, '')
            // Replace < and > with HTML entities (after removing dangerous patterns)
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
    );
}

// ============================================
// INPUT LENGTH LIMITS
// ============================================

const INPUT_LIMITS = {
    MESSAGE_CONTENT: 32_000,
    CHAT_TITLE: 200,
    MEMORY_CONTENT: 10_000,
    SEARCH_QUERY: 500,
    API_KEY_NAME: 100,
    GENERIC_TEXT: 5_000,
} as const;

/**
 * Validate input length based on field type
 */
function validateLength(value: string, limit: number, fieldName: string): void {
    if (value.length > limit) {
        throw new Error(`${fieldName} exceeds maximum length of ${limit} characters`);
    }
}

/**
 * Input length validation middleware
 * Enforces length limits on common input fields
 */
export function inputLimits() {
    return async (c: Context, next: Next) => {
        const contentType = c.req.header('content-type');

        // Only validate JSON requests
        if (!contentType?.includes('application/json')) {
            return next();
        }

        try {
            const body = await c.req.json();

            // Message content validation
            if (body.content && typeof body.content === 'string') {
                validateLength(body.content, INPUT_LIMITS.MESSAGE_CONTENT, 'Message content');
            }
            if (body.message && typeof body.message === 'string') {
                validateLength(body.message, INPUT_LIMITS.MESSAGE_CONTENT, 'Message');
            }

            // Chat title validation
            if (body.title && typeof body.title === 'string') {
                validateLength(body.title, INPUT_LIMITS.CHAT_TITLE, 'Chat title');
            }

            // Memory content validation
            if (body.memory && typeof body.memory === 'string') {
                validateLength(body.memory, INPUT_LIMITS.MEMORY_CONTENT, 'Memory content');
            }

            // Search query validation
            if (body.query && typeof body.query === 'string') {
                validateLength(body.query, INPUT_LIMITS.SEARCH_QUERY, 'Search query');
            }

            // API key name validation
            if (body.name && typeof body.name === 'string' && c.req.path.includes('/api-keys')) {
                validateLength(body.name, INPUT_LIMITS.API_KEY_NAME, 'API key name');
            }

            // Generic text field validation (fallback)
            for (const [key, value] of Object.entries(body)) {
                if (
                    typeof value === 'string' &&
                    !['content', 'message', 'title', 'memory', 'query', 'name'].includes(key)
                ) {
                    if (value.length > INPUT_LIMITS.GENERIC_TEXT) {
                        validateLength(value, INPUT_LIMITS.GENERIC_TEXT, key);
                    }
                }
            }

            // Re-attach the validated body to the request
            c.req.bodyCache = { bodyCache: body };

            return next();
        } catch (error) {
            if (error instanceof Error && error.message.includes('exceeds maximum length')) {
                return c.json({ error: error.message, code: 'INPUT_TOO_LONG' }, 400);
            }
            // If parsing fails, let the next middleware handle it
            return next();
        }
    };
}

// ============================================
// DEEP SANITIZATION
// ============================================

/**
 * Recursively sanitize all string fields in an object
 */
function deepSanitize(obj: unknown): unknown {
    if (typeof obj === 'string') {
        return sanitizeInput(obj);
    }

    if (Array.isArray(obj)) {
        return obj.map((item) => deepSanitize(item));
    }

    if (obj !== null && typeof obj === 'object') {
        const sanitized: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(obj)) {
            sanitized[key] = deepSanitize(value);
        }
        return sanitized;
    }

    return obj;
}

/**
 * Deep sanitization middleware
 * Recursively sanitizes all string fields in request body
 */
export function sanitizeBody() {
    return async (c: Context, next: Next) => {
        const contentType = c.req.header('content-type');

        // Only sanitize JSON requests
        if (!contentType?.includes('application/json')) {
            return next();
        }

        // Skip sanitization for webhook endpoints (they need raw body for signature verification)
        const path = c.req.path;
        if (path.includes('/webhook')) {
            return next();
        }

        try {
            const body = await c.req.json();
            const sanitized = deepSanitize(body);

            // Re-attach the sanitized body to the request
            // Store in a custom property that can be accessed by route handlers
            c.set('sanitizedBody', sanitized);

            return next();
        } catch {
            // If JSON parsing fails, continue (let error handler deal with it)
            return next();
        }
    };
}

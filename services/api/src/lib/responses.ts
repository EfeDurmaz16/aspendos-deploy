/**
 * Standardized API Response Helpers
 *
 * Provides consistent error and success response formats across all API routes.
 */

import type { Context } from 'hono';

export interface ErrorResponse {
    error: {
        code: string;
        message: string;
    };
}

export interface SuccessResponse<T> {
    success: true;
    data: T;
}

type StatusCode = 200 | 201 | 400 | 401 | 403 | 404 | 408 | 409 | 413 | 429 | 500 | 503;

/**
 * Standardized error response format across all API routes.
 */
export function errorResponse(c: Context, status: StatusCode, code: string, message: string) {
    return c.json({ error: { code, message } }, status);
}

/**
 * Standardized success response.
 */
export function successResponse<T>(c: Context, data: T, status: 200 | 201 = 200) {
    return c.json(data, status);
}

// Common error codes
export const ErrorCodes = {
    // 400 Bad Request
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    INVALID_INPUT: 'INVALID_INPUT',
    MISSING_FIELD: 'MISSING_FIELD',

    // 401 Unauthorized
    UNAUTHORIZED: 'UNAUTHORIZED',
    INVALID_TOKEN: 'INVALID_TOKEN',

    // 403 Forbidden
    FORBIDDEN: 'FORBIDDEN',
    QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
    TIER_UPGRADE_REQUIRED: 'TIER_UPGRADE_REQUIRED',

    // 404 Not Found
    NOT_FOUND: 'NOT_FOUND',
    CHAT_NOT_FOUND: 'CHAT_NOT_FOUND',
    SESSION_NOT_FOUND: 'SESSION_NOT_FOUND',

    // 409 Conflict
    ALREADY_EXISTS: 'ALREADY_EXISTS',

    // 429 Too Many Requests
    RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',

    // 500 Internal Server Error
    INTERNAL_ERROR: 'INTERNAL_ERROR',
    SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
} as const;

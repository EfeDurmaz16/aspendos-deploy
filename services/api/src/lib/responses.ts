/**
 * Standardized API Response Helpers
 *
 * Provides consistent error and success response formats across all API routes.
 */

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

/**
 * Create a standardized error response
 *
 * @param code - Error code (e.g., "NOT_FOUND", "VALIDATION_ERROR")
 * @param message - Human-readable error message
 * @param status - HTTP status code
 * @returns Object with error and status
 */
export function errorResponse(code: string, message: string, status: number) {
    return {
        error: {
            code,
            message,
        },
        status,
    };
}

/**
 * Create a standardized success response
 *
 * @param data - Response data
 * @returns Object with success flag and data
 */
export function successResponse<T>(data: T): SuccessResponse<T> {
    return {
        success: true,
        data,
    };
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

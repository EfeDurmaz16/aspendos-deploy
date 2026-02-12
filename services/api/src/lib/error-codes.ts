/**
 * Centralized API Error Codes
 * Consistent error format across all endpoints.
 */

export interface ApiError {
    code: string;
    message: string;
    status: number;
}

const errors = {
    // Authentication
    UNAUTHORIZED: { code: 'UNAUTHORIZED', message: 'Authentication required', status: 401 },
    FORBIDDEN: { code: 'FORBIDDEN', message: 'Insufficient permissions', status: 403 },
    SESSION_EXPIRED: { code: 'SESSION_EXPIRED', message: 'Session has expired', status: 401 },
    INVALID_API_KEY: {
        code: 'INVALID_API_KEY',
        message: 'Invalid or expired API key',
        status: 401,
    },

    // Rate limiting
    RATE_LIMITED: { code: 'RATE_LIMITED', message: 'Too many requests', status: 429 },
    TIER_LIMIT_EXCEEDED: {
        code: 'TIER_LIMIT_EXCEEDED',
        message: 'Usage limit exceeded for your tier',
        status: 429,
    },

    // Validation
    VALIDATION_ERROR: { code: 'VALIDATION_ERROR', message: 'Invalid request data', status: 400 },
    INPUT_TOO_LONG: {
        code: 'INPUT_TOO_LONG',
        message: 'Input exceeds maximum length',
        status: 400,
    },
    INVALID_FORMAT: { code: 'INVALID_FORMAT', message: 'Invalid data format', status: 400 },

    // Resources
    NOT_FOUND: { code: 'NOT_FOUND', message: 'Resource not found', status: 404 },
    CHAT_NOT_FOUND: { code: 'CHAT_NOT_FOUND', message: 'Chat not found', status: 404 },
    MEMORY_NOT_FOUND: { code: 'MEMORY_NOT_FOUND', message: 'Memory not found', status: 404 },

    // AI Provider
    PROVIDER_ERROR: { code: 'PROVIDER_ERROR', message: 'AI provider error', status: 502 },
    PROVIDER_TIMEOUT: { code: 'PROVIDER_TIMEOUT', message: 'AI provider timed out', status: 504 },
    PROVIDER_UNAVAILABLE: {
        code: 'PROVIDER_UNAVAILABLE',
        message: 'All AI providers are unavailable',
        status: 503,
    },
    CONTEXT_TOO_LONG: {
        code: 'CONTEXT_TOO_LONG',
        message: 'Message exceeds context window',
        status: 413,
    },

    // Billing
    INSUFFICIENT_CREDITS: {
        code: 'INSUFFICIENT_CREDITS',
        message: 'Insufficient credits',
        status: 402,
    },
    SUBSCRIPTION_REQUIRED: {
        code: 'SUBSCRIPTION_REQUIRED',
        message: 'Active subscription required',
        status: 402,
    },

    // Content moderation
    CONTENT_BLOCKED: {
        code: 'CONTENT_BLOCKED',
        message: 'Content blocked by safety filter',
        status: 422,
    },
    CONTENT_WARNING: {
        code: 'CONTENT_WARNING',
        message: 'Content flagged for review',
        status: 200,
    },

    // Server
    INTERNAL_ERROR: { code: 'INTERNAL_ERROR', message: 'Internal server error', status: 500 },
    SERVICE_UNAVAILABLE: {
        code: 'SERVICE_UNAVAILABLE',
        message: 'Service temporarily unavailable',
        status: 503,
    },
} as const satisfies Record<string, ApiError>;

export type ErrorCode = keyof typeof errors;

/**
 * Create a standardized error response object
 */
export function apiError(
    code: ErrorCode,
    details?: string
): { error: { code: string; message: string; details?: string } } {
    const err = errors[code];
    return {
        error: {
            code: err.code,
            message: err.message,
            ...(details && { details }),
        },
    };
}

/**
 * Get HTTP status for an error code
 */
export function errorStatus(code: ErrorCode): number {
    return errors[code].status;
}

/**
 * Get all error codes (for documentation)
 */
export function getErrorCatalog() {
    return Object.entries(errors).map(([key, val]) => ({
        code: val.code,
        message: val.message,
        httpStatus: val.status,
        key,
    }));
}

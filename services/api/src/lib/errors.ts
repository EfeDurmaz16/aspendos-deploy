/**
 * Application-specific error classes for consistent error handling.
 */
export class AppError extends Error {
    constructor(
        message: string,
        public statusCode: number = 500,
        public code: string = 'INTERNAL_ERROR',
        public isOperational = true
    ) {
        super(message);
        this.name = 'AppError';
    }
}

export class NotFoundError extends AppError {
    constructor(resource: string) {
        super(`${resource} not found`, 404, 'NOT_FOUND');
    }
}

export class ForbiddenError extends AppError {
    constructor(message = 'Access denied') {
        super(message, 403, 'FORBIDDEN');
    }
}

export class ValidationError extends AppError {
    constructor(message: string) {
        super(message, 400, 'VALIDATION_ERROR');
    }
}

export class RateLimitError extends AppError {
    constructor(_retryAfter?: number) {
        super('Rate limit exceeded', 429, 'RATE_LIMITED');
    }
}

export class ServiceUnavailableError extends AppError {
    constructor(service: string) {
        super(`${service} is temporarily unavailable`, 503, 'SERVICE_UNAVAILABLE');
    }
}

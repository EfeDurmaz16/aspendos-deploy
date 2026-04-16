/**
 * Zod Validation Middleware for Hono
 *
 * Provides automatic request validation with detailed error messages.
 */
import type { Context, Next } from 'hono';
import { z } from 'zod';

/**
 * Validation error response format
 */
interface ValidationErrorResponse {
    error: string;
    details: Array<{
        path: string[];
        message: string;
    }>;
}

/**
 * Validates request body against a Zod schema
 */
export function validateBody<T extends z.ZodType>(schema: T) {
    return async (c: Context, next: Next) => {
        try {
            const body = await c.req.json();
            const validated = schema.parse(body);

            // Store validated data in context for route handlers
            c.set('validatedBody', validated);

            await next();
        } catch (error) {
            if (error instanceof z.ZodError) {
                const errorResponse: ValidationErrorResponse = {
                    error: 'Validation failed',
                    details: error.errors.map((err) => ({
                        path: err.path.map(String),
                        message: err.message,
                    })),
                };

                return c.json(errorResponse, 400);
            }

            // Re-throw non-validation errors
            throw error;
        }
    };
}

/**
 * Validates request query parameters against a Zod schema
 */
export function validateQuery<T extends z.ZodType>(schema: T) {
    return async (c: Context, next: Next) => {
        try {
            const query = c.req.query();
            const validated = schema.parse(query);

            // Store validated data in context for route handlers
            c.set('validatedQuery', validated);

            await next();
        } catch (error) {
            if (error instanceof z.ZodError) {
                const errorResponse: ValidationErrorResponse = {
                    error: 'Query validation failed',
                    details: error.errors.map((err) => ({
                        path: err.path.map(String),
                        message: err.message,
                    })),
                };

                return c.json(errorResponse, 400);
            }

            // Re-throw non-validation errors
            throw error;
        }
    };
}

/**
 * Validates request path parameters against a Zod schema
 */
export function validateParams<T extends z.ZodType>(schema: T) {
    return async (c: Context, next: Next) => {
        try {
            const params = c.req.param();
            const validated = schema.parse(params);

            // Store validated data in context for route handlers
            c.set('validatedParams', validated);

            await next();
        } catch (error) {
            if (error instanceof z.ZodError) {
                const errorResponse: ValidationErrorResponse = {
                    error: 'Path parameter validation failed',
                    details: error.errors.map((err) => ({
                        path: err.path.map(String),
                        message: err.message,
                    })),
                };

                return c.json(errorResponse, 400);
            }

            // Re-throw non-validation errors
            throw error;
        }
    };
}

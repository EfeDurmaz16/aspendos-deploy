import { describe, expect, it } from 'vitest';
import { apiError, errorStatus, getErrorCatalog } from '../error-codes';

describe('error-codes', () => {
    describe('apiError', () => {
        it('returns correct structure', () => {
            const error = apiError('UNAUTHORIZED');

            expect(error).toHaveProperty('error');
            expect(error.error).toHaveProperty('code');
            expect(error.error).toHaveProperty('message');
        });

        it('returns correct code and message for UNAUTHORIZED', () => {
            const error = apiError('UNAUTHORIZED');

            expect(error.error.code).toBe('UNAUTHORIZED');
            expect(error.error.message).toBe('Authentication required');
        });

        it('returns correct code and message for FORBIDDEN', () => {
            const error = apiError('FORBIDDEN');

            expect(error.error.code).toBe('FORBIDDEN');
            expect(error.error.message).toBe('Insufficient permissions');
        });

        it('returns correct code and message for RATE_LIMITED', () => {
            const error = apiError('RATE_LIMITED');

            expect(error.error.code).toBe('RATE_LIMITED');
            expect(error.error.message).toBe('Too many requests');
        });

        it('returns correct code and message for NOT_FOUND', () => {
            const error = apiError('NOT_FOUND');

            expect(error.error.code).toBe('NOT_FOUND');
            expect(error.error.message).toBe('Resource not found');
        });

        it('includes details when provided', () => {
            const error = apiError('VALIDATION_ERROR', 'Email is required');

            expect(error.error).toHaveProperty('details');
            expect(error.error.details).toBe('Email is required');
        });

        it('does not include details when not provided', () => {
            const error = apiError('VALIDATION_ERROR');

            expect(error.error).not.toHaveProperty('details');
        });

        it('handles all authentication error codes', () => {
            expect(apiError('UNAUTHORIZED').error.code).toBe('UNAUTHORIZED');
            expect(apiError('FORBIDDEN').error.code).toBe('FORBIDDEN');
            expect(apiError('SESSION_EXPIRED').error.code).toBe('SESSION_EXPIRED');
            expect(apiError('INVALID_API_KEY').error.code).toBe('INVALID_API_KEY');
        });

        it('handles all validation error codes', () => {
            expect(apiError('VALIDATION_ERROR').error.code).toBe('VALIDATION_ERROR');
            expect(apiError('INPUT_TOO_LONG').error.code).toBe('INPUT_TOO_LONG');
            expect(apiError('INVALID_FORMAT').error.code).toBe('INVALID_FORMAT');
        });

        it('handles all provider error codes', () => {
            expect(apiError('PROVIDER_ERROR').error.code).toBe('PROVIDER_ERROR');
            expect(apiError('PROVIDER_TIMEOUT').error.code).toBe('PROVIDER_TIMEOUT');
            expect(apiError('PROVIDER_UNAVAILABLE').error.code).toBe('PROVIDER_UNAVAILABLE');
            expect(apiError('CONTEXT_TOO_LONG').error.code).toBe('CONTEXT_TOO_LONG');
        });

        it('handles billing error codes', () => {
            expect(apiError('INSUFFICIENT_CREDITS').error.code).toBe('INSUFFICIENT_CREDITS');
            expect(apiError('SUBSCRIPTION_REQUIRED').error.code).toBe('SUBSCRIPTION_REQUIRED');
        });

        it('handles content moderation error codes', () => {
            expect(apiError('CONTENT_BLOCKED').error.code).toBe('CONTENT_BLOCKED');
            expect(apiError('CONTENT_WARNING').error.code).toBe('CONTENT_WARNING');
        });
    });

    describe('errorStatus', () => {
        it('returns correct HTTP codes for authentication errors', () => {
            expect(errorStatus('UNAUTHORIZED')).toBe(401);
            expect(errorStatus('FORBIDDEN')).toBe(403);
            expect(errorStatus('SESSION_EXPIRED')).toBe(401);
            expect(errorStatus('INVALID_API_KEY')).toBe(401);
        });

        it('returns correct HTTP codes for rate limiting', () => {
            expect(errorStatus('RATE_LIMITED')).toBe(429);
            expect(errorStatus('TIER_LIMIT_EXCEEDED')).toBe(429);
        });

        it('returns correct HTTP codes for validation errors', () => {
            expect(errorStatus('VALIDATION_ERROR')).toBe(400);
            expect(errorStatus('INPUT_TOO_LONG')).toBe(400);
            expect(errorStatus('INVALID_FORMAT')).toBe(400);
        });

        it('returns correct HTTP codes for resource errors', () => {
            expect(errorStatus('NOT_FOUND')).toBe(404);
            expect(errorStatus('CHAT_NOT_FOUND')).toBe(404);
            expect(errorStatus('MEMORY_NOT_FOUND')).toBe(404);
        });

        it('returns correct HTTP codes for provider errors', () => {
            expect(errorStatus('PROVIDER_ERROR')).toBe(502);
            expect(errorStatus('PROVIDER_TIMEOUT')).toBe(504);
            expect(errorStatus('PROVIDER_UNAVAILABLE')).toBe(503);
            expect(errorStatus('CONTEXT_TOO_LONG')).toBe(413);
        });

        it('returns correct HTTP codes for billing errors', () => {
            expect(errorStatus('INSUFFICIENT_CREDITS')).toBe(402);
            expect(errorStatus('SUBSCRIPTION_REQUIRED')).toBe(402);
        });

        it('returns correct HTTP codes for content moderation', () => {
            expect(errorStatus('CONTENT_BLOCKED')).toBe(422);
            expect(errorStatus('CONTENT_WARNING')).toBe(200);
        });

        it('returns correct HTTP codes for server errors', () => {
            expect(errorStatus('INTERNAL_ERROR')).toBe(500);
            expect(errorStatus('SERVICE_UNAVAILABLE')).toBe(503);
        });

        it('all status codes are valid HTTP codes', () => {
            const catalog = getErrorCatalog();
            const validStatusCodes = [
                200, 400, 401, 402, 403, 404, 413, 422, 429, 500, 502, 503, 504,
            ];

            for (const entry of catalog) {
                expect(validStatusCodes).toContain(entry.httpStatus);
            }
        });
    });

    describe('getErrorCatalog', () => {
        it('returns all errors', () => {
            const catalog = getErrorCatalog();

            expect(Array.isArray(catalog)).toBe(true);
            expect(catalog.length).toBeGreaterThan(0);
        });

        it('returns errors with correct structure', () => {
            const catalog = getErrorCatalog();
            const firstError = catalog[0];

            expect(firstError).toHaveProperty('code');
            expect(firstError).toHaveProperty('message');
            expect(firstError).toHaveProperty('httpStatus');
            expect(firstError).toHaveProperty('key');
        });

        it('all errors have non-empty codes', () => {
            const catalog = getErrorCatalog();

            for (const error of catalog) {
                expect(typeof error.code).toBe('string');
                expect(error.code.length).toBeGreaterThan(0);
            }
        });

        it('all errors have non-empty messages', () => {
            const catalog = getErrorCatalog();

            for (const error of catalog) {
                expect(typeof error.message).toBe('string');
                expect(error.message.length).toBeGreaterThan(0);
            }
        });

        it('all errors have valid HTTP status codes', () => {
            const catalog = getErrorCatalog();

            for (const error of catalog) {
                expect(typeof error.httpStatus).toBe('number');
                expect(error.httpStatus).toBeGreaterThanOrEqual(200);
                expect(error.httpStatus).toBeLessThan(600);
            }
        });

        it('all errors have non-empty keys', () => {
            const catalog = getErrorCatalog();

            for (const error of catalog) {
                expect(typeof error.key).toBe('string');
                expect(error.key.length).toBeGreaterThan(0);
            }
        });

        it('includes known error codes', () => {
            const catalog = getErrorCatalog();
            const codes = catalog.map((e) => e.code);

            expect(codes).toContain('UNAUTHORIZED');
            expect(codes).toContain('FORBIDDEN');
            expect(codes).toContain('RATE_LIMITED');
            expect(codes).toContain('VALIDATION_ERROR');
            expect(codes).toContain('NOT_FOUND');
            expect(codes).toContain('PROVIDER_ERROR');
            expect(codes).toContain('INSUFFICIENT_CREDITS');
            expect(codes).toContain('CONTENT_BLOCKED');
            expect(codes).toContain('INTERNAL_ERROR');
        });

        it('code matches key in uppercase with underscores', () => {
            const catalog = getErrorCatalog();

            for (const error of catalog) {
                expect(error.code).toBe(error.key);
            }
        });
    });
});

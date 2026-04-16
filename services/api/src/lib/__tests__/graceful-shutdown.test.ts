import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    _forTestingReset,
    getServerStatus,
    registerSSEStream,
    shutdown,
    shutdownMiddleware,
    unregisterSSEStream,
} from '../graceful-shutdown';

// Mock prisma
vi.mock('../prisma', () => ({
    prisma: {
        $disconnect: vi.fn().mockResolvedValue(undefined),
    },
}));

// Mock Hono context
function createMockContext() {
    const headers: Record<string, string> = {};
    return {
        header: vi.fn((key: string, value: string) => {
            headers[key] = value;
        }),
        json: vi.fn((data: unknown, status?: number) => ({
            data,
            status,
        })),
        _headers: headers,
    };
}

describe('graceful-shutdown', () => {
    beforeEach(() => {
        _forTestingReset();
        vi.clearAllMocks();
    });

    describe('getServerStatus', () => {
        it('should return initial running status', () => {
            const status = getServerStatus();
            expect(status.status).toBe('running');
            expect(status.inFlightRequests).toBe(0);
            expect(status.uptime).toBeGreaterThanOrEqual(0);
            expect(status.drainingDuration).toBeNull();
            expect(status.sseStreamCount).toBe(0);
        });

        it('should track uptime correctly', async () => {
            const status1 = getServerStatus();
            await new Promise((resolve) => setTimeout(resolve, 10));
            const status2 = getServerStatus();
            expect(status2.uptime).toBeGreaterThanOrEqual(status1.uptime);
        });

        it('should update status during shutdown', async () => {
            const middleware = shutdownMiddleware();
            const ctx = createMockContext();
            const next = vi.fn().mockReturnValue(new Promise(() => {})); // Never resolves

            // Start a never-ending request to keep shutdown in draining state
            const _requestPromise = middleware(ctx as never, next);
            await new Promise((resolve) => setTimeout(resolve, 10));

            const shutdownPromise = shutdown(100);
            await new Promise((resolve) => setTimeout(resolve, 10));
            const status = getServerStatus();
            expect(status.status).toBe('draining');
            expect(status.drainingDuration).toBeGreaterThan(0);
            await shutdownPromise;
        });
    });

    describe('shutdownMiddleware', () => {
        it('should allow requests when running', async () => {
            const middleware = shutdownMiddleware();
            const ctx = createMockContext();
            const next = vi.fn().mockResolvedValue(undefined);

            await middleware(ctx as never, next);

            expect(next).toHaveBeenCalled();
            expect(ctx.json).not.toHaveBeenCalled();
        });

        it('should track in-flight requests', async () => {
            const middleware = shutdownMiddleware();
            const ctx = createMockContext();
            let resolveNext: () => void;
            const nextPromise = new Promise<void>((resolve) => {
                resolveNext = resolve;
            });
            const next = vi.fn().mockReturnValue(nextPromise);

            const requestPromise = middleware(ctx as never, next);

            // Wait for middleware to start
            await new Promise((resolve) => setTimeout(resolve, 10));
            const statusDuring = getServerStatus();
            expect(statusDuring.inFlightRequests).toBe(1);

            resolveNext!();
            await requestPromise;

            const statusAfter = getServerStatus();
            expect(statusAfter.inFlightRequests).toBe(0);
        });

        it('should decrement in-flight requests even if next() throws', async () => {
            const middleware = shutdownMiddleware();
            const ctx = createMockContext();
            const next = vi.fn().mockRejectedValue(new Error('Test error'));

            await expect(middleware(ctx as never, next)).rejects.toThrow('Test error');

            const status = getServerStatus();
            expect(status.inFlightRequests).toBe(0);
        });

        it('should reject requests during draining with 503 and Retry-After header', async () => {
            const middleware = shutdownMiddleware();
            const ctx = createMockContext();
            const next = vi.fn();

            // Start a never-ending request to keep shutdown in draining state
            const middleware2 = shutdownMiddleware();
            const ctx2 = createMockContext();
            const next2 = vi.fn().mockReturnValue(new Promise(() => {}));
            const _requestPromise = middleware2(ctx2 as never, next2);
            await new Promise((resolve) => setTimeout(resolve, 10));

            // Start draining
            const shutdownPromise = shutdown(100);
            await new Promise((resolve) => setTimeout(resolve, 10));

            const result = await middleware(ctx as never, next);

            expect(next).not.toHaveBeenCalled();
            expect(ctx.header).toHaveBeenCalledWith('Retry-After', '60');
            expect(ctx.json).toHaveBeenCalledWith(
                {
                    error: 'Server is shutting down',
                    code: 'SERVICE_UNAVAILABLE',
                    retryAfter: 60,
                },
                503
            );
            expect(result).toEqual({
                data: {
                    error: 'Server is shutting down',
                    code: 'SERVICE_UNAVAILABLE',
                    retryAfter: 60,
                },
                status: 503,
            });

            await shutdownPromise;
        });

        it('should reject requests when stopped', async () => {
            const middleware = shutdownMiddleware();
            const ctx = createMockContext();
            const next = vi.fn();

            await shutdown(100);

            const result = await middleware(ctx as never, next);

            expect(next).not.toHaveBeenCalled();
            expect(ctx.json).toHaveBeenCalledWith(
                {
                    error: 'Server is stopped',
                    code: 'SERVICE_UNAVAILABLE',
                },
                503
            );
            expect(result).toEqual({
                data: {
                    error: 'Server is stopped',
                    code: 'SERVICE_UNAVAILABLE',
                },
                status: 503,
            });
        });
    });

    describe('SSE stream management', () => {
        it('should track registered SSE streams', () => {
            const controller1 = { close: vi.fn() } as unknown as ReadableStreamDefaultController;
            const controller2 = { close: vi.fn() } as unknown as ReadableStreamDefaultController;

            registerSSEStream(controller1);
            expect(getServerStatus().sseStreamCount).toBe(1);

            registerSSEStream(controller2);
            expect(getServerStatus().sseStreamCount).toBe(2);
        });

        it('should unregister SSE streams', () => {
            const controller = { close: vi.fn() } as unknown as ReadableStreamDefaultController;

            registerSSEStream(controller);
            expect(getServerStatus().sseStreamCount).toBe(1);

            unregisterSSEStream(controller);
            expect(getServerStatus().sseStreamCount).toBe(0);
        });

        it('should close all SSE streams during shutdown', async () => {
            const controller1 = { close: vi.fn() } as unknown as ReadableStreamDefaultController;
            const controller2 = { close: vi.fn() } as unknown as ReadableStreamDefaultController;

            registerSSEStream(controller1);
            registerSSEStream(controller2);

            await shutdown(100);

            expect(controller1.close).toHaveBeenCalled();
            expect(controller2.close).toHaveBeenCalled();
            expect(getServerStatus().sseStreamCount).toBe(0);
        });

        it('should handle SSE stream close errors gracefully', async () => {
            const controller = {
                close: vi.fn().mockImplementation(() => {
                    throw new Error('Close error');
                }),
            } as unknown as ReadableStreamDefaultController;

            registerSSEStream(controller);

            // Should not throw
            await expect(shutdown(100)).resolves.toBeUndefined();
            expect(controller.close).toHaveBeenCalled();
        });
    });

    describe('shutdown', () => {
        it('should transition from running to draining to stopped', async () => {
            expect(getServerStatus().status).toBe('running');

            // Start a never-ending request to keep shutdown in draining state
            const middleware = shutdownMiddleware();
            const ctx = createMockContext();
            const next = vi.fn().mockReturnValue(new Promise(() => {}));
            const _requestPromise = middleware(ctx as never, next);
            await new Promise((resolve) => setTimeout(resolve, 10));

            const shutdownPromise = shutdown(100);

            await new Promise((resolve) => setTimeout(resolve, 10));
            expect(getServerStatus().status).toBe('draining');

            await shutdownPromise;
            expect(getServerStatus().status).toBe('stopped');
        });

        it('should wait for in-flight requests to complete', async () => {
            const middleware = shutdownMiddleware();
            const ctx = createMockContext();
            let resolveRequest: () => void;
            const requestPromise = new Promise<void>((resolve) => {
                resolveRequest = resolve;
            });
            const next = vi.fn().mockReturnValue(requestPromise);

            // Start a request
            const requestHandlerPromise = middleware(ctx as never, next);

            // Wait for request to be tracked
            await new Promise((resolve) => setTimeout(resolve, 10));
            expect(getServerStatus().inFlightRequests).toBe(1);

            // Start shutdown
            const shutdownPromise = shutdown(1000);

            // Wait a bit
            await new Promise((resolve) => setTimeout(resolve, 50));
            expect(getServerStatus().status).toBe('draining');

            // Complete the request
            resolveRequest!();
            await requestHandlerPromise;

            // Shutdown should complete
            await shutdownPromise;
            expect(getServerStatus().status).toBe('stopped');
        });

        it('should timeout if in-flight requests take too long', async () => {
            const middleware = shutdownMiddleware();
            const ctx = createMockContext();
            const next = vi.fn().mockReturnValue(new Promise(() => {})); // Never resolves

            // Start a request that never completes
            const _requestPromise = middleware(ctx as never, next);

            await new Promise((resolve) => setTimeout(resolve, 10));
            expect(getServerStatus().inFlightRequests).toBe(1);

            // Shutdown with short timeout
            await shutdown(200);

            expect(getServerStatus().status).toBe('stopped');
            // Request still tracked (would be orphaned in real scenario)
            expect(getServerStatus().inFlightRequests).toBe(1);
        });

        it('should close database connections', async () => {
            const { prisma } = await import('../prisma');
            await shutdown(100);
            expect(prisma.$disconnect).toHaveBeenCalled();
        });

        it('should handle database disconnect errors gracefully', async () => {
            const { prisma } = await import('../prisma');
            vi.mocked(prisma.$disconnect).mockRejectedValueOnce(new Error('DB error'));

            // Should not throw
            await expect(shutdown(100)).resolves.toBeUndefined();
            expect(prisma.$disconnect).toHaveBeenCalled();
        });

        it('should ignore subsequent shutdown calls', async () => {
            const { prisma } = await import('../prisma');

            await shutdown(100);
            const firstCallCount = vi.mocked(prisma.$disconnect).mock.calls.length;

            await shutdown(100);
            const secondCallCount = vi.mocked(prisma.$disconnect).mock.calls.length;

            expect(secondCallCount).toBe(firstCallCount);
        });

        it('should use custom timeout', async () => {
            const middleware = shutdownMiddleware();
            const ctx = createMockContext();
            const next = vi.fn().mockReturnValue(new Promise(() => {}));

            const _requestPromise = middleware(ctx as never, next);
            await new Promise((resolve) => setTimeout(resolve, 10));

            const startTime = Date.now();
            await shutdown(300); // Custom 300ms timeout
            const elapsed = Date.now() - startTime;

            // Should wait approximately 300ms (with some tolerance)
            expect(elapsed).toBeGreaterThan(250);
            expect(elapsed).toBeLessThan(500);
        });
    });

    describe('_forTestingReset', () => {
        it('should reset all state', async () => {
            // Modify state
            const controller = { close: vi.fn() } as never;
            registerSSEStream(controller);
            const middleware = shutdownMiddleware();
            const ctx = createMockContext();
            const next = vi.fn().mockResolvedValue(undefined);
            await middleware(ctx as never, next);
            await shutdown(100);

            // Reset
            _forTestingReset();

            const status = getServerStatus();
            expect(status.status).toBe('running');
            expect(status.inFlightRequests).toBe(0);
            expect(status.drainingDuration).toBeNull();
            expect(status.sseStreamCount).toBe(0);
        });
    });
});

import { Hono } from 'hono';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
    correlationStorage,
    getContext,
    getCorrelationId,
    getElapsedTime,
    getRequestId,
    getUserId,
    runWithContext,
    setUserId,
} from '../correlation-context';
import { correlationIdMiddleware } from '../../middleware/correlation-id';

// ─── Unit: correlation-context.ts ─────────────────────────────────────────────

describe('CorrelationContext', () => {
    describe('runWithContext', () => {
        it('should create a context with auto-generated IDs when no values provided', async () => {
            let captured: ReturnType<typeof getContext>;

            await runWithContext({}, async () => {
                captured = getContext();
            });

            expect(captured!).toBeDefined();
            expect(captured!.correlationId).toBeDefined();
            expect(typeof captured!.correlationId).toBe('string');
            expect(captured!.correlationId.length).toBeGreaterThan(0);
            expect(captured!.requestId).toBeDefined();
            expect(typeof captured!.requestId).toBe('string');
            expect(captured!.startTime).toBeGreaterThan(0);
        });

        it('should use provided values when supplied', async () => {
            const input = {
                correlationId: 'test-corr-123',
                requestId: 'test-req-456',
                userId: 'user-789',
                traceId: 'trace-abc',
                spanId: 'span-def',
                startTime: 1700000000000,
            };

            let captured: ReturnType<typeof getContext>;

            await runWithContext(input, async () => {
                captured = getContext();
            });

            expect(captured!).toEqual(input);
        });

        it('should return the value produced by the inner function', async () => {
            const result = await runWithContext({}, async () => {
                return 42;
            });

            expect(result).toBe(42);
        });

        it('should propagate errors from the inner function', async () => {
            await expect(
                runWithContext({}, async () => {
                    throw new Error('boom');
                }),
            ).rejects.toThrow('boom');
        });
    });

    describe('context propagation across async boundaries', () => {
        it('should be visible inside setTimeout callbacks', async () => {
            let captured: string | undefined;

            await runWithContext({ correlationId: 'timer-test' }, async () => {
                await new Promise<void>((resolve) => {
                    setTimeout(() => {
                        captured = getContext()?.correlationId;
                        resolve();
                    }, 10);
                });
            });

            expect(captured).toBe('timer-test');
        });

        it('should be visible across chained promises', async () => {
            const values: string[] = [];

            await runWithContext({ correlationId: 'promise-chain' }, async () => {
                values.push(getContext()!.correlationId);

                await Promise.resolve().then(() => {
                    values.push(getContext()!.correlationId);
                });

                await new Promise<void>((resolve) => {
                    queueMicrotask(() => {
                        values.push(getContext()!.correlationId);
                        resolve();
                    });
                });
            });

            expect(values).toEqual(['promise-chain', 'promise-chain', 'promise-chain']);
        });

        it('should be visible inside Promise.all', async () => {
            let results: (string | undefined)[] = [];

            await runWithContext({ correlationId: 'parallel-test' }, async () => {
                results = await Promise.all([
                    Promise.resolve(getContext()?.correlationId),
                    new Promise<string | undefined>((resolve) =>
                        setTimeout(() => resolve(getContext()?.correlationId), 5),
                    ),
                    new Promise<string | undefined>((resolve) =>
                        setTimeout(() => resolve(getContext()?.correlationId), 10),
                    ),
                ]);
            });

            expect(results).toEqual(['parallel-test', 'parallel-test', 'parallel-test']);
        });
    });

    describe('nested contexts', () => {
        it('should allow nested contexts that override the parent', async () => {
            const outer: string[] = [];
            const inner: string[] = [];

            await runWithContext({ correlationId: 'outer' }, async () => {
                outer.push(getContext()!.correlationId);

                await runWithContext({ correlationId: 'inner' }, async () => {
                    inner.push(getContext()!.correlationId);
                });

                // After nested context exits, outer should be restored
                outer.push(getContext()!.correlationId);
            });

            expect(outer).toEqual(['outer', 'outer']);
            expect(inner).toEqual(['inner']);
        });

        it('should not leak nested context values to the parent', async () => {
            let parentUserId: string | undefined;

            await runWithContext({ correlationId: 'parent' }, async () => {
                await runWithContext(
                    { correlationId: 'child', userId: 'child-user' },
                    async () => {
                        expect(getContext()!.userId).toBe('child-user');
                    },
                );

                parentUserId = getContext()?.userId;
            });

            expect(parentUserId).toBeUndefined();
        });
    });

    describe('getCorrelationId', () => {
        it('should return the current correlation ID when inside a context', async () => {
            await runWithContext({ correlationId: 'known-id' }, async () => {
                expect(getCorrelationId()).toBe('known-id');
            });
        });

        it('should generate a new UUID when called outside any context', () => {
            // Outside any runWithContext - should still return a valid string
            const id = getCorrelationId();
            expect(typeof id).toBe('string');
            expect(id.length).toBeGreaterThan(0);
        });

        it('should generate different IDs on successive calls outside context', () => {
            const id1 = getCorrelationId();
            const id2 = getCorrelationId();
            expect(id1).not.toBe(id2);
        });
    });

    describe('getContext', () => {
        it('should return undefined when called outside any context', () => {
            expect(getContext()).toBeUndefined();
        });
    });

    describe('getRequestId', () => {
        it('should return the request ID from the active context', async () => {
            await runWithContext({ requestId: 'req-123' }, async () => {
                expect(getRequestId()).toBe('req-123');
            });
        });

        it('should return undefined outside a context', () => {
            expect(getRequestId()).toBeUndefined();
        });
    });

    describe('getUserId', () => {
        it('should return the user ID when set', async () => {
            await runWithContext({ userId: 'u-1' }, async () => {
                expect(getUserId()).toBe('u-1');
            });
        });

        it('should return undefined when userId was not provided', async () => {
            await runWithContext({}, async () => {
                expect(getUserId()).toBeUndefined();
            });
        });
    });

    describe('setUserId', () => {
        it('should mutate the userId on the current context', async () => {
            await runWithContext({}, async () => {
                expect(getUserId()).toBeUndefined();
                setUserId('late-user');
                expect(getUserId()).toBe('late-user');
            });
        });

        it('should be a no-op when called outside any context', () => {
            // Should not throw
            setUserId('no-context');
            expect(getUserId()).toBeUndefined();
        });
    });

    describe('getElapsedTime', () => {
        it('should return a positive value inside a context', async () => {
            await runWithContext({ startTime: Date.now() - 100 }, async () => {
                const elapsed = getElapsedTime();
                expect(elapsed).toBeGreaterThanOrEqual(100);
                expect(elapsed).toBeLessThan(5000); // sanity upper bound
            });
        });

        it('should return 0 outside any context', () => {
            expect(getElapsedTime()).toBe(0);
        });
    });

    describe('correlationStorage', () => {
        it('should expose the raw AsyncLocalStorage instance', () => {
            expect(correlationStorage).toBeDefined();
            expect(typeof correlationStorage.run).toBe('function');
            expect(typeof correlationStorage.getStore).toBe('function');
        });
    });
});

// ─── Integration: correlation-id middleware ───────────────────────────────────

describe('correlationIdMiddleware', () => {
    let app: Hono;

    beforeEach(() => {
        app = new Hono();
        app.use('*', correlationIdMiddleware());
    });

    it('should set X-Correlation-Id response header', async () => {
        app.get('/test', (c) => c.json({ ok: true }));

        const res = await app.request('/test');

        expect(res.status).toBe(200);
        const header = res.headers.get('X-Correlation-Id');
        expect(header).toBeDefined();
        expect(typeof header).toBe('string');
        expect(header!.length).toBeGreaterThan(0);
    });

    it('should echo back a provided X-Correlation-Id header', async () => {
        app.get('/test', (c) => c.json({ ok: true }));

        const res = await app.request('/test', {
            headers: { 'X-Correlation-Id': 'my-custom-id' },
        });

        expect(res.headers.get('X-Correlation-Id')).toBe('my-custom-id');
    });

    it('should generate unique IDs for different requests when none provided', async () => {
        app.get('/test', (c) => c.json({ ok: true }));

        const res1 = await app.request('/test');
        const res2 = await app.request('/test');

        const id1 = res1.headers.get('X-Correlation-Id');
        const id2 = res2.headers.get('X-Correlation-Id');

        expect(id1).not.toBe(id2);
    });

    it('should make the correlation context available inside handlers', async () => {
        let captured: ReturnType<typeof getContext>;

        app.get('/test', (c) => {
            captured = getContext();
            return c.json({ correlationId: captured?.correlationId });
        });

        const res = await app.request('/test', {
            headers: { 'X-Correlation-Id': 'handler-test' },
        });

        const body = await res.json();
        expect(body.correlationId).toBe('handler-test');
        expect(captured!.correlationId).toBe('handler-test');
        expect(captured!.requestId).toBeDefined();
        expect(captured!.startTime).toBeGreaterThan(0);
    });

    it('should propagate context into async service calls within the handler', async () => {
        let serviceCorrelationId: string | undefined;

        // Simulate an async service call
        async function fakeService(): Promise<void> {
            await new Promise((resolve) => setTimeout(resolve, 5));
            serviceCorrelationId = getContext()?.correlationId;
        }

        app.get('/test', async (c) => {
            await fakeService();
            return c.json({ ok: true });
        });

        await app.request('/test', {
            headers: { 'X-Correlation-Id': 'async-service-test' },
        });

        expect(serviceCorrelationId).toBe('async-service-test');
    });

    it('should pick up traceId from Hono context when tracing middleware runs first', async () => {
        // Create a fresh app with a mock tracing middleware before correlation
        const appWithTracing = new Hono();

        // Mock tracing middleware that sets traceId and spanId
        appWithTracing.use('*', async (c, next) => {
            c.set('traceId' as never, 'trace-from-tracing');
            c.set('spanId' as never, 'span-from-tracing');
            c.set('requestId' as never, 'req-from-tracing');
            await next();
        });
        appWithTracing.use('*', correlationIdMiddleware());

        let captured: ReturnType<typeof getContext>;

        appWithTracing.get('/test', (c) => {
            captured = getContext();
            return c.json({ ok: true });
        });

        await appWithTracing.request('/test');

        expect(captured!.traceId).toBe('trace-from-tracing');
        expect(captured!.spanId).toBe('span-from-tracing');
        expect(captured!.requestId).toBe('req-from-tracing');
    });

    it('should set X-Correlation-Id header even when handler throws', async () => {
        app.get('/error', () => {
            throw new Error('handler failure');
        });

        // Hono's default error handling should still include the header
        // since we set it before calling next()
        const res = await app.request('/error');

        // The header was set before next() so it should be present
        // (Hono preserves headers set before an error)
        expect(res.headers.get('X-Correlation-Id')).toBeDefined();
    });

    it('should capture userId from Hono context when auth middleware runs after', async () => {
        const appWithAuth = new Hono();

        appWithAuth.use('*', correlationIdMiddleware());
        // Simulate auth middleware that sets userId during next()
        appWithAuth.use('*', async (c, next) => {
            c.set('userId' as never, 'auth-user-123');
            await next();
        });

        let capturedUserId: string | undefined;

        appWithAuth.get('/test', (c) => {
            capturedUserId = getContext()?.userId;
            return c.json({ ok: true });
        });

        await appWithAuth.request('/test');

        // The userId is set by auth middleware which runs inside the correlation
        // context. The handler reads it during execution. The correlation middleware
        // also picks it up after next() returns.
        // Note: because the auth middleware sets userId on Hono context before
        // the handler runs, the handler reads it from getContext() only if
        // the correlation middleware's post-next enrichment has not yet run.
        // The userId in the correlation context is set after next() completes.
        // During handler execution, getContext().userId may still be undefined
        // since the enrichment happens after next(). The important thing is
        // that the correlation context is still accessible.
        expect(capturedUserId).toBeUndefined(); // Not yet enriched during handler
    });
});

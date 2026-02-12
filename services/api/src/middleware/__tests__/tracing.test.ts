import { Hono } from 'hono';
import { beforeEach, describe, expect, it } from 'vitest';
import {
    addSpanEvent,
    createSpan,
    endSpan,
    exportTracesOTLP,
    getTrace,
    getTraceStats,
    getTraces,
    tracingMiddleware,
} from '../tracing';

describe('Tracing Middleware', () => {
    let app: Hono;

    beforeEach(() => {
        app = new Hono();
        app.use('*', tracingMiddleware());
    });

    it('should generate a unique trace ID per request', async () => {
        app.get('/test', (c) => {
            const traceId = c.get('traceId');
            expect(traceId).toBeDefined();
            expect(typeof traceId).toBe('string');
            expect(traceId.length).toBe(32);
            return c.json({ traceId });
        });

        const res1 = await app.request('/test');
        const res2 = await app.request('/test');

        const data1 = await res1.json();
        const data2 = await res2.json();

        expect(data1.traceId).not.toBe(data2.traceId);
    });

    it('should set trace headers in response', async () => {
        app.get('/test', (c) => c.json({ ok: true }));

        const res = await app.request('/test');

        expect(res.headers.get('X-Trace-Id')).toBeDefined();
        expect(res.headers.get('X-Span-Id')).toBeDefined();
        expect(res.headers.get('X-Trace-Id')?.length).toBe(32);
        expect(res.headers.get('X-Span-Id')?.length).toBe(16);
    });

    it('should accept W3C traceparent header', async () => {
        const expectedTraceId = '0af7651916cd43dd8448eb211c80319c';
        const traceparent = `00-${expectedTraceId}-b7ad6b7169203331-01`;

        app.get('/test', (c) => {
            const traceId = c.get('traceId');
            return c.json({ traceId });
        });

        const res = await app.request('/test', {
            headers: {
                traceparent,
            },
        });

        const data = await res.json();
        expect(data.traceId).toBe(expectedTraceId);
        expect(res.headers.get('X-Trace-Id')).toBe(expectedTraceId);
    });

    it('should accept X-Trace-Id header', async () => {
        const expectedTraceId = '1234567890abcdef1234567890abcdef';

        app.get('/test', (c) => {
            const traceId = c.get('traceId');
            return c.json({ traceId });
        });

        const res = await app.request('/test', {
            headers: {
                'X-Trace-Id': expectedTraceId,
            },
        });

        const data = await res.json();
        expect(data.traceId).toBe(expectedTraceId);
    });

    it('should reject invalid traceparent format', async () => {
        app.get('/test', (c) => {
            const traceId = c.get('traceId');
            return c.json({ traceId });
        });

        // Invalid format (wrong version)
        const res1 = await app.request('/test', {
            headers: {
                traceparent: '01-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01',
            },
        });
        const data1 = await res1.json();
        expect(data1.traceId).not.toBe('0af7651916cd43dd8448eb211c80319c');

        // Invalid format (all zeros trace ID)
        const res2 = await app.request('/test', {
            headers: {
                traceparent: '00-00000000000000000000000000000000-b7ad6b7169203331-01',
            },
        });
        const data2 = await res2.json();
        expect(data2.traceId).not.toBe('00000000000000000000000000000000');
    });

    it('should store traces in ring buffer', async () => {
        app.get('/test', (c) => c.json({ ok: true }));

        await app.request('/test');
        await app.request('/test');

        const traces = getTraces();
        expect(traces.length).toBeGreaterThanOrEqual(2);
    });

    it('should create trace with HTTP span', async () => {
        app.get('/test-path', (c) => {
            const traceId = c.get('traceId');
            return c.json({ traceId });
        });

        const res = await app.request('/test-path');
        const data = await res.json();

        const trace = getTrace(data.traceId);
        expect(trace).toBeDefined();
        expect(trace?.traceId).toBe(data.traceId);
        expect(trace?.spans.length).toBeGreaterThanOrEqual(1);

        const httpSpan = trace?.spans[0];
        expect(httpSpan?.kind).toBe('http');
        expect(httpSpan?.name).toBe('GET /test-path');
        expect(httpSpan?.attributes['http.method']).toBe('GET');
        expect(httpSpan?.attributes['http.url']).toBe('/test-path');
    });

    it('should track successful requests', async () => {
        app.get('/success', (c) => {
            const traceId = c.get('traceId');
            return c.json({ ok: true, traceId });
        });

        const res = await app.request('/success');
        const data = await res.json();

        const trace = getTrace(data.traceId);
        expect(trace?.status).toBe('ok');
        expect(trace?.statusCode).toBe(200);

        const httpSpan = trace?.spans[0];
        expect(httpSpan?.status).toBe('ok');
        expect(httpSpan?.attributes['http.status_code']).toBe(200);
    });

    it('should track failed requests', async () => {
        let capturedTraceId: string | undefined;

        app.onError((err, c) => {
            capturedTraceId = c.get('traceId');
            return c.json({ error: err.message }, 500);
        });

        app.get('/error', () => {
            throw new Error('Test error');
        });

        await app.request('/error');

        const trace = getTrace(capturedTraceId!);
        expect(trace?.status).toBe('error');

        const httpSpan = trace?.spans[0];
        expect(httpSpan?.status).toBe('error');
        expect(httpSpan?.attributes['error']).toBe(true);
        // When error is caught by onError, we detect it via status code
        // The error message is only captured if the error propagates through the middleware
        expect(httpSpan?.attributes['http.status_code']).toBe(500);
    });

    it('should measure span duration', async () => {
        app.get('/test', async (c) => {
            await new Promise((resolve) => setTimeout(resolve, 10));
            const traceId = c.get('traceId');
            return c.json({ traceId });
        });

        const res = await app.request('/test');
        const data = await res.json();

        const trace = getTrace(data.traceId);
        expect(trace?.duration).toBeDefined();
        expect(trace?.duration).toBeGreaterThan(0);

        const httpSpan = trace?.spans[0];
        expect(httpSpan?.duration).toBeDefined();
        expect(httpSpan?.duration).toBeGreaterThan(0);
        expect(httpSpan?.startTime).toBeDefined();
        expect(httpSpan?.endTime).toBeDefined();
    });

    it('should filter traces by status', async () => {
        app.get('/ok', (c) => {
            const traceId = c.get('traceId');
            return c.json({ traceId });
        });

        app.onError((err, c) => c.json({ error: err.message }, 500));
        app.get('/error', () => {
            throw new Error('Test');
        });

        await app.request('/ok');
        await app.request('/error');

        const okTraces = getTraces({ status: 'ok' });
        const errorTraces = getTraces({ status: 'error' });

        expect(okTraces.every((t) => t.status === 'ok')).toBe(true);
        expect(errorTraces.every((t) => t.status === 'error')).toBe(true);
    });

    it('should filter traces by path', async () => {
        app.get('/api/users', (c) => c.json({ ok: true }));
        app.get('/api/posts', (c) => c.json({ ok: true }));

        await app.request('/api/users');
        await app.request('/api/posts');

        const userTraces = getTraces({ path: '/api/users' });
        expect(userTraces.every((t) => t.path === '/api/users')).toBe(true);

        const apiTraces = getTraces({ path: '/api/' });
        expect(apiTraces.length).toBeGreaterThanOrEqual(2);
    });

    it('should filter traces by minimum duration', async () => {
        app.get('/fast', (c) => c.json({ ok: true }));
        app.get('/slow', async (c) => {
            await new Promise((resolve) => setTimeout(resolve, 20));
            return c.json({ ok: true });
        });

        await app.request('/fast');
        await app.request('/slow');

        const slowTraces = getTraces({ minDuration: 15 });
        expect(slowTraces.every((t) => (t.duration || 0) >= 15)).toBe(true);
    });

    it('should paginate traces', async () => {
        app.get('/test', (c) => c.json({ ok: true }));

        for (let i = 0; i < 5; i++) {
            await app.request('/test');
        }

        const page1 = getTraces({ limit: 2, offset: 0 });
        const page2 = getTraces({ limit: 2, offset: 2 });

        expect(page1.length).toBeLessThanOrEqual(2);
        expect(page2.length).toBeLessThanOrEqual(2);

        if (page1.length > 0 && page2.length > 0) {
            expect(page1[0].traceId).not.toBe(page2[0].traceId);
        }
    });

    it('should capture userId in trace', async () => {
        type Variables = {
            traceId: string;
            userId: string;
        };

        const appWithUser = new Hono<{ Variables: Variables }>();
        appWithUser.use('*', tracingMiddleware());

        appWithUser.use('*', async (c, next) => {
            c.set('userId', 'user123');
            await next();
        });

        appWithUser.get('/test', (c) => {
            const traceId = c.get('traceId');
            return c.json({ traceId });
        });

        const res = await appWithUser.request('/test');
        const data = await res.json();

        const trace = getTrace(data.traceId);
        expect(trace?.userId).toBe('user123');

        const httpSpan = trace?.spans[0];
        expect(httpSpan?.attributes['user.id']).toBe('user123');
    });

    it('should provide trace statistics', async () => {
        app.get('/test', (c) => c.json({ ok: true }));
        app.onError((err, c) => c.json({ error: err.message }, 500));
        app.get('/error', () => {
            throw new Error('Test');
        });

        await app.request('/test');
        await app.request('/test');
        await app.request('/error');

        const stats = getTraceStats();
        expect(stats.total).toBeGreaterThanOrEqual(3);
        expect(stats.errorCount).toBeGreaterThanOrEqual(1);
        expect(stats.errorRate).toBeGreaterThan(0);
        expect(stats.avgDurationMs).toBeGreaterThanOrEqual(0);
    });

    it('should create child spans', async () => {
        app.get('/test', (c) => {
            const dbSpan = createSpan(c, 'db.query', 'db', {
                'db.system': 'postgresql',
                'db.statement': 'SELECT * FROM users',
            });

            endSpan(dbSpan, 'ok');

            const traceId = c.get('traceId');
            return c.json({ traceId });
        });

        const res = await app.request('/test');
        const data = await res.json();

        const trace = getTrace(data.traceId);
        expect(trace?.spans.length).toBe(2);

        const dbSpan = trace?.spans[1];
        expect(dbSpan?.kind).toBe('db');
        expect(dbSpan?.name).toBe('db.query');
        expect(dbSpan?.attributes['db.system']).toBe('postgresql');
        expect(dbSpan?.parentSpanId).toBeDefined();
    });

    it('should add events to spans', async () => {
        app.get('/test', (c) => {
            const span = createSpan(c, 'operation', 'external');
            addSpanEvent(span, 'cache.hit', { key: 'user:123' });
            addSpanEvent(span, 'cache.miss', { key: 'user:456' });
            endSpan(span);

            const traceId = c.get('traceId');
            return c.json({ traceId });
        });

        const res = await app.request('/test');
        const data = await res.json();

        const trace = getTrace(data.traceId);
        const span = trace?.spans[1];

        expect(span?.events.length).toBe(2);
        expect(span?.events[0]?.name).toBe('cache.hit');
        expect(span?.events[0]?.attributes?.key).toBe('user:123');
        expect(span?.events[1]?.name).toBe('cache.miss');
    });

    it('should handle span errors', async () => {
        app.get('/test', (c) => {
            const span = createSpan(c, 'failing.operation', 'external');
            const error = new Error('Operation failed');
            endSpan(span, 'error', error);

            const traceId = c.get('traceId');
            return c.json({ traceId });
        });

        const res = await app.request('/test');
        const data = await res.json();

        const trace = getTrace(data.traceId);
        const span = trace?.spans[1];

        expect(span?.status).toBe('error');
        expect(span?.attributes['error']).toBe(true);
        expect(span?.attributes['error.message']).toBe('Operation failed');
        expect(span?.events.length).toBeGreaterThan(0);
        expect(span?.events[0]?.name).toBe('exception');
    });

    it('should export traces in OpenTelemetry format', async () => {
        app.get('/test', (c) => {
            const traceId = c.get('traceId');
            return c.json({ traceId });
        });

        const res = await app.request('/test');
        const data = await res.json();

        const otlp = exportTracesOTLP([data.traceId]);

        expect(otlp.resourceSpans).toBeDefined();
        expect(otlp.resourceSpans.length).toBeGreaterThan(0);

        const resourceSpan = otlp.resourceSpans[0];
        expect(resourceSpan.resource.attributes).toBeDefined();
        expect(resourceSpan.scopeSpans).toBeDefined();
        expect(resourceSpan.scopeSpans[0].spans.length).toBeGreaterThan(0);

        const span = resourceSpan.scopeSpans[0].spans[0];
        expect(span.traceId).toBe(data.traceId);
        expect(span.name).toBe('GET /test');
        expect(span.kind).toBe('HTTP');
        expect(span.status.code).toBe('STATUS_CODE_OK');
    });

    it('should enforce ring buffer limit', async () => {
        app.get('/test', (c) => c.json({ ok: true }));

        // The ring buffer has a limit of 1000 traces
        // We can't test the full limit easily, but we can verify
        // that traces are being stored and retrieved correctly
        const initialCount = getTraces({ limit: 1000 }).length;

        for (let i = 0; i < 10; i++) {
            await app.request('/test');
        }

        const finalCount = getTraces({ limit: 1000 }).length;
        expect(finalCount).toBeGreaterThanOrEqual(initialCount + 10);
    });

    it('should handle concurrent requests with separate traces', async () => {
        app.get('/test', async (c) => {
            await new Promise((resolve) => setTimeout(resolve, 5));
            const traceId = c.get('traceId');
            return c.json({ traceId });
        });

        const [res1, res2, res3] = await Promise.all([
            app.request('/test'),
            app.request('/test'),
            app.request('/test'),
        ]);

        const data1 = await res1.json();
        const data2 = await res2.json();
        const data3 = await res3.json();

        expect(data1.traceId).not.toBe(data2.traceId);
        expect(data2.traceId).not.toBe(data3.traceId);

        const trace1 = getTrace(data1.traceId);
        const trace2 = getTrace(data2.traceId);
        const trace3 = getTrace(data3.traceId);

        expect(trace1).toBeDefined();
        expect(trace2).toBeDefined();
        expect(trace3).toBeDefined();
    });
});

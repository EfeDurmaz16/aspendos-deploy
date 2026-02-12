import { describe, expect, it, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { metricsMiddleware } from '../metrics';
import { getCounter, getMetricsText, resetMetrics } from '../../lib/metrics';

describe('Metrics Middleware', () => {
    let app: Hono;

    beforeEach(() => {
        resetMetrics();
        app = new Hono();
        app.use('*', metricsMiddleware());
    });

    it('should track HTTP request count', async () => {
        app.get('/test', (c) => c.json({ ok: true }));

        await app.request('/test');
        await app.request('/test');

        const count = getCounter('http_requests_total', {
            method: 'GET',
            path: '/test',
            status: '200',
        });

        expect(count).toBe(2);
    });

    it('should track different status codes separately', async () => {
        app.get('/ok', (c) => c.json({ ok: true }));
        app.get('/error', (c) => c.json({ error: true }, 500));

        await app.request('/ok');
        await app.request('/error');

        const ok = getCounter('http_requests_total', {
            method: 'GET',
            path: '/ok',
            status: '200',
        });

        const error = getCounter('http_requests_total', {
            method: 'GET',
            path: '/error',
            status: '500',
        });

        expect(ok).toBe(1);
        expect(error).toBe(1);
    });

    it('should track different HTTP methods separately', async () => {
        app.get('/resource', (c) => c.json({ ok: true }));
        app.post('/resource', (c) => c.json({ ok: true }, 201));

        await app.request('/resource', { method: 'GET' });
        await app.request('/resource', { method: 'POST' });

        const getCount = getCounter('http_requests_total', {
            method: 'GET',
            path: '/resource',
            status: '200',
        });

        const postCount = getCounter('http_requests_total', {
            method: 'POST',
            path: '/resource',
            status: '201',
        });

        expect(getCount).toBe(1);
        expect(postCount).toBe(1);
    });

    it('should normalize UUIDs in paths', async () => {
        app.get('/api/chat/:id', (c) => c.json({ ok: true }));

        await app.request('/api/chat/550e8400-e29b-41d4-a716-446655440000');
        await app.request('/api/chat/123e4567-e89b-12d3-a456-426614174000');

        const count = getCounter('http_requests_total', {
            method: 'GET',
            path: '/api/chat/:id',
            status: '200',
        });

        expect(count).toBe(2);
    });

    it('should normalize numeric IDs in paths', async () => {
        app.get('/api/user/:id', (c) => c.json({ ok: true }));

        await app.request('/api/user/123');
        await app.request('/api/user/456');
        await app.request('/api/user/789');

        const count = getCounter('http_requests_total', {
            method: 'GET',
            path: '/api/user/:id',
            status: '200',
        });

        expect(count).toBe(3);
    });

    it('should skip /metrics endpoint from tracking', async () => {
        app.get('/metrics', (c) => c.text('metrics'));

        await app.request('/metrics');

        const count = getCounter('http_requests_total', {
            method: 'GET',
            path: '/metrics',
            status: '200',
        });

        expect(count).toBe(0);
    });

    it('should skip /health endpoint from tracking', async () => {
        app.get('/health', (c) => c.json({ status: 'ok' }));

        await app.request('/health');

        const count = getCounter('http_requests_total', {
            method: 'GET',
            path: '/health',
            status: '200',
        });

        expect(count).toBe(0);
    });

    it('should skip /ready endpoint from tracking', async () => {
        app.get('/ready', (c) => c.json({ status: 'ok' }));

        await app.request('/ready');

        const count = getCounter('http_requests_total', {
            method: 'GET',
            path: '/ready',
            status: '200',
        });

        expect(count).toBe(0);
    });

    it('should track request duration', async () => {
        app.get('/test', async (c) => {
            await new Promise((resolve) => setTimeout(resolve, 10));
            return c.json({ ok: true });
        });

        await app.request('/test');

        const output = getMetricsText();
        expect(output).toContain('http_request_duration_seconds');
        expect(output).toContain('method="GET",path="/test"');
    });

    it('should track request body size', async () => {
        app.post('/test', (c) => c.json({ ok: true }));

        const body = JSON.stringify({ data: 'test' });
        await app.request('/test', {
            method: 'POST',
            body,
            headers: {
                'Content-Length': String(body.length),
                'Content-Type': 'application/json',
            },
        });

        const output = getMetricsText();
        expect(output).toContain('http_request_size_bytes');
    });

    it('should generate valid Prometheus format', async () => {
        app.get('/test', (c) => c.json({ ok: true }));

        await app.request('/test');

        const output = getMetricsText();

        expect(output).toContain('# HELP http_requests_total');
        expect(output).toContain('# TYPE http_requests_total counter');
        expect(output).toContain('http_requests_total{method="GET",path="/test",status="200"} 1');
    });

    it('should handle errors and track them', async () => {
        app.onError((err, c) => {
            return c.json({ error: err.message }, 500);
        });

        app.get('/error', () => {
            throw new Error('Test error');
        });

        const res = await app.request('/error');
        expect(res.status).toBe(500);

        const count = getCounter('http_requests_total', {
            method: 'GET',
            path: '/error',
            status: '500',
        });

        expect(count).toBe(1);
    });
});

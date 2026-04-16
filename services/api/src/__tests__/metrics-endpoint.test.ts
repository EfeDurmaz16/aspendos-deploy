import { Hono } from 'hono';
import { beforeEach, describe, expect, it } from 'vitest';
import { getMetricsText, resetMetrics } from '../lib/metrics';
import { metricsMiddleware } from '../middleware/metrics';

describe('Metrics Endpoint Integration', () => {
    let app: Hono;

    beforeEach(() => {
        resetMetrics();
        app = new Hono();
        app.use('*', metricsMiddleware());
    });

    it('should serve metrics in Prometheus format', async () => {
        // Add metrics endpoint
        app.get('/metrics', (c) => {
            return c.text(getMetricsText(), 200, {
                'Content-Type': 'text/plain; version=0.0.4',
            });
        });

        // Make some requests to generate metrics
        app.get('/api/test', (c) => c.json({ ok: true }));
        await app.request('/api/test');
        await app.request('/api/test');

        // Fetch metrics
        const res = await app.request('/metrics');
        expect(res.status).toBe(200);
        expect(res.headers.get('content-type')).toBe('text/plain; version=0.0.4');

        const text = await res.text();
        expect(text).toContain('# HELP http_requests_total');
        expect(text).toContain('# TYPE http_requests_total counter');
        expect(text).toContain('http_requests_total{method="GET",path="/api/test",status="200"} 2');
    });

    it('should not track metrics endpoint itself', async () => {
        app.get('/metrics', (c) => {
            return c.text(getMetricsText(), 200, {
                'Content-Type': 'text/plain; version=0.0.4',
            });
        });

        await app.request('/metrics');
        await app.request('/metrics');

        const res = await app.request('/metrics');
        const text = await res.text();

        // Should not contain metrics for /metrics endpoint
        expect(text).not.toContain('path="/metrics"');
    });

    it('should track multiple endpoints separately', async () => {
        app.get('/metrics', (c) => c.text(getMetricsText(), 200));
        app.get('/api/chat', (c) => c.json({ ok: true }));
        app.get('/api/memory', (c) => c.json({ ok: true }));
        app.post('/api/chat', (c) => c.json({ ok: true }, 201));

        await app.request('/api/chat', { method: 'GET' });
        await app.request('/api/chat', { method: 'GET' });
        await app.request('/api/memory', { method: 'GET' });
        await app.request('/api/chat', { method: 'POST' });

        const res = await app.request('/metrics');
        const text = await res.text();

        expect(text).toContain('http_requests_total{method="GET",path="/api/chat",status="200"} 2');
        expect(text).toContain(
            'http_requests_total{method="GET",path="/api/memory",status="200"} 1'
        );
        expect(text).toContain(
            'http_requests_total{method="POST",path="/api/chat",status="201"} 1'
        );
    });

    it('should include histogram buckets', async () => {
        app.get('/metrics', (c) => c.text(getMetricsText(), 200));
        app.get('/api/test', (c) => c.json({ ok: true }));

        await app.request('/api/test');

        const res = await app.request('/metrics');
        const text = await res.text();

        expect(text).toContain('# TYPE http_request_duration_seconds histogram');
        expect(text).toContain('http_request_duration_seconds_bucket');
        expect(text).toContain('http_request_duration_seconds_sum');
        expect(text).toContain('http_request_duration_seconds_count');
        expect(text).toContain('le="+Inf"');
    });

    it('should handle concurrent requests', async () => {
        app.get('/metrics', (c) => c.text(getMetricsText(), 200));
        app.get('/api/test', (c) => c.json({ ok: true }));

        // Make 10 concurrent requests
        await Promise.all(Array.from({ length: 10 }, () => app.request('/api/test')));

        const res = await app.request('/metrics');
        const text = await res.text();

        expect(text).toContain(
            'http_requests_total{method="GET",path="/api/test",status="200"} 10'
        );
    });

    it('should track different status codes', async () => {
        app.get('/metrics', (c) => c.text(getMetricsText(), 200));
        app.get('/success', (c) => c.json({ ok: true }));
        app.get('/error', (c) => c.json({ error: true }, 500));
        app.get('/notfound', (c) => c.json({ error: true }, 404));

        await app.request('/success');
        await app.request('/success');
        await app.request('/error');
        await app.request('/notfound');

        const res = await app.request('/metrics');
        const text = await res.text();

        expect(text).toContain('status="200"} 2');
        expect(text).toContain('status="500"} 1');
        expect(text).toContain('status="404"} 1');
    });

    it('should return valid Prometheus text format', async () => {
        app.get('/metrics', (c) => c.text(getMetricsText(), 200));
        app.get('/test', (c) => c.json({ ok: true }));

        await app.request('/test');

        const res = await app.request('/metrics');
        const text = await res.text();

        // Should end with newline
        expect(text.endsWith('\n')).toBe(true);

        // Should have HELP and TYPE comments
        const lines = text.split('\n');
        const helpLines = lines.filter((line) => line.startsWith('# HELP'));
        const typeLines = lines.filter((line) => line.startsWith('# TYPE'));

        expect(helpLines.length).toBeGreaterThan(0);
        expect(typeLines.length).toBeGreaterThan(0);
        expect(helpLines.length).toBe(typeLines.length);
    });
});

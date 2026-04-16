import { Hono } from 'hono';
import { beforeEach, describe, expect, it } from 'vitest';
import { clearLimits_forTesting, payloadLimits } from '../../middleware/payload-limits';

describe('Payload Limits Middleware', () => {
    let app: Hono;

    beforeEach(() => {
        clearLimits_forTesting();

        app = new Hono();
        app.use('*', payloadLimits());

        // Test routes
        app.post('/api/chat', (c) => c.json({ ok: true }));
        app.post('/api/import', (c) => c.json({ ok: true }));
        app.post('/api/import/chatgpt', (c) => c.json({ ok: true }));
        app.post('/api/council', (c) => c.json({ ok: true }));
        app.post('/api/other', (c) => c.json({ ok: true }));
        app.get('/api/data', (c) => c.json({ ok: true }));
        app.get('/health', (c) => c.json({ status: 'ok' }));
        app.get('/status', (c) => c.json({ status: 'ok' }));
        app.get('/ready', (c) => c.json({ status: 'ok' }));
        app.get('/metrics', (c) => c.json({ status: 'ok' }));
        app.post('/health', (c) => c.json({ status: 'ok' }));
        app.put('/api/other', (c) => c.json({ ok: true }));
    });

    describe('Accepts requests under limit', () => {
        it('should accept a small POST /api/chat payload', async () => {
            const body = JSON.stringify({ message: 'Hello' });
            const res = await app.request('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': String(body.length),
                },
                body,
            });
            expect(res.status).toBe(200);
        });

        it('should accept a small POST /api/council payload', async () => {
            const body = JSON.stringify({ query: 'test' });
            const res = await app.request('/api/council', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': String(body.length),
                },
                body,
            });
            expect(res.status).toBe(200);
        });

        it('should accept a payload under the default 1MB limit for unconfigured endpoints', async () => {
            const body = 'x'.repeat(500 * 1024); // 500KB
            const res = await app.request('/api/other', {
                method: 'POST',
                headers: {
                    'Content-Length': String(body.length),
                },
                body,
            });
            expect(res.status).toBe(200);
        });
    });

    describe('Rejects oversized payloads with 413', () => {
        it('should reject POST /api/chat exceeding 64KB', async () => {
            const body = 'x'.repeat(65 * 1024); // 65KB > 64KB
            const res = await app.request('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Length': String(body.length),
                },
                body,
            });
            expect(res.status).toBe(413);

            const json = await res.json();
            expect(json.error).toBe('Payload too large');
            expect(json.maxSize).toBe('64kb');
            expect(json.endpoint).toBe('/api/chat');
        });

        it('should reject POST /api/council exceeding 32KB', async () => {
            const body = 'x'.repeat(33 * 1024); // 33KB > 32KB
            const res = await app.request('/api/council', {
                method: 'POST',
                headers: {
                    'Content-Length': String(body.length),
                },
                body,
            });
            expect(res.status).toBe(413);

            const json = await res.json();
            expect(json.error).toBe('Payload too large');
            expect(json.maxSize).toBe('32kb');
            expect(json.endpoint).toBe('/api/council');
        });

        it('should reject unconfigured POST endpoint exceeding 1MB default', async () => {
            const body = 'x'.repeat(1.5 * 1024 * 1024); // 1.5MB > 1MB
            const res = await app.request('/api/other', {
                method: 'POST',
                headers: {
                    'Content-Length': String(body.length),
                },
                body,
            });
            expect(res.status).toBe(413);

            const json = await res.json();
            expect(json.error).toBe('Payload too large');
            expect(json.maxSize).toBe('1mb');
        });

        it('should return proper JSON error structure on 413', async () => {
            const body = 'x'.repeat(65 * 1024);
            const res = await app.request('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Length': String(body.length),
                },
                body,
            });
            expect(res.status).toBe(413);

            const json = await res.json();
            expect(json).toHaveProperty('error');
            expect(json).toHaveProperty('maxSize');
            expect(json).toHaveProperty('endpoint');
        });
    });

    describe('Per-endpoint limit enforcement', () => {
        it('should apply 64KB limit for POST /api/chat', async () => {
            // Just under 64KB - should pass
            const smallBody = 'x'.repeat(63 * 1024);
            const res1 = await app.request('/api/chat', {
                method: 'POST',
                headers: { 'Content-Length': String(smallBody.length) },
                body: smallBody,
            });
            expect(res1.status).toBe(200);

            // Over 64KB - should fail
            const bigBody = 'x'.repeat(65 * 1024);
            const res2 = await app.request('/api/chat', {
                method: 'POST',
                headers: { 'Content-Length': String(bigBody.length) },
                body: bigBody,
            });
            expect(res2.status).toBe(413);
        });

        it('should apply 100MB limit for POST /api/import', async () => {
            // A moderately large payload should be accepted (under 100MB)
            const body = 'x'.repeat(2 * 1024 * 1024); // 2MB
            const res = await app.request('/api/import', {
                method: 'POST',
                headers: { 'Content-Length': String(body.length) },
                body,
            });
            expect(res.status).toBe(200);
        });

        it('should apply 100MB limit for POST /api/import/* sub-paths', async () => {
            const body = 'x'.repeat(2 * 1024 * 1024); // 2MB
            const res = await app.request('/api/import/chatgpt', {
                method: 'POST',
                headers: { 'Content-Length': String(body.length) },
                body,
            });
            expect(res.status).toBe(200);
        });

        it('should apply 32KB limit for POST /api/council', async () => {
            const body = 'x'.repeat(33 * 1024);
            const res = await app.request('/api/council', {
                method: 'POST',
                headers: { 'Content-Length': String(body.length) },
                body,
            });
            expect(res.status).toBe(413);
            const json = await res.json();
            expect(json.maxSize).toBe('32kb');
        });
    });

    describe('Skips GET requests', () => {
        it('should allow GET requests regardless of Content-Length header', async () => {
            const res = await app.request('/api/data', {
                method: 'GET',
                headers: {
                    'Content-Length': String(200 * 1024 * 1024), // 200MB declared
                },
            });
            expect(res.status).toBe(200);
        });

        it('should skip HEAD requests', async () => {
            const res = await app.request('/api/data', {
                method: 'HEAD',
            });
            // HEAD may return 404 if no HEAD handler, but not 413
            expect(res.status).not.toBe(413);
        });

        it('should skip OPTIONS requests', async () => {
            const res = await app.request('/api/data', {
                method: 'OPTIONS',
            });
            expect(res.status).not.toBe(413);
        });
    });

    describe('Skips health check paths', () => {
        it('should skip /health', async () => {
            const res = await app.request('/health', {
                method: 'POST',
                headers: { 'Content-Length': String(200 * 1024 * 1024) },
                body: 'x',
            });
            expect(res.status).toBe(200);
        });

        it('should skip /status', async () => {
            const res = await app.request('/status', {
                method: 'GET',
            });
            expect(res.status).toBe(200);
        });

        it('should skip /ready', async () => {
            const res = await app.request('/ready', {
                method: 'GET',
            });
            expect(res.status).toBe(200);
        });

        it('should skip /metrics', async () => {
            const res = await app.request('/metrics', {
                method: 'GET',
            });
            expect(res.status).toBe(200);
        });
    });

    describe('Default limit applies when no per-endpoint config', () => {
        it('should apply 1MB default for unknown POST endpoints', async () => {
            // Under 1MB - passes
            const smallBody = 'x'.repeat(500 * 1024);
            const res1 = await app.request('/api/other', {
                method: 'POST',
                headers: { 'Content-Length': String(smallBody.length) },
                body: smallBody,
            });
            expect(res1.status).toBe(200);

            // Over 1MB - rejected
            const bigBody = 'x'.repeat(1.5 * 1024 * 1024);
            const res2 = await app.request('/api/other', {
                method: 'POST',
                headers: { 'Content-Length': String(bigBody.length) },
                body: bigBody,
            });
            expect(res2.status).toBe(413);
            const json = await res2.json();
            expect(json.maxSize).toBe('1mb');
        });

        it('should apply 1MB default for PUT requests to unknown endpoints', async () => {
            const bigBody = 'x'.repeat(1.5 * 1024 * 1024);
            const res = await app.request('/api/other', {
                method: 'PUT',
                headers: { 'Content-Length': String(bigBody.length) },
                body: bigBody,
            });
            expect(res.status).toBe(413);
        });
    });

    describe('Content-Length header check', () => {
        it('should reject based on Content-Length header alone (fast path)', async () => {
            // Declare a huge Content-Length but send a tiny body
            const res = await app.request('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Length': String(100 * 1024 * 1024), // 100MB declared
                },
                body: 'tiny',
            });
            expect(res.status).toBe(413);
        });
    });
});

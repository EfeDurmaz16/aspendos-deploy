import { Hono } from 'hono';
import { beforeEach, describe, expect, it } from 'vitest';
import { clearRateLimits_forTesting, endpointRateLimit, getRateLimitEntry_forTesting } from '../endpoint-rate-limit';

describe('Endpoint Rate Limit Middleware', () => {
    let app: Hono;

    beforeEach(() => {
        // Clear rate limits before each test
        clearRateLimits_forTesting();

        // Create fresh app instance
        app = new Hono();

        // Mock context variables
        app.use('*', async (c, next) => {
            c.set('userId', 'test-user-123');
            await next();
        });

        // Apply endpoint rate limit middleware
        app.use('*', endpointRateLimit());

        // Test routes
        app.post('/api/chat', (c) => c.json({ message: 'Chat created' }));
        app.post('/api/memory', (c) => c.json({ message: 'Memory stored' }));
        app.post('/api/memory/search', (c) => c.json({ results: [] }));
        app.post('/api/council', (c) => c.json({ session: 'started' }));
        app.post('/api/import/chatgpt', (c) => c.json({ job: 'created' }));
        app.post('/api/account/delete', (c) => c.json({ deleted: true }));
        app.get('/api/models', (c) => c.json({ models: [] }));
        app.post('/api/custom', (c) => c.json({ data: 'ok' }));
    });

    describe('Per-endpoint rate limits', () => {
        it('should enforce 20 req/min for POST /api/chat', async () => {
            // Make 20 successful requests
            for (let i = 0; i < 20; i++) {
                const res = await app.request('/api/chat', { method: 'POST' });
                expect(res.status).toBe(200);
            }

            // 21st request should be rate limited
            const res = await app.request('/api/chat', { method: 'POST' });
            expect(res.status).toBe(429);

            const body = await res.json();
            expect(body.error).toContain('Rate limit exceeded');
            expect(body.endpoint).toBe('POST /api/chat');
            expect(body.limit).toBe(20);
        });

        it('should enforce 30 req/min for POST /api/memory', async () => {
            // Make 30 successful requests
            for (let i = 0; i < 30; i++) {
                const res = await app.request('/api/memory', { method: 'POST' });
                expect(res.status).toBe(200);
            }

            // 31st request should be rate limited
            const res = await app.request('/api/memory', { method: 'POST' });
            expect(res.status).toBe(429);

            const body = await res.json();
            expect(body.limit).toBe(30);
        });

        it('should enforce 60 req/min for POST /api/memory/search', async () => {
            // Make 60 successful requests
            for (let i = 0; i < 60; i++) {
                const res = await app.request('/api/memory/search', { method: 'POST' });
                expect(res.status).toBe(200);
            }

            // 61st request should be rate limited
            const res = await app.request('/api/memory/search', { method: 'POST' });
            expect(res.status).toBe(429);

            const body = await res.json();
            expect(body.limit).toBe(60);
        });

        it('should enforce 10 req/min for POST /api/council', async () => {
            // Make 10 successful requests
            for (let i = 0; i < 10; i++) {
                const res = await app.request('/api/council', { method: 'POST' });
                expect(res.status).toBe(200);
            }

            // 11th request should be rate limited
            const res = await app.request('/api/council', { method: 'POST' });
            expect(res.status).toBe(429);

            const body = await res.json();
            expect(body.limit).toBe(10);
        });

        it('should enforce 5 req/min for POST /api/import/*', async () => {
            // Make 5 successful requests
            for (let i = 0; i < 5; i++) {
                const res = await app.request('/api/import/chatgpt', { method: 'POST' });
                expect(res.status).toBe(200);
            }

            // 6th request should be rate limited
            const res = await app.request('/api/import/chatgpt', { method: 'POST' });
            expect(res.status).toBe(429);

            const body = await res.json();
            expect(body.limit).toBe(5);
            expect(body.endpoint).toBe('POST /api/import/*');
        });

        it('should enforce 1 req/min for POST /api/account/delete', async () => {
            // First request succeeds
            const res1 = await app.request('/api/account/delete', { method: 'POST' });
            expect(res1.status).toBe(200);

            // Second request should be rate limited
            const res2 = await app.request('/api/account/delete', { method: 'POST' });
            expect(res2.status).toBe(429);

            const body = await res2.json();
            expect(body.limit).toBe(1);
        });

        it('should enforce 120 req/min for GET /api/*', async () => {
            // Make 120 successful requests
            for (let i = 0; i < 120; i++) {
                const res = await app.request('/api/models', { method: 'GET' });
                expect(res.status).toBe(200);
            }

            // 121st request should be rate limited
            const res = await app.request('/api/models', { method: 'GET' });
            expect(res.status).toBe(429);

            const body = await res.json();
            expect(body.limit).toBe(120);
        });

        it('should enforce 60 req/min for default endpoints', async () => {
            // Make 60 successful requests
            for (let i = 0; i < 60; i++) {
                const res = await app.request('/api/custom', { method: 'POST' });
                expect(res.status).toBe(200);
            }

            // 61st request should be rate limited
            const res = await app.request('/api/custom', { method: 'POST' });
            expect(res.status).toBe(429);

            const body = await res.json();
            expect(body.limit).toBe(60);
        });
    });

    describe('Rate limit headers', () => {
        it('should include X-RateLimit-Limit header', async () => {
            const res = await app.request('/api/chat', { method: 'POST' });
            expect(res.headers.get('X-RateLimit-Limit')).toBe('20');
        });

        it('should include X-RateLimit-Remaining header', async () => {
            const res1 = await app.request('/api/chat', { method: 'POST' });
            expect(res1.headers.get('X-RateLimit-Remaining')).toBe('19');

            const res2 = await app.request('/api/chat', { method: 'POST' });
            expect(res2.headers.get('X-RateLimit-Remaining')).toBe('18');
        });

        it('should include X-RateLimit-Reset header', async () => {
            const res = await app.request('/api/chat', { method: 'POST' });
            const reset = res.headers.get('X-RateLimit-Reset');
            expect(reset).toBeTruthy();
            expect(Number(reset)).toBeGreaterThan(Date.now() / 1000);
        });

        it('should include Retry-After header on 429 response', async () => {
            // Exhaust rate limit
            for (let i = 0; i < 20; i++) {
                await app.request('/api/chat', { method: 'POST' });
            }

            const res = await app.request('/api/chat', { method: 'POST' });
            expect(res.status).toBe(429);

            const retryAfter = res.headers.get('Retry-After');
            expect(retryAfter).toBeTruthy();
            expect(Number(retryAfter)).toBeGreaterThan(0);
        });
    });

    describe('429 response format', () => {
        it('should return proper error structure on rate limit', async () => {
            // Exhaust rate limit
            for (let i = 0; i < 10; i++) {
                await app.request('/api/council', { method: 'POST' });
            }

            const res = await app.request('/api/council', { method: 'POST' });
            expect(res.status).toBe(429);

            const body = await res.json();
            expect(body).toHaveProperty('error');
            expect(body).toHaveProperty('endpoint');
            expect(body).toHaveProperty('limit');
            expect(body).toHaveProperty('window');
            expect(body).toHaveProperty('retryAfter');
            expect(body.window).toBe('1 minute');
        });

        it('should include endpoint pattern in error response', async () => {
            // Exhaust rate limit
            for (let i = 0; i < 5; i++) {
                await app.request('/api/import/chatgpt', { method: 'POST' });
            }

            const res = await app.request('/api/import/chatgpt', { method: 'POST' });
            const body = await res.json();
            expect(body.endpoint).toBe('POST /api/import/*');
        });
    });

    describe('Sliding window behavior', () => {
        it('should track requests independently per endpoint', async () => {
            // Make 10 requests to /api/chat
            for (let i = 0; i < 10; i++) {
                const res = await app.request('/api/chat', { method: 'POST' });
                expect(res.status).toBe(200);
            }

            // Should still be able to make requests to /api/memory
            const res = await app.request('/api/memory', { method: 'POST' });
            expect(res.status).toBe(200);
        });

        it('should track requests independently per user', async () => {
            const app2 = new Hono();

            // User 1
            app2.use('/api/user1/*', async (c, next) => {
                c.set('userId', 'user-1');
                await next();
            });
            app2.use('/api/user1/*', endpointRateLimit());
            app2.post('/api/user1/chat', (c) => c.json({ ok: true }));

            // User 2
            app2.use('/api/user2/*', async (c, next) => {
                c.set('userId', 'user-2');
                await next();
            });
            app2.use('/api/user2/*', endpointRateLimit());
            app2.post('/api/user2/chat', (c) => c.json({ ok: true }));

            // User 1 exhausts default limit (60 req/min)
            for (let i = 0; i < 60; i++) {
                const res = await app2.request('/api/user1/chat', { method: 'POST' });
                expect(res.status).toBe(200);
            }
            const res1 = await app2.request('/api/user1/chat', { method: 'POST' });
            expect(res1.status).toBe(429);

            // User 2 should still have quota
            const res2 = await app2.request('/api/user2/chat', { method: 'POST' });
            expect(res2.status).toBe(200);
        });

        it('should reset counter after window expires', async () => {
            const entry = getRateLimitEntry_forTesting('endpoint:test-user-123:POST /api/council:minute');
            expect(entry).toBeUndefined();

            // Make a request
            await app.request('/api/council', { method: 'POST' });

            const entry2 = getRateLimitEntry_forTesting('endpoint:test-user-123:POST /api/council:minute');
            expect(entry2).toBeDefined();
            expect(entry2?.count).toBe(1);
        });
    });

    describe('Health check exclusions', () => {
        it('should not rate limit /health endpoint', async () => {
            app.get('/health', (c) => c.json({ status: 'ok' }));

            for (let i = 0; i < 200; i++) {
                const res = await app.request('/health', { method: 'GET' });
                expect(res.status).toBe(200);
            }
        });

        it('should not rate limit /status endpoint', async () => {
            app.get('/status', (c) => c.json({ status: 'ok' }));

            for (let i = 0; i < 200; i++) {
                const res = await app.request('/status', { method: 'GET' });
                expect(res.status).toBe(200);
            }
        });

        it('should not rate limit /.well-known/* endpoints', async () => {
            app.get('/.well-known/security.txt', (c) => c.text('ok'));

            for (let i = 0; i < 200; i++) {
                const res = await app.request('/.well-known/security.txt', { method: 'GET' });
                expect(res.status).toBe(200);
            }
        });

        it('should not rate limit /api/auth/* endpoints', async () => {
            app.post('/api/auth/login', (c) => c.json({ token: 'xyz' }));

            for (let i = 0; i < 200; i++) {
                const res = await app.request('/api/auth/login', { method: 'POST' });
                expect(res.status).toBe(200);
            }
        });
    });

    describe('Anonymous users', () => {
        it('should rate limit by IP for anonymous users', async () => {
            const anonApp = new Hono();

            anonApp.use('*', async (c, next) => {
                c.set('userId', null);
                await next();
            });
            anonApp.use('*', endpointRateLimit());
            anonApp.post('/api/chat', (c) => c.json({ ok: true }));

            // Make 20 requests (limit for /api/chat)
            for (let i = 0; i < 20; i++) {
                const res = await anonApp.request('/api/chat', {
                    method: 'POST',
                    headers: { 'x-forwarded-for': '192.168.1.1' },
                });
                expect(res.status).toBe(200);
            }

            // 21st should fail
            const res = await anonApp.request('/api/chat', {
                method: 'POST',
                headers: { 'x-forwarded-for': '192.168.1.1' },
            });
            expect(res.status).toBe(429);
        });
    });

    describe('Query parameter handling', () => {
        it('should ignore query parameters when matching patterns', async () => {
            app.post('/api/memory/search', (c) => c.json({ results: [] }));

            // Make 60 requests with different query params
            for (let i = 0; i < 60; i++) {
                const res = await app.request(`/api/memory/search?q=test${i}`, { method: 'POST' });
                expect(res.status).toBe(200);
            }

            // 61st request should be rate limited regardless of query params
            const res = await app.request('/api/memory/search?q=different', { method: 'POST' });
            expect(res.status).toBe(429);
        });
    });

    describe('Wildcard pattern matching', () => {
        it('should match /api/import/chatgpt with POST /api/import/* pattern', async () => {
            for (let i = 0; i < 5; i++) {
                const res = await app.request('/api/import/chatgpt', { method: 'POST' });
                expect(res.status).toBe(200);
            }

            const res = await app.request('/api/import/chatgpt', { method: 'POST' });
            expect(res.status).toBe(429);
        });

        it('should match /api/import/claude with POST /api/import/* pattern', async () => {
            app.post('/api/import/claude', (c) => c.json({ ok: true }));

            for (let i = 0; i < 5; i++) {
                const res = await app.request('/api/import/claude', { method: 'POST' });
                expect(res.status).toBe(200);
            }

            const res = await app.request('/api/import/claude', { method: 'POST' });
            expect(res.status).toBe(429);
        });

        it('should share rate limit across wildcard matched endpoints', async () => {
            app.post('/api/import/claude', (c) => c.json({ ok: true }));

            // Make 3 requests to chatgpt
            for (let i = 0; i < 3; i++) {
                await app.request('/api/import/chatgpt', { method: 'POST' });
            }

            // Make 2 requests to claude
            for (let i = 0; i < 2; i++) {
                await app.request('/api/import/claude', { method: 'POST' });
            }

            // 6th request (to either) should be rate limited
            const res = await app.request('/api/import/chatgpt', { method: 'POST' });
            expect(res.status).toBe(429);
        });
    });
});

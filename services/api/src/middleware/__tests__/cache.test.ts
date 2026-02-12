import { Hono } from 'hono';
import { describe, expect, it } from 'vitest';
import { cacheControl } from '../cache';

describe('Cache Control Middleware', () => {
    describe('Cache-Control headers for endpoint patterns', () => {
        it('should set public cache for /api/features endpoint', async () => {
            const app = new Hono();
            app.use('*', cacheControl());
            app.get('/api/features', (c) => c.json({ features: [] }));

            const res = await app.request('/api/features');
            expect(res.headers.get('cache-control')).toBe('public, max-age=3600');
        });

        it('should set public cache for /api/errors endpoint', async () => {
            const app = new Hono();
            app.use('*', cacheControl());
            app.get('/api/errors', (c) => c.json({ errors: [] }));

            const res = await app.request('/api/errors');
            expect(res.headers.get('cache-control')).toBe('public, max-age=3600');
        });

        it('should set public cache for /api/changelog endpoint', async () => {
            const app = new Hono();
            app.use('*', cacheControl());
            app.get('/api/changelog', (c) => c.json({ changelog: [] }));

            const res = await app.request('/api/changelog');
            expect(res.headers.get('cache-control')).toBe('public, max-age=3600');
        });

        it('should set public cache for /api/webhooks/events endpoint', async () => {
            const app = new Hono();
            app.use('*', cacheControl());
            app.get('/api/webhooks/events', (c) => c.json({ events: [] }));

            const res = await app.request('/api/webhooks/events');
            expect(res.headers.get('cache-control')).toBe('public, max-age=3600');
        });

        it('should set 24h cache for /api/legal/terms endpoint', async () => {
            const app = new Hono();
            app.use('*', cacheControl());
            app.get('/api/legal/terms', (c) => c.json({ terms: 'content' }));

            const res = await app.request('/api/legal/terms');
            expect(res.headers.get('cache-control')).toBe('public, max-age=86400');
        });

        it('should set 24h cache for /api/legal/privacy endpoint', async () => {
            const app = new Hono();
            app.use('*', cacheControl());
            app.get('/api/legal/privacy', (c) => c.json({ privacy: 'content' }));

            const res = await app.request('/api/legal/privacy');
            expect(res.headers.get('cache-control')).toBe('public, max-age=86400');
        });

        it('should set no-cache for /health endpoint', async () => {
            const app = new Hono();
            app.use('*', cacheControl());
            app.get('/health', (c) => c.json({ status: 'ok' }));

            const res = await app.request('/health');
            expect(res.headers.get('cache-control')).toBe('no-cache, no-store, must-revalidate');
        });

        it('should set no-cache for /ready endpoint', async () => {
            const app = new Hono();
            app.use('*', cacheControl());
            app.get('/ready', (c) => c.json({ status: 'ok' }));

            const res = await app.request('/ready');
            expect(res.headers.get('cache-control')).toBe('no-cache, no-store, must-revalidate');
        });

        it('should set private no-cache for /api/chat endpoints', async () => {
            const app = new Hono();
            app.use('*', cacheControl());
            app.get('/api/chat', (c) => c.json({ chats: [] }));

            const res = await app.request('/api/chat');
            expect(res.headers.get('cache-control')).toBe(
                'private, no-cache, no-store, must-revalidate'
            );
        });

        it('should set private 1min cache for /api/memory endpoints', async () => {
            const app = new Hono();
            app.use('*', cacheControl());
            app.get('/api/memory', (c) => c.json({ memories: [] }));

            const res = await app.request('/api/memory');
            expect(res.headers.get('cache-control')).toBe('private, max-age=60');
        });

        it('should set public cache for /api/models endpoint', async () => {
            const app = new Hono();
            app.use('*', cacheControl());
            app.get('/api/models', (c) => c.json({ models: [] }));

            const res = await app.request('/api/models');
            expect(res.headers.get('cache-control')).toBe('public, max-age=3600');
        });

        it('should set public cache for /api/docs endpoint', async () => {
            const app = new Hono();
            app.use('*', cacheControl());
            app.get('/api/docs', (c) => c.json({ docs: [] }));

            const res = await app.request('/api/docs');
            expect(res.headers.get('cache-control')).toBe('public, max-age=3600');
        });
    });

    describe('Vary headers', () => {
        it('should set Vary header with Accept-Encoding and Authorization for /api/features', async () => {
            const app = new Hono();
            app.use('*', cacheControl());
            app.get('/api/features', (c) => c.json({ features: [] }));

            const res = await app.request('/api/features');
            expect(res.headers.get('vary')).toBe('Accept-Encoding, Authorization');
        });

        it('should set Vary header with Accept-Encoding for /api/errors', async () => {
            const app = new Hono();
            app.use('*', cacheControl());
            app.get('/api/errors', (c) => c.json({ errors: [] }));

            const res = await app.request('/api/errors');
            expect(res.headers.get('vary')).toBe('Accept-Encoding');
        });

        it('should set Vary header with Authorization for /api/chat', async () => {
            const app = new Hono();
            app.use('*', cacheControl());
            app.get('/api/chat', (c) => c.json({ chats: [] }));

            const res = await app.request('/api/chat');
            expect(res.headers.get('vary')).toBe('Authorization');
        });

        it('should set Vary header with Authorization and Accept-Encoding for /api/memory', async () => {
            const app = new Hono();
            app.use('*', cacheControl());
            app.get('/api/memory', (c) => c.json({ memories: [] }));

            const res = await app.request('/api/memory');
            expect(res.headers.get('vary')).toBe('Authorization, Accept-Encoding');
        });

        it('should not set Vary header for /health endpoint', async () => {
            const app = new Hono();
            app.use('*', cacheControl());
            app.get('/health', (c) => c.json({ status: 'ok' }));

            const res = await app.request('/health');
            // Health endpoints have empty varyHeaders array
            expect(res.headers.get('vary')).toBeFalsy();
        });
    });

    describe('ETag generation', () => {
        it('should generate ETag for cacheable responses', async () => {
            const app = new Hono();
            app.use('*', cacheControl());
            app.get('/api/models', (c) => c.json({ models: ['gpt-4', 'claude-3'] }));

            const res = await app.request('/api/models');
            const etag = res.headers.get('etag');

            expect(etag).toBeTruthy();
            expect(etag).toMatch(/^"[a-f0-9]{16}"$/);
        });

        it('should return 304 when If-None-Match matches ETag', async () => {
            const app = new Hono();
            app.use('*', cacheControl());
            app.get('/api/models', (c) => c.json({ models: ['gpt-4'] }));

            // First request to get ETag
            const res1 = await app.request('/api/models');
            const etag = res1.headers.get('etag');

            expect(etag).toBeTruthy();

            // Second request with If-None-Match
            const res2 = await app.request('/api/models', {
                headers: {
                    'if-none-match': etag!,
                },
            });

            expect(res2.status).toBe(304);
        });

        it('should return 200 when If-None-Match does not match ETag', async () => {
            const app = new Hono();
            app.use('*', cacheControl());
            app.get('/api/models', (c) => c.json({ models: ['gpt-4'] }));

            const res = await app.request('/api/models', {
                headers: {
                    'if-none-match': '"wrong-etag-value"',
                },
            });

            expect(res.status).toBe(200);
        });

        it('should not generate ETag for no-cache endpoints', async () => {
            const app = new Hono();
            app.use('*', cacheControl());
            app.get('/api/chat', (c) => c.json({ chats: [] }));

            const res = await app.request('/api/chat');
            expect(res.headers.get('etag')).toBeFalsy();
        });

        it('should generate same ETag for same content', async () => {
            const app = new Hono();
            app.use('*', cacheControl());
            app.get('/api/models', (c) => c.json({ models: ['gpt-4'] }));

            const res1 = await app.request('/api/models');
            const res2 = await app.request('/api/models');

            expect(res1.headers.get('etag')).toBe(res2.headers.get('etag'));
        });

        it('should generate different ETag for different content', async () => {
            const app = new Hono();
            app.use('*', cacheControl());
            let counter = 0;
            app.get('/api/models', (c) => c.json({ models: [`model-${counter++}`] }));

            const res1 = await app.request('/api/models');
            const res2 = await app.request('/api/models');

            expect(res1.headers.get('etag')).not.toBe(res2.headers.get('etag'));
        });
    });

    describe('HTTP method handling', () => {
        it('should apply caching only to GET requests', async () => {
            const app = new Hono();
            app.use('*', cacheControl());
            app.get('/api/models', (c) => c.json({ models: [] }));

            const res = await app.request('/api/models');
            expect(res.headers.get('cache-control')).toBe('public, max-age=3600');
        });

        it('should apply caching to HEAD requests', async () => {
            const app = new Hono();
            app.use('*', cacheControl());
            app.all('/api/models', (c) => c.json({ models: [] }));

            const res = await app.request('/api/models', { method: 'HEAD' });
            expect(res.headers.get('cache-control')).toBe('public, max-age=3600');
        });

        it('should set no-cache for POST requests', async () => {
            const app = new Hono();
            app.use('*', cacheControl());
            app.post('/api/chat', (c) => c.json({ success: true }));

            const res = await app.request('/api/chat', {
                method: 'POST',
                body: JSON.stringify({ message: 'test' }),
            });

            expect(res.headers.get('cache-control')).toBe('no-cache, no-store, must-revalidate');
            expect(res.headers.get('pragma')).toBe('no-cache');
            expect(res.headers.get('expires')).toBe('0');
        });

        it('should set no-cache for PUT requests', async () => {
            const app = new Hono();
            app.use('*', cacheControl());
            app.put('/api/chat/123', (c) => c.json({ success: true }));

            const res = await app.request('/api/chat/123', {
                method: 'PUT',
                body: JSON.stringify({ title: 'updated' }),
            });

            expect(res.headers.get('cache-control')).toBe('no-cache, no-store, must-revalidate');
        });

        it('should set no-cache for DELETE requests', async () => {
            const app = new Hono();
            app.use('*', cacheControl());
            app.delete('/api/chat/123', (c) => c.json({ success: true }));

            const res = await app.request('/api/chat/123', { method: 'DELETE' });
            expect(res.headers.get('cache-control')).toBe('no-cache, no-store, must-revalidate');
        });

        it('should set no-cache for PATCH requests', async () => {
            const app = new Hono();
            app.use('*', cacheControl());
            app.patch('/api/chat/123', (c) => c.json({ success: true }));

            const res = await app.request('/api/chat/123', {
                method: 'PATCH',
                body: JSON.stringify({ archived: true }),
            });

            expect(res.headers.get('cache-control')).toBe('no-cache, no-store, must-revalidate');
        });
    });

    describe('Default cache behavior', () => {
        it('should use conservative caching for endpoints without explicit rules', async () => {
            const app = new Hono();
            app.use('*', cacheControl());
            app.get('/api/unknown-endpoint', (c) => c.json({ data: 'test' }));

            const res = await app.request('/api/unknown-endpoint');
            expect(res.headers.get('cache-control')).toBe('private, no-cache');
            expect(res.headers.get('vary')).toBe('Accept-Encoding, Authorization');
        });

        it('should apply default caching to custom routes', async () => {
            const app = new Hono();
            app.use('*', cacheControl());
            app.get('/custom/route', (c) => c.json({ custom: true }));

            const res = await app.request('/custom/route');
            expect(res.headers.get('cache-control')).toBe('private, no-cache');
        });
    });

    describe('Status code handling', () => {
        it('should not set ETag for non-200 responses', async () => {
            const app = new Hono();
            app.use('*', cacheControl());
            app.get('/api/models', (c) => c.json({ error: 'Not found' }, 404));

            const res = await app.request('/api/models');
            expect(res.headers.get('etag')).toBeFalsy();
        });

        it('should set Cache-Control even for error responses', async () => {
            const app = new Hono();
            app.use('*', cacheControl());
            app.get('/api/models', (c) => c.json({ error: 'Server error' }, 500));

            const res = await app.request('/api/models');
            expect(res.headers.get('cache-control')).toBe('public, max-age=3600');
        });
    });
});

import { Hono } from 'hono';
import { describe, expect, it } from 'vitest';
import { requireAdmin } from '../auth';

describe('requireAdmin session boundary', () => {
    it('rejects API-key authenticated admin access before route execution', async () => {
        const app = new Hono();
        app.use('*', async (c, next) => {
            c.set('userId', 'admin-user-1');
            c.set('apiKeyId', 'key-1');
            c.set('apiKeyPermissions', ['admin:read']);
            return next();
        });
        app.get('/system/info', requireAdmin, (c) => c.json({ ok: true }));

        const res = await app.request('/system/info');

        expect(res.status).toBe(403);
        await expect(res.json()).resolves.toEqual({
            error: 'API key authentication is not allowed for this route',
        });
    });
});

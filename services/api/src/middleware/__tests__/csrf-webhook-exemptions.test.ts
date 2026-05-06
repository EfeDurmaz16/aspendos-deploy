import { Hono } from 'hono';
import { describe, expect, it } from 'vitest';
import { csrfProtection, isCsrfExemptPath } from '../csrf';

function createApp(path: string) {
    const app = new Hono();
    app.use('*', csrfProtection);
    app.post(path, (c) => c.json({ ok: true }));
    return app;
}

describe('csrf webhook exemptions', () => {
    it('exempts explicitly supported messaging webhook paths from origin checks', async () => {
        const app = createApp('/api/messaging/webhook/slack');

        const res = await app.request('/api/messaging/webhook/slack', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'event_callback' }),
        });

        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({ ok: true });
        expect(isCsrfExemptPath('/api/messaging/webhook/slack')).toBe(true);
    });

    it('does not exempt arbitrary paths that merely contain webhook', async () => {
        const app = createApp('/api/user/webhook-settings');

        const res = await app.request('/api/user/webhook-settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ enabled: true }),
        });

        expect(res.status).toBe(403);
        expect(isCsrfExemptPath('/api/user/webhook-settings')).toBe(false);
    });

    it('keeps scheduler management behind normal csrf checks', async () => {
        const app = createApp('/api/scheduler/tasks');

        const res = await app.request('/api/scheduler/tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: 'follow up' }),
        });

        expect(res.status).toBe(403);
        expect(isCsrfExemptPath('/api/scheduler/tasks')).toBe(false);
        expect(isCsrfExemptPath('/api/scheduler/webhook/execute')).toBe(true);
    });
});

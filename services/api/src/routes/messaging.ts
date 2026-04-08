/**
 * Messaging Routes
 *
 * Platform connection management + Chat SDK webhook routing.
 * All messaging platform handling is done by Vercel Chat SDK.
 *
 * Architecture:
 *   POST /messaging/webhook/:platform → bot.webhooks[platform](request)
 *   GET/POST/DELETE /messaging/connections → PlatformConnection CRUD
 */

// TODO(phase-a-day-3): replaced by Convex — see convex/schema.ts
// import { prisma } from '@aspendos/db';
const prisma = {} as any;

import { Hono } from 'hono';
import { requireAuth } from '../middleware/auth';
import { validateBody, validateParams } from '../middleware/validate';
import { connectionIdParamSchema, createConnectionSchema } from '../validation/messaging.schema';

const messagingRoutes = new Hono();

// ============================================
// PLATFORM CONNECTIONS (authenticated)
// ============================================

// GET /messaging/connections - List user's platform connections
messagingRoutes.get('/connections', requireAuth, async (c) => {
    const userId = c.get('userId') as string;
    const connections = await prisma.platformConnection.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
    });
    return c.json({ connections });
});

// POST /messaging/connections - Link a new platform
messagingRoutes.post(
    '/connections',
    requireAuth,
    validateBody(createConnectionSchema),
    async (c) => {
        const userId = c.get('userId') as string;
        const body = await c.req.json();

        const { platform, platformUserId, metadata } = body;

        const connection = await prisma.platformConnection.upsert({
            where: {
                platform_platformUserId: { platform, platformUserId },
            },
            update: { userId, metadata, isActive: true },
            create: { userId, platform, platformUserId, metadata },
        });

        return c.json({ connection }, 201);
    }
);

// DELETE /messaging/connections/:id - Unlink a platform
messagingRoutes.delete(
    '/connections/:id',
    requireAuth,
    validateParams(connectionIdParamSchema),
    async (c) => {
        const userId = c.get('userId') as string;
        const id = c.req.param('id');

        await prisma.platformConnection.updateMany({
            where: { id, userId },
            data: { isActive: false },
        });

        return c.json({ success: true });
    }
);

// ============================================
// CHAT SDK WEBHOOK ENDPOINTS
// Vercel Chat SDK handles all platform-specific parsing,
// message normalization, streaming, and response delivery.
// ============================================

// Lazy-load the Chat SDK bot to avoid crashing if packages aren't installed
async function getBot() {
    try {
        const { bot } = await import('../bot');
        return bot;
    } catch (err) {
        console.warn(
            '[Messaging] Chat SDK bot not available:',
            err instanceof Error ? err.message : 'Unknown'
        );
        return null;
    }
}

// POST /messaging/webhook/:platform - Universal webhook handler
messagingRoutes.post('/webhook/:platform', async (c) => {
    const bot = await getBot();
    if (!bot) {
        return c.json({ error: 'Messaging bot not configured. Install chat SDK packages.' }, 503);
    }

    const platform = c.req.param('platform') as string;
    const handler = (bot.webhooks as Record<string, any>)?.[platform];

    if (!handler) {
        return c.json({ error: `Unknown platform: ${platform}` }, 404);
    }

    const response = await handler(c.req.raw, {
        waitUntil: (task: Promise<unknown>) => {
            task.catch((err: unknown) => console.error('[Webhook] Background task failed:', err));
        },
    });

    return response;
});

// GET /messaging/webhook/:platform - Verification endpoints (WhatsApp, Slack)
messagingRoutes.get('/webhook/:platform', async (c) => {
    const bot = await getBot();
    if (!bot) {
        return c.json({ error: 'Messaging bot not configured' }, 503);
    }

    const platform = c.req.param('platform') as string;
    const handler = (bot.webhooks as Record<string, any>)?.[platform];

    if (!handler) {
        return c.json({ error: `Unknown platform: ${platform}` }, 404);
    }

    return handler(c.req.raw, {
        waitUntil: (task: Promise<unknown>) => {
            task.catch(() => {});
        },
    });
});

export default messagingRoutes;

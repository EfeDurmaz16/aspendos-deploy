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

import { prisma } from '@aspendos/db';
import { Hono } from 'hono';
import { bot } from '../bot';
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

// POST /messaging/webhook/:platform - Universal webhook handler
messagingRoutes.post('/webhook/:platform', async (c) => {
    const platform = c.req.param('platform') as keyof typeof bot.webhooks;
    const handler = bot.webhooks[platform];

    if (!handler) {
        return c.json({ error: `Unknown platform: ${platform}` }, 404);
    }

    // Pass raw request to Chat SDK handler
    // Chat SDK adapters handle verification, parsing, and response
    const response = await handler(c.req.raw, {
        waitUntil: (task: Promise<unknown>) => {
            // Fire-and-forget for background tasks (memory extraction, etc.)
            task.catch((err) => console.error('[Webhook] Background task failed:', err));
        },
    });

    return response;
});

// GET /messaging/webhook/:platform - Verification endpoints (WhatsApp, Slack)
messagingRoutes.get('/webhook/:platform', async (c) => {
    const platform = c.req.param('platform') as keyof typeof bot.webhooks;
    const handler = bot.webhooks[platform];

    if (!handler) {
        return c.json({ error: `Unknown platform: ${platform}` }, 404);
    }

    // Some platforms (WhatsApp) use GET for webhook verification
    return handler(c.req.raw, {
        waitUntil: (task: Promise<unknown>) => {
            task.catch(() => {});
        },
    });
});

export default messagingRoutes;

/**
 * Messaging Gateway Routes
 *
 * Handles platform connection management and webhook endpoints
 * for multi-platform messaging (Telegram, WhatsApp, Slack, etc.)
 */

import { prisma } from '@aspendos/db';
import { Hono } from 'hono';
import { getGateway, registerGateway } from '../messaging/gateway';
import { TelegramGateway } from '../messaging/telegram';
import { requireAuth } from '../middleware/auth';

const messagingRoutes = new Hono();

// Register platform gateways on module load
registerGateway(new TelegramGateway());

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
messagingRoutes.post('/connections', requireAuth, async (c) => {
    const userId = c.get('userId') as string;
    const body = await c.req.json();

    const { platform, platformUserId, metadata } = body;
    if (!platform || !platformUserId) {
        return c.json({ error: 'platform and platformUserId are required' }, 400);
    }

    const connection = await prisma.platformConnection.upsert({
        where: {
            platform_platformUserId: { platform, platformUserId },
        },
        update: { userId, metadata, isActive: true },
        create: { userId, platform, platformUserId, metadata },
    });

    return c.json({ connection }, 201);
});

// DELETE /messaging/connections/:id - Unlink a platform
messagingRoutes.delete('/connections/:id', requireAuth, async (c) => {
    const userId = c.get('userId') as string;
    const id = c.req.param('id');

    await prisma.platformConnection.updateMany({
        where: { id, userId },
        data: { isActive: false },
    });

    return c.json({ success: true });
});

// ============================================
// WEBHOOK ENDPOINTS (unauthenticated — verified by platform)
// ============================================

// POST /messaging/webhook/telegram - Telegram webhook
messagingRoutes.post('/webhook/telegram', async (c) => {
    const gateway = getGateway('telegram');
    if (!gateway) {
        return c.json({ error: 'Telegram gateway not configured' }, 503);
    }

    const body = await c.req.json();
    const message = gateway.parseInboundMessage(body);

    if (!message) {
        return c.json({ ok: true }); // Acknowledge but ignore unsupported events
    }

    // Look up the YULA user for this platform user
    const connection = await prisma.platformConnection.findFirst({
        where: {
            platform: 'telegram',
            platformUserId: message.platformUserId,
            isActive: true,
        },
    });

    if (!connection) {
        // User not linked — send a link prompt
        await gateway.sendMessage(message.platformUserId, {
            text: 'Welcome! Please link your account at yula.dev/settings/messaging to start chatting.',
            type: 'notification',
        });
        return c.json({ ok: true });
    }

    // Handle callback queries (approval buttons)
    if (message.metadata?.isCallback) {
        const action = message.metadata.action as string;
        const value = message.metadata.value as string;

        if (action === 'approve' || action === 'always_allow') {
            const { approveRequest, addToAllowlist } = await import('../services/approval.service');
            const approval = await approveRequest(value, connection.userId);
            if (action === 'always_allow' && approval) {
                await addToAllowlist(connection.userId, approval.toolName, 'permanent');
            }
            await gateway.sendMessage(message.platformUserId, {
                text: `✅ Approved${action === 'always_allow' ? ' (always)' : ''}`,
                type: 'response',
            });
        } else if (action === 'reject') {
            const { rejectRequest } = await import('../services/approval.service');
            await rejectRequest(value, connection.userId);
            await gateway.sendMessage(message.platformUserId, {
                text: '❌ Rejected',
                type: 'response',
            });
        }

        return c.json({ ok: true });
    }

    // Regular message — route through the chat pipeline
    // For now, respond with acknowledgment. Full pipeline integration in WS4 phase 2.
    await gateway.sendMessage(message.platformUserId, {
        text: 'Message received! Full chat integration coming soon.',
        type: 'response',
    });

    return c.json({ ok: true });
});

export default messagingRoutes;

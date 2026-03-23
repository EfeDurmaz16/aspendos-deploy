/**
 * Messaging Gateway Routes
 *
 * Handles platform connection management and webhook endpoints
 * for multi-platform messaging (Telegram, WhatsApp, Slack, etc.)
 */

import { prisma } from '@aspendos/db';
import { Hono } from 'hono';
import { DiscordGateway } from '../messaging/discord';
import { EmailGateway } from '../messaging/email';
import { getGateway, registerGateway } from '../messaging/gateway';
import { SlackGateway } from '../messaging/slack';
import { TelegramGateway } from '../messaging/telegram';
import { WhatsAppGateway } from '../messaging/whatsapp';
import { requireAuth } from '../middleware/auth';
import { validateBody, validateParams } from '../middleware/validate';
import { connectionIdParamSchema, createConnectionSchema } from '../validation/messaging.schema';

const messagingRoutes = new Hono();

// Register all platform gateways on module load
registerGateway(new TelegramGateway());
registerGateway(new WhatsAppGateway());
registerGateway(new SlackGateway());
registerGateway(new DiscordGateway());
registerGateway(new EmailGateway());

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
// CHAT PIPELINE FOR INBOUND MESSAGES
// ============================================

async function processInboundChatMessage(
    userId: string,
    text: string,
    gateway: { sendMessage: (id: string, content: any) => Promise<any> },
    platformUserId: string
) {
    const { generateText, gateway: aiGateway } = await import('ai');
    const { buildSystemPrompt } = await import('../lib/system-prompt');
    const { getMemoryAgent } = await import('../services/memory-agent');
    const memoryRouter = await import('../services/memory-router.service');

    // Memory decision
    const memoryAgent = getMemoryAgent();
    const decision = await memoryAgent.decideMemoryUsage(userId, text);

    // Retrieve memories if needed
    let memories: Array<{ content: string; sector: string; confidence: number }> = [];
    if (decision.useMemory) {
        try {
            const results = await memoryRouter.searchMemories(text, userId, { limit: 5 });
            memories = results.map((m) => ({
                content: m.content,
                sector: m.sector || 'semantic',
                confidence: m.salience || 0.8,
            }));
        } catch {
            // Continue without memory
        }
    }

    const systemPrompt = buildSystemPrompt(decision, memories);

    // Generate response (non-streaming for messaging platforms)
    const model = aiGateway('groq', { modelId: 'llama-3.3-70b-versatile' });
    const result = await generateText({
        model,
        system: systemPrompt,
        prompt: text,
        temperature: 0.7,
        maxTokens: 1000,
    });

    // Send response
    await gateway.sendMessage(platformUserId, {
        text: result.text || 'I could not generate a response.',
        type: 'response',
    });

    // Auto-extract memory from exchange (fire-and-forget)
    memoryRouter.supermemory
        .processConversation(`msg_${Date.now()}`, userId, [
            { role: 'user', content: text },
            { role: 'assistant', content: result.text },
        ])
        .catch(() => {});
}

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

    // Route regular messages through the AI chat pipeline
    try {
        await processInboundChatMessage(
            connection.userId,
            message.text,
            gateway,
            message.platformUserId
        );
    } catch (error) {
        console.error('[Messaging] Chat pipeline error:', error);
        await gateway.sendMessage(message.platformUserId, {
            text: 'Sorry, something went wrong processing your message. Please try again.',
            type: 'response',
        });
    }

    return c.json({ ok: true });
});

// ============================================
// WHATSAPP WEBHOOK
// ============================================

// GET /messaging/webhook/whatsapp - Verify webhook (Meta challenge)
messagingRoutes.get('/webhook/whatsapp', async (c) => {
    const { verifyWhatsAppWebhook } = await import('../messaging/whatsapp');
    const mode = c.req.query('hub.mode') || '';
    const token = c.req.query('hub.verify_token') || '';
    const challenge = c.req.query('hub.challenge') || '';

    const result = verifyWhatsAppWebhook(mode, token, challenge);
    if (result) return c.text(result);
    return c.text('Forbidden', 403);
});

// POST /messaging/webhook/whatsapp - Inbound messages
messagingRoutes.post('/webhook/whatsapp', async (c) => {
    const gateway = getGateway('whatsapp');
    if (!gateway) return c.json({ ok: true });

    const body = await c.req.json();
    const message = gateway.parseInboundMessage(body);
    if (!message) return c.json({ ok: true });

    const connection = await prisma.platformConnection.findFirst({
        where: { platform: 'whatsapp', platformUserId: message.platformUserId, isActive: true },
    });

    if (!connection) return c.json({ ok: true });

    // Handle callback queries (approval buttons)
    if (message.metadata?.isCallback) {
        await handleApprovalCallback(message, connection.userId, gateway);
    }

    return c.json({ ok: true });
});

// ============================================
// SLACK WEBHOOK
// ============================================

// POST /messaging/webhook/slack - Events and interactions
messagingRoutes.post('/webhook/slack', async (c) => {
    const body = await c.req.json();

    // Handle URL verification challenge
    const { handleSlackChallenge } = await import('../messaging/slack');
    const challenge = handleSlackChallenge(body);
    if (challenge) return c.json({ challenge });

    const gateway = getGateway('slack');
    if (!gateway) return c.json({ ok: true });

    const message = gateway.parseInboundMessage(body);
    if (!message) return c.json({ ok: true });

    const connection = await prisma.platformConnection.findFirst({
        where: { platform: 'slack', platformUserId: message.platformUserId, isActive: true },
    });

    if (!connection) return c.json({ ok: true });

    if (message.metadata?.isCallback) {
        await handleApprovalCallback(message, connection.userId, gateway);
    }

    return c.json({ ok: true });
});

// ============================================
// DISCORD WEBHOOK
// ============================================

// POST /messaging/webhook/discord - Interactions
messagingRoutes.post('/webhook/discord', async (c) => {
    const gateway = getGateway('discord');
    if (!gateway) return c.json({ ok: true });

    const body = await c.req.json();

    // Handle Discord PING (type 1)
    if (body.type === 1) {
        return c.json({ type: 1 });
    }

    const message = gateway.parseInboundMessage(body);
    if (!message) return c.json({ ok: true });

    const connection = await prisma.platformConnection.findFirst({
        where: { platform: 'discord', platformUserId: message.platformUserId, isActive: true },
    });

    if (!connection) return c.json({ ok: true });

    if (message.metadata?.isCallback) {
        // Respond to Discord interaction within 3 seconds
        const { respondToInteraction } = await import('../messaging/discord');
        if (message.metadata.interactionToken && message.messageId) {
            await respondToInteraction(
                message.messageId,
                message.metadata.interactionToken as string,
                message.metadata.action === 'approve' ? 'Approved' : 'Rejected'
            );
        }
        await handleApprovalCallback(message, connection.userId, gateway);
    }

    return c.json({ ok: true });
});

// ============================================
// SHARED HELPERS
// ============================================

async function handleApprovalCallback(
    message: { metadata?: Record<string, unknown>; platformUserId: string },
    userId: string,
    gateway: { sendMessage: (id: string, content: any) => Promise<any> }
) {
    const action = message.metadata?.action as string;
    const value = message.metadata?.value as string;

    if (action === 'approve' || action === 'always_allow') {
        const { approveRequest, addToAllowlist } = await import('../services/approval.service');
        const approval = await approveRequest(value, userId);
        if (action === 'always_allow' && approval) {
            await addToAllowlist(userId, approval.toolName, 'permanent');
        }
        await gateway.sendMessage(message.platformUserId, {
            text: `Approved${action === 'always_allow' ? ' (always)' : ''}`,
            type: 'response',
        });
    } else if (action === 'reject') {
        const { rejectRequest } = await import('../services/approval.service');
        await rejectRequest(value, userId);
        await gateway.sendMessage(message.platformUserId, {
            text: 'Rejected',
            type: 'response',
        });
    }
}

export default messagingRoutes;

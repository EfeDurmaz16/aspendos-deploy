/**
 * YULA Chat SDK Bot
 *
 * Multi-platform bot using Vercel Chat SDK.
 * Handles Slack, Telegram, Discord, WhatsApp via unified adapter interface.
 * Pipes AI responses through the existing Vercel AI SDK streaming pipeline.
 *
 * Architecture:
 *   Platform webhook → Chat SDK adapter → bot.onNewMention/onSubscribedMessage
 *   → streamText() with tools → thread.post(fullStream) → Platform
 */

import { DiscordAdapter } from '@chat-adapter/discord';
import { SlackAdapter } from '@chat-adapter/slack';
import { PostgresState } from '@chat-adapter/state-pg';
import { TelegramAdapter } from '@chat-adapter/telegram';
import { WhatsAppAdapter } from '@chat-adapter/whatsapp';
import { gateway, streamText } from 'ai';
import { Chat } from 'chat';
import { getSystemPrompt } from './prompt';
import { getAgentTools } from './tools';

// ============================================
// STATE ADAPTER (PostgreSQL for thread subscriptions)
// ============================================

const state = process.env.DATABASE_URL
    ? new PostgresState({ connectionString: process.env.DATABASE_URL })
    : undefined;

// ============================================
// PLATFORM ADAPTERS
// ============================================

const adapters: Record<string, any> = {};

if (process.env.SLACK_BOT_TOKEN) {
    adapters.slack = new SlackAdapter();
}
if (process.env.TELEGRAM_BOT_TOKEN) {
    adapters.telegram = new TelegramAdapter();
}
if (process.env.DISCORD_BOT_TOKEN) {
    adapters.discord = new DiscordAdapter();
}
if (process.env.WHATSAPP_TOKEN) {
    adapters.whatsapp = new WhatsAppAdapter();
}

// ============================================
// BOT INSTANCE
// ============================================

export const bot = new Chat({
    adapters,
    ...(state ? { state } : {}),
});

// ============================================
// EVENT HANDLERS
// ============================================

/**
 * Handle new mentions (first message in a thread).
 * Subscribes the thread for multi-turn conversation.
 */
bot.onNewMention(async (thread, message) => {
    // Subscribe for multi-turn
    await thread.subscribe();

    await handleMessage(thread, message);
});

/**
 * Handle messages in subscribed threads (multi-turn).
 */
bot.onSubscribedMessage(async (thread, message) => {
    await handleMessage(thread, message);
});

/**
 * Handle button interactions (approval flow).
 */
bot.onAction(async (action) => {
    const { actionId, value, thread } = action;

    if (actionId?.startsWith('yula_approve')) {
        const { approveRequest, addToAllowlist } = await import('../services/approval.service');
        await approveRequest(value, 'system');
        await thread.post('Approved.');
    } else if (actionId?.startsWith('yula_reject')) {
        const { rejectRequest } = await import('../services/approval.service');
        await rejectRequest(value, 'system');
        await thread.post('Rejected.');
    } else if (actionId?.startsWith('yula_always')) {
        const { approveRequest, addToAllowlist } = await import('../services/approval.service');
        const approval = await approveRequest(value, 'system');
        if (approval) {
            await addToAllowlist('system', approval.toolName, 'permanent');
        }
        await thread.post('Approved (always allowed).');
    }
});

// ============================================
// CORE MESSAGE HANDLER
// ============================================

async function handleMessage(
    thread: any,
    message: { text: string; user?: { id?: string; name?: string } }
) {
    try {
        // Resolve YULA user from platform connection
        const userId = await resolveUserId(thread, message);

        // Get system prompt with memory context
        const systemPrompt = await getSystemPrompt(userId, message.text);

        // Get tools for this user
        const tools = await getAgentTools(userId);

        // Stream AI response through Chat SDK
        const model = gateway('groq', { modelId: 'llama-3.3-70b-versatile' });

        // Build conversation history from thread
        const history = await getThreadHistory(thread);

        const result = streamText({
            model,
            system: systemPrompt,
            messages: [...history, { role: 'user', content: message.text }],
            tools,
            maxSteps: 5,
            temperature: 0.7,
        });

        // Post streamed response — Chat SDK handles progressive editing per platform
        await thread.post(result.fullStream);

        // Auto-extract memory from exchange (fire-and-forget)
        if (userId) {
            const memoryRouter = await import('../services/memory-router.service');
            memoryRouter.supermemory
                .processConversation(`bot_${thread.id}_${Date.now()}`, userId, [
                    { role: 'user', content: message.text },
                    { role: 'assistant', content: (await result).text },
                ])
                .catch(() => {});
        }
    } catch (error) {
        console.error('[Bot] Message handling failed:', error);
        await thread.post('Sorry, something went wrong. Please try again.');
    }
}

// ============================================
// HELPERS
// ============================================

async function resolveUserId(thread: any, message: { user?: { id?: string } }): Promise<string> {
    if (!message.user?.id) return 'anonymous';

    try {
        const { prisma } = await import('@aspendos/db');
        const connection = await prisma.platformConnection.findFirst({
            where: {
                platformUserId: message.user.id,
                isActive: true,
            },
            select: { userId: true },
        });
        return connection?.userId || 'anonymous';
    } catch {
        return 'anonymous';
    }
}

async function getThreadHistory(
    thread: any
): Promise<Array<{ role: 'user' | 'assistant'; content: string }>> {
    try {
        const result = await thread.adapter?.fetchMessages?.(thread.id, { limit: 20 });
        if (!result?.messages) return [];

        return result.messages.map((m: any) => ({
            role: m.author?.isBot ? ('assistant' as const) : ('user' as const),
            content: m.text || '',
        }));
    } catch {
        return [];
    }
}

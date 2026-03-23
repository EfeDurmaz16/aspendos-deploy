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

import { gateway, streamText } from 'ai';
import { getSystemPrompt } from './prompt';
import { getAgentTools } from './tools';

// ============================================
// LAZY INITIALIZATION
// Chat SDK packages are optional — the API starts without them.
// ============================================

let _bot: any = null;
let _initAttempted = false;

async function initBot() {
    if (_initAttempted) return _bot;
    _initAttempted = true;

    try {
        const { Chat } = await import('chat');
        const adapters: Record<string, any> = {};

        if (process.env.SLACK_BOT_TOKEN) {
            const { SlackAdapter } = await import('@chat-adapter/slack');
            adapters.slack = new SlackAdapter();
        }
        if (process.env.TELEGRAM_BOT_TOKEN) {
            const { TelegramAdapter } = await import('@chat-adapter/telegram');
            adapters.telegram = new TelegramAdapter();
        }
        if (process.env.DISCORD_BOT_TOKEN) {
            const { DiscordAdapter } = await import('@chat-adapter/discord');
            adapters.discord = new DiscordAdapter();
        }
        if (process.env.WHATSAPP_TOKEN) {
            const { WhatsAppAdapter } = await import('@chat-adapter/whatsapp');
            adapters.whatsapp = new WhatsAppAdapter();
        }

        let state: any;
        if (process.env.DATABASE_URL) {
            try {
                const { PostgresState } = await import('@chat-adapter/state-pg');
                state = new PostgresState({ connectionString: process.env.DATABASE_URL });
            } catch {
                // State adapter not available
            }
        }

        _bot = new Chat({
            adapters,
            ...(state ? { state } : {}),
        });

        console.log(
            '[Bot] Chat SDK initialized with adapters:',
            Object.keys(adapters).join(', ') || 'none'
        );
    } catch (err) {
        console.warn(
            '[Bot] Chat SDK not available — install chat + @chat-adapter/* packages to enable messaging.'
        );
        _bot = null;
    }

    return _bot;
}

// Export a getter that lazy-initializes
export async function getBot() {
    return initBot();
}

// Proxy export for backwards compat — lazy on first access
export const bot = new Proxy({} as any, {
    get(_target, prop) {
        if (prop === 'webhooks') {
            return new Proxy(
                {},
                {
                    get(_t, platform) {
                        return async (req: Request, opts: any) => {
                            const b = await initBot();
                            return (
                                b?.webhooks?.[platform]?.(req, opts) ??
                                new Response('Bot not configured', { status: 503 })
                            );
                        };
                    },
                }
            );
        }
        return _bot?.[prop];
    },
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

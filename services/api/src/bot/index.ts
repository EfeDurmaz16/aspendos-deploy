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
// ============================================
// LAZY INITIALIZATION
// Chat SDK packages are optional — the API starts without them.
// ============================================

let _bot: any = null;
let _initAttempted = false;
let _handlersRegistered = false;

const VERIFIED_ADAPTER_ENV: Record<string, string[]> = {
    slack: ['SLACK_BOT_TOKEN', 'SLACK_SIGNING_SECRET'],
    telegram: ['TELEGRAM_BOT_TOKEN', 'TELEGRAM_WEBHOOK_SECRET_TOKEN'],
    discord: ['DISCORD_BOT_TOKEN', 'DISCORD_PUBLIC_KEY', 'DISCORD_APPLICATION_ID'],
    whatsapp: [
        'WHATSAPP_ACCESS_TOKEN',
        'WHATSAPP_APP_SECRET',
        'WHATSAPP_PHONE_NUMBER_ID',
        'WHATSAPP_VERIFY_TOKEN',
    ],
};

function hasVerifiedAdapterEnv(platform: keyof typeof VERIFIED_ADAPTER_ENV) {
    return VERIFIED_ADAPTER_ENV[platform].every((name) => process.env[name]?.trim());
}

async function initBot() {
    if (_initAttempted) return _bot;
    _initAttempted = true;

    try {
        const { Chat } = await import('chat');
        const adapters: Record<string, any> = {};

        if (hasVerifiedAdapterEnv('slack')) {
            const { SlackAdapter } = await import('@chat-adapter/slack');
            adapters.slack = new SlackAdapter();
        }
        if (hasVerifiedAdapterEnv('telegram')) {
            const { TelegramAdapter } = await import('@chat-adapter/telegram');
            adapters.telegram = new TelegramAdapter({ mode: 'webhook' });
        }
        if (hasVerifiedAdapterEnv('discord')) {
            const { DiscordAdapter } = await import('@chat-adapter/discord');
            adapters.discord = new DiscordAdapter();
        }
        if (hasVerifiedAdapterEnv('whatsapp')) {
            const { WhatsAppAdapter } = await import('@chat-adapter/whatsapp');
            adapters.whatsapp = new (WhatsAppAdapter as any)();
        }

        let state: any;
        if (process.env.DATABASE_URL) {
            try {
                const statePg = await import('@chat-adapter/state-pg');
                state = (statePg as any).createPostgresState?.();
            } catch {
                // State adapter not available
            }
        }

        _bot = new (Chat as any)({
            userName: process.env.BOT_USERNAME || 'yula',
            adapters,
            ...(state ? { state } : {}),
        });
        registerBotHandlers(_bot);

        console.log(
            '[Bot] Chat SDK initialized with adapters:',
            Object.keys(adapters).join(', ') || 'none'
        );
    } catch (_err) {
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

function registerBotHandlers(chatBot: any) {
    if (_handlersRegistered) return;
    _handlersRegistered = true;

    /**
     * Handle new mentions (first message in a thread).
     * Subscribes the thread for multi-turn conversation.
     */
    chatBot.onNewMention(async (thread: any, message: any) => {
        // Subscribe for multi-turn
        await thread.subscribe();

        await handleMessage(thread, message);
    });

    /**
     * Handle messages in subscribed threads (multi-turn).
     */
    chatBot.onSubscribedMessage(async (thread: any, message: any) => {
        await handleMessage(thread, message);
    });

    /**
     * Handle button interactions (approval flow).
     */
    chatBot.onAction(async (action: any) => {
        const { actionId, value, thread } = action;

        try {
            const actorUserId = resolveActionActorId(action);

            if (actionId?.startsWith('yula_approve')) {
                const { approveRequest } = await import('../services/approval.service');
                await approveRequest(value, actorUserId);
                await thread.post('Approved.');
            } else if (actionId?.startsWith('yula_reject')) {
                const { rejectRequest } = await import('../services/approval.service');
                await rejectRequest(value, actorUserId);
                await thread.post('Rejected.');
            } else if (actionId?.startsWith('yula_always')) {
                const { approveRequest, addToAllowlist } = await import(
                    '../services/approval.service'
                );
                const approval = (await approveRequest(value, actorUserId)) as any;
                if (approval) {
                    await addToAllowlist(actorUserId, approval.toolName ?? 'unknown', 'permanent');
                }
                await thread.post('Approved (always allowed).');
            }
        } catch (error) {
            console.error('[Bot] Approval action failed:', error);
            await thread?.post?.('Approval action failed.');
        }
    });
}

// ============================================
// CORE MESSAGE HANDLER
// ============================================

async function handleSlashCommand(thread: any, command: string, userId: string): Promise<boolean> {
    if (command === '/undo') {
        const { handleUndoCommand } = await import('../audit/undo');
        const result = await handleUndoCommand(userId);
        await thread.post(result.success ? `✅ ${result.message}` : `❌ ${result.message}`);
        return true;
    }

    if (command === '/doctor') {
        const { runDoctorChecks, formatDoctorText } = await import('../messaging/cards/doctor');
        const report = runDoctorChecks();
        await thread.post(formatDoctorText(report));
        return true;
    }

    return false;
}

async function handleMessage(
    thread: any,
    message: { text: string; user?: { id?: string; name?: string } }
) {
    try {
        // Resolve YULA user from platform connection
        const userId = await resolveUserId(thread, message);

        // Parse slash commands first
        const trimmed = message.text.trim();
        if (trimmed.startsWith('/')) {
            const handled = await handleSlashCommand(thread, trimmed.split(' ')[0], userId);
            if (handled) return;
        }

        // Route through YULA orchestrator agent (FIDES sign + AGIT commit on every tool call)
        const { createYulaAgent } = await import('../orchestrator/agent');
        const agent = createYulaAgent(userId, `bot:${thread.id}`);

        // Build conversation history from thread
        const history = await getThreadHistory(thread);

        const result = await agent.stream({
            messages: [...history, { role: 'user' as const, content: message.text }],
        });

        // Post streamed response — Chat SDK handles progressive editing per platform
        await thread.post(result.textStream);

        // Auto-extract memory from exchange (fire-and-forget)
        if (userId) {
            const memoryRouter = await import('../services/memory-router.service');
            memoryRouter.supermemory
                .processConversation(`bot_${thread.id}_${Date.now()}`, userId, [
                    { role: 'user', content: message.text },
                    { role: 'assistant', content: await result.text },
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

async function resolveUserId(
    thread: any,
    message: { platform?: string; user?: { id?: string } }
): Promise<string> {
    const platformUserId = message.user?.id;
    if (!platformUserId) {
        throw new Error('Bot message missing platform user identity');
    }

    const platform = resolvePlatformName(thread, message);
    if (!platform) {
        throw new Error('Bot message missing platform identity');
    }

    const { prisma } = await import('../lib/prisma');
    const connection = await prisma.platformConnection.findUnique({
        where: {
            platform_platformUserId: {
                platform,
                platformUserId,
            },
        },
        select: {
            isActive: true,
            userId: true,
        },
    });

    if (!connection?.isActive) {
        throw new Error('Messaging platform user is not linked to a Yula account');
    }

    return connection.userId;
}

function resolveActionActorId(action: any): string {
    const actorId =
        action?.user?.id ??
        action?.userId ??
        action?.actor?.id ??
        action?.member?.user?.id ??
        action?.from?.id;

    if (!actorId || typeof actorId !== 'string') {
        throw new Error('Approval action missing actor identity');
    }

    return actorId;
}

function resolvePlatformName(thread: any, message: { platform?: string }): string | null {
    const platform =
        message.platform ??
        thread?.platform ??
        thread?.adapter?.platform ??
        thread?.adapter?.name ??
        thread?.adapterName;

    return typeof platform === 'string' && platform.trim() ? platform.trim().toLowerCase() : null;
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

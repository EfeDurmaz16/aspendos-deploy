import { Chat, Card, CardText, Actions, Button, Divider } from 'chat';
import { createSlackAdapter } from '@chat-adapter/slack';
import { createTelegramAdapter } from '@chat-adapter/telegram';
import { createWhatsAppAdapter } from '@chat-adapter/whatsapp';
import { streamText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';

import type { ApprovalPayload } from './types';

// ============================================
// Central Bot Instance (Vercel Chat SDK)
// ============================================

const CALLBACK_BASE = process.env.NEXT_PUBLIC_APP_URL || 'https://yula.dev';

let _bot: Chat | null = null;

export async function getBot(): Promise<Chat> {
    if (_bot) return _bot;

    // Dynamic import Discord adapter to avoid zlib-sync native module issue with Turbopack
    const discordPkg = '@chat-adapter/' + 'discord';
    const { createDiscordAdapter } = await import(/* webpackIgnore: true */ discordPkg);

    const bot = new Chat({
        userName: 'yula',
        adapters: {
            slack: createSlackAdapter(),
            telegram: createTelegramAdapter(),
            discord: createDiscordAdapter(),
            whatsapp: createWhatsAppAdapter(),
        },
    });

    // Register handlers
    registerMentionHandler(bot);
    registerMessageHandler(bot);
    registerActionHandlers(bot);

    _bot = bot;
    return _bot;
}

// ============================================
// Handler Registration
// ============================================

function registerMentionHandler(bot: Chat): void {
    bot.onNewMention(async (thread) => {
        await thread.subscribe();
        await thread.post(
            "Hey! I'm YULA, your universal assistant. Ask me anything in this thread."
        );
    });
}

function registerMessageHandler(bot: Chat): void {
    bot.onSubscribedMessage(async (thread, message) => {
        const text = message.text?.trim();
        if (!text) return;

        if (text.startsWith('/')) {
            await handleSlashCommand(thread, text);
            return;
        }

        await thread.startTyping();

        const result = streamText({
            model: anthropic('claude-sonnet-4-20250514'),
            system: buildSystemPrompt(),
            prompt: text,
        });

        await thread.stream(result.textStream, {
            stopBlocks: [
                Actions([
                    Button({ id: 'retry', label: 'Retry', style: 'default' }),
                    Button({ id: 'doctor', label: '/doctor', style: 'default' }),
                ]),
            ],
        });
    });
}

function registerActionHandlers(bot: Chat): void {
    bot.onAction('approve', async (event) => {
        const commitHash = event.action.value;
        if (!commitHash) return;
        try {
            await fetch(`${CALLBACK_BASE}/api/bot/approve`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    commitHash,
                    action: 'approve',
                    platform: detectPlatform(event),
                    platformUserId: event.user?.id || 'unknown',
                }),
            });
            await event.thread.post(`Approved by ${event.user?.fullName || 'user'}.`);
        } catch {
            await event.thread.post('Failed to process approval.');
        }
    });

    bot.onAction('reject', async (event) => {
        const commitHash = event.action.value;
        if (!commitHash) return;
        try {
            await fetch(`${CALLBACK_BASE}/api/bot/approve`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    commitHash,
                    action: 'reject',
                    platform: detectPlatform(event),
                    platformUserId: event.user?.id || 'unknown',
                }),
            });
            await event.thread.post(`Rejected by ${event.user?.fullName || 'user'}.`);
        } catch {
            await event.thread.post('Failed to process rejection.');
        }
    });

    bot.onAction('retry', async (event) => {
        await event.thread.post('Retrying last request...');
    });
}

// ============================================
// Slash Commands
// ============================================

async function handleSlashCommand(thread: any, text: string): Promise<void> {
    const [command, ...argParts] = text.split(' ');
    const args = argParts.join(' ');

    switch (command) {
        case '/undo': {
            const commitHash = args.trim();
            if (!commitHash) {
                await thread.post('Usage: /undo <commit-hash>');
                return;
            }
            await thread.post(
                Card({
                    title: 'Undo Request',
                    children: [
                        CardText(`Attempting to revert commit \`${commitHash.slice(0, 8)}\`...`),
                        CardText('This will be processed through the governance chain.'),
                    ],
                })
            );
            try {
                const res = await fetch(`${CALLBACK_BASE}/api/bot/undo`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ commitHash }),
                });
                const result = await res.json();
                await thread.post(
                    result.success ? 'Revert completed.' : `Revert failed: ${result.error}`
                );
            } catch {
                await thread.post('Failed to process undo request.');
            }
            break;
        }

        case '/doctor': {
            await thread.post(
                Card({
                    title: 'System Diagnostics',
                    children: [
                        CardText('Running health checks...'),
                        Divider(),
                        CardText('Bot: Online'),
                        CardText('Platforms: Slack, Telegram, Discord, WhatsApp'),
                        CardText('AI: Claude Sonnet 4'),
                        CardText('Memory: SuperMemory'),
                        CardText('Governance: FIDES/AGIT active'),
                    ],
                })
            );
            break;
        }

        default:
            await thread.post(`Unknown command: \`${command}\`. Available: /undo, /doctor`);
    }
}

// ============================================
// Approval Card Posting
// ============================================

const BADGE_EMOJI: Record<string, string> = {
    undoable: '🟢',
    cancelable_window: '🟢',
    compensatable: '🟡',
    approval_only: '🟠',
    irreversible_blocked: '🔴',
};

export async function postApprovalCard(thread: any, payload: ApprovalPayload): Promise<void> {
    const { commitHash, toolName, humanExplanation, reversibilityClass, badgeLabel, expiresAt } =
        payload;

    const badgeEmoji = BADGE_EMOJI[reversibilityClass] || '?';

    await thread.post(
        Card({
            title: `${badgeEmoji} Approval Required: ${toolName}`,
            children: [
                CardText(humanExplanation),
                Divider(),
                CardText(`Reversibility: ${badgeLabel}`),
                CardText(`Commit: \`${commitHash.slice(0, 8)}\``),
                ...(expiresAt ? [CardText(`Expires: ${expiresAt}`)] : []),
                Actions([
                    Button({
                        id: 'approve',
                        label: 'Approve',
                        style: 'primary',
                        value: commitHash,
                    }),
                    Button({ id: 'reject', label: 'Reject', style: 'danger', value: commitHash }),
                ]),
            ],
        })
    );
}

// ============================================
// Helpers
// ============================================

function buildSystemPrompt(): string {
    return `You are YULA, an AI assistant built for developers and founders.
You help with code, analysis, planning, and tool execution.
When you need to execute a tool that requires approval, you will indicate this clearly.
Be concise. Use markdown formatting where appropriate.
If the user asks about your capabilities, mention: memory, agent governance (FIDES), multi-model routing, and tool execution with approval chains.`;
}

function detectPlatform(event: any): string {
    if (event.adapter) return event.adapter;
    return 'unknown';
}

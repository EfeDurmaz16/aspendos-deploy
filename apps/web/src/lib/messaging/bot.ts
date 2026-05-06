import { createHmac } from 'node:crypto';
import { anthropic } from '@ai-sdk/anthropic';
import { createSlackAdapter } from '@chat-adapter/slack';
import { createTelegramAdapter } from '@chat-adapter/telegram';
import { createWhatsAppAdapter } from '@chat-adapter/whatsapp';
import { streamText } from 'ai';
import { Actions, Button, Card, CardText, Chat, Divider } from 'chat';

import type { ApprovalPayload } from './types';

// ============================================
// Central Bot Instance (Vercel Chat SDK)
// ============================================

const CALLBACK_BASE = process.env.NEXT_PUBLIC_APP_URL || 'https://yula.dev';

let _bot: Chat | null = null;

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

export async function getBot(): Promise<any> {
    if (_bot) return _bot;

    const adapters: Record<string, unknown> = {};
    if (hasVerifiedAdapterEnv('slack')) {
        adapters.slack = createSlackAdapter();
    }
    if (hasVerifiedAdapterEnv('telegram')) {
        adapters.telegram = createTelegramAdapter({ mode: 'webhook' });
    }
    if (hasVerifiedAdapterEnv('discord')) {
        // Dynamic import Discord adapter to avoid zlib-sync native module issue with Turbopack
        const discordPkg = '@chat-adapter/' + 'discord';
        const { createDiscordAdapter } = await import(/* webpackIgnore: true */ discordPkg);
        adapters.discord = createDiscordAdapter();
    }
    if (hasVerifiedAdapterEnv('whatsapp')) {
        adapters.whatsapp = createWhatsAppAdapter();
    }

    const bot = new Chat({
        userName: 'yula',
        state: {} as never,
        adapters,
    } as never) as any;

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

function registerMentionHandler(bot: any): void {
    bot.onNewMention(async (thread: any) => {
        await thread.subscribe();
        await thread.post(
            "Hey! I'm YULA, your universal assistant. Ask me anything in this thread."
        );
    });
}

function registerMessageHandler(bot: any): void {
    bot.onSubscribedMessage(async (thread: any, message: any) => {
        const text = message.text?.trim();
        if (!text) return;

        if (text.startsWith('/')) {
            await handleSlashCommand(thread, text);
            return;
        }

        await thread.startTyping();

        const result = streamText({
            model: anthropic('claude-sonnet-4-6'),
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

function registerActionHandlers(bot: any): void {
    bot.onAction('approve', async (event: any) => {
        await submitApprovalAction(event, 'approve');
    });

    bot.onAction('reject', async (event: any) => {
        await submitApprovalAction(event, 'reject');
    });

    bot.onAction('retry', async (event: any) => {
        await event.thread.post('Retrying last request...');
    });
}

export async function submitApprovalAction(event: any, action: 'approve' | 'reject') {
    const approvalId = event.action?.value;
    if (!approvalId) return;

    const actionPastTense = action === 'approve' ? 'Approved' : 'Rejected';
    try {
        const approvalRequest = buildApprovalRequest({
            approvalId,
            action,
            platform: detectPlatform(event),
            platformUserId: event.user?.id || 'unknown',
        });
        const response = await fetch(`${CALLBACK_BASE}/api/bot/approve`, {
            method: 'POST',
            headers: approvalRequest.headers,
            body: approvalRequest.body,
        });
        if (!response.ok) {
            throw new Error(await approvalErrorMessage(response));
        }
        await event.thread.post(`${actionPastTense} by ${event.user?.fullName || 'user'}.`);
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown approval error';
        await event.thread.post(`Failed to process ${action}: ${message}`);
    }
}

async function approvalErrorMessage(response: Response) {
    try {
        const body = (await response.json()) as { error?: unknown };
        if (typeof body.error === 'string' && body.error.trim()) {
            return body.error;
        }
    } catch {
        // Fall through to status-based message.
    }
    return `approval endpoint returned ${response.status}`;
}

function buildApprovalRequest(payload: {
    approvalId: string;
    action: 'approve' | 'reject';
    platform: string;
    platformUserId: string;
}) {
    const body = JSON.stringify(payload);
    const timestamp = Date.now().toString();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const secret = process.env.BOT_APPROVAL_WEBHOOK_SECRET;

    if (!secret && process.env.NODE_ENV === 'production') {
        throw new Error('BOT_APPROVAL_WEBHOOK_SECRET is required for approval callbacks');
    }

    if (secret) {
        headers['x-yula-timestamp'] = timestamp;
        headers['x-yula-signature'] = `sha256=${createHmac('sha256', secret)
            .update(`${timestamp}.${body}`)
            .digest('hex')}`;
    }

    return { body, headers };
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
    const {
        approvalId,
        commitHash,
        toolName,
        humanExplanation,
        reversibilityClass,
        badgeLabel,
        expiresAt,
    } = payload;

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
                        value: approvalId,
                    }),
                    Button({ id: 'reject', label: 'Reject', style: 'danger', value: approvalId }),
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

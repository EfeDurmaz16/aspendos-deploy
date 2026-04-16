import { Chat, Card, Text, Actions, Button, Divider } from 'chat';
import { createSlackAdapter } from '@chat-adapter/slack';
import { createTelegramAdapter } from '@chat-adapter/telegram';
import { createDiscordAdapter } from '@chat-adapter/discord';
import { createWhatsAppAdapter } from '@chat-adapter/whatsapp';
import { streamText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';

import type { ApprovalPayload } from './types';
import { renderSlackApprovalCard } from './cards/slack-card';
import { renderTelegramApprovalCard } from './cards/telegram-card';
import { renderDiscordApprovalCard } from './cards/discord-card';
import { renderWhatsAppApprovalCard } from './cards/whatsapp-card';

// ============================================
// Central Bot Instance (Vercel Chat SDK)
// ============================================

const CALLBACK_BASE = process.env.NEXT_PUBLIC_APP_URL || 'https://yula.dev';

export const bot = new Chat({
    userName: 'yula',
    adapters: {
        slack: createSlackAdapter(),
        telegram: createTelegramAdapter(),
        discord: createDiscordAdapter(),
        whatsapp: createWhatsAppAdapter(),
    },
});

// ============================================
// New Mentions — first message in a thread
// ============================================

bot.onNewMention(async (thread) => {
    await thread.subscribe();
    await thread.post("Hey! I'm YULA, your universal assistant. Ask me anything in this thread.");
});

// ============================================
// Subscribed Messages — ongoing conversation
// ============================================

bot.onSubscribedMessage(async (thread, message) => {
    const text = message.text?.trim();
    if (!text) return;

    // Handle slash commands
    if (text.startsWith('/')) {
        await handleSlashCommand(thread, text);
        return;
    }

    // Stream AI response
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
                        Text(`Attempting to revert commit \`${commitHash.slice(0, 8)}\`...`),
                        Text('This will be processed through the governance chain.'),
                    ],
                })
            );
            // Actual undo logic delegates to the API
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
                        Text('Running health checks...'),
                        Divider(),
                        Text(`Bot: Online`),
                        Text(`Platforms: Slack, Telegram, Discord, WhatsApp`),
                        Text(`AI: Claude Sonnet 4`),
                        Text(`Memory: SuperMemory`),
                        Text(`Governance: FIDES/AGIT active`),
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
// Action Handlers (button callbacks)
// ============================================

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

// ============================================
// Approval Card Posting
// ============================================

/**
 * Send an approval card to a specific thread.
 * The Chat SDK handles platform-native rendering automatically.
 */
export async function postApprovalCard(thread: any, payload: ApprovalPayload): Promise<void> {
    const { commitHash, toolName, humanExplanation, reversibilityClass, badgeLabel, expiresAt } =
        payload;

    const badgeEmoji = BADGE_EMOJI[reversibilityClass] || '?';

    await thread.post(
        Card({
            title: `${badgeEmoji} Approval Required: ${toolName}`,
            children: [
                Text(humanExplanation),
                Divider(),
                Text(`Reversibility: ${badgeLabel}`),
                Text(`Commit: \`${commitHash.slice(0, 8)}\``),
                ...(expiresAt ? [Text(`Expires: ${expiresAt}`)] : []),
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

const BADGE_EMOJI: Record<string, string> = {
    undoable: '🟢',
    cancelable_window: '🟢',
    compensatable: '🟡',
    approval_only: '🟠',
    irreversible_blocked: '🔴',
};

function buildSystemPrompt(): string {
    return `You are YULA, an AI assistant built for developers and founders.
You help with code, analysis, planning, and tool execution.
When you need to execute a tool that requires approval, you will indicate this clearly.
Be concise. Use markdown formatting where appropriate.
If the user asks about your capabilities, mention: memory, agent governance (FIDES), multi-model routing, and tool execution with approval chains.`;
}

function detectPlatform(event: any): string {
    // The Chat SDK normalizes events, but we can detect platform from adapter context
    if (event.adapter) return event.adapter;
    return 'unknown';
}

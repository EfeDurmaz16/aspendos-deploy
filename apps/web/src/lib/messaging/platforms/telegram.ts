/**
 * Telegram Platform Adapter
 *
 * Handles Telegram Bot API formatting, inline keyboards for approvals,
 * and callback query parsing.
 *
 * The Vercel Chat SDK createTelegramAdapter() handles webhook setup,
 * message parsing, and basic posting. This module provides supplementary
 * utilities for Telegram-native features.
 */

import type { ApprovalPayload } from '../types';
import { BADGE_EMOJI } from '@aspendos/core/messaging/types';

const TELEGRAM_API = 'https://api.telegram.org/bot';

function getToken(): string {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) throw new Error('TELEGRAM_BOT_TOKEN not set');
    return token;
}

// ============================================
// Inline Keyboard for Approvals
// ============================================

export interface TelegramInlineKeyboard {
    inline_keyboard: Array<
        Array<{
            text: string;
            callback_data: string;
        }>
    >;
}

export function buildApprovalKeyboard(commitHash: string): TelegramInlineKeyboard {
    return {
        inline_keyboard: [
            [
                { text: '✅ Approve', callback_data: `approve:${commitHash}` },
                { text: '❌ Reject', callback_data: `reject:${commitHash}` },
            ],
        ],
    };
}

/**
 * Format an approval message for Telegram with inline keyboard.
 */
export function formatApprovalMessage(payload: ApprovalPayload): {
    text: string;
    reply_markup: TelegramInlineKeyboard;
    parse_mode: string;
} {
    const { commitHash, toolName, humanExplanation, reversibilityClass, badgeLabel, expiresAt } =
        payload;
    const emoji = BADGE_EMOJI[reversibilityClass] || '?';

    const lines = [
        `${emoji} *Approval Required: ${escapeMarkdown(toolName)}*`,
        '',
        escapeMarkdown(humanExplanation),
        '',
        `*Reversibility:* ${escapeMarkdown(badgeLabel)}`,
        `*Commit:* \`${commitHash.slice(0, 8)}\``,
    ];

    if (expiresAt) {
        lines.push(`*Expires:* ${escapeMarkdown(expiresAt)}`);
    }

    return {
        text: lines.join('\n'),
        reply_markup: buildApprovalKeyboard(commitHash),
        parse_mode: 'MarkdownV2',
    };
}

/**
 * Format a resolved approval message (removes buttons).
 */
export function formatResolvedMessage(
    payload: ApprovalPayload,
    decision: 'approved' | 'rejected',
    decidedBy: string
): { text: string; parse_mode: string } {
    const emoji = decision === 'approved' ? '✅' : '❌';
    const lines = [
        `${emoji} *${decision === 'approved' ? 'Approved' : 'Rejected'}: ${escapeMarkdown(payload.toolName)}*`,
        '',
        escapeMarkdown(payload.humanExplanation),
        '',
        `${decision === 'approved' ? 'Approved' : 'Rejected'} by ${escapeMarkdown(decidedBy)} \\| \`${payload.commitHash.slice(0, 8)}\``,
    ];

    return {
        text: lines.join('\n'),
        parse_mode: 'MarkdownV2',
    };
}

// ============================================
// Telegram Bot API Calls
// ============================================

/**
 * Send a message with inline keyboard directly via Telegram API.
 */
export async function sendTelegramMessage(
    chatId: string | number,
    text: string,
    replyMarkup?: TelegramInlineKeyboard,
    parseMode = 'MarkdownV2'
): Promise<{ message_id: number }> {
    const token = getToken();
    const res = await fetch(`${TELEGRAM_API}${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: chatId,
            text,
            parse_mode: parseMode,
            ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
        }),
    });

    const data = await res.json();
    if (!data.ok) throw new Error(`Telegram API error: ${JSON.stringify(data)}`);
    return data.result;
}

/**
 * Edit a message to remove keyboard after approval/rejection.
 */
export async function editTelegramMessage(
    chatId: string | number,
    messageId: number,
    text: string,
    parseMode = 'MarkdownV2'
): Promise<void> {
    const token = getToken();
    await fetch(`${TELEGRAM_API}${token}/editMessageText`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: chatId,
            message_id: messageId,
            text,
            parse_mode: parseMode,
        }),
    });
}

/**
 * Answer a callback query (acknowledges button press).
 */
export async function answerCallbackQuery(callbackQueryId: string, text?: string): Promise<void> {
    const token = getToken();
    await fetch(`${TELEGRAM_API}${token}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            callback_query_id: callbackQueryId,
            text: text || 'Processed',
        }),
    });
}

// ============================================
// Callback Data Parsing
// ============================================

export interface TelegramCallbackData {
    action: 'approve' | 'reject';
    commitHash: string;
}

export function parseCallbackData(data: string): TelegramCallbackData | null {
    const [action, commitHash] = data.split(':');
    if ((action === 'approve' || action === 'reject') && commitHash) {
        return { action, commitHash };
    }
    return null;
}

// ============================================
// Helpers
// ============================================

/**
 * Escape special characters for Telegram MarkdownV2.
 */
function escapeMarkdown(text: string): string {
    return text.replace(/([_*\[\]()~`>#+\-=|{}.!\\])/g, '\\$1');
}

import type { ApprovalCard } from '../types';
import { BADGE_EMOJI } from '../types';

export function renderTelegramApprovalCard(card: ApprovalCard) {
    const badge = BADGE_EMOJI[card.reversibilityClass];
    const text = [
        `${badge} *${card.toolName}*`,
        card.humanExplanation,
        `Class: ${card.badgeLabel} | Commit: \`${card.commitHash.slice(0, 8)}\``,
        card.expiresAt ? `Expires: ${card.expiresAt}` : '',
    ]
        .filter(Boolean)
        .join('\n');

    return {
        text,
        parse_mode: 'Markdown' as const,
        reply_markup: {
            inline_keyboard: [
                [
                    { text: '✅ Approve', callback_data: `approve:${card.commitHash}` },
                    { text: '❌ Reject', callback_data: `reject:${card.commitHash}` },
                ],
                [{ text: '🔓 Always Allow', callback_data: `always:${card.commitHash}` }],
            ],
        },
    };
}

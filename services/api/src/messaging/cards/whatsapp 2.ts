import type { ApprovalCard } from '../types';
import { BADGE_EMOJI } from '../types';

export function renderWhatsAppApprovalCard(card: ApprovalCard) {
    const badge = BADGE_EMOJI[card.reversibilityClass];
    const body = [
        `${badge} *${card.toolName}*`,
        card.humanExplanation,
        `Class: ${card.badgeLabel}`,
        `Commit: ${card.commitHash.slice(0, 8)}`,
        card.expiresAt ? `Expires: ${card.expiresAt}` : '',
    ]
        .filter(Boolean)
        .join('\n');

    return {
        type: 'interactive',
        interactive: {
            type: 'button',
            body: { text: body },
            action: {
                buttons: [
                    {
                        type: 'reply',
                        reply: { id: `approve:${card.commitHash}`, title: 'Approve' },
                    },
                    {
                        type: 'reply',
                        reply: { id: `reject:${card.commitHash}`, title: 'Reject' },
                    },
                    {
                        type: 'reply',
                        reply: { id: `always:${card.commitHash}`, title: 'Always Allow' },
                    },
                ],
            },
        },
    };
}

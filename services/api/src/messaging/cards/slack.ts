import type { ApprovalCard } from '../types';
import { BADGE_EMOJI } from '../types';

export function renderSlackApprovalCard(card: ApprovalCard) {
    return {
        blocks: [
            {
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: `*${card.toolName}*\n${card.humanExplanation}`,
                },
            },
            {
                type: 'context',
                elements: [
                    {
                        type: 'mrkdwn',
                        text: `${BADGE_EMOJI[card.reversibilityClass]} *${card.badgeLabel}* | Commit: \`${card.commitHash.slice(0, 8)}\`${card.expiresAt ? ` | Expires: ${card.expiresAt}` : ''}`,
                    },
                ],
            },
            {
                type: 'actions',
                elements: [
                    {
                        type: 'button',
                        text: { type: 'plain_text', text: 'Approve' },
                        style: 'primary',
                        action_id: `yula_approve_${card.commitHash}`,
                        value: card.commitHash,
                    },
                    {
                        type: 'button',
                        text: { type: 'plain_text', text: 'Reject' },
                        style: 'danger',
                        action_id: `yula_reject_${card.commitHash}`,
                        value: card.commitHash,
                    },
                    {
                        type: 'button',
                        text: { type: 'plain_text', text: 'Always Allow' },
                        action_id: `yula_always_${card.commitHash}`,
                        value: card.commitHash,
                    },
                ],
            },
        ],
    };
}

import type { ApprovalCard } from '../types';
import { BADGE_HEX } from '../types';

export function renderDiscordApprovalCard(card: ApprovalCard) {
    return {
        embeds: [
            {
                title: card.toolName,
                description: card.humanExplanation,
                color: BADGE_HEX[card.reversibilityClass],
                fields: [
                    { name: 'Class', value: card.badgeLabel, inline: true },
                    { name: 'Commit', value: `\`${card.commitHash.slice(0, 8)}\``, inline: true },
                    ...(card.expiresAt
                        ? [{ name: 'Expires', value: card.expiresAt, inline: true }]
                        : []),
                ],
                footer: { text: 'YULA Governance' },
            },
        ],
        components: [
            {
                type: 1,
                components: [
                    {
                        type: 2,
                        style: 3,
                        label: 'Approve',
                        custom_id: `approve:${card.commitHash}`,
                    },
                    {
                        type: 2,
                        style: 4,
                        label: 'Reject',
                        custom_id: `reject:${card.commitHash}`,
                    },
                    {
                        type: 2,
                        style: 2,
                        label: 'Always Allow',
                        custom_id: `always:${card.commitHash}`,
                    },
                ],
            },
        ],
    };
}

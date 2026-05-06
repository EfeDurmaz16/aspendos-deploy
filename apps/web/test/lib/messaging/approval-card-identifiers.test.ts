import { describe, expect, it } from 'vitest';
import { buildDiscordApprovalMessage, parseInteractionCustomId } from '../../../src/lib/messaging/platforms/discord';
import { buildSlackApprovalBlocks } from '../../../src/lib/messaging/platforms/slack';
import { buildTeamsApprovalCard } from '../../../src/lib/messaging/platforms/teams';
import { buildApprovalKeyboard, parseCallbackData } from '../../../src/lib/messaging/platforms/telegram';
import { buildWhatsAppApprovalMessage, parseButtonReply } from '../../../src/lib/messaging/platforms/whatsapp';
import type { ApprovalPayload } from '../../../src/lib/messaging/types';

const payload: ApprovalPayload = {
    approvalId: 'approval-123',
    commitHash: 'commit-abcdef123456',
    toolName: 'stripe.charge',
    args: { amount: 5000 },
    humanExplanation: 'Charge requires explicit approval.',
    reversibilityClass: 'approval_only',
    badgeLabel: 'Approval Required',
};

describe('messaging approval card identifiers', () => {
    it('uses approval ids for Slack action values while displaying commit hashes', () => {
        const blocks = buildSlackApprovalBlocks(payload, 'https://yula.dev/api/bot/approve');
        const actions = blocks.find((block) => block.type === 'actions') as any;

        expect(actions.block_id).toBe('approval_approval-123');
        expect(actions.elements[0].value).toBe('approval-123');
        expect(actions.elements[1].value).toBe('approval-123');
        expect(JSON.stringify(blocks)).toContain('commit-a');
    });

    it('uses approval ids for Telegram callbacks and parsers', () => {
        const keyboard = buildApprovalKeyboard(payload.approvalId);

        expect(keyboard.inline_keyboard[0][0].callback_data).toBe('approve:approval-123');
        expect(parseCallbackData('reject:approval-123')).toEqual({
            action: 'reject',
            approvalId: 'approval-123',
        });
    });

    it('uses approval ids for Discord custom ids and parsers', () => {
        const message = buildDiscordApprovalMessage(payload);

        expect(message.components[0].components[0].custom_id).toBe('approve:approval-123');
        expect(parseInteractionCustomId('reject:approval-123')).toEqual({
            action: 'reject',
            approvalId: 'approval-123',
        });
    });

    it('uses approval ids for WhatsApp replies and parsers', () => {
        const message = buildWhatsAppApprovalMessage('+15551234567', payload);

        expect(message.interactive.action.buttons[0].reply.id).toBe('approve:approval-123');
        expect(parseButtonReply('reject:approval-123')).toEqual({
            action: 'reject',
            approvalId: 'approval-123',
        });
    });

    it('uses approval ids for Teams submit actions', () => {
        const card = buildTeamsApprovalCard(payload, 'https://yula.dev/api/bot/approve');

        expect(card.actions?.[0]).toMatchObject({
            data: {
                action: 'approve',
                approvalId: 'approval-123',
                commitHash: 'commit-abcdef123456',
            },
        });
    });
});

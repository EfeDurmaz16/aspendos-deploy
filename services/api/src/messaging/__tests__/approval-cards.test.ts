import { describe, expect, it } from 'vitest';
import { renderDiscordApprovalCard } from '../cards/discord';
import { renderSlackApprovalCard } from '../cards/slack';
import { renderTelegramApprovalCard } from '../cards/telegram';
import { renderWhatsAppApprovalCard } from '../cards/whatsapp';
import { createApprovalCard } from '../types';

const card = createApprovalCard(
    'abc123def456',
    'db.migrate',
    'Database migration requires approval',
    'approval_only',
    { migration_sql: 'ALTER TABLE users ADD COLUMN avatar TEXT' },
    '2026-04-12T12:00:00Z'
);

const greenCard = createApprovalCard(
    'def789ghi012',
    'file.write',
    'File will be written with snapshot for undo',
    'undoable',
    { path: '/tmp/test.txt' }
);

describe('Slack approval card', () => {
    it('has section, context, and actions blocks', () => {
        const result = renderSlackApprovalCard(card);
        expect(result.blocks).toHaveLength(3);
        expect(result.blocks[0].type).toBe('section');
        expect(result.blocks[1].type).toBe('context');
        expect(result.blocks[2].type).toBe('actions');
    });

    it('has 3 action buttons', () => {
        const result = renderSlackApprovalCard(card);
        expect(result.blocks[2].elements).toHaveLength(3);
    });

    it('includes commit hash in context', () => {
        const result = renderSlackApprovalCard(card);
        expect(result.blocks[1].elements[0].text).toContain('abc123de');
    });

    it('shows correct emoji for approval_only', () => {
        const result = renderSlackApprovalCard(card);
        expect(result.blocks[1].elements[0].text).toContain('🟠');
    });

    it('shows correct emoji for undoable', () => {
        const result = renderSlackApprovalCard(greenCard);
        expect(result.blocks[1].elements[0].text).toContain('🟢');
    });
});

describe('Telegram approval card', () => {
    it('has inline keyboard with 2 rows', () => {
        const result = renderTelegramApprovalCard(card);
        expect(result.reply_markup.inline_keyboard).toHaveLength(2);
    });

    it('first row has approve and reject', () => {
        const result = renderTelegramApprovalCard(card);
        expect(result.reply_markup.inline_keyboard[0]).toHaveLength(2);
        expect(result.reply_markup.inline_keyboard[0][0].text).toBe('✅ Approve');
    });

    it('uses Markdown parse mode', () => {
        const result = renderTelegramApprovalCard(card);
        expect(result.parse_mode).toBe('Markdown');
    });
});

describe('Discord approval card', () => {
    it('has embed with correct color for approval_only', () => {
        const result = renderDiscordApprovalCard(card);
        expect(result.embeds[0].color).toBe(0xf59e0b);
    });

    it('has component row with 3 buttons', () => {
        const result = renderDiscordApprovalCard(card);
        expect(result.components[0].components).toHaveLength(3);
    });

    it('approve button is style 3 (green)', () => {
        const result = renderDiscordApprovalCard(card);
        expect(result.components[0].components[0].style).toBe(3);
    });

    it('has embed fields for class and commit', () => {
        const result = renderDiscordApprovalCard(card);
        expect(result.embeds[0].fields.length).toBeGreaterThanOrEqual(2);
    });
});

describe('WhatsApp approval card', () => {
    it('is interactive button type', () => {
        const result = renderWhatsAppApprovalCard(card);
        expect(result.type).toBe('interactive');
        expect(result.interactive.type).toBe('button');
    });

    it('has 3 reply buttons', () => {
        const result = renderWhatsAppApprovalCard(card);
        expect(result.interactive.action.buttons).toHaveLength(3);
    });

    it('body contains tool name and explanation', () => {
        const result = renderWhatsAppApprovalCard(card);
        expect(result.interactive.body.text).toContain('db.migrate');
        expect(result.interactive.body.text).toContain('Database migration');
    });
});

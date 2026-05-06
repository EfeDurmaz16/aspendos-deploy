import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@ai-sdk/anthropic', () => ({
    anthropic: vi.fn(),
}));

vi.mock('@chat-adapter/slack', () => ({
    createSlackAdapter: vi.fn(() => ({})),
}));

vi.mock('@chat-adapter/telegram', () => ({
    createTelegramAdapter: vi.fn(() => ({})),
}));

vi.mock('@chat-adapter/whatsapp', () => ({
    createWhatsAppAdapter: vi.fn(() => ({})),
}));

vi.mock('ai', () => ({
    streamText: vi.fn(),
}));

vi.mock('chat', () => ({
    Actions: vi.fn((children) => ({ type: 'actions', children })),
    Button: vi.fn((props) => ({ type: 'button', ...props })),
    Card: vi.fn((props) => ({ type: 'card', ...props })),
    CardText: vi.fn((text) => ({ type: 'text', text })),
    Chat: vi.fn(function Chat() {
        return {
            onAction: vi.fn(),
            onNewMention: vi.fn(),
            onSubscribedMessage: vi.fn(),
        };
    }),
    Divider: vi.fn(() => ({ type: 'divider' })),
}));

describe('messaging approval actions', () => {
    const originalEnv = { ...process.env };

    beforeEach(() => {
        vi.resetModules();
        process.env = {
            ...originalEnv,
            BOT_APPROVAL_WEBHOOK_SECRET: 'approval-secret',
            NEXT_PUBLIC_APP_URL: 'https://yula.dev',
        };
    });

    afterEach(() => {
        process.env = originalEnv;
        vi.unstubAllGlobals();
    });

    function approvalEvent() {
        return {
            action: { value: 'commit-1' },
            adapter: 'slack',
            thread: { post: vi.fn() },
            user: { fullName: 'Ada', id: 'slack-user-1' },
        };
    }

    it('posts success only after the approval endpoint accepts the decision', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 200 })));
        const { submitApprovalAction } = await import('../../../src/lib/messaging/bot');
        const event = approvalEvent();

        await submitApprovalAction(event, 'approve');

        expect(fetch).toHaveBeenCalledOnce();
        expect(event.thread.post).toHaveBeenCalledWith('Approved by Ada.');
    });

    it('does not claim approval success when the approval endpoint rejects the action', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue(
                new Response(JSON.stringify({ error: 'Approval already rejected' }), {
                    status: 409,
                })
            )
        );
        const { submitApprovalAction } = await import('../../../src/lib/messaging/bot');
        const event = approvalEvent();

        await submitApprovalAction(event, 'approve');

        expect(event.thread.post).toHaveBeenCalledWith(
            'Failed to process approve: Approval already rejected'
        );
        expect(event.thread.post).not.toHaveBeenCalledWith('Approved by Ada.');
    });

    it('does not send unsigned approval callbacks in production', async () => {
        vi.stubEnv('NODE_ENV', 'production');
        vi.stubEnv('BOT_APPROVAL_WEBHOOK_SECRET', '');
        vi.stubGlobal('fetch', vi.fn());
        const { submitApprovalAction } = await import('../../../src/lib/messaging/bot');
        const event = approvalEvent();

        await submitApprovalAction(event, 'approve');

        expect(fetch).not.toHaveBeenCalled();
        expect(event.thread.post).toHaveBeenCalledWith(
            'Failed to process approve: BOT_APPROVAL_WEBHOOK_SECRET is required for approval callbacks'
        );
    });
});

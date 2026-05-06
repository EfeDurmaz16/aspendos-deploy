import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const onAction = vi.fn();
const onNewMention = vi.fn();
const onSubscribedMessage = vi.fn();
const approveRequest = vi.fn();
const rejectRequest = vi.fn();
const addToAllowlist = vi.fn();
const platformConnectionFindUnique = vi.fn();
const runDoctorChecks = vi.fn();
const formatDoctorText = vi.fn();
const Chat = vi.fn(function Chat(config: unknown) {
    return {
        config,
        onAction,
        onNewMention,
        onSubscribedMessage,
        webhooks: {},
    };
});
const SlackAdapter = vi.fn(function SlackAdapter() {
    return { name: 'slack' };
});

vi.mock('chat', () => ({ Chat }));
vi.mock('@chat-adapter/slack', () => ({ SlackAdapter }));
vi.mock('@chat-adapter/telegram', () => ({
    TelegramAdapter: vi.fn(function TelegramAdapter() {
        return { name: 'telegram' };
    }),
}));
vi.mock('@chat-adapter/discord', () => ({
    DiscordAdapter: vi.fn(function DiscordAdapter() {
        return { name: 'discord' };
    }),
}));
vi.mock('@chat-adapter/whatsapp', () => ({
    WhatsAppAdapter: vi.fn(function WhatsAppAdapter() {
        return { name: 'whatsapp' };
    }),
}));
vi.mock('../../services/approval.service', () => ({
    addToAllowlist,
    approveRequest,
    rejectRequest,
}));
vi.mock('../../lib/prisma', () => ({
    prisma: {
        platformConnection: {
            findUnique: platformConnectionFindUnique,
        },
    },
}));
vi.mock('../../messaging/cards/doctor', () => ({
    formatDoctorText,
    runDoctorChecks,
}));

describe('api bot initialization', () => {
    const originalEnv = { ...process.env };

    beforeEach(() => {
        vi.resetModules();
        vi.clearAllMocks();
        approveRequest.mockResolvedValue({ id: 'approval-1', status: 'approved' });
        rejectRequest.mockResolvedValue({ id: 'approval-1', status: 'rejected' });
        addToAllowlist.mockResolvedValue(undefined);
        platformConnectionFindUnique.mockResolvedValue({
            isActive: true,
            userId: 'workos-user-1',
        });
        runDoctorChecks.mockReturnValue({ status: 'ok' });
        formatDoctorText.mockReturnValue('doctor ok');
        process.env = { ...originalEnv };
        delete process.env.DATABASE_URL;
        delete process.env.SLACK_BOT_TOKEN;
        delete process.env.SLACK_SIGNING_SECRET;
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    it('imports without touching a lazy bot method before initialization', async () => {
        const module = await import('../index');

        await expect(module.getBot()).resolves.toBeDefined();
        expect(Chat).toHaveBeenCalledOnce();
        expect(onNewMention).toHaveBeenCalledOnce();
        expect(onSubscribedMessage).toHaveBeenCalledOnce();
        expect(onAction).toHaveBeenCalledOnce();
    });

    it('does not enable Slack from an incomplete webhook verification config', async () => {
        process.env.SLACK_BOT_TOKEN = 'xoxb-test';

        const { getBot } = await import('../index');
        await getBot();

        expect(SlackAdapter).not.toHaveBeenCalled();
        expect(Chat).toHaveBeenCalledWith(
            expect.objectContaining({
                adapters: {},
            })
        );
    });

    it('enables Slack only when bot token and signing secret are both present', async () => {
        process.env.SLACK_BOT_TOKEN = 'xoxb-test';
        process.env.SLACK_SIGNING_SECRET = 'signing-secret';

        const { getBot } = await import('../index');
        await getBot();

        expect(SlackAdapter).toHaveBeenCalledOnce();
        expect(Chat).toHaveBeenCalledWith(
            expect.objectContaining({
                adapters: { slack: { name: 'slack' } },
            })
        );
    });

    it('uses the button actor identity for approval decisions', async () => {
        const { getBot } = await import('../index');
        await getBot();
        const actionHandler = onAction.mock.calls[0]?.[0];
        const thread = { post: vi.fn() };

        await actionHandler({
            actionId: 'yula_approve',
            value: 'approval-1',
            user: { id: 'workos-user-1' },
            thread,
        });

        expect(approveRequest).toHaveBeenCalledWith('approval-1', 'workos-user-1');
        expect(approveRequest).not.toHaveBeenCalledWith('approval-1', 'system');
        expect(thread.post).toHaveBeenCalledWith('Approved.');
    });

    it('does not approve button actions without actor identity', async () => {
        const { getBot } = await import('../index');
        await getBot();
        const actionHandler = onAction.mock.calls[0]?.[0];
        const thread = { post: vi.fn() };

        await actionHandler({
            actionId: 'yula_approve',
            value: 'approval-1',
            thread,
        });

        expect(approveRequest).not.toHaveBeenCalled();
        expect(thread.post).toHaveBeenCalledWith('Approval action failed.');
    });

    it('resolves bot messages through an active platform connection', async () => {
        const { getBot } = await import('../index');
        await getBot();
        const mentionHandler = onNewMention.mock.calls[0]?.[0];
        const thread = {
            adapter: { name: 'slack' },
            post: vi.fn(),
            subscribe: vi.fn(),
        };

        await mentionHandler(thread, {
            text: '/doctor',
            user: { id: 'U123' },
        });

        expect(platformConnectionFindUnique).toHaveBeenCalledWith({
            where: {
                platform_platformUserId: {
                    platform: 'slack',
                    platformUserId: 'U123',
                },
            },
            select: {
                isActive: true,
                userId: true,
            },
        });
        expect(thread.post).toHaveBeenCalledWith('doctor ok');
    });

    it('does not run bot commands for unlinked platform users', async () => {
        platformConnectionFindUnique.mockResolvedValueOnce(null);
        const { getBot } = await import('../index');
        await getBot();
        const mentionHandler = onNewMention.mock.calls[0]?.[0];
        const thread = {
            adapter: { name: 'slack' },
            post: vi.fn(),
            subscribe: vi.fn(),
        };

        await mentionHandler(thread, {
            text: '/doctor',
            user: { id: 'U123' },
        });

        expect(runDoctorChecks).not.toHaveBeenCalled();
        expect(thread.post).toHaveBeenCalledWith('Sorry, something went wrong. Please try again.');
    });
});

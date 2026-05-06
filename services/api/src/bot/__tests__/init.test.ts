import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const onAction = vi.fn();
const onNewMention = vi.fn();
const onSubscribedMessage = vi.fn();
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

describe('api bot initialization', () => {
    const originalEnv = { ...process.env };

    beforeEach(() => {
        vi.resetModules();
        vi.clearAllMocks();
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
});

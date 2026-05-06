import { beforeEach, describe, expect, it, vi } from 'vitest';

const convexQuery = vi.fn();
const convexMutation = vi.fn();

vi.mock('@aspendos/db', () => ({
    prisma: {
        chat: {
            findFirst: vi.fn(),
        },
    },
}));

vi.mock('../../lib/convex', () => ({
    api: {
        actionLog: {
            log: 'actionLog.log',
        },
        conversations: {
            create: 'conversations.create',
            get: 'conversations.get',
            listByUser: 'conversations.listByUser',
            remove: 'conversations.remove',
            updateTitle: 'conversations.updateTitle',
        },
        messages: {
            create: 'messages.create',
            get: 'messages.get',
            listByConversation: 'messages.listByConversation',
        },
        users: {
            getByWorkOSId: 'users.getByWorkOSId',
        },
    },
    getConvexClient: vi.fn(() => ({
        mutation: convexMutation,
        query: convexQuery,
    })),
    getConvexServiceSecret: vi.fn(() => 'convex-service-secret'),
    isConvexConfigured: vi.fn(() => true),
}));

import { createMessage, getChatWithMessages } from '../chat.service';

describe('chat service Convex ownership checks', () => {
    beforeEach(() => {
        convexQuery.mockReset();
        convexMutation.mockReset();
    });

    it('compares conversation ownership against resolved Convex user ids', async () => {
        convexQuery
            .mockResolvedValueOnce({ _id: 'convex-user-1' })
            .mockResolvedValueOnce({ _id: 'chat-1', user_id: 'convex-user-1' })
            .mockResolvedValueOnce([{ _id: 'message-1', content: 'hello' }]);

        const result = await getChatWithMessages('chat-1', 'workos-user-1');

        expect(result).toMatchObject({
            _id: 'chat-1',
            user_id: 'convex-user-1',
            messages: [{ _id: 'message-1', content: 'hello' }],
        });
        expect(convexQuery).toHaveBeenNthCalledWith(1, 'users.getByWorkOSId', {
            workos_id: 'workos-user-1',
        });
        expect(convexQuery).toHaveBeenNthCalledWith(2, 'conversations.get', {
            service_secret: 'convex-service-secret',
            id: 'chat-1',
        });
    });

    it('does not read messages from another Convex user conversation', async () => {
        convexQuery
            .mockResolvedValueOnce({ _id: 'convex-user-1' })
            .mockResolvedValueOnce({ _id: 'chat-1', user_id: 'convex-user-2' });

        const result = await getChatWithMessages('chat-1', 'workos-user-1');

        expect(result).toBeNull();
        expect(convexQuery).toHaveBeenCalledTimes(2);
        expect(convexQuery).not.toHaveBeenCalledWith(
            'messages.listByConversation',
            expect.anything()
        );
    });

    it('refuses to create messages in another user conversation', async () => {
        convexQuery
            .mockResolvedValueOnce({ _id: 'convex-user-1' })
            .mockResolvedValueOnce({ _id: 'chat-1', user_id: 'convex-user-2' });

        const result = await createMessage({
            chatId: 'chat-1',
            userId: 'workos-user-1',
            role: 'user',
            content: 'hello',
        });

        expect(result).toBeNull();
        expect(convexMutation).not.toHaveBeenCalled();
    });

    it('writes messages with the resolved Convex user id', async () => {
        convexQuery
            .mockResolvedValueOnce({ _id: 'convex-user-1' })
            .mockResolvedValueOnce({ _id: 'chat-1', user_id: 'convex-user-1' });
        convexMutation.mockResolvedValueOnce('message-1');

        const result = await createMessage({
            chatId: 'chat-1',
            userId: 'workos-user-1',
            role: 'user',
            content: 'hello',
        });

        expect(result).toMatchObject({
            id: 'message-1',
            userId: 'workos-user-1',
        });
        expect(convexMutation).toHaveBeenCalledWith('messages.create', {
            service_secret: 'convex-service-secret',
            conversation_id: 'chat-1',
            user_id: 'convex-user-1',
            role: 'user',
            content: 'hello',
        });
    });
});

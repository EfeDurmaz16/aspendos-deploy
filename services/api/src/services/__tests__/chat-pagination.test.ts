/**
 * Tests for cursor-based chat message pagination (Commit 4.1)
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';

// Mock Prisma
const mockFindFirst = vi.fn();
vi.mock('@aspendos/db', () => ({
    prisma: {
        chat: {
            findFirst: (...args: unknown[]) => mockFindFirst(...args),
        },
    },
}));

import { getChatWithMessages } from '../chat.service';

describe('Chat Pagination: getChatWithMessages', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should default to 50 messages without cursor', async () => {
        mockFindFirst.mockResolvedValue({ id: 'chat-1', messages: [] });

        await getChatWithMessages('chat-1', 'user-1');

        expect(mockFindFirst).toHaveBeenCalledWith({
            where: { id: 'chat-1', userId: 'user-1' },
            include: {
                messages: {
                    orderBy: { createdAt: 'asc' },
                    take: 50,
                },
            },
        });
    });

    it('should respect custom limit', async () => {
        mockFindFirst.mockResolvedValue({ id: 'chat-1', messages: [] });

        await getChatWithMessages('chat-1', 'user-1', { limit: 25 });

        expect(mockFindFirst).toHaveBeenCalledWith(
            expect.objectContaining({
                include: {
                    messages: expect.objectContaining({ take: 25 }),
                },
            })
        );
    });

    it('should cap limit at 200', async () => {
        mockFindFirst.mockResolvedValue({ id: 'chat-1', messages: [] });

        await getChatWithMessages('chat-1', 'user-1', { limit: 500 });

        expect(mockFindFirst).toHaveBeenCalledWith(
            expect.objectContaining({
                include: {
                    messages: expect.objectContaining({ take: 200 }),
                },
            })
        );
    });

    it('should use cursor with skip:1 when cursor is provided', async () => {
        mockFindFirst.mockResolvedValue({ id: 'chat-1', messages: [] });

        await getChatWithMessages('chat-1', 'user-1', {
            cursor: 'msg-50',
            limit: 50,
        });

        expect(mockFindFirst).toHaveBeenCalledWith({
            where: { id: 'chat-1', userId: 'user-1' },
            include: {
                messages: {
                    orderBy: { createdAt: 'asc' },
                    take: 50,
                    cursor: { id: 'msg-50' },
                    skip: 1,
                },
            },
        });
    });

    it('should not include cursor/skip when cursor is undefined', async () => {
        mockFindFirst.mockResolvedValue({ id: 'chat-1', messages: [] });

        await getChatWithMessages('chat-1', 'user-1', { limit: 30 });

        const call = mockFindFirst.mock.calls[0][0];
        expect(call.include.messages).not.toHaveProperty('cursor');
        expect(call.include.messages).not.toHaveProperty('skip');
    });

    it('should scope query to userId for authorization', async () => {
        mockFindFirst.mockResolvedValue(null);

        const result = await getChatWithMessages('chat-1', 'other-user');

        expect(mockFindFirst).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: 'chat-1', userId: 'other-user' },
            })
        );
        expect(result).toBeNull();
    });
});

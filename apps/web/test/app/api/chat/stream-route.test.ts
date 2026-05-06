import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    getMemoryContainerTags,
    getMessagesFromBody,
    POST,
} from '../../../../src/app/api/chat/stream/route';

vi.mock('../../../../src/lib/auth', () => ({
    auth: vi.fn(),
}));

const { auth } = await import('../../../../src/lib/auth');
const mockAuth = vi.mocked(auth);

describe('chat stream route helpers', () => {
    beforeEach(() => {
        mockAuth.mockReset();
    });

    it('scopes memory containers to the authenticated user', () => {
        expect(getMemoryContainerTags('user-123')).toEqual(['user_user-123']);
    });

    it('accepts either model messages or a single chat message body', () => {
        const messages = [{ role: 'user', content: 'hello' }];

        expect(getMessagesFromBody({ messages })).toBe(messages);
        expect(getMessagesFromBody({ message: 'hello' })).toEqual([
            { role: 'user', content: 'hello' },
        ]);
        expect(getMessagesFromBody({ message: '   ' })).toBeNull();
        expect(getMessagesFromBody({})).toBeNull();
    });

    it('rejects unauthenticated stream requests before tool execution', async () => {
        mockAuth.mockResolvedValueOnce(null);

        const response = await POST(
            new Request('https://yula.dev/api/chat/stream', {
                method: 'POST',
                body: JSON.stringify({ message: 'hello' }),
            }) as any
        );

        expect(response.status).toBe(401);
        await expect(response.json()).resolves.toEqual({ error: 'Unauthorized' });
    });
});

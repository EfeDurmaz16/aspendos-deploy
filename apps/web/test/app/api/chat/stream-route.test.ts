import { describe, expect, it } from 'vitest';
import {
    getMemoryContainerTags,
    getMessagesFromBody,
} from '../../../../src/app/api/chat/stream/route';

describe('chat stream route helpers', () => {
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
});

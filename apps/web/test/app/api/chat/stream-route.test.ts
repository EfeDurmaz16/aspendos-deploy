import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    convexMutation: vi.fn(),
    convexQuery: vi.fn(),
    streamText: vi.fn(),
}));

vi.mock('ai', () => ({
    gateway: vi.fn((modelId: string) => ({ modelId })),
    stepCountIs: vi.fn((count: number) => ({ count })),
    streamText: mocks.streamText,
    tool: vi.fn((definition: unknown) => definition),
}));

vi.mock('../../../../src/lib/convex-server', () => ({
    getConvexServer: vi.fn(() => ({
        mutation: mocks.convexMutation,
        query: mocks.convexQuery,
    })),
}));

vi.mock('../../../../src/lib/governance/fides', () => ({
    signGovernanceCommit: vi.fn(async () => ({
        fides_signature: 'fides-sig-chat',
        fides_signer_did: 'did:fides:web-chat',
    })),
}));

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
        mocks.convexMutation.mockReset();
        mocks.convexQuery.mockReset();
        mocks.streamText.mockReset();
        process.env.CONVEX_SERVICE_SECRET = 'convex-service-secret';
        process.env.NEXT_PUBLIC_CONVEX_URL = 'https://example.convex.cloud';
        mocks.convexQuery.mockResolvedValue({ _id: 'convex-user-1' });
        mocks.convexMutation.mockResolvedValue({ commitHash: 'commit-1' });
        mocks.streamText.mockReturnValue({
            toUIMessageStreamResponse: () => new Response('ok', { status: 200 }),
        });
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

    it('wraps chat stream tools with pre-execution governance', async () => {
        mockAuth.mockResolvedValueOnce({
            userId: 'workos-user-1',
            user: {
                email: 'efe@example.com',
                id: 'workos-user-1',
                image: null,
                name: 'Efe',
            },
            session: { id: 'session-1' },
        } as any);

        const response = await POST(
            new Request('https://yula.dev/api/chat/stream', {
                method: 'POST',
                body: JSON.stringify({ chatId: 'chat-1', message: '2+2' }),
            }) as any
        );

        expect(response.status).toBe(200);
        expect(mocks.streamText).toHaveBeenCalledTimes(1);

        const options = mocks.streamText.mock.calls[0]?.[0] as any;
        expect(options.experimental_context).toEqual({
            sessionId: 'chat-1',
            userId: 'workos-user-1',
        });

        const result = await options.tools.calculator.execute(
            { expression: '2+2' },
            { toolCallId: 'tool-call-1' }
        );

        expect(result).toEqual({ result: 4 });
        expect(mocks.convexQuery).toHaveBeenCalledWith(expect.anything(), {
            service_secret: 'convex-service-secret',
            workos_id: 'workos-user-1',
        });
        expect(mocks.convexMutation).toHaveBeenCalledTimes(2);
        expect(mocks.convexMutation.mock.calls[0]?.[1]).toMatchObject({
            service_secret: 'convex-service-secret',
            tool_name: 'calculator',
            user_id: 'convex-user-1',
            status: 'pending',
        });
        expect(mocks.convexMutation.mock.calls[1]?.[1]).toMatchObject({
            service_secret: 'convex-service-secret',
            tool_name: 'calculator',
            user_id: 'convex-user-1',
            status: 'executed',
            result: { result: 4 },
        });
    });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    convexMutation: vi.fn(),
    convexQuery: vi.fn(),
    streamText: vi.fn(),
    supermemoryConstructor: vi.fn(),
}));

vi.mock('ai', () => ({
    gateway: vi.fn((modelId: string) => ({ modelId })),
    stepCountIs: vi.fn((count: number) => ({ count })),
    streamText: mocks.streamText,
    tool: vi.fn((definition: unknown) => definition),
}));

vi.mock('supermemory', () => ({
    default: mocks.supermemoryConstructor,
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
        mocks.supermemoryConstructor.mockReset();
        process.env.CONVEX_SERVICE_SECRET = 'convex-service-secret';
        process.env.NEXT_PUBLIC_CONVEX_URL = 'https://example.convex.cloud';
        delete process.env.SUPERMEMORY_API_KEY;
        mocks.convexQuery.mockImplementation(async (_ref: unknown, args: Record<string, unknown>) => {
            if (args?.workos_id) {
                return { _id: 'convex-user-1' };
            }
            return [];
        });
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
            expected_parent_hash: null,
            tool_name: 'calculator',
            user_id: 'convex-user-1',
            status: 'pending',
        });
        expect(mocks.convexMutation.mock.calls[1]?.[1]).toMatchObject({
            service_secret: 'convex-service-secret',
            expected_parent_hash: 'commit-1',
            tool_name: 'calculator',
            user_id: 'convex-user-1',
            status: 'executed',
            result: { result: 4 },
        });
    });

    it('fails loud when memory search is requested without SuperMemory credentials', async () => {
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

        await POST(
            new Request('https://yula.dev/api/chat/stream', {
                method: 'POST',
                body: JSON.stringify({ chatId: 'chat-1', message: 'what do you remember?' }),
            }) as any
        );

        const options = mocks.streamText.mock.calls[0]?.[0] as any;
        await expect(
            options.tools.memory_search.execute(
                { query: 'travel plans' },
                { toolCallId: 'tool-call-memory' }
            )
        ).rejects.toThrow(/SuperMemory is not configured/);

        expect(mocks.convexMutation.mock.calls[1]?.[1]).toMatchObject({
            status: 'failed',
            result: { error: 'SuperMemory is not configured' },
            tool_name: 'memory_search',
        });
    });

    it('fails loud when configured SuperMemory search throws', async () => {
        process.env.SUPERMEMORY_API_KEY = 'sm-test-key';
        mocks.supermemoryConstructor.mockImplementationOnce(function MockSupermemory() {
            return {
                search: {
                    execute: vi.fn(async () => {
                        throw new Error('upstream unavailable');
                    }),
                },
            };
        });
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

        await POST(
            new Request('https://yula.dev/api/chat/stream', {
                method: 'POST',
                body: JSON.stringify({ chatId: 'chat-1', message: 'what do you remember?' }),
            }) as any
        );

        const options = mocks.streamText.mock.calls[0]?.[0] as any;
        await expect(
            options.tools.memory_search.execute(
                { query: 'travel plans' },
                { toolCallId: 'tool-call-memory' }
            )
        ).rejects.toThrow(/SuperMemory query failed: upstream unavailable/);

        expect(mocks.convexMutation.mock.calls[1]?.[1]).toMatchObject({
            status: 'failed',
            result: { error: 'SuperMemory query failed: upstream unavailable' },
            tool_name: 'memory_search',
        });
    });
});

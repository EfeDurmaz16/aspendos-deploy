/**
 * Tests for Qdrant Vector Store Service
 *
 * This tests the memory storage and retrieval functionality.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Create mocks at module scope but define them inside the factory
vi.mock('@qdrant/js-client-rest', () => {
    const mockFns = {
        collectionExists: vi.fn(),
        createCollection: vi.fn(),
        upsert: vi.fn(),
        search: vi.fn(),
        delete: vi.fn(),
        scroll: vi.fn(),
    };
    return {
        QdrantClient: class MockQdrantClient {
            collectionExists = mockFns.collectionExists;
            createCollection = mockFns.createCollection;
            upsert = mockFns.upsert;
            search = mockFns.search;
            delete = mockFns.delete;
            scroll = mockFns.scroll;
        },
        __mocks: mockFns, // Export mocks for access in tests
    };
});

// Import after mocking
import {
    storeMemory,
    searchMemories,
    deleteUserMemories,
    storeConversationEmbedding,
    searchConversations,
    COLLECTIONS,
    VECTOR_SIZE,
    qdrant,
} from '@/lib/services/qdrant';

describe('Qdrant Vector Store Service', () => {
    // Access the mock functions via the imported qdrant instance
    const mockQdrant = qdrant as unknown as {
        collectionExists: ReturnType<typeof vi.fn>;
        createCollection: ReturnType<typeof vi.fn>;
        upsert: ReturnType<typeof vi.fn>;
        search: ReturnType<typeof vi.fn>;
        delete: ReturnType<typeof vi.fn>;
        scroll: ReturnType<typeof vi.fn>;
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Constants', () => {
        it('should have correct collection names', () => {
            expect(COLLECTIONS.USER_MEMORIES).toBe('user_memories');
            expect(COLLECTIONS.CONVERSATION_EMBEDDINGS).toBe('conversation_embeddings');
        });

        it('should have correct vector size for OpenAI embeddings', () => {
            expect(VECTOR_SIZE).toBe(1536);
        });
    });

    describe('storeMemory', () => {
        it('should upsert memory with correct payload structure', async () => {
            mockQdrant.upsert.mockResolvedValueOnce({ status: 'completed' });

            const testVector = new Array(1536).fill(0.1);
            const memory = {
                id: 'memory-123',
                vector: testVector,
                userId: 'user-abc',
                content: 'User prefers dark mode',
                type: 'preference' as const,
                conversationId: 'conv-456',
                metadata: { source: 'settings' },
            };

            await storeMemory(memory);

            expect(mockQdrant.upsert).toHaveBeenCalledWith(COLLECTIONS.USER_MEMORIES, {
                points: [
                    expect.objectContaining({
                        id: 'memory-123',
                        vector: testVector,
                        payload: expect.objectContaining({
                            user_id: 'user-abc',
                            content: 'User prefers dark mode',
                            type: 'preference',
                            conversation_id: 'conv-456',
                            source: 'settings',
                        }),
                    }),
                ],
            });
        });

        it('should include timestamp in payload', async () => {
            mockQdrant.upsert.mockResolvedValueOnce({ status: 'completed' });

            const memory = {
                id: 'memory-123',
                vector: new Array(1536).fill(0.1),
                userId: 'user-abc',
                content: 'Test content',
                type: 'context' as const,
            };

            await storeMemory(memory);

            const upsertCall = mockQdrant.upsert.mock.calls[0];
            const payload = upsertCall[1].points[0].payload;
            expect(payload.created_at).toBeDefined();
            expect(new Date(payload.created_at).getTime()).toBeGreaterThan(0);
        });
    });

    describe('searchMemories', () => {
        it('should search with user filter', async () => {
            mockQdrant.search.mockResolvedValueOnce([
                {
                    id: 'mem-1',
                    score: 0.95,
                    payload: {
                        content: 'Found memory',
                        type: 'context',
                        conversation_id: 'conv-1',
                        created_at: '2024-01-01T00:00:00Z',
                    },
                },
            ]);

            const queryVector = new Array(1536).fill(0.2);
            const results = await searchMemories('user-123', queryVector, 5);

            expect(mockQdrant.search).toHaveBeenCalledWith(COLLECTIONS.USER_MEMORIES, {
                vector: queryVector,
                limit: 5,
                filter: {
                    must: [{ key: 'user_id', match: { value: 'user-123' } }],
                },
                with_payload: true,
            });

            expect(results).toHaveLength(1);
            expect(results[0]).toEqual({
                id: 'mem-1',
                score: 0.95,
                content: 'Found memory',
                type: 'context',
                conversationId: 'conv-1',
                createdAt: '2024-01-01T00:00:00Z',
            });
        });

        it('should filter by memory type when provided', async () => {
            mockQdrant.search.mockResolvedValueOnce([]);

            await searchMemories('user-123', new Array(1536).fill(0.1), 10, 'preference');

            expect(mockQdrant.search).toHaveBeenCalledWith(
                COLLECTIONS.USER_MEMORIES,
                expect.objectContaining({
                    filter: {
                        must: [
                            { key: 'user_id', match: { value: 'user-123' } },
                            { key: 'type', match: { value: 'preference' } },
                        ],
                    },
                })
            );
        });

        it('should return empty array when no results', async () => {
            mockQdrant.search.mockResolvedValueOnce([]);

            const results = await searchMemories('user-123', new Array(1536).fill(0.1));

            expect(results).toEqual([]);
        });
    });

    describe('deleteUserMemories', () => {
        it('should delete all memories for a user', async () => {
            mockQdrant.delete.mockResolvedValueOnce({ status: 'completed' });

            await deleteUserMemories('user-123');

            expect(mockQdrant.delete).toHaveBeenCalledWith(COLLECTIONS.USER_MEMORIES, {
                filter: {
                    must: [{ key: 'user_id', match: { value: 'user-123' } }],
                },
            });
        });
    });

    describe('storeConversationEmbedding', () => {
        it('should store conversation embedding correctly', async () => {
            mockQdrant.upsert.mockResolvedValueOnce({ status: 'completed' });

            const embedding = {
                id: 'emb-123',
                vector: new Array(1536).fill(0.3),
                userId: 'user-abc',
                conversationId: 'conv-789',
                messageId: 'msg-456',
                content: 'User asked about weather',
                role: 'user' as const,
            };

            await storeConversationEmbedding(embedding);

            expect(mockQdrant.upsert).toHaveBeenCalledWith(COLLECTIONS.CONVERSATION_EMBEDDINGS, {
                points: [
                    expect.objectContaining({
                        id: 'emb-123',
                        payload: expect.objectContaining({
                            user_id: 'user-abc',
                            conversation_id: 'conv-789',
                            message_id: 'msg-456',
                            content: 'User asked about weather',
                            role: 'user',
                        }),
                    }),
                ],
            });
        });
    });

    describe('searchConversations', () => {
        it('should search conversation embeddings', async () => {
            mockQdrant.search.mockResolvedValueOnce([
                {
                    id: 'emb-1',
                    score: 0.88,
                    payload: {
                        conversation_id: 'conv-1',
                        message_id: 'msg-1',
                        content: 'Weather conversation',
                        role: 'exchange',
                    },
                },
                {
                    id: 'emb-2',
                    score: 0.75,
                    payload: {
                        conversation_id: 'conv-2',
                        message_id: 'msg-2',
                        content: 'Another conversation',
                        role: 'user',
                    },
                },
            ]);

            const results = await searchConversations('user-123', new Array(1536).fill(0.2), 10);

            expect(mockQdrant.search).toHaveBeenCalledWith(COLLECTIONS.CONVERSATION_EMBEDDINGS, {
                vector: expect.any(Array),
                limit: 10,
                filter: {
                    must: [{ key: 'user_id', match: { value: 'user-123' } }],
                },
                with_payload: true,
            });

            expect(results).toHaveLength(2);
            expect(results[0].conversationId).toBe('conv-1');
            expect(results[1].role).toBe('user');
        });
    });
});

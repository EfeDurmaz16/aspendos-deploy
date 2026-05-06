import { QdrantClient } from '@qdrant/js-client-rest';

// ============================================
// QDRANT CLIENT
// ============================================

const qdrantUrl = process.env.QDRANT_URL || 'http://localhost:6333';
const qdrantApiKey = process.env.QDRANT_API_KEY;

export const qdrant = new QdrantClient({
    url: qdrantUrl,
    apiKey: qdrantApiKey,
});

// ============================================
// COLLECTION NAMES
// ============================================

export const COLLECTIONS = {
    USER_MEMORIES: 'user_memories',
    CONVERSATION_EMBEDDINGS: 'conversation_embeddings',
} as const;

// ============================================
// VECTOR DIMENSIONS (OpenAI text-embedding-3-small)
// ============================================

export const VECTOR_SIZE = 1536;

// ============================================
// SETUP FUNCTIONS
// ============================================

/**
 * Initialize Qdrant collections (run once on startup)
 */
export async function setupQdrantCollections() {
    try {
        // User memories collection
        const memoriesExists = await qdrant.collectionExists(COLLECTIONS.USER_MEMORIES);
        if (!memoriesExists.exists) {
            await qdrant.createCollection(COLLECTIONS.USER_MEMORIES, {
                vectors: { size: VECTOR_SIZE, distance: 'Cosine' },
            });
        }

        // Conversation embeddings collection
        const conversationsExists = await qdrant.collectionExists(
            COLLECTIONS.CONVERSATION_EMBEDDINGS
        );
        if (!conversationsExists.exists) {
            await qdrant.createCollection(COLLECTIONS.CONVERSATION_EMBEDDINGS, {
                vectors: { size: VECTOR_SIZE, distance: 'Cosine' },
            });
        }
    } catch (error) {
        console.error('[Qdrant] Failed to setup collections:', error);
        throw error;
    }
}

// ============================================
// MEMORY OPERATIONS
// ============================================

interface MemoryPoint {
    id: string;
    vector: number[];
    userId: string;
    content: string;
    type: 'context' | 'preference' | 'insight';
    conversationId?: string;
    metadata?: Record<string, unknown>;
}

/**
 * Store a memory vector in Qdrant
 */
export async function storeMemory(memory: MemoryPoint) {
    await qdrant.upsert(COLLECTIONS.USER_MEMORIES, {
        points: [
            {
                id: memory.id,
                vector: memory.vector,
                payload: {
                    user_id: memory.userId,
                    content: memory.content,
                    type: memory.type,
                    conversation_id: memory.conversationId,
                    created_at: new Date().toISOString(),
                    ...memory.metadata,
                },
            },
        ],
    });
}

/**
 * Search user memories semantically
 */
export async function searchMemories(
    userId: string,
    queryVector: number[],
    limit: number = 5,
    type?: 'context' | 'preference' | 'insight'
) {
    const mustFilters = [
        {
            key: 'user_id',
            match: { value: userId },
        },
    ];

    if (type) {
        mustFilters.push({
            key: 'type',
            match: { value: type },
        });
    }

    const results = await qdrant.search(COLLECTIONS.USER_MEMORIES, {
        vector: queryVector,
        limit,
        filter: { must: mustFilters },
        with_payload: true,
    });

    return results.map((result) => ({
        id: result.id,
        score: result.score,
        content: (result.payload as Record<string, unknown>)?.content as string,
        type: (result.payload as Record<string, unknown>)?.type as string,
        conversationId: (result.payload as Record<string, unknown>)?.conversation_id as
            | string
            | undefined,
        createdAt: (result.payload as Record<string, unknown>)?.created_at as string,
    }));
}

/**
 * Delete all memories for a user
 */
export async function deleteUserMemories(userId: string) {
    await qdrant.delete(COLLECTIONS.USER_MEMORIES, {
        filter: {
            must: [{ key: 'user_id', match: { value: userId } }],
        },
    });
}

// ============================================
// CONVERSATION EMBEDDING OPERATIONS
// ============================================

interface ConversationEmbedding {
    id: string;
    vector: number[];
    userId: string;
    conversationId: string;
    messageId: string;
    content: string;
    role: 'user' | 'assistant' | 'exchange';
}

/**
 * Store a conversation embedding
 */
export async function storeConversationEmbedding(embedding: ConversationEmbedding) {
    await qdrant.upsert(COLLECTIONS.CONVERSATION_EMBEDDINGS, {
        points: [
            {
                id: embedding.id,
                vector: embedding.vector,
                payload: {
                    user_id: embedding.userId,
                    conversation_id: embedding.conversationId,
                    message_id: embedding.messageId,
                    content: embedding.content,
                    role: embedding.role,
                    created_at: new Date().toISOString(),
                },
            },
        ],
    });
}

/**
 * Search conversation history semantically
 */
export async function searchConversations(
    userId: string,
    queryVector: number[],
    limit: number = 10
) {
    const results = await qdrant.search(COLLECTIONS.CONVERSATION_EMBEDDINGS, {
        vector: queryVector,
        limit,
        filter: {
            must: [{ key: 'user_id', match: { value: userId } }],
        },
        with_payload: true,
    });

    return results.map((result) => ({
        id: result.id,
        score: result.score,
        conversationId: (result.payload as Record<string, unknown>)?.conversation_id as string,
        messageId: (result.payload as Record<string, unknown>)?.message_id as string,
        content: (result.payload as Record<string, unknown>)?.content as string,
        role: (result.payload as Record<string, unknown>)?.role as string,
    }));
}

export default qdrant;

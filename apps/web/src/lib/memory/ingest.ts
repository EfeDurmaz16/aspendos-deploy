import { v4 as uuidv4 } from 'uuid';
import { createEmbeddings } from '@/lib/ai';
import { COLLECTIONS, qdrant, storeMemory } from '@/lib/services/qdrant';

// ============================================
// CHATGPT EXPORT FORMAT
// ============================================

interface ChatGPTMessage {
    id: string;
    author: { role: 'user' | 'assistant' | 'system' };
    content: { content_type: string; parts: string[] };
    create_time: number;
}

interface ChatGPTConversation {
    title: string;
    create_time: number;
    update_time: number;
    mapping: Record<string, { message: ChatGPTMessage | null }>;
}

// ============================================
// CLAUDE EXPORT FORMAT
// ============================================

interface ClaudeMessage {
    uuid: string;
    sender: 'human' | 'assistant';
    text: string;
    created_at: string;
}

interface ClaudeConversation {
    uuid: string;
    name: string;
    created_at: string;
    updated_at: string;
    chat_messages: ClaudeMessage[];
}

// ============================================
// ASPENDOS EXPORT FORMAT
// ============================================

export interface AspendosMemory {
    id: string;
    content: string;
    type: 'context' | 'preference' | 'insight';
    source: 'chatgpt' | 'claude' | 'aspendos' | 'manual';
    conversationId?: string;
    createdAt: string;
    metadata?: Record<string, unknown>;
}

export interface AspendosExport {
    version: '1.0';
    exportedAt: string;
    userId: string;
    memories: AspendosMemory[];
    stats: {
        totalMemories: number;
        byType: Record<string, number>;
        bySource: Record<string, number>;
    };
}

// ============================================
// PARSE CHATGPT EXPORT
// ============================================

export function parseChatGPTExport(jsonData: unknown): {
    conversations: string[];
    messageCount: number;
} {
    const data = jsonData as ChatGPTConversation[];

    if (!Array.isArray(data)) {
        throw new Error('Invalid ChatGPT export format: expected array of conversations');
    }

    const conversations: string[] = [];
    let messageCount = 0;

    for (const conv of data) {
        if (!conv.mapping) continue;

        const messages: string[] = [];
        for (const node of Object.values(conv.mapping)) {
            const msg = node.message;
            if (!msg || !msg.content?.parts?.[0]) continue;

            const role = msg.author?.role;
            const content = msg.content.parts[0];

            if (role === 'user' || role === 'assistant') {
                messages.push(`${role === 'user' ? 'User' : 'Assistant'}: ${content}`);
                messageCount++;
            }
        }

        if (messages.length > 0) {
            const title = conv.title || 'Untitled Conversation';
            const conversationText = `[${title}]\n${messages.join('\n')}`;
            conversations.push(conversationText);
        }
    }

    return { conversations, messageCount };
}

// ============================================
// PARSE CLAUDE EXPORT
// ============================================

export function parseClaudeExport(jsonData: unknown): {
    conversations: string[];
    messageCount: number;
} {
    const data = jsonData as ClaudeConversation[];

    if (!Array.isArray(data)) {
        throw new Error('Invalid Claude export format: expected array of conversations');
    }

    const conversations: string[] = [];
    let messageCount = 0;

    for (const conv of data) {
        if (!conv.chat_messages?.length) continue;

        const messages: string[] = [];
        for (const msg of conv.chat_messages) {
            const role = msg.sender === 'human' ? 'User' : 'Assistant';
            messages.push(`${role}: ${msg.text}`);
            messageCount++;
        }

        if (messages.length > 0) {
            const title = conv.name || 'Untitled Conversation';
            const conversationText = `[${title}]\n${messages.join('\n')}`;
            conversations.push(conversationText);
        }
    }

    return { conversations, messageCount };
}

// ============================================
// INGEST CONVERSATIONS INTO QDRANT
// ============================================

export async function ingestConversations(
    userId: string,
    conversations: string[],
    source: 'chatgpt' | 'claude' | 'aspendos'
): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    // Process in batches of 10
    const batchSize = 10;
    for (let i = 0; i < conversations.length; i += batchSize) {
        const batch = conversations.slice(i, i + batchSize);

        try {
            // Create embeddings for the batch
            const embeddings = await createEmbeddings(batch.map((c) => c.slice(0, 8000))); // Limit text size

            // Store concurrently in Qdrant using Promise.all
            await Promise.all(
                batch.map((conversation, j) =>
                    storeMemory({
                        id: uuidv4(),
                        vector: embeddings[j],
                        userId,
                        content: conversation.slice(0, 5000), // Store truncated
                        type: 'context',
                        metadata: {
                            source,
                            importedAt: new Date().toISOString(),
                        },
                    })
                        .then(() => {
                            success++;
                        })
                        .catch((error) => {
                            console.error(
                                `[Ingest] Failed to store memory for conversation ${j}:`,
                                error
                            );
                            failed++;
                        })
                )
            );
        } catch (error) {
            console.error('[Ingest] Batch embedding failed:', error);
            failed += batch.length;
        }
    }

    return { success, failed };
}

// ============================================
// EXPORT USER MEMORIES
// ============================================

export async function exportUserMemories(userId: string): Promise<AspendosExport> {
    // Fetch all memories for user from Qdrant
    const scrollResult = await qdrant.scroll(COLLECTIONS.USER_MEMORIES, {
        filter: {
            must: [{ key: 'user_id', match: { value: userId } }],
        },
        limit: 10000,
        with_payload: true,
        with_vector: false,
    });

    const memories: AspendosMemory[] = scrollResult.points.map((point) => {
        const payload = point.payload as Record<string, unknown>;
        return {
            id: String(point.id),
            content: (payload.content as string) || '',
            type: (payload.type as 'context' | 'preference' | 'insight') || 'context',
            source: (payload.source as 'chatgpt' | 'claude' | 'aspendos' | 'manual') || 'aspendos',
            conversationId: payload.conversation_id as string | undefined,
            createdAt: (payload.created_at as string) || new Date().toISOString(),
            metadata: payload.metadata as Record<string, unknown> | undefined,
        };
    });

    // Calculate stats
    const byType: Record<string, number> = {};
    const bySource: Record<string, number> = {};

    for (const memory of memories) {
        byType[memory.type] = (byType[memory.type] || 0) + 1;
        bySource[memory.source] = (bySource[memory.source] || 0) + 1;
    }

    return {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        userId,
        memories,
        stats: {
            totalMemories: memories.length,
            byType,
            bySource,
        },
    };
}

// ============================================
// IMPORT ASPENDOS EXPORT
// ============================================

export async function importAspendosExport(
    userId: string,
    exportData: AspendosExport
): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    // Process in batches
    const batchSize = 20;
    const memories = exportData.memories;

    for (let i = 0; i < memories.length; i += batchSize) {
        const batch = memories.slice(i, i + batchSize);

        try {
            const embeddings = await createEmbeddings(batch.map((m) => m.content.slice(0, 8000)));

            // Store concurrently using Promise.all
            await Promise.all(
                batch.map((memory, j) =>
                    storeMemory({
                        id: uuidv4(), // New ID for imported memory
                        vector: embeddings[j],
                        userId,
                        content: memory.content,
                        type: memory.type,
                        conversationId: memory.conversationId,
                        metadata: {
                            ...memory.metadata,
                            originalId: memory.id,
                            source: memory.source,
                            originalCreatedAt: memory.createdAt,
                            importedAt: new Date().toISOString(),
                        },
                    })
                        .then(() => {
                            success++;
                        })
                        .catch((error) => {
                            console.error(`[Import] Failed to store memory ${j}:`, error);
                            failed++;
                        })
                )
            );
        } catch (error) {
            console.error('[Import] Batch embedding failed:', error);
            failed += batch.length;
        }
    }

    return { success, failed };
}

// ============================================
// DETECT EXPORT FORMAT
// ============================================

export function detectExportFormat(
    jsonData: unknown
): 'chatgpt' | 'claude' | 'aspendos' | 'unknown' {
    if (!jsonData) return 'unknown';

    // Check for Aspendos format
    if (
        typeof jsonData === 'object' &&
        'version' in (jsonData as object) &&
        'memories' in (jsonData as object)
    ) {
        return 'aspendos';
    }

    // Check for array (ChatGPT or Claude)
    if (Array.isArray(jsonData) && jsonData.length > 0) {
        const first = jsonData[0];

        // ChatGPT has 'mapping' property
        if ('mapping' in first) {
            return 'chatgpt';
        }

        // Claude has 'chat_messages' property
        if ('chat_messages' in first) {
            return 'claude';
        }
    }

    return 'unknown';
}

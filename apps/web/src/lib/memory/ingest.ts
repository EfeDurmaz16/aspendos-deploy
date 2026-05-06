const MEMORY_STORE_UNAVAILABLE =
    'Memory import/export is not wired to Convex/SuperMemory; refusing fake success.';

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
// INGEST CONVERSATIONS INTO MEMORY
// ============================================

export async function ingestConversations(
    _userId: string,
    _conversations: string[],
    _source: 'chatgpt' | 'claude' | 'aspendos'
): Promise<{ success: number; failed: number }> {
    throw new Error(MEMORY_STORE_UNAVAILABLE);
}

// ============================================
// EXPORT USER MEMORIES
// ============================================

export async function exportUserMemories(_userId: string): Promise<AspendosExport> {
    throw new Error(MEMORY_STORE_UNAVAILABLE);
}

// ============================================
// IMPORT ASPENDOS EXPORT
// ============================================

export async function importAspendosExport(
    _userId: string,
    _exportData: AspendosExport
): Promise<{ success: number; failed: number }> {
    throw new Error(MEMORY_STORE_UNAVAILABLE);
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

/**
 * Import Parsers
 *
 * Parsers for additional AI chat export formats (Gemini, Perplexity).
 * Normalizes different export structures into a common format.
 */

// Normalized message format
export interface ParsedMessage {
    role: 'user' | 'assistant';
    content: string;
    createdAt: Date;
}

// Normalized conversation format
export interface ParsedConversation {
    title: string;
    messages: ParsedMessage[];
}

/**
 * Parse Google Gemini export format
 *
 * Gemini exports conversations as JSON with this structure:
 * [{
 *   "title": "conversation title",
 *   "create_time": 1234567890,
 *   "entries": [
 *     { "role": "USER", "text": "user message", "create_time": 1234567890 },
 *     { "role": "MODEL", "text": "model response", "create_time": 1234567891 }
 *   ]
 * }]
 */
export function parseGeminiExport(rawJson: string): ParsedConversation[] {
    try {
        const data = JSON.parse(rawJson);

        if (!Array.isArray(data)) {
            throw new Error('Invalid Gemini export format: expected array');
        }

        const conversations: ParsedConversation[] = [];

        for (const conv of data) {
            if (!conv || typeof conv !== 'object') continue;

            const title = conv.title || 'Untitled Conversation';
            const entries = conv.entries;

            if (!Array.isArray(entries)) continue;

            const messages: ParsedMessage[] = [];

            for (const entry of entries) {
                if (!entry || typeof entry !== 'object') continue;

                const role = entry.role;
                const text = entry.text;

                // Only process USER and MODEL messages
                if (!role || !text || typeof text !== 'string') continue;

                let normalizedRole: 'user' | 'assistant';
                if (role === 'USER') {
                    normalizedRole = 'user';
                } else if (role === 'MODEL') {
                    normalizedRole = 'assistant';
                } else {
                    continue; // Skip other roles
                }

                const createdAt = entry.create_time
                    ? new Date(entry.create_time * 1000)
                    : new Date();

                messages.push({
                    role: normalizedRole,
                    content: text.trim(),
                    createdAt,
                });
            }

            if (messages.length > 0) {
                conversations.push({ title, messages });
            }
        }

        return conversations;
    } catch (error) {
        if (error instanceof SyntaxError) {
            throw new Error('Invalid JSON format');
        }
        throw error;
    }
}

/**
 * Parse Perplexity AI export format
 *
 * Perplexity exports as JSON:
 * {
 *   "threads": [{
 *     "title": "thread title",
 *     "created_at": "2024-01-01T00:00:00Z",
 *     "messages": [
 *       { "role": "human", "content": "question", "timestamp": "2024-01-01T00:00:00Z" },
 *       { "role": "assistant", "content": "answer with citations [1]", "timestamp": "2024-01-01T00:00:01Z" }
 *     ]
 *   }]
 * }
 *
 * Citations are stripped from the content (e.g., [1], [2], etc.)
 */
export function parsePerplexityExport(rawJson: string): ParsedConversation[] {
    try {
        const data = JSON.parse(rawJson);

        if (!data || typeof data !== 'object') {
            throw new Error('Invalid Perplexity export format: expected object');
        }

        const threads = data.threads;

        if (!Array.isArray(threads)) {
            throw new Error('Invalid Perplexity export format: missing threads array');
        }

        const conversations: ParsedConversation[] = [];

        for (const thread of threads) {
            if (!thread || typeof thread !== 'object') continue;

            const title = thread.title || 'Untitled Thread';
            const messages = thread.messages;

            if (!Array.isArray(messages)) continue;

            const parsedMessages: ParsedMessage[] = [];

            for (const msg of messages) {
                if (!msg || typeof msg !== 'object') continue;

                const role = msg.role;
                const content = msg.content;

                if (!role || !content || typeof content !== 'string') continue;

                let normalizedRole: 'user' | 'assistant';
                if (role === 'human') {
                    normalizedRole = 'user';
                } else if (role === 'assistant') {
                    normalizedRole = 'assistant';
                } else {
                    continue; // Skip other roles
                }

                // Strip citation markers like [1], [2], [1][2], etc.
                const cleanContent = content.replace(/\[\d+\](\[\d+\])*/g, '').trim();

                const createdAt = msg.timestamp ? new Date(msg.timestamp) : new Date();

                parsedMessages.push({
                    role: normalizedRole,
                    content: cleanContent,
                    createdAt,
                });
            }

            if (parsedMessages.length > 0) {
                conversations.push({ title, messages: parsedMessages });
            }
        }

        return conversations;
    } catch (error) {
        if (error instanceof SyntaxError) {
            throw new Error('Invalid JSON format');
        }
        throw error;
    }
}

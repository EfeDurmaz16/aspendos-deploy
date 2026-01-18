import OpenAI from 'openai';

// ============================================
// OPENAI CLIENT
// ============================================

export const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// ============================================
// EMBEDDING MODEL
// ============================================

const EMBEDDING_MODEL = 'text-embedding-3-small';

// ============================================
// EMBEDDING OPERATIONS
// ============================================

/**
 * Create embedding for a single text
 */
export async function createEmbedding(text: string): Promise<number[]> {
    const response = await openai.embeddings.create({
        model: EMBEDDING_MODEL,
        input: text,
    });
    return response.data[0].embedding;
}

/**
 * Create embeddings for multiple texts (batch)
 */
export async function createEmbeddings(texts: string[]): Promise<number[][]> {
    const response = await openai.embeddings.create({
        model: EMBEDDING_MODEL,
        input: texts,
    });
    return response.data.map((d) => d.embedding);
}

// ============================================
// CHAT COMPLETION
// ============================================

interface ChatOptions {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    systemPrompt?: string;
}

interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

/**
 * Create a chat completion (non-streaming)
 */
export async function createChatCompletion(messages: ChatMessage[], options: ChatOptions = {}) {
    const { model = 'gpt-4o-mini', temperature = 0.7, maxTokens = 4000 } = options;

    const response = await openai.chat.completions.create({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
    });

    return {
        content: response.choices[0].message.content || '',
        usage: response.usage,
        model: response.model,
    };
}

/**
 * Create a streaming chat completion
 */
export async function* createStreamingChatCompletion(
    messages: ChatMessage[],
    options: ChatOptions = {}
): AsyncGenerator<{ type: 'text' | 'done'; content: string }> {
    const { model = 'gpt-4o-mini', temperature = 0.7, maxTokens = 4000 } = options;

    const stream = await openai.chat.completions.create({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
        stream: true,
    });

    for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
            yield { type: 'text', content };
        }
    }

    yield { type: 'done', content: '' };
}

// ============================================
// MEMORY EXTRACTION
// ============================================

/**
 * Extract key insights from a conversation for memory storage
 */
export async function extractMemoryInsights(conversationText: string): Promise<string[]> {
    const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
            {
                role: 'system',
                content: `You are a memory extraction assistant. Extract 2-4 key facts or insights about the user from the conversation. Focus on:
- User preferences
- Important information shared
- Topics of interest
- Decisions made

Return ONLY a JSON array of strings, each string being one insight. No explanation.`,
            },
            {
                role: 'user',
                content: conversationText,
            },
        ],
        temperature: 0.3,
        max_tokens: 500,
    });

    try {
        const content = response.choices[0].message.content || '[]';
        return JSON.parse(content);
    } catch {
        return [];
    }
}

export default openai;

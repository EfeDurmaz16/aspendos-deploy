/**
 * OpenAI Service (via Vercel AI Gateway)
 *
 * Legacy wrapper maintained for backward compatibility.
 * All calls route through Vercel AI Gateway.
 */

import { gateway, generateText, streamText, embed, embedMany } from 'ai';

// ============================================
// EMBEDDING MODEL
// ============================================

const EMBEDDING_MODEL = 'openai/text-embedding-3-small';

// ============================================
// EMBEDDING OPERATIONS
// ============================================

/**
 * Create embedding for a single text
 */
export async function createEmbedding(text: string): Promise<number[]> {
    const { embedding } = await embed({
        model: gateway.textEmbeddingModel(EMBEDDING_MODEL),
        value: text,
    });
    return embedding;
}

/**
 * Create embeddings for multiple texts (batch)
 */
export async function createEmbeddings(texts: string[]): Promise<number[][]> {
    const { embeddings } = await embedMany({
        model: gateway.textEmbeddingModel(EMBEDDING_MODEL),
        values: texts,
    });
    return embeddings;
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

    const { text, usage } = await generateText({
        model: gateway(`openai/${model}`),
        messages,
        temperature,
        maxOutputTokens: maxTokens,
    });

    return {
        content: text,
        usage,
        model,
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

    const result = streamText({
        model: gateway(`openai/${model}`),
        messages,
        temperature,
        maxOutputTokens: maxTokens,
    });

    for await (const chunk of result.textStream) {
        if (chunk) {
            yield { type: 'text', content: chunk };
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
    try {
        const { text } = await generateText({
            model: gateway('groq/llama-3.1-8b-instant'),
            system: `You are a memory extraction assistant. Extract 2-4 key facts or insights about the user from the conversation. Focus on:
- User preferences
- Important information shared
- Topics of interest
- Decisions made

Return ONLY a JSON array of strings, each string being one insight. No explanation.`,
            prompt: conversationText,
            temperature: 0.3,
            maxOutputTokens: 500,
        });

        return JSON.parse(text || '[]');
    } catch {
        return [];
    }
}

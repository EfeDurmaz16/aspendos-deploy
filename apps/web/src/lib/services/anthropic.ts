/**
 * Anthropic Service (via Vercel AI Gateway)
 *
 * Legacy wrapper maintained for backward compatibility.
 * All calls route through Vercel AI Gateway.
 */

import { gateway, generateText, streamText } from 'ai';

// ============================================
// CHAT COMPLETION
// ============================================

interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

interface ChatOptions {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    systemPrompt?: string;
}

/**
 * Create a streaming chat completion with Claude
 */
export async function* createAnthropicStreamingCompletion(
    messages: ChatMessage[],
    options: ChatOptions = {}
): AsyncGenerator<{ type: 'text' | 'done'; content: string }> {
    const {
        model = 'claude-3-5-sonnet-20241022',
        temperature = 0.7,
        maxTokens = 4000,
        systemPrompt = 'You are a helpful AI assistant.',
    } = options;

    const result = streamText({
        model: gateway(`anthropic/${model}`),
        system: systemPrompt,
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

/**
 * Create a non-streaming chat completion with Claude
 */
export async function createAnthropicCompletion(
    messages: ChatMessage[],
    options: ChatOptions = {}
) {
    const {
        model = 'claude-3-5-sonnet-20241022',
        temperature = 0.7,
        maxTokens = 4000,
        systemPrompt = 'You are a helpful AI assistant.',
    } = options;

    const { text, usage } = await generateText({
        model: gateway(`anthropic/${model}`),
        system: systemPrompt,
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

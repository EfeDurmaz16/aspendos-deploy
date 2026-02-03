import Anthropic from '@anthropic-ai/sdk';

// ============================================
// ANTHROPIC CLIENT
// ============================================

export const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

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

    const stream = anthropic.messages.stream({
        model,
        max_tokens: maxTokens,
        temperature,
        system: systemPrompt,
        messages: messages.map((m) => ({
            role: m.role,
            content: m.content,
        })),
    });

    for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            yield { type: 'text', content: event.delta.text };
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

    const response = await anthropic.messages.create({
        model,
        max_tokens: maxTokens,
        temperature,
        system: systemPrompt,
        messages: messages.map((m) => ({
            role: m.role,
            content: m.content,
        })),
    });

    const textContent = response.content.find((c) => c.type === 'text');
    return {
        content: textContent?.type === 'text' ? textContent.text : '',
        usage: {
            input_tokens: response.usage.input_tokens,
            output_tokens: response.usage.output_tokens,
        },
        model: response.model,
    };
}

export default anthropic;

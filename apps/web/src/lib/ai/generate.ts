/**
 * YULA AI Generation Module
 *
 * Unified text generation using Vercel AI SDK.
 * ONLY uses streamText and generateText from @ai-sdk.
 */

import { streamText, generateText } from 'ai';
import { getModel, getFallbackModels, MODEL_REGISTRY, type ModelId } from './providers';

// ============================================
// TYPES
// ============================================

export interface GenerateOptions {
    model?: ModelId | string;
    temperature?: number;
    maxTokens?: number;
    systemPrompt?: string;
}

export interface StreamChunk {
    type: 'text' | 'done' | 'error' | 'fallback';
    content: string;
    metadata?: Record<string, unknown>;
}

export interface GenerateResult {
    content: string;
    model: string;
    usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
}

// ============================================
// MESSAGE TYPES
// ============================================

type MessageRole = 'system' | 'user' | 'assistant';

interface ChatMessage {
    role: MessageRole;
    content: string;
}

// ============================================
// STREAMING GENERATION (Primary Method)
// ============================================

/**
 * Stream text generation using Vercel AI SDK streamText
 *
 * This is the PRIMARY method for all AI generation in Yula.
 * Supports automatic fallback to alternate providers.
 */
export async function* createStreamingCompletion(
    messages: ChatMessage[],
    options: GenerateOptions = {}
): AsyncGenerator<StreamChunk> {
    const { model = 'gpt-4o-mini', temperature = 0.7, maxTokens = 4000 } = options;

    const modelsToTry = [model, ...getFallbackModels(model as ModelId)];

    for (let i = 0; i < modelsToTry.length; i++) {
        const currentModel = modelsToTry[i];

        if (i > 0) {
            yield {
                type: 'fallback',
                content: `Switching to ${MODEL_REGISTRY[currentModel as ModelId]?.displayName || currentModel}...`,
                metadata: { previousModel: modelsToTry[i - 1], newModel: currentModel },
            };
        }

        try {
            const result = streamText({
                model: getModel(currentModel),
                messages: messages.map((m) => ({ role: m.role, content: m.content })),
                temperature,
                maxOutputTokens: maxTokens,
            });

            for await (const chunk of result.textStream) {
                yield { type: 'text', content: chunk };
            }

            yield { type: 'done', content: '' };
            return;
        } catch (error) {
            console.warn(`[AI] Model ${currentModel} failed:`, error);

            if (i === modelsToTry.length - 1) {
                yield {
                    type: 'error',
                    content: `All models failed. Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
                };
                return;
            }
        }
    }
}

// ============================================
// NON-STREAMING GENERATION
// ============================================

/**
 * Generate text without streaming using Vercel AI SDK generateText
 *
 * Use for one-shot generation like routing decisions, memory extraction.
 */
export async function createCompletion(
    messages: ChatMessage[],
    options: GenerateOptions = {}
): Promise<GenerateResult> {
    const { model = 'gpt-4o-mini', temperature = 0.7, maxTokens = 4000 } = options;

    const modelsToTry = [model, ...getFallbackModels(model as ModelId)];

    for (const currentModel of modelsToTry) {
        try {
            const result = await generateText({
                model: getModel(currentModel),
                messages: messages.map((m) => ({ role: m.role, content: m.content })),
                temperature,
                maxOutputTokens: maxTokens,
            });

            return {
                content: result.text,
                model: currentModel,
                usage: result.usage
                    ? {
                          promptTokens: result.usage.inputTokens ?? 0,
                          completionTokens: result.usage.outputTokens ?? 0,
                          totalTokens: result.usage.totalTokens ?? 0,
                      }
                    : undefined,
            };
        } catch (error) {
            console.warn(`[AI] Model ${currentModel} failed:`, error);
            continue;
        }
    }

    throw new Error('All models failed');
}

// ============================================
// SPECIALIZED GENERATION FUNCTIONS
// ============================================

/**
 * Fast routing decision using Groq Llama
 */
export async function createRouterCompletion(
    prompt: string,
    systemPrompt: string
): Promise<string> {
    const result = await createCompletion(
        [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt },
        ],
        {
            model: 'llama-3.1-8b-instant',
            temperature: 0.1,
            maxTokens: 500,
        }
    );

    return result.content;
}

/**
 * Complex coding task using Claude 3.5 Sonnet
 */
export async function* createCodingCompletion(
    messages: ChatMessage[],
    options: Omit<GenerateOptions, 'model'> = {}
): AsyncGenerator<StreamChunk> {
    yield* createStreamingCompletion(messages, {
        ...options,
        model: 'claude-3-5-sonnet-20241022',
    });
}

/**
 * Fast completion using GPT-4o-mini
 */
export async function createFastCompletion(
    messages: ChatMessage[],
    options: Omit<GenerateOptions, 'model'> = {}
): Promise<GenerateResult> {
    return createCompletion(messages, {
        ...options,
        model: 'gpt-4o-mini',
    });
}

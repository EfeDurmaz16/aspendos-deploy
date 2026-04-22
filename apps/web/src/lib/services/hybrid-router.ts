import { createAnthropicStreamingCompletion } from './anthropic';
import { createGroqStreamingCompletion, type RouteDecision, routeUserMessage } from './groq';
import { createEmbedding, createStreamingChatCompletion as createOpenAIStream } from './openai';

// TODO(phase-a-day-3): Qdrant removed — memory search will use Convex + SuperMemory
async function searchMemories(
    _userId: string,
    _embedding: number[],
    _limit: number,
    _type?: string
): Promise<Array<{ content: string; score: number }>> {
    return [];
}

// ============================================
// MODEL PROVIDER MAPPING
// ============================================

type ModelProvider = 'openai' | 'anthropic' | 'groq';

const MODEL_PROVIDERS: Record<string, ModelProvider> = {
    // OpenAI models
    'gpt-5': 'openai',
    'gpt-5-mini': 'openai',
    // Anthropic models
    'claude-sonnet-4-6': 'anthropic',
    'claude-haiku-4-5': 'anthropic',
    'claude-opus-4-7': 'anthropic',
    // Groq models (fast inference) — Llama 4 family
    'llama-4-maverick': 'groq',
    'llama-4-scout': 'groq',
};

// ============================================
// FALLBACK MODEL CHAIN
// ============================================

const FALLBACK_CHAIN: Record<string, string[]> = {
    'gpt-5': ['claude-sonnet-4-6', 'llama-4-maverick'],
    'gpt-5-mini': ['claude-haiku-4-5', 'llama-4-scout'],
    'claude-sonnet-4-6': ['gpt-5', 'llama-4-maverick'],
    'claude-opus-4-7': ['claude-sonnet-4-6', 'gpt-5'],
    'claude-haiku-4-5': ['gpt-5-mini', 'llama-4-scout'],
    'llama-4-maverick': ['gpt-5', 'claude-sonnet-4-6'],
    'llama-4-scout': ['llama-4-maverick', 'gpt-5-mini'],
};

// ============================================
// UNIFIED STREAMING COMPLETION
// ============================================

export async function* createUnifiedStreamingCompletion(
    messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
    options: {
        model: string;
        temperature?: number;
        maxTokens?: number;
        userId?: string;
    }
): AsyncGenerator<{
    type: 'text' | 'done' | 'error' | 'fallback';
    content: string;
    metadata?: Record<string, unknown>;
}> {
    const { model, temperature = 0.7, maxTokens = 4000 } = options;
    const modelsToTry = [model, ...(FALLBACK_CHAIN[model] || [])];

    for (let i = 0; i < modelsToTry.length; i++) {
        const currentModel = modelsToTry[i];
        const currentProvider = MODEL_PROVIDERS[currentModel] || 'openai';

        if (i > 0) {
            yield {
                type: 'fallback',
                content: `Switching to ${currentModel}...`,
                metadata: { previousModel: modelsToTry[i - 1], newModel: currentModel },
            };
        }

        try {
            if (currentProvider === 'openai') {
                for await (const chunk of createOpenAIStream(messages, {
                    model: currentModel,
                    temperature,
                    maxTokens,
                })) {
                    yield chunk;
                }
                return;
            } else if (currentProvider === 'anthropic') {
                // Convert messages for Anthropic (no system role in messages array)
                const systemMsg = messages.find((m) => m.role === 'system');
                const nonSystemMessages = messages
                    .filter((m) => m.role !== 'system')
                    .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

                for await (const chunk of createAnthropicStreamingCompletion(nonSystemMessages, {
                    model: currentModel,
                    temperature,
                    maxTokens,
                    systemPrompt: systemMsg?.content,
                })) {
                    yield chunk;
                }
                return;
            } else if (currentProvider === 'groq') {
                for await (const chunk of createGroqStreamingCompletion(messages, {
                    model: currentModel,
                    temperature,
                    maxTokens,
                })) {
                    yield chunk;
                }
                return;
            }
        } catch (error) {
            console.warn(`[HybridRouter] Model ${currentModel} failed:`, error);
            if (i === modelsToTry.length - 1) {
                yield {
                    type: 'error',
                    content: `All models failed. Last error: ${error instanceof Error ? error.message : 'Unknown error'}`,
                };
                return;
            }
        }
    }
}

// ============================================
// FULL HYBRID ROUTING PIPELINE
// ============================================

export interface HybridRouterResult {
    decision: RouteDecision;
    memoryContext?: string;
    memories?: Array<{ content: string; score: number }>;
}

export async function executeHybridRoute(
    userMessage: string,
    userId: string,
    options: {
        recentMessages?: string[];
        skipRouter?: boolean;
        forceModel?: string;
    } = {}
): Promise<HybridRouterResult> {
    // 1. Route the message (unless skipped)
    let decision: RouteDecision;

    if (options.skipRouter && options.forceModel) {
        decision = {
            type: 'direct_reply',
            model: options.forceModel,
            reason: 'Router skipped, using forced model',
        };
    } else {
        decision = await routeUserMessage(userMessage, {
            recentMessages: options.recentMessages,
        });
    }

    // 2. If RAG search, fetch memories
    let memoryContext = '';
    let memories: Array<{ content: string; score: number }> = [];

    if (decision.type === 'rag_search') {
        try {
            const queryEmbedding = await createEmbedding(
                decision.type === 'rag_search' ? (decision as { query: string }).query : userMessage
            );
            const searchResults = await searchMemories(userId, queryEmbedding, 5);

            if (searchResults.length > 0) {
                memories = searchResults.map((m) => ({ content: m.content, score: m.score }));
                memoryContext = searchResults.map((m) => `- ${m.content}`).join('\n');
            }
        } catch (error) {
            console.warn('[HybridRouter] Memory search failed:', error);
        }
    }

    return {
        decision,
        memoryContext,
        memories,
    };
}

// ============================================
// AVAILABLE TOOLS REGISTRY
// ============================================

export const AVAILABLE_TOOLS = {
    web_search: {
        name: 'web_search',
        description: 'Search the web for current information',
        params: ['query'],
    },
    image_generation: {
        name: 'image_generation',
        description: 'Generate images using AI',
        params: ['prompt', 'style'],
    },
    code_execution: {
        name: 'code_execution',
        description: 'Execute code in a sandboxed environment',
        params: ['language', 'code'],
    },
} as const;

export type ToolName = keyof typeof AVAILABLE_TOOLS;

import { routeUserMessage, createGroqStreamingCompletion, type RouteDecision } from './groq';
import { createStreamingChatCompletion as createOpenAIStream, createEmbedding } from './openai';
import { createAnthropicStreamingCompletion } from './anthropic';
import { searchMemories } from './qdrant';

// ============================================
// MODEL PROVIDER MAPPING
// ============================================

type ModelProvider = 'openai' | 'anthropic' | 'groq';

const MODEL_PROVIDERS: Record<string, ModelProvider> = {
    // OpenAI models
    'gpt-4o': 'openai',
    'gpt-4o-mini': 'openai',
    'gpt-4-turbo': 'openai',
    'gpt-3.5-turbo': 'openai',
    // Anthropic models
    'claude-3-5-sonnet-20241022': 'anthropic',
    'claude-3-haiku-20240307': 'anthropic',
    'claude-3-opus-20240229': 'anthropic',
    // Groq models (fast inference)
    'llama-3.1-70b-versatile': 'groq',
    'llama-3.1-8b-instant': 'groq',
    'mixtral-8x7b-32768': 'groq',
};

// ============================================
// FALLBACK MODEL CHAIN
// ============================================

const FALLBACK_CHAIN: Record<string, string[]> = {
    'gpt-4o': ['claude-3-5-sonnet-20241022', 'llama-3.1-70b-versatile'],
    'gpt-4o-mini': ['claude-3-haiku-20240307', 'llama-3.1-8b-instant'],
    'claude-3-5-sonnet-20241022': ['gpt-4o', 'llama-3.1-70b-versatile'],
    'claude-3-haiku-20240307': ['gpt-4o-mini', 'llama-3.1-8b-instant'],
    'llama-3.1-70b-versatile': ['gpt-4o', 'claude-3-5-sonnet-20241022'],
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
): AsyncGenerator<{ type: 'text' | 'done' | 'error' | 'fallback'; content: string; metadata?: Record<string, unknown> }> {
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

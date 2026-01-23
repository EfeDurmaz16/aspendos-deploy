/**
 * YULA Hybrid AI Pipeline
 *
 * Combines routing, memory search, and streaming generation
 * using Vercel AI SDK throughout.
 */

import { streamText } from 'ai';
import { getModel, getFallbackModels, MODEL_REGISTRY, type ModelId } from './providers';
import { routeUserMessage, fastRoute, type RouteDecision } from './router';
import { createEmbedding } from './embeddings';
import { searchMemories } from '../services/qdrant';

// ============================================
// TYPES
// ============================================

export interface HybridRouteResult {
    decision: RouteDecision;
    memoryContext?: string;
    memories?: Array<{ content: string; score: number }>;
}

export interface StreamChunk {
    type: 'text' | 'done' | 'error' | 'fallback';
    content: string;
    metadata?: Record<string, unknown>;
}

// ============================================
// UNIFIED STREAMING COMPLETION
// ============================================

/**
 * Unified streaming completion with automatic fallback
 *
 * Uses Vercel AI SDK streamText for all providers.
 */
export async function* createUnifiedStreamingCompletion(
    messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
    options: {
        model: string;
        temperature?: number;
        maxTokens?: number;
        userId?: string;
    }
): AsyncGenerator<StreamChunk> {
    const { model, temperature = 0.7, maxTokens = 4000 } = options;

    const modelsToTry = [model, ...getFallbackModels(model as ModelId)];

    for (let i = 0; i < modelsToTry.length; i++) {
        const currentModel = modelsToTry[i];

        if (i > 0) {
            const displayName = MODEL_REGISTRY[currentModel as ModelId]?.displayName || currentModel;
            yield {
                type: 'fallback',
                content: `Switching to ${displayName}...`,
                metadata: { previousModel: modelsToTry[i - 1], newModel: currentModel },
            };
        }

        try {
            // Use Vercel AI SDK streamText
            const result = streamText({
                model: getModel(currentModel),
                messages: messages.map((m) => ({
                    role: m.role,
                    content: m.content,
                })),
                temperature,
                maxOutputTokens: maxTokens,
            });

            for await (const chunk of result.textStream) {
                yield { type: 'text', content: chunk };
            }

            yield { type: 'done', content: '' };
            return;
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

/**
 * Execute the full hybrid routing pipeline:
 * 1. Fast route check (skip LLM if obvious)
 * 2. LLM-based routing via Groq
 * 3. Memory search if needed
 */
export async function executeHybridRoute(
    userMessage: string,
    userId: string,
    options: {
        recentMessages?: string[];
        skipRouter?: boolean;
        forceModel?: string;
    } = {}
): Promise<HybridRouteResult> {
    // 1. Check for fast route first
    let decision: RouteDecision | null = null;

    if (options.skipRouter && options.forceModel) {
        decision = {
            type: 'direct_reply',
            model: options.forceModel,
            reason: 'Router skipped, using forced model',
        };
    } else {
        // Try fast route
        decision = fastRoute(userMessage);

        // If no fast route, use LLM router
        if (!decision) {
            decision = await routeUserMessage(userMessage, {
                recentMessages: options.recentMessages,
            });
        }
    }

    // 2. If RAG search or direct reply, fetch memories
    let memoryContext = '';
    let memories: Array<{ content: string; score: number }> = [];

    if (decision.type === 'rag_search' || decision.type === 'direct_reply') {
        try {
            const queryText =
                decision.type === 'rag_search'
                    ? (decision as { query: string }).query
                    : userMessage;

            const queryEmbedding = await createEmbedding(queryText);
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

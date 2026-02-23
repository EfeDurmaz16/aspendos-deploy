/**
 * AI Provider Registry
 * Unified interface for AI providers via Vercel AI Gateway.
 */

import { gateway } from 'ai';
import { breakers } from './circuit-breaker';

/**
 * Fallback chain for AI models when circuit breakers are open
 *
 * Strategy: Groq-first for speed & cost. Premium models (Claude, GPT) only for ULTRA tier.
 */
const FALLBACK_CHAIN: Record<string, string[]> = {
    // Groq primary models
    'groq/llama-3.1-70b-versatile': ['groq/mixtral-8x7b-32768', 'groq/llama-3.1-8b-instant'],
    'groq/llama-3.1-8b-instant': ['groq/llama3-8b-8192', 'groq/llama-3.1-70b-versatile'],
    'groq/mixtral-8x7b-32768': ['groq/llama-3.1-70b-versatile', 'groq/llama-3.1-8b-instant'],
    'groq/llama3-8b-8192': ['groq/llama-3.1-8b-instant', 'groq/llama-3.1-70b-versatile'],
    // ULTRA tier premium models (fallback to Groq)
    'anthropic/claude-sonnet-4-20250514': ['groq/llama-3.1-70b-versatile', 'openai/gpt-4o'],
    'anthropic/claude-opus-4-20250514': ['anthropic/claude-sonnet-4-20250514', 'groq/llama-3.1-70b-versatile'],
    'openai/gpt-4o': ['groq/llama-3.1-70b-versatile', 'anthropic/claude-sonnet-4-20250514'],
    'openai/o1': ['openai/gpt-4o', 'groq/llama-3.1-70b-versatile'],
};

/**
 * Get a language model by ID via Vercel AI Gateway.
 * Supports formats like "openai/gpt-4o", "anthropic/claude-sonnet-4-20250514", etc.
 */
export function getModel(modelId: string) {
    return gateway(modelId);
}

/**
 * Get a language model with automatic fallback when circuit breakers are open
 */
export function getModelWithFallback(modelId: string): { model: any; actualModelId: string } {
    const [provider] = modelId.split('/');

    if (!provider) {
        throw new Error(`Invalid model ID format: ${modelId}. Expected "provider/model-name"`);
    }

    const breakerKey = provider as keyof typeof breakers;

    if (breakers[breakerKey]) {
        const breakerState = breakers[breakerKey].getState();

        if (breakerState.state === 'OPEN') {
            const fallbacks = FALLBACK_CHAIN[modelId] || [];

            for (const fallbackId of fallbacks) {
                const [fallbackProvider] = fallbackId.split('/');
                const fallbackBreakerKey = fallbackProvider as keyof typeof breakers;

                if (breakers[fallbackBreakerKey]) {
                    const fallbackState = breakers[fallbackBreakerKey].getState();
                    if (fallbackState.state !== 'OPEN') {
                        console.warn(`[Fallback] ${modelId} unavailable, using ${fallbackId}`);
                        return {
                            model: gateway(fallbackId),
                            actualModelId: fallbackId,
                        };
                    }
                } else {
                    console.warn(`[Fallback] ${modelId} unavailable, using ${fallbackId}`);
                    return {
                        model: gateway(fallbackId),
                        actualModelId: fallbackId,
                    };
                }
            }

            throw new Error('All AI providers are currently unavailable');
        }
    }

    return {
        model: gateway(modelId),
        actualModelId: modelId,
    };
}

/**
 * Supported models configuration
 *
 * Groq-first strategy:
 * - FREE/STARTER/PRO: Groq models (fast, cheap, great UX)
 * - ULTRA: Premium models (Claude, GPT-4o, O1) for deep thinking
 */
export const SUPPORTED_MODELS = [
    // Groq - Default for all tiers
    { id: 'groq/llama-3.1-70b-versatile', name: 'Yula Smart', provider: 'groq', tier: 'FREE' },
    { id: 'groq/llama-3.1-8b-instant', name: 'Yula Fast', provider: 'groq', tier: 'FREE' },
    { id: 'groq/mixtral-8x7b-32768', name: 'Yula Creative', provider: 'groq', tier: 'STARTER' },
    { id: 'groq/llama3-8b-8192', name: 'Yula Lite', provider: 'groq', tier: 'FREE' },

    // Premium - ULTRA tier only (Deep Thinking)
    { id: 'openai/gpt-4o', name: 'Deep Thinking (GPT)', provider: 'openai', tier: 'ULTRA' },
    { id: 'openai/o1', name: 'Deep Reasoning (O1)', provider: 'openai', tier: 'ULTRA' },
    {
        id: 'anthropic/claude-sonnet-4-20250514',
        name: 'Deep Thinking (Claude)',
        provider: 'anthropic',
        tier: 'ULTRA',
    },
    {
        id: 'anthropic/claude-opus-4-20250514',
        name: 'Deep Reasoning (Opus)',
        provider: 'anthropic',
        tier: 'ULTRA',
    },
] as const;

export type SupportedModelId = (typeof SUPPORTED_MODELS)[number]['id'];

/**
 * Get models available for a specific tier
 */
export function getModelsForTier(tier: 'FREE' | 'STARTER' | 'PRO' | 'ULTRA') {
    const tierOrder = { FREE: 0, STARTER: 1, PRO: 2, ULTRA: 3 };
    const userTierLevel = tierOrder[tier];

    return SUPPORTED_MODELS.filter((model) => {
        const modelTierLevel = tierOrder[model.tier as keyof typeof tierOrder] ?? 0;
        return modelTierLevel <= userTierLevel;
    });
}

/**
 * Validate if a model is available for a user's tier
 */
export function isModelAvailableForTier(
    modelId: string,
    tier: 'FREE' | 'STARTER' | 'PRO' | 'ULTRA'
): boolean {
    const availableModels = getModelsForTier(tier);
    return availableModels.some((m) => m.id === modelId);
}

/**
 * Smart model routing: downgrade expensive models for simple queries
 */
export function getSmartModelId(requestedModelId: string, userMessage: string): string {
    if (userMessage.length >= 50) {
        return requestedModelId;
    }

    const simplePatterns =
        /^(hi|hello|hey|thanks|thank you|ok|okay|yes|no|sure|yep|nope|cool|great|nice|good|bye|goodbye|k)$/i;

    if (!simplePatterns.test(userMessage.trim())) {
        return requestedModelId;
    }

    const downgrades: Record<string, string> = {
        'groq/llama-3.1-70b-versatile': 'groq/llama-3.1-8b-instant',
        'groq/mixtral-8x7b-32768': 'groq/llama-3.1-8b-instant',
        'openai/gpt-4o': 'groq/llama-3.1-8b-instant',
        'anthropic/claude-sonnet-4-20250514': 'groq/llama-3.1-8b-instant',
        'anthropic/claude-opus-4-20250514': 'groq/llama-3.1-70b-versatile',
        'openai/o1': 'groq/llama-3.1-70b-versatile',
    };

    return downgrades[requestedModelId] || requestedModelId;
}

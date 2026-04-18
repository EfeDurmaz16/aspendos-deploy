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
    // Groq primary models (Llama 4 family)
    'groq/llama-4-maverick': ['groq/llama-4-scout'],
    'groq/llama-4-scout': ['groq/llama-4-maverick'],
    // ULTRA tier premium models (fallback to Groq)
    'anthropic/claude-sonnet-4-6': ['groq/llama-4-maverick', 'openai/gpt-5'],
    'anthropic/claude-opus-4-7': ['anthropic/claude-sonnet-4-6', 'groq/llama-4-maverick'],
    'anthropic/claude-haiku-4-5': ['groq/llama-4-scout', 'openai/gpt-5-mini'],
    'openai/gpt-5': ['groq/llama-4-maverick', 'anthropic/claude-sonnet-4-6'],
    'openai/gpt-5-mini': ['groq/llama-4-scout', 'anthropic/claude-haiku-4-5'],
    'google/gemini-2.5-pro': ['anthropic/claude-sonnet-4-6', 'openai/gpt-5'],
    'google/gemini-2.5-flash': ['groq/llama-4-scout', 'openai/gpt-5-mini'],
};

/**
 * Get a language model by ID via Vercel AI Gateway.
 * Supports formats like "openai/gpt-5", "anthropic/claude-sonnet-4-6", etc.
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
 * - ULTRA: Premium models (Claude Opus/Sonnet, GPT-5) for deep thinking
 */
export const SUPPORTED_MODELS = [
    // Groq - Default for all tiers
    { id: 'groq/llama-4-maverick', name: 'Yula Smart', provider: 'groq', tier: 'FREE' },
    { id: 'groq/llama-4-scout', name: 'Yula Fast', provider: 'groq', tier: 'FREE' },

    // Premium - ULTRA tier only (Deep Thinking)
    { id: 'openai/gpt-5', name: 'Deep Thinking (GPT)', provider: 'openai', tier: 'ULTRA' },
    { id: 'openai/gpt-5-mini', name: 'Fast Thinking (GPT)', provider: 'openai', tier: 'PRO' },
    {
        id: 'anthropic/claude-sonnet-4-6',
        name: 'Deep Thinking (Claude)',
        provider: 'anthropic',
        tier: 'ULTRA',
    },
    {
        id: 'anthropic/claude-opus-4-7',
        name: 'Deep Reasoning (Opus)',
        provider: 'anthropic',
        tier: 'ULTRA',
    },
    {
        id: 'anthropic/claude-haiku-4-5',
        name: 'Fast Thinking (Claude)',
        provider: 'anthropic',
        tier: 'PRO',
    },
    {
        id: 'google/gemini-2.5-pro',
        name: 'Long Context (Gemini)',
        provider: 'google',
        tier: 'ULTRA',
    },
    { id: 'google/gemini-2.5-flash', name: 'Fast Gemini', provider: 'google', tier: 'PRO' },
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
        'groq/llama-4-maverick': 'groq/llama-4-scout',
        'openai/gpt-5': 'groq/llama-4-scout',
        'openai/gpt-5-mini': 'groq/llama-4-scout',
        'anthropic/claude-sonnet-4-6': 'groq/llama-4-scout',
        'anthropic/claude-opus-4-7': 'groq/llama-4-maverick',
        'anthropic/claude-haiku-4-5': 'groq/llama-4-scout',
        'google/gemini-2.5-pro': 'google/gemini-2.5-flash',
    };

    return downgrades[requestedModelId] || requestedModelId;
}

/**
 * AI Provider Registry
 * Unified interface for multiple AI providers using Vercel AI SDK.
 */

import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { breakers } from './circuit-breaker';

// Initialize providers
const openai = createOpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const anthropic = createAnthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

const google = createGoogleGenerativeAI({
    apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

/**
 * Fallback chain for AI models when circuit breakers are open
 */
const FALLBACK_CHAIN: Record<string, string[]> = {
    'openai/gpt-4o-mini': [
        'google/gemini-2.0-flash',
        'anthropic/claude-3-5-haiku-20241022',
        'groq/llama-3.1-8b-instant',
    ],
    'openai/gpt-4o': ['anthropic/claude-sonnet-4-5-20250929', 'google/gemini-2.0-flash'],
    'anthropic/claude-sonnet-4-5-20250929': ['openai/gpt-4o', 'google/gemini-2.0-flash'],
    'anthropic/claude-3-5-haiku-20241022': [
        'openai/gpt-4o-mini',
        'google/gemini-2.0-flash',
        'groq/llama-3.1-8b-instant',
    ],
    'google/gemini-2.0-flash': ['openai/gpt-4o-mini', 'groq/llama-3.1-8b-instant'],
    'groq/llama-3.1-8b-instant': ['openai/gpt-4o-mini', 'google/gemini-2.0-flash'],
};

/**
 * Get a language model by ID
 * Supports formats like "openai/gpt-4o", "anthropic/claude-sonnet-4-20250514", etc.
 */
export function getModel(modelId: string) {
    // Parse model ID format: "provider/model-name"
    const [provider, ...modelParts] = modelId.split('/');
    const modelName = modelParts.join('/');

    if (!provider || !modelName) {
        throw new Error(`Invalid model ID format: ${modelId}. Expected "provider/model-name"`);
    }

    switch (provider) {
        case 'openai':
            return openai(modelName);
        case 'anthropic':
            return anthropic(modelName);
        case 'google':
            return google(modelName);
        default:
            throw new Error(`Unknown provider: ${provider}. Supported: openai, anthropic, google`);
    }
}

/**
 * Get a language model with automatic fallback when circuit breakers are open
 * @param modelId - The requested model ID (e.g., "openai/gpt-4o-mini")
 * @returns Object containing the model and the actual model ID used (for logging/billing)
 */
export function getModelWithFallback(modelId: string): { model: any; actualModelId: string } {
    // Extract provider from modelId
    const [provider] = modelId.split('/');

    if (!provider) {
        throw new Error(`Invalid model ID format: ${modelId}. Expected "provider/model-name"`);
    }

    // Map provider name to breaker key
    const breakerKey = provider as keyof typeof breakers;

    // Check if the primary provider's circuit breaker is open
    if (breakers[breakerKey]) {
        const breakerState = breakers[breakerKey].getState();

        if (breakerState.state === 'OPEN') {
            // Primary provider is down, try fallbacks
            const fallbacks = FALLBACK_CHAIN[modelId] || [];

            for (const fallbackId of fallbacks) {
                const [fallbackProvider] = fallbackId.split('/');
                const fallbackBreakerKey = fallbackProvider as keyof typeof breakers;

                // Check if fallback provider is available
                if (breakers[fallbackBreakerKey]) {
                    const fallbackState = breakers[fallbackBreakerKey].getState();

                    if (fallbackState.state !== 'OPEN') {
                        console.warn(`[Fallback] ${modelId} unavailable, using ${fallbackId}`);
                        return {
                            model: getModel(fallbackId),
                            actualModelId: fallbackId,
                        };
                    }
                } else {
                    // Fallback provider doesn't have a breaker, use it
                    console.warn(`[Fallback] ${modelId} unavailable, using ${fallbackId}`);
                    return {
                        model: getModel(fallbackId),
                        actualModelId: fallbackId,
                    };
                }
            }

            // All fallbacks are also down
            throw new Error('All AI providers are currently unavailable');
        }
    }

    // Primary provider is available
    return {
        model: getModel(modelId),
        actualModelId: modelId,
    };
}

/**
 * Supported models configuration
 */
export const SUPPORTED_MODELS = [
    // OpenAI
    { id: 'openai/gpt-4o', name: 'GPT-4o', provider: 'openai', tier: 'PRO' },
    { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini', provider: 'openai', tier: 'STARTER' },
    { id: 'openai/o1', name: 'O1', provider: 'openai', tier: 'ULTRA' },
    { id: 'openai/o1-mini', name: 'O1 Mini', provider: 'openai', tier: 'PRO' },

    // Anthropic
    {
        id: 'anthropic/claude-sonnet-4-20250514',
        name: 'Claude Sonnet 4',
        provider: 'anthropic',
        tier: 'PRO',
    },
    {
        id: 'anthropic/claude-3-5-haiku-20241022',
        name: 'Claude 3.5 Haiku',
        provider: 'anthropic',
        tier: 'STARTER',
    },
    {
        id: 'anthropic/claude-opus-4-20250514',
        name: 'Claude Opus 4',
        provider: 'anthropic',
        tier: 'ULTRA',
    },

    // Google
    {
        id: 'google/gemini-2.0-flash',
        name: 'Gemini 2.0 Flash',
        provider: 'google',
        tier: 'STARTER',
    },
    {
        id: 'google/gemini-2.5-pro-preview-05-06',
        name: 'Gemini 2.5 Pro',
        provider: 'google',
        tier: 'PRO',
    },
] as const;

export type SupportedModelId = (typeof SUPPORTED_MODELS)[number]['id'];

/**
 * Get models available for a specific tier
 */
export function getModelsForTier(tier: 'FREE' | 'STARTER' | 'PRO' | 'ULTRA') {
    const tierOrder = { FREE: 0, STARTER: 1, PRO: 2, ULTRA: 3 };
    const userTierLevel = tierOrder[tier];

    // FREE tier only gets gpt-4o-mini and gemini-flash
    if (tier === 'FREE') {
        return SUPPORTED_MODELS.filter((model) =>
            ['openai/gpt-4o-mini', 'google/gemini-2.0-flash'].includes(model.id)
        );
    }

    return SUPPORTED_MODELS.filter((model) => {
        const modelTierLevel = tierOrder[model.tier as keyof typeof tierOrder] ?? 1;
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
 * @param requestedModelId - The model the user requested
 * @param userMessage - The user's message content
 * @returns Model ID to actually use (downgraded if appropriate)
 */
export function getSmartModelId(requestedModelId: string, userMessage: string): string {
    // Only downgrade for short, simple messages
    if (userMessage.length >= 50) {
        return requestedModelId;
    }

    // Simple pattern matching for greetings, acknowledgments, single words
    const simplePatterns =
        /^(hi|hello|hey|thanks|thank you|ok|okay|yes|no|sure|yep|nope|cool|great|nice|good|bye|goodbye|k)$/i;

    if (!simplePatterns.test(userMessage.trim())) {
        return requestedModelId;
    }

    // Downgrade map for simple queries
    const downgrades: Record<string, string> = {
        'openai/gpt-4o': 'openai/gpt-4o-mini',
        'anthropic/claude-sonnet-4-20250514': 'anthropic/claude-3-5-haiku-20241022',
        'anthropic/claude-opus-4-20250514': 'anthropic/claude-sonnet-4-20250514',
        'google/gemini-2.5-pro-preview-05-06': 'google/gemini-2.0-flash',
    };

    return downgrades[requestedModelId] || requestedModelId;
}

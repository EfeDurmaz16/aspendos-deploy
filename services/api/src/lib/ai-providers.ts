/**
 * AI Provider Registry
 * Unified interface for multiple AI providers using Vercel AI SDK.
 */

import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';

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

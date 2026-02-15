/**
 * YULA AI Provider Registry
 *
 * Unified AI provider configuration using Vercel AI Gateway.
 * ALL AI generation routes through the gateway — no individual API keys needed.
 */

import { gateway } from 'ai';

// ============================================
// MODEL REGISTRY
// ============================================

export type ModelId =
    // OpenAI
    | 'gpt-4o'
    | 'gpt-4o-mini'
    | 'gpt-4-turbo'
    | 'gpt-3.5-turbo'
    // Anthropic
    | 'claude-3-5-sonnet-20241022'
    | 'claude-3-haiku-20240307'
    | 'claude-3-opus-20240229'
    // Google
    | 'gemini-2.0-flash'
    | 'gemini-2.5-pro-preview-05-06'
    // Groq (Fast)
    | 'llama-3.1-70b-versatile'
    | 'llama-3.1-8b-instant'
    | 'llama3-8b-8192'
    | 'mixtral-8x7b-32768';

export type ProviderType = 'openai' | 'anthropic' | 'google' | 'groq';

export interface ModelConfig {
    id: ModelId;
    provider: ProviderType;
    displayName: string;
    contextWindow: number;
    isRouter?: boolean;
    isFast?: boolean;
}

/**
 * Comprehensive model registry with metadata
 */
export const MODEL_REGISTRY: Record<ModelId, ModelConfig> = {
    // OpenAI Models
    'gpt-4o': {
        id: 'gpt-4o',
        provider: 'openai',
        displayName: 'GPT-4o',
        contextWindow: 128000,
    },
    'gpt-4o-mini': {
        id: 'gpt-4o-mini',
        provider: 'openai',
        displayName: 'GPT-4o Mini',
        contextWindow: 128000,
        isFast: true,
    },
    'gpt-4-turbo': {
        id: 'gpt-4-turbo',
        provider: 'openai',
        displayName: 'GPT-4 Turbo',
        contextWindow: 128000,
    },
    'gpt-3.5-turbo': {
        id: 'gpt-3.5-turbo',
        provider: 'openai',
        displayName: 'GPT-3.5 Turbo',
        contextWindow: 16385,
        isFast: true,
    },

    // Anthropic Models
    'claude-3-5-sonnet-20241022': {
        id: 'claude-3-5-sonnet-20241022',
        provider: 'anthropic',
        displayName: 'Claude 3.5 Sonnet',
        contextWindow: 200000,
    },
    'claude-3-haiku-20240307': {
        id: 'claude-3-haiku-20240307',
        provider: 'anthropic',
        displayName: 'Claude 3 Haiku',
        contextWindow: 200000,
        isFast: true,
    },
    'claude-3-opus-20240229': {
        id: 'claude-3-opus-20240229',
        provider: 'anthropic',
        displayName: 'Claude 3 Opus',
        contextWindow: 200000,
    },

    // Google Models
    'gemini-2.0-flash': {
        id: 'gemini-2.0-flash',
        provider: 'google',
        displayName: 'Gemini 2.0 Flash',
        contextWindow: 1000000,
        isFast: true,
    },
    'gemini-2.5-pro-preview-05-06': {
        id: 'gemini-2.5-pro-preview-05-06',
        provider: 'google',
        displayName: 'Gemini 2.5 Pro',
        contextWindow: 1000000,
    },

    // Groq Models (Fast inference)
    'llama-3.1-70b-versatile': {
        id: 'llama-3.1-70b-versatile',
        provider: 'groq',
        displayName: 'Llama 3.1 70B',
        contextWindow: 128000,
    },
    'llama-3.1-8b-instant': {
        id: 'llama-3.1-8b-instant',
        provider: 'groq',
        displayName: 'Llama 3.1 8B',
        contextWindow: 128000,
        isFast: true,
        isRouter: true,
    },
    'llama3-8b-8192': {
        id: 'llama3-8b-8192',
        provider: 'groq',
        displayName: 'Llama 3 8B',
        contextWindow: 8192,
        isFast: true,
    },
    'mixtral-8x7b-32768': {
        id: 'mixtral-8x7b-32768',
        provider: 'groq',
        displayName: 'Mixtral 8x7B',
        contextWindow: 32768,
    },
};

// ============================================
// MODEL RESOLUTION (via Vercel AI Gateway)
// ============================================

/**
 * Get the Vercel AI SDK model instance for a given model ID.
 * All models are routed through the Vercel AI Gateway.
 */
export function getModel(modelId: ModelId | string) {
    const config = MODEL_REGISTRY[modelId as ModelId];

    if (!config) {
        console.warn(`[AI] Unknown model: ${modelId}, defaulting to openai/gpt-4o-mini`);
        return gateway('openai/gpt-4o-mini');
    }

    return gateway(`${config.provider}/${config.id}`);
}

/**
 * Get the router model (fast Groq Llama for decision making)
 */
export function getRouterModel() {
    return gateway('groq/llama-3.1-8b-instant');
}

/**
 * Get the fallback router model
 */
export function getFallbackRouterModel() {
    return gateway('groq/llama3-8b-8192');
}

// ============================================
// FALLBACK CHAINS
// ============================================

/**
 * Fallback chain for each model - used when primary fails
 */
export const FALLBACK_CHAIN: Record<string, ModelId[]> = {
    'gpt-4o': ['claude-3-5-sonnet-20241022', 'gemini-2.5-pro-preview-05-06'],
    'gpt-4o-mini': ['gemini-2.0-flash', 'claude-3-haiku-20240307'],
    'gpt-4-turbo': ['claude-3-5-sonnet-20241022', 'gpt-4o'],
    'gpt-3.5-turbo': ['gpt-4o-mini', 'gemini-2.0-flash'],
    'claude-3-5-sonnet-20241022': ['gpt-4o', 'gemini-2.5-pro-preview-05-06'],
    'claude-3-haiku-20240307': ['gpt-4o-mini', 'gemini-2.0-flash'],
    'claude-3-opus-20240229': ['claude-3-5-sonnet-20241022', 'gpt-4o'],
    'gemini-2.0-flash': ['gpt-4o-mini', 'claude-3-haiku-20240307'],
    'gemini-2.5-pro-preview-05-06': ['gpt-4o', 'claude-3-5-sonnet-20241022'],
    'llama-3.1-70b-versatile': ['gpt-4o', 'claude-3-5-sonnet-20241022'],
    'llama-3.1-8b-instant': ['gpt-4o-mini', 'gemini-2.0-flash'],
    'llama3-8b-8192': ['llama-3.1-8b-instant', 'gpt-4o-mini'],
    'mixtral-8x7b-32768': ['llama-3.1-70b-versatile', 'gpt-4o'],
};

/**
 * Get fallback models for a given model
 */
export function getFallbackModels(modelId: ModelId | string): ModelId[] {
    return FALLBACK_CHAIN[modelId] || ['gpt-4o-mini'];
}

// ============================================
// DEFAULT CONFIGURATIONS
// ============================================

export const DEFAULT_MODEL: ModelId = 'gpt-4o-mini';
export const DEFAULT_ROUTER_MODEL: ModelId = 'llama-3.1-8b-instant';
export const DEFAULT_CODING_MODEL: ModelId = 'claude-3-5-sonnet-20241022';
export const DEFAULT_FAST_MODEL: ModelId = 'gpt-4o-mini';

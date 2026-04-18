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
    | 'gpt-5'
    | 'gpt-5-mini'
    // Anthropic
    | 'claude-sonnet-4-6'
    | 'claude-haiku-4-5'
    | 'claude-opus-4-7'
    // Google
    | 'gemini-2.5-flash'
    | 'gemini-2.5-pro'
    // Groq (Fast) — Llama 4 family
    | 'llama-4-maverick'
    | 'llama-4-scout';

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
    'gpt-5': {
        id: 'gpt-5',
        provider: 'openai',
        displayName: 'GPT-5.4',
        contextWindow: 400000,
    },
    'gpt-5-mini': {
        id: 'gpt-5-mini',
        provider: 'openai',
        displayName: 'GPT-5.4 Mini',
        contextWindow: 400000,
        isFast: true,
    },

    // Anthropic Models
    'claude-sonnet-4-6': {
        id: 'claude-sonnet-4-6',
        provider: 'anthropic',
        displayName: 'Claude Sonnet 4.6',
        contextWindow: 200000,
    },
    'claude-haiku-4-5': {
        id: 'claude-haiku-4-5',
        provider: 'anthropic',
        displayName: 'Claude Haiku 4.5',
        contextWindow: 200000,
        isFast: true,
    },
    'claude-opus-4-7': {
        id: 'claude-opus-4-7',
        provider: 'anthropic',
        displayName: 'Claude Opus 4.7',
        contextWindow: 200000,
    },

    // Google Models
    'gemini-2.5-flash': {
        id: 'gemini-2.5-flash',
        provider: 'google',
        displayName: 'Gemini 2.5 Flash',
        contextWindow: 1000000,
        isFast: true,
    },
    'gemini-2.5-pro': {
        id: 'gemini-2.5-pro',
        provider: 'google',
        displayName: 'Gemini 2.5 Pro',
        contextWindow: 1000000,
    },

    // Groq Models (Fast inference) — Llama 4 family
    'llama-4-maverick': {
        id: 'llama-4-maverick',
        provider: 'groq',
        displayName: 'Llama 4 Maverick',
        contextWindow: 128000,
    },
    'llama-4-scout': {
        id: 'llama-4-scout',
        provider: 'groq',
        displayName: 'Llama 4 Scout',
        contextWindow: 128000,
        isFast: true,
        isRouter: true,
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
        console.warn(`[AI] Unknown model: ${modelId}, defaulting to groq/llama-4-maverick`);
        return gateway('groq/llama-4-maverick');
    }

    return gateway(`${config.provider}/${config.id}`);
}

/**
 * Get the router model (fast Groq Llama for decision making)
 */
export function getRouterModel() {
    return gateway('groq/llama-4-scout');
}

/**
 * Get the fallback router model
 */
export function getFallbackRouterModel() {
    return gateway('groq/llama-4-scout');
}

// ============================================
// FALLBACK CHAINS
// ============================================

/**
 * Fallback chain for each model - used when primary fails
 */
export const FALLBACK_CHAIN: Record<string, ModelId[]> = {
    // Groq primary - fall back within Groq ecosystem
    'llama-4-maverick': ['llama-4-scout'],
    'llama-4-scout': ['llama-4-maverick'],
    // Premium (ULTRA) - fall back to Groq
    'gpt-5': ['llama-4-maverick', 'llama-4-scout'],
    'gpt-5-mini': ['llama-4-scout', 'llama-4-maverick'],
    'claude-sonnet-4-6': ['llama-4-maverick', 'llama-4-scout'],
    'claude-haiku-4-5': ['llama-4-scout', 'llama-4-maverick'],
    'claude-opus-4-7': ['llama-4-maverick', 'llama-4-scout'],
    'gemini-2.5-flash': ['llama-4-scout', 'llama-4-maverick'],
    'gemini-2.5-pro': ['llama-4-maverick', 'llama-4-scout'],
};

/**
 * Get fallback models for a given model
 */
export function getFallbackModels(modelId: ModelId | string): ModelId[] {
    return FALLBACK_CHAIN[modelId] || ['llama-4-scout'];
}

// ============================================
// DEFAULT CONFIGURATIONS
// ============================================

export const DEFAULT_MODEL: ModelId = 'llama-4-maverick';
export const DEFAULT_ROUTER_MODEL: ModelId = 'llama-4-scout';
export const DEFAULT_CODING_MODEL: ModelId = 'claude-sonnet-4-6';
export const DEFAULT_FAST_MODEL: ModelId = 'llama-4-scout';

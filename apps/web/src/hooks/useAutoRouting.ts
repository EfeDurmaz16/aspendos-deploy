'use client';

import { useCallback, useState } from 'react';

// ============================================
// TYPES
// ============================================

export interface ModelInfo {
    id: string;
    name: string;
    provider: 'openai' | 'anthropic' | 'google' | 'mistral';
    contextWindow: number;
    maxOutput: number;
    inputCost: number; // $ per 1M tokens
    outputCost: number; // $ per 1M tokens
    capabilities: ('text' | 'vision' | 'function_calling' | 'streaming')[];
}

export interface RoutingResult {
    model: string;
    reasoning: string;
    confidence: number;
    fallback?: string;
}

interface AutoRoutingState {
    isRouting: boolean;
    lastResult: RoutingResult | null;
    error: string | null;
}

// ============================================
// MODEL REGISTRY
// ============================================

const MODEL_REGISTRY: ModelInfo[] = [
    {
        id: 'gpt-5',
        name: 'GPT-5.4',
        provider: 'openai',
        contextWindow: 400000,
        maxOutput: 16384,
        inputCost: 2.5,
        outputCost: 10.0,
        capabilities: ['text', 'vision', 'function_calling', 'streaming'],
    },
    {
        id: 'gpt-5-mini',
        name: 'GPT-5.4 Mini',
        provider: 'openai',
        contextWindow: 400000,
        maxOutput: 16384,
        inputCost: 0.15,
        outputCost: 0.6,
        capabilities: ['text', 'vision', 'function_calling', 'streaming'],
    },
    {
        id: 'claude-sonnet-4-6',
        name: 'Claude Sonnet 4.6',
        provider: 'anthropic',
        contextWindow: 200000,
        maxOutput: 8192,
        inputCost: 3.0,
        outputCost: 15.0,
        capabilities: ['text', 'vision', 'streaming'],
    },
    {
        id: 'claude-haiku-4-5',
        name: 'Claude Haiku 4.5',
        provider: 'anthropic',
        contextWindow: 200000,
        maxOutput: 8192,
        inputCost: 0.8,
        outputCost: 4.0,
        capabilities: ['text', 'vision', 'streaming'],
    },
    {
        id: 'gemini-3-flash-preview',
        name: 'Gemini 3 Flash',
        provider: 'google',
        contextWindow: 1000000,
        maxOutput: 8192,
        inputCost: 0.075,
        outputCost: 0.3,
        capabilities: ['text', 'vision', 'streaming'],
    },
];

// ============================================
// ROUTING LOGIC
// ============================================

interface TaskAnalysis {
    complexity: 'simple' | 'medium' | 'complex';
    requiresVision: boolean;
    requiresLongContext: boolean;
    estimatedTokens: number;
}

function analyzeTask(message: string): TaskAnalysis {
    const wordCount = message.split(/\s+/).length;
    const hasCode = /```|`[^`]+`|function|class|const|let|var/.test(message);
    const hasComplexMath = /\$\$.*\$\$|\\\[.*\\\]|\\frac|\\sum|\\int/.test(message);
    const hasLongContext = wordCount > 500;

    let complexity: 'simple' | 'medium' | 'complex' = 'simple';
    if (hasCode || hasComplexMath || wordCount > 200) {
        complexity = 'medium';
    }
    if (hasCode && hasComplexMath) {
        complexity = 'complex';
    }
    if (wordCount > 1000 || message.includes('analyze') || message.includes('explain in detail')) {
        complexity = 'complex';
    }

    return {
        complexity,
        requiresVision: false, // Would check for image attachments
        requiresLongContext: hasLongContext,
        estimatedTokens: Math.ceil(wordCount * 1.3), // Rough estimate
    };
}

function selectModel(analysis: TaskAnalysis, tier: 'STARTER' | 'PRO' | 'ULTRA'): RoutingResult {
    // Simple tasks → cheap models
    if (analysis.complexity === 'simple') {
        if (tier === 'STARTER') {
            return {
                model: 'gpt-5-mini',
                reasoning: 'Simple task, using cost-effective model',
                confidence: 0.9,
                fallback: 'gemini-3-flash-preview',
            };
        }
        return {
            model: 'gemini-3-flash-preview',
            reasoning: 'Simple task, using fast and cheap Gemini Flash',
            confidence: 0.95,
            fallback: 'gpt-5-mini',
        };
    }

    // Long context → Gemini
    if (analysis.requiresLongContext) {
        return {
            model: 'gemini-3-flash-preview',
            reasoning: 'Long context required, Gemini has 1M context window',
            confidence: 0.85,
            fallback: 'claude-sonnet-4-6',
        };
    }

    // Complex tasks → powerful models
    if (analysis.complexity === 'complex') {
        if (tier === 'ULTRA') {
            return {
                model: 'claude-sonnet-4-6',
                reasoning: 'Complex task, using Claude Sonnet for best reasoning',
                confidence: 0.88,
                fallback: 'gpt-5',
            };
        }
        return {
            model: 'gpt-5',
            reasoning: 'Complex task, using GPT-5 for balanced performance',
            confidence: 0.85,
            fallback: 'claude-sonnet-4-6',
        };
    }

    // Medium complexity → balanced choice
    if (tier === 'STARTER') {
        return {
            model: 'gpt-5-mini',
            reasoning: 'Medium complexity on Starter tier, using GPT-5 Mini',
            confidence: 0.8,
            fallback: 'gemini-3-flash-preview',
        };
    }

    return {
        model: 'claude-haiku-4-5',
        reasoning: 'Medium complexity, using Claude Haiku for fast response',
        confidence: 0.82,
        fallback: 'gpt-5-mini',
    };
}

// ============================================
// HOOK
// ============================================

export interface UseAutoRoutingOptions {
    tier?: 'STARTER' | 'PRO' | 'ULTRA';
    defaultModel?: string;
}

/**
 * useAutoRouting - Automatically selects best model based on task
 *
 * Rewritten from omnix with cleaner logic and no external dependencies.
 */
export function useAutoRouting(options: UseAutoRoutingOptions = {}) {
    const { tier = 'PRO', defaultModel = 'gpt-5' } = options;

    const [state, setState] = useState<AutoRoutingState>({
        isRouting: false,
        lastResult: null,
        error: null,
    });

    // Route a message to the best model
    const routeMessage = useCallback(
        async (message: string): Promise<RoutingResult> => {
            setState((prev) => ({ ...prev, isRouting: true, error: null }));

            try {
                const analysis = analyzeTask(message);
                const result = selectModel(analysis, tier);

                setState((prev) => ({
                    ...prev,
                    isRouting: false,
                    lastResult: result,
                }));

                return result;
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Routing failed';
                setState((prev) => ({
                    ...prev,
                    isRouting: false,
                    error: errorMessage,
                }));

                // Return default model on error
                return {
                    model: defaultModel,
                    reasoning: 'Error during routing, using default model',
                    confidence: 0.5,
                };
            }
        },
        [tier, defaultModel]
    );

    // Get model info
    const getModelInfo = useCallback((modelId: string): ModelInfo | undefined => {
        return MODEL_REGISTRY.find((m) => m.id === modelId);
    }, []);

    // Get all available models for tier
    const getAvailableModels = useCallback((): ModelInfo[] => {
        if (tier === 'STARTER') {
            return MODEL_REGISTRY.filter(
                (m) => m.id === 'gpt-5-mini' || m.id === 'gemini-3-flash-preview'
            );
        }
        return MODEL_REGISTRY;
    }, [tier]);

    // Estimate cost for a message
    const estimateCost = useCallback(
        (
            message: string,
            modelId: string
        ): { inputCost: number; outputCost: number; total: number } => {
            const model = MODEL_REGISTRY.find((m) => m.id === modelId);
            if (!model) return { inputCost: 0, outputCost: 0, total: 0 };

            const wordCount = message.split(/\s+/).length;
            const inputTokens = Math.ceil(wordCount * 1.3);
            const outputTokens = Math.min(inputTokens * 2, model.maxOutput); // Estimate

            const inputCost = (inputTokens / 1_000_000) * model.inputCost;
            const outputCost = (outputTokens / 1_000_000) * model.outputCost;

            return {
                inputCost,
                outputCost,
                total: inputCost + outputCost,
            };
        },
        []
    );

    return {
        // State
        isRouting: state.isRouting,
        lastResult: state.lastResult,
        error: state.error,

        // Actions
        routeMessage,
        getModelInfo,
        getAvailableModels,
        estimateCost,

        // Data
        models: MODEL_REGISTRY,
    };
}

export default useAutoRouting;

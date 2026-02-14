/**
 * Local AI Service - WebLLM for Offline Inference
 *
 * Provides:
 * - Local model loading and management
 * - Streaming chat completions
 * - Offline-capable AI responses
 *
 * Uses @mlc-ai/web-llm for running LLMs in the browser via WebGPU.
 */

import type { ChatCompletionMessageParam } from '@mlc-ai/web-llm';

// ============================================
// TYPES
// ============================================

export interface LocalAIConfig {
    modelId: string;
    maxTokens?: number;
    temperature?: number;
}

export interface ModelLoadProgress {
    progress: number;
    text: string;
    timeElapsed?: number;
}

export type ProgressCallback = (progress: ModelLoadProgress) => void;

// Available models optimized for browser use
export const AVAILABLE_MODELS = [
    {
        id: 'Llama-3.2-1B-Instruct-q4f16_1-MLC',
        name: 'Llama 3.2 1B (Recommended)',
        size: '~700MB',
        description: 'Fast and efficient, great for general tasks',
    },
    {
        id: 'Llama-3.2-3B-Instruct-q4f16_1-MLC',
        name: 'Llama 3.2 3B',
        size: '~1.8GB',
        description: 'Better quality, requires more VRAM',
    },
    {
        id: 'gemma-2-2b-it-q4f16_1-MLC',
        name: 'Gemma 2 2B',
        size: '~1.2GB',
        description: "Google's efficient model",
    },
    {
        id: 'Phi-3.5-mini-instruct-q4f16_1-MLC',
        name: 'Phi 3.5 Mini',
        size: '~2.3GB',
        description: "Microsoft's reasoning model",
    },
] as const;

export type ModelId = (typeof AVAILABLE_MODELS)[number]['id'];

// ============================================
// LOCAL AI SERVICE
// ============================================

class LocalAIService {
    private engine: import('@mlc-ai/web-llm').MLCEngine | null = null;
    private currentModelId: string | null = null;
    private isLoading = false;
    private loadProgress = 0;

    /**
     * Check if WebGPU is supported
     */
    async isSupported(): Promise<boolean> {
        if (typeof navigator === 'undefined') return false;
        if (!('gpu' in navigator)) return false;

        try {
            const gpu = (navigator as Navigator & { gpu?: { requestAdapter(): Promise<unknown> } })
                .gpu;
            if (!gpu) return false;
            const adapter = await gpu.requestAdapter();
            return adapter !== null;
        } catch {
            return false;
        }
    }

    /**
     * Check if a model is loaded and ready
     */
    isReady(): boolean {
        return this.engine !== null && this.currentModelId !== null;
    }

    /**
     * Get current loading state
     */
    getLoadingState(): { isLoading: boolean; progress: number; modelId: string | null } {
        return {
            isLoading: this.isLoading,
            progress: this.loadProgress,
            modelId: this.currentModelId,
        };
    }

    /**
     * Load a model for local inference
     */
    async loadModel(modelId: ModelId, onProgress?: ProgressCallback): Promise<void> {
        if (this.isLoading) {
            throw new Error('Model loading already in progress');
        }

        if (this.currentModelId === modelId && this.engine) {
            return; // Already loaded
        }

        this.isLoading = true;
        this.loadProgress = 0;

        try {
            // Dynamically import WebLLM (only when needed)
            const { CreateMLCEngine } = await import('@mlc-ai/web-llm');

            // Create engine with progress callback
            this.engine = await CreateMLCEngine(modelId, {
                initProgressCallback: (report) => {
                    this.loadProgress = report.progress * 100;
                    onProgress?.({
                        progress: this.loadProgress,
                        text: report.text,
                        timeElapsed: report.timeElapsed,
                    });
                },
            });

            this.currentModelId = modelId;
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Unload the current model
     */
    async unloadModel(): Promise<void> {
        if (this.engine) {
            await this.engine.unload();
            this.engine = null;
            this.currentModelId = null;
        }
    }

    /**
     * Generate a chat completion (non-streaming)
     */
    async chat(
        messages: ChatCompletionMessageParam[],
        config?: Partial<LocalAIConfig>
    ): Promise<string> {
        if (!this.engine) {
            throw new Error('No model loaded. Call loadModel() first.');
        }

        const response = await this.engine.chat.completions.create({
            messages,
            max_tokens: config?.maxTokens || 512,
            temperature: config?.temperature || 0.7,
            stream: false,
        });

        return response.choices[0]?.message?.content || '';
    }

    /**
     * Generate a streaming chat completion
     */
    async *chatStream(
        messages: ChatCompletionMessageParam[],
        config?: Partial<LocalAIConfig>
    ): AsyncGenerator<string, void, unknown> {
        if (!this.engine) {
            throw new Error('No model loaded. Call loadModel() first.');
        }

        const stream = await this.engine.chat.completions.create({
            messages,
            max_tokens: config?.maxTokens || 512,
            temperature: config?.temperature || 0.7,
            stream: true,
        });

        for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content;
            if (content) {
                yield content;
            }
        }
    }

    /**
     * Get model statistics
     */
    async getStats(): Promise<{
        tokensGenerated: number;
        tokensPerSecond: number;
    } | null> {
        if (!this.engine) return null;

        const stats = await this.engine.runtimeStatsText();
        // Parse stats text to extract values
        const tpsMatch = stats.match(/(\d+\.?\d*)\s*tok\/s/);
        const tokensMatch = stats.match(/(\d+)\s*tokens/);

        return {
            tokensGenerated: tokensMatch ? parseInt(tokensMatch[1], 10) : 0,
            tokensPerSecond: tpsMatch ? parseFloat(tpsMatch[1]) : 0,
        };
    }
}

// Singleton instance
export const localAI = new LocalAIService();

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Format messages for the local model
 */
export function formatMessagesForLocalModel(
    messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
    systemPrompt?: string
): ChatCompletionMessageParam[] {
    const formatted: ChatCompletionMessageParam[] = [];

    // Add system prompt if provided
    if (systemPrompt) {
        formatted.push({
            role: 'system',
            content: systemPrompt,
        });
    }

    // Add conversation messages
    for (const msg of messages) {
        formatted.push({
            role: msg.role,
            content: msg.content,
        });
    }

    return formatted;
}

/**
 * Get default system prompt for offline mode
 */
export function getOfflineSystemPrompt(): string {
    return `You are Yula, a helpful assistant running locally on the user's device.
You are currently in offline mode, which means:
- You cannot access the internet or external APIs
- You cannot access the user's full memory database
- Your knowledge is limited to your training data

Be helpful, concise, and honest about your limitations when appropriate.
If asked about something you cannot do offline, explain what would be available when online.`;
}

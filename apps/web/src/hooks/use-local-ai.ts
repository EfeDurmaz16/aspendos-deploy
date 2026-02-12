'use client';

import { useCallback, useEffect, useState } from 'react';
import { getSetting, setSetting } from '@/lib/offline/database';
import {
    AVAILABLE_MODELS,
    formatMessagesForLocalModel,
    getOfflineSystemPrompt,
    localAI,
    type ModelId,
    type ModelLoadProgress,
} from '@/lib/offline/local-ai';

export interface LocalAIState {
    isSupported: boolean;
    isLoading: boolean;
    isReady: boolean;
    loadProgress: number;
    loadingText: string;
    currentModel: ModelId | null;
    error: string | null;
}

/**
 * Hook for local AI functionality
 *
 * Provides:
 * - Model loading with progress
 * - Chat completion (streaming and non-streaming)
 * - Automatic model persistence
 */
export function useLocalAI() {
    const [state, setState] = useState<LocalAIState>({
        isSupported: false,
        isLoading: false,
        isReady: false,
        loadProgress: 0,
        loadingText: '',
        currentModel: null,
        error: null,
    });

    // Load a model
    const loadModel = useCallback(async (modelId: ModelId) => {
        setState((prev) => ({
            ...prev,
            isLoading: true,
            loadProgress: 0,
            loadingText: 'Initializing...',
            error: null,
        }));

        try {
            await localAI.loadModel(modelId, (progress: ModelLoadProgress) => {
                setState((prev) => ({
                    ...prev,
                    loadProgress: progress.progress,
                    loadingText: progress.text,
                }));
            });

            // Save model choice for persistence
            await setSetting('localAIModel', modelId);

            setState((prev) => ({
                ...prev,
                isLoading: false,
                isReady: true,
                currentModel: modelId,
            }));
        } catch (error) {
            setState((prev) => ({
                ...prev,
                isLoading: false,
                isReady: false,
                error: error instanceof Error ? error.message : 'Failed to load model',
            }));
        }
    }, []);

    // Check WebGPU support on mount
    useEffect(() => {
        localAI.isSupported().then((supported) => {
            setState((prev) => ({ ...prev, isSupported: supported }));

            // If supported, check for previously loaded model
            if (supported) {
                getSetting<ModelId>('localAIModel').then((savedModel) => {
                    if (savedModel) {
                        loadModel(savedModel);
                    }
                });
            }
        });
    }, [loadModel]);

    // Unload the current model
    const unloadModel = useCallback(async () => {
        await localAI.unloadModel();
        await setSetting('localAIModel', null);

        setState((prev) => ({
            ...prev,
            isReady: false,
            currentModel: null,
        }));
    }, []);

    // Chat completion (non-streaming)
    const chat = useCallback(
        async (
            messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
            options?: { maxTokens?: number; temperature?: number }
        ): Promise<string> => {
            if (!state.isReady) {
                throw new Error('Local AI not ready');
            }

            const formattedMessages = formatMessagesForLocalModel(
                messages,
                getOfflineSystemPrompt()
            );

            return localAI.chat(formattedMessages, options);
        },
        [state.isReady]
    );

    // Streaming chat completion
    const chatStream = useCallback(
        async function* (
            messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
            options?: { maxTokens?: number; temperature?: number }
        ): AsyncGenerator<string, void, unknown> {
            if (!state.isReady) {
                throw new Error('Local AI not ready');
            }

            const formattedMessages = formatMessagesForLocalModel(
                messages,
                getOfflineSystemPrompt()
            );

            yield* localAI.chatStream(formattedMessages, options);
        },
        [state.isReady]
    );

    return {
        ...state,
        availableModels: AVAILABLE_MODELS,
        loadModel,
        unloadModel,
        chat,
        chatStream,
    };
}

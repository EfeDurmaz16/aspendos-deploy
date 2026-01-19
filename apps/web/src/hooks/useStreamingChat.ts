'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useCallback, useMemo, useState } from 'react';

// ============================================
// TYPES (preserved for backwards compatibility)
// ============================================

export interface MemoryUsed {
    id: string;
    content?: string;
    sector: string;
    confidence: number;
}

export interface MemoryDecision {
    queryType: string;
    useMemory: boolean;
    sectors: string[];
    reasoning: string;
}

export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    streaming?: boolean;
    error?: string;
    decision?: MemoryDecision;
    memoriesUsed?: MemoryUsed[];
    metadata?: {
        model?: string;
        tokensIn?: number;
        tokensOut?: number;
        costUsd?: number;
    };
}

export interface StreamChunk {
    type: 'text' | 'memory_context' | 'error' | 'done' | 'decision' | 'memories_used';
    content?: string;
    metadata?: Record<string, unknown>;
    queryType?: string;
    useMemory?: boolean;
    sectors?: string[];
    reasoning?: string;
    memories?: MemoryUsed[];
}

export interface StreamingOptions {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    onChunk?: (chunk: StreamChunk) => void;
    onError?: (error: string) => void;
    onComplete?: (message: ChatMessage) => void;
}

// ============================================
// HOOK - Uses @ai-sdk/react v5.0 useChat
// ============================================

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

/**
 * useStreamingChat - Handles streaming chat using Vercel AI SDK v5.0
 *
 * Wrapper around @ai-sdk/react useChat for backwards compatibility
 * with existing Aspendos components.
 */
export function useStreamingChat(chatId: string) {
    // Manage input state manually (required in AI SDK v5.0)
    const [input, setInput] = useState('');

    // Track memory decision and memories (fetched separately or from stream)
    const [currentDecision, setCurrentDecision] = useState<MemoryDecision | null>(null);
    const [currentMemories, setCurrentMemories] = useState<MemoryUsed[]>([]);
    const [_selectedModel, setSelectedModel] = useState('openai/gpt-4o-mini');

    // Track the actual chat ID (might be different from param if param is "new")
    const [actualChatId, setActualChatId] = useState<string>(chatId);

    // Create transport with memoization
    const transport = useMemo(
        () =>
            new DefaultChatTransport({
                api: `${API_BASE}/api/chat/${actualChatId}/message`,
                headers: {
                    'Content-Type': 'application/json',
                },
            }),
        [actualChatId]
    );

    const {
        messages: aiMessages,
        sendMessage: aiSendMessage,
        stop,
        status,
        error,
    } = useChat({
        id: actualChatId,
        transport,
        onError: (err: Error) => {
            console.error('[useStreamingChat] Error:', err);
        },
    });

    // Determine streaming state from status
    const isStreaming = status === 'streaming' || status === 'submitted';

    // Convert AI SDK messages to our format
    const messages: ChatMessage[] = aiMessages.map((msg) => {
        // Extract text content from message parts
        let textContent = '';
        if (msg.parts) {
            for (const part of msg.parts) {
                if (part.type === 'text') {
                    textContent += part.text;
                }
            }
        }

        return {
            id: msg.id,
            role: msg.role as 'user' | 'assistant',
            content: textContent,
            timestamp: new Date(),
            streaming:
                isStreaming &&
                msg.role === 'assistant' &&
                msg === aiMessages[aiMessages.length - 1],
            decision: msg.role === 'assistant' ? currentDecision || undefined : undefined,
            memoriesUsed: msg.role === 'assistant' ? currentMemories : undefined,
        };
    });

    // Send message function (backwards compatible)
    const sendMessage = useCallback(
        async (content: string, options: StreamingOptions = {}): Promise<ChatMessage | null> => {
            const { model = 'openai/gpt-4o-mini', onError } = options;

            try {
                // Reset decision state for new message
                setCurrentDecision(null);
                setCurrentMemories([]);
                setSelectedModel(model);

                // If chatId is "new", create the chat first
                if (chatId === 'new' && actualChatId === 'new') {
                    try {
                        const res = await fetch(`${API_BASE}/api/chat`, {
                            method: 'POST',
                            credentials: 'include',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ title: 'New Chat' }),
                        });

                        if (!res.ok) {
                            throw new Error('Failed to create chat');
                        }

                        const newChat = await res.json();
                        const newChatId = newChat.id;

                        // Update the actual chat ID
                        setActualChatId(newChatId);

                        // Update the URL without page reload
                        if (typeof window !== 'undefined') {
                            window.history.replaceState(null, '', `/chat/${newChatId}`);
                        }

                        // Wait for transport to update with new chat ID
                        // The transport will be recreated due to actualChatId change
                        await new Promise((resolve) => setTimeout(resolve, 100));
                    } catch (err) {
                        const errorMessage =
                            err instanceof Error ? err.message : 'Failed to create chat';
                        onError?.(errorMessage);
                        return null;
                    }
                }

                // Use sendMessage with text parameter (AI SDK v5.0)
                // Custom data goes in body, not data
                await aiSendMessage(
                    {
                        text: content,
                    },
                    {
                        body: {
                            model_id: model,
                        },
                    }
                );

                // Clear input after sending
                setInput('');

                // Return null - components should use the messages array
                return null;
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : 'Unknown error';
                onError?.(errorMessage);
                return null;
            }
        },
        [aiSendMessage, chatId, actualChatId]
    );

    // Stop streaming
    const stopStreaming = useCallback(() => {
        stop();
    }, [stop]);

    // Clear messages (local state only - doesn't affect server)
    const clearMessages = useCallback(() => {
        // Note: AI SDK useChat doesn't have a clear method by default
        // This would need to be handled at the app level by creating a new chat
        console.log('[useStreamingChat] clearMessages called - create new chat to clear');
    }, []);

    // Load messages from API (for initial load)
    const loadMessages = useCallback((serverMessages: ChatMessage[]) => {
        // AI SDK manages its own message state
        // This is mainly for compatibility - messages come from the chat endpoint
        console.log(
            '[useStreamingChat] loadMessages called with',
            serverMessages.length,
            'messages'
        );
    }, []);

    // Retry last message
    const retryLastMessage = useCallback(
        async (options?: StreamingOptions) => {
            // Find the last user message and resend it
            const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user');
            if (lastUserMessage) {
                return sendMessage(lastUserMessage.content, options);
            }
            return null;
        },
        [messages, sendMessage]
    );

    return {
        // State
        messages,
        isStreaming,
        error: error?.message || null,
        currentStreamingId: isStreaming ? aiMessages[aiMessages.length - 1]?.id : null,
        status,

        // Decision/Memory metadata
        currentDecision,
        currentMemories,

        // Actions
        sendMessage,
        stopStreaming,
        clearMessages,
        loadMessages,
        retryLastMessage,

        // Input state (manually managed in v5.0)
        input,
        setInput,
    };
}

export default useStreamingChat;

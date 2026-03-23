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

export interface ToolCallPart {
    id: string;
    name: string;
    args: Record<string, unknown>;
    state: string;
    output?: unknown;
    approval?: { approved: boolean };
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
    toolCalls?: ToolCallPart[];
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
    const [_selectedModel, setSelectedModel] = useState<string | undefined>(undefined);

    // Track the actual chat ID (might be different from param if param is "new")
    const [actualChatId, setActualChatId] = useState<string>(chatId);

    // Create transport with memoization
    const transport = useMemo(
        () =>
            new DefaultChatTransport({
                api: `${API_BASE}/api/chat/${actualChatId}/stream`,
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
            }),
        [actualChatId]
    );

    const {
        messages: aiMessages,
        sendMessage: aiSendMessage,
        addToolApprovalResponse,
        stop,
        status,
        error,
    } = useChat({
        id: actualChatId,
        transport,
        // Auto-resubmit after tool approvals are responded to
        sendAutomaticallyWhen: ({ messages: msgs }) => {
            const lastMsg = msgs.at(-1);
            return (
                lastMsg?.parts?.some(
                    (part: any) =>
                        'state' in part &&
                        part.state === 'approval-responded' &&
                        part.approval?.approved === true
                ) ?? false
            );
        },
        onError: (err: Error) => {
            console.error('[useStreamingChat] Error:', err);
        },
    });

    // Determine streaming state from status
    const isStreaming = status === 'streaming' || status === 'submitted';

    // Convert AI SDK messages to our format (preserving tool parts)
    const messages: ChatMessage[] = aiMessages.map((msg) => {
        let textContent = '';
        const toolCalls: Array<{
            id: string;
            name: string;
            args: Record<string, unknown>;
            state: string;
            output?: unknown;
            approval?: { approved: boolean };
        }> = [];

        if (msg.parts) {
            for (const part of msg.parts) {
                if (part.type === 'text') {
                    textContent += part.text;
                } else if ('toolName' in part) {
                    const p = part as any;
                    toolCalls.push({
                        id: p.toolCallId || p.id || '',
                        name: p.toolName || '',
                        args: p.args || {},
                        state: p.state || 'input-available',
                        output: p.output,
                        approval: p.approval,
                    });
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
            toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        };
    });

    // Send message function (backwards compatible)
    const sendMessage = useCallback(
        async (content: string, options: StreamingOptions = {}): Promise<ChatMessage | null> => {
            const { model, onError } = options;

            try {
                // Reset decision state for new message
                setCurrentDecision(null);
                setCurrentMemories([]);
                setSelectedModel(model || undefined);

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

                        // Update the actual chat ID and URL
                        setActualChatId(newChatId);
                        if (typeof window !== 'undefined') {
                            window.history.replaceState(null, '', `/chat/${newChatId}`);
                        }

                        // Return early - the sendMessage will be called again
                        // after transport re-initializes with the new chatId
                        return null;
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
        // Note: AI SDK useChat doesn't expose a clear method.
        // Callers should create a new chat/session if they want a blank state.
    }, []);

    // Load messages from API (for initial load)
    const loadMessages = useCallback((_serverMessages: ChatMessage[]) => {
        // AI SDK manages its own message state
        // This is mainly for compatibility - messages come from the chat endpoint
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

    // Tool approval handler for needsApproval tools
    const handleToolApproval = useCallback(
        (toolCallId: string, approved: boolean, reason?: string) => {
            addToolApprovalResponse({ id: toolCallId, approved, reason });
        },
        [addToolApprovalResponse]
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
        handleToolApproval,

        // Input state (manually managed in v5.0)
        input,
        setInput,
    };
}

export default useStreamingChat;

'use client'

import { useState, useCallback, useRef, useEffect } from 'react'

// ============================================
// TYPES
// ============================================

export interface MemoryUsed {
    id: string
    content: string
    sector: string
    confidence: number
}

export interface MemoryDecision {
    queryType: string
    useMemory: boolean
    sectors: string[]
    reasoning: string
}

export interface ChatMessage {
    id: string
    role: 'user' | 'assistant'
    content: string
    timestamp: Date
    streaming?: boolean
    error?: string
    decision?: MemoryDecision
    memoriesUsed?: MemoryUsed[]
    metadata?: {
        model?: string
        tokensIn?: number
        tokensOut?: number
        costUsd?: number
    }
}

export interface StreamChunk {
    type: 'text' | 'memory_context' | 'error' | 'done' | 'decision' | 'memories_used'
    content?: string
    metadata?: Record<string, unknown>
    // Decision event fields
    queryType?: string
    useMemory?: boolean
    sectors?: string[]
    reasoning?: string
    // Memories event fields
    memories?: MemoryUsed[]
}

export interface StreamingOptions {
    model?: string
    temperature?: number
    maxTokens?: number
    onChunk?: (chunk: StreamChunk) => void
    onError?: (error: string) => void
    onComplete?: (message: ChatMessage) => void
}

interface StreamingState {
    messages: ChatMessage[]
    isStreaming: boolean
    error: string | null
    currentStreamingId: string | null
}

// ============================================
// HOOK
// ============================================

/**
 * useStreamingChat - Handles streaming chat with SSE
 * 
 * Rewritten from omnix with cleaner structure and no external dependencies.
 * Uses native fetch + ReadableStream for SSE parsing.
 */
export function useStreamingChat(chatId: string) {
    const [state, setState] = useState<StreamingState>({
        messages: [],
        isStreaming: false,
        error: null,
        currentStreamingId: null,
    })

    const abortControllerRef = useRef<AbortController | null>(null)
    const accumulatedContentRef = useRef<string>('')

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            abortControllerRef.current?.abort()
        }
    }, [])

    // Add message to state
    const addMessage = useCallback((message: ChatMessage) => {
        setState((prev) => ({
            ...prev,
            messages: [...prev.messages, message],
        }))
    }, [])

    // Update a specific message
    const updateMessage = useCallback((id: string, updates: Partial<ChatMessage>) => {
        setState((prev) => ({
            ...prev,
            messages: prev.messages.map((msg) =>
                msg.id === id ? { ...msg, ...updates } : msg
            ),
        }))
    }, [])

    // Parse SSE line into StreamChunk
    const parseSSELine = useCallback((line: string): StreamChunk | null => {
        if (!line.startsWith('data: ')) return null

        const data = line.slice(6).trim()
        if (data === '[DONE]') {
            return { type: 'done', content: '' }
        }

        try {
            return JSON.parse(data) as StreamChunk
        } catch {
            // Plain text chunk
            return { type: 'text', content: data }
        }
    }, [])

    // Send message with streaming response
    const sendMessage = useCallback(
        async (content: string, options: StreamingOptions = {}): Promise<ChatMessage | null> => {
            const {
                model = 'gpt-4o',
                temperature = 0.7,
                maxTokens = 4000,
                onChunk,
                onError,
                onComplete,
            } = options

            // Abort any existing request
            abortControllerRef.current?.abort()
            abortControllerRef.current = new AbortController()

            // Create user message
            const userMessage: ChatMessage = {
                id: `user_${Date.now()}`,
                role: 'user',
                content,
                timestamp: new Date(),
            }
            addMessage(userMessage)

            // Create assistant placeholder
            const assistantId = `assistant_${Date.now()}`
            const assistantMessage: ChatMessage = {
                id: assistantId,
                role: 'assistant',
                content: '',
                timestamp: new Date(),
                streaming: true,
            }
            addMessage(assistantMessage)
            accumulatedContentRef.current = ''

            setState((prev) => ({
                ...prev,
                isStreaming: true,
                error: null,
                currentStreamingId: assistantId,
            }))

            try {
                const response = await fetch('/api/chat/stream', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        message: content,
                        model,
                        chatId,
                        temperature,
                        maxTokens,
                    }),
                    signal: abortControllerRef.current.signal,
                })

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
                }

                const reader = response.body?.getReader()
                if (!reader) throw new Error('No response body')

                const decoder = new TextDecoder()
                let buffer = ''

                while (true) {
                    const { done, value } = await reader.read()
                    if (done) break

                    buffer += decoder.decode(value, { stream: true })
                    const lines = buffer.split('\n')
                    buffer = lines.pop() || ''

                    for (const line of lines) {
                        const chunk = parseSSELine(line)
                        if (!chunk) continue

                        if (chunk.type === 'error') {
                            const errorMsg = chunk.content || 'Unknown error'
                            setState((prev) => ({
                                ...prev,
                                error: errorMsg,
                                isStreaming: false,
                                currentStreamingId: null,
                            }))
                            updateMessage(assistantId, { error: errorMsg, streaming: false })
                            onError?.(errorMsg)
                            return null
                        }

                        if (chunk.type === 'done') {
                            const finalMessage: ChatMessage = {
                                ...assistantMessage,
                                content: accumulatedContentRef.current,
                                streaming: false,
                            }
                            updateMessage(assistantId, { content: accumulatedContentRef.current, streaming: false })
                            setState((prev) => ({
                                ...prev,
                                isStreaming: false,
                                currentStreamingId: null,
                            }))
                            onComplete?.(finalMessage)
                            return finalMessage
                        }

                        // Handle decision event (agentic layer transparency)
                        if (chunk.type === 'decision') {
                            updateMessage(assistantId, {
                                decision: {
                                    queryType: chunk.queryType || 'unknown',
                                    useMemory: chunk.useMemory || false,
                                    sectors: chunk.sectors || [],
                                    reasoning: chunk.reasoning || '',
                                }
                            })
                        }

                        // Handle memories used event
                        if (chunk.type === 'memories_used' && chunk.memories) {
                            updateMessage(assistantId, {
                                memoriesUsed: chunk.memories
                            })
                        }

                        if (chunk.type === 'text') {
                            accumulatedContentRef.current += chunk.content || ''
                            updateMessage(assistantId, { content: accumulatedContentRef.current })
                        }

                        onChunk?.(chunk)
                    }
                }

                // Stream ended without [DONE]
                const finalMessage: ChatMessage = {
                    ...assistantMessage,
                    content: accumulatedContentRef.current,
                    streaming: false,
                }
                updateMessage(assistantId, { content: accumulatedContentRef.current, streaming: false })
                setState((prev) => ({
                    ...prev,
                    isStreaming: false,
                    currentStreamingId: null,
                }))
                onComplete?.(finalMessage)
                return finalMessage
            } catch (error: unknown) {
                const errorMessage =
                    error instanceof Error
                        ? error.name === 'AbortError'
                            ? 'Request cancelled'
                            : error.message
                        : 'An unexpected error occurred'

                setState((prev) => ({
                    ...prev,
                    error: errorMessage,
                    isStreaming: false,
                    currentStreamingId: null,
                }))
                updateMessage(assistantId, { error: errorMessage, streaming: false })
                onError?.(errorMessage)
                return null
            }
        },
        [chatId, addMessage, updateMessage, parseSSELine]
    )

    // Stop streaming
    const stopStreaming = useCallback(() => {
        abortControllerRef.current?.abort()
        setState((prev) => {
            if (prev.currentStreamingId) {
                return {
                    ...prev,
                    isStreaming: false,
                    currentStreamingId: null,
                    messages: prev.messages.map((msg) =>
                        msg.id === prev.currentStreamingId
                            ? { ...msg, streaming: false, content: accumulatedContentRef.current }
                            : msg
                    ),
                }
            }
            return { ...prev, isStreaming: false, currentStreamingId: null }
        })
    }, [])

    // Clear all messages
    const clearMessages = useCallback(() => {
        abortControllerRef.current?.abort()
        setState({
            messages: [],
            isStreaming: false,
            error: null,
            currentStreamingId: null,
        })
    }, [])

    // Load messages from API
    const loadMessages = useCallback((messages: ChatMessage[]) => {
        setState((prev) => ({
            ...prev,
            messages: messages.map((msg) => ({ ...msg, streaming: false })),
        }))
    }, [])

    // Retry last failed message
    const retryLastMessage = useCallback(
        (options?: StreamingOptions) => {
            const lastUserMessage = state.messages.filter((m) => m.role === 'user').pop()
            if (!lastUserMessage) return Promise.resolve(null)

            // Remove failed assistant message
            setState((prev) => ({
                ...prev,
                messages: prev.messages.filter(
                    (m) => !(m.role === 'assistant' && m.error)
                ),
                error: null,
            }))

            return sendMessage(lastUserMessage.content, options)
        },
        [state.messages, sendMessage]
    )

    return {
        // State
        messages: state.messages,
        isStreaming: state.isStreaming,
        error: state.error,
        currentStreamingId: state.currentStreamingId,

        // Actions
        sendMessage,
        stopStreaming,
        clearMessages,
        loadMessages,
        retryLastMessage,
    }
}

export default useStreamingChat

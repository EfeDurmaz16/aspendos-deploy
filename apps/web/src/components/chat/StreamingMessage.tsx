'use client'

import { memo } from 'react'
import { MessageRenderer } from './MessageRenderer'
import type { ChatMessage } from '@/hooks/useStreamingChat'

// ============================================
// TYPES
// ============================================

interface StreamingMessageProps {
    message: ChatMessage
    isCurrentUser?: boolean
}

// ============================================
// COMPONENT
// ============================================

/**
 * StreamingMessage - Displays a single chat message with streaming support
 * 
 * Features:
 * - User/Assistant differentiation
 * - Streaming indicator
 * - Error display
 * - Metadata display (model, tokens, cost)
 */
function StreamingMessageComponent({ message, isCurrentUser = false }: StreamingMessageProps) {
    const isUser = message.role === 'user'

    return (
        <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
            <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 ${isUser
                        ? 'bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900'
                        : 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800'
                    }`}
            >
                {/* Error display */}
                {message.error && (
                    <div className="flex items-center gap-2 text-red-500 dark:text-red-400 mb-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-sm">{message.error}</span>
                    </div>
                )}

                {/* Message content */}
                {isUser ? (
                    <p className="whitespace-pre-wrap">{message.content}</p>
                ) : (
                    <MessageRenderer
                        content={message.content || ''}
                        streaming={message.streaming}
                    />
                )}

                {/* Metadata */}
                {message.metadata && !message.streaming && (
                    <div className="flex items-center gap-3 mt-3 pt-2 border-t border-zinc-200/20 dark:border-zinc-700/50 text-xs text-zinc-500 dark:text-zinc-500">
                        {message.metadata.model && (
                            <span className="font-mono">{message.metadata.model}</span>
                        )}
                        {message.metadata.tokensIn !== undefined && message.metadata.tokensOut !== undefined && (
                            <span>
                                {message.metadata.tokensIn} → {message.metadata.tokensOut} tokens
                            </span>
                        )}
                        {message.metadata.costUsd !== undefined && message.metadata.costUsd > 0 && (
                            <span>${message.metadata.costUsd.toFixed(4)}</span>
                        )}
                    </div>
                )}

                {/* Streaming indicator */}
                {message.streaming && !message.content && (
                    <div className="flex items-center gap-1">
                        <span className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                )}
            </div>
        </div>
    )
}

// Memoize to prevent unnecessary re-renders during streaming
export const StreamingMessage = memo(StreamingMessageComponent)
export default StreamingMessage

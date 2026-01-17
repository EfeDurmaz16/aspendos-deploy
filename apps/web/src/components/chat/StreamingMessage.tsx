'use client'

import { memo, useState, useCallback } from 'react'
import { MessageRenderer } from './MessageRenderer'
import { AudioPlayer } from './audio-player'
import type { ChatMessage } from '@/hooks/useStreamingChat'
import { ChevronDown, ChevronUp, Brain, Clock, Lightbulb, Heart, Sparkles, Copy, Check, ThumbsUp, ThumbsDown } from 'lucide-react'

// ============================================
// TYPES
// ============================================

interface MemoryUsed {
    id: string
    content: string
    sector: string
    confidence: number
}

interface StreamingMessageProps {
    message: ChatMessage & { memoriesUsed?: MemoryUsed[] }
    isCurrentUser?: boolean
    onFeedback?: (messageId: string, feedback: 'up' | 'down') => void
}

// ============================================
// MESSAGE ACTIONS (Copy, Feedback)
// ============================================

function MessageActions({
    content,
    messageId,
    onFeedback,
}: {
    content: string
    messageId: string
    onFeedback?: (messageId: string, feedback: 'up' | 'down') => void
}) {
    const [copied, setCopied] = useState(false)
    const [feedback, setFeedback] = useState<'up' | 'down' | null>(null)

    const handleCopy = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(content)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch (err) {
            console.error('Failed to copy:', err)
        }
    }, [content])

    const handleFeedback = useCallback((type: 'up' | 'down') => {
        setFeedback(type)
        onFeedback?.(messageId, type)
    }, [messageId, onFeedback])

    return (
        <div className="flex items-center gap-1 mt-2 pt-2 border-t border-zinc-200/20 dark:border-zinc-700/50">
            {/* Copy button */}
            <button
                onClick={handleCopy}
                className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                title="Copy message"
            >
                {copied ? (
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                    <Copy className="w-3.5 h-3.5" />
                )}
            </button>

            {/* Audio player for TTS */}
            <AudioPlayer text={content} className="ml-1" />

            {/* Feedback buttons */}
            <div className="flex items-center gap-0.5 ml-auto">
                <button
                    onClick={() => handleFeedback('up')}
                    className={`p-1.5 rounded-md transition-colors ${
                        feedback === 'up'
                            ? 'text-emerald-500 bg-emerald-500/10'
                            : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                    }`}
                    title="Good response"
                >
                    <ThumbsUp className="w-3.5 h-3.5" />
                </button>
                <button
                    onClick={() => handleFeedback('down')}
                    className={`p-1.5 rounded-md transition-colors ${
                        feedback === 'down'
                            ? 'text-rose-500 bg-rose-500/10'
                            : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                    }`}
                    title="Bad response"
                >
                    <ThumbsDown className="w-3.5 h-3.5" />
                </button>
            </div>
        </div>
    )
}

// Sector icon map
const SECTOR_ICONS: Record<string, React.ElementType> = {
    episodic: Clock,
    semantic: Lightbulb,
    procedural: Brain,
    emotional: Heart,
    reflective: Sparkles,
}

const SECTOR_COLORS: Record<string, string> = {
    episodic: 'text-blue-500',
    semantic: 'text-emerald-500',
    procedural: 'text-purple-500',
    emotional: 'text-rose-500',
    reflective: 'text-amber-500',
}

// ============================================
// MEMORIES USED COMPONENT
// ============================================

function MemoriesUsedSection({ memories }: { memories: MemoryUsed[] }) {
    const [isExpanded, setIsExpanded] = useState(false)

    if (!memories || memories.length === 0) return null

    return (
        <div className="mt-3 pt-2 border-t border-zinc-200/20 dark:border-zinc-700/50">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors w-full"
            >
                <Brain className="w-3.5 h-3.5" />
                <span>{memories.length} memories used</span>
                {isExpanded ? <ChevronUp className="w-3.5 h-3.5 ml-auto" /> : <ChevronDown className="w-3.5 h-3.5 ml-auto" />}
            </button>

            {isExpanded && (
                <div className="mt-2 space-y-2">
                    {memories.map((memory) => {
                        const SectorIcon = SECTOR_ICONS[memory.sector] || Brain
                        const sectorColor = SECTOR_COLORS[memory.sector] || 'text-zinc-500'

                        return (
                            <div
                                key={memory.id}
                                className="bg-zinc-100/50 dark:bg-zinc-800/50 rounded-lg p-2 text-xs"
                            >
                                <div className="flex items-center gap-2 mb-1">
                                    <SectorIcon className={`w-3 h-3 ${sectorColor}`} />
                                    <span className="uppercase tracking-wide font-medium text-zinc-600 dark:text-zinc-400">
                                        {memory.sector}
                                    </span>
                                    <span className="ml-auto font-mono text-zinc-500">
                                        {Math.round(memory.confidence * 100)}%
                                    </span>
                                </div>
                                <p className="text-zinc-700 dark:text-zinc-300 line-clamp-2">
                                    {memory.content}
                                </p>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

// ============================================
// DECISION SECTION (Agentic Transparency)
// ============================================

interface MemoryDecision {
    queryType: string
    useMemory: boolean
    sectors: string[]
    reasoning: string
}

function DecisionSection({ decision }: { decision: MemoryDecision }) {
    const [isExpanded, setIsExpanded] = useState(false)

    return (
        <div className="mt-3 pt-2 border-t border-zinc-200/20 dark:border-zinc-700/50">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors w-full"
            >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>AI Decision: {decision.queryType.replace('_', ' ')}</span>
                {decision.useMemory && (
                    <span className="ml-1 px-1.5 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded text-[10px] uppercase">
                        Memory
                    </span>
                )}
                {isExpanded ? <ChevronUp className="w-3.5 h-3.5 ml-auto" /> : <ChevronDown className="w-3.5 h-3.5 ml-auto" />}
            </button>

            {isExpanded && (
                <div className="mt-2 bg-zinc-100/50 dark:bg-zinc-800/50 rounded-lg p-2 text-xs space-y-1">
                    <p className="text-zinc-700 dark:text-zinc-300">
                        {decision.reasoning}
                    </p>
                    {decision.sectors.length > 0 && (
                        <div className="flex items-center gap-1.5 mt-2">
                            <span className="text-zinc-500">Searched:</span>
                            {decision.sectors.map((sector) => {
                                const SectorIcon = SECTOR_ICONS[sector] || Brain
                                const sectorColor = SECTOR_COLORS[sector] || 'text-zinc-500'
                                return (
                                    <span key={sector} className="flex items-center gap-0.5">
                                        <SectorIcon className={`w-3 h-3 ${sectorColor}`} />
                                        <span className="text-zinc-600 dark:text-zinc-400">{sector}</span>
                                    </span>
                                )
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
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
 * - Memories used display (collapsible)
 */
function StreamingMessageComponent({ message, isCurrentUser = false, onFeedback }: StreamingMessageProps) {
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

                {/* Memories Used */}
                {!isUser && message.memoriesUsed && message.memoriesUsed.length > 0 && !message.streaming && (
                    <MemoriesUsedSection memories={message.memoriesUsed} />
                )}

                {/* AI Decision (Agentic Transparency) */}
                {!isUser && message.decision && !message.streaming && (
                    <DecisionSection decision={message.decision} />
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

                {/* Message Actions (Copy, Feedback) - only for assistant messages when not streaming */}
                {!isUser && !message.streaming && message.content && (
                    <MessageActions
                        content={message.content}
                        messageId={message.id}
                        onFeedback={onFeedback}
                    />
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


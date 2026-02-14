'use client';

import {
    Brain,
    CaretDown,
    CaretUp,
    Check,
    Clock,
    Copy,
    Heart,
    Lightbulb,
    Sparkle,
    ThumbsDown,
    ThumbsUp,
} from '@phosphor-icons/react';
import { memo, useCallback, useState } from 'react';
import type { ChatMessage } from '@/hooks/useStreamingChat';
import { AudioPlayer } from './audio-player';
import { MessageRenderer } from './MessageRenderer';

// ============================================
// TYPES
// ============================================

interface MemoryUsed {
    id: string;
    content: string;
    sector: string;
    confidence: number;
}

interface StreamingMessageProps {
    message: ChatMessage & { memoriesUsed?: MemoryUsed[] };
    onFeedback?: (messageId: string, feedback: 'up' | 'down') => void;
}

// ============================================
// MESSAGE ACTIONS (Copy, Feedback)
// ============================================

function MessageActions({
    content,
    messageId,
    onFeedback,
}: {
    content: string;
    messageId: string;
    onFeedback?: (messageId: string, feedback: 'up' | 'down') => void;
}) {
    const [copied, setCopied] = useState(false);
    const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);

    const handleCopy = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(content);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    }, [content]);

    const handleFeedback = useCallback(
        (type: 'up' | 'down') => {
            setFeedback(type);
            onFeedback?.(messageId, type);
        },
        [messageId, onFeedback]
    );

    return (
        <div className="flex items-center gap-1 mt-2 pt-2 border-t border-border opacity-0 group-hover:opacity-100 transition-opacity">
            {/* Copy button */}
            <button
                onClick={handleCopy}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                aria-label={copied ? 'Copied to clipboard' : 'Copy message'}
            >
                {copied ? (
                    <Check
                        className="w-3.5 h-3.5 text-emerald-500"
                        weight="bold"
                        aria-hidden="true"
                    />
                ) : (
                    <Copy className="w-3.5 h-3.5" weight="duotone" aria-hidden="true" />
                )}
            </button>

            {/* Audio player for TTS */}
            <AudioPlayer text={content} className="ml-1" />

            {/* Feedback buttons */}
            <div
                className="flex items-center gap-0.5 ml-auto"
                role="group"
                aria-label="Response feedback"
            >
                <button
                    onClick={() => handleFeedback('up')}
                    className={`p-1.5 rounded-lg transition-all ${
                        feedback === 'up'
                            ? 'text-emerald-500 bg-emerald-500/15 ring-1 ring-emerald-500/30'
                            : 'text-muted-foreground hover:text-emerald-600 hover:bg-muted'
                    }`}
                    aria-label="Mark as good response"
                    aria-pressed={feedback === 'up'}
                >
                    <ThumbsUp
                        className="w-3.5 h-3.5"
                        weight={feedback === 'up' ? 'fill' : 'duotone'}
                        aria-hidden="true"
                    />
                </button>
                <button
                    onClick={() => handleFeedback('down')}
                    className={`p-1.5 rounded-lg transition-all ${
                        feedback === 'down'
                            ? 'text-rose-500 bg-rose-500/15 ring-1 ring-rose-500/30'
                            : 'text-muted-foreground hover:text-rose-600 hover:bg-muted'
                    }`}
                    aria-label="Mark as bad response"
                    aria-pressed={feedback === 'down'}
                >
                    <ThumbsDown
                        className="w-3.5 h-3.5"
                        weight={feedback === 'down' ? 'fill' : 'duotone'}
                        aria-hidden="true"
                    />
                </button>
            </div>
        </div>
    );
}

// Sector icon map
const SECTOR_ICONS: Record<string, React.ElementType> = {
    episodic: Clock,
    semantic: Lightbulb,
    procedural: Brain,
    emotional: Heart,
    reflective: Sparkle,
};

const SECTOR_COLORS: Record<string, string> = {
    episodic: 'text-zinc-500',
    semantic: 'text-emerald-500',
    procedural: 'text-amber-500',
    emotional: 'text-rose-500',
    reflective: 'text-amber-400',
};

// ============================================
// MEMORIES USED COMPONENT
// ============================================

function MemoriesUsedSection({ memories }: { memories: MemoryUsed[] }) {
    const [isExpanded, setIsExpanded] = useState(false);

    if (!memories || memories.length === 0) return null;

    return (
        <div className="mt-3 pt-2 border-t border-border">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors w-full"
            >
                <Brain className="w-3.5 h-3.5" />
                <span>{memories.length} memories used</span>
                {isExpanded ? (
                    <CaretUp className="w-3.5 h-3.5 ml-auto" />
                ) : (
                    <CaretDown className="w-3.5 h-3.5 ml-auto" />
                )}
            </button>

            {isExpanded && (
                <div className="mt-2 space-y-2 animate-fade-up">
                    {memories.map((memory, idx) => {
                        const SectorIcon = SECTOR_ICONS[memory.sector] || Brain;
                        const sectorColor = SECTOR_COLORS[memory.sector] || 'text-zinc-500';

                        return (
                            <div
                                key={memory.id}
                                className="bg-card rounded-lg p-3 text-xs border border-border hover:border-border transition-all"
                                style={{ animationDelay: `${idx * 50}ms` }}
                            >
                                <div className="flex items-center gap-2 mb-1.5">
                                    <SectorIcon
                                        className={`w-3.5 h-3.5 ${sectorColor}`}
                                        weight="duotone"
                                    />
                                    <span className="uppercase tracking-wide font-medium text-foreground">
                                        {memory.sector}
                                    </span>
                                    <span className="ml-auto font-mono text-xs font-semibold text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                                        {Math.round(memory.confidence * 100)}%
                                    </span>
                                </div>
                                <p className="text-foreground line-clamp-2 text-[11px]">
                                    {memory.content}
                                </p>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// ============================================
// DECISION SECTION (Agentic Transparency)
// ============================================

interface MemoryDecision {
    queryType: string;
    useMemory: boolean;
    sectors: string[];
    reasoning: string;
}

function DecisionSection({ decision }: { decision: MemoryDecision }) {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div className="mt-3 pt-2 border-t border-border">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors w-full"
            >
                <Sparkle className="w-3.5 h-3.5 text-primary" weight="fill" />
                <span>AI Decision: {decision.queryType.replace('_', ' ')}</span>
                {decision.useMemory && (
                    <span className="ml-1 px-1.5 py-0.5 bg-emerald-500/10 text-emerald-600 rounded text-[10px] uppercase">
                        Memory
                    </span>
                )}
                {isExpanded ? (
                    <CaretUp className="w-3.5 h-3.5 ml-auto" />
                ) : (
                    <CaretDown className="w-3.5 h-3.5 ml-auto" />
                )}
            </button>

            {isExpanded && (
                <div className="mt-2 bg-card rounded-lg p-3 text-xs space-y-2 border border-border animate-fade-up">
                    <p className="text-foreground leading-relaxed">{decision.reasoning}</p>
                    {decision.sectors.length > 0 && (
                        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border">
                            <span className="text-muted-foreground font-semibold">Sectors:</span>
                            <div className="flex flex-wrap gap-1">
                                {decision.sectors.map((sector) => {
                                    const SectorIcon = SECTOR_ICONS[sector] || Brain;
                                    const sectorColor =
                                        SECTOR_COLORS[sector] || 'text-muted-foreground';
                                    return (
                                        <span
                                            key={sector}
                                            className="flex items-center gap-1 bg-muted px-1.5 py-0.5 rounded text-[10px]"
                                        >
                                            <SectorIcon
                                                className={`w-3 h-3 ${sectorColor}`}
                                                weight="duotone"
                                            />
                                            <span className="text-foreground font-medium">
                                                {sector}
                                            </span>
                                        </span>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
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
function StreamingMessageComponent({ message, onFeedback }: StreamingMessageProps) {
    const isUser = message.role === 'user';

    return (
        <div
            className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4 group`}
            role={isUser ? 'listitem' : 'listitem'}
        >
            <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 transition-all ${
                    isUser
                        ? 'bg-primary text-primary-foreground shadow-md'
                        : 'bg-muted border border-border shadow-sm hover:shadow-md hover:border-border transition-all'
                }`}
                aria-live={message.streaming ? 'polite' : 'off'}
                aria-atomic="false"
                aria-label={isUser ? 'Your message' : 'AI response'}
            >
                {/* Error display */}
                {message.error && (
                    <div className="flex items-center gap-2 text-red-500 dark:text-red-400 mb-2">
                        <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
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
                {!isUser &&
                    message.memoriesUsed &&
                    message.memoriesUsed.length > 0 &&
                    !message.streaming && <MemoriesUsedSection memories={message.memoriesUsed} />}

                {/* AI Decision (Agentic Transparency) */}
                {!isUser && message.decision && !message.streaming && (
                    <DecisionSection decision={message.decision} />
                )}

                {/* Metadata */}
                {message.metadata && !message.streaming && (
                    <div className="flex items-center gap-2 mt-3 pt-2 border-t border-border text-xs text-muted-foreground flex-wrap">
                        <span className="font-mono bg-muted px-2 py-1 rounded text-foreground">
                            Yula
                        </span>
                        {message.metadata.tokensIn !== undefined &&
                            message.metadata.tokensOut !== undefined && (
                                <span className="flex items-center gap-1">
                                    <span className="text-muted-foreground">|</span>
                                    <span className="font-mono">
                                        {message.metadata.tokensIn}→{message.metadata.tokensOut}
                                    </span>
                                </span>
                            )}
                        {message.metadata.costUsd !== undefined && message.metadata.costUsd > 0 && (
                            <span className="font-semibold text-emerald-600">
                                ${message.metadata.costUsd.toFixed(5)}
                            </span>
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
                    <div
                        className="flex items-center gap-1"
                        role="status"
                        aria-label="AI is typing"
                    >
                        <span className="sr-only">AI is typing a response</span>
                        <span
                            className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                            style={{ animationDelay: '0ms' }}
                            aria-hidden="true"
                        />
                        <span
                            className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                            style={{ animationDelay: '150ms' }}
                            aria-hidden="true"
                        />
                        <span
                            className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                            style={{ animationDelay: '300ms' }}
                            aria-hidden="true"
                        />
                    </div>
                )}
            </div>
        </div>
    );
}

// Memoize to prevent unnecessary re-renders during streaming
export const StreamingMessage = memo(StreamingMessageComponent);
export default StreamingMessage;

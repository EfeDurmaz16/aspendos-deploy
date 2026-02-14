'use client';

import {
    Brain,
    Image as ImageIcon,
    Lightning,
    Paperclip,
    PaperPlaneRight,
    Robot,
    Spinner,
    User,
    Warning,
    X,
} from '@phosphor-icons/react';
import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ============================================
// TYPES
// ============================================

interface Message {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    createdAt: Date;
    metadata?: {
        model?: string;
        routing?: string;
        memoryCount?: number;
        fallback?: boolean;
    };
}

interface StreamChunk {
    type: 'text' | 'memory_context' | 'routing' | 'fallback' | 'error' | 'done';
    content: string;
    metadata?: Record<string, unknown>;
}

// ============================================
// MESSAGE BUBBLE
// ============================================

function MessageBubble({ message }: { message: Message }) {
    const isUser = message.role === 'user';

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn('flex gap-3', isUser && 'flex-row-reverse')}
        >
            <div
                className={cn(
                    'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
                    isUser ? 'bg-blue-500/20' : 'bg-zinc-800'
                )}
            >
                {isUser ? (
                    <User className="h-4 w-4 text-blue-400" weight="fill" />
                ) : (
                    <Robot className="h-4 w-4 text-zinc-400" weight="fill" />
                )}
            </div>
            <div className={cn('flex-1 max-w-[80%]', isUser && 'text-right')}>
                <div
                    className={cn(
                        'inline-block px-4 py-2 rounded-2xl text-sm',
                        isUser
                            ? 'bg-blue-500 text-white rounded-br-md'
                            : 'bg-zinc-800 text-zinc-100 rounded-bl-md'
                    )}
                >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                </div>
                {message.metadata && (
                    <div
                        className={cn(
                            'mt-1 flex items-center gap-2 text-xs text-zinc-500',
                            isUser && 'justify-end'
                        )}
                    >
                        {message.metadata.routing && (
                            <span className="flex items-center gap-1">
                                <Lightning className="h-3 w-3" />
                                Yula
                            </span>
                        )}
                        {message.metadata.memoryCount && message.metadata.memoryCount > 0 && (
                            <span className="flex items-center gap-1">
                                <Brain className="h-3 w-3" />
                                {message.metadata.memoryCount} memories
                            </span>
                        )}
                        {message.metadata.fallback && (
                            <span className="flex items-center gap-1 text-amber-400">
                                <Warning className="h-3 w-3" />
                                Fallback
                            </span>
                        )}
                    </div>
                )}
            </div>
        </motion.div>
    );
}

// ============================================
// CHAT INPUT
// ============================================

interface ChatInputProps {
    onSend: (message: string, attachments?: File[]) => void;
    isLoading: boolean;
    disabled?: boolean;
}

function ChatInput({ onSend, isLoading, disabled }: ChatInputProps) {
    const [input, setInput] = useState('');
    const [attachments, setAttachments] = useState<File[]>([]);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleSubmit = useCallback(() => {
        if (!input.trim() || isLoading || disabled) return;
        onSend(input.trim(), attachments);
        setInput('');
        setAttachments([]);
    }, [input, attachments, isLoading, disabled, onSend]);

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
            }
        },
        [handleSubmit]
    );

    const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        setAttachments((prev) => [...prev, ...files]);
    }, []);

    const removeAttachment = useCallback((index: number) => {
        setAttachments((prev) => prev.filter((_, i) => i !== index));
    }, []);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
        }
    }, [input]);

    return (
        <div className="border-t border-zinc-800 bg-zinc-900/50 p-4">
            {/* Attachments Preview */}
            {attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                    {attachments.map((file, index) => (
                        <div
                            key={index}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-800 text-xs"
                        >
                            <ImageIcon className="h-4 w-4 text-zinc-400" />
                            <span className="text-zinc-300 truncate max-w-[150px]">
                                {file.name}
                            </span>
                            <button
                                onClick={() => removeAttachment(index)}
                                className="text-zinc-500 hover:text-zinc-300"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <div className="flex items-end gap-3">
                <div className="flex-1 relative">
                    <textarea
                        ref={textareaRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Message Yula..."
                        disabled={disabled || isLoading}
                        className={cn(
                            'w-full resize-none rounded-xl border border-zinc-700 bg-zinc-800/50',
                            'px-4 py-3 pr-12 text-sm text-white placeholder:text-zinc-500',
                            'focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20',
                            'disabled:opacity-50 disabled:cursor-not-allowed',
                            'min-h-[48px] max-h-[200px]'
                        )}
                        rows={1}
                    />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={disabled || isLoading}
                        className="absolute right-3 bottom-3 text-zinc-500 hover:text-zinc-300 disabled:opacity-50"
                    >
                        <Paperclip className="h-5 w-5" />
                    </button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*,video/*"
                        multiple
                        onChange={handleFileSelect}
                        className="hidden"
                    />
                </div>
                <Button
                    onClick={handleSubmit}
                    disabled={!input.trim() || isLoading || disabled}
                    className="h-12 w-12 rounded-xl bg-blue-500 hover:bg-blue-600 disabled:opacity-50"
                >
                    {isLoading ? (
                        <Spinner className="h-5 w-5 animate-spin" />
                    ) : (
                        <PaperPlaneRight className="h-5 w-5" weight="fill" />
                    )}
                </Button>
            </div>
        </div>
    );
}

// ============================================
// MAIN CHAT INTERFACE
// ============================================

interface ChatInterfaceProps {
    chatId?: string;
    className?: string;
}

export function ChatInterface({ chatId, className }: ChatInterfaceProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [streamingContent, setStreamingContent] = useState('');
    const [streamingMetadata, setStreamingMetadata] = useState<Message['metadata']>({});
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Scroll to bottom on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, streamingContent]);

    const handleSend = useCallback(
        async (content: string, _attachments?: File[]) => {
            // Add user message
            const userMessage: Message = {
                id: crypto.randomUUID(),
                role: 'user',
                content,
                createdAt: new Date(),
            };
            setMessages((prev) => [...prev, userMessage]);
            setIsLoading(true);
            setStreamingContent('');
            setStreamingMetadata({});

            try {
                const response = await fetch('/api/chat/stream', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        message: content,
                        chatId,
                    }),
                });

                if (!response.ok) {
                    throw new Error('Failed to send message');
                }

                const reader = response.body?.getReader();
                if (!reader) throw new Error('No response body');

                const decoder = new TextDecoder();
                let assistantContent = '';
                const metadata: Message['metadata'] = {};

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const text = decoder.decode(value);
                    const lines = text.split('\n').filter((line) => line.startsWith('data: '));

                    for (const line of lines) {
                        const data = line.slice(6); // Remove 'data: '
                        if (data === '[DONE]') continue;

                        try {
                            const chunk: StreamChunk = JSON.parse(data);

                            if (chunk.type === 'text') {
                                assistantContent += chunk.content;
                                setStreamingContent(assistantContent);
                            } else if (chunk.type === 'routing') {
                                metadata.routing = chunk.content;
                                setStreamingMetadata({ ...metadata });
                            } else if (chunk.type === 'memory_context') {
                                metadata.memoryCount = chunk.metadata?.memoryCount as number;
                                setStreamingMetadata({ ...metadata });
                            } else if (chunk.type === 'fallback') {
                                metadata.fallback = true;
                                setStreamingMetadata({ ...metadata });
                            } else if (chunk.type === 'error') {
                                console.error('[Chat] Stream error:', chunk.content);
                            }
                        } catch {
                            // Ignore parse errors
                        }
                    }
                }

                // Add assistant message
                if (assistantContent) {
                    const assistantMessage: Message = {
                        id: crypto.randomUUID(),
                        role: 'assistant',
                        content: assistantContent,
                        createdAt: new Date(),
                        metadata,
                    };
                    setMessages((prev) => [...prev, assistantMessage]);
                }
            } catch (error) {
                console.error('[Chat] Error:', error);
                // Add error message
                setMessages((prev) => [
                    ...prev,
                    {
                        id: crypto.randomUUID(),
                        role: 'assistant',
                        content: 'Sorry, something went wrong. Please try again.',
                        createdAt: new Date(),
                    },
                ]);
            } finally {
                setIsLoading(false);
                setStreamingContent('');
                setStreamingMetadata({});
            }
        },
        [chatId]
    );

    return (
        <div className={cn('flex flex-col h-full bg-zinc-950', className)}>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 && !isLoading && (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                        <Robot className="h-16 w-16 text-zinc-700 mb-4" weight="duotone" />
                        <h2 className="text-xl font-medium text-white mb-2">Welcome to Yula</h2>
                        <p className="text-zinc-500 max-w-md">
                            Your unified AI workspace with persistent memory. Ask anything, and I'll
                            remember our conversations across sessions.
                        </p>
                    </div>
                )}

                <AnimatePresence>
                    {messages.map((message) => (
                        <MessageBubble key={message.id} message={message} />
                    ))}
                </AnimatePresence>

                {/* Streaming message */}
                {streamingContent && (
                    <MessageBubble
                        message={{
                            id: 'streaming',
                            role: 'assistant',
                            content: streamingContent,
                            createdAt: new Date(),
                            metadata: streamingMetadata,
                        }}
                    />
                )}

                {/* Loading indicator */}
                {isLoading && !streamingContent && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex items-center gap-2 text-zinc-500"
                    >
                        <Spinner className="h-4 w-4 animate-spin" />
                        <span className="text-sm">Thinking...</span>
                    </motion.div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <ChatInput onSend={handleSend} isLoading={isLoading} />
        </div>
    );
}

export default ChatInterface;

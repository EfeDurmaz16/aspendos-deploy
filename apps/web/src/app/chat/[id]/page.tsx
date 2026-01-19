'use client';

import { Brain, CircleNotch, List, PaperPlaneRight, SidebarSimple } from '@phosphor-icons/react';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ChatSidebar } from '@/components/chat/chat-sidebar';
import { MemoryPanel } from '@/components/chat/memory-panel';
import { ModelSelector } from '@/components/chat/model-selector';
import { StreamingMessage } from '@/components/chat/StreamingMessage';
import { VoiceButton } from '@/components/chat/voice-button';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/hooks/use-auth';
import { type ChatMessage, useStreamingChat } from '@/hooks/useStreamingChat';
import { cn } from '@/lib/utils';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

interface Chat {
    id: string;
    title: string;
    modelPreference: string | null;
    createdAt: string;
    updatedAt: string;
}

export default function ChatPage() {
    const params = useParams();
    const router = useRouter();
    const { isLoaded, isSignedIn } = useAuth();
    const chatId = params.id as string;

    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [memoryOpen, setMemoryOpen] = useState(true);
    const [chat, setChat] = useState<Chat | null>(null);
    const [chats, setChats] = useState<Chat[]>([]);
    const [initialMessages, setInitialMessages] = useState<ChatMessage[]>([]);
    const [isLoadingChat, setIsLoadingChat] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [inputValue, setInputValue] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const { messages, isStreaming, sendMessage, error: streamError } = useStreamingChat(chatId);

    // Load chat and messages
    useEffect(() => {
        if (!isLoaded || !isSignedIn || !chatId) return;

        const loadChat = async () => {
            try {
                setIsLoadingChat(true);
                const res = await fetch(`${API_BASE}/api/chat/${chatId}`, {
                    credentials: 'include',
                });

                if (!res.ok) {
                    if (res.status === 404) {
                        router.push('/chat');
                        return;
                    }
                    throw new Error('Failed to load chat');
                }

                const data = await res.json();
                setChat(data);

                if (data.messages) {
                    const converted: ChatMessage[] = data.messages.map(
                        (m: {
                            id: string;
                            role: string;
                            content: string;
                            createdAt: string;
                            modelUsed?: string;
                            tokensIn?: number;
                            tokensOut?: number;
                            costUsd?: number;
                        }) => ({
                            id: m.id,
                            role: m.role as 'user' | 'assistant',
                            content: m.content,
                            timestamp: new Date(m.createdAt),
                            metadata: m.modelUsed
                                ? {
                                    model: m.modelUsed,
                                    tokensIn: m.tokensIn,
                                    tokensOut: m.tokensOut,
                                    costUsd: m.costUsd,
                                }
                                : undefined,
                        })
                    );
                    setInitialMessages(converted);
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load chat');
            } finally {
                setIsLoadingChat(false);
            }
        };

        loadChat();
    }, [chatId, isLoaded, isSignedIn, router]);

    // Load chat list for sidebar
    useEffect(() => {
        if (!isLoaded || !isSignedIn) return;

        const loadChats = async () => {
            try {
                const res = await fetch(`${API_BASE}/api/chat`, { credentials: 'include' });
                if (res.ok) {
                    const data = await res.json();
                    setChats(data.chats || []);
                }
            } catch {
                /* Silently fail */
            }
        };

        loadChats();
    }, [isLoaded, isSignedIn]);

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, []);

    const handleSend = useCallback(async () => {
        const content = inputValue.trim();
        if (!content || isStreaming) return;

        setInputValue('');
        if (textareaRef.current) textareaRef.current.style.height = 'auto';

        await sendMessage(content, { model: chat?.modelPreference || 'openai/gpt-4o-mini' });
    }, [inputValue, isStreaming, sendMessage, chat?.modelPreference]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setInputValue(e.target.value);
        const textarea = e.target;
        textarea.style.height = 'auto';
        textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    };

    const handleNewChat = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/chat`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: 'New Chat' }),
            });
            if (res.ok) {
                const newChat = await res.json();
                router.push(`/chat/${newChat.id}`);
            }
        } catch {
            /* Handle error */
        }
    };

    const handleModelChange = useCallback(
        async (modelId: string) => {
            try {
                await fetch(`${API_BASE}/api/chat/${chatId}`, {
                    method: 'PATCH',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ model_id: modelId }),
                });
                setChat((prev) => (prev ? { ...prev, modelPreference: modelId } : prev));
            } catch {
                /* Handle error silently */
            }
        },
        [chatId]
    );

    const allMessages = [...initialMessages, ...messages];

    if (!isLoaded) {
        return (
            <div className="h-screen flex items-center justify-center bg-background">
                <CircleNotch className="w-8 h-8 animate-spin text-zinc-400" />
            </div>
        );
    }

    if (!isSignedIn) {
        router.push('/login');
        return null;
    }

    return (
        <div className="h-screen bg-zinc-50 dark:bg-zinc-950 overflow-hidden font-sans flex">
            {/* Sidebar */}
            <div
                className={cn(
                    'h-full bg-zinc-50 dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-900 transition-all duration-300',
                    sidebarOpen ? 'w-64' : 'w-0 overflow-hidden'
                )}
            >
                <ChatSidebar
                    chats={chats}
                    currentChatId={chatId}
                    onNewChat={handleNewChat}
                    onSelectChat={(id) => router.push(`/chat/${id}`)}
                />
            </div>

            {/* Main Chat */}
            <div className="flex-1 h-full flex flex-col relative bg-background">
                {/* Header (Minimal) */}
                <div className="flex items-center justify-between p-3 border-b flex-none bg-background/95 backdrop-blur z-10 w-full">
                    <div className="flex items-center">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        >
                            <SidebarSimple className="w-4 h-4" />
                        </Button>
                        <div className="ml-2 hidden sm:block">
                            <ModelSelector
                                selectedModel={chat?.modelPreference || 'openai/gpt-4o-mini'}
                                onModelChange={handleModelChange}
                                disabled={isStreaming}
                            />
                        </div>
                    </div>
                    {/* Centered Model Selector for mobile could go here or keep in right */}

                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setMemoryOpen(!memoryOpen)}
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    >
                        <List className="w-4 h-4" />
                    </Button>
                </div>

                {/* Messages */}
                <ScrollArea className="flex-1 p-6">
                    <div className="max-w-3xl mx-auto space-y-4 pb-32">
                        {isLoadingChat ? (
                            <div className="flex justify-center py-8">
                                <CircleNotch className="w-6 h-6 animate-spin text-zinc-400" />
                            </div>
                        ) : error ? (
                            <div className="text-center py-8 text-red-500 bg-red-50 dark:bg-red-950/20 rounded-xl border border-red-200 dark:border-red-800 px-4">
                                {error}
                            </div>
                        ) : allMessages.length === 0 ? (
                            <div className="text-center py-20 animate-fade-up">
                                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-900 mb-6 shadow-lg">
                                    <Brain
                                        className="w-8 h-8 text-zinc-600 dark:text-zinc-400"
                                        weight="duotone"
                                    />
                                </div>
                                <p className="text-xl font-serif font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                                    Start a conversation
                                </p>
                                <p className="text-sm text-zinc-500">
                                    Ask anything or share what's on your mind...
                                </p>
                            </div>
                        ) : (
                            allMessages.map((msg) => (
                                <StreamingMessage
                                    key={msg.id}
                                    message={{
                                        ...msg,
                                        memoriesUsed: msg.memoriesUsed?.map((m) => ({
                                            ...m,
                                            content: m.content || '',
                                        })),
                                    }}
                                />
                            ))
                        )}
                        {streamError && (
                            <div className="text-center py-4 text-red-500 text-sm">
                                {streamError}
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                </ScrollArea>

                {/* Input */}
                <div className="max-w-3xl mx-auto w-full px-4 mb-8 flex-none">
                    <div className="relative flex flex-col bg-background border border-input shadow-xl shadow-zinc-200/50 dark:shadow-black/50 rounded-2xl overflow-hidden focus-within:ring-1 focus-within:ring-ring transition-all">
                        <textarea
                            ref={textareaRef}
                            value={inputValue}
                            onChange={handleInputChange}
                            onKeyDown={handleKeyDown}
                            className="w-full min-h-[50px] max-h-[200px] p-4 bg-transparent resize-none outline-none text-[15px] placeholder:text-muted-foreground/60"
                            placeholder="Ask anything..."
                            disabled={isStreaming}
                        />
                        <div className="flex items-center justify-between px-3 pb-3 pt-1">
                            <div className="flex items-center gap-2">
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:bg-muted/50 rounded-lg">
                                    <Plus className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:bg-muted/50 rounded-lg">
                                    <Brain className="w-4 h-4" />
                                </Button>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-mono text-muted-foreground/50 mr-2">
                                    {inputValue.length} / 4000
                                </span>
                                <VoiceButton
                                    onTranscription={(text) => setInputValue((prev) => prev + text)}
                                    disabled={isStreaming}
                                />
                                <Button
                                    size="icon"
                                    onClick={handleSend}
                                    disabled={!inputValue.trim() || isStreaming}
                                    className="h-8 w-8 rounded-lg bg-foreground text-background hover:bg-foreground/90 disabled:opacity-50 transition-all"
                                >
                                    {isStreaming ? (
                                        <CircleNotch
                                            className="w-4 h-4 animate-spin"
                                            weight="bold"
                                        />
                                    ) : (
                                        <PaperPlaneRight weight="fill" className="w-4 h-4" />
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>
                    <p className="text-center text-[11px] text-muted-foreground/60 mt-4">
                        Aspendos can make mistakes. Please verify important information.
                    </p>
                </div>
            </div>

            {/* Memory Panel */}
            <div
                className={cn(
                    'h-full border-l border-zinc-200 dark:border-zinc-900 transition-all duration-300',
                    memoryOpen ? 'w-80' : 'w-0 overflow-hidden'
                )}
            >
                <MemoryPanel />
            </div>
        </div>
    );
}

'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { SidebarSimple, List, PaperPlaneRight, CircleNotch } from '@phosphor-icons/react';
import { StreamingMessage } from '@/components/chat/StreamingMessage';
import { ChatSidebar } from '@/components/chat/chat-sidebar';
import { MemoryPanel } from '@/components/chat/memory-panel';
import { useStreamingChat, type ChatMessage } from '@/hooks/useStreamingChat';
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
    const { getToken, isLoaded, isSignedIn } = useAuth();
    const chatId = params.id as string;

    // Panel visibility state (simplified - no refs needed)
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [memoryOpen, setMemoryOpen] = useState(true);

    // Chat state
    const [chat, setChat] = useState<Chat | null>(null);
    const [chats, setChats] = useState<Chat[]>([]);
    const [initialMessages, setInitialMessages] = useState<ChatMessage[]>([]);
    const [isLoadingChat, setIsLoadingChat] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Input state
    const [inputValue, setInputValue] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Streaming chat hook
    const {
        messages,
        isStreaming,
        sendMessage,
        error: streamError,
    } = useStreamingChat(chatId);

    // Load chat and messages
    useEffect(() => {
        if (!isLoaded || !isSignedIn || !chatId) return;

        const loadChat = async () => {
            try {
                setIsLoadingChat(true);
                const token = await getToken();

                // Load chat with messages
                const res = await fetch(`${API_BASE}/api/chat/${chatId}`, {
                    headers: { Authorization: `Bearer ${token}` },
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

                // Convert server messages to ChatMessage format
                if (data.messages) {
                    const converted: ChatMessage[] = data.messages.map((m: {
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
                        metadata: m.modelUsed ? {
                            model: m.modelUsed,
                            tokensIn: m.tokensIn,
                            tokensOut: m.tokensOut,
                            costUsd: m.costUsd,
                        } : undefined,
                    }));
                    setInitialMessages(converted);
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load chat');
            } finally {
                setIsLoadingChat(false);
            }
        };

        loadChat();
    }, [chatId, isLoaded, isSignedIn, getToken, router]);

    // Load chat list for sidebar
    useEffect(() => {
        if (!isLoaded || !isSignedIn) return;

        const loadChats = async () => {
            try {
                const token = await getToken();
                const res = await fetch(`${API_BASE}/api/chat`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (res.ok) {
                    const data = await res.json();
                    setChats(data.chats || []);
                }
            } catch {
                // Silently fail - sidebar will show empty
            }
        };

        loadChats();
    }, [isLoaded, isSignedIn, getToken]);

    // Auto-scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, initialMessages]);

    // Handle send message
    const handleSend = useCallback(async () => {
        const content = inputValue.trim();
        if (!content || isStreaming) return;

        setInputValue('');
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
        }

        await sendMessage(content, {
            model: chat?.modelPreference || 'openai/gpt-4o-mini',
        });
    }, [inputValue, isStreaming, sendMessage, chat?.modelPreference]);

    // Handle keyboard shortcuts
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // Auto-resize textarea
    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setInputValue(e.target.value);
        const textarea = e.target;
        textarea.style.height = 'auto';
        textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    };

    // Create new chat
    const handleNewChat = async () => {
        try {
            const token = await getToken();
            const res = await fetch(`${API_BASE}/api/chat`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ title: 'New Chat' }),
            });

            if (res.ok) {
                const newChat = await res.json();
                router.push(`/chat/${newChat.id}`);
            }
        } catch {
            // Handle error
        }
    };

    // Combine initial messages with streaming messages
    const allMessages = [...initialMessages, ...messages];

    if (!isLoaded) {
        return (
            <div className="h-screen flex items-center justify-center">
                <CircleNotch className="w-8 h-8 animate-spin text-zinc-400" />
            </div>
        );
    }

    if (!isSignedIn) {
        router.push('/login');
        return null;
    }

    return (
        <div className="h-screen bg-background overflow-hidden font-sans flex">
            {/* Sidebar */}
            <div
                className={cn(
                    'h-full bg-zinc-50 dark:bg-black border-r border-zinc-200 dark:border-zinc-900 transition-all duration-300',
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
            <div className="flex-1 h-full flex flex-col relative bg-background dark:bg-zinc-950 dark:text-zinc-100">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-zinc-100 dark:border-zinc-900 bg-background/50 backdrop-blur-sm">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="h-8 w-8 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50"
                        title="Toggle Sidebar"
                    >
                        <SidebarSimple weight="duotone" className="w-5 h-5" />
                    </Button>
                    <span className="text-xs font-medium text-zinc-400">
                        {chat?.modelPreference?.split('/')[1] || 'GPT-4o Mini'}
                    </span>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setMemoryOpen(!memoryOpen)}
                        className="h-8 w-8 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50"
                        title="Toggle Memory"
                    >
                        <List weight="duotone" className="w-5 h-5" />
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
                            <div className="text-center py-8 text-red-500">{error}</div>
                        ) : allMessages.length === 0 ? (
                            <div className="text-center py-16 text-zinc-400">
                                <p className="text-lg font-serif mb-2">Start a conversation</p>
                                <p className="text-sm">Ask anything...</p>
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
                <div className="max-w-3xl mx-auto w-full px-4 mb-6">
                    <div className="relative flex flex-col bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm rounded-xl overflow-hidden focus-within:ring-1 focus-within:ring-zinc-300 dark:focus-within:ring-zinc-700 transition-shadow">
                        <textarea
                            ref={textareaRef}
                            value={inputValue}
                            onChange={handleInputChange}
                            onKeyDown={handleKeyDown}
                            className="w-full min-h-[60px] max-h-[200px] p-4 bg-transparent resize-none outline-none text-[15px] placeholder:text-zinc-400"
                            placeholder="Ask anything..."
                            disabled={isStreaming}
                        />
                        <div className="flex items-center justify-between px-3 pb-3 pt-1">
                            <span className="text-xs text-zinc-400">
                                {inputValue.length} / 4000
                            </span>
                            <Button
                                size="icon"
                                onClick={handleSend}
                                disabled={!inputValue.trim() || isStreaming}
                                className="h-8 w-8 rounded-lg bg-zinc-900 dark:bg-zinc-50 hover:bg-zinc-700 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 disabled:opacity-50"
                            >
                                {isStreaming ? (
                                    <CircleNotch className="w-4 h-4 animate-spin" />
                                ) : (
                                    <PaperPlaneRight weight="bold" className="w-4 h-4" />
                                )}
                            </Button>
                        </div>
                    </div>
                    <p className="text-center text-[11px] text-zinc-400 mt-2">
                        Aspendos memories are private. Content generated by AI may be inaccurate.
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

'use client';

import { Brain, CircleNotch, List, PaperPlaneRight, SidebarSimple, Plus, ArrowRight } from '@phosphor-icons/react';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ChatSidebar } from '@/components/chat/chat-sidebar';
import { MemoryPanel } from '@/components/chat/memory-panel';
import { ModelPicker } from '@/components/chat/model-picker';
import { AddModelsModal } from '@/components/chat/add-models-modal';
import { StreamingMessage } from '@/components/chat/StreamingMessage';
import { VoiceButton } from '@/components/chat/voice-button';
import { LiveButton } from '@/components/chat/live-button';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ShortcutsDock } from '@/components/chat/shortcuts-dock';
import { useAuth } from '@/hooks/use-auth';
import { type ChatMessage, useStreamingChat } from '@/hooks/useStreamingChat';
import { cn } from '@/lib/utils';
interface Chat {
    id: string;
    title: string;
    modelPreference: string | null;
    createdAt: string;
    updatedAt: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export default function ChatPage() {
    const params = useParams();
    const router = useRouter();
    const { isLoaded, isSignedIn } = useAuth();
    const chatId = params.id as string;

    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [memoryOpen, setMemoryOpen] = useState(false);
    const [chat, setChat] = useState<Chat | null>(null);
    const [chats, setChats] = useState<Chat[]>([]);
    const [initialMessages, setInitialMessages] = useState<ChatMessage[]>([]);
    const [isLoadingChat, setIsLoadingChat] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [inputValue, setInputValue] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const [isAddModelsOpen, setIsAddModelsOpen] = useState(false);
    const [enabledModels, setEnabledModels] = useState<string[]>([
        'openai/gpt-5.2',
        'anthropic/claude-opus-4.5',
        'anthropic/claude-sonnet-4.5',
        'openai/gpt-5-nano',
        'google/gemini-3-pro-preview',
    ]);

    const handleToggleModel = (modelId: string) => {
        setEnabledModels((prev) =>
            prev.includes(modelId) ? prev.filter((id) => id !== modelId) : [...prev, modelId]
        );
    };

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
                        (m: any) => ({
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
    }, [messages, initialMessages]);



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
                setChat((prev: Chat | null) => (prev ? { ...prev, modelPreference: modelId } : prev));
            } catch {
                /* Handle error silently */
            }
        },
        [chatId]
    );

    // Keyboard shortcuts
    useEffect(() => {
        const handleGlobalKeyDown = (e: KeyboardEvent) => {
            // New Chat: Cmd+N
            if (e.metaKey && e.key === 'n') {
                e.preventDefault();
                handleNewChat();
                return;
            }

            // Toggle Sidebar: Cmd+B
            if (e.metaKey && e.key === 'b') {
                e.preventDefault();
                setSidebarOpen((prev) => !prev);
                return;
            }

            // Focus Input: /
            // Only if not already typing in an input
            if (e.key === '/' && document.activeElement?.tagName !== 'TEXTAREA' && document.activeElement?.tagName !== 'INPUT') {
                e.preventDefault();
                textareaRef.current?.focus();
                return;
            }
        };

        window.addEventListener('keydown', handleGlobalKeyDown);
        return () => window.removeEventListener('keydown', handleGlobalKeyDown);
    }, [handleNewChat]);

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
        <div className="h-screen bg-gradient-to-b from-white to-zinc-50 dark:from-zinc-950 dark:to-black overflow-hidden font-sans flex relative">
            {/* Subtle Gradient mesh backgrounds (Maia Clean) */}
            <div className="absolute inset-0 pointer-events-none z-0">
                <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-gradient-to-br from-purple-100/20 to-transparent dark:from-purple-900/10 rounded-full blur-3xl opacity-50" />
                <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-gradient-to-bl from-emerald-100/20 to-transparent dark:from-emerald-900/10 rounded-full blur-3xl opacity-50" />
            </div>

            {/* Sidebar */}
            <div
                className={cn(
                    'h-full bg-white/50 dark:bg-zinc-950/50 backdrop-blur border-r border-zinc-200 dark:border-zinc-900 transition-all duration-300 z-20',
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
            <div className="flex-1 h-full flex flex-col relative bg-transparent z-10">
                {/* Header (Minimal) */}
                <div className="flex items-center justify-between p-3 border-b border-zinc-200 dark:border-zinc-800 flex-none bg-white/50 dark:bg-zinc-950/50 backdrop-blur z-20 w-full">
                    <div className="flex items-center">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            className="h-8 w-8 text-muted-foreground hover:text-foreground mr-2"
                        >
                            <SidebarSimple className="w-4 h-4" />
                        </Button>
                        <div className="hidden sm:block">
                            <ModelPicker
                                selectedModel={chat?.modelPreference || 'openai/gpt-5.2'}
                                onSelectModel={handleModelChange}
                                onOpenAddModels={() => setIsAddModelsOpen(true)}
                                enabledModels={enabledModels}
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <LiveButton />
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setMemoryOpen(!memoryOpen)}
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        >
                            <List className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                {/* Messages */}
                <ScrollArea className="flex-1 p-0">
                    <div className="max-w-3xl mx-auto space-y-6 pt-6 pb-32 px-4">
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
                                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-900 mb-6 shadow-lg border border-zinc-200 dark:border-zinc-700">
                                    <Brain
                                        className="w-8 h-8 text-zinc-600 dark:text-zinc-400"
                                        weight="duotone"
                                    />
                                </div>
                                <p className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                                    Start a conversation
                                </p>
                                <p className="text-sm text-zinc-500 max-w-sm mx-auto">
                                    Ask anything, analyze data, or generate ideas. Aspendos is here to help.
                                </p>
                            </div>
                        ) : (
                            allMessages.map((msg) => (
                                <StreamingMessage
                                    key={msg.id}
                                    message={{
                                        ...msg,
                                        memoriesUsed: msg.memoriesUsed?.map((m: any) => ({
                                            ...m,
                                            content: m.content || '',
                                        })),
                                    }}
                                />
                            ))
                        )}
                        {streamError && (
                            <div className="text-center py-4 text-red-500 text-sm bg-red-50 dark:bg-red-900/10 rounded-lg">
                                {streamError}
                            </div>
                        )}
                        <div ref={messagesEndRef} className="h-4" />
                    </div>
                </ScrollArea>

                {/* Input */}
                <div className="max-w-3xl mx-auto w-full px-4 mb-6 flex-none z-20">
                    <div className="relative flex flex-col bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 shadow-xl shadow-zinc-200/50 dark:shadow-black/50 rounded-2xl overflow-hidden focus-within:ring-2 focus-within:ring-zinc-200 dark:focus-within:ring-zinc-800 transition-all">
                        <textarea
                            ref={textareaRef}
                            value={inputValue}
                            onChange={handleInputChange}
                            onKeyDown={handleKeyDown}
                            className="w-full min-h-[50px] max-h-[200px] p-4 bg-transparent resize-none outline-none text-[16px] placeholder:text-muted-foreground/60 text-foreground"
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
                                {inputValue.length > 0 && (
                                    <span className="text-[10px] font-mono text-muted-foreground/50 mr-2 animate-fade-in">
                                        {inputValue.length} / 4000
                                    </span>
                                )}
                                <VoiceButton
                                    onTranscription={(text) => setInputValue((prev) => prev + text)}
                                    disabled={isStreaming}
                                />
                                <Button
                                    size="sm"
                                    onClick={handleSend}
                                    disabled={!inputValue.trim() || isStreaming}
                                    className="h-8 rounded-lg text-xs px-3"
                                >
                                    {isStreaming ? (
                                        <CircleNotch
                                            className="w-4 h-4 animate-spin"
                                            weight="bold"
                                        />
                                    ) : (
                                        <>
                                            Send <ArrowRight weight="bold" className="w-3.5 h-3.5 ml-1.5" />
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Memory Panel */}
            <div
                className={cn(
                    'h-full border-l border-zinc-200 dark:border-zinc-900 bg-white/50 dark:bg-zinc-950/50 backdrop-blur transition-all duration-300 z-20',
                    memoryOpen ? 'w-80' : 'w-0 overflow-hidden'
                )}
            >
                <MemoryPanel />
            </div>
            {/* Add Models Modal */}
            <AddModelsModal
                isOpen={isAddModelsOpen}
                onClose={() => setIsAddModelsOpen(false)}
                enabledModels={enabledModels}
                onToggleModel={handleToggleModel}
            />

            <ShortcutsDock />
        </div>
    );
}


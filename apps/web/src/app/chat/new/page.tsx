'use client';

import { Brain, CircleNotch, List, PaperPlaneRight, SidebarSimple } from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ChatSidebar } from '@/components/chat/chat-sidebar';
import { MemoryPanel } from '@/components/chat/memory-panel';
import { ModelSelector } from '@/components/chat/model-selector';
import { StreamingMessage } from '@/components/chat/StreamingMessage';
import { VoiceButton } from '@/components/chat/voice-button';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/hooks/use-auth';
import { useStreamingChat } from '@/hooks/useStreamingChat';
import { cn } from '@/lib/utils';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

interface Chat {
    id: string;
    title: string;
    modelPreference: string | null;
    createdAt: string;
    updatedAt: string;
}

export default function NewChatPage() {
    const router = useRouter();
    const { isLoaded, isSignedIn } = useAuth();

    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [memoryOpen, setMemoryOpen] = useState(true);
    const [chats, setChats] = useState<Chat[]>([]);
    const [selectedModel, setSelectedModel] = useState('openai/gpt-4o-mini');
    const [inputValue, setInputValue] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Use "new" as a placeholder chatId - will be replaced on first message
    const { messages, isStreaming, sendMessage, error: streamError } = useStreamingChat('new');

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

        // Send message - the hook will handle creating the chat on first message
        await sendMessage(content, { model: selectedModel });
    }, [inputValue, isStreaming, sendMessage, selectedModel]);

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

    const handleModelChange = useCallback(async (modelId: string) => {
        setSelectedModel(modelId);
    }, []);

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
                    currentChatId="new"
                    onNewChat={handleNewChat}
                    onSelectChat={(id) => router.push(`/chat/${id}`)}
                />
            </div>

            {/* Main Chat */}
            <div className="flex-1 h-full flex flex-col relative bg-white dark:bg-zinc-950 dark:text-zinc-100">
                {/* YULA Monolith Background - Amber glow only */}
                <div className="absolute inset-0 pointer-events-none -z-10">
                    <div className="absolute top-1/4 right-1/4 w-[500px] h-[500px] bg-gradient-to-br from-amber-100/10 to-transparent dark:from-amber-900/10 rounded-full blur-3xl" />
                    <div className="absolute bottom-1/3 left-1/3 w-[600px] h-[600px] bg-gradient-to-bl from-amber-50/8 to-transparent dark:from-amber-800/8 rounded-full blur-3xl" />
                </div>
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-950/50 backdrop-blur-md z-10 relative">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="h-9 w-9 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-all"
                        title="Toggle Sidebar"
                    >
                        <SidebarSimple weight="duotone" className="w-5 h-5" />
                    </Button>
                    <div className="flex-1 flex justify-center">
                        <ModelSelector
                            selectedModel={selectedModel}
                            onModelChange={handleModelChange}
                            disabled={isStreaming}
                        />
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setMemoryOpen(!memoryOpen)}
                        className="h-9 w-9 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-all"
                        title="Toggle Memory"
                    >
                        <List weight="duotone" className="w-5 h-5" />
                    </Button>
                </div>

                {/* Messages */}
                <ScrollArea className="flex-1 p-6">
                    <div className="max-w-3xl mx-auto space-y-4 pb-32">
                        {messages.length === 0 ? (
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
                            messages.map((msg) => (
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
                <div className="max-w-3xl mx-auto w-full px-4 mb-6 relative z-10">
                    <div className="relative flex flex-col bg-white/80 dark:bg-zinc-900/80 backdrop-blur-lg border border-zinc-200 dark:border-zinc-800 shadow-lg rounded-2xl overflow-hidden focus-within:ring-2 focus-within:ring-emerald-500/30 dark:focus-within:ring-emerald-500/20 focus-within:border-emerald-500/50 dark:focus-within:border-emerald-500/30 transition-all">
                        <textarea
                            ref={textareaRef}
                            value={inputValue}
                            onChange={handleInputChange}
                            onKeyDown={handleKeyDown}
                            className="w-full min-h-[60px] max-h-[200px] p-4 bg-transparent resize-none outline-none text-[15px] placeholder:text-zinc-400 text-zinc-900 dark:text-zinc-50"
                            placeholder="Ask anything..."
                            disabled={isStreaming}
                        />
                        <div className="flex items-center justify-between px-4 pb-3 pt-1">
                            <span className="text-xs font-mono text-zinc-500">
                                {inputValue.length} / 4000
                            </span>
                            <div className="flex items-center gap-2">
                                <VoiceButton
                                    onTranscription={(text) => setInputValue((prev) => prev + text)}
                                    disabled={isStreaming}
                                />
                                <Button
                                    size="icon"
                                    onClick={handleSend}
                                    disabled={!inputValue.trim() || isStreaming}
                                    className="h-9 w-9 rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white shadow-md hover:shadow-lg disabled:opacity-50 disabled:hover:shadow-md transition-all"
                                >
                                    {isStreaming ? (
                                        <CircleNotch
                                            className="w-4 h-4 animate-spin"
                                            weight="bold"
                                        />
                                    ) : (
                                        <PaperPlaneRight weight="bold" className="w-4 h-4" />
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>
                    <p className="text-center text-[11px] text-zinc-500 mt-3">
                        Aspendos memories are private. AI-generated content may be inaccurate.
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

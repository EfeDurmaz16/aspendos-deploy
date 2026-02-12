'use client';

import {
    Brain,
    CircleNotch,
    PaperPlaneRight,
    PlusCircle,
    SidebarSimple,
} from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ChatSidebar } from '@/components/chat/chat-sidebar';
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

    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Open sidebar by default on desktop
    useEffect(() => {
        if (window.innerWidth >= 768) {
            setSidebarOpen(true);
        }
    }, []);
    const [chats, setChats] = useState<Chat[]>([]);
    const [selectedModel, setSelectedModel] = useState('openai/gpt-4o-mini');
    const [inputValue, setInputValue] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const { messages, isStreaming, sendMessage, error: streamError } = useStreamingChat('new');

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

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, []);

    const handleSend = useCallback(async () => {
        const content = inputValue.trim();
        if (!content || isStreaming) return;

        setInputValue('');
        if (textareaRef.current) textareaRef.current.style.height = 'auto';

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

    if (!isLoaded) {
        return (
            <div className="h-screen flex items-center justify-center bg-background">
                <CircleNotch className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!isSignedIn) {
        router.push('/login');
        return null;
    }

    return (
        <div className="h-screen bg-background overflow-hidden font-sans flex">
            {/* Sidebar backdrop (mobile only) */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/40 z-30 md:hidden"
                    onClick={() => setSidebarOpen(false)}
                    onKeyDown={() => {}}
                    role="button"
                    tabIndex={-1}
                />
            )}

            {/* Sidebar */}
            <div
                className={cn(
                    'h-full bg-muted border-r border-border transition-all duration-300',
                    'fixed md:relative z-40 md:z-20',
                    sidebarOpen ? 'w-64' : 'w-0 overflow-hidden'
                )}
            >
                <ChatSidebar
                    chats={chats}
                    currentChatId="new"
                    onNewChat={handleNewChat}
                    onSelectChat={(id) => {
                        router.push(`/chat/${id}`);
                        if (window.innerWidth < 768) setSidebarOpen(false);
                    }}
                />
            </div>

            {/* Main Chat */}
            <div className="flex-1 h-full flex flex-col relative">
                {/* Header */}
                <div className="flex items-center justify-between p-3 border-b border-border flex-none bg-background z-10">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    >
                        <SidebarSimple className="w-4 h-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleNewChat}
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    >
                        <PlusCircle className="w-4 h-4" />
                    </Button>
                </div>

                {/* Messages */}
                <ScrollArea className="flex-1 p-6">
                    <div className="max-w-3xl mx-auto space-y-4 pb-32">
                        {messages.length === 0 ? (
                            <div className="text-center py-20 animate-fade-up">
                                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-muted mb-6 border border-border">
                                    <Brain className="w-8 h-8 text-foreground" weight="duotone" />
                                </div>
                                <p className="text-xl font-semibold text-foreground mb-2">
                                    Start a conversation
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    Ask anything or share what&apos;s on your mind...
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
                <div className="max-w-3xl mx-auto w-full px-2 sm:px-4 mb-4 sm:mb-6 relative z-10">
                    <div className="relative flex flex-col bg-background border border-border rounded-2xl overflow-hidden focus-within:ring-2 focus-within:ring-ring/30 focus-within:border-ring/50 transition-colors">
                        <textarea
                            ref={textareaRef}
                            value={inputValue}
                            onChange={handleInputChange}
                            onKeyDown={handleKeyDown}
                            className="w-full min-h-[60px] max-h-[200px] p-4 bg-transparent resize-none outline-none text-[15px] placeholder:text-muted-foreground text-foreground"
                            placeholder="Ask anything..."
                            disabled={isStreaming}
                        />
                        <div className="flex items-center justify-between px-4 pb-3 pt-1">
                            <span className="text-xs font-mono text-muted-foreground">
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
                                    className="h-9 w-9 rounded-xl bg-foreground hover:bg-foreground/90 text-background disabled:opacity-50 transition-colors"
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
                    <p className="text-center text-[11px] text-muted-foreground mt-3">
                        YULA memories are private. AI-generated content may be inaccurate.
                    </p>
                </div>
            </div>
        </div>
    );
}

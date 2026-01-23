'use client';

import { Brain, CircleNotch, List, SidebarSimple, GlobeIcon } from '@phosphor-icons/react';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { ChatSidebar } from '@/components/chat/chat-sidebar';
import { MemoryPanel } from '@/components/chat/memory-panel';
import { ModelPicker } from '@/components/chat/model-picker';
import { AddModelsModal } from '@/components/chat/add-models-modal';
import { KeyboardShortcuts } from '@/components/chat/keyboard-shortcuts';
import { ContextMenuMessage } from '@/components/chat/context-menu-message';
import { useAuth } from '@/hooks/use-auth';
import { useStreamingChat } from '@/hooks/useStreamingChat';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

// AI Elements Imports
import {
    Conversation,
    ConversationContent,
    ConversationEmptyState,
    ConversationScrollButton,
} from '@/components/ai-elements/conversation';
import {
    Message,
    MessageContent,
    MessageResponse,
    MessageAttachment,
    MessageAttachments,
} from '@/components/ai-elements/message';
import {
    PromptInput,
    PromptInputBody,
    PromptInputTextarea,
    PromptInputFooter,
    PromptInputSubmit,
    PromptInputTools,
    PromptInputActionMenu,
    PromptInputActionMenuTrigger,
    PromptInputActionMenuContent,
    PromptInputActionAddAttachments,
    PromptInputHeader,
    PromptInputAttachments,
    PromptInputAttachment,
    PromptInputButton,
    PromptInputSelect,
    PromptInputSelectTrigger,
    PromptInputSelectValue,
    PromptInputSelectContent,
    PromptInputSelectItem,
} from '@/components/ai-elements/prompt-input';
import { Reasoning, ChainOfThought } from '@/components/ai-elements/reasoning';

// Streamdown Plugins
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css'; // Ensure katex CSS is imported for math rendering

interface Chat {
    id: string;
    title: string;
    modelPreference: string | null;
    createdAt: string;
    updatedAt: string;
    messages?: any[];
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
    const [isLoadingChat, setIsLoadingChat] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [isAddModelsOpen, setIsAddModelsOpen] = useState(false);
    const [enabledModels, setEnabledModels] = useState<string[]>([
        'openai/gpt-5.2',
        'anthropic/claude-opus-4.5',
        'anthropic/claude-sonnet-4.5',
        'openai/gpt-5-nano',
        'google/gemini-3-pro-preview',
    ]);
    const [model, setModel] = useState('openai/gpt-4o-mini');
    const [webSearch, setWebSearch] = useState(false);

    const handleToggleModel = (modelId: string) => {
        setEnabledModels((prev) =>
            prev.includes(modelId) ? prev.filter((id) => id !== modelId) : [...prev, modelId]
        );
    };

    const { messages, isStreaming, sendMessage, error: streamError } = useStreamingChat(chatId);

    // Sync model preference
    useEffect(() => {
        if (chat?.modelPreference) {
            setModel(chat.modelPreference);
        }
    }, [chat?.modelPreference]);

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
                // Initial messages are loaded by useStreamingChat via its own logic if we were using useChat fully, 
                // but here useStreamingChat manages messages state. 
                // The original code setInitialMessages separately.
                // Assuming useStreamingChat handles the message list now or we load it here?
                // The original code loaded initialMessages and combined them: const allMessages = [...initialMessages, ...messages];
                // Wait, useStreamingChat in original code didn't load initial messages. It just exposed the new ones.
                // So I need to keep the "load initial messages" logic, but merge it effectively.
                // Actually, useStreamingChat hook in Step 16 has a "loadMessages" function.
                // But typically useChat stores all messages.
                // Let's stick to the previous pattern: "allMessages".
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

    // Initial messages from chat load (re-implementing original logic because useStreamingChat is a wrapper)
    const [initialMessages, setInitialMessages] = useState<any[]>([]);

    useEffect(() => {
        if (chat?.messages) {
            // Map chat.messages to the format we need
            const converted = chat.messages.map((m: any) => ({
                id: m.id,
                role: m.role as 'user' | 'assistant',
                content: m.content,
                timestamp: new Date(m.createdAt),
            }));
            setInitialMessages(converted);
        }
    }, [chat]);

    // Combine messages. 
    // Note: useStreamingChat messages are cumulative for the session.
    // If we load old messages, we should probably initialize useStreamingChat with them if possible,
    // or just display them.
    // The previous code did: const allMessages = [...initialMessages, ...messages];
    const allMessages = [...initialMessages, ...messages];


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
                setModel(modelId);
            } catch {
                /* Handle error silently */
            }
        },
        [chatId]
    );

    // Keyboard shortcuts
    useEffect(() => {
        const handleGlobalKeyDown = (e: KeyboardEvent) => {
            if (e.metaKey && e.key === 'n') {
                e.preventDefault();
                handleNewChat();
                return;
            }
            if (e.metaKey && e.key === 'b') {
                e.preventDefault();
                setSidebarOpen((prev) => !prev);
                return;
            }
        };

        window.addEventListener('keydown', handleGlobalKeyDown);
        return () => window.removeEventListener('keydown', handleGlobalKeyDown);
    }, [handleNewChat]);

    // Handle PromptInput submission
    const handleSubmit = async (message: { text: string; files: any[] }) => {
        // Just text for now, as useStreamingChat expects string
        // If files are present, we might want to handle them (upload, then send URL?)
        // For this MVP step, we'll focus on text.
        await sendMessage(message.text, { model });
    };

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
            {/* YULA Monolith Background - Amber glow only */}
            <div className="absolute inset-0 pointer-events-none z-0">
                <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-gradient-to-br from-amber-100/10 to-transparent dark:from-amber-900/8 rounded-full blur-3xl opacity-50" />
                <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-gradient-to-bl from-emerald-100/15 to-transparent dark:from-emerald-900/10 rounded-full blur-3xl opacity-50" />
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

            {/* Main Chat Area */}
            <div className="flex-1 h-full flex flex-col relative bg-transparent z-10 w-full min-w-0">
                {/* Header */}
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

                {/* Conversation Area */}
                <div className="flex-1 flex flex-col min-h-0 relative">
                    <Conversation>
                        <ConversationContent>
                            {allMessages.length === 0 && !isLoadingChat && !error ? (
                                <ConversationEmptyState
                                    icon={<Brain className="w-12 h-12 text-muted-foreground/50" weight="duotone" />}
                                    title="Start a conversation"
                                    description="Ask anything, analyze data, or generate ideas. Aspendos is here to help."
                                />
                            ) : (
                                allMessages.map((msg, index) => (
                                    <ContextMenuMessage
                                        key={msg.id || index}
                                        message={{ id: msg.id, content: msg.content, role: msg.role }}
                                        onReply={(m) => {
                                            // Handle reply - could prepend quote to input
                                            toast.info('Reply feature coming soon');
                                        }}
                                        onEdit={msg.role === 'user' ? (m) => {
                                            toast.info('Edit feature coming soon');
                                        } : undefined}
                                        onRegenerate={msg.role === 'assistant' ? (id) => {
                                            toast.info('Regenerate feature coming soon');
                                        } : undefined}
                                        onForward={(m) => {
                                            toast.info('Forward feature coming soon');
                                        }}
                                    >
                                        <Message from={msg.role}>
                                            {/* Show reasoning for assistant messages if available */}
                                            {msg.role === 'assistant' && msg.reasoning && (
                                                <Reasoning isStreaming={isStreaming && index === allMessages.length - 1}>
                                                    {msg.reasoning}
                                                </Reasoning>
                                            )}
                                            <MessageContent>
                                                <MessageResponse
                                                    plugins={[remarkMath] as any}
                                                    rehypePlugins={[rehypeKatex] as any}
                                                >
                                                    {msg.content}
                                                </MessageResponse>
                                            </MessageContent>
                                        </Message>
                                    </ContextMenuMessage>
                                ))
                            )}
                            {error && (
                                <div className="text-center py-4 text-red-500 text-sm bg-red-50 dark:bg-red-900/10 rounded-lg mx-auto max-w-md">
                                    {error}
                                </div>
                            )}
                            {streamError && (
                                <div className="text-center py-4 text-red-500 text-sm bg-red-50 dark:bg-red-900/10 rounded-lg mx-auto max-w-md">
                                    {streamError}
                                </div>
                            )}
                        </ConversationContent>
                        <ConversationScrollButton />
                    </Conversation>
                </div>

                {/* Input Area */}
                <div className="p-4 flex-none z-20 max-w-3xl mx-auto w-full">
                    <PromptInput
                        onSubmit={handleSubmit}
                        className="shadow-xl"
                    >
                        <PromptInputHeader>
                            <PromptInputAttachments>
                                {(attachment) => <PromptInputAttachment data={attachment} />}
                            </PromptInputAttachments>
                        </PromptInputHeader>
                        <PromptInputBody>
                            <PromptInputTextarea placeholder="Ask anything..." />
                        </PromptInputBody>
                        <PromptInputFooter>
                            <PromptInputTools>
                                <PromptInputActionMenu>
                                    <PromptInputActionMenuTrigger />
                                    <PromptInputActionMenuContent>
                                        <PromptInputActionAddAttachments />
                                        {/* Add more actions like shortcuts later */}
                                    </PromptInputActionMenuContent>
                                </PromptInputActionMenu>
                                <PromptInputButton
                                    variant={webSearch ? 'default' : 'ghost'}
                                    onClick={() => setWebSearch(!webSearch)}
                                    size="icon-sm"
                                    className="gap-2 px-2 w-auto"
                                >
                                    <GlobeIcon size={16} />
                                    <span className="text-xs">Search</span>
                                </PromptInputButton>
                                {/* Model Selector in input */}
                                <PromptInputSelect
                                    value={model}
                                    onValueChange={handleModelChange}
                                >
                                    <PromptInputSelectTrigger>
                                        <PromptInputSelectValue placeholder="Select model" />
                                    </PromptInputSelectTrigger>
                                    <PromptInputSelectContent>
                                        {enabledModels.map((m) => (
                                            <PromptInputSelectItem key={m} value={m}>
                                                {m.split('/').pop()}
                                            </PromptInputSelectItem>
                                        ))}
                                    </PromptInputSelectContent>
                                </PromptInputSelect>
                            </PromptInputTools>
                            <PromptInputSubmit status={isStreaming ? 'streaming' : undefined} />
                        </PromptInputFooter>
                    </PromptInput>
                    <div className="text-center mt-2 text-xs text-muted-foreground">
                        Aspendos can make mistakes. Check important info.
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

            {/* Keyboard Shortcuts Panel */}
            <KeyboardShortcuts />

            <AddModelsModal
                isOpen={isAddModelsOpen}
                onClose={() => setIsAddModelsOpen(false)}
                enabledModels={enabledModels}
                onToggleModel={handleToggleModel}
            />
        </div>
    );
}


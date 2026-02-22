'use client';

import { Brain, CircleNotch, GlobeIcon, PlusCircle, SidebarSimple, UsersThree } from '@phosphor-icons/react';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import rehypeKatex from 'rehype-katex';
// Streamdown Plugins
import remarkMath from 'remark-math';
// AI Elements Imports
import {
    Conversation,
    ConversationContent,
    ConversationEmptyState,
    ConversationScrollButton,
} from '@/components/ai-elements/conversation';
import type { MessageResponseProps } from '@/components/ai-elements/message';
import { Message, MessageContent, MessageResponse } from '@/components/ai-elements/message';
import type { PromptInputMessage } from '@/components/ai-elements/prompt-input';
import {
    PromptInput,
    PromptInputActionAddAttachments,
    PromptInputActionMenu,
    PromptInputActionMenuContent,
    PromptInputActionMenuTrigger,
    PromptInputAttachment,
    PromptInputAttachments,
    PromptInputBody,
    PromptInputButton,
    PromptInputFooter,
    PromptInputHeader,
    PromptInputSelect,
    PromptInputSelectContent,
    PromptInputSelectItem,
    PromptInputSelectTrigger,
    PromptInputSelectValue,
    PromptInputSubmit,
    PromptInputTextarea,
    PromptInputTools,
} from '@/components/ai-elements/prompt-input';
import { Reasoning } from '@/components/ai-elements/reasoning';
import { AddModelsModal } from '@/components/chat/add-models-modal';
import { ChatSidebar } from '@/components/chat/chat-sidebar';
import { ContextMenuMessage } from '@/components/chat/context-menu-message';
import { KeyboardShortcuts } from '@/components/chat/keyboard-shortcuts';
import { LiveButton } from '@/components/chat/live-button';
import { type YulaMode, resolveMode } from '@/components/chat/model-picker';
import { VoiceButton } from '@/components/chat/voice-button';
import { CouncilChatSheet } from '@/components/council/council-chat-sheet';
import { SpotlightOverlay } from '@/components/onboarding/spotlight-overlay';
import { PACToastWrapper } from '@/components/pac/pac-toast-wrapper';
import { useOnboardingStore } from '@/lib/stores/onboarding-store';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { type ChatMessage, type MemoryDecision, useStreamingChat } from '@/hooks/useStreamingChat';
import { cn } from '@/lib/utils';
import 'katex/dist/katex.min.css'; // Ensure katex CSS is imported for math rendering

const REMARK_PLUGINS = [remarkMath] as unknown as NonNullable<MessageResponseProps['plugins']>;
const REHYPE_PLUGINS = [rehypeKatex] as unknown as NonNullable<
    MessageResponseProps['rehypePlugins']
>;

type StoredChatMessage = {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    createdAt: string;
    decision?: MemoryDecision | null;
};

interface Chat {
    id: string;
    title: string;
    modelPreference: string | null;
    createdAt: string;
    updatedAt: string;
    messages?: StoredChatMessage[];
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export default function ChatPage() {
    const params = useParams();
    const router = useRouter();
    const { isLoaded, isSignedIn } = useAuth();
    const chatId = params.id as string;

    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Open sidebar by default on desktop
    useEffect(() => {
        if (window.innerWidth >= 768) {
            setSidebarOpen(true);
        }
    }, []);
    const [chat, setChat] = useState<Chat | null>(null);
    const [chats, setChats] = useState<Chat[]>([]);
    const [isLoadingChat, setIsLoadingChat] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [isAddModelsOpen, setIsAddModelsOpen] = useState(false);
    const [enabledModels, setEnabledModels] = useState<string[]>([]);
    const [mode, setMode] = useState<YulaMode>('auto');
    const [webSearch, setWebSearch] = useState(false);
    const [councilOpen, setCouncilOpen] = useState(false);

    const handleToggleModel = (modelId: string) => {
        setEnabledModels((prev) =>
            prev.includes(modelId) ? prev.filter((id) => id !== modelId) : [...prev, modelId]
        );
    };

    const { messages, isStreaming, sendMessage, error: streamError } = useStreamingChat(chatId);
    const { hasCompleted, hasSkipped, isActive: onboardingActive, startOnboarding: startTour } = useOnboardingStore();

    // First-visit detection: show spotlight overlay if user hasn't completed or skipped onboarding
    useEffect(() => {
        if (isLoaded && isSignedIn && !hasCompleted && !hasSkipped && !onboardingActive) {
            startTour();
        }
    }, [isLoaded, isSignedIn, hasCompleted, hasSkipped, onboardingActive, startTour]);

    // Sync mode from chat preference (map stored model to mode)
    useEffect(() => {
        // Chat stores internal model IDs - no need to sync to mode
        // Mode is user-facing only and defaults to 'auto'
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

    // Initial messages from chat load
    const [initialMessages, setInitialMessages] = useState<ChatMessage[]>([]);

    useEffect(() => {
        if (chat?.messages) {
            const converted: ChatMessage[] = chat.messages.map((m) => ({
                id: m.id,
                role: m.role,
                content: m.content,
                timestamp: new Date(m.createdAt),
                decision: m.decision ?? undefined,
            }));
            setInitialMessages(converted);
        }
    }, [chat]);

    const allMessages: ChatMessage[] = [...initialMessages, ...messages];

    const handleNewChat = useCallback(async () => {
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
    }, [router]);

    const handleModeChange = useCallback(
        (newMode: YulaMode) => {
            setMode(newMode);
        },
        []
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
            if (e.metaKey && e.shiftKey && e.key === 'c') {
                e.preventDefault();
                setCouncilOpen((prev) => !prev);
                return;
            }
        };

        window.addEventListener('keydown', handleGlobalKeyDown);
        return () => window.removeEventListener('keydown', handleGlobalKeyDown);
    }, [handleNewChat]);

    // Handle PromptInput submission
    const handleSubmit = useCallback(
        async (message: PromptInputMessage) => {
            const text = webSearch ? `[Search] ${message.text}` : message.text;
            const resolvedModel = resolveMode(mode);
            await sendMessage(text, resolvedModel ? { model: resolvedModel } : {});
        },
        [mode, sendMessage, webSearch]
    );

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
                    currentChatId={chatId}
                    onNewChat={handleNewChat}
                    onSelectChat={(id) => {
                        router.push(`/chat/${id}`);
                        if (window.innerWidth < 768) setSidebarOpen(false);
                    }}
                />
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 h-full flex flex-col relative z-10 w-full min-w-0">
                {/* Header - simplified: sidebar toggle + new chat */}
                <div className="flex items-center justify-between p-3 border-b border-border flex-none bg-background z-20 w-full">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    >
                        <SidebarSimple className="w-4 h-4" />
                    </Button>

                    <div className="flex items-center gap-1">
                        <LiveButton />
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleNewChat}
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        >
                            <PlusCircle className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                {/* Conversation Area */}
                <div className="flex-1 flex flex-col min-h-0 relative">
                    <Conversation>
                        <ConversationContent className="max-w-3xl mx-auto w-full">
                            {allMessages.length === 0 && !isLoadingChat && !error ? (
                                <ConversationEmptyState
                                    icon={
                                        <Brain
                                            className="w-12 h-12 text-muted-foreground/50"
                                            weight="duotone"
                                        />
                                    }
                                    title="Start a conversation"
                                    description="Ask anything, analyze data, or generate ideas. Yula is here to help."
                                />
                            ) : (
                                allMessages.map((msg, index) => (
                                    <ContextMenuMessage
                                        key={msg.id || index}
                                        message={{
                                            id: msg.id,
                                            content: msg.content,
                                            role: msg.role,
                                        }}
                                    >
                                        <Message from={msg.role}>
                                            {msg.role === 'assistant' &&
                                                msg.decision?.reasoning && (
                                                    <Reasoning
                                                        isStreaming={
                                                            isStreaming &&
                                                            index === allMessages.length - 1
                                                        }
                                                    >
                                                        {msg.decision.reasoning}
                                                    </Reasoning>
                                                )}
                                            <MessageContent>
                                                <MessageResponse
                                                    plugins={REMARK_PLUGINS}
                                                    rehypePlugins={REHYPE_PLUGINS}
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
                <div className="p-2 sm:p-4 flex-none z-20 max-w-3xl mx-auto w-full">
                    <PromptInput
                        onSubmit={handleSubmit}
                        className="border border-border rounded-2xl"
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
                                <PromptInputButton
                                    variant={councilOpen ? 'default' : 'ghost'}
                                    onClick={() => setCouncilOpen(true)}
                                    size="icon-sm"
                                    className="gap-2 px-2 w-auto"
                                >
                                    <UsersThree size={16} />
                                    <span className="text-xs">Council</span>
                                </PromptInputButton>
                                {/* Mode Selector */}
                                <PromptInputSelect value={mode} onValueChange={(v) => handleModeChange(v as YulaMode)}>
                                    <PromptInputSelectTrigger>
                                        <PromptInputSelectValue placeholder="Auto" />
                                    </PromptInputSelectTrigger>
                                    <PromptInputSelectContent>
                                        <PromptInputSelectItem value="auto">Auto</PromptInputSelectItem>
                                        <PromptInputSelectItem value="smart">Smart</PromptInputSelectItem>
                                        <PromptInputSelectItem value="fast">Fast</PromptInputSelectItem>
                                        <PromptInputSelectItem value="creative">Creative</PromptInputSelectItem>
                                    </PromptInputSelectContent>
                                </PromptInputSelect>
                                <VoiceButton onTranscription={(text) => sendMessage(text, resolveMode(mode) ? { model: resolveMode(mode)! } : {})} />
                            </PromptInputTools>
                            <PromptInputSubmit status={isStreaming ? 'streaming' : undefined} />
                        </PromptInputFooter>
                    </PromptInput>
                    <div className="text-center mt-2 text-xs text-muted-foreground">
                        Yula can make mistakes. Check important info.
                    </div>
                </div>
            </div>

            {/* Council Panel */}
            <CouncilChatSheet isOpen={councilOpen} onClose={() => setCouncilOpen(false)} />

            {/* Keyboard Shortcuts Panel */}
            <KeyboardShortcuts />

            {/* PAC Notification Toasts */}
            <PACToastWrapper />

            {/* Onboarding Spotlight Overlay */}
            <SpotlightOverlay />

            <AddModelsModal
                isOpen={isAddModelsOpen}
                onClose={() => setIsAddModelsOpen(false)}
                enabledModels={enabledModels}
                onToggleModel={handleToggleModel}
            />
        </div>
    );
}

'use client';

import { CircleNotch, GlobeIcon, PlusCircle, SidebarSimple, UsersThree } from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import rehypeKatex from 'rehype-katex';
import remarkMath from 'remark-math';
import {
    Conversation,
    ConversationContent,
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
    usePromptInputController,
} from '@/components/ai-elements/prompt-input';
import { Reasoning } from '@/components/ai-elements/reasoning';
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
import { type ChatMessage, useStreamingChat } from '@/hooks/useStreamingChat';
import { cn } from '@/lib/utils';
import 'katex/dist/katex.min.css';

const REMARK_PLUGINS = [remarkMath] as unknown as NonNullable<MessageResponseProps['plugins']>;
const REHYPE_PLUGINS = [rehypeKatex] as unknown as NonNullable<
    MessageResponseProps['rehypePlugins']
>;

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

interface Chat {
    id: string;
    title: string;
    modelPreference: string | null;
    createdAt: string;
    updatedAt: string;
}

/** Voice button wired to PromptInput context */
function PromptVoiceButton() {
    const controller = usePromptInputController();
    return (
        <VoiceButton
            onTranscription={(text) => controller.textInput.setInput(text)}
        />
    );
}

const SUGGESTIONS = [
    { text: 'Analyze a complex document', sub: 'Upload and get insights' },
    { text: 'Help me write something', sub: 'Essays, emails, or code' },
    { text: 'Explain a concept', sub: 'Learn anything, step by step' },
];

export default function ChatIndexPage() {
    const router = useRouter();
    const { isLoaded, isSignedIn } = useAuth();

    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [chats, setChats] = useState<Chat[]>([]);
    const [mode, setMode] = useState<YulaMode>('auto');
    const [webSearch, setWebSearch] = useState(false);
    const [councilOpen, setCouncilOpen] = useState(false);

    const { messages, isStreaming, sendMessage, error: streamError } = useStreamingChat('new');
    const { hasCompleted, hasSkipped, isActive: onboardingActive, startOnboarding: startTour } = useOnboardingStore();

    // First-visit detection: show spotlight overlay if user hasn't completed or skipped onboarding
    useEffect(() => {
        if (isLoaded && isSignedIn && !hasCompleted && !hasSkipped && !onboardingActive) {
            startTour();
        }
    }, [isLoaded, isSignedIn, hasCompleted, hasSkipped, onboardingActive, startTour]);

    // Open sidebar by default on desktop
    useEffect(() => {
        if (window.innerWidth >= 768) {
            setSidebarOpen(true);
        }
    }, []);

    // Redirect to login if not signed in
    useEffect(() => {
        if (isLoaded && !isSignedIn) {
            router.push('/login');
        }
    }, [isLoaded, isSignedIn, router]);

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

    const handleModeChange = useCallback((newMode: YulaMode) => {
        setMode(newMode);
    }, []);

    // Handle submission - create chat and redirect
    const handleSubmit = useCallback(
        async (message: PromptInputMessage) => {
            const text = webSearch ? `[Search] ${message.text}` : message.text;
            const resolvedModel = resolveMode(mode);
            await sendMessage(text, resolvedModel ? { model: resolvedModel } : {});
        },
        [mode, sendMessage, webSearch]
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

    if (!isLoaded) {
        return (
            <div className="h-screen flex items-center justify-center bg-background">
                <CircleNotch className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!isSignedIn) {
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

            {/* Main Chat Area */}
            <div className="flex-1 h-full flex flex-col relative z-10 w-full min-w-0">
                {/* Header */}
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
                            {messages.length === 0 ? (
                                /* Premium Empty State */
                                <div className="flex flex-col items-center justify-center h-full py-20">
                                    <div className="relative mb-8">
                                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-foreground/5 to-foreground/10 border border-border/50 flex items-center justify-center">
                                            <span className="text-2xl font-bold text-foreground/80">Y</span>
                                        </div>
                                        <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-background" />
                                    </div>

                                    <h1 className="text-2xl font-semibold text-foreground mb-2 tracking-tight">
                                        How can I help you?
                                    </h1>
                                    <p className="text-sm text-muted-foreground mb-10 max-w-sm text-center">
                                        Ask anything. I remember your preferences and learn from every conversation.
                                    </p>

                                    {/* Suggestion chips */}
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-xl">
                                        {SUGGESTIONS.map((s) => (
                                            <button
                                                key={s.text}
                                                onClick={() =>
                                                    handleSubmit({ text: s.text, attachments: [] })
                                                }
                                                className="group text-left p-4 rounded-2xl border border-border/60 hover:border-border hover:bg-muted/50 transition-all duration-200"
                                            >
                                                <span className="text-sm font-medium text-foreground group-hover:text-foreground">
                                                    {s.text}
                                                </span>
                                                <span className="block text-xs text-muted-foreground mt-1">
                                                    {s.sub}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                messages.map((msg: ChatMessage, index: number) => (
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
                                                            index === messages.length - 1
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
                                <PromptVoiceButton />
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
        </div>
    );
}

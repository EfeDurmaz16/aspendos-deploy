'use client';

import { CircleNotch, GlobeSimple, UsersThree } from '@phosphor-icons/react';
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
    PromptInputSubmit,
    PromptInputTextarea,
    PromptInputTools,
} from '@/components/ai-elements/prompt-input';
import { Reasoning } from '@/components/ai-elements/reasoning';
import { ContextMenuMessage } from '@/components/chat/context-menu-message';
import { KeyboardShortcuts } from '@/components/chat/keyboard-shortcuts';
import { ModePicker, resolveMode, type YulaMode } from '@/components/chat/model-picker';
import { VoiceButton } from '@/components/chat/voice-button';
import { CouncilChatSheet } from '@/components/council/council-chat-sheet';
import { IconRail } from '@/components/layout/icon-rail';
import { SpotlightOverlay } from '@/components/onboarding/spotlight-overlay';
import { PACToastWrapper } from '@/components/pac/pac-toast-wrapper';
import { useAuth } from '@/hooks/use-auth';
import { type ChatMessage, useStreamingChat } from '@/hooks/useStreamingChat';
import { useOnboardingStore } from '@/lib/stores/onboarding-store';
import 'katex/dist/katex.min.css';

const REMARK_PLUGINS = [remarkMath] as unknown as NonNullable<MessageResponseProps['plugins']>;
const REHYPE_PLUGINS = [rehypeKatex] as unknown as NonNullable<
    MessageResponseProps['rehypePlugins']
>;

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

const SUGGESTIONS = [
    { text: 'Analyze a complex document', sub: 'Upload and extract insights' },
    { text: 'Help me write something', sub: 'Essays, emails, or code' },
    { text: 'Explain a concept clearly', sub: 'Step by step, any topic' },
];

export default function ChatIndexPage() {
    const router = useRouter();
    const { isLoaded, isSignedIn } = useAuth();

    const [mode, setMode] = useState<YulaMode>('auto');
    const [webSearch, setWebSearch] = useState(false);
    const [councilOpen, setCouncilOpen] = useState(false);

    const { messages, isStreaming, sendMessage, error: streamError } = useStreamingChat('new');
    const {
        hasCompleted,
        hasSkipped,
        isActive: onboardingActive,
        startOnboarding: startTour,
    } = useOnboardingStore();

    useEffect(() => {
        if (isLoaded && isSignedIn && !hasCompleted && !hasSkipped && !onboardingActive) {
            startTour();
        }
    }, [isLoaded, isSignedIn, hasCompleted, hasSkipped, onboardingActive, startTour]);

    useEffect(() => {
        if (isLoaded && !isSignedIn) {
            router.push('/login');
        }
    }, [isLoaded, isSignedIn, router]);

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
            /* */
        }
    }, [router]);

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
            }
            if (e.metaKey && e.shiftKey && e.key === 'c') {
                e.preventDefault();
                setCouncilOpen((prev) => !prev);
            }
        };
        window.addEventListener('keydown', handleGlobalKeyDown);
        return () => window.removeEventListener('keydown', handleGlobalKeyDown);
    }, [handleNewChat]);

    if (!isLoaded) {
        return (
            <div className="h-screen flex items-center justify-center bg-background">
                <CircleNotch className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!isSignedIn) return null;

    return (
        <div className="h-screen bg-background overflow-hidden font-sans flex">
            {/* Icon Rail Sidebar */}
            <IconRail
                currentChatId="new"
                onNewChat={handleNewChat}
                onSelectChat={(id) => router.push(`/chat/${id}`)}
            />

            {/* Main Chat Area */}
            <div className="flex-1 h-full flex flex-col relative z-10 w-full min-w-0">
                {/* Conversation Area */}
                <div className="flex-1 flex flex-col min-h-0 relative">
                    <Conversation>
                        <ConversationContent className="max-w-2xl mx-auto w-full">
                            {messages.length === 0 ? (
                                <EmptyState onSubmit={handleSubmit} />
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
                                <div className="text-center py-3 text-muted-foreground text-sm bg-muted rounded-lg mx-auto max-w-md">
                                    {streamError}
                                </div>
                            )}
                        </ConversationContent>
                        <ConversationScrollButton />
                    </Conversation>
                </div>

                {/* Input Area */}
                <ChatInputArea
                    mode={mode}
                    onModeChange={setMode}
                    webSearch={webSearch}
                    onWebSearchToggle={() => setWebSearch(!webSearch)}
                    onCouncilToggle={() => setCouncilOpen(true)}
                    isStreaming={isStreaming}
                    onSubmit={handleSubmit}
                    sendMessage={sendMessage}
                    resolveMode={resolveMode}
                />
            </div>

            <CouncilChatSheet isOpen={councilOpen} onClose={() => setCouncilOpen(false)} />
            <KeyboardShortcuts />
            <PACToastWrapper />
            <SpotlightOverlay />
        </div>
    );
}

/* ─── Empty State ─── */

function EmptyState({ onSubmit }: { onSubmit: (msg: PromptInputMessage) => void }) {
    return (
        <div className="flex flex-col items-center justify-center h-full py-24 px-4">
            <div className="mb-10">
                <div className="w-10 h-10 rounded-lg bg-foreground flex items-center justify-center">
                    <span className="text-background font-semibold text-base tracking-tight">
                        Y
                    </span>
                </div>
            </div>

            <h1 className="text-xl font-medium text-foreground mb-1.5 tracking-tight">
                What can I help with?
            </h1>
            <p className="text-sm text-muted-foreground mb-12">
                Ask anything. I learn from every conversation.
            </p>

            <div className="flex flex-col gap-2 w-full max-w-sm">
                {SUGGESTIONS.map((s) => (
                    <button
                        type="button"
                        key={s.text}
                        onClick={() => onSubmit({ text: s.text, attachments: [] })}
                        className="group text-left px-4 py-3 rounded-xl border border-border hover:border-foreground/20 hover:bg-muted/40 transition-all duration-150"
                    >
                        <span className="text-[13px] font-medium text-foreground">{s.text}</span>
                        <span className="block text-[11px] text-muted-foreground mt-0.5">
                            {s.sub}
                        </span>
                    </button>
                ))}
            </div>
        </div>
    );
}

/* ─── Shared Chat Input ─── */

function ChatInputArea({
    mode,
    onModeChange,
    webSearch,
    onWebSearchToggle,
    onCouncilToggle,
    isStreaming,
    onSubmit,
    sendMessage,
    resolveMode: resolveFn,
}: {
    mode: YulaMode;
    onModeChange: (m: YulaMode) => void;
    webSearch: boolean;
    onWebSearchToggle: () => void;
    onCouncilToggle: () => void;
    isStreaming: boolean;
    onSubmit: (msg: PromptInputMessage) => void;
    sendMessage: (text: string, opts?: Record<string, unknown>) => Promise<unknown>;
    resolveMode: (mode: YulaMode) => string | undefined;
}) {
    return (
        <div className="p-3 sm:p-4 flex-none z-20 max-w-2xl mx-auto w-full">
            <PromptInput
                onSubmit={onSubmit}
                className="border border-border rounded-xl bg-background"
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
                            onClick={onWebSearchToggle}
                            size="icon-sm"
                            className="gap-1.5 px-2 w-auto"
                        >
                            <GlobeSimple size={14} />
                            <span className="text-[11px]">Search</span>
                        </PromptInputButton>
                        <PromptInputButton
                            variant="ghost"
                            onClick={onCouncilToggle}
                            size="icon-sm"
                            className="gap-1.5 px-2 w-auto"
                        >
                            <UsersThree size={14} />
                            <span className="text-[11px]">Council</span>
                        </PromptInputButton>
                        <ModePicker selectedMode={mode} onSelectMode={onModeChange} />
                        <VoiceButton
                            onTranscription={(text) =>
                                sendMessage(
                                    text,
                                    resolveFn(mode) ? { model: resolveFn(mode)! } : {}
                                )
                            }
                        />
                    </PromptInputTools>
                    <PromptInputSubmit status={isStreaming ? 'streaming' : undefined} />
                </PromptInputFooter>
            </PromptInput>
            <p className="text-center mt-2 text-[11px] text-muted-foreground/60">
                Yula can make mistakes. Check important info.
            </p>
        </div>
    );
}

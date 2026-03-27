'use client';

import { CircleNotch, GlobeSimple, UsersThree } from '@phosphor-icons/react';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import rehypeKatex from 'rehype-katex';
import remarkMath from 'remark-math';
import { Confirmation } from '@/components/ai-elements/confirmation';
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
    PromptInputSubmit,
    PromptInputTextarea,
    PromptInputTools,
} from '@/components/ai-elements/prompt-input';
import { Reasoning } from '@/components/ai-elements/reasoning';
import { Tool, ToolInput, ToolOutput } from '@/components/ai-elements/tool';
import { ContextMenuMessage } from '@/components/chat/context-menu-message';
import { KeyboardShortcuts } from '@/components/chat/keyboard-shortcuts';
import { ModePicker, resolveMode, type YulaMode } from '@/components/chat/model-picker';
import { VoiceButton } from '@/components/chat/voice-button';
import { CouncilChatSheet } from '@/components/council/council-chat-sheet';
import { IconRail } from '@/components/layout/icon-rail';
import { SpotlightOverlay } from '@/components/onboarding/spotlight-overlay';
import { PACToastWrapper } from '@/components/pac/pac-toast-wrapper';
import { useAuth } from '@/hooks/use-auth';
import { type ChatMessage, type MemoryDecision, useStreamingChat } from '@/hooks/useStreamingChat';
import { useOnboardingStore } from '@/lib/stores/onboarding-store';
import 'katex/dist/katex.min.css';

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

    const [chat, setChat] = useState<Chat | null>(null);
    const [isLoadingChat, setIsLoadingChat] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [mode, setMode] = useState<YulaMode>('auto');
    const [webSearch, setWebSearch] = useState(false);
    const [councilOpen, setCouncilOpen] = useState(false);

    const {
        messages,
        isStreaming,
        sendMessage,
        handleToolApproval,
        error: streamError,
    } = useStreamingChat(chatId);
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

    if (!isSignedIn) {
        router.push('/login');
        return null;
    }

    return (
        <div className="h-screen bg-background overflow-hidden font-sans flex">
            <IconRail
                currentChatId={chatId}
                onNewChat={handleNewChat}
                onSelectChat={(id) => router.push(`/chat/${id}`)}
            />

            <div className="flex-1 h-full flex flex-col relative z-10 w-full min-w-0">
                <div className="flex-1 flex flex-col min-h-0 relative">
                    <Conversation>
                        <ConversationContent className="max-w-2xl mx-auto w-full">
                            {allMessages.length === 0 && !isLoadingChat && !error ? (
                                <ConversationEmptyState
                                    title="Start a conversation"
                                    description="Ask anything. Yula is here to help."
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
                                            {msg.toolCalls?.map((tc) =>
                                                tc.state === 'approval-requested' ? (
                                                    <Confirmation
                                                        key={tc.id}
                                                        toolName={tc.name}
                                                        args={tc.args}
                                                        state="approval-requested"
                                                        onApprove={() =>
                                                            handleToolApproval(tc.id, true)
                                                        }
                                                        onDeny={() =>
                                                            handleToolApproval(tc.id, false)
                                                        }
                                                    />
                                                ) : tc.state === 'approval-responded' ? (
                                                    <Confirmation
                                                        key={tc.id}
                                                        toolName={tc.name}
                                                        state="approval-responded"
                                                        approved={tc.approval?.approved}
                                                    />
                                                ) : (
                                                    <Tool
                                                        key={tc.id}
                                                        name={tc.name}
                                                        state={tc.state}
                                                    >
                                                        <ToolInput data={tc.args} />
                                                        {tc.output != null ? (
                                                            <ToolOutput data={tc.output as Record<string, unknown>} />
                                                        ) : null}
                                                    </Tool>
                                                )
                                            )}
                                        </Message>
                                    </ContextMenuMessage>
                                ))
                            )}
                            {error && (
                                <div
                                    role="alert"
                                    className="text-center py-3 text-muted-foreground text-sm bg-muted rounded-lg mx-auto max-w-md"
                                >
                                    {error}
                                </div>
                            )}
                            {streamError && (
                                <div
                                    role="alert"
                                    className="text-center py-3 text-muted-foreground text-sm bg-muted rounded-lg mx-auto max-w-md"
                                >
                                    {streamError}
                                </div>
                            )}
                        </ConversationContent>
                        <ConversationScrollButton />
                    </Conversation>
                </div>

                <div className="p-3 sm:p-4 flex-none z-20 max-w-2xl mx-auto w-full">
                    <PromptInput
                        onSubmit={handleSubmit}
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
                                    onClick={() => setWebSearch(!webSearch)}
                                    size="icon-sm"
                                    className="gap-1.5 px-2 w-auto"
                                >
                                    <GlobeSimple size={14} />
                                    <span className="text-[11px]">Search</span>
                                </PromptInputButton>
                                <PromptInputButton
                                    variant="ghost"
                                    onClick={() => setCouncilOpen(true)}
                                    size="icon-sm"
                                    className="gap-1.5 px-2 w-auto"
                                >
                                    <UsersThree size={14} />
                                    <span className="text-[11px]">Council</span>
                                </PromptInputButton>
                                <ModePicker selectedMode={mode} onSelectMode={setMode} />
                                <VoiceButton
                                    onTranscription={(text) =>
                                        sendMessage(
                                            text,
                                            resolveMode(mode) ? { model: resolveMode(mode)! } : {}
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
            </div>

            <CouncilChatSheet isOpen={councilOpen} onClose={() => setCouncilOpen(false)} />
            <KeyboardShortcuts />
            <PACToastWrapper />
            <SpotlightOverlay />
        </div>
    );
}

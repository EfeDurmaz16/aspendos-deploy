'use client';

import { Brain, CircleNotch } from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { PromptInputBox } from '@/components/chat/prompt-input-box';
import { WelcomeGuide } from '@/components/onboarding';
import { useAuth } from '@/hooks/use-auth';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

interface Chat {
    id: string;
    title: string;
    modelPreference: string | null;
    createdAt: string;
    updatedAt: string;
}

export default function ChatIndexPage() {
    const router = useRouter();
    const { isLoaded, isSignedIn } = useAuth();
    const [_chats, setChats] = useState<Chat[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Redirect to login if not signed in (client-side only)
    useEffect(() => {
        if (isLoaded && !isSignedIn) {
            router.push('/login');
        }
    }, [isLoaded, isSignedIn, router]);

    useEffect(() => {
        if (!isLoaded || !isSignedIn) return;

        const loadChats = async () => {
            try {
                setIsLoading(true);
                const res = await fetch(`${API_BASE}/api/chat`, { credentials: 'include' });

                if (res.ok) {
                    const data = await res.json();
                    const chatList = data.chats || [];
                    setChats(chatList);

                    if (chatList.length > 0) {
                        router.push(`/chat/${chatList[0].id}`);
                    }
                }
            } catch {
                // Handle error silently
            } finally {
                setIsLoading(false);
            }
        };

        loadChats();
    }, [isLoaded, isSignedIn, router]);

    const handleNewChat = useCallback(() => {
        router.push('/chat/new');
    }, [router]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.metaKey && e.key === 'n') {
                e.preventDefault();
                handleNewChat();
            }

            if (
                e.key === '/' &&
                document.activeElement?.tagName !== 'TEXTAREA' &&
                document.activeElement?.tagName !== 'INPUT'
            ) {
                e.preventDefault();
                const input = document.querySelector('textarea, input') as
                    | HTMLTextAreaElement
                    | HTMLInputElement;
                input?.focus();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleNewChat]);

    // Show loading while checking auth or redirecting
    if (!isLoaded || !isSignedIn) {
        return (
            <div className="h-screen flex items-center justify-center bg-background">
                <CircleNotch className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="h-screen flex items-center justify-center bg-background">
                <div className="text-center">
                    <CircleNotch className="w-8 h-8 animate-spin text-muted-foreground mx-auto mb-4" />
                    <p className="text-sm text-muted-foreground">Loading your conversations...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
            {/* Onboarding for new users */}
            <WelcomeGuide />

            <div className="max-w-2xl w-full text-center space-y-10">
                {/* Header */}
                <div className="space-y-4 animate-fade-up opacity-0 animation-delay-100">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-muted mb-2 border border-border">
                        <Brain className="w-8 h-8 text-foreground" weight="regular" />
                    </div>
                    <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                        {(() => {
                            const hour = new Date().getHours();
                            const greeting =
                                hour < 12
                                    ? 'Good morning'
                                    : hour < 18
                                      ? 'Good afternoon'
                                      : 'Good evening';
                            return greeting;
                        })()}
                    </h1>
                </div>

                {/* Main Action */}
                <div className="max-w-xl mx-auto w-full animate-fade-up opacity-0 animation-delay-200">
                    <PromptInputBox
                        onSubmit={(text, _mode) => {
                            void text;
                            handleNewChat();
                        }}
                    />
                </div>

                {/* Suggestion Chips */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-3xl mx-auto pt-8 animate-fade-up opacity-0 animation-delay-300">
                    {[
                        'Analyze a complex PDF',
                        'Plan a weekend trip',
                        'Debug a React component',
                    ].map((hint) => (
                        <button
                            key={hint}
                            onClick={handleNewChat}
                            className="text-sm text-muted-foreground hover:text-foreground hover:bg-muted py-3 px-4 rounded-xl transition-all text-center border border-transparent hover:border-border"
                        >
                            &ldquo;{hint}&rdquo;
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}

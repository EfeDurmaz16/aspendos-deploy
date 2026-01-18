'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Plus, Brain, Lightning, Sparkle, CircleNotch } from '@phosphor-icons/react';

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
    const [chats, setChats] = useState<Chat[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);

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

    const handleNewChat = async () => {
        try {
            setIsCreating(true);
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
            // Handle error
        } finally {
            setIsCreating(false);
        }
    };

    // Show loading while checking auth or redirecting
    if (!isLoaded || !isSignedIn) {
        return (
            <div className="h-screen flex items-center justify-center bg-background gradient-mesh">
                <CircleNotch className="w-8 h-8 animate-spin text-zinc-400" />
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="h-screen flex items-center justify-center bg-background gradient-mesh">
                <div className="text-center">
                    <CircleNotch className="w-10 h-10 animate-spin text-zinc-400 mx-auto mb-4" />
                    <p className="text-sm text-zinc-500">Loading your conversations...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col items-center justify-center bg-background gradient-mesh px-4">
            <div className="max-w-md w-full text-center">
                {/* Logo with animation */}
                <div className="mb-10 animate-fade-up opacity-0">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-zinc-900 dark:bg-zinc-50 mb-6 animate-float glass">
                        <Brain className="w-10 h-10 text-white dark:text-zinc-900" weight="duotone" />
                    </div>
                    <h1 className="font-serif text-4xl font-bold text-zinc-900 dark:text-white mb-3">Welcome to Aspendos</h1>
                    <p className="text-zinc-500 dark:text-zinc-400">
                        Your AI assistant with cognitive memory
                    </p>
                </div>

                {/* Create Chat Button */}
                <div className="animate-fade-up opacity-0 animation-delay-100">
                    <Button
                        size="lg"
                        onClick={handleNewChat}
                        disabled={isCreating}
                        className="w-full max-w-xs gap-2 bg-zinc-900 dark:bg-zinc-50 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 rounded-full h-14 text-base shadow-lg hover:shadow-xl transition-all group"
                    >
                        {isCreating ? (
                            <CircleNotch className="w-5 h-5 animate-spin" />
                        ) : (
                            <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" weight="bold" />
                        )}
                        Start a new conversation
                    </Button>
                </div>

                {/* Features */}
                <div className="mt-12 grid grid-cols-1 gap-3 text-left animate-fade-up opacity-0 animation-delay-200">
                    <Feature
                        icon={<Brain className="w-5 h-5 text-emerald-500" weight="duotone" />}
                        title="Contextual Memory"
                        description="Remembers your preferences and past conversations"
                    />
                    <Feature
                        icon={<Lightning className="w-5 h-5 text-amber-500" weight="duotone" />}
                        title="Multi-Model Support"
                        description="Choose from GPT-4o, Claude, Gemini, and more"
                    />
                    <Feature
                        icon={<Sparkle className="w-5 h-5 text-purple-500" weight="duotone" />}
                        title="Tool Integration"
                        description="Connect to Figma, Notion, Slack, and GitHub"
                    />
                </div>

                {/* Quick tips */}
                <div className="mt-10 pt-8 border-t border-zinc-200 dark:border-zinc-800 animate-fade-up opacity-0 animation-delay-300">
                    <p className="text-xs text-zinc-400 uppercase tracking-widest mb-3">Pro Tips</p>
                    <p className="text-sm text-zinc-500">
                        Press <kbd className="px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded text-xs font-mono">⌘</kbd> + <kbd className="px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded text-xs font-mono">K</kbd> to quickly start a new chat
                    </p>
                </div>
            </div>
        </div>
    );
}

function Feature({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
    return (
        <div className="flex items-start gap-3 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-sm hover-lift transition-all">
            <div className="mt-0.5 p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800">{icon}</div>
            <div>
                <h3 className="font-medium text-sm text-zinc-900 dark:text-zinc-100">{title}</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{description}</p>
            </div>
        </div>
    );
}

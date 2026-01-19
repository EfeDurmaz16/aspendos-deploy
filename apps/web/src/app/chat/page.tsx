'use client';

import { Brain, CircleNotch, Lightning, Plus, Sparkle } from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
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

    const handleNewChat = () => {
        // Navigate immediately to /chat/new without creating chat ID
        // Chat will be created when user sends first message
        router.push('/chat/new');
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
        <div className="h-screen flex flex-col items-center justify-center bg-white dark:bg-zinc-950 px-4 relative overflow-hidden">
            {/* Gradient mesh background */}
            <div className="absolute inset-0 pointer-events-none -z-10">
                <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-gradient-to-br from-purple-100/20 to-transparent dark:from-purple-900/15 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-gradient-to-bl from-blue-100/20 to-transparent dark:from-blue-900/15 rounded-full blur-3xl" />
                <div className="absolute top-1/2 left-1/2 w-[400px] h-[400px] bg-gradient-to-tr from-emerald-100/15 to-transparent dark:from-emerald-900/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
            </div>

            <div className="max-w-md w-full text-center relative z-10">
                {/* Logo with animation */}
                <div className="mb-12 animate-fade-up opacity-0">
                    <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-gradient-to-br from-zinc-900 to-zinc-800 dark:from-zinc-50 dark:to-zinc-100 mb-8 animate-float shadow-2xl">
                        <Brain
                            className="w-12 h-12 text-white dark:text-zinc-900"
                            weight="duotone"
                        />
                    </div>
                    <h1 className="font-serif text-5xl font-bold text-zinc-900 dark:text-white mb-4">
                        Welcome to Aspendos
                    </h1>
                    <p className="text-lg text-zinc-600 dark:text-zinc-400">
                        Your AI assistant with cognitive memory
                    </p>
                </div>

                {/* Create Chat Button */}
                <div className="animate-fade-up opacity-0 animation-delay-100">
                    <Button
                        size="lg"
                        onClick={handleNewChat}
                        className="w-full max-w-xs gap-3 bg-gradient-to-br from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white rounded-2xl h-16 text-base font-semibold shadow-xl hover:shadow-2xl transition-all group"
                    >
                        <Plus
                            className="w-6 h-6 group-hover:rotate-90 transition-transform duration-300"
                            weight="bold"
                        />
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
                        Press{' '}
                        <kbd className="px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded text-xs font-mono">
                            ⌘
                        </kbd>{' '}
                        +{' '}
                        <kbd className="px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded text-xs font-mono">
                            K
                        </kbd>{' '}
                        to quickly start a new chat
                    </p>
                </div>
            </div>
        </div>
    );
}

function Feature({
    icon,
    title,
    description,
}: {
    icon: React.ReactNode;
    title: string;
    description: string;
}) {
    return (
        <div className="flex items-start gap-4 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/70 backdrop-blur hover:bg-white dark:hover:bg-zinc-900 hover:shadow-lg hover:border-zinc-300 dark:hover:border-zinc-700 transition-all group">
            <div className="mt-0.5 p-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 group-hover:bg-zinc-200 dark:group-hover:bg-zinc-700 transition-colors">
                {icon}
            </div>
            <div className="flex-1">
                <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 mb-1">
                    {title}
                </h3>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    {description}
                </p>
            </div>
        </div>
    );
}

'use client';

import { Brain, CircleNotch, Plus, ChatCircle, Cpu, Lightning, ArrowRight } from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

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
        <div className="min-h-screen bg-gradient-to-b from-white to-zinc-50 dark:from-zinc-950 dark:to-black relative overflow-hidden flex flex-col items-center justify-center p-4">
            {/* Subtle Gradient mesh backgrounds (Maia Clean) */}
            {/* Unified Maia Background */}
            <div className="absolute inset-0 pointer-events-none -z-10">
                <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-gradient-to-br from-purple-100/20 to-transparent dark:from-purple-900/15 rounded-full blur-3xl" />
                <div className="absolute top-1/3 right-1/4 w-[600px] h-[600px] bg-gradient-to-bl from-blue-100/15 to-transparent dark:from-blue-900/10 rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-1/2 w-[700px] h-[700px] bg-gradient-to-t from-emerald-100/10 to-transparent dark:from-emerald-900/5 rounded-full blur-3xl" />
            </div>

            <div className="max-w-2xl w-full text-center space-y-10 relative z-10">
                {/* Header */}
                <div className="space-y-4 animate-fade-up opacity-0 animation-delay-100">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white dark:bg-zinc-900 mb-2 shadow-sm border border-zinc-200 dark:border-zinc-800">
                        <Brain
                            className="w-8 h-8 text-zinc-900 dark:text-zinc-100"
                            weight="regular"
                        />
                    </div>
                    <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                        Good morning, Efe
                    </h1>
                </div>

                {/* Main Action */}
                <div className="max-w-xl mx-auto w-full animate-fade-up opacity-0 animation-delay-200">
                    <div className="relative flex flex-col bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 shadow-lg rounded-xl overflow-hidden transition-shadow hover:shadow-xl focus-within:ring-2 focus-within:ring-zinc-200 dark:focus-within:ring-zinc-800">
                        <textarea
                            placeholder="What's on your mind?"
                            className="w-full min-h-[60px] p-5 bg-transparent resize-none outline-none text-[16px] placeholder:text-muted-foreground/60 text-foreground"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleNewChat();
                                }
                            }}
                        />
                        <div className="flex items-center justify-between px-3 pb-3">
                            <div className="flex gap-2">
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:bg-muted/50 rounded-lg">
                                    <Plus className="w-4 h-4" />
                                </Button>
                            </div>
                            <Button
                                onClick={handleNewChat}
                                size="sm"
                                className="h-8 rounded-lg text-xs px-4"
                            >
                                Start Chat
                                <ArrowRight className="w-3.5 h-3.5 ml-2" />
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Capability Hints */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-3xl mx-auto pt-8 animate-fade-up opacity-0 animation-delay-300">
                    {['Analyze a complex PDF', 'Plan a weekend trip', 'Debug a React component'].map((hint) => (
                        <button
                            key={hint}
                            onClick={handleNewChat}
                            className="text-sm text-muted-foreground hover:text-foreground hover:bg-white/50 dark:hover:bg-zinc-800/50 py-3 px-4 rounded-xl transition-all text-center border border-transparent hover:border-zinc-200 dark:hover:border-zinc-800 hover:shadow-sm"
                        >
                            "{hint}"
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}


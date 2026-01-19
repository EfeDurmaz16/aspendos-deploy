'use client';

import { Brain, CircleNotch, Plus, ChatCircle, Cpu, Lightning } from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

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
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
            <div className="max-w-2xl w-full text-center space-y-10">
                {/* Header */}
                <div className="space-y-4">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-zinc-100 dark:bg-zinc-800 mb-2 shadow-sm ring-1 ring-zinc-200 dark:ring-zinc-700">
                        <Brain
                            className="w-8 h-8 text-zinc-900 dark:text-zinc-100"
                            weight="regular"
                        />
                    </div>
                    <h1 className="text-2xl font-semibold tracking-tight text-foreground font-serif">
                        Good morning, Efe
                    </h1>
                </div>

                {/* Main Action */}
                <div className="relative group max-w-xl mx-auto w-full">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-zinc-200 to-zinc-300 dark:from-zinc-700 dark:to-zinc-800 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
                    <div className="relative flex flex-col bg-background/80 backdrop-blur-xl border border-border/50 shadow-2xl shadow-zinc-200/50 dark:shadow-black/50 rounded-xl overflow-hidden">
                        <textarea
                            placeholder="What would you like to know?"
                            className="w-full min-h-[50px] p-4 bg-transparent resize-none outline-none text-[15px] placeholder:text-muted-foreground/60"
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
                                className="h-8 rounded-lg bg-foreground text-background hover:bg-foreground/90 text-xs px-4"
                            >
                                <ChatCircle weight="fill" className="w-3.5 h-3.5 mr-2" />
                                Start Chat
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Capability Hints */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-3xl mx-auto pt-8">
                    {['Analyze a complex PDF', 'Plan a weekend trip', 'Debug a React component'].map((hint) => (
                        <button
                            key={hint}
                            onClick={handleNewChat}
                            className="text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 py-2 px-3 rounded-lg transition-colors text-center border border-transparent hover:border-border/50"
                        >
                            "{hint}"
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}

function FeatureCard({
    icon,
    title,
    description,
}: {
    icon: React.ReactNode;
    title: string;
    description: string;
}) {
    return (
        <Card className="border-border/50 shadow-none hover:border-border/80 transition-colors bg-card/50">
            <CardHeader className="p-4 space-y-0 pb-2">
                <div className="mb-2 w-fit rounded-lg bg-background p-2 ring-1 ring-border/50">
                    {icon}
                </div>
                <CardTitle className="text-sm font-medium leading-none">{title}</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
                <CardDescription className="text-xs">{description}</CardDescription>
            </CardContent>
        </Card>
    );
}

function Kbd({ children }: { children: React.ReactNode }) {
    return (
        <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
            {children}
        </kbd>
    );
}

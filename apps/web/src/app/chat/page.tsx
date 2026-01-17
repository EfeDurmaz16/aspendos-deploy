'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Plus, ChatCircle, CircleNotch } from '@phosphor-icons/react';
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
    const { getToken, isLoaded, isSignedIn } = useAuth();
    const [chats, setChats] = useState<Chat[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);

    // Load chat list
    useEffect(() => {
        if (!isLoaded || !isSignedIn) return;

        const loadChats = async () => {
            try {
                setIsLoading(true);
                const token = await getToken();
                const res = await fetch(`${API_BASE}/api/chat`, {
                    headers: { Authorization: `Bearer ${token}` },
                });

                if (res.ok) {
                    const data = await res.json();
                    const chatList = data.chats || [];
                    setChats(chatList);

                    // If there are chats, redirect to the most recent one
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
    }, [isLoaded, isSignedIn, getToken, router]);

    // Create new chat
    const handleNewChat = async () => {
        try {
            setIsCreating(true);
            const token = await getToken();
            const res = await fetch(`${API_BASE}/api/chat`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
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

    // Show loading while checking for existing chats
    if (isLoading) {
        return (
            <div className="h-screen flex items-center justify-center bg-background">
                <CircleNotch className="w-8 h-8 animate-spin text-zinc-400" />
            </div>
        );
    }

    // Show welcome screen if no chats exist
    return (
        <div className="h-screen flex flex-col items-center justify-center bg-background px-4">
            <div className="max-w-md w-full text-center">
                {/* Logo */}
                <div className="mb-8">
                    <h1 className="font-serif text-4xl font-bold mb-2">ASPENDOS</h1>
                    <p className="text-zinc-500 dark:text-zinc-400">
                        AI assistant with cognitive memory
                    </p>
                </div>

                {/* Create Chat Button */}
                <Button
                    size="lg"
                    onClick={handleNewChat}
                    disabled={isCreating}
                    className="w-full max-w-xs gap-2 bg-zinc-900 dark:bg-zinc-50 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-900"
                >
                    {isCreating ? (
                        <CircleNotch className="w-5 h-5 animate-spin" />
                    ) : (
                        <Plus className="w-5 h-5" />
                    )}
                    Start a new conversation
                </Button>

                {/* Features */}
                <div className="mt-12 grid grid-cols-1 gap-4 text-left">
                    <Feature
                        icon={<ChatCircle className="w-5 h-5 text-emerald-500" />}
                        title="Contextual Memory"
                        description="Remembers your preferences and past conversations"
                    />
                    <Feature
                        icon={<ChatCircle className="w-5 h-5 text-blue-500" />}
                        title="Multi-Model Support"
                        description="Choose from GPT-4, Claude, Gemini, and more"
                    />
                    <Feature
                        icon={<ChatCircle className="w-5 h-5 text-purple-500" />}
                        title="Tool Integration"
                        description="Connect to Figma, Notion, Slack, and GitHub"
                    />
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
        <div className="flex items-start gap-3 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
            <div className="mt-0.5">{icon}</div>
            <div>
                <h3 className="font-medium text-sm text-zinc-900 dark:text-zinc-100">{title}</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">{description}</p>
            </div>
        </div>
    );
}

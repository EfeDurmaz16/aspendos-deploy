'use client';

import { CircleNotch, SidebarSimple, PlusCircle } from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { ChatSidebar } from '@/components/chat/chat-sidebar';
import { CouncilChat } from '@/components/council/council-chat';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

interface Chat {
    id: string;
    title: string;
    modelPreference: string | null;
    createdAt: string;
    updatedAt: string;
}

export default function CouncilPage() {
    const router = useRouter();
    const { isLoaded, isSignedIn } = useAuth();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [chats, setChats] = useState<Chat[]>([]);

    useEffect(() => {
        if (window.innerWidth >= 768) {
            setSidebarOpen(true);
        }
    }, []);

    useEffect(() => {
        if (isLoaded && !isSignedIn) {
            router.push('/login');
        }
    }, [isLoaded, isSignedIn, router]);

    useEffect(() => {
        if (!isLoaded || !isSignedIn) return;
        const loadChats = async () => {
            try {
                const res = await fetch(`${API_BASE}/api/chat`, { credentials: 'include' });
                if (res.ok) {
                    const data = await res.json();
                    setChats(data.chats || []);
                }
            } catch { /* Silently fail */ }
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
        } catch { /* Handle error */ }
    }, [router]);

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
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/40 z-30 md:hidden"
                    onClick={() => setSidebarOpen(false)}
                    onKeyDown={() => {}}
                    role="button"
                    tabIndex={-1}
                />
            )}

            <div
                className={cn(
                    'h-full bg-muted border-r border-border transition-all duration-300',
                    'fixed md:relative z-40 md:z-20',
                    sidebarOpen ? 'w-64' : 'w-0 overflow-hidden'
                )}
            >
                <ChatSidebar
                    chats={chats}
                    onNewChat={handleNewChat}
                    onSelectChat={(id) => {
                        router.push(`/chat/${id}`);
                        if (window.innerWidth < 768) setSidebarOpen(false);
                    }}
                />
            </div>

            <div className="flex-1 h-full flex flex-col relative z-10 w-full min-w-0">
                <div className="flex items-center justify-between p-3 border-b border-border flex-none bg-background z-20 w-full">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    >
                        <SidebarSimple className="w-4 h-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleNewChat}
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    >
                        <PlusCircle className="w-4 h-4" />
                    </Button>
                </div>

                <div className="flex-1 p-4 min-h-0">
                    <CouncilChat className="h-full" />
                </div>
            </div>
        </div>
    );
}

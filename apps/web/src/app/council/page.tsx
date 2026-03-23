'use client';

import { CircleNotch } from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect } from 'react';
import { CouncilChat } from '@/components/council/council-chat';
import { IconRail } from '@/components/layout/icon-rail';
import { useAuth } from '@/hooks/use-auth';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export default function CouncilPage() {
    const router = useRouter();
    const { isLoaded, isSignedIn } = useAuth();

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
            <IconRail onNewChat={handleNewChat} onSelectChat={(id) => router.push(`/chat/${id}`)} />

            <div className="flex-1 h-full flex flex-col relative z-10 w-full min-w-0 p-4">
                <CouncilChat className="h-full" />
            </div>
        </div>
    );
}

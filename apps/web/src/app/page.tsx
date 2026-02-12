'use client';

import { CircleNotch } from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';

export default function HomePage() {
    const router = useRouter();
    const { isLoaded, isSignedIn } = useAuth();

    useEffect(() => {
        if (!isLoaded) return;

        if (isSignedIn) {
            router.replace('/chat');
        } else {
            router.replace('/landing');
        }
    }, [isLoaded, isSignedIn, router]);

    return (
        <div className="h-screen flex items-center justify-center bg-background">
            <CircleNotch className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
    );
}

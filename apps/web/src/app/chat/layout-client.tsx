'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { SpotlightOverlay } from '@/components/onboarding/spotlight-overlay';
import { useOnboardingStore } from '@/lib/stores/onboarding-store';

export function ChatLayoutClient({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const { hasCompleted, hasSkipped, isActive } = useOnboardingStore();

    // Auto-redirect new users to onboarding
    useEffect(() => {
        if (!hasCompleted && !hasSkipped) {
            router.push('/onboarding');
        }
    }, [hasCompleted, hasSkipped, router]);

    return (
        <>
            {children}
            {isActive && <SpotlightOverlay />}
        </>
    );
}

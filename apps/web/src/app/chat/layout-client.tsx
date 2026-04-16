'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { SpotlightOverlay } from '@/components/onboarding/spotlight-overlay';
import { useOnboardingStore } from '@/lib/stores/onboarding-store';

export function ChatLayoutClient({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const { hasCompleted, hasSkipped, hasHydrated, isActive } = useOnboardingStore();

    // Redirect only when onboarding has not been finished and is not already active.
    useEffect(() => {
        if (!hasHydrated) {
            return;
        }

        if (!hasCompleted && !hasSkipped && !isActive) {
            router.replace('/onboarding');
        }
    }, [hasCompleted, hasSkipped, hasHydrated, isActive, router]);

    return (
        <>
            {children}
            {isActive && <SpotlightOverlay />}
        </>
    );
}

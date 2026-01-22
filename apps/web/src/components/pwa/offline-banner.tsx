'use client';

import { WifiOff } from 'lucide-react';
import { usePWA } from '@/hooks/use-pwa';

/**
 * Offline Status Banner
 *
 * Shows a banner when the user loses internet connection.
 * Automatically hides when connection is restored.
 */
export function OfflineBanner() {
    const { isOnline } = usePWA();

    if (isOnline) return null;

    return (
        <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 dark:bg-amber-600 text-amber-950">
            <div className="container mx-auto px-4 py-2">
                <div className="flex items-center justify-center gap-2 text-sm font-medium">
                    <WifiOff className="w-4 h-4" />
                    <span>You're offline. Some features may be limited.</span>
                </div>
            </div>
        </div>
    );
}

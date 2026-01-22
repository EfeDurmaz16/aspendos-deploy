'use client';

import { RefreshCw } from 'lucide-react';
import { usePWA } from '@/hooks/use-pwa';

/**
 * App Update Prompt
 *
 * Shows when a new version of the app is available.
 * Allows users to refresh to get the latest version.
 */
export function UpdatePrompt() {
    const { isUpdateAvailable, updateServiceWorker } = usePWA();

    if (!isUpdateAvailable) return null;

    return (
        <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-sm animate-in slide-in-from-bottom-4">
            <div className="bg-primary text-primary-foreground rounded-lg shadow-lg p-4">
                <div className="flex items-center gap-3">
                    <RefreshCw className="w-5 h-5 flex-shrink-0" />
                    <div className="flex-1">
                        <p className="text-sm font-medium">Update available</p>
                        <p className="text-xs opacity-90">Refresh to get the latest version</p>
                    </div>
                    <button
                        onClick={updateServiceWorker}
                        className="px-3 py-1.5 bg-primary-foreground text-primary text-sm font-medium rounded-md hover:opacity-90 transition-opacity"
                    >
                        Refresh
                    </button>
                </div>
            </div>
        </div>
    );
}

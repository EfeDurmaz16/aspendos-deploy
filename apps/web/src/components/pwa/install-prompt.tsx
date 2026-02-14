'use client';

import { Download, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { usePWA } from '@/hooks/use-pwa';

/**
 * PWA Install Prompt Banner
 *
 * Shows a non-intrusive banner prompting users to install the app.
 * Automatically hides after dismissal or installation.
 */
export function InstallPrompt() {
    const { isInstallable, isInstalled, promptInstall } = usePWA();
    const [isDismissed, setIsDismissed] = useState(false);
    const [isVisible, setIsVisible] = useState(false);

    // Check localStorage for previous dismissal
    useEffect(() => {
        const dismissed = localStorage.getItem('pwa-install-dismissed');
        if (dismissed) {
            const dismissedAt = parseInt(dismissed, 10);
            // Re-show after 7 days
            if (Date.now() - dismissedAt < 7 * 24 * 60 * 60 * 1000) {
                setIsDismissed(true);
            }
        }
    }, []);

    // Show banner after a delay
    useEffect(() => {
        if (!isInstallable || isInstalled || isDismissed) return;

        const timer = setTimeout(() => setIsVisible(true), 3000);
        return () => clearTimeout(timer);
    }, [isInstallable, isInstalled, isDismissed]);

    if (!isVisible) return null;

    const handleDismiss = () => {
        setIsVisible(false);
        setIsDismissed(true);
        localStorage.setItem('pwa-install-dismissed', Date.now().toString());
    };

    const handleInstall = async () => {
        const installed = await promptInstall();
        if (installed) {
            setIsVisible(false);
        }
    };

    return (
        <div className="fixed bottom-20 left-4 right-4 z-50 animate-in slide-in-from-bottom-4 md:left-auto md:right-4 md:max-w-sm">
            <div className="bg-card border border-border rounded-lg shadow-lg p-4">
                <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Download className="w-5 h-5 text-primary" />
                    </div>

                    <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm text-foreground">Install Yula</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Get quick access and offline support
                        </p>
                    </div>

                    <button
                        onClick={handleDismiss}
                        className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                        aria-label="Dismiss"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="mt-3 flex gap-2">
                    <button
                        onClick={handleDismiss}
                        className="flex-1 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                        Not now
                    </button>
                    <button
                        onClick={handleInstall}
                        className="flex-1 px-3 py-1.5 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:bg-primary/90 transition-colors"
                    >
                        Install
                    </button>
                </div>
            </div>
        </div>
    );
}

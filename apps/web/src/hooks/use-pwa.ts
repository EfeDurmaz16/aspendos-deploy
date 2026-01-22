'use client';

import { useCallback, useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
    readonly platforms: string[];
    readonly userChoice: Promise<{
        outcome: 'accepted' | 'dismissed';
        platform: string;
    }>;
    prompt(): Promise<void>;
}

interface PWAState {
    isInstallable: boolean;
    isInstalled: boolean;
    isOnline: boolean;
    isUpdateAvailable: boolean;
}

/**
 * Hook for PWA functionality
 *
 * Provides:
 * - Install prompt detection and triggering
 * - Online/offline status
 * - Service worker update detection
 */
export function usePWA() {
    const [state, setState] = useState<PWAState>({
        isInstallable: false,
        isInstalled: false,
        isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
        isUpdateAvailable: false,
    });
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

    // Check if already installed
    useEffect(() => {
        if (typeof window === 'undefined') return;

        // Check display-mode for standalone PWA
        const isStandalone =
            window.matchMedia('(display-mode: standalone)').matches ||
            (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

        setState((prev) => ({ ...prev, isInstalled: isStandalone }));
    }, []);

    // Listen for install prompt
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
            setState((prev) => ({ ...prev, isInstallable: true }));
        };

        const handleAppInstalled = () => {
            setDeferredPrompt(null);
            setState((prev) => ({
                ...prev,
                isInstallable: false,
                isInstalled: true,
            }));
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.addEventListener('appinstalled', handleAppInstalled);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            window.removeEventListener('appinstalled', handleAppInstalled);
        };
    }, []);

    // Listen for online/offline events
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const handleOnline = () => setState((prev) => ({ ...prev, isOnline: true }));
        const handleOffline = () => setState((prev) => ({ ...prev, isOnline: false }));

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Listen for service worker updates
    useEffect(() => {
        if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

        navigator.serviceWorker.ready.then((registration) => {
            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                if (!newWorker) return;

                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        setState((prev) => ({ ...prev, isUpdateAvailable: true }));
                    }
                });
            });
        });
    }, []);

    // Trigger install prompt
    const promptInstall = useCallback(async (): Promise<boolean> => {
        if (!deferredPrompt) return false;

        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === 'accepted') {
            setDeferredPrompt(null);
            setState((prev) => ({ ...prev, isInstallable: false }));
            return true;
        }

        return false;
    }, [deferredPrompt]);

    // Update service worker
    const updateServiceWorker = useCallback(async () => {
        if (!('serviceWorker' in navigator)) return;

        const registration = await navigator.serviceWorker.ready;
        if (registration.waiting) {
            registration.waiting.postMessage({ type: 'SKIP_WAITING' });
            window.location.reload();
        }
    }, []);

    return {
        ...state,
        promptInstall,
        updateServiceWorker,
    };
}

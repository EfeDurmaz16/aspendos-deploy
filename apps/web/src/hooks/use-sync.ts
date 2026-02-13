'use client';

import { useCallback, useEffect, useState } from 'react';
import {
    getPendingCount,
    hasPendingChanges,
    performFullSync,
    quickSync,
    type SyncResult,
} from '@/lib/offline/sync-service';
import { usePWA } from './use-pwa';

export interface SyncState {
    isSyncing: boolean;
    lastSyncTime: Date | null;
    pendingCount: number;
    lastSyncResult: SyncResult | null;
    error: string | null;
}

/**
 * Hook for data synchronization
 *
 * Provides:
 * - Manual and automatic sync triggers
 * - Pending mutation tracking
 * - Sync status and history
 */
export function useSync(authToken: string | null) {
    const { isOnline } = usePWA();
    const [state, setState] = useState<SyncState>({
        isSyncing: false,
        lastSyncTime: null,
        pendingCount: 0,
        lastSyncResult: null,
        error: null,
    });

    // Update pending count periodically
    useEffect(() => {
        const updatePendingCount = async () => {
            const count = await getPendingCount();
            setState((prev) => ({ ...prev, pendingCount: count }));
        };

        updatePendingCount();
        const interval = setInterval(updatePendingCount, 10000); // Every 10s

        return () => clearInterval(interval);
    }, []);

    // Full sync - fetch all data from server
    const performFullSyncAction = useCallback(async () => {
        if (!authToken || !isOnline) {
            setState((prev) => ({
                ...prev,
                error: isOnline ? 'Not authenticated' : 'Offline',
            }));
            return;
        }

        setState((prev) => ({ ...prev, isSyncing: true, error: null }));

        try {
            const result = await performFullSync(authToken);
            const pendingCount = await getPendingCount();

            setState((prev) => ({
                ...prev,
                isSyncing: false,
                lastSyncTime: new Date(),
                lastSyncResult: result,
                pendingCount,
                error: result.success ? null : result.errors.join(', '),
            }));
        } catch (error) {
            setState((prev) => ({
                ...prev,
                isSyncing: false,
                error: error instanceof Error ? error.message : 'Sync failed',
            }));
        }
    }, [authToken, isOnline]);

    // Quick sync - only push pending mutations
    const performQuickSync = useCallback(async () => {
        if (!authToken || !isOnline) return;

        setState((prev) => ({ ...prev, isSyncing: true }));

        try {
            const success = await quickSync(authToken);
            const pendingCount = await getPendingCount();

            setState((prev) => ({
                ...prev,
                isSyncing: false,
                pendingCount,
                error: success ? null : 'Quick sync failed',
            }));
        } catch (error) {
            setState((prev) => ({
                ...prev,
                isSyncing: false,
                error: error instanceof Error ? error.message : 'Quick sync failed',
            }));
        }
    }, [authToken, isOnline]);

    // Auto-sync when coming back online
    useEffect(() => {
        if (isOnline && authToken) {
            // Quick sync on reconnection
            hasPendingChanges().then((hasPending) => {
                if (hasPending) {
                    performQuickSync();
                }
            });
        }
    }, [isOnline, authToken, performQuickSync]);

    return {
        ...state,
        isOnline,
        performFullSync: performFullSyncAction,
        performQuickSync,
    };
}

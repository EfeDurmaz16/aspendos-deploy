'use client';

import { Cloud, CloudOff, Loader2, RefreshCw } from 'lucide-react';
import { useSync } from '@/hooks/use-sync';

interface SyncStatusProps {
    authToken: string | null;
    compact?: boolean;
}

/**
 * Sync Status Indicator
 *
 * Shows sync state and allows manual sync trigger.
 */
export function SyncStatus({ authToken, compact = false }: SyncStatusProps) {
    const { isOnline, isSyncing, lastSyncTime, pendingCount, error, performFullSync } =
        useSync(authToken);

    if (compact) {
        return (
            <button
                onClick={performFullSync}
                disabled={!isOnline || isSyncing || !authToken}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                title={
                    !isOnline
                        ? 'Offline'
                        : isSyncing
                          ? 'Syncing...'
                          : pendingCount > 0
                            ? `${pendingCount} pending changes`
                            : 'Synced'
                }
            >
                {isSyncing ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                ) : isOnline ? (
                    <Cloud className="h-3 w-3" />
                ) : (
                    <CloudOff className="h-3 w-3" />
                )}
                {pendingCount > 0 && (
                    <span className="bg-amber-500 text-amber-950 text-[10px] px-1 rounded">
                        {pendingCount}
                    </span>
                )}
            </button>
        );
    }

    return (
        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    {isOnline ? (
                        <Cloud className="h-5 w-5 text-green-500" />
                    ) : (
                        <CloudOff className="h-5 w-5 text-amber-500" />
                    )}
                    <span className="font-medium text-foreground">
                        {isOnline ? 'Online' : 'Offline'}
                    </span>
                </div>

                <button
                    onClick={performFullSync}
                    disabled={!isOnline || isSyncing || !authToken}
                    className="flex items-center gap-1.5 px-2 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                    {isSyncing ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                        <RefreshCw className="h-3 w-3" />
                    )}
                    {isSyncing ? 'Syncing...' : 'Sync Now'}
                </button>
            </div>

            {pendingCount > 0 && (
                <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
                    <span className="bg-amber-500/20 px-2 py-0.5 rounded">
                        {pendingCount} pending
                    </span>
                    <span className="text-muted-foreground">Will sync when online</span>
                </div>
            )}

            {error && <p className="text-xs text-destructive">{error}</p>}

            {lastSyncTime && (
                <p className="text-xs text-muted-foreground">
                    Last synced: {lastSyncTime.toLocaleTimeString()}
                </p>
            )}
        </div>
    );
}

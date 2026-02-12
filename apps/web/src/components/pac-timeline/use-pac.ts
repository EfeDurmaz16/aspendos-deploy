'use client';

import { useCallback, useEffect, useMemo } from 'react';
import { type PACItem, type PACItemType, useYulaStore } from '@/stores/yula-store';

// Sample PAC items for demo
const samplePACItems: Omit<PACItem, 'id' | 'createdAt' | 'status'>[] = [
    {
        type: 'reminder',
        title: 'Flight check-in opens',
        description: 'Your flight to Tokyo (JAL 123) check-in opens in 2 hours',
        scheduledFor: new Date(Date.now() + 2 * 60 * 60 * 1000),
    },
    {
        type: 'suggestion',
        title: 'Take an umbrella',
        description: 'Rain expected this afternoon (70% chance)',
        scheduledFor: new Date(Date.now() + 4 * 60 * 60 * 1000),
    },
    {
        type: 'alert',
        title: 'Meeting in 30 minutes',
        description: 'Weekly sync with the team via Zoom',
        scheduledFor: new Date(Date.now() + 30 * 60 * 1000),
    },
    {
        type: 'suggestion',
        title: 'Review draft document',
        description: 'You mentioned wanting to review the Q1 report today',
        scheduledFor: new Date(Date.now() + 6 * 60 * 60 * 1000),
    },
    {
        type: 'reminder',
        title: 'Call Mom',
        description: "It's been a week since your last call",
        scheduledFor: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
];

// Type styling definitions
export const pacTypeStyles: Record<
    PACItemType,
    { color: string; bgColor: string; icon: string; label: string }
> = {
    reminder: {
        color: '#3b82f6',
        bgColor: 'bg-blue-500/10',
        icon: 'bell',
        label: 'Reminder',
    },
    suggestion: {
        color: '#f59e0b',
        bgColor: 'bg-amber-500/10',
        icon: 'lightbulb',
        label: 'Suggestion',
    },
    alert: {
        color: '#ef4444',
        bgColor: 'bg-red-500/10',
        icon: 'warning',
        label: 'Alert',
    },
};

export function usePAC() {
    const {
        pac,
        addPACItem,
        snoozePACItem,
        approvePACItem,
        dismissPACItem,
        togglePACExpanded,
        removePACItem,
    } = useYulaStore();

    // Initialize with sample data if empty (only on first mount, check localStorage)
    useEffect(() => {
        const hasInitialized = localStorage.getItem('yula-pac-initialized');
        if (!hasInitialized && pac.items.length === 0) {
            // Add sample items
            for (const item of samplePACItems) {
                addPACItem(item);
            }
            localStorage.setItem('yula-pac-initialized', 'true');
        }
    }, [addPACItem, pac.items.length]); // Only run once when empty

    // Helper to safely get time from Date or string
    const getTime = useCallback((date: Date | string | undefined): number => {
        if (!date) return 0;
        if (typeof date === 'string') return new Date(date).getTime();
        return date.getTime();
    }, []);

    // Get pending items (not dismissed or approved)
    const pendingItems = useMemo(() => {
        return pac.items
            .filter((item) => item.status === 'pending' || item.status === 'snoozed')
            .sort((a, b) => {
                // Sort by scheduled time, soonest first
                const timeA = getTime(a.scheduledFor);
                const timeB = getTime(b.scheduledFor);
                return timeA - timeB;
            });
    }, [pac.items, getTime]);

    // Get completed items (approved)
    const completedItems = useMemo(() => {
        return pac.items.filter((item) => item.status === 'approved');
    }, [pac.items]);

    // Get dismissed items
    const dismissedItems = useMemo(() => {
        return pac.items.filter((item) => item.status === 'dismissed');
    }, [pac.items]);

    // Get snoozed items
    const snoozedItems = useMemo(() => {
        return pac.items.filter((item) => item.status === 'snoozed');
    }, [pac.items]);

    // Get urgent items (within 1 hour)
    const urgentItems = useMemo(() => {
        const oneHourFromNow = Date.now() + 60 * 60 * 1000;
        return pendingItems.filter(
            (item) => item.scheduledFor && getTime(item.scheduledFor) <= oneHourFromNow
        );
    }, [pendingItems, getTime]);

    // Snooze for specific durations
    const snoozeFor = useCallback(
        (id: string, minutes: number) => {
            const until = new Date(Date.now() + minutes * 60 * 1000);
            snoozePACItem(id, until);
        },
        [snoozePACItem]
    );

    // Quick snooze options
    const snooze15Min = useCallback((id: string) => snoozeFor(id, 15), [snoozeFor]);
    const snooze1Hour = useCallback((id: string) => snoozeFor(id, 60), [snoozeFor]);
    const snoozeTomorrow = useCallback((id: string) => snoozeFor(id, 24 * 60), [snoozeFor]);

    // Get relative time string
    const getRelativeTime = useCallback((date: Date | string): string => {
        const now = Date.now();
        const dateObj = typeof date === 'string' ? new Date(date) : date;
        const diff = dateObj.getTime() - now;

        if (diff < 0) {
            return 'Overdue';
        }

        const minutes = Math.floor(diff / (60 * 1000));
        const hours = Math.floor(diff / (60 * 60 * 1000));
        const days = Math.floor(diff / (24 * 60 * 60 * 1000));

        if (minutes < 60) {
            return `in ${minutes} min`;
        }
        if (hours < 24) {
            return `in ${hours} hour${hours > 1 ? 's' : ''}`;
        }
        return `in ${days} day${days > 1 ? 's' : ''}`;
    }, []);

    // Add a new proactive item
    const addProactiveItem = useCallback(
        (type: PACItemType, title: string, description: string, scheduledFor?: Date) => {
            addPACItem({
                type,
                title,
                description,
                scheduledFor,
            });
        },
        [addPACItem]
    );

    return {
        // State
        items: pac.items,
        pendingItems,
        completedItems,
        dismissedItems,
        snoozedItems,
        urgentItems,
        isExpanded: pac.isExpanded,
        hasUrgentItems: urgentItems.length > 0,
        pendingCount: pendingItems.length,

        // Actions
        addItem: addProactiveItem,
        approve: approvePACItem,
        dismiss: dismissPACItem,
        snoozeFor,
        snooze15Min,
        snooze1Hour,
        snoozeTomorrow,
        remove: removePACItem,
        toggleExpanded: togglePACExpanded,

        // Helpers
        getRelativeTime,
        typeStyles: pacTypeStyles,
    };
}

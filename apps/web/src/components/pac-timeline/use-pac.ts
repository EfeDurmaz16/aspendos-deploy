'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { type PACItem, type PACItemType } from '@/stores/yula-store';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

type PACReminderApi = {
    id: string;
    content: string;
    type: 'EXPLICIT' | 'IMPLICIT';
    status: 'PENDING' | 'SNOOZED' | 'ACKNOWLEDGED' | 'DISMISSED' | 'COMPLETED';
    triggerAt: string;
    createdAt: string;
};

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
    const [items, setItems] = useState<PACItem[]>([]);
    const [isExpanded, setIsExpanded] = useState(true);

    const mapReminderToPACItem = useCallback((reminder: PACReminderApi): PACItem => {
        const mappedType: PACItemType = reminder.type === 'EXPLICIT' ? 'reminder' : 'suggestion';
        const mappedStatus =
            reminder.status === 'SNOOZED'
                ? 'snoozed'
                : reminder.status === 'DISMISSED'
                  ? 'dismissed'
                  : reminder.status === 'ACKNOWLEDGED' || reminder.status === 'COMPLETED'
                    ? 'approved'
                    : 'pending';

        return {
            id: reminder.id,
            type: mappedType,
            title: reminder.content,
            description:
                reminder.type === 'EXPLICIT' ? 'Scheduled reminder' : 'Proactive suggestion',
            scheduledFor: reminder.triggerAt ? new Date(reminder.triggerAt) : undefined,
            createdAt: new Date(reminder.createdAt),
            status: mappedStatus,
        };
    }, []);

    const refreshReminders = useCallback(async () => {
        try {
            const response = await fetch(`${API_BASE}/api/pac/reminders?limit=50`, {
                credentials: 'include',
            });
            if (!response.ok) return;

            const data = (await response.json()) as { reminders?: PACReminderApi[] };
            const nextItems = (data.reminders || []).map(mapReminderToPACItem);
            setItems(nextItems);
        } catch (error) {
            console.error('[PAC] Failed to fetch reminders:', error);
        }
    }, [mapReminderToPACItem]);

    useEffect(() => {
        refreshReminders();
        const interval = setInterval(refreshReminders, 30000);
        return () => clearInterval(interval);
    }, [refreshReminders]);

    // Helper to safely get time from Date or string
    const getTime = useCallback((date: Date | string | undefined): number => {
        if (!date) return 0;
        if (typeof date === 'string') return new Date(date).getTime();
        return date.getTime();
    }, []);

    // Get pending items (not dismissed or approved)
    const pendingItems = useMemo(() => {
        return items
            .filter((item) => item.status === 'pending' || item.status === 'snoozed')
            .sort((a, b) => {
                // Sort by scheduled time, soonest first
                const timeA = getTime(a.scheduledFor);
                const timeB = getTime(b.scheduledFor);
                return timeA - timeB;
            });
    }, [items, getTime]);

    // Get completed items (approved)
    const completedItems = useMemo(() => {
        return items.filter((item) => item.status === 'approved');
    }, [items]);

    // Get dismissed items
    const dismissedItems = useMemo(() => {
        return items.filter((item) => item.status === 'dismissed');
    }, [items]);

    // Get snoozed items
    const snoozedItems = useMemo(() => {
        return items.filter((item) => item.status === 'snoozed');
    }, [items]);

    // Get urgent items (within 1 hour)
    const urgentItems = useMemo(() => {
        const oneHourFromNow = Date.now() + 60 * 60 * 1000;
        return pendingItems.filter(
            (item) => item.scheduledFor && getTime(item.scheduledFor) <= oneHourFromNow
        );
    }, [pendingItems, getTime]);

    // Snooze for specific durations
    const snoozeFor = useCallback(
        async (id: string, minutes: number) => {
            try {
                const response = await fetch(`${API_BASE}/api/pac/reminders/${id}/snooze`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ minutes }),
                });
                if (response.ok) {
                    await refreshReminders();
                }
            } catch (error) {
                console.error('[PAC] Failed to snooze reminder:', error);
            }
        },
        [refreshReminders]
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
        async (type: PACItemType, title: string, _description: string, scheduledFor?: Date) => {
            const triggerAt =
                scheduledFor?.toISOString() || new Date(Date.now() + 60 * 60 * 1000).toISOString();
            try {
                const response = await fetch(`${API_BASE}/api/pac/reminders`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                        content: title,
                        type: type === 'reminder' ? 'EXPLICIT' : 'IMPLICIT',
                        triggerAt,
                    }),
                });
                if (response.ok) {
                    await refreshReminders();
                }
            } catch (error) {
                console.error('[PAC] Failed to create reminder:', error);
            }
        },
        [refreshReminders]
    );

    const approve = useCallback(
        async (id: string) => {
            try {
                const response = await fetch(`${API_BASE}/api/pac/reminders/${id}/complete`, {
                    method: 'PATCH',
                    credentials: 'include',
                });
                if (response.ok) {
                    setItems((prev) => prev.filter((item) => item.id !== id));
                }
            } catch (error) {
                console.error('[PAC] Failed to complete reminder:', error);
            }
        },
        [setItems]
    );

    const dismiss = useCallback(
        async (id: string) => {
            try {
                const response = await fetch(`${API_BASE}/api/pac/reminders/${id}/dismiss`, {
                    method: 'PATCH',
                    credentials: 'include',
                });
                if (response.ok) {
                    setItems((prev) => prev.filter((item) => item.id !== id));
                }
            } catch (error) {
                console.error('[PAC] Failed to dismiss reminder:', error);
            }
        },
        [setItems]
    );

    const remove = useCallback((id: string) => {
        setItems((prev) => prev.filter((item) => item.id !== id));
    }, []);

    const toggleExpanded = useCallback(() => {
        setIsExpanded((prev) => !prev);
    }, []);

    const addItem = useCallback(
        (type: PACItemType, title: string, description: string, scheduledFor?: Date) => {
            void addProactiveItem(type, title, description, scheduledFor);
        },
        [addProactiveItem]
    );

    return {
        // State
        items,
        pendingItems,
        completedItems,
        dismissedItems,
        snoozedItems,
        urgentItems,
        isExpanded,
        hasUrgentItems: urgentItems.length > 0,
        pendingCount: pendingItems.length,

        // Actions
        addItem,
        approve,
        dismiss,
        snoozeFor,
        snooze15Min,
        snooze1Hour,
        snoozeTomorrow,
        remove,
        toggleExpanded,

        // Helpers
        getRelativeTime,
        typeStyles: pacTypeStyles,
    };
}

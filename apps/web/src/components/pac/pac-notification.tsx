'use client';

import { AnimatePresence, motion } from 'framer-motion';
import {
    AlarmClock,
    Bell,
    CalendarClock,
    Check,
    ChevronRight,
    Clock,
    Sparkles,
    X,
} from 'lucide-react';
import * as React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * YULA OS PAC Notification Component
 * Design System v2.0 - Monolith Aesthetic
 *
 * Feature color: Electric Amber (#D97706)
 * Display and manage PAC reminders
 */

export type ReminderType = 'EXPLICIT' | 'IMPLICIT';
export type ReminderStatus = 'PENDING' | 'SNOOZED' | 'COMPLETED' | 'DISMISSED';
export type ReminderPriority = 'LOW' | 'MEDIUM' | 'HIGH';

export interface PACReminder {
    id: string;
    content: string;
    type: ReminderType;
    status: ReminderStatus;
    priority: ReminderPriority;
    triggerAt: Date;
    snoozeCount: number;
    conversationId?: string;
    conversationTitle?: string;
    createdAt: Date;
}

interface PACNotificationProps {
    reminder: PACReminder;
    onComplete: (id: string) => void;
    onDismiss: (id: string) => void;
    onSnooze: (id: string, duration: number) => void;
    onViewConversation?: (conversationId: string) => void;
    className?: string;
}

const SNOOZE_OPTIONS = [
    { label: '15 min', minutes: 15 },
    { label: '1 hour', minutes: 60 },
    { label: 'Tomorrow', minutes: 24 * 60 },
];

function formatRelativeTime(date: Date): string {
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));

    if (diffMins < 0) {
        const overdueMins = Math.abs(diffMins);
        if (overdueMins < 60) return `${overdueMins}m overdue`;
        if (overdueMins < 24 * 60) return `${Math.floor(overdueMins / 60)}h overdue`;
        return `${Math.floor(overdueMins / (24 * 60))}d overdue`;
    }

    if (diffMins < 60) return `in ${diffMins}m`;
    if (diffMins < 24 * 60) return `in ${Math.floor(diffMins / 60)}h`;
    return `in ${Math.floor(diffMins / (24 * 60))}d`;
}

export function PACNotification({
    reminder,
    onComplete,
    onDismiss,
    onSnooze,
    onViewConversation,
    className,
}: PACNotificationProps) {
    const [showSnoozeOptions, setShowSnoozeOptions] = React.useState(false);
    const isOverdue = new Date(reminder.triggerAt) < new Date();

    const priorityStyles = {
        LOW: 'border-zinc-200 dark:border-zinc-800',
        MEDIUM: 'border-feature-pac/30',
        HIGH: 'border-feature-pac ring-1 ring-feature-pac/20',
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: -20, scale: 0.95 }}
            className={cn(
                'rounded-[12px] border bg-white dark:bg-zinc-900 p-4 shadow-sm',
                priorityStyles[reminder.priority],
                isOverdue && 'bg-rose-50/50 dark:bg-rose-950/20',
                className
            )}
        >
            {/* Header */}
            <div className="flex items-start gap-3">
                <div
                    className={cn(
                        'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0',
                        isOverdue ? 'bg-rose-100 dark:bg-rose-900/30' : 'bg-feature-pac/10'
                    )}
                >
                    <Bell
                        className={cn(
                            'w-5 h-5',
                            isOverdue ? 'text-rose-600 dark:text-rose-400' : 'text-feature-pac'
                        )}
                    />
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <span
                            className={cn(
                                'text-xs font-medium px-1.5 py-0.5 rounded',
                                reminder.type === 'EXPLICIT'
                                    ? 'bg-feature-pac/10 text-feature-pac'
                                    : 'bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400'
                            )}
                        >
                            {reminder.type === 'EXPLICIT' ? 'Reminder' : 'Detected'}
                        </span>
                        {reminder.snoozeCount > 0 && (
                            <span className="text-xs text-zinc-400">
                                Snoozed {reminder.snoozeCount}x
                            </span>
                        )}
                    </div>

                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-1">
                        {reminder.content}
                    </p>

                    <div className="flex items-center gap-3 text-xs">
                        <span
                            className={cn(
                                'flex items-center gap-1',
                                isOverdue
                                    ? 'text-rose-600 dark:text-rose-400'
                                    : 'text-zinc-500 dark:text-zinc-400'
                            )}
                        >
                            <Clock className="w-3 h-3" />
                            {formatRelativeTime(new Date(reminder.triggerAt))}
                        </span>

                        {reminder.conversationTitle && onViewConversation && (
                            <button
                                onClick={() => onViewConversation(reminder.conversationId!)}
                                className="flex items-center gap-1 text-feature-pac hover:underline"
                            >
                                <Sparkles className="w-3 h-3" />
                                {reminder.conversationTitle}
                            </button>
                        )}
                    </div>
                </div>

                <button
                    onClick={() => onDismiss(reminder.id)}
                    className="p-1 rounded-[6px] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                    <X className="w-4 h-4" />
                    <span className="sr-only">Dismiss</span>
                </button>
            </div>

            {/* Actions */}
            <div className="mt-4 flex items-center gap-2">
                <Button
                    variant="pac"
                    size="sm"
                    onClick={() => onComplete(reminder.id)}
                    className="flex-1"
                >
                    <Check className="w-4 h-4 mr-1" />
                    Done
                </Button>

                <div className="relative">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowSnoozeOptions(!showSnoozeOptions)}
                    >
                        <AlarmClock className="w-4 h-4 mr-1" />
                        Snooze
                    </Button>

                    <AnimatePresence>
                        {showSnoozeOptions && (
                            <motion.div
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 5 }}
                                className="absolute bottom-full left-0 mb-2 bg-white dark:bg-zinc-900 rounded-[8px] border border-zinc-200 dark:border-zinc-800 shadow-lg py-1 z-10"
                            >
                                {SNOOZE_OPTIONS.map((option) => (
                                    <button
                                        key={option.minutes}
                                        onClick={() => {
                                            onSnooze(reminder.id, option.minutes);
                                            setShowSnoozeOptions(false);
                                        }}
                                        className="w-full px-3 py-1.5 text-sm text-left hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                                    >
                                        {option.label}
                                    </button>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </motion.div>
    );
}

// Notification List Component
interface PACNotificationListProps {
    reminders: PACReminder[];
    onComplete: (id: string) => void;
    onDismiss: (id: string) => void;
    onSnooze: (id: string, duration: number) => void;
    onViewConversation?: (conversationId: string) => void;
    className?: string;
}

export function PACNotificationList({
    reminders,
    onComplete,
    onDismiss,
    onSnooze,
    onViewConversation,
    className,
}: PACNotificationListProps) {
    const sortedReminders = React.useMemo(() => {
        return [...reminders].sort((a, b) => {
            // Overdue first
            const aOverdue = new Date(a.triggerAt) < new Date();
            const bOverdue = new Date(b.triggerAt) < new Date();
            if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;

            // Then by priority
            const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
            if (a.priority !== b.priority) {
                return priorityOrder[a.priority] - priorityOrder[b.priority];
            }

            // Then by trigger time
            return new Date(a.triggerAt).getTime() - new Date(b.triggerAt).getTime();
        });
    }, [reminders]);

    if (reminders.length === 0) {
        return (
            <div className={cn('text-center py-8', className)}>
                <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto mb-3">
                    <CalendarClock className="w-6 h-6 text-zinc-400" />
                </div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">No pending reminders</p>
                <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
                    YULA will notify you when you make commitments
                </p>
            </div>
        );
    }

    return (
        <div className={cn('space-y-3', className)}>
            <AnimatePresence mode="popLayout">
                {sortedReminders.map((reminder) => (
                    <PACNotification
                        key={reminder.id}
                        reminder={reminder}
                        onComplete={onComplete}
                        onDismiss={onDismiss}
                        onSnooze={onSnooze}
                        onViewConversation={onViewConversation}
                    />
                ))}
            </AnimatePresence>
        </div>
    );
}

// Toast-style notification for inline display
interface PACToastProps {
    reminder: PACReminder;
    onComplete: (id: string) => void;
    onDismiss: (id: string) => void;
    onSnooze: (id: string, duration: number) => void;
    onExpand: () => void;
}

export function PACToast({ reminder, onComplete, onDismiss, onSnooze, onExpand }: PACToastProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-4 right-4 z-50 max-w-sm"
        >
            <div className="rounded-[12px] border border-feature-pac/30 bg-white dark:bg-zinc-900 p-4 shadow-lg">
                <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-feature-pac/10 flex items-center justify-center flex-shrink-0">
                        <Bell className="w-4 h-4 text-feature-pac" />
                    </div>

                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 line-clamp-2">
                            {reminder.content}
                        </p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                            {formatRelativeTime(new Date(reminder.triggerAt))}
                        </p>
                    </div>

                    <button
                        onClick={() => onDismiss(reminder.id)}
                        className="p-1 rounded text-zinc-400 hover:text-zinc-600"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="mt-3 flex items-center gap-2">
                    <Button
                        variant="pac"
                        size="sm"
                        onClick={() => onComplete(reminder.id)}
                        className="flex-1"
                    >
                        <Check className="w-3 h-3 mr-1" />
                        Done
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => onSnooze(reminder.id, 60)}>
                        1h
                    </Button>
                    <Button variant="ghost" size="sm" onClick={onExpand}>
                        <ChevronRight className="w-4 h-4" />
                    </Button>
                </div>
            </div>
        </motion.div>
    );
}

export default PACNotification;

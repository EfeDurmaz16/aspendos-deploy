'use client';

import { useState, useEffect } from 'react';
import { X, MessageSquare, Bell, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { PACNotification } from '@/hooks/useNotifications';

interface NotificationToastProps {
    notification: PACNotification;
    onDismiss: () => void;
    onAction?: (chatId?: string) => void;
    autoDismiss?: number; // Auto dismiss after X ms
}

/**
 * Toast notification for PAC follow-ups
 */
export function NotificationToast({
    notification,
    onDismiss,
    onAction,
    autoDismiss = 10000, // 10 seconds default
}: NotificationToastProps) {
    const [isHovered, setIsHovered] = useState(false);
    const [progress, setProgress] = useState(100);

    // Auto dismiss timer
    useEffect(() => {
        if (autoDismiss <= 0 || isHovered) return;

        const startTime = Date.now();
        const interval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const remaining = Math.max(0, 100 - (elapsed / autoDismiss) * 100);
            setProgress(remaining);

            if (remaining === 0) {
                onDismiss();
            }
        }, 50);

        return () => clearInterval(interval);
    }, [autoDismiss, isHovered, onDismiss]);

    const handleClick = () => {
        onAction?.(notification.chatId);
        onDismiss();
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="relative overflow-hidden rounded-xl bg-white dark:bg-zinc-900 shadow-lg border border-zinc-200 dark:border-zinc-800 max-w-sm w-full"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Progress bar */}
            {autoDismiss > 0 && (
                <div className="absolute top-0 left-0 h-0.5 bg-indigo-500/20 w-full">
                    <motion.div
                        className="h-full bg-indigo-500"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            )}

            <div className="p-4">
                {/* Header */}
                <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-indigo-500/10">
                            <Bell className="w-4 h-4 text-indigo-500" />
                        </div>
                        <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                            Follow-up from Aspendos
                        </span>
                    </div>
                    <button
                        onClick={onDismiss}
                        className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                    >
                        <X className="w-4 h-4 text-zinc-400" />
                    </button>
                </div>

                {/* Content */}
                <h4 className="font-semibold text-zinc-900 dark:text-white mb-1">
                    {notification.title}
                </h4>
                <p className="text-sm text-zinc-600 dark:text-zinc-300 line-clamp-3">
                    {notification.body}
                </p>

                {/* Action */}
                {notification.chatId && (
                    <button
                        onClick={handleClick}
                        className="mt-3 flex items-center gap-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
                    >
                        <MessageSquare className="w-4 h-4" />
                        Continue Conversation
                        <ChevronRight className="w-4 h-4" />
                    </button>
                )}

                {/* Timestamp */}
                <div className="mt-2 text-xs text-zinc-400">
                    {new Date(notification.timestamp).toLocaleTimeString()}
                </div>
            </div>
        </motion.div>
    );
}

/**
 * Container for stacked notifications
 */
interface NotificationContainerProps {
    notifications: PACNotification[];
    onDismiss: (index: number) => void;
    onAction?: (chatId?: string) => void;
    position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

export function NotificationContainer({
    notifications,
    onDismiss,
    onAction,
    position = 'top-right',
}: NotificationContainerProps) {
    const positionClasses = {
        'top-right': 'top-4 right-4',
        'top-left': 'top-4 left-4',
        'bottom-right': 'bottom-4 right-4',
        'bottom-left': 'bottom-4 left-4',
    };

    return (
        <div
            className={`fixed z-50 ${positionClasses[position]} flex flex-col gap-3`}
        >
            <AnimatePresence mode="popLayout">
                {notifications.slice(0, 3).map((notification, index) => (
                    <NotificationToast
                        key={`${notification.taskId || index}-${notification.timestamp}`}
                        notification={notification}
                        onDismiss={() => onDismiss(index)}
                        onAction={onAction}
                    />
                ))}
            </AnimatePresence>

            {/* Show count if more than 3 */}
            {notifications.length > 3 && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center text-sm text-zinc-500 dark:text-zinc-400"
                >
                    +{notifications.length - 3} more notifications
                </motion.div>
            )}
        </div>
    );
}

export default NotificationToast;

'use client';

import {
    Bell,
    Brain,
    CaretDown,
    CaretRight,
    Check,
    Clock,
    Lightbulb,
    Warning,
    X,
} from '@phosphor-icons/react';
import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import type { PACItem, PACItemType } from '@/lib/pac/types';
import { cn } from '@/lib/utils';

// ============================================
// TYPE STYLES
// ============================================

const typeStyles: Record<PACItemType, { icon: typeof Bell; color: string; bgColor: string }> = {
    reminder: { icon: Bell, color: 'text-amber-400', bgColor: 'bg-amber-500/10' },
    suggestion: { icon: Lightbulb, color: 'text-amber-400', bgColor: 'bg-amber-500/10' },
    alert: { icon: Warning, color: 'text-red-400', bgColor: 'bg-red-500/10' },
    insight: { icon: Brain, color: 'text-amber-300', bgColor: 'bg-amber-400/10' },
};

// ============================================
// PAC ITEM COMPONENT
// ============================================

interface PACItemCardProps {
    item: PACItem;
    onDismiss: (id: string) => void;
    onSnooze: (id: string) => void;
    onAct: (id: string) => void;
}

function PACItemCard({ item, onDismiss, onSnooze, onAct }: PACItemCardProps) {
    const style = typeStyles[item.type];
    const Icon = style.icon;

    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className={cn(
                'p-3 rounded-lg border border-zinc-800 bg-zinc-900/50',
                'hover:border-zinc-700 transition-colors'
            )}
        >
            <div className="flex items-start gap-3">
                <div className={cn('p-2 rounded-lg', style.bgColor)}>
                    <Icon className={cn('h-4 w-4', style.color)} weight="fill" />
                </div>
                <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-white truncate">{item.title}</h4>
                    <p className="text-xs text-zinc-400 mt-1 line-clamp-2">{item.description}</p>
                    <div className="flex items-center gap-2 mt-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onAct(item.id)}
                            className="h-6 px-2 text-xs text-emerald-400 hover:text-emerald-300"
                        >
                            <Check className="h-3 w-3 mr-1" />
                            Done
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onSnooze(item.id)}
                            className="h-6 px-2 text-xs text-zinc-400 hover:text-zinc-300"
                        >
                            <Clock className="h-3 w-3 mr-1" />
                            Later
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onDismiss(item.id)}
                            className="h-6 px-2 text-xs text-zinc-500 hover:text-zinc-400"
                        >
                            <X className="h-3 w-3" />
                        </Button>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

// ============================================
// PAC NOTIFICATIONS SIDEBAR
// ============================================

interface PACNotificationsProps {
    className?: string;
    collapsed?: boolean;
    onToggleCollapse?: () => void;
}

export function PACNotifications({
    className,
    collapsed = false,
    onToggleCollapse,
}: PACNotificationsProps) {
    const [items, setItems] = useState<PACItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [isExpanded, setIsExpanded] = useState(true);

    useEffect(() => {
        const fetchNotifications = async () => {
            try {
                const response = await fetch('/api/notifications');
                if (response.ok) {
                    const data = await response.json();
                    setItems(data.notifications || []);
                }
            } catch (error) {
                console.error('Failed to fetch PAC notifications:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchNotifications();
    }, []);

    const pendingItems = items.filter((item) => item.status === 'pending');
    const urgentCount = pendingItems.filter((item) => item.priority === 'high').length;

    const handleDismiss = useCallback((id: string) => {
        setItems((prev) =>
            prev.map((item) => (item.id === id ? { ...item, status: 'dismissed' as const } : item))
        );
    }, []);

    const handleSnooze = useCallback((id: string) => {
        setItems((prev) =>
            prev.map((item) =>
                item.id === id
                    ? {
                          ...item,
                          status: 'snoozed' as const,
                          snoozedUntil: new Date(Date.now() + 30 * 60 * 1000),
                      }
                    : item
            )
        );
    }, []);

    const handleAct = useCallback((id: string) => {
        setItems((prev) =>
            prev.map((item) => (item.id === id ? { ...item, status: 'acted' as const } : item))
        );
    }, []);

    if (collapsed) {
        return (
            <button
                onClick={onToggleCollapse}
                className={cn(
                    'flex flex-col items-center gap-2 p-2 border-r border-zinc-800 bg-zinc-900/50',
                    className
                )}
            >
                <div className="relative">
                    <Bell className="h-5 w-5 text-zinc-400" />
                    {pendingItems.length > 0 && (
                        <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-blue-500 text-[10px] font-bold text-white flex items-center justify-center">
                            {pendingItems.length}
                        </span>
                    )}
                </div>
                <span className="text-[10px] text-zinc-500 writing-vertical">PAC</span>
            </button>
        );
    }

    return (
        <aside
            className={cn('w-72 border-r border-zinc-800 bg-zinc-900/50 flex flex-col', className)}
        >
            {/* Header */}
            <div className="p-3 border-b border-zinc-800">
                <div className="flex items-center justify-between">
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="flex items-center gap-2 text-sm font-medium text-white"
                    >
                        {isExpanded ? (
                            <CaretDown className="h-4 w-4" />
                        ) : (
                            <CaretRight className="h-4 w-4" />
                        )}
                        <Bell className="h-4 w-4 text-blue-400" weight="fill" />
                        <span>PAC Stream</span>
                        {pendingItems.length > 0 && (
                            <span className="ml-auto px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-xs">
                                {pendingItems.length}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={onToggleCollapse}
                        className="text-xs text-zinc-500 hover:text-zinc-300"
                    >
                        Hide
                    </button>
                </div>
                {urgentCount > 0 && (
                    <p className="text-xs text-red-400 mt-1">
                        {urgentCount} urgent notification{urgentCount > 1 ? 's' : ''}
                    </p>
                )}
            </div>

            {/* Items */}
            {isExpanded && (
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {loading ? (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-center py-8 text-zinc-500"
                        >
                            <Bell className="h-8 w-8 mx-auto mb-2 opacity-50 animate-pulse" />
                            <p className="text-sm">Loading notifications...</p>
                        </motion.div>
                    ) : (
                        <AnimatePresence>
                            {pendingItems.length > 0 ? (
                                pendingItems.map((item) => (
                                    <PACItemCard
                                        key={item.id}
                                        item={item}
                                        onDismiss={handleDismiss}
                                        onSnooze={handleSnooze}
                                        onAct={handleAct}
                                    />
                                ))
                            ) : (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="text-center py-8 text-zinc-500"
                                >
                                    <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                    <p className="text-sm">No notifications yet</p>
                                    <p className="text-xs mt-1">We'll nudge you when needed</p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    )}
                </div>
            )}
        </aside>
    );
}

export default PACNotifications;

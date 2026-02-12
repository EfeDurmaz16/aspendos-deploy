'use client';

import { Bell, CaretLeft, CaretRight, CheckCircle, Clock, Lightning } from '@phosphor-icons/react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { PACItemCard } from './pac-item';
import { usePAC } from './use-pac';

interface PACTimelineProps {
    className?: string;
    collapsed?: boolean;
    onToggleCollapse?: () => void;
}

export function PACTimeline({ className, collapsed = false, onToggleCollapse }: PACTimelineProps) {
    const {
        pendingItems,
        urgentItems,
        pendingCount,
        hasUrgentItems,
        approve,
        dismiss,
        snooze15Min,
        snooze1Hour,
        snoozeTomorrow,
        getRelativeTime,
    } = usePAC();

    // Collapsed view
    if (collapsed) {
        return (
            <motion.div
                initial={{ width: 60 }}
                animate={{ width: 60 }}
                className={cn(
                    'flex h-full flex-col items-center border-r border-white/5 bg-zinc-900/50 py-4',
                    className
                )}
            >
                <button
                    onClick={onToggleCollapse}
                    className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400 transition-colors hover:bg-violet-500/20"
                >
                    <CaretRight className="h-5 w-5" />
                </button>

                <div className="relative mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-white/5">
                    <Lightning className="h-5 w-5 text-zinc-400" weight="fill" />
                    {pendingCount > 0 && (
                        <span
                            className={cn(
                                'absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white',
                                hasUrgentItems ? 'bg-red-500' : 'bg-violet-500'
                            )}
                        >
                            {pendingCount}
                        </span>
                    )}
                </div>

                <span className="text-[10px] text-zinc-500">PAC</span>
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={{ width: 320 }}
            animate={{ width: 320 }}
            className={cn('flex h-full flex-col border-r border-white/5 bg-zinc-900/50', className)}
        >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
                <div className="flex items-center gap-3">
                    <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10">
                        <Lightning className="h-4 w-4 text-violet-400" weight="fill" />
                        {hasUrgentItems && (
                            <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-red-500">
                                <span className="absolute inset-0 animate-ping rounded-full bg-red-500 opacity-75" />
                            </span>
                        )}
                    </div>
                    <div>
                        <h2 className="text-sm font-semibold text-white">Future Stream</h2>
                        <p className="text-xs text-zinc-500">
                            {pendingCount} upcoming {pendingCount === 1 ? 'item' : 'items'}
                        </p>
                    </div>
                </div>
                <button
                    onClick={onToggleCollapse}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-white/5 hover:text-white"
                >
                    <CaretLeft className="h-4 w-4" />
                </button>
            </div>

            {/* Urgent section */}
            {urgentItems.length > 0 && (
                <div className="border-b border-white/5 px-4 py-3">
                    <div className="mb-2 flex items-center gap-2">
                        <Bell className="h-3.5 w-3.5 text-red-400" weight="fill" />
                        <span className="text-xs font-medium uppercase tracking-wider text-red-400">
                            Urgent
                        </span>
                    </div>
                    <div className="space-y-2">
                        {urgentItems.slice(0, 2).map((item) => (
                            <PACItemCard
                                key={item.id}
                                item={item}
                                relativeTime={
                                    item.scheduledFor ? getRelativeTime(item.scheduledFor) : 'Now'
                                }
                                onApprove={() => approve(item.id)}
                                onDismiss={() => dismiss(item.id)}
                                onSnooze15Min={() => snooze15Min(item.id)}
                                onSnooze1Hour={() => snooze1Hour(item.id)}
                                onSnoozeTomorrow={() => snoozeTomorrow(item.id)}
                                isUrgent
                                compact
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Main timeline */}
            <div className="flex-1 overflow-y-auto">
                <div className="p-4">
                    <div className="mb-3 flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5 text-zinc-500" />
                        <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                            Timeline
                        </span>
                    </div>

                    <AnimatePresence mode="popLayout">
                        {pendingItems.length > 0 ? (
                            <div className="space-y-3">
                                {pendingItems.map((item) => (
                                    <PACItemCard
                                        key={item.id}
                                        item={item}
                                        relativeTime={
                                            item.scheduledFor
                                                ? getRelativeTime(item.scheduledFor)
                                                : 'Anytime'
                                        }
                                        onApprove={() => approve(item.id)}
                                        onDismiss={() => dismiss(item.id)}
                                        onSnooze15Min={() => snooze15Min(item.id)}
                                        onSnooze1Hour={() => snooze1Hour(item.id)}
                                        onSnoozeTomorrow={() => snoozeTomorrow(item.id)}
                                        isUrgent={urgentItems.some((u) => u.id === item.id)}
                                    />
                                ))}
                            </div>
                        ) : (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="flex flex-col items-center justify-center py-12 text-center"
                            >
                                <CheckCircle
                                    className="mb-3 h-10 w-10 text-emerald-400"
                                    weight="fill"
                                />
                                <p className="text-sm font-medium text-zinc-300">All caught up!</p>
                                <p className="mt-1 text-xs text-zinc-500">
                                    No pending items in your future stream
                                </p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Footer */}
            <div className="border-t border-white/5 px-4 py-3">
                <p className="text-center text-[10px] text-zinc-600">
                    Proactive Agentic Callbacks (PAC)
                </p>
            </div>
        </motion.div>
    );
}

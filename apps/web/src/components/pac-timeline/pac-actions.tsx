'use client';

import { CaretDown, Check, Clock, X } from '@phosphor-icons/react';
import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface PACActionsProps {
    onApprove: () => void;
    onDismiss: () => void;
    onSnooze15Min: () => void;
    onSnooze1Hour: () => void;
    onSnoozeTomorrow: () => void;
    compact?: boolean;
}

export function PACActions({
    onApprove,
    onDismiss,
    onSnooze15Min,
    onSnooze1Hour,
    onSnoozeTomorrow,
    compact = false,
}: PACActionsProps) {
    const [showSnoozeOptions, setShowSnoozeOptions] = useState(false);

    if (compact) {
        return (
            <div className="flex items-center gap-1">
                <button
                    onClick={onApprove}
                    className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-400 transition-colors hover:bg-emerald-500/20"
                    title="Approve"
                >
                    <Check className="h-3.5 w-3.5" weight="bold" />
                </button>
                <button
                    onClick={onSnooze1Hour}
                    className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-500/10 text-amber-400 transition-colors hover:bg-amber-500/20"
                    title="Snooze 1 hour"
                >
                    <Clock className="h-3.5 w-3.5" />
                </button>
                <button
                    onClick={onDismiss}
                    className="flex h-6 w-6 items-center justify-center rounded-md bg-red-500/10 text-red-400 transition-colors hover:bg-red-500/20"
                    title="Dismiss"
                >
                    <X className="h-3.5 w-3.5" weight="bold" />
                </button>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-2">
            {/* Approve button */}
            <button
                onClick={onApprove}
                className={cn(
                    'flex items-center gap-1.5 rounded-lg px-3 py-1.5',
                    'bg-emerald-500/10 text-emerald-400 transition-colors',
                    'hover:bg-emerald-500/20'
                )}
            >
                <Check className="h-3.5 w-3.5" weight="bold" />
                <span className="text-xs font-medium">Approve</span>
            </button>

            {/* Snooze dropdown */}
            <div className="relative">
                <button
                    onClick={() => setShowSnoozeOptions(!showSnoozeOptions)}
                    className={cn(
                        'flex items-center gap-1.5 rounded-lg px-3 py-1.5',
                        'bg-amber-500/10 text-amber-400 transition-colors',
                        'hover:bg-amber-500/20'
                    )}
                >
                    <Clock className="h-3.5 w-3.5" />
                    <span className="text-xs font-medium">Snooze</span>
                    <CaretDown
                        className={cn(
                            'h-3 w-3 transition-transform',
                            showSnoozeOptions && 'rotate-180'
                        )}
                    />
                </button>

                <AnimatePresence>
                    {showSnoozeOptions && (
                        <motion.div
                            initial={{ opacity: 0, y: -4, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -4, scale: 0.95 }}
                            className={cn(
                                'absolute right-0 top-full z-10 mt-1 min-w-[120px]',
                                'rounded-lg border border-white/10 bg-zinc-900 py-1',
                                'shadow-xl shadow-black/30'
                            )}
                        >
                            <button
                                onClick={() => {
                                    onSnooze15Min();
                                    setShowSnoozeOptions(false);
                                }}
                                className="w-full px-3 py-1.5 text-left text-xs text-zinc-300 transition-colors hover:bg-white/5"
                            >
                                15 minutes
                            </button>
                            <button
                                onClick={() => {
                                    onSnooze1Hour();
                                    setShowSnoozeOptions(false);
                                }}
                                className="w-full px-3 py-1.5 text-left text-xs text-zinc-300 transition-colors hover:bg-white/5"
                            >
                                1 hour
                            </button>
                            <button
                                onClick={() => {
                                    onSnoozeTomorrow();
                                    setShowSnoozeOptions(false);
                                }}
                                className="w-full px-3 py-1.5 text-left text-xs text-zinc-300 transition-colors hover:bg-white/5"
                            >
                                Tomorrow
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Dismiss button */}
            <button
                onClick={onDismiss}
                className={cn(
                    'flex h-7 w-7 items-center justify-center rounded-lg',
                    'bg-white/5 text-zinc-500 transition-colors',
                    'hover:bg-red-500/10 hover:text-red-400'
                )}
                title="Dismiss"
            >
                <X className="h-3.5 w-3.5" weight="bold" />
            </button>
        </div>
    );
}

// Standalone action buttons for inline use
export function ApproveButton({ onClick }: { onClick: () => void }) {
    return (
        <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onClick}
            className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full',
                'bg-emerald-500/20 text-emerald-400 transition-colors',
                'hover:bg-emerald-500/30'
            )}
        >
            <Check className="h-4 w-4" weight="bold" />
        </motion.button>
    );
}

export function DismissButton({ onClick }: { onClick: () => void }) {
    return (
        <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onClick}
            className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full',
                'bg-red-500/20 text-red-400 transition-colors',
                'hover:bg-red-500/30'
            )}
        >
            <X className="h-4 w-4" weight="bold" />
        </motion.button>
    );
}

export function SnoozeButton({ onClick }: { onClick: () => void }) {
    return (
        <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onClick}
            className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full',
                'bg-amber-500/20 text-amber-400 transition-colors',
                'hover:bg-amber-500/30'
            )}
        >
            <Clock className="h-4 w-4" />
        </motion.button>
    );
}

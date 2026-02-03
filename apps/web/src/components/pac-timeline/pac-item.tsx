'use client';

import { motion } from 'framer-motion';
import { Bell, Lightbulb, Warning, Clock } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import type { PACItem as PACItemType, PACItemType as ItemType } from '@/stores/yula-store';
import { PACActions } from './pac-actions';
import { pacTypeStyles } from './use-pac';

interface PACItemCardProps {
    item: PACItemType;
    relativeTime: string;
    onApprove: () => void;
    onDismiss: () => void;
    onSnooze15Min: () => void;
    onSnooze1Hour: () => void;
    onSnoozeTomorrow: () => void;
    isUrgent?: boolean;
    compact?: boolean;
}

const typeIcons: Record<ItemType, typeof Bell> = {
    reminder: Bell,
    suggestion: Lightbulb,
    alert: Warning,
};

export function PACItemCard({
    item,
    relativeTime,
    onApprove,
    onDismiss,
    onSnooze15Min,
    onSnooze1Hour,
    onSnoozeTomorrow,
    isUrgent = false,
    compact = false,
}: PACItemCardProps) {
    const style = pacTypeStyles[item.type];
    const Icon = typeIcons[item.type];
    const isSnoozed = item.status === 'snoozed';

    if (compact) {
        return (
            <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className={cn(
                    'group flex items-center gap-3 rounded-lg p-2',
                    'border border-white/5 bg-white/[0.02] transition-colors',
                    'hover:border-white/10 hover:bg-white/[0.04]',
                    isUrgent && 'border-red-500/20 bg-red-500/5'
                )}
            >
                <div
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
                    style={{ backgroundColor: `${style.color}20` }}
                >
                    <Icon className="h-3.5 w-3.5" color={style.color} weight="fill" />
                </div>
                <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-zinc-300">{item.title}</p>
                    <p className="text-xs text-zinc-500">{relativeTime}</p>
                </div>
                <div className="opacity-0 transition-opacity group-hover:opacity-100">
                    <PACActions
                        onApprove={onApprove}
                        onDismiss={onDismiss}
                        onSnooze15Min={onSnooze15Min}
                        onSnooze1Hour={onSnooze1Hour}
                        onSnoozeTomorrow={onSnoozeTomorrow}
                        compact
                    />
                </div>
            </motion.div>
        );
    }

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className={cn(
                'relative overflow-hidden rounded-xl',
                'border border-white/10 bg-zinc-900/80 backdrop-blur-sm',
                'transition-all duration-200',
                isUrgent && 'border-red-500/30 ring-1 ring-red-500/20',
                isSnoozed && 'opacity-60'
            )}
        >
            {/* Urgent indicator */}
            {isUrgent && (
                <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-red-500 via-red-400 to-red-500" />
            )}

            {/* Snoozed indicator */}
            {isSnoozed && (
                <div className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5">
                    <Clock className="h-3 w-3 text-amber-400" />
                    <span className="text-[10px] text-amber-400">Snoozed</span>
                </div>
            )}

            <div className="p-4">
                {/* Header */}
                <div className="mb-3 flex items-start gap-3">
                    <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                        style={{ backgroundColor: `${style.color}15` }}
                    >
                        <Icon className="h-5 w-5" color={style.color} weight="fill" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                            <span
                                className="text-[10px] font-medium uppercase tracking-wider"
                                style={{ color: style.color }}
                            >
                                {style.label}
                            </span>
                            <span className="text-[10px] text-zinc-600">•</span>
                            <span className="text-[10px] text-zinc-500">{relativeTime}</span>
                        </div>
                        <h4 className="mt-0.5 font-medium text-white">{item.title}</h4>
                    </div>
                </div>

                {/* Description */}
                <p className="mb-4 text-sm leading-relaxed text-zinc-400">{item.description}</p>

                {/* Actions */}
                <PACActions
                    onApprove={onApprove}
                    onDismiss={onDismiss}
                    onSnooze15Min={onSnooze15Min}
                    onSnooze1Hour={onSnooze1Hour}
                    onSnoozeTomorrow={onSnoozeTomorrow}
                />
            </div>
        </motion.div>
    );
}

// Timeline connector line
export function TimelineConnector({ isLast = false }: { isLast?: boolean }) {
    return (
        <div className="absolute left-5 top-14 bottom-0 w-px">
            {!isLast && (
                <div className="h-full w-full bg-gradient-to-b from-white/10 to-transparent" />
            )}
        </div>
    );
}

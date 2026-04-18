'use client';

import { Brain, Briefcase, CalendarBlank, SlidersHorizontal, User, X } from '@phosphor-icons/react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { MemoryNodeCategory, MemoryNode as MemoryNodeType } from '@/stores/yula-store';
import { categoryColors } from './use-memory-graph';

interface MemoryNodeCardProps {
    node: MemoryNodeType;
    isSelected?: boolean;
    isHovered?: boolean;
    onSelect?: () => void;
    onClose?: () => void;
    showDetails?: boolean;
    connectedNodes?: MemoryNodeType[];
}

const categoryIcons: Record<MemoryNodeCategory, typeof User> = {
    person: User,
    project: Briefcase,
    date: CalendarBlank,
    preference: SlidersHorizontal,
    memory: Brain,
};

const categoryLabels: Record<MemoryNodeCategory, string> = {
    person: 'Person',
    project: 'Project',
    date: 'Date',
    preference: 'Preference',
    memory: 'Memory',
};

export function MemoryNodeCard({
    node,
    isSelected = false,
    isHovered = false,
    onSelect,
    onClose,
    showDetails = false,
    connectedNodes = [],
}: MemoryNodeCardProps) {
    const Icon = categoryIcons[node.category];
    const colors = categoryColors[node.category];

    if (showDetails) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className={cn(
                    'rounded-xl border border-border bg-card/95 backdrop-blur-xl',
                    'shadow-xl shadow-foreground/10',
                    'overflow-hidden'
                )}
            >
                {/* Header */}
                <div
                    className="flex items-center justify-between p-4"
                    style={{ backgroundColor: `${colors.bg}20` }}
                >
                    <div className="flex items-center gap-3">
                        <div
                            className="flex h-10 w-10 items-center justify-center rounded-lg"
                            style={{ backgroundColor: colors.bg }}
                        >
                            <Icon className="h-5 w-5 text-white" weight="fill" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-foreground">{node.label}</h3>
                            <p className="text-xs" style={{ color: colors.text }}>
                                {categoryLabels[node.category]}
                            </p>
                        </div>
                    </div>
                    {onClose && (
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </div>

                {/* Content */}
                {node.content && (
                    <div className="border-t border-border p-4">
                        <p className="text-sm text-foreground">{node.content}</p>
                    </div>
                )}

                {/* Connected Nodes */}
                {connectedNodes.length > 0 && (
                    <div className="border-t border-border p-4">
                        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                            Connected
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {connectedNodes.map((connected) => {
                                const ConnectedIcon = categoryIcons[connected.category];
                                const connectedColors = categoryColors[connected.category];
                                return (
                                    <button
                                        type="button"
                                        key={connected.id}
                                        onClick={() => onSelect?.()}
                                        className={cn(
                                            'flex items-center gap-1.5 rounded-full px-2.5 py-1',
                                            'text-xs transition-colors',
                                            'border border-border bg-foreground/5 hover:bg-foreground/10'
                                        )}
                                    >
                                        <ConnectedIcon
                                            className="h-3 w-3"
                                            color={connectedColors.bg}
                                            weight="fill"
                                        />
                                        <span className="text-foreground">{connected.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}
            </motion.div>
        );
    }

    // Compact node chip
    return (
        <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onSelect}
            className={cn(
                'flex items-center gap-2 rounded-lg px-3 py-2',
                'border transition-all duration-200',
                isSelected
                    ? 'border-border bg-foreground/10 shadow-lg'
                    : isHovered
                      ? 'border-border bg-foreground/5'
                      : 'border-border/50 bg-foreground/[0.02] hover:border-border hover:bg-foreground/5'
            )}
        >
            <div
                className="flex h-6 w-6 items-center justify-center rounded-md"
                style={{ backgroundColor: `${colors.bg}30` }}
            >
                <Icon className="h-3.5 w-3.5" color={colors.bg} weight="fill" />
            </div>
            <span
                className={cn('text-sm', isSelected ? 'text-foreground' : 'text-muted-foreground')}
            >
                {node.label}
            </span>
        </motion.button>
    );
}

// Mini node indicator for graph canvas
export function MemoryNodeIndicator({
    category,
    size = 'md',
}: {
    category: MemoryNodeCategory;
    size?: 'sm' | 'md' | 'lg';
}) {
    const colors = categoryColors[category];
    const Icon = categoryIcons[category];

    const sizeClasses = {
        sm: 'h-4 w-4',
        md: 'h-6 w-6',
        lg: 'h-8 w-8',
    };

    const iconSizes = {
        sm: 'h-2 w-2',
        md: 'h-3 w-3',
        lg: 'h-4 w-4',
    };

    return (
        <div
            className={cn('flex items-center justify-center rounded-full', sizeClasses[size])}
            style={{ backgroundColor: colors.bg }}
        >
            <Icon className={cn('text-white', iconSizes[size])} weight="fill" />
        </div>
    );
}

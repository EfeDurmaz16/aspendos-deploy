'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

// Level definitions matching the service
const LEVEL_CONFIG: Record<
    number,
    { name: string; icon: string; color: string; gradient: string }
> = {
    1: {
        name: 'Newcomer',
        icon: '🌱',
        color: 'text-foreground/60',
        gradient: 'from-foreground/30 to-foreground/50',
    },
    2: {
        name: 'Explorer',
        icon: '🧭',
        color: 'text-foreground/65',
        gradient: 'from-foreground/35 to-foreground/55',
    },
    3: {
        name: 'Conversationalist',
        icon: '💬',
        color: 'text-foreground/70',
        gradient: 'from-foreground/40 to-foreground/60',
    },
    4: {
        name: 'Power User',
        icon: '⚡',
        color: 'text-foreground/75',
        gradient: 'from-foreground/45 to-foreground/65',
    },
    5: {
        name: 'Yula Master',
        icon: '👑',
        color: 'text-foreground/80',
        gradient: 'from-foreground/50 to-foreground/70',
    },
    6: {
        name: 'AI Whisperer',
        icon: '✨',
        color: 'text-foreground/90',
        gradient: 'from-foreground/55 to-foreground/80',
    },
};

interface LevelBadgeProps {
    level: number;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    showName?: boolean;
    showLevel?: boolean;
    animated?: boolean;
    className?: string;
}

export function LevelBadge({
    level,
    size = 'md',
    showName = false,
    showLevel = true,
    animated = false,
    className,
}: LevelBadgeProps) {
    const config = LEVEL_CONFIG[level] || LEVEL_CONFIG[1];

    const sizeClasses = {
        sm: 'w-6 h-6 text-xs',
        md: 'w-8 h-8 text-sm',
        lg: 'w-12 h-12 text-lg',
        xl: 'w-16 h-16 text-2xl',
    };

    const iconSizes = {
        sm: 'text-sm',
        md: 'text-base',
        lg: 'text-xl',
        xl: 'text-3xl',
    };

    return (
        <div className={cn('flex items-center gap-2', className)}>
            {animated ? (
                <motion.div
                    className={cn(
                        'relative flex items-center justify-center rounded-full',
                        `bg-gradient-to-br ${config.gradient}`,
                        'shadow-lg',
                        sizeClasses[size]
                    )}
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                >
                    <span className={iconSizes[size]}>{config.icon}</span>
                    {showLevel && (
                        <span
                            className={cn(
                                'absolute -bottom-1 -right-1 flex items-center justify-center',
                                'bg-background border-2 border-background rounded-full',
                                'text-[10px] font-bold text-foreground',
                                size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'
                            )}
                        >
                            {level}
                        </span>
                    )}
                </motion.div>
            ) : (
                <div
                    className={cn(
                        'relative flex items-center justify-center rounded-full',
                        `bg-gradient-to-br ${config.gradient}`,
                        'shadow-lg',
                        sizeClasses[size]
                    )}
                >
                    <span className={iconSizes[size]}>{config.icon}</span>
                    {showLevel && (
                        <span
                            className={cn(
                                'absolute -bottom-1 -right-1 flex items-center justify-center',
                                'bg-background border-2 border-background rounded-full',
                                'text-[10px] font-bold text-foreground',
                                size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'
                            )}
                        >
                            {level}
                        </span>
                    )}
                </div>
            )}

            {showName && (
                <div className="flex flex-col">
                    <span className={cn('font-medium text-foreground', config.color)}>
                        {config.name}
                    </span>
                    <span className="text-xs text-muted-foreground">Level {level}</span>
                </div>
            )}
        </div>
    );
}

interface LevelUpAnimationProps {
    fromLevel: number;
    toLevel: number;
    onComplete?: () => void;
}

export function LevelUpAnimation({
    fromLevel: _fromLevel,
    toLevel,
    onComplete,
}: LevelUpAnimationProps) {
    const newConfig = LEVEL_CONFIG[toLevel] || LEVEL_CONFIG[1];

    return (
        <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            <motion.div
                className="flex flex-col items-center gap-6 p-8 rounded-2xl bg-background/95 border shadow-2xl"
                initial={{ scale: 0.5, y: 50 }}
                animate={{ scale: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            >
                <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                >
                    <LevelBadge level={toLevel} size="xl" />
                </motion.div>

                <motion.div
                    className="text-center"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                >
                    <h2 className="text-2xl font-bold text-foreground">Level Up!</h2>
                    <p className="text-muted-foreground mt-1">You&apos;re now a {newConfig.name}</p>
                </motion.div>

                <motion.button
                    className="px-6 py-2 rounded-lg bg-gradient-to-r from-foreground/70 to-foreground/90 text-white font-medium"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    onClick={onComplete}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                >
                    Continue
                </motion.button>
            </motion.div>
        </motion.div>
    );
}

export { LEVEL_CONFIG };

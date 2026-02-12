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
        color: 'text-emerald-500',
        gradient: 'from-emerald-400 to-emerald-600',
    },
    2: {
        name: 'Explorer',
        icon: '🧭',
        color: 'text-blue-500',
        gradient: 'from-blue-400 to-blue-600',
    },
    3: {
        name: 'Conversationalist',
        icon: '💬',
        color: 'text-purple-500',
        gradient: 'from-purple-400 to-purple-600',
    },
    4: {
        name: 'Power User',
        icon: '⚡',
        color: 'text-amber-500',
        gradient: 'from-amber-400 to-amber-600',
    },
    5: {
        name: 'YULA Master',
        icon: '👑',
        color: 'text-yellow-500',
        gradient: 'from-yellow-400 to-yellow-600',
    },
    6: {
        name: 'AI Whisperer',
        icon: '✨',
        color: 'text-rose-500',
        gradient: 'from-rose-400 via-pink-500 to-purple-600',
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

    const Badge = animated ? motion.div : 'div';
    const animationProps = animated
        ? {
              initial: { scale: 0, rotate: -180 },
              animate: { scale: 1, rotate: 0 },
              transition: { type: 'spring', stiffness: 200, damping: 15 },
          }
        : {};

    return (
        <div className={cn('flex items-center gap-2', className)}>
            <Badge
                className={cn(
                    'relative flex items-center justify-center rounded-full',
                    `bg-gradient-to-br ${config.gradient}`,
                    'shadow-lg',
                    sizeClasses[size]
                )}
                {...animationProps}
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
            </Badge>

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
                    className="px-6 py-2 rounded-lg bg-gradient-to-r from-violet-500 to-purple-600 text-white font-medium"
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

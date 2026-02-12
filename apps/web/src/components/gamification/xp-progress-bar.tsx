'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface XPProgressBarProps {
    currentXP: number;
    currentLevel: number;
    nextLevelXP: number;
    levelName: string;
    nextLevelName?: string;
    className?: string;
    showLabels?: boolean;
    size?: 'sm' | 'md' | 'lg';
}

export function XPProgressBar({
    currentXP,
    currentLevel,
    nextLevelXP,
    levelName,
    nextLevelName,
    className,
    showLabels = true,
    size = 'md',
}: XPProgressBarProps) {
    const progress = nextLevelXP > 0 ? Math.min((currentXP / nextLevelXP) * 100, 100) : 100;
    const isMaxLevel = nextLevelXP === 0;

    const sizeClasses = {
        sm: 'h-1.5',
        md: 'h-2.5',
        lg: 'h-4',
    };

    return (
        <div className={cn('w-full', className)}>
            {showLabels && (
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">
                            Level {currentLevel}
                        </span>
                        <span className="text-xs text-muted-foreground">{levelName}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                        {isMaxLevel ? (
                            <span className="text-amber-500 font-medium">Max Level!</span>
                        ) : (
                            <>
                                {currentXP.toLocaleString()} / {nextLevelXP.toLocaleString()} XP
                            </>
                        )}
                    </div>
                </div>
            )}

            <div className={cn('w-full rounded-full bg-muted overflow-hidden', sizeClasses[size])}>
                <motion.div
                    className={cn(
                        'h-full rounded-full',
                        isMaxLevel
                            ? 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500'
                            : 'bg-gradient-to-r from-violet-500 to-purple-600'
                    )}
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                />
            </div>

            {showLabels && nextLevelName && !isMaxLevel && (
                <div className="flex justify-end mt-1">
                    <span className="text-xs text-muted-foreground">Next: {nextLevelName}</span>
                </div>
            )}
        </div>
    );
}

interface XPGainAnimationProps {
    amount: number;
    action: string;
    onComplete?: () => void;
}

export function XPGainAnimation({ amount, action, onComplete }: XPGainAnimationProps) {
    return (
        <motion.div
            className="fixed bottom-24 right-8 z-50 pointer-events-none"
            initial={{ opacity: 0, y: 20, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            onAnimationComplete={onComplete}
        >
            <div className="bg-gradient-to-r from-violet-500 to-purple-600 text-white px-4 py-2 rounded-lg shadow-lg">
                <div className="flex items-center gap-2">
                    <motion.span
                        className="text-lg font-bold"
                        initial={{ scale: 1 }}
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 0.3 }}
                    >
                        +{amount} XP
                    </motion.span>
                    <span className="text-sm opacity-90">{action}</span>
                </div>
            </div>
        </motion.div>
    );
}

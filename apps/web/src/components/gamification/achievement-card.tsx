'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2Icon, LockIcon, TrophyIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

// Achievement category colors
const CATEGORY_COLORS: Record<string, { bg: string; border: string; text: string }> = {
    onboarding: {
        bg: 'bg-blue-500/10',
        border: 'border-blue-500/30',
        text: 'text-blue-500',
    },
    engagement: {
        bg: 'bg-green-500/10',
        border: 'border-green-500/30',
        text: 'text-green-500',
    },
    streaks: {
        bg: 'bg-orange-500/10',
        border: 'border-orange-500/30',
        text: 'text-orange-500',
    },
    mastery: {
        bg: 'bg-purple-500/10',
        border: 'border-purple-500/30',
        text: 'text-purple-500',
    },
    social: {
        bg: 'bg-pink-500/10',
        border: 'border-pink-500/30',
        text: 'text-pink-500',
    },
    secret: {
        bg: 'bg-amber-500/10',
        border: 'border-amber-500/30',
        text: 'text-amber-500',
    },
};

export interface Achievement {
    id: string;
    name: string;
    description: string;
    icon: string;
    category: string;
    xpReward: number;
    unlocked: boolean;
    unlockedAt?: string;
    progress?: number;
    maxProgress?: number;
}

interface AchievementCardProps {
    achievement: Achievement;
    onClick?: () => void;
    className?: string;
}

export function AchievementCard({ achievement, onClick, className }: AchievementCardProps) {
    const colors = CATEGORY_COLORS[achievement.category] || CATEGORY_COLORS.engagement;
    const hasProgress = achievement.progress !== undefined && achievement.maxProgress !== undefined;
    const progressPercent = hasProgress
        ? Math.min((achievement.progress! / achievement.maxProgress!) * 100, 100)
        : 0;

    return (
        <motion.button
            className={cn(
                'relative w-full p-4 rounded-xl border text-left transition-all',
                'hover:shadow-md focus:outline-none focus:ring-2 focus:ring-violet-500/50',
                achievement.unlocked
                    ? cn(colors.bg, colors.border)
                    : 'bg-muted/50 border-border opacity-60',
                className
            )}
            onClick={onClick}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
        >
            <div className="flex items-start gap-3">
                {/* Icon */}
                <div
                    className={cn(
                        'flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center text-2xl',
                        achievement.unlocked ? colors.bg : 'bg-muted'
                    )}
                >
                    {achievement.unlocked ? (
                        achievement.icon
                    ) : (
                        <LockIcon className="w-5 h-5 text-muted-foreground" />
                    )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <h3
                            className={cn(
                                'font-medium truncate',
                                achievement.unlocked ? 'text-foreground' : 'text-muted-foreground'
                            )}
                        >
                            {achievement.unlocked || !achievement.name.includes('Secret')
                                ? achievement.name
                                : '???'}
                        </h3>
                        {achievement.unlocked && (
                            <CheckCircle2Icon
                                className={cn('w-4 h-4 flex-shrink-0', colors.text)}
                            />
                        )}
                    </div>

                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                        {achievement.unlocked || !achievement.description.includes('Secret')
                            ? achievement.description
                            : 'Complete secret conditions to unlock'}
                    </p>

                    {/* Progress bar */}
                    {hasProgress && !achievement.unlocked && (
                        <div className="mt-2">
                            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                                <motion.div
                                    className="h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-600"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progressPercent}%` }}
                                />
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-1">
                                {achievement.progress} / {achievement.maxProgress}
                            </p>
                        </div>
                    )}
                </div>

                {/* XP Reward */}
                <div
                    className={cn(
                        'flex-shrink-0 px-2 py-1 rounded-md text-xs font-medium',
                        colors.bg,
                        colors.text
                    )}
                >
                    +{achievement.xpReward} XP
                </div>
            </div>

            {/* Unlocked date */}
            {achievement.unlocked && achievement.unlockedAt && (
                <p className="text-[10px] text-muted-foreground mt-2 text-right">
                    Unlocked {new Date(achievement.unlockedAt).toLocaleDateString()}
                </p>
            )}
        </motion.button>
    );
}

interface AchievementGridProps {
    achievements: Achievement[];
    onAchievementClick?: (achievement: Achievement) => void;
    className?: string;
}

export function AchievementGrid({
    achievements,
    onAchievementClick,
    className,
}: AchievementGridProps) {
    return (
        <div className={cn('grid grid-cols-1 sm:grid-cols-2 gap-3', className)}>
            {achievements.map((achievement) => (
                <AchievementCard
                    key={achievement.id}
                    achievement={achievement}
                    onClick={() => onAchievementClick?.(achievement)}
                />
            ))}
        </div>
    );
}

interface AchievementUnlockAnimationProps {
    achievement: Achievement;
    onComplete?: () => void;
}

export function AchievementUnlockAnimation({
    achievement,
    onComplete,
}: AchievementUnlockAnimationProps) {
    const colors = CATEGORY_COLORS[achievement.category] || CATEGORY_COLORS.engagement;

    return (
        <AnimatePresence>
            <motion.div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onComplete}
            >
                <motion.div
                    className={cn(
                        'flex flex-col items-center gap-4 p-8 rounded-2xl bg-background/95 border shadow-2xl max-w-sm mx-4',
                        colors.border
                    )}
                    initial={{ scale: 0.5, y: 50 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.5, y: 50 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <motion.div
                        className="flex items-center gap-2 text-amber-500"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                    >
                        <TrophyIcon className="w-5 h-5" />
                        <span className="text-sm font-medium uppercase tracking-wide">
                            Achievement Unlocked!
                        </span>
                    </motion.div>

                    <motion.div
                        className={cn(
                            'w-20 h-20 rounded-2xl flex items-center justify-center text-4xl',
                            colors.bg
                        )}
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                    >
                        {achievement.icon}
                    </motion.div>

                    <motion.div
                        className="text-center"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                    >
                        <h2 className="text-xl font-bold text-foreground">{achievement.name}</h2>
                        <p className="text-sm text-muted-foreground mt-1">
                            {achievement.description}
                        </p>
                    </motion.div>

                    <motion.div
                        className={cn('px-4 py-2 rounded-lg font-medium', colors.bg, colors.text)}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.4 }}
                    >
                        +{achievement.xpReward} XP
                    </motion.div>

                    <motion.button
                        className="mt-2 px-6 py-2 rounded-lg bg-gradient-to-r from-violet-500 to-purple-600 text-white font-medium"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        onClick={onComplete}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        Awesome!
                    </motion.button>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}

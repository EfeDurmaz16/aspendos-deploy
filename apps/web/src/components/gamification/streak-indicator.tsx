'use client';

import { motion } from 'framer-motion';
import { CalendarIcon, FlameIcon, SnowflakeIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

// Streak milestones with rewards
const STREAK_MILESTONES = [
    { days: 3, reward: 'First Steps', xp: 10 },
    { days: 7, reward: 'Week Warrior', xp: 50 },
    { days: 14, reward: 'Two Week Streak', xp: 100 },
    { days: 30, reward: 'Monthly Master', xp: 200 },
    { days: 60, reward: 'Double Month', xp: 400 },
    { days: 100, reward: 'Century Club', xp: 750 },
    { days: 365, reward: 'Year Legend', xp: 2000 },
];

interface StreakIndicatorProps {
    currentStreak: number;
    longestStreak: number;
    lastActiveDate?: string;
    streakFreezes?: number;
    freezesUsed?: number;
    size?: 'sm' | 'md' | 'lg';
    showDetails?: boolean;
    className?: string;
}

export function StreakIndicator({
    currentStreak,
    longestStreak,
    lastActiveDate,
    streakFreezes = 0,
    freezesUsed = 0,
    size = 'md',
    showDetails = false,
    className,
}: StreakIndicatorProps) {
    const isActive = currentStreak > 0;
    const isAtRisk = lastActiveDate
        ? new Date().getTime() - new Date(lastActiveDate).getTime() > 20 * 60 * 60 * 1000
        : false;

    const nextMilestone = STREAK_MILESTONES.find((m) => m.days > currentStreak);
    const daysToMilestone = nextMilestone ? nextMilestone.days - currentStreak : 0;

    const sizeClasses = {
        sm: {
            container: 'gap-1',
            icon: 'w-4 h-4',
            text: 'text-sm',
            badge: 'px-2 py-0.5 text-xs',
        },
        md: {
            container: 'gap-2',
            icon: 'w-5 h-5',
            text: 'text-base',
            badge: 'px-3 py-1 text-sm',
        },
        lg: {
            container: 'gap-3',
            icon: 'w-6 h-6',
            text: 'text-lg',
            badge: 'px-4 py-1.5 text-base',
        },
    };

    const sizes = sizeClasses[size];

    return (
        <div className={cn('flex flex-col', className)}>
            {/* Main streak display */}
            <div className={cn('flex items-center', sizes.container)}>
                <motion.div
                    className={cn(
                        'relative flex items-center justify-center',
                        isActive ? 'text-orange-500' : 'text-muted-foreground'
                    )}
                    animate={isActive ? { scale: [1, 1.1, 1] } : {}}
                    transition={{ repeat: Infinity, duration: 2 }}
                >
                    <FlameIcon className={sizes.icon} />
                    {isAtRisk && (
                        <motion.div
                            className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-500"
                            animate={{ scale: [1, 1.3, 1] }}
                            transition={{ repeat: Infinity, duration: 0.8 }}
                        />
                    )}
                </motion.div>

                <span
                    className={cn(
                        'font-bold',
                        sizes.text,
                        isActive ? 'text-orange-500' : 'text-muted-foreground'
                    )}
                >
                    {currentStreak}
                </span>

                <span className="text-muted-foreground text-sm">
                    day{currentStreak !== 1 ? 's' : ''}
                </span>

                {/* Streak freeze badges */}
                {streakFreezes > 0 && (
                    <div className="flex items-center gap-1 ml-2">
                        {Array.from({ length: streakFreezes - freezesUsed }).map((_, i) => (
                            <SnowflakeIcon
                                key={i}
                                className="w-4 h-4 text-cyan-400"
                                title="Streak Freeze Available"
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Details section */}
            {showDetails && (
                <div className="mt-3 space-y-2">
                    {/* Longest streak */}
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Longest Streak</span>
                        <span className="font-medium text-foreground">{longestStreak} days</span>
                    </div>

                    {/* Next milestone */}
                    {nextMilestone && (
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Next Milestone</span>
                            <span className="font-medium text-amber-500">
                                {daysToMilestone} day{daysToMilestone !== 1 ? 's' : ''} to{' '}
                                {nextMilestone.reward}
                            </span>
                        </div>
                    )}

                    {/* Progress to next milestone */}
                    {nextMilestone && (
                        <div className="mt-2">
                            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                                <motion.div
                                    className="h-full rounded-full bg-gradient-to-r from-orange-400 to-orange-600"
                                    initial={{ width: 0 }}
                                    animate={{
                                        width: `${
                                            ((currentStreak -
                                                (STREAK_MILESTONES.find(
                                                    (m) => m.days <= currentStreak
                                                )?.days || 0)) /
                                                (nextMilestone.days -
                                                    (STREAK_MILESTONES.find(
                                                        (m) => m.days <= currentStreak
                                                    )?.days || 0))) *
                                            100
                                        }%`,
                                    }}
                                />
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

interface StreakCalendarProps {
    activeDays: string[]; // ISO date strings
    currentMonth?: Date;
    className?: string;
}

export function StreakCalendar({
    activeDays,
    currentMonth = new Date(),
    className,
}: StreakCalendarProps) {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay();

    const activeDatesSet = new Set(activeDays.map((d) => new Date(d).toDateString()));

    const today = new Date().toDateString();

    return (
        <div className={cn('', className)}>
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium text-foreground">
                        {currentMonth.toLocaleDateString('en-US', {
                            month: 'long',
                            year: 'numeric',
                        })}
                    </span>
                </div>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                    <div key={i} className="text-center text-xs text-muted-foreground font-medium">
                        {day}
                    </div>
                ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
                {/* Empty cells for days before the 1st */}
                {Array.from({ length: startDayOfWeek }).map((_, i) => (
                    <div key={`empty-${i}`} className="aspect-square" />
                ))}

                {/* Day cells */}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day = i + 1;
                    const date = new Date(year, month, day);
                    const dateString = date.toDateString();
                    const isActive = activeDatesSet.has(dateString);
                    const isToday = dateString === today;

                    return (
                        <motion.div
                            key={day}
                            className={cn(
                                'aspect-square rounded-md flex items-center justify-center text-xs',
                                isActive
                                    ? 'bg-orange-500 text-white font-medium'
                                    : 'bg-muted/50 text-muted-foreground',
                                isToday && !isActive && 'ring-2 ring-violet-500'
                            )}
                            whileHover={{ scale: 1.1 }}
                        >
                            {day}
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
}

interface StreakMilestoneListProps {
    currentStreak: number;
    className?: string;
}

export function StreakMilestoneList({ currentStreak, className }: StreakMilestoneListProps) {
    return (
        <div className={cn('space-y-2', className)}>
            {STREAK_MILESTONES.map((milestone) => {
                const isAchieved = currentStreak >= milestone.days;
                const isCurrent =
                    !isAchieved &&
                    STREAK_MILESTONES.findIndex((m) => m.days > currentStreak) ===
                        STREAK_MILESTONES.indexOf(milestone);

                return (
                    <div
                        key={milestone.days}
                        className={cn(
                            'flex items-center justify-between p-3 rounded-lg border',
                            isAchieved
                                ? 'bg-orange-500/10 border-orange-500/30'
                                : isCurrent
                                  ? 'bg-violet-500/10 border-violet-500/30'
                                  : 'bg-muted/50 border-border opacity-60'
                        )}
                    >
                        <div className="flex items-center gap-3">
                            <div
                                className={cn(
                                    'w-8 h-8 rounded-full flex items-center justify-center',
                                    isAchieved
                                        ? 'bg-orange-500 text-white'
                                        : 'bg-muted text-muted-foreground'
                                )}
                            >
                                {isAchieved ? '✓' : milestone.days}
                            </div>
                            <div>
                                <p
                                    className={cn(
                                        'font-medium',
                                        isAchieved ? 'text-orange-500' : 'text-foreground'
                                    )}
                                >
                                    {milestone.reward}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {milestone.days} day streak
                                </p>
                            </div>
                        </div>
                        <span
                            className={cn(
                                'text-sm font-medium',
                                isAchieved ? 'text-orange-500' : 'text-muted-foreground'
                            )}
                        >
                            +{milestone.xp} XP
                        </span>
                    </div>
                );
            })}
        </div>
    );
}

export { STREAK_MILESTONES };

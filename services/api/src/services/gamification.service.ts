/**
 * Gamification Service
 *
 * Handles XP, levels, achievements, streaks, and referral program.
 * Backed by Convex action_log for event tracking.
 */

import { nanoid } from 'nanoid';
import { getConvexClient, api } from '../lib/convex';

// ==========================================
// LEVEL SYSTEM
// ==========================================

export const LEVELS = [
    { level: 1, name: 'Newcomer', minXp: 0, icon: '🌱' },
    { level: 2, name: 'Explorer', minXp: 100, icon: '🔍' },
    { level: 3, name: 'Conversationalist', minXp: 300, icon: '💬' },
    { level: 4, name: 'Power User', minXp: 700, icon: '⚡' },
    { level: 5, name: 'Yula Master', minXp: 1500, icon: '🎓' },
    { level: 6, name: 'AI Whisperer', minXp: 3000, icon: '🧙' },
] as const;

export function getLevelForXp(totalXp: number): (typeof LEVELS)[number] {
    let currentLevel: (typeof LEVELS)[number] = LEVELS[0];
    for (const level of LEVELS) {
        if (totalXp >= level.minXp) {
            currentLevel = level;
        } else {
            break;
        }
    }
    return currentLevel;
}

export function getNextLevel(currentLevel: number): (typeof LEVELS)[number] | null {
    const nextLevel = LEVELS.find((l) => l.level === currentLevel + 1);
    return nextLevel || null;
}

export function getXpProgress(totalXp: number): {
    current: number;
    required: number;
    percentage: number;
} {
    const currentLevel = getLevelForXp(totalXp);
    const nextLevel = getNextLevel(currentLevel.level);

    if (!nextLevel) {
        return { current: totalXp, required: totalXp, percentage: 100 };
    }

    const xpInCurrentLevel = totalXp - currentLevel.minXp;
    const xpForNextLevel = nextLevel.minXp - currentLevel.minXp;

    return {
        current: xpInCurrentLevel,
        required: xpForNextLevel,
        percentage: Math.round((xpInCurrentLevel / xpForNextLevel) * 100),
    };
}

// ==========================================
// XP ACTIONS
// ==========================================

export const XP_ACTIONS = {
    send_message: { xp: 1, description: 'Send a message' },
    complete_conversation: { xp: 5, description: 'Complete a conversation' },
    use_council: { xp: 10, description: 'Use the Council' },
    import_history: { xp: 50, description: 'Import chat history' },
    invite_friend: { xp: 100, description: 'Invite a friend' },
    complete_streak_7: { xp: 50, description: '7-day streak' },
    complete_streak_30: { xp: 200, description: '30-day streak' },
    complete_streak_100: { xp: 500, description: '100-day streak' },
    complete_onboarding: { xp: 25, description: 'Complete onboarding' },
    first_pac_reminder: { xp: 15, description: 'Create first PAC reminder' },
    use_memory_search: { xp: 5, description: 'Search memory' },
} as const;

export type XPAction = keyof typeof XP_ACTIONS;

// ==========================================
// ACHIEVEMENTS
// ==========================================

export const ACHIEVEMENTS = {
    // Onboarding
    first_steps: {
        name: 'First Steps',
        description: 'Complete the onboarding tour',
        icon: '👣',
        category: 'onboarding',
        xpReward: 10,
    },
    profile_complete: {
        name: 'Identity Set',
        description: 'Complete your profile',
        icon: '🪪',
        category: 'onboarding',
        xpReward: 15,
    },

    // Engagement
    first_chat: {
        name: 'Hello World',
        description: 'Send your first message',
        icon: '👋',
        category: 'engagement',
        xpReward: 5,
    },
    chatty: {
        name: 'Chatty',
        description: 'Send 100 messages',
        icon: '💬',
        category: 'engagement',
        xpReward: 25,
    },
    prolific: {
        name: 'Prolific',
        description: 'Send 1000 messages',
        icon: '📚',
        category: 'engagement',
        xpReward: 100,
    },
    marathon: {
        name: 'Marathon',
        description: 'Send 10,000 messages',
        icon: '🏃',
        category: 'engagement',
        xpReward: 500,
    },

    // Streaks
    streak_3: {
        name: 'Getting Started',
        description: '3-day streak',
        icon: '🔥',
        category: 'streaks',
        xpReward: 10,
    },
    streak_7: {
        name: 'Week Warrior',
        description: '7-day streak',
        icon: '🔥',
        category: 'streaks',
        xpReward: 25,
    },
    streak_14: {
        name: 'Fortnight Force',
        description: '14-day streak',
        icon: '🔥',
        category: 'streaks',
        xpReward: 50,
    },
    streak_30: {
        name: 'Monthly Master',
        description: '30-day streak',
        icon: '🔥',
        category: 'streaks',
        xpReward: 100,
    },
    streak_100: {
        name: 'Century Club',
        description: '100-day streak',
        icon: '💯',
        category: 'streaks',
        xpReward: 300,
    },
    streak_365: {
        name: 'Year of Yula',
        description: '365-day streak',
        icon: '🎉',
        category: 'streaks',
        xpReward: 1000,
    },

    // Features
    council_initiate: {
        name: 'Council Initiate',
        description: 'Use the Council for the first time',
        icon: '🏛️',
        category: 'mastery',
        xpReward: 15,
    },
    council_master: {
        name: 'Council Master',
        description: 'Use the Council 50 times',
        icon: '👑',
        category: 'mastery',
        xpReward: 100,
    },
    import_pioneer: {
        name: 'Import Pioneer',
        description: 'Import your first chat history',
        icon: '📥',
        category: 'mastery',
        xpReward: 25,
    },
    pac_scheduler: {
        name: 'PAC Scheduler',
        description: 'Create your first PAC reminder',
        icon: '⏰',
        category: 'mastery',
        xpReward: 15,
    },
    memory_keeper: {
        name: 'Memory Keeper',
        description: 'Save 100 memories',
        icon: '🧠',
        category: 'mastery',
        xpReward: 50,
    },

    // Social
    first_referral: {
        name: 'Connector',
        description: 'Refer your first friend',
        icon: '🤝',
        category: 'social',
        xpReward: 50,
    },
    referral_pro: {
        name: 'Ambassador',
        description: 'Refer 5 friends',
        icon: '🌟',
        category: 'social',
        xpReward: 150,
    },

    // Secret
    night_owl: {
        name: 'Night Owl',
        description: 'Chat between 2-4 AM',
        icon: '🦉',
        category: 'secret',
        xpReward: 10,
    },
    early_bird: {
        name: 'Early Bird',
        description: 'Chat before 6 AM',
        icon: '🐦',
        category: 'secret',
        xpReward: 10,
    },
} as const;

export type AchievementCode = keyof typeof ACHIEVEMENTS;

// ==========================================
// PROFILE MANAGEMENT (via action_log events)
// ==========================================

/** Reconstructs gamification profile from action_log events */
async function reconstructProfile(userId: string) {
    try {
        const client = getConvexClient();
        const logs = await client.query(api.actionLog.listByUser, {
            user_id: userId as any,
            limit: 1000,
        });

        // Find profile creation event or create default
        const profileLog = logs.find((l) => l.event_type === 'gamification_profile_created');
        const referralCode = profileLog?.details?.referralCode || nanoid(8).toUpperCase();

        // Sum all XP awards
        let totalXp = 0;
        const xpLogs: Array<{ amount: number; action: string; timestamp: number }> = [];
        for (const log of logs) {
            if (log.event_type === 'xp_awarded') {
                const amount = (log.details?.amount as number) || 0;
                totalXp += amount;
                xpLogs.push({
                    amount,
                    action: (log.details?.action as string) || 'unknown',
                    timestamp: log.timestamp,
                });
            }
        }

        // Collect unlocked achievements
        const achievements: Array<{ code: string; unlockedAt: Date }> = [];
        for (const log of logs) {
            if (log.event_type === 'achievement_unlocked') {
                achievements.push({
                    code: log.details?.code as string,
                    unlockedAt: new Date(log.timestamp),
                });
            }
        }

        // Get streak info
        const streakLogs = logs
            .filter((l) => l.event_type === 'streak_updated')
            .sort((a, b) => b.timestamp - a.timestamp);
        const latestStreak = streakLogs[0]?.details || {};

        // Get referral info
        const referralLogs = logs.filter((l) => l.event_type === 'referral_processed');

        return {
            userId,
            referralCode,
            totalXp,
            level: getLevelForXp(totalXp).level,
            currentStreak: (latestStreak.currentStreak as number) || 0,
            longestStreak: (latestStreak.longestStreak as number) || 0,
            lastActiveDate: latestStreak.lastActiveDate
                ? new Date(latestStreak.lastActiveDate as string)
                : new Date(),
            streakFreezes: 1,
            freezesUsed: (latestStreak.freezesUsed as number) || 0,
            totalReferrals: referralLogs.length,
            proDaysEarned: referralLogs.length * 7,
            referredBy: profileLog?.details?.referredBy || null,
            achievements,
            xpLogs: xpLogs.slice(0, 10),
        };
    } catch {
        return {
            userId,
            referralCode: nanoid(8).toUpperCase(),
            totalXp: 0,
            level: 1,
            currentStreak: 0,
            longestStreak: 0,
            lastActiveDate: new Date(),
            streakFreezes: 1,
            freezesUsed: 0,
            totalReferrals: 0,
            proDaysEarned: 0,
            referredBy: null,
            achievements: [] as Array<{ code: string; unlockedAt: Date }>,
            xpLogs: [] as Array<{ amount: number; action: string; timestamp: number }>,
        };
    }
}

/**
 * Get or create a gamification profile
 */
export async function getOrCreateProfile(userId: string) {
    const profile = await reconstructProfile(userId);

    // Ensure profile creation event exists
    try {
        const client = getConvexClient();
        const logs = await client.query(api.actionLog.listByUser, {
            user_id: userId as any,
            limit: 100,
        });
        const hasProfile = logs.some((l) => l.event_type === 'gamification_profile_created');
        if (!hasProfile) {
            await client.mutation(api.actionLog.log, {
                user_id: userId as any,
                event_type: 'gamification_profile_created',
                details: { referralCode: profile.referralCode },
            });
        }
    } catch {
        /* non-blocking */
    }

    return profile;
}

/**
 * Get profile with calculated fields
 */
export async function getProfileWithStats(userId: string) {
    const profile = await getOrCreateProfile(userId);
    const levelInfo = getLevelForXp(profile.totalXp);
    const nextLevel = getNextLevel(levelInfo.level);
    const progress = getXpProgress(profile.totalXp);

    return {
        ...profile,
        level: levelInfo,
        nextLevel,
        xpProgress: progress,
        achievements: profile.achievements.map((a) => ({
            ...a,
            definition: ACHIEVEMENTS[a.code as AchievementCode],
        })),
    };
}

// ==========================================
// XP SYSTEM
// ==========================================

/**
 * Award XP for an action
 */
export async function awardXp(
    userId: string,
    action: XPAction,
    metadata?: Record<string, unknown>
): Promise<{
    xpAwarded: number;
    totalXp: number;
    leveledUp: boolean;
    newLevel?: (typeof LEVELS)[number];
    achievementsUnlocked: AchievementCode[];
}> {
    try {
        const profile = await getOrCreateProfile(userId);
        const xpAmount = XP_ACTIONS[action].xp;

        const previousLevel = getLevelForXp(profile.totalXp);
        const newTotalXp = profile.totalXp + xpAmount;
        const newLevel = getLevelForXp(newTotalXp);
        const leveledUp = newLevel.level > previousLevel.level;

        const client = getConvexClient();
        await client.mutation(api.actionLog.log, {
            user_id: userId as any,
            event_type: 'xp_awarded',
            details: {
                amount: xpAmount,
                action,
                metadata: metadata || null,
                totalXp: newTotalXp,
            },
        });

        // Check for unlocked achievements
        const achievementsUnlocked = await checkAndUnlockAchievements(userId, action);

        return {
            xpAwarded: xpAmount,
            totalXp: newTotalXp,
            leveledUp,
            newLevel: leveledUp ? newLevel : undefined,
            achievementsUnlocked,
        };
    } catch (error) {
        console.error('[Gamification] awardXp failed:', error);
        return {
            xpAwarded: 0,
            totalXp: 0,
            leveledUp: false,
            achievementsUnlocked: [],
        };
    }
}

// ==========================================
// ACHIEVEMENTS
// ==========================================

/**
 * Check and unlock achievements based on action
 */
async function checkAndUnlockAchievements(
    userId: string,
    action: XPAction
): Promise<AchievementCode[]> {
    const unlocked: AchievementCode[] = [];
    const profile = await getOrCreateProfile(userId);

    const achievementChecks: Record<XPAction, AchievementCode[]> = {
        send_message: ['first_chat', 'chatty', 'prolific', 'marathon'],
        complete_conversation: [],
        use_council: ['council_initiate', 'council_master'],
        import_history: ['import_pioneer'],
        invite_friend: ['first_referral', 'referral_pro'],
        complete_streak_7: ['streak_7'],
        complete_streak_30: ['streak_30'],
        complete_streak_100: ['streak_100'],
        complete_onboarding: ['first_steps'],
        first_pac_reminder: ['pac_scheduler'],
        use_memory_search: [],
    };

    const potentialAchievements = achievementChecks[action] || [];

    for (const code of potentialAchievements) {
        const alreadyUnlocked = profile.achievements.some((a) => a.code === code);
        if (alreadyUnlocked) continue;

        const shouldUnlock = await checkAchievementCriteria(userId, code, action);
        if (shouldUnlock) {
            await unlockAchievement(userId, code);
            unlocked.push(code);
        }
    }

    return unlocked;
}

/**
 * Check if achievement criteria is met
 */
async function checkAchievementCriteria(
    userId: string,
    code: AchievementCode,
    _action: XPAction
): Promise<boolean> {
    switch (code) {
        case 'first_chat':
        case 'council_initiate':
        case 'import_pioneer':
        case 'pac_scheduler':
        case 'first_steps':
        case 'first_referral':
            return true; // First-time achievements unlock immediately

        case 'chatty':
        case 'prolific':
        case 'marathon':
        case 'council_master':
        case 'referral_pro': {
            try {
                const client = getConvexClient();
                const logs = await client.query(api.actionLog.listByUser, {
                    user_id: userId as any,
                    limit: 10001,
                });

                const xpLogs = logs.filter((l) => l.event_type === 'xp_awarded');

                if (code === 'chatty') {
                    return xpLogs.filter((l) => l.details?.action === 'send_message').length >= 100;
                }
                if (code === 'prolific') {
                    return (
                        xpLogs.filter((l) => l.details?.action === 'send_message').length >= 1000
                    );
                }
                if (code === 'marathon') {
                    return (
                        xpLogs.filter((l) => l.details?.action === 'send_message').length >= 10000
                    );
                }
                if (code === 'council_master') {
                    return xpLogs.filter((l) => l.details?.action === 'use_council').length >= 50;
                }
                if (code === 'referral_pro') {
                    const profile = await reconstructProfile(userId);
                    return profile.totalReferrals >= 5;
                }
            } catch {
                return false;
            }
            return false;
        }

        default:
            return false;
    }
}

/**
 * Unlock an achievement
 */
export async function unlockAchievement(_userId: string, code: AchievementCode) {
    const achievement = ACHIEVEMENTS[code];

    try {
        const client = getConvexClient();
        await client.mutation(api.actionLog.log, {
            user_id: _userId as any,
            event_type: 'achievement_unlocked',
            details: { code },
        });

        // Award XP for the achievement
        if (achievement.xpReward > 0) {
            await client.mutation(api.actionLog.log, {
                user_id: _userId as any,
                event_type: 'xp_awarded',
                details: {
                    amount: achievement.xpReward,
                    action: `achievement_${code}`,
                    metadata: { achievementCode: code },
                },
            });
        }
    } catch (error) {
        console.error('[Gamification] unlockAchievement failed:', error);
    }

    return achievement;
}

/**
 * Get all achievements for a user
 */
export async function getAchievements(userId: string) {
    const profile = await getOrCreateProfile(userId);
    const unlockedCodes = new Set(profile.achievements.map((a) => a.code));

    return Object.entries(ACHIEVEMENTS).map(([code, def]) => ({
        code,
        ...def,
        unlocked: unlockedCodes.has(code),
        unlockedAt: profile.achievements.find((a) => a.code === code)?.unlockedAt,
    }));
}

// ==========================================
// STREAK SYSTEM
// ==========================================

/**
 * Update streak on activity
 */
export async function updateStreak(userId: string): Promise<{
    currentStreak: number;
    longestStreak: number;
    streakBroken: boolean;
    streakMilestone?: number;
}> {
    const profile = await getOrCreateProfile(userId);
    const now = new Date();
    const lastActive = new Date(profile.lastActiveDate);

    // Calculate days since last activity
    const daysSinceActive = Math.floor(
        (now.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24)
    );

    let currentStreak = profile.currentStreak;
    let streakBroken = false;
    let streakMilestone: number | undefined;

    if (daysSinceActive === 0) {
        // Same day, no change
    } else if (daysSinceActive === 1) {
        // Consecutive day, increment streak
        currentStreak++;

        // Check for milestones
        const milestones = [3, 7, 14, 30, 60, 100, 365];
        for (const milestone of milestones) {
            if (currentStreak === milestone) {
                streakMilestone = milestone;

                // Award XP for milestone
                const xpAction = `complete_streak_${milestone}` as XPAction;
                if (XP_ACTIONS[xpAction]) {
                    await awardXp(userId, xpAction);
                }

                // Unlock achievement
                const achievementCode = `streak_${milestone}` as AchievementCode;
                if (ACHIEVEMENTS[achievementCode]) {
                    const alreadyUnlocked = profile.achievements.some(
                        (a) => a.code === achievementCode
                    );
                    if (!alreadyUnlocked) {
                        await unlockAchievement(userId, achievementCode);
                    }
                }
            }
        }
    } else if (daysSinceActive <= 2 && profile.freezesUsed < profile.streakFreezes) {
        // Use a streak freeze
        try {
            const client = getConvexClient();
            await client.mutation(api.actionLog.log, {
                user_id: userId as any,
                event_type: 'streak_freeze_used',
                details: { freezesUsed: profile.freezesUsed + 1 },
            });
        } catch {
            /* non-blocking */
        }
    } else {
        // Streak broken
        streakBroken = true;
        currentStreak = 1;
    }

    // Update streak in action_log
    const longestStreak = Math.max(currentStreak, profile.longestStreak);
    try {
        const client = getConvexClient();
        await client.mutation(api.actionLog.log, {
            user_id: userId as any,
            event_type: 'streak_updated',
            details: {
                currentStreak,
                longestStreak,
                lastActiveDate: now.toISOString(),
                freezesUsed: profile.freezesUsed,
            },
        });
    } catch (error) {
        console.error('[Gamification] updateStreak failed:', error);
    }

    return {
        currentStreak,
        longestStreak,
        streakBroken,
        streakMilestone,
    };
}

// ==========================================
// REFERRAL SYSTEM
// ==========================================

/**
 * Process a referral
 */
export async function processReferral(
    newUserId: string,
    referralCode: string
): Promise<{ success: boolean; referrerId?: string; proDaysEarned?: number }> {
    try {
        const client = getConvexClient();

        // Find the referrer by scanning profiles (referralCode is stored in profile_created events)
        const allLogs = await client.query(api.actionLog.listRecent, { limit: 1000 });
        const referrerLog = allLogs.find(
            (l) =>
                l.event_type === 'gamification_profile_created' &&
                l.details?.referralCode === referralCode.toUpperCase()
        );

        if (!referrerLog || !referrerLog.user_id) {
            return { success: false };
        }

        const referrerUserId = referrerLog.user_id;
        if (referrerUserId === (newUserId as any)) {
            return { success: false };
        }

        // Log referral for new user
        await client.mutation(api.actionLog.log, {
            user_id: newUserId as any,
            event_type: 'gamification_profile_created',
            details: { referredBy: referrerUserId, referralCode: nanoid(8).toUpperCase() },
        });

        // Log referral for referrer
        const proDaysEarned = 7;
        await client.mutation(api.actionLog.log, {
            user_id: referrerUserId,
            event_type: 'referral_processed',
            details: { newUserId, proDaysEarned },
        });

        // Award XP to referrer
        await awardXp(referrerUserId as any as string, 'invite_friend');

        return {
            success: true,
            referrerId: referrerUserId as any as string,
            proDaysEarned,
        };
    } catch (error) {
        console.error('[Gamification] processReferral failed:', error);
        return { success: false };
    }
}

/**
 * Get referral stats
 */
export async function getReferralStats(userId: string) {
    const profile = await getOrCreateProfile(userId);

    try {
        const client = getConvexClient();
        const logs = await client.query(api.actionLog.listByUser, {
            user_id: userId as any,
            limit: 200,
        });

        const referrals = logs
            .filter((l) => l.event_type === 'referral_processed')
            .slice(0, 10)
            .map((l) => ({ createdAt: new Date(l.timestamp) }));

        return {
            referralCode: profile.referralCode,
            totalReferrals: profile.totalReferrals,
            proDaysEarned: profile.proDaysEarned,
            recentReferrals: referrals,
        };
    } catch {
        return {
            referralCode: profile.referralCode,
            totalReferrals: 0,
            proDaysEarned: 0,
            recentReferrals: [],
        };
    }
}

// ==========================================
// LEADERBOARD
// ==========================================

/**
 * Get leaderboard
 */
export async function getLeaderboard(limit = 10) {
    try {
        const client = getConvexClient();
        const allLogs = await client.query(api.actionLog.listRecent, { limit: 5000 });

        // Aggregate XP per user
        const userXp = new Map<string, number>();
        for (const log of allLogs) {
            if (log.event_type === 'xp_awarded' && log.user_id) {
                const uid = log.user_id as any as string;
                const amount = (log.details?.amount as number) || 0;
                userXp.set(uid, (userXp.get(uid) || 0) + amount);
            }
        }

        // Sort by XP descending
        const sorted = Array.from(userXp.entries())
            .sort(([, a], [, b]) => b - a)
            .slice(0, limit);

        return sorted.map(([userId, totalXp], index) => ({
            rank: index + 1,
            userId,
            name: 'User',
            avatar: null,
            totalXp,
            level: getLevelForXp(totalXp),
            currentStreak: 0,
        }));
    } catch {
        return [];
    }
}

/**
 * Get user's rank
 */
export async function getUserRank(userId: string): Promise<number> {
    try {
        const profile = await getOrCreateProfile(userId);
        const leaderboard = await getLeaderboard(1000);

        const rank = leaderboard.findIndex((p) => p.userId === userId);
        return rank >= 0 ? rank + 1 : leaderboard.length + 1;
    } catch {
        return 1;
    }
}

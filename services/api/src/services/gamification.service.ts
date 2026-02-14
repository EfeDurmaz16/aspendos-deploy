/**
 * Gamification Service
 *
 * Handles XP, levels, achievements, streaks, and referral program.
 */

import { nanoid } from 'nanoid';
import { prisma } from '../lib/prisma';

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
// PROFILE MANAGEMENT
// ==========================================

/**
 * Get or create a gamification profile
 */
export async function getOrCreateProfile(userId: string) {
    let profile = await prisma.gamificationProfile.findUnique({
        where: { userId },
        include: {
            achievements: true,
            xpLogs: {
                orderBy: { createdAt: 'desc' },
                take: 10,
            },
        },
    });

    if (!profile) {
        profile = await prisma.gamificationProfile.create({
            data: {
                userId,
                referralCode: nanoid(8).toUpperCase(),
            },
            include: {
                achievements: true,
                xpLogs: true,
            },
        });
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
    const profile = await getOrCreateProfile(userId);
    const xpAmount = XP_ACTIONS[action].xp;

    const previousLevel = getLevelForXp(profile.totalXp);

    // Update profile and log XP
    const updatedProfile = await prisma.gamificationProfile.update({
        where: { id: profile.id },
        data: {
            totalXp: { increment: xpAmount },
            xpLogs: {
                create: {
                    amount: xpAmount,
                    action,
                    metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : undefined,
                },
            },
        },
    });

    const newLevel = getLevelForXp(updatedProfile.totalXp);
    const leveledUp = newLevel.level > previousLevel.level;

    // Check for unlocked achievements
    const achievementsUnlocked = await checkAndUnlockAchievements(userId, action);

    // Update level if changed
    if (leveledUp) {
        await prisma.gamificationProfile.update({
            where: { id: profile.id },
            data: { level: newLevel.level },
        });
    }

    return {
        xpAwarded: xpAmount,
        totalXp: updatedProfile.totalXp,
        leveledUp,
        newLevel: leveledUp ? newLevel : undefined,
        achievementsUnlocked,
    };
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

    // Check action-specific achievements
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
            await unlockAchievement(userId, profile.id, code);
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

        case 'chatty': {
            const count = await prisma.xPLog.count({
                where: {
                    profile: { userId },
                    action: 'send_message',
                },
            });
            return count >= 100;
        }

        case 'prolific': {
            const count = await prisma.xPLog.count({
                where: {
                    profile: { userId },
                    action: 'send_message',
                },
            });
            return count >= 1000;
        }

        case 'marathon': {
            const count = await prisma.xPLog.count({
                where: {
                    profile: { userId },
                    action: 'send_message',
                },
            });
            return count >= 10000;
        }

        case 'council_master': {
            const count = await prisma.xPLog.count({
                where: {
                    profile: { userId },
                    action: 'use_council',
                },
            });
            return count >= 50;
        }

        case 'referral_pro': {
            const profile = await prisma.gamificationProfile.findUnique({
                where: { userId },
            });
            return (profile?.totalReferrals || 0) >= 5;
        }

        default:
            return false;
    }
}

/**
 * Unlock an achievement
 */
export async function unlockAchievement(userId: string, profileId: string, code: AchievementCode) {
    const achievement = ACHIEVEMENTS[code];

    await prisma.achievement.create({
        data: {
            profileId,
            code,
        },
    });

    // Award XP for the achievement
    if (achievement.xpReward > 0) {
        await prisma.gamificationProfile.update({
            where: { id: profileId },
            data: {
                totalXp: { increment: achievement.xpReward },
                xpLogs: {
                    create: {
                        amount: achievement.xpReward,
                        action: `achievement_${code}`,
                        metadata: { achievementCode: code },
                    },
                },
            },
        });
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
                        await unlockAchievement(userId, profile.id, achievementCode);
                    }
                }
            }
        }
    } else if (daysSinceActive <= 2 && profile.freezesUsed < profile.streakFreezes) {
        // Use a streak freeze
        await prisma.gamificationProfile.update({
            where: { id: profile.id },
            data: { freezesUsed: { increment: 1 } },
        });
    } else {
        // Streak broken
        streakBroken = true;
        currentStreak = 1;
    }

    // Update profile
    const longestStreak = Math.max(currentStreak, profile.longestStreak);
    await prisma.gamificationProfile.update({
        where: { id: profile.id },
        data: {
            currentStreak,
            longestStreak,
            lastActiveDate: now,
        },
    });

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
    // Find the referrer
    const referrer = await prisma.gamificationProfile.findUnique({
        where: { referralCode: referralCode.toUpperCase() },
    });

    if (!referrer || referrer.userId === newUserId) {
        return { success: false };
    }

    // Update new user's profile
    const newUserProfile = await getOrCreateProfile(newUserId);
    await prisma.gamificationProfile.update({
        where: { id: newUserProfile.id },
        data: { referredBy: referrer.userId },
    });

    // Award referrer
    const proDaysEarned = 7; // 7 days of Pro per signup
    await prisma.gamificationProfile.update({
        where: { id: referrer.id },
        data: {
            totalReferrals: { increment: 1 },
            proDaysEarned: { increment: proDaysEarned },
        },
    });

    // Award XP
    await awardXp(referrer.userId, 'invite_friend');

    return {
        success: true,
        referrerId: referrer.userId,
        proDaysEarned,
    };
}

/**
 * Get referral stats
 */
export async function getReferralStats(userId: string) {
    const profile = await getOrCreateProfile(userId);

    const referrals = await prisma.gamificationProfile.findMany({
        where: { referredBy: userId },
        select: { createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 10,
    });

    return {
        referralCode: profile.referralCode,
        totalReferrals: profile.totalReferrals,
        proDaysEarned: profile.proDaysEarned,
        recentReferrals: referrals,
    };
}

// ==========================================
// LEADERBOARD
// ==========================================

/**
 * Get leaderboard
 */
export async function getLeaderboard(limit = 10) {
    const profiles = await prisma.gamificationProfile.findMany({
        orderBy: { totalXp: 'desc' },
        take: limit,
        include: {
            user: {
                select: { name: true, image: true },
            },
        },
    });

    return profiles.map((p, index) => ({
        rank: index + 1,
        userId: p.userId,
        name: p.user?.name || 'Anonymous',
        avatar: p.user?.image,
        totalXp: p.totalXp,
        level: getLevelForXp(p.totalXp),
        currentStreak: p.currentStreak,
    }));
}

/**
 * Get user's rank
 */
export async function getUserRank(userId: string): Promise<number> {
    const profile = await getOrCreateProfile(userId);

    const higherRanked = await prisma.gamificationProfile.count({
        where: { totalXp: { gt: profile.totalXp } },
    });

    return higherRanked + 1;
}

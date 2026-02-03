/**
 * Gamification API Routes
 *
 * Handles XP, levels, achievements, streaks, and referrals.
 */
import { Hono } from 'hono';
import { requireAuth } from '../middleware/auth';
import * as gamificationService from '../services/gamification.service';

const app = new Hono();

// All routes require authentication
app.use('*', requireAuth);

/**
 * GET /api/gamification/profile - Get user's gamification profile
 */
app.get('/profile', async (c) => {
    const userId = c.get('userId')!;

    const profile = await gamificationService.getProfileWithStats(userId);
    const rank = await gamificationService.getUserRank(userId);

    return c.json({
        profile: {
            totalXp: profile.totalXp,
            level: profile.level,
            nextLevel: profile.nextLevel,
            xpProgress: profile.xpProgress,
            currentStreak: profile.currentStreak,
            longestStreak: profile.longestStreak,
            lastActiveDate: profile.lastActiveDate,
            streakFreezes: profile.streakFreezes,
            freezesUsed: profile.freezesUsed,
            referralCode: profile.referralCode,
            totalReferrals: profile.totalReferrals,
            proDaysEarned: profile.proDaysEarned,
            rank,
        },
        recentXp: profile.xpLogs.map((log) => ({
            amount: log.amount,
            action: log.action,
            description: gamificationService.XP_ACTIONS[log.action as gamificationService.XPAction]?.description || log.action,
            createdAt: log.createdAt,
        })),
    });
});

/**
 * POST /api/gamification/xp - Award XP for an action
 */
app.post('/xp', async (c) => {
    const userId = c.get('userId')!;
    const body = await c.req.json();

    const { action, metadata } = body;

    if (!action || !(action in gamificationService.XP_ACTIONS)) {
        return c.json({ error: 'Invalid action' }, 400);
    }

    const result = await gamificationService.awardXp(
        userId,
        action as gamificationService.XPAction,
        metadata
    );

    return c.json(result);
});

/**
 * GET /api/gamification/achievements - Get all achievements
 */
app.get('/achievements', async (c) => {
    const userId = c.get('userId')!;

    const achievements = await gamificationService.getAchievements(userId);

    // Group by category
    const grouped = achievements.reduce(
        (acc, achievement) => {
            const category = achievement.category;
            if (!acc[category]) acc[category] = [];
            acc[category].push(achievement);
            return acc;
        },
        {} as Record<string, typeof achievements>
    );

    return c.json({
        achievements: grouped,
        stats: {
            total: achievements.length,
            unlocked: achievements.filter((a) => a.unlocked).length,
            percentage: Math.round(
                (achievements.filter((a) => a.unlocked).length / achievements.length) * 100
            ),
        },
    });
});

/**
 * POST /api/gamification/streak - Update streak
 */
app.post('/streak', async (c) => {
    const userId = c.get('userId')!;

    const result = await gamificationService.updateStreak(userId);

    return c.json(result);
});

/**
 * GET /api/gamification/referral - Get referral info
 */
app.get('/referral', async (c) => {
    const userId = c.get('userId')!;

    const stats = await gamificationService.getReferralStats(userId);

    return c.json({
        ...stats,
        shareUrl: `https://yula.dev/signup?ref=${stats.referralCode}`,
    });
});

/**
 * POST /api/gamification/referral - Process a referral
 */
app.post('/referral', async (c) => {
    const userId = c.get('userId')!;
    const body = await c.req.json();

    const { code } = body;

    if (!code || typeof code !== 'string') {
        return c.json({ error: 'Referral code is required' }, 400);
    }

    const result = await gamificationService.processReferral(userId, code);

    if (!result.success) {
        return c.json({ error: 'Invalid referral code' }, 400);
    }

    return c.json(result);
});

/**
 * GET /api/gamification/leaderboard - Get leaderboard
 */
app.get('/leaderboard', async (c) => {
    const userId = c.get('userId')!;
    const limit = Math.min(parseInt(c.req.query('limit') || '10', 10), 100);

    const [leaderboard, userRank] = await Promise.all([
        gamificationService.getLeaderboard(limit),
        gamificationService.getUserRank(userId),
    ]);

    return c.json({
        leaderboard,
        userRank,
    });
});

/**
 * GET /api/gamification/levels - Get all level definitions
 */
app.get('/levels', async (c) => {
    return c.json({
        levels: gamificationService.LEVELS,
    });
});

/**
 * GET /api/gamification/actions - Get all XP actions
 */
app.get('/actions', async (c) => {
    return c.json({
        actions: Object.entries(gamificationService.XP_ACTIONS).map(([code, def]) => ({
            code,
            ...def,
        })),
    });
});

export default app;

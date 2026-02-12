/**
 * Analytics API Routes
 *
 * Provides endpoints for usage analytics, token consumption, and model statistics.
 */

import { prisma } from '@aspendos/db';
import { Hono } from 'hono';
import { requireAuth } from '../middleware/auth';

type Variables = {
    userId?: string;
};

const app = new Hono<{ Variables: Variables }>();

// ============================================
// AUTHENTICATED ROUTES
// ============================================

/**
 * GET /api/analytics/usage - Token usage over time
 *
 * Returns aggregated token usage grouped by day/week/month.
 * Includes breakdown by input tokens, output tokens, and costs.
 */
app.get('/usage', requireAuth, async (c) => {
    const userId = c.get('userId')!;
    const rawInterval = c.req.query('interval') || 'day';
    const interval = ['day', 'week', 'month'].includes(rawInterval) ? rawInterval : 'day';
    const limit = Math.min(parseInt(c.req.query('limit') || '30', 10) || 30, 90);

    try {
        // Get all messages for this user
        const messages = await prisma.message.findMany({
            where: {
                userId,
                role: 'assistant', // Only count assistant messages (actual AI usage)
            },
            select: {
                tokensIn: true,
                tokensOut: true,
                costUsd: true,
                modelUsed: true,
                createdAt: true,
            },
            orderBy: {
                createdAt: 'desc',
            },
            take: 10000, // Last 10k messages (should cover reasonable time range)
        });

        // Group by interval
        const grouped = new Map<
            string,
            {
                tokensIn: number;
                tokensOut: number;
                totalTokens: number;
                costUsd: number;
                messageCount: number;
            }
        >();

        for (const msg of messages) {
            const date = new Date(msg.createdAt);
            let key: string;

            if (interval === 'week') {
                // Start of week (Sunday)
                const weekStart = new Date(date);
                weekStart.setDate(date.getDate() - date.getDay());
                weekStart.setHours(0, 0, 0, 0);
                key = weekStart.toISOString().split('T')[0];
            } else if (interval === 'month') {
                // Start of month
                key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
            } else {
                // Day
                key = date.toISOString().split('T')[0];
            }

            const existing = grouped.get(key) || {
                tokensIn: 0,
                tokensOut: 0,
                totalTokens: 0,
                costUsd: 0,
                messageCount: 0,
            };

            existing.tokensIn += msg.tokensIn;
            existing.tokensOut += msg.tokensOut;
            existing.totalTokens += msg.tokensIn + msg.tokensOut;
            existing.costUsd += msg.costUsd;
            existing.messageCount += 1;

            grouped.set(key, existing);
        }

        // Convert to array and sort by date
        const data = Array.from(grouped.entries())
            .map(([date, stats]) => ({
                date,
                ...stats,
            }))
            .sort((a, b) => a.date.localeCompare(b.date))
            .slice(-limit); // Take last N periods

        return c.json({
            interval,
            data,
        });
    } catch (error) {
        console.error('[Analytics] Error fetching usage:', error);
        return c.json({ error: 'Failed to fetch usage analytics' }, 500);
    }
});

/**
 * GET /api/analytics/messages - Message count over time
 *
 * Returns count of messages per day with breakdown by user vs assistant.
 */
app.get('/messages', requireAuth, async (c) => {
    const userId = c.get('userId')!;
    const limit = Math.min(parseInt(c.req.query('limit') || '30', 10) || 30, 90);

    try {
        const messages = await prisma.message.findMany({
            where: {
                userId,
            },
            select: {
                role: true,
                createdAt: true,
            },
            orderBy: {
                createdAt: 'desc',
            },
            take: 10000,
        });

        // Group by day
        const grouped = new Map<
            string,
            {
                userMessages: number;
                assistantMessages: number;
                total: number;
            }
        >();

        for (const msg of messages) {
            const date = new Date(msg.createdAt);
            const key = date.toISOString().split('T')[0];

            const existing = grouped.get(key) || {
                userMessages: 0,
                assistantMessages: 0,
                total: 0,
            };

            if (msg.role === 'user') {
                existing.userMessages += 1;
            } else {
                existing.assistantMessages += 1;
            }
            existing.total += 1;

            grouped.set(key, existing);
        }

        // Convert to array and sort
        const data = Array.from(grouped.entries())
            .map(([date, stats]) => ({
                date,
                ...stats,
            }))
            .sort((a, b) => a.date.localeCompare(b.date))
            .slice(-limit);

        return c.json({
            data,
        });
    } catch (error) {
        console.error('[Analytics] Error fetching message stats:', error);
        return c.json({ error: 'Failed to fetch message analytics' }, 500);
    }
});

/**
 * GET /api/analytics/models - Model usage distribution
 *
 * Returns pie chart data showing usage distribution across AI models.
 */
app.get('/models', requireAuth, async (c) => {
    const userId = c.get('userId')!;
    const days = Math.min(parseInt(c.req.query('days') || '30', 10) || 30, 365);

    try {
        // Calculate date threshold
        const since = new Date();
        since.setDate(since.getDate() - days);

        const messages = await prisma.message.findMany({
            where: {
                userId,
                role: 'assistant',
                createdAt: {
                    gte: since,
                },
            },
            select: {
                modelUsed: true,
                tokensIn: true,
                tokensOut: true,
                costUsd: true,
            },
        });

        // Group by model
        const modelStats = new Map<
            string,
            {
                count: number;
                tokensIn: number;
                tokensOut: number;
                totalTokens: number;
                costUsd: number;
            }
        >();

        for (const msg of messages) {
            const model = msg.modelUsed || 'unknown';
            const existing = modelStats.get(model) || {
                count: 0,
                tokensIn: 0,
                tokensOut: 0,
                totalTokens: 0,
                costUsd: 0,
            };

            existing.count += 1;
            existing.tokensIn += msg.tokensIn;
            existing.tokensOut += msg.tokensOut;
            existing.totalTokens += msg.tokensIn + msg.tokensOut;
            existing.costUsd += msg.costUsd;

            modelStats.set(model, existing);
        }

        // Convert to array and calculate percentages
        const total = messages.length;
        const data = Array.from(modelStats.entries())
            .map(([model, stats]) => ({
                model,
                ...stats,
                percentage: total > 0 ? (stats.count / total) * 100 : 0,
            }))
            .sort((a, b) => b.count - a.count);

        return c.json({
            days,
            total,
            data,
        });
    } catch (error) {
        console.error('[Analytics] Error fetching model stats:', error);
        return c.json({ error: 'Failed to fetch model analytics' }, 500);
    }
});

/**
 * GET /api/analytics/summary - Overall usage summary
 *
 * Returns high-level statistics for the dashboard.
 */
app.get('/summary', requireAuth, async (c) => {
    const userId = c.get('userId')!;

    try {
        // Get total messages
        const totalMessages = await prisma.message.count({
            where: { userId },
        });

        // Get total chats
        const totalChats = await prisma.chat.count({
            where: { userId },
        });

        // Get total tokens and cost from messages
        const tokenStats = await prisma.message.aggregate({
            where: {
                userId,
                role: 'assistant',
            },
            _sum: {
                tokensIn: true,
                tokensOut: true,
                costUsd: true,
            },
        });

        // Get messages this month
        const monthStart = new Date();
        monthStart.setDate(1);
        monthStart.setHours(0, 0, 0, 0);

        const messagesThisMonth = await prisma.message.count({
            where: {
                userId,
                createdAt: {
                    gte: monthStart,
                },
            },
        });

        return c.json({
            totalMessages,
            totalChats,
            totalTokensIn: tokenStats._sum.tokensIn || 0,
            totalTokensOut: tokenStats._sum.tokensOut || 0,
            totalTokens: (tokenStats._sum.tokensIn || 0) + (tokenStats._sum.tokensOut || 0),
            totalCostUsd: tokenStats._sum.costUsd || 0,
            messagesThisMonth,
        });
    } catch (error) {
        console.error('[Analytics] Error fetching summary:', error);
        return c.json({ error: 'Failed to fetch analytics summary' }, 500);
    }
});

/**
 * GET /api/analytics/engagement - User engagement score and stickiness metrics
 *
 * Composite score (0-100) based on:
 * - Chat frequency (how often user chats)
 * - Memory depth (how many memories stored)
 * - Feature breadth (council, PAC, import usage)
 * - Retention signals (return frequency)
 *
 * This is a moat metric: higher engagement = harder to churn.
 */
app.get('/engagement', requireAuth, async (c) => {
    const userId = c.get('userId')!;

    try {
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        const [
            totalChats,
            recentChats,
            weeklyChats,
            totalMessages,
            councilSessions,
            pacReminders,
            pacCompleted,
            importJobs,
            achievements,
        ] = await Promise.all([
            prisma.chat.count({ where: { userId } }),
            prisma.chat.count({ where: { userId, createdAt: { gte: thirtyDaysAgo } } }),
            prisma.chat.count({ where: { userId, createdAt: { gte: sevenDaysAgo } } }),
            prisma.message.count({ where: { userId, role: 'user' } }),
            prisma.councilSession.count({ where: { userId } }),
            prisma.pACReminder.count({ where: { userId } }),
            prisma.pACReminder.count({ where: { userId, status: 'ACKNOWLEDGED' } }),
            prisma.importJob.count({ where: { userId, status: 'COMPLETED' } }),
            prisma.achievement.count({ where: { userId } }),
        ]);

        // Score components (each 0-25, total 0-100)

        // 1. Chat frequency (0-25): based on 30-day chat activity
        const chatFreqScore = Math.min(25, Math.round((recentChats / 30) * 25));

        // 2. Feature breadth (0-25): how many features used
        let featuresUsed = 0;
        if (totalChats > 0) featuresUsed++;
        if (councilSessions > 0) featuresUsed++;
        if (pacReminders > 0) featuresUsed++;
        if (importJobs > 0) featuresUsed++;
        if (achievements > 0) featuresUsed++;
        const featureBreadthScore = Math.min(25, featuresUsed * 5);

        // 3. Depth of use (0-25): messages per chat, PAC completion rate
        const avgMessagesPerChat = totalChats > 0 ? totalMessages / totalChats : 0;
        const depthFromMessages = Math.min(15, Math.round(avgMessagesPerChat * 1.5));
        const pacCompletionRate = pacReminders > 0 ? pacCompleted / pacReminders : 0;
        const depthFromPAC = Math.round(pacCompletionRate * 10);
        const depthScore = Math.min(25, depthFromMessages + depthFromPAC);

        // 4. Retention signal (0-25): weekly vs monthly ratio
        const retentionRatio = recentChats > 0 ? weeklyChats / recentChats : 0;
        const retentionScore = Math.min(25, Math.round(retentionRatio * 25));

        const engagementScore = chatFreqScore + featureBreadthScore + depthScore + retentionScore;

        // Activation status
        let activationStatus: 'new' | 'activated' | 'engaged' | 'power_user' = 'new';
        if (engagementScore >= 75) activationStatus = 'power_user';
        else if (engagementScore >= 50) activationStatus = 'engaged';
        else if (engagementScore >= 20) activationStatus = 'activated';

        // Stickiness: 7-day active / 30-day active ratio
        const stickiness = recentChats > 0 ? Math.round((weeklyChats / recentChats) * 100) : 0;

        return c.json({
            engagementScore,
            activationStatus,
            stickiness,
            components: {
                chatFrequency: chatFreqScore,
                featureBreadth: featureBreadthScore,
                depthOfUse: depthScore,
                retention: retentionScore,
            },
            activity: {
                totalChats,
                chatsLast30d: recentChats,
                chatsLast7d: weeklyChats,
                totalMessages,
                councilSessions,
                pacReminders,
                pacCompleted,
                importJobs,
                achievements,
            },
        });
    } catch (error) {
        console.error('[Analytics] Error computing engagement:', error);
        return c.json({ error: 'Failed to compute engagement score' }, 500);
    }
});

/**
 * GET /api/analytics/switching-cost - Data gravity and switching cost analysis
 *
 * Quantifies the user's "data gravity" - how much value they've built up in YULA,
 * making it hard to switch to competitors.
 *
 * Returns a composite score (0-100) based on:
 * - Data volume: messages, chats (0-30 points)
 * - Feature investment: council, PAC, achievements (0-30 points)
 * - Imported data: completed imports (0-20 points)
 * - Memory depth: memory interactions (0-20 points)
 */
app.get('/switching-cost', requireAuth, async (c) => {
    const userId = c.get('userId')!;

    try {
        // Query all metrics in parallel
        const [totalChats, totalMessages, councilSessions, pacReminders, importJobs, achievements] =
            await Promise.all([
                prisma.chat.count({ where: { userId } }),
                prisma.message.count({ where: { userId } }),
                prisma.councilSession.count({ where: { userId } }),
                prisma.pACReminder.count({ where: { userId } }),
                prisma.importJob.count({ where: { userId, status: 'COMPLETED' } }),
                prisma.achievement.count({ where: { userId } }),
            ]);

        // Calculate score components

        // 1. Data Volume (0-30): based on messages + chats
        // More data = harder to export and migrate
        const dataPoints = totalMessages + totalChats;
        let dataVolume = 0;
        if (dataPoints >= 1000) dataVolume = 30;
        else if (dataPoints >= 500) dataVolume = 25;
        else if (dataPoints >= 250) dataVolume = 20;
        else if (dataPoints >= 100) dataVolume = 15;
        else if (dataPoints >= 50) dataVolume = 10;
        else if (dataPoints >= 10) dataVolume = 5;

        // 2. Feature Investment (0-30): based on council + PAC + achievements
        // Using unique features creates lock-in
        const featurePoints = councilSessions + pacReminders + achievements;
        let featureInvestment = 0;
        if (featurePoints >= 100) featureInvestment = 30;
        else if (featurePoints >= 50) featureInvestment = 25;
        else if (featurePoints >= 25) featureInvestment = 20;
        else if (featurePoints >= 10) featureInvestment = 15;
        else if (featurePoints >= 5) featureInvestment = 10;
        else if (featurePoints >= 1) featureInvestment = 5;

        // 3. Imported Data (0-20): based on completed imports
        // They brought their history here = high commitment
        let importedData = 0;
        if (importJobs >= 5) importedData = 20;
        else if (importJobs >= 3) importedData = 15;
        else if (importJobs >= 2) importedData = 12;
        else if (importJobs >= 1) importedData = 10;

        // 4. Memory Depth (0-20): based on total messages as proxy for memory interactions
        // Deep conversational history = irreplaceable context
        let memoryDepth = 0;
        if (totalMessages >= 500) memoryDepth = 20;
        else if (totalMessages >= 250) memoryDepth = 15;
        else if (totalMessages >= 100) memoryDepth = 10;
        else if (totalMessages >= 50) memoryDepth = 5;

        // Calculate total switching cost score
        const switchingCostScore = dataVolume + featureInvestment + importedData + memoryDepth;

        // Determine data gravity level
        let dataGravity: 'low' | 'medium' | 'high' | 'very_high';
        if (switchingCostScore >= 75) dataGravity = 'very_high';
        else if (switchingCostScore >= 50) dataGravity = 'high';
        else if (switchingCostScore >= 25) dataGravity = 'medium';
        else dataGravity = 'low';

        // Generate moat strength description
        let moatStrength: string;
        if (switchingCostScore >= 75) {
            moatStrength =
                'User has significant data investment making switching very costly. Strong network effects and feature lock-in.';
        } else if (switchingCostScore >= 50) {
            moatStrength =
                'User has substantial investment in the platform. Switching would require considerable effort to migrate data and recreate context.';
        } else if (switchingCostScore >= 25) {
            moatStrength =
                'User has moderate platform investment. Some switching friction exists but migration is feasible.';
        } else {
            moatStrength =
                'User has minimal data gravity. Low switching cost - retention depends on product experience.';
        }

        return c.json({
            switchingCostScore,
            dataGravity,
            moatStrength,
            breakdown: {
                dataVolume,
                featureInvestment,
                importedData,
                memoryDepth,
            },
            raw: {
                totalChats,
                totalMessages,
                councilSessions,
                pacReminders,
                importJobs,
                achievements,
            },
        });
    } catch (error) {
        console.error('[Analytics] Error computing switching cost:', error);
        return c.json({ error: 'Failed to compute switching cost' }, 500);
    }
});

export default app;

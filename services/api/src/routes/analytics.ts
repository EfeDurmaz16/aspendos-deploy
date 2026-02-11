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

export default app;

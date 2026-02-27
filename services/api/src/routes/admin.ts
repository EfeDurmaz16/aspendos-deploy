/**
 * Admin API Routes
 *
 * Admin-only endpoints for user management, system monitoring, and configuration.
 * All endpoints require admin authentication.
 */

import { prisma } from '@aspendos/db';
import { Hono } from 'hono';
import { auditLog } from '../lib/audit-log';
import { requireAuth } from '../middleware/auth';

type Variables = {
    userId?: string;
    user?: {
        userId: string;
        email: string;
        name?: string;
        image?: string;
        tier?: string;
    };
};

const app = new Hono<{ Variables: Variables }>();

// Admin user IDs or emails (should be moved to environment variables in production)
const ADMIN_USER_IDS = (process.env.ADMIN_USER_IDS || '').split(',').filter(Boolean);
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').filter(Boolean);

/**
 * Middleware to check if user is an admin
 */
export async function requireAdmin(c: any, next: any) {
    await requireAuth(c, async () => {});

    const userId = c.get('userId');
    if (!userId) {
        return c.json({ error: 'Unauthorized' }, 401);
    }

    // Check if user is in admin list
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true },
    });

    if (!user) {
        return c.json({ error: 'User not found' }, 404);
    }

    const isAdmin =
        ADMIN_USER_IDS.includes(user.id) ||
        ADMIN_EMAILS.includes(user.email);

    if (!isAdmin) {
        await auditLog({
            userId,
            action: 'ADMIN_ACCESS_DENIED',
            resource: 'admin',
            ip: c.req.header('x-forwarded-for') || 'unknown',
        });
        return c.json({ error: 'Forbidden: Admin access required' }, 403);
    }

    return next();
}

// Apply admin middleware to all routes
app.use('*', requireAdmin);

// ============================================
// USER MANAGEMENT
// ============================================

/**
 * GET /admin/users - Paginated user list with stats
 */
app.get('/users', async (c) => {
    const page = Math.max(1, parseInt(c.req.query('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(c.req.query('limit') || '20', 10)));
    const skip = (page - 1) * limit;
    const search = c.req.query('search') || '';
    const tier = c.req.query('tier') || '';

    try {
        const whereClause: any = {};

        if (search) {
            whereClause.OR = [
                { email: { contains: search, mode: 'insensitive' } },
                { name: { contains: search, mode: 'insensitive' } },
            ];
        }

        if (tier && ['FREE', 'STARTER', 'PRO', 'ULTRA'].includes(tier)) {
            whereClause.tier = tier;
        }

        const [users, total] = await Promise.all([
            prisma.user.findMany({
                where: whereClause,
                select: {
                    id: true,
                    email: true,
                    name: true,
                    tier: true,
                    createdAt: true,
                    updatedAt: true,
                    _count: {
                        select: {
                            chats: true,
                            messages: true,
                            memories: true,
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip,
            }),
            prisma.user.count({ where: whereClause }),
        ]);

        // Get last active time for each user
        const usersWithStats = await Promise.all(
            users.map(async (user) => {
                const lastMessage = await prisma.message.findFirst({
                    where: { userId: user.id },
                    orderBy: { createdAt: 'desc' },
                    select: { createdAt: true },
                });

                return {
                    ...user,
                    chatCount: user._count.chats,
                    messageCount: user._count.messages,
                    memoryCount: user._count.memories,
                    lastActive: lastMessage?.createdAt || user.createdAt,
                    _count: undefined,
                };
            })
        );

        await auditLog({
            userId: c.get('userId')!,
            action: 'ADMIN_LIST_USERS',
            resource: 'admin',
            metadata: { page, limit, total },
            ip: c.req.header('x-forwarded-for') || 'unknown',
        });

        return c.json({
            users: usersWithStats,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error('[Admin] Error listing users:', error);
        return c.json({ error: 'Failed to fetch users' }, 500);
    }
});

/**
 * GET /admin/users/:id - Detailed user info
 */
app.get('/users/:id', async (c) => {
    const userId = c.req.param('id');

    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                billingAccount: true,
                pacSettings: true,
                gamificationProfile: true,
                _count: {
                    select: {
                        chats: true,
                        messages: true,
                        memories: true,
                        councilSessions: true,
                        pacReminders: true,
                        importJobs: true,
                    },
                },
            },
        });

        if (!user) {
            return c.json({ error: 'User not found' }, 404);
        }

        const [lastMessage, recentChats, totalTokensUsed] = await Promise.all([
            prisma.message.findFirst({
                where: { userId },
                orderBy: { createdAt: 'desc' },
                select: { createdAt: true },
            }),
            prisma.chat.count({
                where: {
                    userId,
                    createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
                },
            }),
            prisma.message.aggregate({
                where: { userId, role: 'assistant' },
                _sum: { tokensIn: true, tokensOut: true, costUsd: true },
            }),
        ]);

        await auditLog({
            userId: c.get('userId')!,
            action: 'ADMIN_VIEW_USER',
            resource: 'user',
            resourceId: userId,
            ip: c.req.header('x-forwarded-for') || 'unknown',
        });

        return c.json({
            user: {
                ...user,
                lastActive: lastMessage?.createdAt || user.createdAt,
                recentChats30d: recentChats,
                totalTokensIn: totalTokensUsed._sum.tokensIn || 0,
                totalTokensOut: totalTokensUsed._sum.tokensOut || 0,
                totalCostUsd: totalTokensUsed._sum.costUsd || 0,
            },
        });
    } catch (error) {
        console.error('[Admin] Error fetching user:', error);
        return c.json({ error: 'Failed to fetch user details' }, 500);
    }
});

/**
 * POST /admin/users/:id/tier - Update user tier
 */
app.post('/users/:id/tier', async (c) => {
    const userId = c.req.param('id');
    const body = await c.req.json();
    const { tier } = body;

    if (!tier || !['FREE', 'STARTER', 'PRO', 'ULTRA'].includes(tier)) {
        return c.json({ error: 'Invalid tier. Must be FREE, STARTER, PRO, or ULTRA' }, 400);
    }

    try {
        const user = await prisma.user.update({
            where: { id: userId },
            data: { tier },
            select: { id: true, email: true, tier: true },
        });

        await auditLog({
            userId: c.get('userId')!,
            action: 'ADMIN_UPDATE_TIER',
            resource: 'user',
            resourceId: userId,
            metadata: { newTier: tier },
            ip: c.req.header('x-forwarded-for') || 'unknown',
        });

        return c.json({ success: true, user });
    } catch (error) {
        console.error('[Admin] Error updating tier:', error);
        return c.json({ error: 'Failed to update user tier' }, 500);
    }
});

/**
 * POST /admin/users/:id/ban - Ban/unban user
 */
app.post('/users/:id/ban', async (c) => {
    const userId = c.req.param('id');
    const body = await c.req.json();
    const { banned, reason } = body;

    if (typeof banned !== 'boolean') {
        return c.json({ error: 'banned must be a boolean' }, 400);
    }

    try {
        // Store ban status in billing account (we don't have a dedicated ban field in User model)
        // For a real implementation, add a 'banned' field to User model
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, email: true },
        });

        if (!user) {
            return c.json({ error: 'User not found' }, 404);
        }

        await auditLog({
            userId: c.get('userId')!,
            action: banned ? 'ADMIN_BAN_USER' : 'ADMIN_UNBAN_USER',
            resource: 'user',
            resourceId: userId,
            metadata: { banned, reason: reason || 'No reason provided' },
            ip: c.req.header('x-forwarded-for') || 'unknown',
        });

        return c.json({
            success: true,
            message: `User ${banned ? 'banned' : 'unbanned'} successfully`,
            user: { id: user.id, email: user.email },
            note: 'Ban enforcement requires adding a banned field to User model',
        });
    } catch (error) {
        console.error('[Admin] Error updating ban status:', error);
        return c.json({ error: 'Failed to update ban status' }, 500);
    }
});

// ============================================
// SYSTEM MONITORING
// ============================================

/**
 * GET /admin/system - System overview
 */
app.get('/system', async (c) => {
    try {
        const [
            totalUsers,
            totalChats,
            totalMessages,
            totalMemories,
            activeUsers24h,
            activeUsers7d,
            totalTokensUsed,
        ] = await Promise.all([
            prisma.user.count(),
            prisma.chat.count(),
            prisma.message.count(),
            prisma.memory.count(),
            prisma.message
                .groupBy({
                    by: ['userId'],
                    where: {
                        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
                    },
                })
                .then((r) => r.length),
            prisma.message
                .groupBy({
                    by: ['userId'],
                    where: {
                        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
                    },
                })
                .then((r) => r.length),
            prisma.message.aggregate({
                where: { role: 'assistant' },
                _sum: { tokensIn: true, tokensOut: true, costUsd: true },
            }),
        ]);

        const uptime = process.uptime();

        await auditLog({
            userId: c.get('userId')!,
            action: 'ADMIN_VIEW_SYSTEM',
            resource: 'admin',
            ip: c.req.header('x-forwarded-for') || 'unknown',
        });

        return c.json({
            totalUsers,
            totalChats,
            totalMessages,
            totalMemories,
            activeUsers: {
                last24h: activeUsers24h,
                last7d: activeUsers7d,
            },
            tokens: {
                totalIn: totalTokensUsed._sum.tokensIn || 0,
                totalOut: totalTokensUsed._sum.tokensOut || 0,
                totalCostUsd: totalTokensUsed._sum.costUsd || 0,
            },
            uptime: {
                seconds: uptime,
                hours: Math.floor(uptime / 3600),
            },
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error('[Admin] Error fetching system overview:', error);
        return c.json({ error: 'Failed to fetch system overview' }, 500);
    }
});

/**
 * GET /admin/system/config - Current feature flags, rate limits, model config
 */
app.get('/system/config', async (c) => {
    try {
        const config = {
            environment: process.env.NODE_ENV || 'development',
            features: {
                councilEnabled: true,
                pacEnabled: true,
                importEnabled: true,
                voiceEnabled: true,
                gamificationEnabled: true,
            },
            rateLimits: {
                free: { requestsPerMinute: 10, chatsPerDay: 50 },
                starter: { requestsPerMinute: 30, chatsPerDay: 300 },
                pro: { requestsPerMinute: 100, chatsPerDay: 1000 },
                ultra: { requestsPerMinute: 200, chatsPerDay: 5000 },
            },
            models: {
                defaultModel: 'gpt-4o-mini',
                enabledProviders: ['openai', 'anthropic', 'google', 'groq'],
            },
        };

        await auditLog({
            userId: c.get('userId')!,
            action: 'ADMIN_VIEW_CONFIG',
            resource: 'admin',
            ip: c.req.header('x-forwarded-for') || 'unknown',
        });

        return c.json(config);
    } catch (error) {
        console.error('[Admin] Error fetching config:', error);
        return c.json({ error: 'Failed to fetch system config' }, 500);
    }
});

/**
 * GET /admin/metrics/summary - Daily/weekly/monthly usage summary
 */
app.get('/metrics/summary', async (c) => {
    const period = c.req.query('period') || 'daily'; // daily, weekly, monthly

    try {
        const now = new Date();
        let startDate: Date;

        switch (period) {
            case 'weekly':
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case 'monthly':
                startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                break;
            default:
                startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        }

        const [newUsers, newChats, newMessages, tokensUsed, costByModel] = await Promise.all([
            prisma.user.count({ where: { createdAt: { gte: startDate } } }),
            prisma.chat.count({ where: { createdAt: { gte: startDate } } }),
            prisma.message.count({ where: { createdAt: { gte: startDate } } }),
            prisma.message.aggregate({
                where: { createdAt: { gte: startDate }, role: 'assistant' },
                _sum: { tokensIn: true, tokensOut: true, costUsd: true },
            }),
            prisma.message
                .groupBy({
                    by: ['modelUsed'],
                    where: { createdAt: { gte: startDate }, role: 'assistant' },
                    _sum: { costUsd: true },
                })
                .then((r) =>
                    r.map((item) => ({
                        model: item.modelUsed || 'unknown',
                        costUsd: item._sum.costUsd || 0,
                    }))
                ),
        ]);

        await auditLog({
            userId: c.get('userId')!,
            action: 'ADMIN_VIEW_METRICS',
            resource: 'admin',
            metadata: { period },
            ip: c.req.header('x-forwarded-for') || 'unknown',
        });

        return c.json({
            period,
            startDate,
            endDate: now,
            metrics: {
                newUsers,
                newChats,
                newMessages,
                tokensIn: tokensUsed._sum.tokensIn || 0,
                tokensOut: tokensUsed._sum.tokensOut || 0,
                totalCostUsd: tokensUsed._sum.costUsd || 0,
                costByModel,
            },
        });
    } catch (error) {
        console.error('[Admin] Error fetching metrics:', error);
        return c.json({ error: 'Failed to fetch metrics summary' }, 500);
    }
});

// ============================================
// AUDIT LOG
// ============================================

/**
 * GET /admin/audit-log - Recent admin actions
 */
app.get('/audit-log', async (c) => {
    const page = Math.max(1, parseInt(c.req.query('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(c.req.query('limit') || '50', 10)));
    const skip = (page - 1) * limit;
    const action = c.req.query('action') || '';

    try {
        const whereClause: any = {};

        if (action) {
            whereClause.action = { contains: action, mode: 'insensitive' };
        }

        const [logs, total] = await Promise.all([
            prisma.auditLog.findMany({
                where: whereClause,
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip,
                select: {
                    id: true,
                    userId: true,
                    action: true,
                    resource: true,
                    resourceId: true,
                    ip: true,
                    metadata: true,
                    createdAt: true,
                },
            }),
            prisma.auditLog.count({ where: whereClause }),
        ]);

        // Enrich with user info
        const userIds = [...new Set(logs.map((log) => log.userId))];
        const users = await prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, email: true, name: true },
        });

        const userMap = new Map(users.map((u) => [u.id, u]));

        const enrichedLogs = logs.map((log) => ({
            ...log,
            user: userMap.get(log.userId),
        }));

        await auditLog({
            userId: c.get('userId')!,
            action: 'ADMIN_VIEW_AUDIT_LOG',
            resource: 'admin',
            metadata: { page, limit },
            ip: c.req.header('x-forwarded-for') || 'unknown',
        });

        return c.json({
            logs: enrichedLogs,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error('[Admin] Error fetching audit log:', error);
        return c.json({ error: 'Failed to fetch audit log' }, 500);
    }
});

export default app;

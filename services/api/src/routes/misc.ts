/**
 * Miscellaneous routes - changelog, legal, jobs, errors, webhook events,
 * audit log (user-facing), consent, rate-limit, export (paginated)
 */
import { Hono } from 'hono';
import { auditLog } from '../lib/audit-log';
import { getChangelog, getLatestVersion } from '../lib/changelog';
import { getErrorCatalog } from '../lib/error-codes';
import { jobQueue } from '../lib/job-queue';
import { getPrivacyPolicy, getTermsOfService } from '../lib/legal';
import { getWebhookCategories, getWebhookEventsCatalog } from '../lib/webhook-events';

const miscRoutes = new Hono();

// ─── Changelog ───────────────────────────────────────────────────────────────
miscRoutes.get('/changelog', (c) => {
    const type = c.req.query('type');
    const limit = parseInt(c.req.query('limit') || '20', 10);
    return c.json({ changelog: getChangelog(type, limit), latest: getLatestVersion() });
});

// ─── Legal Documents ─────────────────────────────────────────────────────────
miscRoutes.get('/legal/terms', (c) => c.json(getTermsOfService()));
miscRoutes.get('/legal/privacy', (c) => c.json(getPrivacyPolicy()));

// ─── Job Queue Status ────────────────────────────────────────────────────────
miscRoutes.get('/jobs/stats', (c) => {
    const queue = c.req.query('queue');
    return c.json({
        stats: jobQueue.getStats(queue || undefined),
        deadLetterQueue: jobQueue.getDeadLetterQueue().length,
    });
});

miscRoutes.get('/jobs/dead-letter', (c) => {
    const userId = c.get('userId') as string | null;
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);
    return c.json({ jobs: jobQueue.getDeadLetterQueue().slice(0, 100) });
});

miscRoutes.post('/jobs/retry/:jobId', (c) => {
    const userId = c.get('userId') as string | null;
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);
    const jobId = c.req.param('jobId');
    const success = jobQueue.retryDead(jobId);
    return c.json({ success });
});

// ─── Error Catalog ────────────────────────────────────────────────────────────
miscRoutes.get('/errors', (c) => {
    return c.json({ errors: getErrorCatalog() });
});

// ─── Webhook Events Catalog ──────────────────────────────────────────────────
miscRoutes.get('/webhooks/events', (c) => {
    const category = c.req.query('category');
    return c.json({
        events: getWebhookEventsCatalog(category),
        categories: getWebhookCategories(),
    });
});

// ─── Audit Log (GDPR Art. 15 - Right of Access) ───────────────────────────────
miscRoutes.get('/audit-log', async (c) => {
    const userId = c.get('userId') as string | null;
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    const limit = Math.min(parseInt(c.req.query('limit') || '50', 10) || 50, 200);
    const offset = Math.max(parseInt(c.req.query('offset') || '0', 10) || 0, 0);

    try {
        const { prisma } = await import('../lib/prisma');
        const [logs, total] = await Promise.all([
            prisma.auditLog.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip: offset,
                select: {
                    id: true,
                    action: true,
                    resource: true,
                    resourceId: true,
                    createdAt: true,
                    // Exclude IP and metadata for user-facing view (security)
                },
            }),
            prisma.auditLog.count({ where: { userId } }),
        ]);

        return c.json({
            logs,
            pagination: { total, limit, offset, hasMore: offset + limit < total },
        });
    } catch (error) {
        console.error('[AuditLog] Query failed:', error);
        return c.json({ error: 'Failed to fetch audit log' }, 500);
    }
});

// ─── Consent Tracking (GDPR Art. 7) ──────────────────────────────────────────
miscRoutes.get('/consent', async (c) => {
    const userId = c.get('userId') as string | null;
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    try {
        const { prisma } = await import('../lib/prisma');
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { createdAt: true, updatedAt: true },
        });

        // Consent is implicit at signup for core functionality (legitimate interest)
        // Additional consent tracked for optional features
        return c.json({
            coreProcessing: {
                granted: true,
                basis: 'legitimate_interest',
                description: 'Core chat and AI processing required for service delivery',
                grantedAt: user?.createdAt,
            },
            memoryProcessing: {
                granted: true,
                basis: 'consent',
                description: 'Storing and retrieving memories to personalize AI responses',
                withdrawable: true,
            },
            analyticsProcessing: {
                granted: true,
                basis: 'legitimate_interest',
                description: 'Usage analytics for service improvement',
            },
            marketingCommunications: {
                granted: false,
                basis: 'consent',
                description: 'Product updates and promotional emails',
                withdrawable: true,
            },
            dataPortability: {
                available: true,
                endpoint: '/api/export',
            },
            rightToErasure: {
                available: true,
                endpoint: '/api/account',
                method: 'DELETE',
            },
        });
    } catch (error) {
        console.error('[Consent] Query failed:', error);
        return c.json({ error: 'Failed to fetch consent status' }, 500);
    }
});

// ─── Data Export (paginated, GDPR Art. 20 legacy endpoint) ───────────────────
// Rate limit export to prevent abuse (1 export per 5 minutes per user)
const exportLimiter = new Map<string, number>();
setInterval(() => {
    const now = Date.now();
    for (const [key, ts] of exportLimiter.entries()) {
        if (now - ts > 5 * 60 * 1000) exportLimiter.delete(key);
    }
}, 5 * 60_000);

miscRoutes.get('/export', async (c) => {
    const userId = c.get('userId') as string | null;
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    const lastExport = exportLimiter.get(userId) || 0;
    if (Date.now() - lastExport < 5 * 60 * 1000) {
        return c.json(
            { error: 'Export rate limited. Please wait 5 minutes between exports.' },
            429
        );
    }
    exportLimiter.set(userId, Date.now());

    try {
        const { prisma } = await import('../lib/prisma');
        const openMemory = await import('../services/openmemory.service');

        // Pagination: prevent OOM on large accounts
        const page = Math.max(1, parseInt(c.req.query('page') || '1', 10) || 1);
        const chatLimit = 50; // 50 chats per page
        const chatSkip = (page - 1) * chatLimit;

        // Fetch all user data in parallel (chats paginated)
        const [
            user,
            chats,
            chatCount,
            memories,
            pacReminders,
            pacSettings,
            billingAccount,
            councilSessions,
            importJobs,
            achievements,
            xpEvents,
            notifications,
        ] = await Promise.all([
            prisma.user.findUnique({
                where: { id: userId },
                select: { id: true, name: true, email: true, createdAt: true, tier: true },
            }),
            prisma.chat.findMany({
                where: { userId },
                include: {
                    messages: {
                        select: { role: true, content: true, createdAt: true, modelUsed: true },
                    },
                },
                orderBy: { createdAt: 'desc' },
                take: chatLimit,
                skip: chatSkip,
            }),
            prisma.chat.count({ where: { userId } }),
            openMemory.listMemories(userId, { limit: 1000 }),
            prisma.pACReminder.findMany({
                where: { userId },
                select: {
                    id: true,
                    content: true,
                    type: true,
                    status: true,
                    triggerAt: true,
                    createdAt: true,
                },
            }),
            prisma.pACSettings.findUnique({ where: { userId } }),
            prisma.billingAccount.findUnique({
                where: { userId },
                select: {
                    plan: true,
                    creditUsed: true,
                    monthlyCredit: true,
                    chatsRemaining: true,
                    createdAt: true,
                },
            }),
            prisma.councilSession.findMany({
                where: { userId },
                include: { responses: { select: { persona: true, content: true, status: true } } },
                take: 100,
                orderBy: { createdAt: 'desc' },
            }),
            prisma.importJob.findMany({
                where: { userId },
                select: {
                    id: true,
                    source: true,
                    status: true,
                    totalItems: true,
                    importedItems: true,
                    createdAt: true,
                },
            }),
            prisma.achievement.findMany({
                where: { profile: { userId } },
                select: { id: true, code: true, unlockedAt: true, notified: true },
            }),
            prisma.xPLog.findMany({
                where: { profile: { userId } },
                select: { id: true, amount: true, action: true, createdAt: true },
                orderBy: { createdAt: 'desc' },
                take: 500,
            }),
            prisma.notificationLog.findMany({
                where: { userId },
                select: {
                    id: true,
                    type: true,
                    title: true,
                    message: true,
                    status: true,
                    readAt: true,
                    createdAt: true,
                },
                orderBy: { createdAt: 'desc' },
                take: 200,
            }),
        ]);

        // Audit log the data export
        await auditLog({
            userId,
            action: 'DATA_EXPORT',
            resource: 'user',
            ip: c.req.header('x-forwarded-for') || 'unknown',
        });

        return c.json({
            exportedAt: new Date().toISOString(),
            format: 'YULA_EXPORT_V1',
            pagination: {
                page,
                chatLimit,
                totalChats: chatCount,
                totalPages: Math.ceil(chatCount / chatLimit),
            },
            user,
            chats: chats.map((chat: any) => ({
                id: chat.id,
                title: chat.title,
                createdAt: chat.createdAt,
                messages: chat.messages,
            })),
            memories: memories.map((m: any) => ({
                id: m.id,
                content: m.content,
                sector: m.sector,
                createdAt: m.createdAt,
            })),
            reminders: pacReminders,
            pacSettings: pacSettings
                ? {
                      enabled: pacSettings.enabled,
                      explicitEnabled: pacSettings.explicitEnabled,
                      implicitEnabled: pacSettings.implicitEnabled,
                      quietHoursStart: pacSettings.quietHoursStart,
                      quietHoursEnd: pacSettings.quietHoursEnd,
                  }
                : null,
            billing: billingAccount,
            councilSessions: councilSessions.map((s: any) => ({
                id: s.id,
                query: s.query,
                status: s.status,
                selectedPersona: s.selectedPersona,
                synthesis: s.synthesis,
                createdAt: s.createdAt,
                responses: s.responses,
            })),
            importHistory: importJobs,
            gamification: {
                achievements,
                xpEvents,
            },
            notifications,
            retentionPolicy: {
                description:
                    'Yula retains your data as long as your account is active. Memories older than 365 days without reinforcement may be flagged for cleanup. You can export or delete your data at any time.',
                memoryRetentionDays: 365,
                chatRetentionDays: null, // Retained indefinitely while account is active
                exportAvailable: true,
                deletionAvailable: true,
            },
        });
    } catch (error) {
        console.error('[Export] Data export failed:', error);
        return c.json({ error: 'Export failed' }, 500);
    }
});

export default miscRoutes;

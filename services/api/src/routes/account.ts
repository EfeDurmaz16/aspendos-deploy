/**
 * Account & GDPR routes - /api/account/*, /api/export, /api/audit-log, /api/consent
 */
import { Hono } from 'hono';
import { auditLog } from '../lib/audit-log';

const accountRoutes = new Hono();

// Rate limit export to prevent abuse (1 export per 5 minutes per user)
const exportLimiter = new Map<string, number>();
// Clean up expired entries every 5 minutes
setInterval(() => {
    const now = Date.now();
    for (const [key, ts] of exportLimiter.entries()) {
        if (now - ts > 5 * 60 * 1000) exportLimiter.delete(key);
    }
}, 5 * 60_000);

// DELETE / - Delete user account and all associated data (GDPR Art. 17)
accountRoutes.delete('/', async (c) => {
    const userId = c.get('userId') as string | null;
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    try {
        const { prisma } = await import('../lib/prisma');
        const openMemory = await import('../services/openmemory.service');

        // Delete all user data in dependency order
        await prisma.$transaction(async (tx) => {
            // Delete PAC data
            const reminders = await tx.pACReminder.findMany({
                where: { userId },
                select: { id: true },
            });
            for (const r of reminders) {
                await tx.pACEscalation.deleteMany({ where: { reminderId: r.id } });
            }
            await tx.pACReminder.deleteMany({ where: { userId } });
            await tx.pACSettings.deleteMany({ where: { userId } });

            // Delete council data
            const sessions = await tx.councilSession.findMany({
                where: { userId },
                select: { id: true },
            });
            for (const s of sessions) {
                await tx.councilResponse.deleteMany({ where: { sessionId: s.id } });
            }
            await tx.councilSession.deleteMany({ where: { userId } });

            // Delete chat data
            await tx.message.deleteMany({ where: { userId } });
            await tx.chat.deleteMany({ where: { userId } });

            // Delete import data
            const jobs = await tx.importJob.findMany({ where: { userId }, select: { id: true } });
            for (const j of jobs) {
                await tx.importEntity.deleteMany({ where: { jobId: j.id } });
            }
            await tx.importJob.deleteMany({ where: { userId } });

            // Delete scheduled tasks
            await tx.scheduledTask.deleteMany({ where: { userId } });

            // Delete billing
            const account = await tx.billingAccount.findUnique({ where: { userId } });
            if (account) {
                await tx.creditLog.deleteMany({ where: { billingAccountId: account.id } });
                await tx.billingAccount.delete({ where: { userId } });
            }

            // Delete gamification
            await tx.gamificationProfile.deleteMany({ where: { userId } });

            // Delete notifications
            await tx.notificationLog.deleteMany({ where: { userId } });

            // Delete user sessions and accounts (Better Auth)
            await tx.session.deleteMany({ where: { userId } });
            await tx.account.deleteMany({ where: { userId } });

            // Delete user
            await tx.user.delete({ where: { id: userId } });
        });

        // Delete memories from OpenMemory (outside transaction - different store)
        try {
            const memories = await openMemory.listMemories(userId, { limit: 10000 });
            for (const m of memories) {
                await openMemory.deleteMemory(m.id);
            }
        } catch {
            // Best-effort memory deletion
        }

        // Audit log the account deletion
        await auditLog({
            userId,
            action: 'ACCOUNT_DELETE',
            resource: 'user',
            ip: c.req.header('x-forwarded-for') || 'unknown',
        });

        return c.json({ success: true, message: 'Account and all data deleted permanently.' });
    } catch (error) {
        console.error('[Account] Deletion failed:', error);
        return c.json({ error: 'Account deletion failed. Please contact support.' }, 500);
    }
});

// GET /export - GDPR Art. 20 data portability (full structured export)
accountRoutes.get('/export', async (c) => {
    const userId = c.get('userId') as string | null;
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    try {
        const { prisma } = await import('../lib/prisma');

        const [
            user,
            chats,
            memories,
            billingAccount,
            pacReminders,
            pacSettings,
            councilSessions,
            gamificationProfile,
            notificationPreferences,
        ] = await Promise.all([
            prisma.user.findUnique({
                where: { id: userId },
                select: { id: true, email: true, name: true, tier: true, createdAt: true },
            }),
            prisma.chat.findMany({
                where: { userId },
                include: {
                    messages: {
                        select: {
                            role: true,
                            content: true,
                            modelUsed: true,
                            tokensIn: true,
                            tokensOut: true,
                            costUsd: true,
                            createdAt: true,
                        },
                    },
                },
            }),
            prisma.memory.findMany({
                where: { userId },
                select: {
                    content: true,
                    summary: true,
                    type: true,
                    sector: true,
                    importance: true,
                    tags: true,
                    createdAt: true,
                },
            }),
            prisma.billingAccount.findUnique({
                where: { userId },
                include: {
                    creditHistory: { select: { amount: true, reason: true, createdAt: true } },
                },
            }),
            prisma.pACReminder.findMany({
                where: { userId },
                select: { content: true, status: true, triggerAt: true, createdAt: true },
            }),
            prisma.pACSettings.findUnique({ where: { userId } }),
            prisma.councilSession.findMany({
                where: { userId },
                include: {
                    responses: { select: { modelId: true, content: true, createdAt: true } },
                },
            }),
            prisma.gamificationProfile.findUnique({
                where: { userId },
                include: { achievements: true, xpLogs: true },
            }),
            prisma.notificationPreferences.findUnique({ where: { userId } }),
        ]);

        const exportData = {
            exportedAt: new Date().toISOString(),
            gdprArticle: '20',
            user,
            chats: chats.map((chat) => ({
                title: chat.title,
                model: chat.modelPreference,
                createdAt: chat.createdAt,
                messages: chat.messages,
            })),
            memories,
            billing: billingAccount,
            pacReminders,
            pacSettings,
            councilSessions: councilSessions.map((s) => ({
                query: s.query,
                responses: s.responses,
                createdAt: s.createdAt,
            })),
            gamification: gamificationProfile,
            notificationPreferences,
        };

        return c.json(exportData, 200, {
            'Content-Disposition': `attachment; filename="yula-export-${userId}.json"`,
        });
    } catch (error) {
        console.error('[GDPR Export] Failed:', error);
        return c.json({ error: 'Export failed' }, 500);
    }
});

export default accountRoutes;

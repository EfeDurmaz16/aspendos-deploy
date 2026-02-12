/**
 * GDPR Compliance Routes
 *
 * Implements GDPR requirements:
 * - Article 17: Right to Erasure (account deletion)
 * - Article 20: Right to Data Portability (data export)
 */

import { Hono } from 'hono';
import { auditLog } from '../lib/audit-log';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import * as openMemory from '../services/openmemory.service';

const app = new Hono();

// All routes require authentication
app.use('*', requireAuth);

// ============================================
// GDPR DATA EXPORT (Article 20)
// ============================================

// Rate limit: 1 export per hour per user (in-memory throttle)
const exportLimiter = new Map<string, number>();

/**
 * GET /api/gdpr/export - Export all user data as JSON
 *
 * Includes:
 * - User profile
 * - All chats and messages
 * - All memories
 * - PAC reminders and settings
 * - Billing information
 * - Council sessions
 * - Import history
 */
app.get('/export', async (c) => {
    const userId = c.get('userId')!;
    const ip = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown';

    // Rate limit: 1 export per hour
    const lastExport = exportLimiter.get(userId) || 0;
    const ONE_HOUR = 60 * 60 * 1000;
    if (Date.now() - lastExport < ONE_HOUR) {
        const waitMinutes = Math.ceil((ONE_HOUR - (Date.now() - lastExport)) / 60000);
        return c.json(
            { error: `Export rate limited. Please wait ${waitMinutes} minutes between exports.` },
            429
        );
    }
    exportLimiter.set(userId, Date.now());

    try {
        // Audit log the export request
        await auditLog({
            userId,
            action: 'GDPR_EXPORT',
            resource: 'user_data',
            ip,
        });

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
        ] = await Promise.all([
            prisma.user.findUnique({
                where: { id: userId },
                select: { id: true, name: true, email: true, createdAt: true, tier: true },
            }),
            prisma.chat.findMany({
                where: { userId },
                include: {
                    messages: {
                        select: {
                            role: true,
                            content: true,
                            createdAt: true,
                            modelUsed: true,
                        },
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
                include: {
                    responses: {
                        select: {
                            persona: true,
                            content: true,
                            status: true,
                        },
                    },
                },
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
        ]);

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
            chats: chats.map((chat) => ({
                id: chat.id,
                title: chat.title,
                createdAt: chat.createdAt,
                messages: chat.messages,
            })),
            memories: memories.map((m) => ({
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
            councilSessions: councilSessions.map((s) => ({
                id: s.id,
                query: s.query,
                status: s.status,
                selectedPersona: s.selectedPersona,
                synthesis: s.synthesis,
                createdAt: s.createdAt,
                responses: s.responses,
            })),
            importHistory: importJobs,
        });
    } catch (error) {
        console.error('[GDPR] Data export failed:', error);
        return c.json({ error: 'Export failed' }, 500);
    }
});

// ============================================
// ACCOUNT DELETION (Article 17)
// ============================================

/**
 * DELETE /api/gdpr/account - Delete user account and all data
 *
 * Requires confirmation phrase for safety.
 * Performs cascade deletion of all user-related data.
 */
app.delete('/account', async (c) => {
    const userId = c.get('userId')!;
    const ip = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown';

    try {
        const body = await c.req.json();

        // Safety check: require explicit confirmation
        if (body.confirmation !== 'DELETE MY ACCOUNT') {
            return c.json(
                {
                    error: 'Confirmation required. Please provide: { "confirmation": "DELETE MY ACCOUNT" }',
                },
                400
            );
        }

        // Audit log the deletion request BEFORE deleting
        await auditLog({
            userId,
            action: 'ACCOUNT_DELETE',
            resource: 'user_account',
            ip,
            metadata: {
                confirmation: body.confirmation,
            },
        });

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
            const jobs = await tx.importJob.findMany({
                where: { userId },
                select: { id: true },
            });
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
            await tx.achievement.deleteMany({ where: { userId } });
            await tx.xPEvent.deleteMany({ where: { userId } });

            // Delete notifications
            await tx.notification.deleteMany({ where: { userId } });

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
        } catch (memError) {
            console.error('[GDPR] Memory deletion failed (best-effort):', memError);
            // Best-effort memory deletion - continue even if it fails
        }

        return c.json({
            success: true,
            message: 'Account and all data deleted permanently.',
        });
    } catch (error) {
        console.error('[GDPR] Account deletion failed:', error);
        return c.json({ error: 'Account deletion failed. Please contact support.' }, 500);
    }
});

export default app;

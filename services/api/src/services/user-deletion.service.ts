/**
 * User Deletion & GDPR Compliance Service
 * Handles account deletion scheduling, data export, anonymization, and data summaries.
 *
 * GDPR Articles covered:
 * - Art. 17: Right to Erasure (account deletion with grace period)
 * - Art. 20: Data Portability (full data export)
 * - Art. 15: Right of Access (data summary)
 */

import { prisma } from '@aspendos/db';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface DataSummary {
    userId: string;
    counts: {
        chats: number;
        messages: number;
        memories: number;
        reminders: number;
        councilSessions: number;
        importJobs: number;
        achievements: number;
        notifications: number;
        auditLogs: number;
        apiKeys: number;
    };
    storageEstimateBytes: number;
    accountCreatedAt: Date | null;
    lastActiveAt: Date | null;
}

export interface ExportData {
    exportedAt: string;
    format: 'YULA_GDPR_EXPORT_V1';
    user: {
        id: string;
        email: string;
        name: string | null;
        createdAt: Date;
    } | null;
    chats: Array<{
        id: string;
        title: string | null;
        createdAt: Date;
        messages: Array<{
            role: string;
            content: string;
            createdAt: Date;
            modelUsed: string | null;
        }>;
    }>;
    memories: Array<{
        content: string;
        type: string | null;
        sector: string | null;
        createdAt: Date;
    }>;
    reminders: Array<{
        content: string;
        type: string;
        status: string;
        triggerAt: Date | null;
        createdAt: Date;
    }>;
    billing: {
        plan: string;
        creditUsed: number;
        monthlyCredit: number;
        createdAt: Date;
    } | null;
    councilSessions: Array<{
        id: string;
        query: string;
        status: string;
        createdAt: Date;
        responses: Array<{
            persona: string | null;
            content: string;
        }>;
    }>;
    notifications: Array<{
        type: string;
        title: string;
        body: string | null;
        createdAt: Date;
    }>;
}

export interface DeletionSchedule {
    scheduledDate: Date;
    cancellationToken: string;
}

// ─── In-Memory Stores (would use Redis/DB in production) ─────────────────────

/** Tracks pending deletions: userId -> { scheduledDate, cancellationToken, reason } */
const pendingDeletions = new Map<
    string,
    {
        scheduledDate: Date;
        cancellationToken: string;
        reason?: string;
        requestedAt: Date;
    }
>();

/** Tracks export jobs: jobId -> { userId, status, createdAt, completedAt, downloadUrl } */
const exportJobs = new Map<
    string,
    {
        userId: string;
        status: 'queued' | 'processing' | 'ready' | 'expired';
        createdAt: Date;
        completedAt: Date | null;
        downloadUrl: string | null;
        data: ExportData | null;
    }
>();

// Grace period: 7 days
const DELETION_GRACE_PERIOD_MS = 7 * 24 * 60 * 60 * 1000;

// Export expiry: 24 hours
const EXPORT_EXPIRY_MS = 24 * 60 * 60 * 1000;

// ─── Export Job Processing ───────────────────────────────────────────────────

/**
 * Queue a data export job for a user.
 * Returns a job ID that can be polled for status.
 */
export function queueExportJob(userId: string): {
    jobId: string;
    status: 'queued';
    estimatedCompletionMs: number;
} {
    const jobId = crypto.randomUUID();

    exportJobs.set(jobId, {
        userId,
        status: 'queued',
        createdAt: new Date(),
        completedAt: null,
        downloadUrl: null,
        data: null,
    });

    // Simulate async processing (in production, this would be a job queue worker)
    processExportJob(jobId, userId).catch((err) => {
        console.error(`[GDPR Export] Job ${jobId} failed:`, err);
        const job = exportJobs.get(jobId);
        if (job) {
            job.status = 'expired';
        }
    });

    return {
        jobId,
        status: 'queued',
        estimatedCompletionMs: 30_000,
    };
}

/**
 * Get the status of an export job.
 */
export function getExportJobStatus(jobId: string): {
    jobId: string;
    status: 'queued' | 'processing' | 'ready' | 'expired';
    downloadUrl?: string;
} | null {
    const job = exportJobs.get(jobId);
    if (!job) return null;

    // Check expiry
    if (
        job.status === 'ready' &&
        job.completedAt &&
        Date.now() - job.completedAt.getTime() > EXPORT_EXPIRY_MS
    ) {
        job.status = 'expired';
        job.downloadUrl = null;
        job.data = null;
    }

    return {
        jobId,
        status: job.status,
        downloadUrl: job.downloadUrl ?? undefined,
    };
}

/**
 * Get the userId that owns a specific export job (for authorization checks).
 */
export function getExportJobOwner(jobId: string): string | null {
    const job = exportJobs.get(jobId);
    return job?.userId ?? null;
}

/**
 * Process an export job asynchronously.
 * Gathers all user data from the database.
 */
async function processExportJob(jobId: string, userId: string): Promise<void> {
    const job = exportJobs.get(jobId);
    if (!job) return;

    job.status = 'processing';

    const exportData = await exportUserData(userId);

    job.status = 'ready';
    job.completedAt = new Date();
    job.data = exportData;
    // In production, this would upload to a signed S3 URL
    job.downloadUrl = `/api/compliance/export/${jobId}/download`;
}

// ─── Data Export ─────────────────────────────────────────────────────────────

/**
 * Gather all user data for export (GDPR Art. 20 - Data Portability).
 */
export async function exportUserData(userId: string): Promise<ExportData> {
    const prismaAny = prisma as any;
    const notificationModel = prismaAny.notificationLog ?? prismaAny.notification;

    const [user, chats, memories, reminders, billingAccount, councilSessions, notifications] =
        await Promise.all([
            prisma.user.findUnique({
                where: { id: userId },
                select: { id: true, email: true, name: true, createdAt: true },
            }),
            prisma.chat.findMany({
                where: { userId },
                include: {
                    messages: {
                        select: { role: true, content: true, createdAt: true, modelUsed: true },
                    },
                },
                orderBy: { createdAt: 'desc' },
            }),
            prisma.memory.findMany({
                where: { userId },
                select: { content: true, type: true, sector: true, createdAt: true },
            }),
            prisma.pACReminder.findMany({
                where: { userId },
                select: {
                    content: true,
                    type: true,
                    status: true,
                    triggerAt: true,
                    createdAt: true,
                },
            }),
            prisma.billingAccount.findUnique({
                where: { userId },
                select: {
                    plan: true,
                    creditUsed: true,
                    monthlyCredit: true,
                    createdAt: true,
                },
            }),
            prisma.councilSession.findMany({
                where: { userId },
                include: {
                    responses: { select: { persona: true, content: true } },
                },
                orderBy: { createdAt: 'desc' },
            }),
            notificationModel.findMany({
                where: { userId },
                select: prismaAny.notificationLog
                    ? { type: true, title: true, message: true, createdAt: true }
                    : { type: true, title: true, body: true, createdAt: true },
                orderBy: { createdAt: 'desc' },
            }),
        ]);

    return {
        exportedAt: new Date().toISOString(),
        format: 'YULA_GDPR_EXPORT_V1',
        user,
        chats: chats.map((chat: any) => ({
            id: chat.id,
            title: chat.title,
            createdAt: chat.createdAt,
            messages: chat.messages,
        })),
        memories,
        reminders,
        billing: billingAccount,
        councilSessions: councilSessions.map((s: any) => ({
            id: s.id,
            query: s.query,
            status: s.status,
            createdAt: s.createdAt,
            responses: s.responses,
        })),
        notifications: notifications.map((n: any) => ({
            type: n.type,
            title: n.title,
            body: n.message ?? n.body ?? null,
            createdAt: n.createdAt,
        })),
    };
}

// ─── Data Summary ────────────────────────────────────────────────────────────

/**
 * Get a summary of all stored data for a user (GDPR Art. 15 - Right of Access).
 */
export async function getDataSummary(userId: string): Promise<DataSummary> {
    const prismaAny = prisma as any;
    const notificationModel = prismaAny.notificationLog ?? prismaAny.notification;

    const [
        chatCount,
        messageCount,
        memoryCount,
        reminderCount,
        councilSessionCount,
        importJobCount,
        achievementCount,
        notificationCount,
        auditLogCount,
        apiKeyCount,
        user,
        lastMessage,
    ] = await Promise.all([
        prisma.chat.count({ where: { userId } }),
        prisma.message.count({ where: { userId } }),
        prisma.memory.count({ where: { userId } }),
        prisma.pACReminder.count({ where: { userId } }),
        prisma.councilSession.count({ where: { userId } }),
        prisma.importJob.count({ where: { userId } }),
        prisma.achievement.count({ where: { profile: { userId } } }),
        notificationModel.count({ where: { userId } }),
        prisma.auditLog.count({ where: { userId } }),
        prisma.apiKey.count({ where: { userId } }),
        prisma.user.findUnique({
            where: { id: userId },
            select: { createdAt: true },
        }),
        prisma.message.findFirst({
            where: { userId, role: 'user' },
            orderBy: { createdAt: 'desc' },
            select: { createdAt: true },
        }),
    ]);

    // Rough storage estimate: ~2KB per message, ~1KB per memory, ~500B per notification
    const storageEstimateBytes =
        messageCount * 2048 + memoryCount * 1024 + notificationCount * 512 + chatCount * 256;

    return {
        userId,
        counts: {
            chats: chatCount,
            messages: messageCount,
            memories: memoryCount,
            reminders: reminderCount,
            councilSessions: councilSessionCount,
            importJobs: importJobCount,
            achievements: achievementCount,
            notifications: notificationCount,
            auditLogs: auditLogCount,
            apiKeys: apiKeyCount,
        },
        storageEstimateBytes,
        accountCreatedAt: user?.createdAt ?? null,
        lastActiveAt: lastMessage?.createdAt ?? null,
    };
}

// ─── Account Deletion ────────────────────────────────────────────────────────

/**
 * Schedule account deletion with a 7-day grace period.
 * Returns a cancellation token the user can use to abort.
 */
export async function scheduleAccountDeletion(
    userId: string,
    reason?: string
): Promise<DeletionSchedule> {
    // Check if already scheduled
    const existing = pendingDeletions.get(userId);
    if (existing) {
        return {
            scheduledDate: existing.scheduledDate,
            cancellationToken: existing.cancellationToken,
        };
    }

    const cancellationToken = crypto.randomUUID();
    const scheduledDate = new Date(Date.now() + DELETION_GRACE_PERIOD_MS);

    pendingDeletions.set(userId, {
        scheduledDate,
        cancellationToken,
        reason,
        requestedAt: new Date(),
    });

    return { scheduledDate, cancellationToken };
}

/**
 * Cancel a pending account deletion using the cancellation token.
 */
export async function cancelDeletion(userId: string, token: string): Promise<boolean> {
    const pending = pendingDeletions.get(userId);

    if (!pending) {
        return false;
    }

    if (pending.cancellationToken !== token) {
        return false;
    }

    pendingDeletions.delete(userId);
    return true;
}

/**
 * Check if a user has a pending deletion.
 */
export function getPendingDeletion(
    userId: string
): { scheduledDate: Date; reason?: string } | null {
    const pending = pendingDeletions.get(userId);
    if (!pending) return null;
    return { scheduledDate: pending.scheduledDate, reason: pending.reason };
}

// ─── Account Anonymization ───────────────────────────────────────────────────

/**
 * Anonymize a user account: strip PII but keep aggregate/analytical data.
 * This is an alternative to full deletion under GDPR Art. 17(3).
 */
export async function anonymizeUser(userId: string): Promise<void> {
    const anonymizedEmail = `anon-${crypto.randomUUID()}@deleted.yula.dev`;
    const anonymizedName = 'Anonymized User';

    await prisma.$transaction(async (tx) => {
        const txAny = tx as any;
        const notificationModel = txAny.notificationLog ?? txAny.notification;
        const notificationData = txAny.notificationLog
            ? { title: '[anonymized]', message: '[anonymized]' }
            : { title: '[anonymized]', body: '[anonymized]' };

        // Anonymize user record
        await tx.user.update({
            where: { id: userId },
            data: {
                email: anonymizedEmail,
                name: anonymizedName,
                image: null,
            },
        });

        // Clear session data
        await tx.session.deleteMany({ where: { userId } });

        // Clear auth accounts (OAuth links)
        await tx.account.deleteMany({ where: { userId } });

        // Anonymize notification content
        await notificationModel.updateMany({
            where: { userId },
            data: notificationData,
        });

        // Delete API keys
        await tx.apiKey.deleteMany({ where: { userId } });
    });
}

// ─── Testing Helpers ─────────────────────────────────────────────────────────

/**
 * Clear all in-memory stores (for testing only).
 */
export function clearStores_forTesting(): void {
    pendingDeletions.clear();
    exportJobs.clear();
}

/**
 * Get the pending deletions map (for testing only).
 */
export function getPendingDeletions_forTesting(): typeof pendingDeletions {
    return pendingDeletions;
}

/**
 * Get the export jobs map (for testing only).
 */
export function getExportJobs_forTesting(): typeof exportJobs {
    return exportJobs;
}

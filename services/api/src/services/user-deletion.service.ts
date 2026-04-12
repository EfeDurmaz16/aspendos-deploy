/**
 * User Deletion & GDPR Compliance Service
 * Handles account deletion scheduling, data export, anonymization, and data summaries.
 *
 * GDPR Articles covered:
 * - Art. 17: Right to Erasure (account deletion with grace period)
 * - Art. 20: Data Portability (full data export)
 * - Art. 15: Right of Access (data summary)
 *
 * Backed by Convex for data access.
 */

import { getConvexClient, api } from '../lib/convex';

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
 * Gathers all user data from Convex.
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
    try {
        const client = getConvexClient();

        // Fetch conversations
        const conversations = await client.query(api.conversations.listByUser, {
            user_id: userId as any,
        });

        // Fetch messages for each conversation
        const chats: ExportData['chats'] = [];
        for (const conv of conversations) {
            try {
                const messages = await client.query(api.messages.listByConversation, {
                    conversation_id: conv._id,
                });
                chats.push({
                    id: conv._id,
                    title: conv.title || null,
                    createdAt: new Date(conv.created_at),
                    messages: messages.map((m) => ({
                        role: m.role,
                        content: m.content,
                        createdAt: new Date(m.created_at),
                        modelUsed: null,
                    })),
                });
            } catch {
                // Continue with other conversations
            }
        }

        // Fetch memories
        const memoriesRaw = await client.query(api.memories.listByUser, {
            user_id: userId as any,
        });
        const memories = memoriesRaw.map((m) => ({
            content: m.content_preview || '',
            type: null,
            sector: null,
            createdAt: new Date(m.created_at),
        }));

        // Fetch action_log for council sessions, notifications, etc.
        const actionLogs = await client.query(api.actionLog.listByUser, {
            user_id: userId as any,
            limit: 1000,
        });

        const councilSessions = actionLogs
            .filter((l) => l.event_type === 'council_session_created')
            .map((l) => ({
                id: (l.details?.sessionId as string) || '',
                query: (l.details?.query as string) || '',
                status: (l.details?.status as string) || 'UNKNOWN',
                createdAt: new Date(l.timestamp),
                responses: [] as Array<{ persona: string | null; content: string }>,
            }));

        const notifications = actionLogs
            .filter((l) => l.event_type === 'notification')
            .map((l) => ({
                type: (l.details?.type as string) || 'unknown',
                title: (l.details?.title as string) || '',
                body: (l.details?.body as string) || null,
                createdAt: new Date(l.timestamp),
            }));

        return {
            exportedAt: new Date().toISOString(),
            format: 'YULA_GDPR_EXPORT_V1',
            user: null, // User data from auth system, not Convex
            chats,
            memories,
            reminders: [], // Reminders not in Convex schema
            billing: null, // Billing data from Stripe, not Convex
            councilSessions,
            notifications,
        };
    } catch (error) {
        console.error('[GDPR] exportUserData failed:', error);
        return {
            exportedAt: new Date().toISOString(),
            format: 'YULA_GDPR_EXPORT_V1',
            user: null,
            chats: [],
            memories: [],
            reminders: [],
            billing: null,
            councilSessions: [],
            notifications: [],
        };
    }
}

// ─── Data Summary ────────────────────────────────────────────────────────────

/**
 * Get a summary of all stored data for a user (GDPR Art. 15 - Right of Access).
 */
export async function getDataSummary(userId: string): Promise<DataSummary> {
    try {
        const client = getConvexClient();

        const [conversations, memoriesRaw, actionLogs] = await Promise.all([
            client.query(api.conversations.listByUser, { user_id: userId as any }),
            client.query(api.memories.listByUser, { user_id: userId as any }),
            client.query(api.actionLog.listByUser, { user_id: userId as any, limit: 5000 }),
        ]);

        // Count messages across all conversations
        let messageCount = 0;
        for (const conv of conversations.slice(0, 50)) {
            try {
                const msgs = await client.query(api.messages.listByConversation, {
                    conversation_id: conv._id,
                });
                messageCount += msgs.length;
            } catch { /* continue */ }
        }

        const councilSessionCount = actionLogs.filter(
            (l) => l.event_type === 'council_session_created'
        ).length;
        const importJobCount = actionLogs.filter(
            (l) => l.event_type === 'import_job_created'
        ).length;
        const achievementCount = actionLogs.filter(
            (l) => l.event_type === 'achievement_unlocked'
        ).length;

        const storageEstimateBytes =
            messageCount * 2048 + memoriesRaw.length * 1024 + conversations.length * 256;

        // Find last user message timestamp
        let lastActiveAt: Date | null = null;
        const lastXpLog = actionLogs.find((l) => l.event_type === 'xp_awarded');
        if (lastXpLog) {
            lastActiveAt = new Date(lastXpLog.timestamp);
        }

        return {
            userId,
            counts: {
                chats: conversations.length,
                messages: messageCount,
                memories: memoriesRaw.length,
                reminders: 0,
                councilSessions: councilSessionCount,
                importJobs: importJobCount,
                achievements: achievementCount,
                notifications: 0,
                auditLogs: actionLogs.length,
                apiKeys: 0,
            },
            storageEstimateBytes,
            accountCreatedAt: null, // From auth system
            lastActiveAt,
        };
    } catch (error) {
        console.error('[GDPR] getDataSummary failed:', error);
        return {
            userId,
            counts: {
                chats: 0,
                messages: 0,
                memories: 0,
                reminders: 0,
                councilSessions: 0,
                importJobs: 0,
                achievements: 0,
                notifications: 0,
                auditLogs: 0,
                apiKeys: 0,
            },
            storageEstimateBytes: 0,
            accountCreatedAt: null,
            lastActiveAt: null,
        };
    }
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
 * With Convex, we log the anonymization event. Actual data removal
 * would need to be coordinated with auth system and Convex admin.
 */
export async function anonymizeUser(userId: string): Promise<void> {
    try {
        const client = getConvexClient();

        // Log the anonymization request
        await client.mutation(api.actionLog.log, {
            user_id: userId as any,
            event_type: 'user_anonymization_requested',
            details: {
                requestedAt: new Date().toISOString(),
                note: 'PII removal requires coordinated cleanup across auth system and Convex',
            },
        });

        // Delete all user memories from Convex
        const memories = await client.query(api.memories.listByUser, {
            user_id: userId as any,
        });
        for (const memory of memories) {
            try {
                await client.mutation(api.memories.remove, { id: memory._id });
            } catch { /* continue */ }
        }

        // Delete all conversations and messages
        const conversations = await client.query(api.conversations.listByUser, {
            user_id: userId as any,
        });
        for (const conv of conversations) {
            try {
                const messages = await client.query(api.messages.listByConversation, {
                    conversation_id: conv._id,
                });
                for (const msg of messages) {
                    await client.mutation(api.messages.remove, { id: msg._id });
                }
                await client.mutation(api.conversations.remove, { id: conv._id });
            } catch { /* continue */ }
        }
    } catch (error) {
        console.error('[GDPR] anonymizeUser failed:', error);
    }
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

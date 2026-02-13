/**
 * Data Retention Policy Enforcement
 *
 * GDPR-compliant data retention with configurable policies per data type.
 * Designed to run as a daily cron job via Railway or similar scheduler.
 */
import { prisma } from './prisma';

// Retention policies (in days)
const RETENTION_POLICIES = {
    // Archived chats older than 1 year are deleted
    archivedChats: 365,
    // Notification logs older than 90 days are pruned
    notificationLogs: 90,
    // Credit logs older than 2 years are pruned (keep for tax/audit)
    creditLogs: 730,
    // Expired sessions are cleaned up after 30 days
    expiredSessions: 30,
    // Inactive memories with low decay score after 180 days
    decayedMemories: 180,
    // Memory feedback older than 1 year
    memoryFeedback: 365,
    // Completed/failed scheduled tasks older than 90 days
    completedScheduledTasks: 90,
} as const;

interface RetentionResult {
    policy: string;
    deleted: number;
    error?: string;
}

/**
 * Run all retention policies. Returns a summary of what was cleaned up.
 */
export async function enforceRetentionPolicies(): Promise<RetentionResult[]> {
    const results: RetentionResult[] = [];
    const now = new Date();

    // 1. Delete archived chats older than retention period
    try {
        const cutoff = new Date(now.getTime() - RETENTION_POLICIES.archivedChats * 86400000);
        const result = await prisma.chat.deleteMany({
            where: {
                isArchived: true,
                updatedAt: { lt: cutoff },
            },
        });
        results.push({ policy: 'archivedChats', deleted: result.count });
    } catch (error) {
        results.push({
            policy: 'archivedChats',
            deleted: 0,
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }

    // 2. Prune old notification logs
    try {
        const cutoff = new Date(now.getTime() - RETENTION_POLICIES.notificationLogs * 86400000);
        const result = await prisma.notificationLog.deleteMany({
            where: {
                createdAt: { lt: cutoff },
            },
        });
        results.push({ policy: 'notificationLogs', deleted: result.count });
    } catch (error) {
        results.push({
            policy: 'notificationLogs',
            deleted: 0,
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }

    // 3. Prune old credit logs (keep recent for billing disputes)
    try {
        const cutoff = new Date(now.getTime() - RETENTION_POLICIES.creditLogs * 86400000);
        const result = await prisma.creditLog.deleteMany({
            where: {
                createdAt: { lt: cutoff },
            },
        });
        results.push({ policy: 'creditLogs', deleted: result.count });
    } catch (error) {
        results.push({
            policy: 'creditLogs',
            deleted: 0,
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }

    // 4. Clean expired sessions
    try {
        const cutoff = new Date(now.getTime() - RETENTION_POLICIES.expiredSessions * 86400000);
        const result = await prisma.session.deleteMany({
            where: {
                expiresAt: { lt: cutoff },
            },
        });
        results.push({ policy: 'expiredSessions', deleted: result.count });
    } catch (error) {
        results.push({
            policy: 'expiredSessions',
            deleted: 0,
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }

    // 5. Deactivate decayed memories (low decay score + old last access)
    try {
        const cutoff = new Date(now.getTime() - RETENTION_POLICIES.decayedMemories * 86400000);
        const result = await prisma.memory.updateMany({
            where: {
                isActive: true,
                isPinned: false,
                decayScore: { lt: 0.1 },
                lastAccessedAt: { lt: cutoff },
            },
            data: {
                isActive: false,
            },
        });
        results.push({ policy: 'decayedMemories', deleted: result.count });
    } catch (error) {
        results.push({
            policy: 'decayedMemories',
            deleted: 0,
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }

    // 6. Delete old memory feedback
    try {
        const cutoff = new Date(now.getTime() - RETENTION_POLICIES.memoryFeedback * 86400000);
        const result = await prisma.memoryFeedback.deleteMany({
            where: {
                createdAt: { lt: cutoff },
            },
        });
        results.push({ policy: 'memoryFeedback', deleted: result.count });
    } catch (error) {
        results.push({
            policy: 'memoryFeedback',
            deleted: 0,
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }

    // 7. Clean up completed/failed scheduled tasks
    try {
        const cutoff = new Date(
            now.getTime() - RETENTION_POLICIES.completedScheduledTasks * 86400000
        );
        const result = await prisma.scheduledTask.deleteMany({
            where: {
                status: { in: ['COMPLETED', 'FAILED'] },
                updatedAt: { lt: cutoff },
            },
        });
        results.push({ policy: 'completedScheduledTasks', deleted: result.count });
    } catch (error) {
        results.push({
            policy: 'completedScheduledTasks',
            deleted: 0,
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }

    return results;
}

/**
 * Get current retention policy configuration
 */
export function getRetentionPolicies() {
    return { ...RETENTION_POLICIES };
}

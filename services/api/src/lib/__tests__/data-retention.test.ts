import { prisma } from '@aspendos/db';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { enforceRetentionPolicies, getRetentionPolicies } from '../data-retention';

vi.mock('@aspendos/db', () => ({
    prisma: {
        chat: { deleteMany: vi.fn() },
        notificationLog: { deleteMany: vi.fn() },
        creditLog: { deleteMany: vi.fn() },
        session: { deleteMany: vi.fn() },
        memory: { updateMany: vi.fn() },
        memoryFeedback: { deleteMany: vi.fn() },
        scheduledTask: { deleteMany: vi.fn() },
    },
}));

const mockPrisma = prisma as any;

describe('Data Retention', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('getRetentionPolicies', () => {
        it('should return all expected retention policies', () => {
            const policies = getRetentionPolicies();

            expect(policies).toHaveProperty('archivedChats');
            expect(policies).toHaveProperty('notificationLogs');
            expect(policies).toHaveProperty('creditLogs');
            expect(policies).toHaveProperty('expiredSessions');
            expect(policies).toHaveProperty('decayedMemories');
            expect(policies).toHaveProperty('memoryFeedback');
            expect(policies).toHaveProperty('completedScheduledTasks');
        });

        it('should have correct retention period for archived chats', () => {
            const policies = getRetentionPolicies();
            expect(policies.archivedChats).toBe(365);
        });

        it('should have correct retention period for notification logs', () => {
            const policies = getRetentionPolicies();
            expect(policies.notificationLogs).toBe(90);
        });

        it('should have correct retention period for credit logs', () => {
            const policies = getRetentionPolicies();
            expect(policies.creditLogs).toBe(730);
        });

        it('should have correct retention period for expired sessions', () => {
            const policies = getRetentionPolicies();
            expect(policies.expiredSessions).toBe(30);
        });

        it('should have correct retention period for decayed memories', () => {
            const policies = getRetentionPolicies();
            expect(policies.decayedMemories).toBe(180);
        });

        it('should have correct retention period for memory feedback', () => {
            const policies = getRetentionPolicies();
            expect(policies.memoryFeedback).toBe(365);
        });

        it('should have correct retention period for completed scheduled tasks', () => {
            const policies = getRetentionPolicies();
            expect(policies.completedScheduledTasks).toBe(90);
        });

        it('should have all positive retention periods', () => {
            const policies = getRetentionPolicies();
            const values = Object.values(policies);

            for (const value of values) {
                expect(value).toBeGreaterThan(0);
                expect(typeof value).toBe('number');
            }
        });

        it('should have sensible retention periods (not too short)', () => {
            const policies = getRetentionPolicies();

            // All retention periods should be at least 30 days
            expect(policies.archivedChats).toBeGreaterThanOrEqual(30);
            expect(policies.notificationLogs).toBeGreaterThanOrEqual(30);
            expect(policies.creditLogs).toBeGreaterThanOrEqual(30);
            expect(policies.expiredSessions).toBeGreaterThanOrEqual(30);
            expect(policies.decayedMemories).toBeGreaterThanOrEqual(30);
            expect(policies.memoryFeedback).toBeGreaterThanOrEqual(30);
            expect(policies.completedScheduledTasks).toBeGreaterThanOrEqual(30);
        });

        it('should have sensible retention periods (not too long)', () => {
            const policies = getRetentionPolicies();

            // All retention periods should be at most 5 years (1825 days)
            expect(policies.archivedChats).toBeLessThanOrEqual(1825);
            expect(policies.notificationLogs).toBeLessThanOrEqual(1825);
            expect(policies.creditLogs).toBeLessThanOrEqual(1825);
            expect(policies.expiredSessions).toBeLessThanOrEqual(1825);
            expect(policies.decayedMemories).toBeLessThanOrEqual(1825);
            expect(policies.memoryFeedback).toBeLessThanOrEqual(1825);
            expect(policies.completedScheduledTasks).toBeLessThanOrEqual(1825);
        });

        it('should keep credit logs longer than other logs for audit purposes', () => {
            const policies = getRetentionPolicies();

            // Credit logs should be kept longer than notification logs
            expect(policies.creditLogs).toBeGreaterThan(policies.notificationLogs);
            // Credit logs should be kept longer than completed tasks
            expect(policies.creditLogs).toBeGreaterThan(policies.completedScheduledTasks);
        });

        it('should keep archived chats for at least 1 year', () => {
            const policies = getRetentionPolicies();
            expect(policies.archivedChats).toBeGreaterThanOrEqual(365);
        });

        it('should not mutate the original policies object', () => {
            const policies1 = getRetentionPolicies();
            const policies2 = getRetentionPolicies();

            expect(policies1).toEqual(policies2);
            expect(policies1).not.toBe(policies2);
        });

        it('should return a new object each time', () => {
            const policies1 = getRetentionPolicies();
            const policies2 = getRetentionPolicies();

            // Modify one and ensure the other is not affected
            (policies1 as any).archivedChats = 999;
            expect(policies2.archivedChats).toBe(365);
        });

        it('should have credit logs retention period of 2 years for tax compliance', () => {
            const policies = getRetentionPolicies();
            expect(policies.creditLogs).toBe(730); // 2 years = 730 days
        });

        it('should have reasonable retention for short-lived data', () => {
            const policies = getRetentionPolicies();

            // Expired sessions and notification logs should be cleaned up relatively quickly
            expect(policies.expiredSessions).toBeLessThanOrEqual(90);
            expect(policies.notificationLogs).toBeLessThanOrEqual(90);
            expect(policies.completedScheduledTasks).toBeLessThanOrEqual(90);
        });

        it('should have reasonable retention for user-facing data', () => {
            const policies = getRetentionPolicies();

            // User data should be kept longer
            expect(policies.archivedChats).toBeGreaterThanOrEqual(180);
            expect(policies.memoryFeedback).toBeGreaterThanOrEqual(180);
            expect(policies.decayedMemories).toBeGreaterThanOrEqual(180);
        });

        it('should return exactly 7 policies', () => {
            const policies = getRetentionPolicies();
            const policyCount = Object.keys(policies).length;
            expect(policyCount).toBe(7);
        });
    });

    describe('GDPR Compliance', () => {
        it('should have policies that align with GDPR right to erasure', () => {
            const policies = getRetentionPolicies();

            // GDPR requires data not be kept longer than necessary
            // All periods should be finite and documented
            expect(policies.archivedChats).toBeLessThan(Number.POSITIVE_INFINITY);
            expect(policies.creditLogs).toBeLessThan(Number.POSITIVE_INFINITY);
        });

        it('should have policies for all data types requiring retention limits', () => {
            const policies = getRetentionPolicies();

            // Critical data types that must have retention policies
            const requiredPolicies = [
                'archivedChats',
                'notificationLogs',
                'creditLogs',
                'expiredSessions',
                'decayedMemories',
                'memoryFeedback',
                'completedScheduledTasks',
            ];

            for (const policy of requiredPolicies) {
                expect(policies).toHaveProperty(policy);
            }
        });
    });

    describe('enforceRetentionPolicies', () => {
        it('executes all retention policies against persistent storage', async () => {
            mockPrisma.chat.deleteMany.mockResolvedValue({ count: 1 });
            mockPrisma.notificationLog.deleteMany.mockResolvedValue({ count: 2 });
            mockPrisma.creditLog.deleteMany.mockResolvedValue({ count: 3 });
            mockPrisma.session.deleteMany.mockResolvedValue({ count: 4 });
            mockPrisma.memory.updateMany.mockResolvedValue({ count: 5 });
            mockPrisma.memoryFeedback.deleteMany.mockResolvedValue({ count: 6 });
            mockPrisma.scheduledTask.deleteMany.mockResolvedValue({ count: 7 });

            const results = await enforceRetentionPolicies();

            expect(results).toEqual([
                { policy: 'archivedChats', deleted: 1 },
                { policy: 'notificationLogs', deleted: 2 },
                { policy: 'creditLogs', deleted: 3 },
                { policy: 'expiredSessions', deleted: 4 },
                { policy: 'decayedMemories', deleted: 5 },
                { policy: 'memoryFeedback', deleted: 6 },
                { policy: 'completedScheduledTasks', deleted: 7 },
            ]);
            expect(mockPrisma.chat.deleteMany).toHaveBeenCalled();
            expect(mockPrisma.memory.updateMany).toHaveBeenCalled();
            expect(mockPrisma.scheduledTask.deleteMany).toHaveBeenCalled();
        });
    });
});

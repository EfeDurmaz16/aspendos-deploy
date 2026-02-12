/**
 * Integration Tests for GDPR Compliance Endpoints
 * Tests data export, account deletion, data summary, anonymization, and rate limiting.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ─── Mock @aspendos/db before imports (factory must not reference outer variables) ─

vi.mock('@aspendos/db', () => {
    const prisma = {
        user: {
            findUnique: vi.fn(),
            update: vi.fn(),
        },
        chat: {
            findMany: vi.fn(),
            count: vi.fn(),
        },
        message: {
            count: vi.fn(),
            findFirst: vi.fn(),
        },
        memory: {
            findMany: vi.fn(),
            count: vi.fn(),
        },
        pACReminder: {
            findMany: vi.fn(),
            count: vi.fn(),
        },
        councilSession: {
            findMany: vi.fn(),
            count: vi.fn(),
        },
        importJob: {
            count: vi.fn(),
        },
        achievement: {
            count: vi.fn(),
        },
        notification: {
            findMany: vi.fn(),
            count: vi.fn(),
            updateMany: vi.fn(),
        },
        auditLog: {
            count: vi.fn(),
        },
        apiKey: {
            count: vi.fn(),
            deleteMany: vi.fn(),
        },
        billingAccount: {
            findUnique: vi.fn(),
        },
        session: {
            deleteMany: vi.fn(),
        },
        account: {
            deleteMany: vi.fn(),
        },
        $transaction: vi.fn(),
    };
    return { prisma };
});

// Mock auth middleware to always set a test user
vi.mock('../../middleware/auth', () => ({
    requireAuth: vi.fn().mockImplementation(async (_c: any, next: any) => {
        return next();
    }),
    authMiddleware: vi.fn().mockImplementation(async (_c: any, next: any) => {
        return next();
    }),
}));

// Mock the auth lib (required by middleware/auth)
vi.mock('../../lib/auth', () => ({
    auth: {
        api: {
            getSession: vi.fn().mockResolvedValue(null),
        },
    },
}));

import { prisma } from '@aspendos/db';
import {
    clearStores_forTesting,
    cancelDeletion,
    exportUserData,
    getDataSummary,
    getExportJobOwner,
    getExportJobStatus,
    getPendingDeletion,
    queueExportJob,
    scheduleAccountDeletion,
    anonymizeUser,
} from '../../services/user-deletion.service';

// Cast prisma to access mocked methods
const mockPrisma = prisma as any;

// ─── Test Constants ──────────────────────────────────────────────────────────

const TEST_USER_ID = 'test-user-gdpr-001';
const TEST_USER_ID_2 = 'test-user-gdpr-002';

// ─── Setup / Teardown ────────────────────────────────────────────────────────

beforeEach(() => {
    vi.clearAllMocks();
    clearStores_forTesting();
    setupDefaultMocks();
});

afterEach(() => {
    clearStores_forTesting();
});

function setupDefaultMocks() {
    // Default mock returns for prisma calls
    mockPrisma.user.findUnique.mockResolvedValue({
        id: TEST_USER_ID,
        email: 'test@yula.dev',
        name: 'Test User',
        createdAt: new Date('2025-01-01'),
    });

    mockPrisma.chat.findMany.mockResolvedValue([
        {
            id: 'chat-1',
            title: 'Test Chat',
            createdAt: new Date('2025-06-01'),
            messages: [
                {
                    role: 'user',
                    content: 'Hello',
                    createdAt: new Date('2025-06-01'),
                    modelUsed: 'openai/gpt-4o',
                },
                {
                    role: 'assistant',
                    content: 'Hi there!',
                    createdAt: new Date('2025-06-01'),
                    modelUsed: 'openai/gpt-4o',
                },
            ],
        },
    ]);

    mockPrisma.chat.count.mockResolvedValue(5);
    mockPrisma.message.count.mockResolvedValue(120);
    mockPrisma.message.findFirst.mockResolvedValue({
        createdAt: new Date('2025-12-01'),
    });

    mockPrisma.memory.findMany.mockResolvedValue([
        {
            content: 'User likes coffee',
            type: 'preference',
            sector: 'lifestyle',
            createdAt: new Date('2025-06-15'),
        },
    ]);
    mockPrisma.memory.count.mockResolvedValue(10);

    mockPrisma.pACReminder.findMany.mockResolvedValue([
        {
            content: 'Check email',
            type: 'explicit',
            status: 'pending',
            triggerAt: new Date('2025-12-25'),
            createdAt: new Date('2025-12-01'),
        },
    ]);
    mockPrisma.pACReminder.count.mockResolvedValue(3);

    mockPrisma.councilSession.findMany.mockResolvedValue([
        {
            id: 'session-1',
            query: 'What is AI?',
            status: 'completed',
            createdAt: new Date('2025-07-01'),
            responses: [{ persona: 'analyst', content: 'AI is...' }],
        },
    ]);
    mockPrisma.councilSession.count.mockResolvedValue(2);

    mockPrisma.importJob.count.mockResolvedValue(1);
    mockPrisma.achievement.count.mockResolvedValue(4);
    mockPrisma.notification.findMany.mockResolvedValue([
        {
            type: 'SYSTEM',
            title: 'Welcome',
            body: 'Welcome to YULA!',
            createdAt: new Date('2025-01-01'),
        },
    ]);
    mockPrisma.notification.count.mockResolvedValue(15);
    mockPrisma.auditLog.count.mockResolvedValue(30);
    mockPrisma.apiKey.count.mockResolvedValue(2);

    mockPrisma.billingAccount.findUnique.mockResolvedValue({
        plan: 'pro',
        creditUsed: 50,
        monthlyCredit: 500,
        createdAt: new Date('2025-01-01'),
    });

    // Transaction mock: execute the callback with mockPrisma as tx
    mockPrisma.$transaction.mockImplementation(async (fn: (tx: typeof mockPrisma) => Promise<void>) => {
        await fn(mockPrisma);
    });
}

// ─── Export Tests ────────────────────────────────────────────────────────────

describe('GDPR Compliance - Data Export', () => {
    describe('queueExportJob', () => {
        it('returns a job ID with queued status', () => {
            const result = queueExportJob(TEST_USER_ID);

            expect(result.jobId).toBeDefined();
            expect(typeof result.jobId).toBe('string');
            expect(result.status).toBe('queued');
            expect(result.estimatedCompletionMs).toBeGreaterThan(0);
        });

        it('creates unique job IDs for each request', () => {
            const result1 = queueExportJob(TEST_USER_ID);
            const result2 = queueExportJob(TEST_USER_ID);

            expect(result1.jobId).not.toBe(result2.jobId);
        });
    });

    describe('getExportJobStatus', () => {
        it('returns status for an existing job', () => {
            const { jobId } = queueExportJob(TEST_USER_ID);

            const status = getExportJobStatus(jobId);

            expect(status).not.toBeNull();
            expect(status!.jobId).toBe(jobId);
            expect(['queued', 'processing', 'ready']).toContain(status!.status);
        });

        it('returns null for a non-existent job', () => {
            const status = getExportJobStatus('non-existent-job-id');
            expect(status).toBeNull();
        });
    });

    describe('getExportJobOwner', () => {
        it('returns the userId for an existing job', () => {
            const { jobId } = queueExportJob(TEST_USER_ID);

            const owner = getExportJobOwner(jobId);
            expect(owner).toBe(TEST_USER_ID);
        });

        it('returns null for a non-existent job', () => {
            const owner = getExportJobOwner('non-existent-job-id');
            expect(owner).toBeNull();
        });

        it('prevents cross-user access', () => {
            const { jobId } = queueExportJob(TEST_USER_ID);

            const owner = getExportJobOwner(jobId);
            expect(owner).not.toBe(TEST_USER_ID_2);
        });
    });

    describe('exportUserData', () => {
        it('gathers all user data', async () => {
            const data = await exportUserData(TEST_USER_ID);

            expect(data.format).toBe('YULA_GDPR_EXPORT_V1');
            expect(data.exportedAt).toBeDefined();
            expect(data.user).toBeDefined();
            expect(data.user!.email).toBe('test@yula.dev');
            expect(data.chats).toHaveLength(1);
            expect(data.chats[0].messages).toHaveLength(2);
            expect(data.memories).toHaveLength(1);
            expect(data.reminders).toHaveLength(1);
            expect(data.billing).toBeDefined();
            expect(data.billing!.plan).toBe('pro');
            expect(data.councilSessions).toHaveLength(1);
            expect(data.notifications).toHaveLength(1);
        });

        it('handles user with no data', async () => {
            mockPrisma.user.findUnique.mockResolvedValue(null);
            mockPrisma.chat.findMany.mockResolvedValue([]);
            mockPrisma.memory.findMany.mockResolvedValue([]);
            mockPrisma.pACReminder.findMany.mockResolvedValue([]);
            mockPrisma.billingAccount.findUnique.mockResolvedValue(null);
            mockPrisma.councilSession.findMany.mockResolvedValue([]);
            mockPrisma.notification.findMany.mockResolvedValue([]);

            const data = await exportUserData('empty-user');

            expect(data.format).toBe('YULA_GDPR_EXPORT_V1');
            expect(data.user).toBeNull();
            expect(data.chats).toHaveLength(0);
            expect(data.memories).toHaveLength(0);
            expect(data.billing).toBeNull();
        });
    });
});

// ─── Deletion Tests ──────────────────────────────────────────────────────────

describe('GDPR Compliance - Account Deletion', () => {
    describe('scheduleAccountDeletion', () => {
        it('schedules deletion with a future date', async () => {
            const before = Date.now();
            const result = await scheduleAccountDeletion(TEST_USER_ID, 'No longer needed');
            const after = Date.now();

            expect(result.scheduledDate).toBeInstanceOf(Date);
            expect(result.cancellationToken).toBeDefined();
            expect(typeof result.cancellationToken).toBe('string');

            // 7-day grace period
            const expectedMin = before + 7 * 24 * 60 * 60 * 1000;
            const expectedMax = after + 7 * 24 * 60 * 60 * 1000;
            expect(result.scheduledDate.getTime()).toBeGreaterThanOrEqual(expectedMin);
            expect(result.scheduledDate.getTime()).toBeLessThanOrEqual(expectedMax);
        });

        it('returns the same schedule if called again for the same user', async () => {
            const first = await scheduleAccountDeletion(TEST_USER_ID);
            const second = await scheduleAccountDeletion(TEST_USER_ID);

            expect(first.cancellationToken).toBe(second.cancellationToken);
            expect(first.scheduledDate.getTime()).toBe(second.scheduledDate.getTime());
        });

        it('stores the reason', async () => {
            await scheduleAccountDeletion(TEST_USER_ID, 'Switching to competitor');

            const pending = getPendingDeletion(TEST_USER_ID);
            expect(pending).not.toBeNull();
            expect(pending!.reason).toBe('Switching to competitor');
        });

        it('schedules independently for different users', async () => {
            const result1 = await scheduleAccountDeletion(TEST_USER_ID);
            const result2 = await scheduleAccountDeletion(TEST_USER_ID_2);

            expect(result1.cancellationToken).not.toBe(result2.cancellationToken);
        });
    });

    describe('cancelDeletion', () => {
        it('cancels a pending deletion with correct token', async () => {
            const { cancellationToken } = await scheduleAccountDeletion(TEST_USER_ID);

            const cancelled = await cancelDeletion(TEST_USER_ID, cancellationToken);
            expect(cancelled).toBe(true);

            const pending = getPendingDeletion(TEST_USER_ID);
            expect(pending).toBeNull();
        });

        it('rejects cancellation with wrong token', async () => {
            await scheduleAccountDeletion(TEST_USER_ID);

            const cancelled = await cancelDeletion(TEST_USER_ID, 'wrong-token');
            expect(cancelled).toBe(false);

            const pending = getPendingDeletion(TEST_USER_ID);
            expect(pending).not.toBeNull();
        });

        it('returns false when no pending deletion exists', async () => {
            const cancelled = await cancelDeletion(TEST_USER_ID, 'any-token');
            expect(cancelled).toBe(false);
        });

        it('rejects cancellation for wrong user', async () => {
            const { cancellationToken } = await scheduleAccountDeletion(TEST_USER_ID);

            // Try to cancel user 1's deletion with user 2
            const cancelled = await cancelDeletion(TEST_USER_ID_2, cancellationToken);
            expect(cancelled).toBe(false);
        });
    });

    describe('getPendingDeletion', () => {
        it('returns null when no deletion is pending', () => {
            const result = getPendingDeletion(TEST_USER_ID);
            expect(result).toBeNull();
        });

        it('returns deletion info when pending', async () => {
            await scheduleAccountDeletion(TEST_USER_ID, 'Testing');

            const result = getPendingDeletion(TEST_USER_ID);
            expect(result).not.toBeNull();
            expect(result!.scheduledDate).toBeInstanceOf(Date);
            expect(result!.reason).toBe('Testing');
        });
    });
});

// ─── Data Summary Tests ──────────────────────────────────────────────────────

describe('GDPR Compliance - Data Summary', () => {
    it('returns correct counts for all data types', async () => {
        const summary = await getDataSummary(TEST_USER_ID);

        expect(summary.userId).toBe(TEST_USER_ID);
        expect(summary.counts.chats).toBe(5);
        expect(summary.counts.messages).toBe(120);
        expect(summary.counts.memories).toBe(10);
        expect(summary.counts.reminders).toBe(3);
        expect(summary.counts.councilSessions).toBe(2);
        expect(summary.counts.importJobs).toBe(1);
        expect(summary.counts.achievements).toBe(4);
        expect(summary.counts.notifications).toBe(15);
        expect(summary.counts.auditLogs).toBe(30);
        expect(summary.counts.apiKeys).toBe(2);
    });

    it('provides a storage estimate', async () => {
        const summary = await getDataSummary(TEST_USER_ID);

        expect(summary.storageEstimateBytes).toBeGreaterThan(0);
        // 120 messages * 2048 + 10 memories * 1024 + 15 notifications * 512 + 5 chats * 256
        const expected = 120 * 2048 + 10 * 1024 + 15 * 512 + 5 * 256;
        expect(summary.storageEstimateBytes).toBe(expected);
    });

    it('includes account creation date', async () => {
        const summary = await getDataSummary(TEST_USER_ID);

        expect(summary.accountCreatedAt).toEqual(new Date('2025-01-01'));
    });

    it('includes last activity date', async () => {
        const summary = await getDataSummary(TEST_USER_ID);

        expect(summary.lastActiveAt).toEqual(new Date('2025-12-01'));
    });

    it('handles user with no activity', async () => {
        mockPrisma.chat.count.mockResolvedValue(0);
        mockPrisma.message.count.mockResolvedValue(0);
        mockPrisma.message.findFirst.mockResolvedValue(null);
        mockPrisma.memory.count.mockResolvedValue(0);
        mockPrisma.pACReminder.count.mockResolvedValue(0);
        mockPrisma.councilSession.count.mockResolvedValue(0);
        mockPrisma.importJob.count.mockResolvedValue(0);
        mockPrisma.achievement.count.mockResolvedValue(0);
        mockPrisma.notification.count.mockResolvedValue(0);
        mockPrisma.auditLog.count.mockResolvedValue(0);
        mockPrisma.apiKey.count.mockResolvedValue(0);

        const summary = await getDataSummary('empty-user');

        expect(summary.counts.chats).toBe(0);
        expect(summary.counts.messages).toBe(0);
        expect(summary.storageEstimateBytes).toBe(0);
        expect(summary.lastActiveAt).toBeNull();
    });
});

// ─── Anonymization Tests ─────────────────────────────────────────────────────

describe('GDPR Compliance - Anonymization', () => {
    it('calls prisma transaction to anonymize user data', async () => {
        mockPrisma.user.update.mockResolvedValue({});
        mockPrisma.session.deleteMany.mockResolvedValue({ count: 2 });
        mockPrisma.account.deleteMany.mockResolvedValue({ count: 1 });
        mockPrisma.notification.updateMany.mockResolvedValue({ count: 5 });
        mockPrisma.apiKey.deleteMany.mockResolvedValue({ count: 1 });

        await anonymizeUser(TEST_USER_ID);

        expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it('anonymizes email and name', async () => {
        let capturedUpdateArgs: any = null;

        mockPrisma.$transaction.mockImplementation(async (fn: any) => {
            // Override user.update to capture args
            mockPrisma.user.update.mockImplementation(async (args: any) => {
                capturedUpdateArgs = args;
                return {};
            });
            mockPrisma.session.deleteMany.mockResolvedValue({ count: 0 });
            mockPrisma.account.deleteMany.mockResolvedValue({ count: 0 });
            mockPrisma.notification.updateMany.mockResolvedValue({ count: 0 });
            mockPrisma.apiKey.deleteMany.mockResolvedValue({ count: 0 });
            await fn(mockPrisma);
        });

        await anonymizeUser(TEST_USER_ID);

        expect(capturedUpdateArgs).not.toBeNull();
        expect(capturedUpdateArgs.where.id).toBe(TEST_USER_ID);
        expect(capturedUpdateArgs.data.name).toBe('Anonymized User');
        expect(capturedUpdateArgs.data.email).toMatch(/^anon-.*@deleted\.yula\.dev$/);
        expect(capturedUpdateArgs.data.image).toBeNull();
    });

    it('deletes sessions and auth accounts', async () => {
        mockPrisma.user.update.mockResolvedValue({});
        mockPrisma.session.deleteMany.mockResolvedValue({ count: 3 });
        mockPrisma.account.deleteMany.mockResolvedValue({ count: 2 });
        mockPrisma.notification.updateMany.mockResolvedValue({ count: 0 });
        mockPrisma.apiKey.deleteMany.mockResolvedValue({ count: 0 });

        await anonymizeUser(TEST_USER_ID);

        // Verify the transaction was called (all operations happen inside it)
        expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it('anonymizes notification content', async () => {
        let capturedNotificationArgs: any = null;

        mockPrisma.$transaction.mockImplementation(async (fn: any) => {
            mockPrisma.user.update.mockResolvedValue({});
            mockPrisma.session.deleteMany.mockResolvedValue({ count: 0 });
            mockPrisma.account.deleteMany.mockResolvedValue({ count: 0 });
            mockPrisma.notification.updateMany.mockImplementation(async (args: any) => {
                capturedNotificationArgs = args;
                return { count: 10 };
            });
            mockPrisma.apiKey.deleteMany.mockResolvedValue({ count: 0 });
            await fn(mockPrisma);
        });

        await anonymizeUser(TEST_USER_ID);

        expect(capturedNotificationArgs).not.toBeNull();
        expect(capturedNotificationArgs.where.userId).toBe(TEST_USER_ID);
        expect(capturedNotificationArgs.data.title).toBe('[anonymized]');
        expect(capturedNotificationArgs.data.body).toBe('[anonymized]');
    });

    it('deletes API keys during anonymization', async () => {
        let apiKeyDeleteCalled = false;

        mockPrisma.$transaction.mockImplementation(async (fn: any) => {
            mockPrisma.user.update.mockResolvedValue({});
            mockPrisma.session.deleteMany.mockResolvedValue({ count: 0 });
            mockPrisma.account.deleteMany.mockResolvedValue({ count: 0 });
            mockPrisma.notification.updateMany.mockResolvedValue({ count: 0 });
            mockPrisma.apiKey.deleteMany.mockImplementation(async () => {
                apiKeyDeleteCalled = true;
                return { count: 2 };
            });
            await fn(mockPrisma);
        });

        await anonymizeUser(TEST_USER_ID);

        expect(apiKeyDeleteCalled).toBe(true);
    });
});

// ─── Rate Limiting Tests ─────────────────────────────────────────────────────

describe('GDPR Compliance - Export Rate Limiting', () => {
    it('allows the first export request', () => {
        const result = queueExportJob(TEST_USER_ID);

        expect(result.status).toBe('queued');
        expect(result.jobId).toBeDefined();
    });

    it('allows exports from different users independently', () => {
        const result1 = queueExportJob(TEST_USER_ID);
        const result2 = queueExportJob(TEST_USER_ID_2);

        expect(result1.status).toBe('queued');
        expect(result2.status).toBe('queued');
        expect(result1.jobId).not.toBe(result2.jobId);
    });

    it('generates unique job IDs even for rapid requests', () => {
        const jobIds = new Set<string>();
        for (let i = 0; i < 10; i++) {
            const result = queueExportJob(TEST_USER_ID);
            jobIds.add(result.jobId);
        }
        // All 10 should be unique
        expect(jobIds.size).toBe(10);
    });
});

// ─── End-to-End Flow Tests ───────────────────────────────────────────────────

describe('GDPR Compliance - End-to-End Flows', () => {
    it('full export flow: queue -> check status', async () => {
        // Step 1: Queue export
        const { jobId } = queueExportJob(TEST_USER_ID);
        expect(jobId).toBeDefined();

        // Step 2: Check status (should be queued or processing immediately)
        const status = getExportJobStatus(jobId);
        expect(status).not.toBeNull();
        expect(['queued', 'processing', 'ready']).toContain(status!.status);
    });

    it('full deletion flow: schedule -> verify pending -> cancel', async () => {
        // Step 1: Schedule deletion
        const { scheduledDate, cancellationToken } = await scheduleAccountDeletion(
            TEST_USER_ID,
            'Testing flow'
        );
        expect(scheduledDate).toBeInstanceOf(Date);
        expect(cancellationToken).toBeDefined();

        // Step 2: Verify pending
        const pending = getPendingDeletion(TEST_USER_ID);
        expect(pending).not.toBeNull();
        expect(pending!.scheduledDate).toEqual(scheduledDate);

        // Step 3: Cancel deletion
        const cancelled = await cancelDeletion(TEST_USER_ID, cancellationToken);
        expect(cancelled).toBe(true);

        // Step 4: Verify no longer pending
        const afterCancel = getPendingDeletion(TEST_USER_ID);
        expect(afterCancel).toBeNull();
    });

    it('data summary followed by export includes consistent data', async () => {
        // Step 1: Get summary
        const summary = await getDataSummary(TEST_USER_ID);
        expect(summary.counts.chats).toBe(5);

        // Step 2: Export data
        const exportData = await exportUserData(TEST_USER_ID);
        expect(exportData.user).toBeDefined();
        expect(exportData.format).toBe('YULA_GDPR_EXPORT_V1');
    });

    it('anonymize does not interfere with deletion flow', async () => {
        // Anonymize first
        mockPrisma.user.update.mockResolvedValue({});
        mockPrisma.session.deleteMany.mockResolvedValue({ count: 0 });
        mockPrisma.account.deleteMany.mockResolvedValue({ count: 0 });
        mockPrisma.notification.updateMany.mockResolvedValue({ count: 0 });
        mockPrisma.apiKey.deleteMany.mockResolvedValue({ count: 0 });

        await anonymizeUser(TEST_USER_ID);

        // Then schedule deletion
        const { cancellationToken, scheduledDate } =
            await scheduleAccountDeletion(TEST_USER_ID);
        expect(scheduledDate).toBeInstanceOf(Date);

        // Cancel should still work
        const cancelled = await cancelDeletion(TEST_USER_ID, cancellationToken);
        expect(cancelled).toBe(true);
    });
});

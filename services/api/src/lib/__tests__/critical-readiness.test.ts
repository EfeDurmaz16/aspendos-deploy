import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@aspendos/db', () => ({
    ScheduledTaskStatus: {
        PENDING: 'PENDING',
    },
    prisma: {
        memory: { count: vi.fn() },
        scheduledTask: { count: vi.fn() },
        councilSession: { count: vi.fn() },
    },
}));

vi.mock('../circuit-breaker', () => ({
    breakers: {
        qdrant: {
            getState: vi.fn(() => ({ state: 'CLOSED' })),
        },
    },
}));

vi.mock('../../services/openmemory.service', () => ({
    searchMemories: vi.fn(),
}));

vi.mock('../../services/scheduler.service', () => ({
    parseTimeExpression: vi.fn(() => new Date(Date.now() + 60 * 60 * 1000)),
}));

vi.mock('../../services/council.service', () => ({
    COUNCIL_PERSONAS: {
        SCHOLAR: { modelId: 'openai/gpt-4o' },
        CREATIVE: { modelId: 'anthropic/claude-3-5-sonnet' },
        PRACTICAL: { modelId: 'google/gemini-2.0-flash' },
        DEVILS_ADVOCATE: { modelId: 'openai/gpt-4o-mini' },
    },
}));

import { prisma } from '@aspendos/db';
import { breakers } from '../circuit-breaker';
import { searchMemories } from '../../services/openmemory.service';
import { parseTimeExpression } from '../../services/scheduler.service';
import { checkCriticalReadiness } from '../critical-readiness';

const mockPrisma = prisma as any;
const mockBreakers = breakers as any;
const mockSearchMemories = searchMemories as any;
const mockParseTimeExpression = parseTimeExpression as any;

describe('checkCriticalReadiness', () => {
    const originalCronSecret = process.env.CRON_SECRET;

    beforeEach(() => {
        vi.clearAllMocks();
        process.env.CRON_SECRET = 'test-secret';

        mockPrisma.memory.count.mockResolvedValue(10);
        mockPrisma.scheduledTask.count.mockResolvedValue(2);
        mockPrisma.councilSession.count.mockResolvedValue(3);
        mockSearchMemories.mockResolvedValue([]);
        mockParseTimeExpression.mockReturnValue(new Date(Date.now() + 60 * 60 * 1000));
        mockBreakers.qdrant.getState.mockReturnValue({ state: 'CLOSED' });
    });

    afterEach(() => {
        if (originalCronSecret === undefined) {
            delete process.env.CRON_SECRET;
            return;
        }
        process.env.CRON_SECRET = originalCronSecret;
    });

    it('returns ready when all critical checks pass', async () => {
        const report = await checkCriticalReadiness();

        expect(report.status).toBe('ready');
        expect(report.productionReady).toBe(true);
        expect(report.blockingIssues).toEqual([]);
        expect(report.warnings).toEqual([]);
        expect(report.capabilities.sharedMemory.status).toBe('ready');
        expect(report.capabilities.proactiveCallback.status).toBe('ready');
        expect(report.capabilities.council.status).toBe('ready');
    });

    it('returns degraded when fallback mode is active or cron secret missing', async () => {
        delete process.env.CRON_SECRET;
        mockBreakers.qdrant.getState.mockReturnValue({ state: 'OPEN' });

        const report = await checkCriticalReadiness();

        expect(report.status).toBe('degraded');
        expect(report.productionReady).toBe(false);
        expect(report.blockingIssues).toEqual([]);
        expect(report.warnings.length).toBeGreaterThan(0);
        expect(report.capabilities.sharedMemory.status).toBe('degraded');
        expect(report.capabilities.proactiveCallback.status).toBe('degraded');
    });

    it('returns blocked when a critical capability fails', async () => {
        mockPrisma.memory.count.mockRejectedValue(new Error('db unavailable'));

        const report = await checkCriticalReadiness();

        expect(report.status).toBe('blocked');
        expect(report.productionReady).toBe(false);
        expect(report.blockingIssues.some((issue: string) => issue.includes('Memory table check failed'))).toBe(
            true
        );
    });
});

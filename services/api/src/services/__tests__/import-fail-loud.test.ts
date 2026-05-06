import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const convexMock = vi.hoisted(() => ({
    query: vi.fn(),
    mutation: vi.fn(),
}));

vi.mock('../../lib/convex', () => ({
    api: {
        actionLog: {
            log: 'actionLog.log',
            listByUser: 'actionLog.listByUser',
            listRecent: 'actionLog.listRecent',
        },
        conversations: {
            create: 'conversations.create',
        },
        messages: {
            create: 'messages.create',
        },
        memories: {
            create: 'memories.create',
        },
    },
    getConvexClient: () => convexMock,
    getConvexServiceSecret: () => 'test-service-secret',
}));

vi.mock('../../lib/job-queue', () => ({
    jobQueue: {
        add: vi.fn(),
    },
}));

beforeEach(() => {
    convexMock.query.mockReset();
    convexMock.mutation.mockReset();
    vi.resetModules();
});

afterEach(() => {
    vi.resetModules();
});

const parsedConversation = {
    externalId: 'conv-1',
    title: 'Imported conversation',
    messages: [
        {
            role: 'user' as const,
            content: 'Hello',
            createdAt: new Date('2027-01-15T08:00:00.000Z'),
        },
    ],
    createdAt: new Date('2027-01-15T08:00:00.000Z'),
    updatedAt: new Date('2027-01-15T08:01:00.000Z'),
    source: 'CHATGPT' as const,
};

describe('import service fail-loud behavior', () => {
    it('does not return an unpersisted import job when job creation fails', async () => {
        convexMock.mutation.mockRejectedValueOnce(new Error('convex write unavailable'));
        const { createImportJob } = await import('../import.service');

        await expect(createImportJob('user-1', 'CHATGPT', 'export.json', 1024)).rejects.toThrow(
            'convex write unavailable'
        );
    });

    it('does not report a status update when status persistence fails', async () => {
        convexMock.mutation.mockRejectedValueOnce(new Error('convex write unavailable'));
        const { updateImportJobStatus } = await import('../import.service');

        await expect(updateImportJobStatus('job-1', 'IMPORTING')).rejects.toThrow(
            'convex write unavailable'
        );
    });

    it('does not turn import job read failures into not-found', async () => {
        convexMock.query.mockRejectedValueOnce(new Error('convex read unavailable'));
        const { getImportJob } = await import('../import.service');

        await expect(getImportJob('job-1', 'user-1')).rejects.toThrow('convex read unavailable');
    });

    it('does not return an empty import job list when reads fail', async () => {
        convexMock.query.mockRejectedValueOnce(new Error('convex read unavailable'));
        const { listImportJobs } = await import('../import.service');

        await expect(listImportJobs('user-1')).rejects.toThrow('convex read unavailable');
    });

    it('does not report zero stored entities when entity persistence fails', async () => {
        convexMock.mutation.mockRejectedValueOnce(new Error('convex write unavailable'));
        const { storeImportEntities } = await import('../import.service');

        await expect(storeImportEntities('job-1', [parsedConversation])).rejects.toThrow(
            'convex write unavailable'
        );
    });

    it('does not report entity selection success when selection persistence fails', async () => {
        convexMock.mutation.mockRejectedValueOnce(new Error('convex write unavailable'));
        const { updateEntitySelection } = await import('../import.service');

        await expect(updateEntitySelection('entity-1', 'job-1', false)).rejects.toThrow(
            'convex write unavailable'
        );
    });

    it('does not report an empty import result when import reads fail', async () => {
        convexMock.query.mockRejectedValueOnce(new Error('convex read unavailable'));
        const { executeImport } = await import('../import.service');

        await expect(executeImport('job-1', 'user-1')).rejects.toThrow('convex read unavailable');
    });

    it('does not return zero import stats when stats reads fail', async () => {
        convexMock.query.mockRejectedValueOnce(new Error('convex read unavailable'));
        const { getImportStats } = await import('../import.service');

        await expect(getImportStats('user-1')).rejects.toThrow('convex read unavailable');
    });
});

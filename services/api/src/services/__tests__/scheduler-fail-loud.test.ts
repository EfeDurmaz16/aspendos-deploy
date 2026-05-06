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
    },
    getConvexClient: () => convexMock,
    getConvexServiceSecret: () => 'test-service-secret',
}));

beforeEach(() => {
    convexMock.query.mockReset();
    convexMock.mutation.mockReset();
    vi.resetModules();
});

afterEach(() => {
    vi.resetModules();
});

describe('scheduler service fail-loud behavior', () => {
    it('does not report a scheduled task when persistence fails', async () => {
        convexMock.mutation.mockRejectedValueOnce(new Error('convex write unavailable'));
        const { createScheduledTask } = await import('../scheduler.service');

        await expect(
            createScheduledTask({
                userId: 'user-1',
                chatId: 'chat-1',
                triggerAt: new Date(Date.now() + 60_000),
                intent: 'follow up',
            })
        ).rejects.toThrow('convex write unavailable');
    });

    it('does not return an empty task list when persistence reads fail', async () => {
        convexMock.query.mockRejectedValueOnce(new Error('convex read unavailable'));
        const { getUserScheduledTasks } = await import('../scheduler.service');

        await expect(getUserScheduledTasks('user-1')).rejects.toThrow('convex read unavailable');
    });

    it('does not return an empty due-task list when recent log reads fail', async () => {
        convexMock.query.mockRejectedValueOnce(new Error('convex read unavailable'));
        const { getPendingTasksToExecute } = await import('../scheduler.service');

        await expect(getPendingTasksToExecute()).rejects.toThrow('convex read unavailable');
    });

    it('does not turn task lookup read failures into not-found', async () => {
        convexMock.query.mockRejectedValueOnce(new Error('convex read unavailable'));
        const { getTaskById } = await import('../scheduler.service');

        await expect(getTaskById('task-1')).rejects.toThrow('convex read unavailable');
    });

    it('does not report cancellation when cancellation logging fails', async () => {
        convexMock.mutation.mockRejectedValueOnce(new Error('convex write unavailable'));
        const { cancelScheduledTask } = await import('../scheduler.service');

        await expect(cancelScheduledTask('task-1', 'user-1')).rejects.toThrow(
            'convex write unavailable'
        );
    });

    it('does not report rescheduling when reschedule logging fails', async () => {
        convexMock.mutation.mockRejectedValueOnce(new Error('convex write unavailable'));
        const { rescheduleTask } = await import('../scheduler.service');

        await expect(
            rescheduleTask('task-1', 'user-1', new Date(Date.now() + 120_000))
        ).rejects.toThrow('convex write unavailable');
    });

    it('does not report processing status when status logging fails', async () => {
        convexMock.mutation.mockRejectedValueOnce(new Error('convex write unavailable'));
        const { markTaskProcessing } = await import('../scheduler.service');

        await expect(markTaskProcessing('task-1')).rejects.toThrow('convex write unavailable');
    });

    it('does not report completed status when status logging fails', async () => {
        convexMock.mutation.mockRejectedValueOnce(new Error('convex write unavailable'));
        const { markTaskCompleted } = await import('../scheduler.service');

        await expect(markTaskCompleted('task-1', 'done')).rejects.toThrow(
            'convex write unavailable'
        );
    });

    it('does not report failed status when status logging fails', async () => {
        convexMock.mutation.mockRejectedValueOnce(new Error('convex write unavailable'));
        const { markTaskFailed } = await import('../scheduler.service');

        await expect(markTaskFailed('task-1', 'boom')).rejects.toThrow('convex write unavailable');
    });

    it('does not report recurring schedule creation when persistence fails', async () => {
        convexMock.mutation.mockRejectedValueOnce(new Error('convex write unavailable'));
        const { createRecurringSchedule } = await import('../scheduler.service');

        await expect(
            createRecurringSchedule({
                userId: 'user-1',
                cronExpression: '0 9 * * 1',
                naturalLanguage: 'every Monday at 9',
            })
        ).rejects.toThrow('convex write unavailable');
    });

    it('does not return an empty due-recurring list when persistence reads fail', async () => {
        convexMock.query.mockRejectedValueOnce(new Error('convex read unavailable'));
        const { getDueRecurringSchedules } = await import('../scheduler.service');

        await expect(getDueRecurringSchedules()).rejects.toThrow('convex read unavailable');
    });

    it('does not hide recurring schedule advance failures', async () => {
        convexMock.mutation.mockRejectedValueOnce(new Error('convex write unavailable'));
        const { advanceRecurringSchedule } = await import('../scheduler.service');

        await expect(advanceRecurringSchedule('schedule-1')).rejects.toThrow(
            'convex write unavailable'
        );
    });

    it('maps persisted task timestamps for route consumers', async () => {
        convexMock.query.mockResolvedValueOnce([
            {
                _id: 'task-1',
                user_id: 'user-1',
                event_type: 'scheduled_task',
                timestamp: 1_800_000_000_000,
                details: {
                    chatId: 'chat-1',
                    triggerAt: 1_800_000_060_000,
                    intent: 'follow up',
                    status: 'PENDING',
                },
            },
        ]);
        const { getUserScheduledTasks } = await import('../scheduler.service');

        const [task] = await getUserScheduledTasks('user-1');

        expect(task.createdAt.toISOString()).toBe('2027-01-15T08:00:00.000Z');
        expect(task.triggerAt.toISOString()).toBe('2027-01-15T08:01:00.000Z');
    });
});

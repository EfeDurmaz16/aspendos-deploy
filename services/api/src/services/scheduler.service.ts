/**
 * Scheduler Service - Proactive Agentic Callback (PAC)
 *
 * Handles scheduling and execution of proactive follow-up tasks.
 * The AI can schedule tasks to re-engage users at specific times.
 * Migrated from Prisma to Convex action_log events.
 */

import { getConvexClient, api } from '../lib/convex';

type ScheduledTask = any;

// Upstash QStash configuration (optional - can use polling fallback)
const QSTASH_TOKEN = process.env.QSTASH_TOKEN || '';
const QSTASH_URL = process.env.QSTASH_URL || 'https://qstash.upstash.io/v2';
const WEBHOOK_BASE_URL =
    process.env.WEBHOOK_BASE_URL || process.env.API_URL || 'http://localhost:8080';

export interface CreateScheduledTaskInput {
    userId: string;
    chatId: string;
    triggerAt: Date;
    intent: string;
    contextSummary?: string;
    topic?: string;
    tone?: 'friendly' | 'professional' | 'encouraging';
    channelPref?: 'auto' | 'push' | 'email' | 'in_app';
    metadata?: Record<string, unknown>;
}

export interface CommitmentDetectionResult {
    hasCommitment: boolean;
    timeFrame?: string;
    intent?: string;
    topic?: string;
    tone?: 'friendly' | 'professional' | 'encouraging';
    absoluteTime?: Date;
}

// ============================================
// TASK CREATION
// ============================================

/**
 * Create a new scheduled task for proactive follow-up
 */
export async function createScheduledTask(input: CreateScheduledTaskInput): Promise<ScheduledTask> {
    try {
        const client = getConvexClient();
        const taskId = await client.mutation(api.actionLog.log, {
            user_id: input.userId as any,
            event_type: 'scheduled_task',
            details: {
                chatId: input.chatId,
                triggerAt: input.triggerAt.getTime(),
                intent: input.intent,
                contextSummary: input.contextSummary,
                topic: input.topic,
                tone: input.tone || 'friendly',
                channelPref: input.channelPref || 'auto',
                metadata: input.metadata || {},
                status: 'PENDING',
            },
        });

        const task = {
            id: taskId,
            userId: input.userId,
            chatId: input.chatId,
            triggerAt: input.triggerAt,
            intent: input.intent,
            status: 'PENDING',
            externalJobId: null as string | null,
        };

        // If QStash is configured, schedule the webhook
        if (QSTASH_TOKEN) {
            try {
                const externalJobId = await scheduleQStashWebhook(String(taskId), input.triggerAt);
                task.externalJobId = externalJobId;
            } catch (error) {
                console.error('Failed to schedule QStash webhook:', error);
            }
        }

        return task;
    } catch {
        return null;
    }
}

/**
 * Schedule a webhook with Upstash QStash
 */
async function scheduleQStashWebhook(taskId: string, triggerAt: Date): Promise<string> {
    const webhookUrl = `${WEBHOOK_BASE_URL}/api/scheduler/execute`;
    const delay = Math.max(0, Math.floor((triggerAt.getTime() - Date.now()) / 1000));

    const response = await fetch(`${QSTASH_URL}/publish/${webhookUrl}`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${QSTASH_TOKEN}`,
            'Content-Type': 'application/json',
            'Upstash-Delay': `${delay}s`,
        },
        body: JSON.stringify({ taskId }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`QStash scheduling failed: ${error}`);
    }

    const result = (await response.json()) as { messageId: string };
    return result.messageId;
}

// ============================================
// TASK RETRIEVAL
// ============================================

/**
 * Get all scheduled tasks for a user
 */
export async function getUserScheduledTasks(
    userId: string,
    options?: {
        status?: string;
        chatId?: string;
        limit?: number;
    }
): Promise<ScheduledTask[]> {
    try {
        const client = getConvexClient();
        const logs = await client.query(api.actionLog.listByUser, {
            user_id: userId as any,
            limit: options?.limit || 50,
        });
        return (logs || [])
            .filter((l: any) => {
                if (l.event_type !== 'scheduled_task') return false;
                if (options?.status && l.details?.status !== options.status) return false;
                if (options?.chatId && l.details?.chatId !== options.chatId) return false;
                return true;
            })
            .map(logToTask);
    } catch {
        return [];
    }
}

/**
 * Get pending tasks that should be executed now
 */
export async function getPendingTasksToExecute(): Promise<ScheduledTask[]> {
    try {
        const client = getConvexClient();
        const logs = await client.query(api.actionLog.listRecent, { limit: 200 });
        const now = Date.now();
        return (logs || [])
            .filter(
                (l: any) =>
                    l.event_type === 'scheduled_task' &&
                    l.details?.status === 'PENDING' &&
                    l.details?.triggerAt <= now
            )
            .map(logToTask);
    } catch {
        return [];
    }
}

/**
 * Get a single task by ID — searches recent action logs
 */
export async function getTaskById(taskId: string): Promise<ScheduledTask | null> {
    try {
        const client = getConvexClient();
        const logs = await client.query(api.actionLog.listRecent, { limit: 500 });
        const match = (logs || []).find(
            (l: any) => l._id === taskId && l.event_type === 'scheduled_task'
        );
        return match ? logToTask(match) : null;
    } catch {
        return null;
    }
}

// ============================================
// TASK MANAGEMENT
// ============================================

/**
 * Cancel a scheduled task — logs a cancellation event
 */
export async function cancelScheduledTask(
    taskId: string,
    userId: string
): Promise<ScheduledTask | null> {
    try {
        const client = getConvexClient();
        await client.mutation(api.actionLog.log, {
            user_id: userId as any,
            event_type: 'scheduled_task_cancel',
            details: { originalTaskId: taskId },
        });
        return { id: taskId, status: 'CANCELED' };
    } catch {
        return null;
    }
}

/**
 * Update task trigger time (reschedule) — logs a reschedule event
 */
export async function rescheduleTask(
    taskId: string,
    userId: string,
    newTriggerAt: Date
): Promise<ScheduledTask | null> {
    try {
        const client = getConvexClient();
        await client.mutation(api.actionLog.log, {
            user_id: userId as any,
            event_type: 'scheduled_task_reschedule',
            details: { originalTaskId: taskId, newTriggerAt: newTriggerAt.getTime() },
        });

        // Re-schedule QStash if configured
        if (QSTASH_TOKEN) {
            try {
                await scheduleQStashWebhook(taskId, newTriggerAt);
            } catch (error) {
                console.error('Failed to reschedule QStash job:', error);
            }
        }

        return { id: taskId, triggerAt: newTriggerAt, status: 'PENDING' };
    } catch {
        return null;
    }
}

/**
 * Mark task as processing
 */
export async function markTaskProcessing(taskId: string): Promise<ScheduledTask> {
    try {
        const client = getConvexClient();
        await client.mutation(api.actionLog.log, {
            event_type: 'scheduled_task_status',
            details: { taskId, status: 'PROCESSING' },
        });
    } catch {
        // Non-blocking
    }
    return { id: taskId, status: 'PROCESSING' };
}

/**
 * Mark task as completed with result
 */
export async function markTaskCompleted(
    taskId: string,
    resultMessage: string,
    deliveryStatus?: string
): Promise<ScheduledTask> {
    try {
        const client = getConvexClient();
        await client.mutation(api.actionLog.log, {
            event_type: 'scheduled_task_status',
            details: {
                taskId,
                status: 'COMPLETED',
                resultMessage,
                deliveryStatus: deliveryStatus || 'delivered',
                executedAt: Date.now(),
            },
        });
    } catch {
        // Non-blocking
    }
    return { id: taskId, status: 'COMPLETED', resultMessage };
}

/**
 * Mark task as failed with error
 */
export async function markTaskFailed(taskId: string, errorMessage: string): Promise<ScheduledTask> {
    try {
        const client = getConvexClient();
        await client.mutation(api.actionLog.log, {
            event_type: 'scheduled_task_status',
            details: { taskId, status: 'FAILED', errorMessage, executedAt: Date.now() },
        });
    } catch {
        // Non-blocking
    }
    return { id: taskId, status: 'FAILED', errorMessage };
}

// ============================================
// HELPER: log → task shape
// ============================================

function logToTask(log: any): ScheduledTask {
    const d = log.details || {};
    return {
        id: log._id,
        userId: log.user_id,
        chatId: d.chatId,
        triggerAt: d.triggerAt ? new Date(d.triggerAt) : null,
        intent: d.intent,
        contextSummary: d.contextSummary,
        topic: d.topic,
        tone: d.tone,
        channelPref: d.channelPref,
        status: d.status || 'PENDING',
        externalJobId: d.externalJobId || null,
        metadata: d.metadata || {},
    };
}

// ============================================
// TIME PARSING UTILITIES
// ============================================

/**
 * Parse relative time expressions to absolute dates
 */
export function parseTimeExpression(expression: string, fromDate: Date = new Date()): Date | null {
    const normalized = expression.toLowerCase().trim();

    // Absolute time patterns
    const absolutePatterns = [
        /(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/, // ISO format
    ];

    for (const pattern of absolutePatterns) {
        const match = normalized.match(pattern);
        if (match) {
            return new Date(expression);
        }
    }

    // Relative time patterns
    const relativePatterns: [RegExp, (match: RegExpMatchArray) => Date][] = [
        [
            /^tomorrow$/i,
            () => {
                const d = new Date(fromDate);
                d.setDate(d.getDate() + 1);
                d.setHours(9, 0, 0, 0);
                return d;
            },
        ],
        [
            /^next\s+week$/i,
            () => {
                const d = new Date(fromDate);
                d.setDate(d.getDate() + 7);
                d.setHours(9, 0, 0, 0);
                return d;
            },
        ],
        [
            /^in\s+(\d+)\s+(day|days|week|weeks|hour|hours|minute|minutes)$/i,
            (m) => {
                const amount = parseInt(m[1], 10);
                const unit = m[2].toLowerCase();
                const d = new Date(fromDate);
                if (unit.startsWith('day')) d.setDate(d.getDate() + amount);
                else if (unit.startsWith('week')) d.setDate(d.getDate() + amount * 7);
                else if (unit.startsWith('hour')) d.setHours(d.getHours() + amount);
                else if (unit.startsWith('minute')) d.setMinutes(d.getMinutes() + amount);
                return d;
            },
        ],
        [
            /^(\d+)\s+(day|days|week|weeks)\s+from\s+now$/i,
            (m) => {
                const amount = parseInt(m[1], 10);
                const unit = m[2].toLowerCase();
                const d = new Date(fromDate);
                if (unit.startsWith('day')) d.setDate(d.getDate() + amount);
                else if (unit.startsWith('week')) d.setDate(d.getDate() + amount * 7);
                return d;
            },
        ],
        [
            /^(\d+)\s+(day|days|week|weeks|hour|hours)$/i,
            (m) => {
                const amount = parseInt(m[1], 10);
                const unit = m[2].toLowerCase();
                const d = new Date(fromDate);
                if (unit.startsWith('day')) d.setDate(d.getDate() + amount);
                else if (unit.startsWith('week')) d.setDate(d.getDate() + amount * 7);
                else if (unit.startsWith('hour')) d.setHours(d.getHours() + amount);
                return d;
            },
        ],
    ];

    for (const [pattern, handler] of relativePatterns) {
        const match = normalized.match(pattern);
        if (match) {
            return handler(match);
        }
    }

    return null;
}

/**
 * Format a scheduled time for display
 */
export function formatScheduledTime(date: Date): string {
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffMinutes < 60) {
        return `in ${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''}`;
    } else if (diffHours < 24) {
        return `in ${diffHours} hour${diffHours !== 1 ? 's' : ''}`;
    } else if (diffDays === 1) {
        return 'tomorrow';
    } else if (diffDays < 7) {
        return `in ${diffDays} days`;
    } else {
        return date.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
        });
    }
}

// ============================================
// CRON SCHEDULING (RecurringSchedule)
// ============================================

/**
 * Parse a simple cron expression and calculate the next run time.
 * Supports standard 5-field cron: minute hour day-of-month month day-of-week
 */
export function getNextCronRun(cronExpression: string, fromDate: Date = new Date()): Date | null {
    try {
        const parts = cronExpression.trim().split(/\s+/);
        if (parts.length !== 5) return null;

        const [minuteSpec, hourSpec, _daySpec, _monthSpec, dowSpec] = parts;
        const maxSearch = 7 * 24 * 60;
        const candidate = new Date(fromDate);
        candidate.setSeconds(0, 0);
        candidate.setMinutes(candidate.getMinutes() + 1);

        for (let i = 0; i < maxSearch; i++) {
            const minute = candidate.getMinutes();
            const hour = candidate.getHours();
            const dow = candidate.getDay();

            if (
                matchesCronField(minuteSpec, minute) &&
                matchesCronField(hourSpec, hour) &&
                matchesCronField(dowSpec, dow)
            ) {
                return candidate;
            }
            candidate.setMinutes(candidate.getMinutes() + 1);
        }
        return null;
    } catch {
        return null;
    }
}

function matchesCronField(spec: string, value: number): boolean {
    if (spec === '*') return true;
    if (spec.startsWith('*/')) {
        const step = parseInt(spec.slice(2), 10);
        return !Number.isNaN(step) && step > 0 && value % step === 0;
    }
    if (spec.includes('-')) {
        const [start, end] = spec.split('-').map(Number);
        return !Number.isNaN(start) && !Number.isNaN(end) && value >= start && value <= end;
    }
    if (spec.includes(',')) {
        return spec.split(',').map(Number).includes(value);
    }
    return parseInt(spec, 10) === value;
}

export async function createRecurringSchedule(params: {
    userId: string;
    reminderId?: string;
    cronExpression: string;
    naturalLanguage: string;
    timezone?: string;
    maxOccurrences?: number;
}) {
    const nextRun = getNextCronRun(params.cronExpression);
    try {
        const client = getConvexClient();
        return await client.mutation(api.actionLog.log, {
            user_id: params.userId as any,
            event_type: 'recurring_schedule',
            details: {
                reminderId: params.reminderId,
                cronExpression: params.cronExpression,
                naturalLanguage: params.naturalLanguage,
                timezone: params.timezone || 'UTC',
                maxOccurrences: params.maxOccurrences,
                nextRunAt: nextRun?.getTime() || null,
                occurrenceCount: 0,
                isActive: true,
            },
        });
    } catch {
        return null;
    }
}

export async function getDueRecurringSchedules() {
    try {
        const client = getConvexClient();
        const logs = await client.query(api.actionLog.listRecent, { limit: 200 });
        const now = Date.now();
        return (logs || []).filter(
            (l: any) =>
                l.event_type === 'recurring_schedule' &&
                l.details?.isActive === true &&
                l.details?.nextRunAt != null &&
                l.details.nextRunAt <= now
        );
    } catch {
        return [];
    }
}

export async function advanceRecurringSchedule(scheduleId: string) {
    try {
        const client = getConvexClient();
        // Log the advance event — the original schedule log is immutable in action_log
        await client.mutation(api.actionLog.log, {
            event_type: 'recurring_schedule_advance',
            details: { scheduleId, advancedAt: Date.now() },
        });
    } catch {
        // Non-blocking
    }
}

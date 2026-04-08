/**
 * Scheduler Service - Proactive Agentic Callback (PAC)
 *
 * Handles scheduling and execution of proactive follow-up tasks.
 * The AI can schedule tasks to re-engage users at specific times.
 */
// TODO(phase-a-day-3): replaced by Convex — see convex/schema.ts
// import { type Prisma, prisma, type ScheduledTask, ScheduledTaskStatus } from '@aspendos/db';
type Prisma = any;
const prisma = {} as any;
type ScheduledTask = any;
const ScheduledTaskStatus = {} as any;
type ScheduledTaskStatus = any;

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
    timeFrame?: string; // "1 week", "tomorrow", "in 3 days"
    intent?: string; // "Discuss study plan progress"
    topic?: string; // "Gym Motivation Check-in"
    tone?: 'friendly' | 'professional' | 'encouraging';
    absoluteTime?: Date; // Calculated absolute timestamp
}

// ============================================
// TASK CREATION
// ============================================

/**
 * Create a new scheduled task for proactive follow-up
 */
export async function createScheduledTask(input: CreateScheduledTaskInput): Promise<ScheduledTask> {
    // Create the task in the database
    const task = await prisma.scheduledTask.create({
        data: {
            userId: input.userId,
            chatId: input.chatId,
            triggerAt: input.triggerAt,
            intent: input.intent,
            contextSummary: input.contextSummary,
            topic: input.topic,
            tone: input.tone || 'friendly',
            channelPref: input.channelPref || 'auto',
            metadata: (input.metadata || {}) as Prisma.InputJsonValue,
            status: ScheduledTaskStatus.PENDING,
        },
    });

    // If QStash is configured, schedule the webhook
    if (QSTASH_TOKEN) {
        try {
            const externalJobId = await scheduleQStashWebhook(task.id, input.triggerAt);
            await prisma.scheduledTask.update({
                where: { id: task.id },
                data: { externalJobId },
            });
        } catch (error) {
            console.error('Failed to schedule QStash webhook:', error);
            // Task is still created, will be picked up by polling fallback
        }
    }

    return task;
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
        status?: ScheduledTaskStatus;
        chatId?: string;
        limit?: number;
    }
): Promise<ScheduledTask[]> {
    return prisma.scheduledTask.findMany({
        where: {
            userId,
            status: options?.status,
            chatId: options?.chatId,
        },
        orderBy: { triggerAt: 'asc' },
        take: options?.limit || 50,
    });
}

/**
 * Get pending tasks that should be executed now
 */
export async function getPendingTasksToExecute(): Promise<ScheduledTask[]> {
    return prisma.scheduledTask.findMany({
        where: {
            status: ScheduledTaskStatus.PENDING,
            triggerAt: { lte: new Date() },
        },
        orderBy: { triggerAt: 'asc' },
        take: 100,
    });
}

/**
 * Get a single task by ID
 */
export async function getTaskById(taskId: string): Promise<ScheduledTask | null> {
    return prisma.scheduledTask.findUnique({
        where: { id: taskId },
    });
}

// ============================================
// TASK MANAGEMENT
// ============================================

/**
 * Cancel a scheduled task
 */
export async function cancelScheduledTask(
    taskId: string,
    userId: string
): Promise<ScheduledTask | null> {
    const task = await prisma.scheduledTask.findFirst({
        where: { id: taskId, userId },
    });

    if (!task || task.status !== ScheduledTaskStatus.PENDING) {
        return null;
    }

    // Cancel QStash job if configured
    if (QSTASH_TOKEN && task.externalJobId) {
        try {
            await fetch(`${QSTASH_URL}/messages/${task.externalJobId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${QSTASH_TOKEN}` },
            });
        } catch (error) {
            console.error('Failed to cancel QStash job:', error);
        }
    }

    return prisma.scheduledTask.update({
        where: { id: taskId },
        data: { status: ScheduledTaskStatus.CANCELED },
    });
}

/**
 * Update task trigger time (reschedule)
 */
export async function rescheduleTask(
    taskId: string,
    userId: string,
    newTriggerAt: Date
): Promise<ScheduledTask | null> {
    const task = await prisma.scheduledTask.findFirst({
        where: { id: taskId, userId },
    });

    if (!task || task.status !== ScheduledTaskStatus.PENDING) {
        return null;
    }

    // Cancel old QStash job and create new one
    if (QSTASH_TOKEN && task.externalJobId) {
        try {
            await fetch(`${QSTASH_URL}/messages/${task.externalJobId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${QSTASH_TOKEN}` },
            });
        } catch (error) {
            console.error('Failed to cancel old QStash job:', error);
        }
    }

    let externalJobId = task.externalJobId;
    if (QSTASH_TOKEN) {
        try {
            externalJobId = await scheduleQStashWebhook(taskId, newTriggerAt);
        } catch (error) {
            console.error('Failed to reschedule QStash job:', error);
        }
    }

    return prisma.scheduledTask.update({
        where: { id: taskId },
        data: { triggerAt: newTriggerAt, externalJobId },
    });
}

/**
 * Mark task as processing (being executed)
 */
export async function markTaskProcessing(taskId: string): Promise<ScheduledTask> {
    return prisma.scheduledTask.update({
        where: { id: taskId },
        data: { status: ScheduledTaskStatus.PROCESSING },
    });
}

/**
 * Mark task as completed with result
 */
export async function markTaskCompleted(
    taskId: string,
    resultMessage: string,
    deliveryStatus?: string
): Promise<ScheduledTask> {
    return prisma.scheduledTask.update({
        where: { id: taskId },
        data: {
            status: ScheduledTaskStatus.COMPLETED,
            executedAt: new Date(),
            resultMessage,
            deliveryStatus: deliveryStatus || 'delivered',
        },
    });
}

/**
 * Mark task as failed with error
 */
export async function markTaskFailed(taskId: string, errorMessage: string): Promise<ScheduledTask> {
    return prisma.scheduledTask.update({
        where: { id: taskId },
        data: {
            status: ScheduledTaskStatus.FAILED,
            executedAt: new Date(),
            errorMessage,
        },
    });
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
        // "tomorrow"
        [
            /^tomorrow$/i,
            () => {
                const d = new Date(fromDate);
                d.setDate(d.getDate() + 1);
                d.setHours(9, 0, 0, 0); // Default to 9 AM
                return d;
            },
        ],
        // "next week"
        [
            /^next\s+week$/i,
            () => {
                const d = new Date(fromDate);
                d.setDate(d.getDate() + 7);
                d.setHours(9, 0, 0, 0);
                return d;
            },
        ],
        // "in X days/weeks/hours/minutes"
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
        // "X days/weeks from now"
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
        // "1 week" / "2 days" etc.
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
    return prisma.recurringSchedule.create({
        data: {
            userId: params.userId,
            reminderId: params.reminderId,
            cronExpression: params.cronExpression,
            naturalLanguage: params.naturalLanguage,
            timezone: params.timezone || 'UTC',
            maxOccurrences: params.maxOccurrences,
            nextRunAt: nextRun,
        },
    });
}

export async function getDueRecurringSchedules() {
    return prisma.recurringSchedule.findMany({
        where: {
            isActive: true,
            nextRunAt: { lte: new Date() },
        },
        orderBy: { nextRunAt: 'asc' },
        take: 50,
    });
}

export async function advanceRecurringSchedule(scheduleId: string) {
    const schedule = await prisma.recurringSchedule.findUnique({ where: { id: scheduleId } });
    if (!schedule) return;

    const nextRun = getNextCronRun(schedule.cronExpression);
    const shouldDeactivate =
        schedule.maxOccurrences != null && schedule.occurrenceCount + 1 >= schedule.maxOccurrences;

    await prisma.recurringSchedule.update({
        where: { id: scheduleId },
        data: {
            occurrenceCount: { increment: 1 },
            lastRunAt: new Date(),
            nextRunAt: shouldDeactivate ? null : nextRun,
            isActive: !shouldDeactivate,
        },
    });
}

/**
 * Scheduler API Routes - Proactive Agentic Callback (PAC)
 *
 * Handles scheduled task management and webhook execution.
 */

import { ScheduledTaskStatus } from '@aspendos/db';
import { Hono } from 'hono';
import { requireAuth } from '../middleware/auth';
import { validateBody, validateQuery } from '../middleware/validate';
import { recordTokenUsage } from '../services/billing.service';
import * as commitmentService from '../services/commitment-detector.service';
import { sendNotification } from '../services/notification.service';
import * as schedulerService from '../services/scheduler.service';
import {
    createScheduledTaskSchema,
    executeTaskSchema,
    getTasksQuerySchema,
    rescheduleTaskSchema,
} from '../validation/scheduler.schema';

type Variables = {
    validatedBody?: unknown;
    validatedQuery?: unknown;
    validatedParams?: unknown;
};

const app = new Hono<{ Variables: Variables }>();

// ============================================
// AUTHENTICATED ROUTES
// ============================================

// GET /api/scheduler/tasks - Get user's scheduled tasks
app.get('/tasks', requireAuth, validateQuery(getTasksQuerySchema), async (c) => {
    const userId = c.get('userId')!;
    const validated = c.get('validatedQuery') as {
        status?: ScheduledTaskStatus;
        chatId?: string;
        limit: number;
    };

    const { status, chatId, limit } = validated;

    const tasks = await schedulerService.getUserScheduledTasks(userId, {
        status,
        chatId: chatId || undefined,
        limit,
    });

    return c.json({
        tasks: tasks.map((task) => ({
            id: task.id,
            chatId: task.chatId,
            triggerAt: task.triggerAt.toISOString(),
            triggerAtFormatted: schedulerService.formatScheduledTime(task.triggerAt),
            status: task.status,
            intent: task.intent,
            topic: task.topic,
            tone: task.tone,
            channelPref: task.channelPref,
            createdAt: task.createdAt.toISOString(),
        })),
    });
});

// POST /api/scheduler/tasks - Create a scheduled task
app.post('/tasks', requireAuth, validateBody(createScheduledTaskSchema), async (c) => {
    const userId = c.get('userId')!;
    const validated = c.get('validatedBody') as {
        chatId: string;
        triggerAt: string;
        intent: string;
        contextSummary?: string;
        topic?: string;
        tone?: 'friendly' | 'professional' | 'encouraging';
        channelPref?: 'auto' | 'push' | 'email' | 'in_app';
        metadata?: Record<string, unknown>;
    };

    const { chatId, triggerAt, intent, contextSummary, topic, tone, channelPref, metadata } =
        validated;

    // Parse triggerAt (can be ISO string or relative expression)
    let triggerDate: Date | null;
    if (triggerAt.includes('T') || triggerAt.match(/^\d{4}-\d{2}-\d{2}/)) {
        triggerDate = new Date(triggerAt);
    } else {
        triggerDate = schedulerService.parseTimeExpression(triggerAt);
    }

    if (!triggerDate || Number.isNaN(triggerDate.getTime())) {
        return c.json({ error: 'Invalid triggerAt format' }, 400);
    }

    // Validate triggerAt is in the future
    if (triggerDate <= new Date()) {
        return c.json({ error: 'triggerAt must be in the future' }, 400);
    }

    const task = await schedulerService.createScheduledTask({
        userId,
        chatId,
        triggerAt: triggerDate,
        intent,
        contextSummary,
        topic,
        tone,
        channelPref,
        metadata,
    });

    return c.json(
        {
            id: task.id,
            chatId: task.chatId,
            triggerAt: task.triggerAt.toISOString(),
            triggerAtFormatted: schedulerService.formatScheduledTime(task.triggerAt),
            status: task.status,
            intent: task.intent,
            topic: task.topic,
        },
        201
    );
});

// GET /api/scheduler/tasks/:id - Get a single task
app.get('/tasks/:id', requireAuth, async (c) => {
    const userId = c.get('userId')!;
    const taskId = c.req.param('id');

    const task = await schedulerService.getTaskById(taskId);

    if (!task || task.userId !== userId) {
        return c.json({ error: 'Task not found' }, 404);
    }

    return c.json({
        id: task.id,
        chatId: task.chatId,
        triggerAt: task.triggerAt.toISOString(),
        triggerAtFormatted: schedulerService.formatScheduledTime(task.triggerAt),
        status: task.status,
        intent: task.intent,
        topic: task.topic,
        tone: task.tone,
        channelPref: task.channelPref,
        contextSummary: task.contextSummary,
        resultMessage: task.resultMessage,
        executedAt: task.executedAt?.toISOString(),
        createdAt: task.createdAt.toISOString(),
    });
});

// DELETE /api/scheduler/tasks/:id - Cancel a scheduled task
app.delete('/tasks/:id', requireAuth, async (c) => {
    const userId = c.get('userId')!;
    const taskId = c.req.param('id');

    const task = await schedulerService.cancelScheduledTask(taskId, userId);

    if (!task) {
        return c.json({ error: 'Task not found or cannot be canceled' }, 404);
    }

    return c.json({ success: true, message: 'Task canceled' });
});

// PATCH /api/scheduler/tasks/:id - Reschedule a task
app.patch('/tasks/:id', requireAuth, validateBody(rescheduleTaskSchema), async (c) => {
    const userId = c.get('userId')!;
    const taskId = c.req.param('id');
    const validated = c.get('validatedBody') as { triggerAt: string };

    // Parse new triggerAt
    let triggerDate: Date | null;
    if (validated.triggerAt.includes('T') || validated.triggerAt.match(/^\d{4}-\d{2}-\d{2}/)) {
        triggerDate = new Date(validated.triggerAt);
    } else {
        triggerDate = schedulerService.parseTimeExpression(validated.triggerAt);
    }

    if (!triggerDate || Number.isNaN(triggerDate.getTime())) {
        return c.json({ error: 'Invalid triggerAt format' }, 400);
    }

    if (triggerDate <= new Date()) {
        return c.json({ error: 'triggerAt must be in the future' }, 400);
    }

    const task = await schedulerService.rescheduleTask(taskId, userId, triggerDate);

    if (!task) {
        return c.json({ error: 'Task not found or cannot be rescheduled' }, 404);
    }

    return c.json({
        id: task.id,
        triggerAt: task.triggerAt.toISOString(),
        triggerAtFormatted: schedulerService.formatScheduledTime(task.triggerAt),
        status: task.status,
    });
});

// ============================================
// WEBHOOK ROUTES (No auth - uses signature verification)
// ============================================

// POST /api/scheduler/execute - Execute a scheduled task (called by QStash/cron)
app.post('/execute', validateBody(executeTaskSchema), async (c) => {
    // Fail-closed: require CRON_SECRET for task execution
    const cronSecret = c.req.header('x-cron-secret') || c.req.header('authorization')?.replace('Bearer ', '');
    if (!process.env.CRON_SECRET || cronSecret !== process.env.CRON_SECRET) {
        return c.json({ error: 'Unauthorized' }, 401);
    }

    const validated = c.get('validatedBody') as { taskId: string };
    const { taskId } = validated;

    const task = await schedulerService.getTaskById(taskId);

    if (!task) {
        return c.json({ error: 'Task not found' }, 404);
    }

    if (task.status !== ScheduledTaskStatus.PENDING) {
        return c.json({ error: 'Task is not pending', status: task.status }, 400);
    }

    try {
        // Mark as processing
        await schedulerService.markTaskProcessing(taskId);

        // Generate the re-engagement message
        const message = await commitmentService.generateReengagementMessage(task);

        // Meter the LLM call for re-engagement generation (~200 input + 150 output tokens)
        await recordTokenUsage(task.userId, 200, 150, 'openai/gpt-4o-mini');

        // Mark as completed
        await schedulerService.markTaskCompleted(taskId, message, 'pending_delivery');

        // Trigger notification delivery (push/email/SSE)
        const deliveryResults = await sendNotification({
            userId: task.userId,
            title: task.topic || 'Reminder',
            body: message,
            taskId: task.id,
            chatId: task.chatId,
            data: {
                taskId: task.id,
                chatId: task.chatId,
                intent: task.intent,
            },
            channelPref: (task.channelPref as 'auto' | 'push' | 'email' | 'in_app') || 'auto',
        });

        console.log(`[Scheduler] Notification delivery results:`, deliveryResults);

        return c.json({
            success: true,
            taskId,
            message,
            deliveryResults,
        });
    } catch (error) {
        console.error('Task execution failed:', error);
        await schedulerService.markTaskFailed(
            taskId,
            error instanceof Error ? error.message : 'Unknown error'
        );
        return c.json({ error: 'Task execution failed' }, 500);
    }
});

// POST /api/scheduler/poll - Poll for pending tasks (fallback when QStash not configured)
app.post('/poll', async (c) => {
    // This endpoint should be called by a cron job
    // Verify it's an internal call (e.g., via API key or secret header)
    const cronSecret = c.req.header('x-cron-secret');
    if (!process.env.CRON_SECRET || cronSecret !== process.env.CRON_SECRET) {
        return c.json({ error: 'Unauthorized' }, 401);
    }

    const pendingTasks = await schedulerService.getPendingTasksToExecute();

    const results = [];
    for (const task of pendingTasks) {
        try {
            await schedulerService.markTaskProcessing(task.id);
            const message = await commitmentService.generateReengagementMessage(task);

            // Meter the LLM call for re-engagement generation
            await recordTokenUsage(task.userId, 200, 150, 'openai/gpt-4o-mini');

            await schedulerService.markTaskCompleted(task.id, message, 'pending_delivery');

            // Trigger notification delivery
            const deliveryResults = await sendNotification({
                userId: task.userId,
                title: task.topic || 'Reminder',
                body: message,
                taskId: task.id,
                chatId: task.chatId,
                data: {
                    taskId: task.id,
                    chatId: task.chatId,
                    intent: task.intent,
                },
                channelPref: (task.channelPref as 'auto' | 'push' | 'email' | 'in_app') || 'auto',
            });

            results.push({ taskId: task.id, success: true, deliveryResults });
        } catch (error) {
            await schedulerService.markTaskFailed(
                task.id,
                error instanceof Error ? error.message : 'Unknown error'
            );
            results.push({
                taskId: task.id,
                success: false,
                error: error instanceof Error ? error.message : 'Unknown',
            });
        }
    }

    return c.json({
        processed: results.length,
        results,
    });
});

export default app;

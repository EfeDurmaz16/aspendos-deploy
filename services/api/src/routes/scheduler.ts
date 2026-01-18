/**
 * Scheduler API Routes - Proactive Agentic Callback (PAC)
 *
 * Handles scheduled task management and webhook execution.
 */

import { ScheduledTaskStatus } from '@aspendos/db';
import { Hono } from 'hono';
import { requireAuth } from '../middleware/auth';
import * as commitmentService from '../services/commitment-detector.service';
import * as schedulerService from '../services/scheduler.service';

const app = new Hono();

// ============================================
// AUTHENTICATED ROUTES
// ============================================

// GET /api/scheduler/tasks - Get user's scheduled tasks
app.get('/tasks', requireAuth, async (c) => {
    const userId = c.get('userId')!;
    const status = c.req.query('status') as ScheduledTaskStatus | undefined;
    const chatId = c.req.query('chatId');
    const limit = parseInt(c.req.query('limit') || '50');

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
app.post('/tasks', requireAuth, async (c) => {
    const userId = c.get('userId')!;
    const body = await c.req.json();

    const { chatId, triggerAt, intent, contextSummary, topic, tone, channelPref, metadata } = body;

    if (!chatId || !triggerAt || !intent) {
        return c.json({ error: 'chatId, triggerAt, and intent are required' }, 400);
    }

    // Parse triggerAt (can be ISO string or relative expression)
    let triggerDate: Date | null;
    if (body.triggerAt.includes('T') || body.triggerAt.match(/^\d{4}-\d{2}-\d{2}/)) {
        triggerDate = new Date(body.triggerAt);
    } else {
        triggerDate = schedulerService.parseTimeExpression(body.triggerAt);
    }

    if (!triggerDate || isNaN(triggerDate.getTime())) {
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
app.patch('/tasks/:id', requireAuth, async (c) => {
    const userId = c.get('userId')!;
    const taskId = c.req.param('id');
    const body = await c.req.json();

    if (!body.triggerAt) {
        return c.json({ error: 'triggerAt is required' }, 400);
    }

    // Parse new triggerAt
    let triggerDate: Date | null;
    if (body.triggerAt.includes('T') || body.triggerAt.match(/^\d{4}-\d{2}-\d{2}/)) {
        triggerDate = new Date(body.triggerAt);
    } else {
        triggerDate = schedulerService.parseTimeExpression(body.triggerAt);
    }

    if (!triggerDate || isNaN(triggerDate.getTime())) {
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
app.post('/execute', async (c) => {
    // Verify QStash signature if configured
    const qstashSignature = c.req.header('upstash-signature');
    if (process.env.QSTASH_CURRENT_SIGNING_KEY && qstashSignature) {
        // TODO: Implement QStash signature verification
        // For now, we'll trust the internal network
    }

    const body = await c.req.json();
    const { taskId } = body;

    if (!taskId) {
        return c.json({ error: 'taskId is required' }, 400);
    }

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

        // Mark as completed
        await schedulerService.markTaskCompleted(taskId, message, 'pending_delivery');

        // TODO: Trigger notification delivery (push/email/SSE)
        // This will be implemented in the notification service

        return c.json({
            success: true,
            taskId,
            message,
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
    if (cronSecret !== process.env.CRON_SECRET) {
        return c.json({ error: 'Unauthorized' }, 401);
    }

    const pendingTasks = await schedulerService.getPendingTasksToExecute();

    const results = [];
    for (const task of pendingTasks) {
        try {
            await schedulerService.markTaskProcessing(task.id);
            const message = await commitmentService.generateReengagementMessage(task);
            await schedulerService.markTaskCompleted(task.id, message, 'pending_delivery');
            results.push({ taskId: task.id, success: true });
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

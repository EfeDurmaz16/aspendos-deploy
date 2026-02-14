/**
 * PAC API Routes - Proactive AI Callbacks
 *
 * Handles reminder management and settings.
 */
import { Hono } from 'hono';
import { auditLog } from '../lib/audit-log';
import { requireAuth } from '../middleware/auth';
import { enforceTierLimit } from '../middleware/tier-enforcement';
import { validateBody, validateParams } from '../middleware/validate';
import * as pacService from '../services/pac.service';
import {
    createReminderSchema,
    detectCommitmentsSchema,
    reminderIdParamSchema,
    snoozeReminderSchema,
    updatePACSettingsSchema,
} from '../validation/pac.schema';
import { parseTimeExpression } from '../services/scheduler.service';

type Variables = {
    validatedBody?: unknown;
    validatedQuery?: unknown;
    validatedParams?: unknown;
};

const app = new Hono<{ Variables: Variables }>();

// All routes require authentication
app.use('*', requireAuth);

/**
 * POST /api/pac/detect - Detect commitments in a message
 */
app.post('/detect', enforceTierLimit('dailyVoiceMinutes'), validateBody(detectCommitmentsSchema), async (c) => {
    const userId = c.get('userId')!;
    const { message, conversationId } = c.get('validatedBody') as {
        message: string;
        conversationId?: string;
    };

    // Get user settings
    const settings = await pacService.getPACSettings(userId);

    if (!settings.enabled) {
        return c.json({ commitments: [], message: 'PAC is disabled' });
    }

    // Detect commitments
    const commitments = pacService.detectCommitments(message);

    // Filter based on settings
    const filteredCommitments = commitments.filter((c) => {
        if (c.type === 'EXPLICIT' && !settings.explicitEnabled) return false;
        if (c.type === 'IMPLICIT' && !settings.implicitEnabled) return false;
        return true;
    });

    // Create reminders for detected commitments
    const createdReminders = [];
    for (const commitment of filteredCommitments) {
        const reminder = await pacService.createReminder(userId, commitment, conversationId);
        createdReminders.push(reminder);
    }

    return c.json({
        commitments: filteredCommitments,
        reminders: createdReminders.map((r) => ({
            id: r.id,
            content: r.content,
            type: r.type,
            priority: r.priority,
            triggerAt: r.triggerAt,
            status: r.status,
        })),
    });
});

/**
 * GET /api/pac/reminders - Get pending reminders
 */
app.get('/reminders', async (c) => {
    const userId = c.get('userId')!;
    const limit = Math.min(parseInt(c.req.query('limit') || '20', 10) || 20, 50);

    const reminders = await pacService.getPendingReminders(userId, limit);

    return c.json({
        reminders: reminders.map((r) => ({
            id: r.id,
            content: r.content,
            type: r.type,
            status: r.status,
            priority: r.priority,
            triggerAt: r.triggerAt,
            snoozeCount: r.snoozeCount,
            conversationId: r.chatId,
            createdAt: r.createdAt,
        })),
    });
});

/**
 * POST /api/pac/reminders - Create a reminder directly
 */
app.post('/reminders', validateBody(createReminderSchema), async (c) => {
    const userId = c.get('userId')!;
    const { content, type, triggerAt, conversationId } = c.get('validatedBody') as {
        content: string;
        type: 'EXPLICIT' | 'IMPLICIT';
        triggerAt: string;
        conversationId?: string;
    };

    const parsedDate =
        triggerAt.includes('T') || /^\d{4}-\d{2}-\d{2}/.test(triggerAt)
            ? new Date(triggerAt)
            : parseTimeExpression(triggerAt);

    if (!parsedDate || Number.isNaN(parsedDate.getTime())) {
        return c.json({ error: 'Invalid triggerAt format' }, 400);
    }

    if (parsedDate <= new Date()) {
        return c.json({ error: 'triggerAt must be in the future' }, 400);
    }

    const reminder = await pacService.createReminder(
        userId,
        {
            content,
            type,
            priority: type === 'EXPLICIT' ? 'MEDIUM' : 'LOW',
            triggerAt: parsedDate,
            confidence: type === 'EXPLICIT' ? 0.95 : 0.7,
        },
        conversationId
    );

    return c.json(
        {
            reminder: {
                id: reminder.id,
                content: reminder.content,
                type: reminder.type,
                status: reminder.status,
                priority: reminder.priority,
                triggerAt: reminder.triggerAt,
                conversationId: reminder.chatId,
                createdAt: reminder.createdAt,
            },
        },
        201
    );
});

/**
 * PATCH /api/pac/reminders/:id/complete - Mark reminder as complete
 */
app.patch('/reminders/:id/complete', validateParams(reminderIdParamSchema), async (c) => {
    const userId = c.get('userId')!;
    const { id: reminderId } = c.get('validatedParams') as { id: string };

    await pacService.completeReminder(reminderId, userId);

    return c.json({ success: true });
});

/**
 * PATCH /api/pac/reminders/:id/dismiss - Dismiss a reminder
 */
app.patch('/reminders/:id/dismiss', validateParams(reminderIdParamSchema), async (c) => {
    const userId = c.get('userId')!;
    const { id: reminderId } = c.get('validatedParams') as { id: string };

    await pacService.dismissReminder(reminderId, userId);

    return c.json({ success: true });
});

/**
 * PATCH /api/pac/reminders/:id/snooze - Snooze a reminder
 */
app.patch(
    '/reminders/:id/snooze',
    validateParams(reminderIdParamSchema),
    validateBody(snoozeReminderSchema),
    async (c) => {
        const userId = c.get('userId')!;
        const { id: reminderId } = c.get('validatedParams') as { id: string };
        const { minutes } = c.get('validatedBody') as { minutes: number };

        const result = await pacService.snoozeReminder(reminderId, userId, minutes);

        return c.json({
            success: true,
            newTriggerAt: result.newTriggerAt,
        });
    }
);

/**
 * GET /api/pac/settings - Get PAC settings
 */
app.get('/settings', async (c) => {
    const userId = c.get('userId')!;

    const settings = await pacService.getPACSettings(userId);

    return c.json({
        settings: {
            enabled: settings.enabled,
            explicitEnabled: settings.explicitEnabled,
            implicitEnabled: settings.implicitEnabled,
            pushEnabled: settings.pushEnabled,
            emailEnabled: settings.emailEnabled,
            quietHoursEnabled: !!(settings.quietHoursStart && settings.quietHoursEnd),
            quietHoursStart: settings.quietHoursStart,
            quietHoursEnd: settings.quietHoursEnd,
            escalationEnabled: settings.escalationEnabled,
            digestEnabled: settings.digestEnabled,
            digestTime: settings.digestTime,
        },
    });
});

/**
 * PATCH /api/pac/settings - Update PAC settings
 */
app.patch('/settings', validateBody(updatePACSettingsSchema), async (c) => {
    const userId = c.get('userId')!;
    const validatedBody = c.get('validatedBody') as Record<string, boolean | string>;

    if (Object.keys(validatedBody).length === 0) {
        return c.json({ error: 'No valid settings provided' }, 400);
    }

    const settings = await pacService.updatePACSettings(userId, validatedBody);

    // Audit log the settings update
    await auditLog({
        userId,
        action: 'SETTINGS_UPDATE',
        resource: 'pac_settings',
        metadata: validatedBody,
    });

    return c.json({
        success: true,
        settings: {
            enabled: settings.enabled,
            explicitEnabled: settings.explicitEnabled,
            implicitEnabled: settings.implicitEnabled,
            pushEnabled: settings.pushEnabled,
            emailEnabled: settings.emailEnabled,
            quietHoursEnabled: !!(settings.quietHoursStart && settings.quietHoursEnd),
            quietHoursStart: settings.quietHoursStart,
            quietHoursEnd: settings.quietHoursEnd,
            escalationEnabled: settings.escalationEnabled,
            digestEnabled: settings.digestEnabled,
            digestTime: settings.digestTime,
        },
    });
});

/**
 * GET /api/pac/stats - Get PAC statistics
 */
app.get('/stats', async (c) => {
    const userId = c.get('userId')!;

    const stats = await pacService.getPACStats(userId);

    return c.json(stats);
});

export default app;

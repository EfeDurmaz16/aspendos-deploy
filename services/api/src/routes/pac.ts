/**
 * PAC API Routes - Proactive AI Callbacks
 *
 * Handles reminder management and settings.
 */
import { Hono } from 'hono';
import { requireAuth } from '../middleware/auth';
import * as pacService from '../services/pac.service';

const app = new Hono();

// All routes require authentication
app.use('*', requireAuth);

/**
 * POST /api/pac/detect - Detect commitments in a message
 */
app.post('/detect', async (c) => {
    const userId = c.get('userId')!;
    const body = await c.req.json();

    const { message, conversationId, messageId } = body;

    if (!message || typeof message !== 'string') {
        return c.json({ error: 'message is required' }, 400);
    }

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
        const reminder = await pacService.createReminder(
            userId,
            commitment,
            conversationId,
            messageId
        );
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
    const limit = parseInt(c.req.query('limit') || '20', 10);

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
            conversationId: r.conversation?.id,
            conversationTitle: r.conversation?.title,
            createdAt: r.createdAt,
        })),
    });
});

/**
 * PATCH /api/pac/reminders/:id/complete - Mark reminder as complete
 */
app.patch('/reminders/:id/complete', async (c) => {
    const userId = c.get('userId')!;
    const reminderId = c.req.param('id');

    await pacService.completeReminder(reminderId, userId);

    return c.json({ success: true });
});

/**
 * PATCH /api/pac/reminders/:id/dismiss - Dismiss a reminder
 */
app.patch('/reminders/:id/dismiss', async (c) => {
    const userId = c.get('userId')!;
    const reminderId = c.req.param('id');

    await pacService.dismissReminder(reminderId, userId);

    return c.json({ success: true });
});

/**
 * PATCH /api/pac/reminders/:id/snooze - Snooze a reminder
 */
app.patch('/reminders/:id/snooze', async (c) => {
    const userId = c.get('userId')!;
    const reminderId = c.req.param('id');
    const body = await c.req.json();

    const { minutes } = body;

    if (typeof minutes !== 'number' || minutes <= 0) {
        return c.json({ error: 'minutes must be a positive number' }, 400);
    }

    const result = await pacService.snoozeReminder(reminderId, userId, minutes);

    return c.json({
        success: true,
        newTriggerAt: result.newTriggerAt,
    });
});

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
            quietHoursEnabled: settings.quietHoursEnabled,
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
app.patch('/settings', async (c) => {
    const userId = c.get('userId')!;
    const body = await c.req.json();

    // Whitelist and validate allowed fields
    const BOOLEAN_FIELDS = [
        'enabled', 'explicitEnabled', 'implicitEnabled',
        'pushEnabled', 'emailEnabled', 'quietHoursEnabled',
        'escalationEnabled', 'digestEnabled',
    ] as const;
    const TIME_FIELDS = ['quietHoursStart', 'quietHoursEnd', 'digestTime'] as const;
    const TIME_REGEX = /^\d{2}:\d{2}$/;

    const sanitized: Record<string, boolean | string> = {};
    for (const field of BOOLEAN_FIELDS) {
        if (field in body && typeof body[field] === 'boolean') {
            sanitized[field] = body[field];
        }
    }
    for (const field of TIME_FIELDS) {
        if (field in body && typeof body[field] === 'string' && TIME_REGEX.test(body[field])) {
            sanitized[field] = body[field];
        }
    }

    if (Object.keys(sanitized).length === 0) {
        return c.json({ error: 'No valid settings provided' }, 400);
    }

    const settings = await pacService.updatePACSettings(userId, sanitized);

    return c.json({
        success: true,
        settings: {
            enabled: settings.enabled,
            explicitEnabled: settings.explicitEnabled,
            implicitEnabled: settings.implicitEnabled,
            pushEnabled: settings.pushEnabled,
            emailEnabled: settings.emailEnabled,
            quietHoursEnabled: settings.quietHoursEnabled,
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

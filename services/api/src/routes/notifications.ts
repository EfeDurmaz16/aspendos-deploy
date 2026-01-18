/**
 * Notification API Routes
 *
 * Handles push subscription registration, SSE connections, and preferences.
 */
import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { requireAuth } from '../middleware/auth';
import * as notificationService from '../services/notification.service';

const app = new Hono();

// ============================================
// PUSH SUBSCRIPTION MANAGEMENT
// ============================================

// POST /api/notifications/subscribe - Register push subscription
app.post('/subscribe', requireAuth, async (c) => {
    const userId = c.get('userId')!;
    const body = await c.req.json();

    const {
        oneSignalPlayerId,
        oneSignalExternalId,
        endpoint,
        p256dh,
        auth,
        platform,
        deviceName,
        browserName,
        osVersion,
    } = body;

    if (!platform) {
        return c.json({ error: 'platform is required' }, 400);
    }

    if (!oneSignalPlayerId && !endpoint) {
        return c.json({ error: 'Either oneSignalPlayerId or endpoint is required' }, 400);
    }

    try {
        const subscription = await notificationService.registerPushSubscription({
            userId,
            oneSignalPlayerId,
            oneSignalExternalId: oneSignalExternalId || userId, // Use userId as external ID
            endpoint,
            p256dh,
            auth,
            platform,
            deviceName,
            browserName,
            osVersion,
        });

        return c.json({
            success: true,
            subscriptionId: subscription.id,
            platform: subscription.platform,
        }, 201);
    } catch (error) {
        console.error('Push subscription failed:', error);
        return c.json({
            error: 'Failed to register subscription',
            details: error instanceof Error ? error.message : 'Unknown error',
        }, 500);
    }
});

// DELETE /api/notifications/subscribe - Unsubscribe from push
app.delete('/subscribe', requireAuth, async (c) => {
    const userId = c.get('userId')!;
    const { subscriptionId, oneSignalPlayerId } = await c.req.json();

    await notificationService.deactivatePushSubscription(userId, subscriptionId, oneSignalPlayerId);

    return c.json({ success: true });
});

// ============================================
// NOTIFICATION PREFERENCES
// ============================================

// GET /api/notifications/preferences - Get user preferences
app.get('/preferences', requireAuth, async (c) => {
    const userId = c.get('userId')!;
    const preferences = await notificationService.getUserNotificationPreferences(userId);

    return c.json(preferences);
});

// PATCH /api/notifications/preferences - Update preferences
app.patch('/preferences', requireAuth, async (c) => {
    const userId = c.get('userId')!;
    const updates = await c.req.json();

    // Validate allowed fields
    const allowedFields = [
        'pushEnabled',
        'emailEnabled',
        'inAppEnabled',
        'quietHoursEnabled',
        'quietHoursStart',
        'quietHoursEnd',
        'quietHoursTimezone',
        'maxDailyNotifications',
        'minIntervalMinutes',
        'pacFollowupEnabled',
        'pacEmailFallback',
    ];

    const sanitizedUpdates: Record<string, unknown> = {};
    for (const field of allowedFields) {
        if (field in updates) {
            sanitizedUpdates[field] = updates[field];
        }
    }

    const preferences = await notificationService.updateNotificationPreferences(userId, sanitizedUpdates);

    return c.json({
        success: true,
        preferences: {
            pushEnabled: preferences.pushEnabled,
            emailEnabled: preferences.emailEnabled,
            inAppEnabled: preferences.inAppEnabled,
            quietHoursEnabled: preferences.quietHoursEnabled,
            quietHoursStart: preferences.quietHoursStart,
            quietHoursEnd: preferences.quietHoursEnd,
            quietHoursTimezone: preferences.quietHoursTimezone,
            maxDailyNotifications: preferences.maxDailyNotifications,
            minIntervalMinutes: preferences.minIntervalMinutes,
            pacFollowupEnabled: preferences.pacFollowupEnabled,
            pacEmailFallback: preferences.pacEmailFallback,
        },
    });
});

// ============================================
// SERVER-SENT EVENTS (SSE)
// ============================================

// GET /api/notifications/stream - SSE connection for real-time notifications
app.get('/stream', requireAuth, async (c) => {
    const userId = c.get('userId')!;

    return streamSSE(c, async (stream) => {
        // Send initial connection message
        await stream.writeSSE({
            event: 'connected',
            data: JSON.stringify({
                userId,
                timestamp: new Date().toISOString(),
            }),
        });

        // Register SSE connection
        const cleanup = notificationService.registerSSEConnection(userId, (data: string) => {
            stream.write(data);
        });

        // Keep connection alive with heartbeat
        const heartbeat = setInterval(async () => {
            try {
                await stream.writeSSE({
                    event: 'heartbeat',
                    data: JSON.stringify({ timestamp: new Date().toISOString() }),
                });
            } catch {
                // Connection closed
                clearInterval(heartbeat);
                cleanup();
            }
        }, 30000); // Every 30 seconds

        // Wait for connection to close
        stream.onAbort(() => {
            clearInterval(heartbeat);
            cleanup();
        });

        // Keep the connection open
        // The stream will be closed when the client disconnects
        await new Promise(() => {}); // Never resolves, keeps stream open
    });
});

// ============================================
// TESTING ENDPOINTS (Dev only)
// ============================================

// POST /api/notifications/test - Send test notification (dev only)
app.post('/test', requireAuth, async (c) => {
    if (process.env.NODE_ENV === 'production') {
        return c.json({ error: 'Test endpoint not available in production' }, 403);
    }

    const userId = c.get('userId')!;
    const { channel, title, body } = await c.req.json();

    const results = await notificationService.sendNotification({
        userId,
        title: title || 'Test Notification',
        body: body || 'This is a test notification from Aspendos.',
        channelPref: channel || 'auto',
    });

    return c.json({
        success: results.some(r => r.success),
        results,
    });
});

// GET /api/notifications/status - Check connection status
app.get('/status', requireAuth, async (c) => {
    const userId = c.get('userId')!;

    return c.json({
        isConnected: notificationService.isUserConnected(userId),
        timestamp: new Date().toISOString(),
    });
});

export default app;

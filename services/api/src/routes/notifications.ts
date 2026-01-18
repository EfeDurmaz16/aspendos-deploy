/**
 * Notification API Routes - STUB
 *
 * Full implementation requires database schema updates:
 * - PushSubscription table
 * - NotificationPreferences table
 * - NotificationLog table
 *
 * For now, this provides basic SSE support for in-app notifications.
 */
import { Hono } from 'hono';
import { requireAuth } from '../middleware/auth';

const app = new Hono();

// ============================================
// PUSH SUBSCRIPTION MANAGEMENT (STUB)
// ============================================

// POST /api/notifications/subscribe - Register push subscription
app.post('/subscribe', requireAuth, async (c) => {
    const userId = c.get('userId')!;

    console.log('Push subscription (stub):', userId);

    return c.json(
        {
            success: true,
            subscriptionId: `stub-${Date.now()}`,
            platform: 'web',
        },
        201
    );
});

// DELETE /api/notifications/subscribe - Unsubscribe from push
app.delete('/subscribe', requireAuth, async (c) => {
    const userId = c.get('userId')!;

    console.log('Push unsubscribe (stub):', userId);

    return c.json({ success: true });
});

// ============================================
// NOTIFICATION PREFERENCES (STUB)
// ============================================

// GET /api/notifications/preferences - Get user preferences
app.get('/preferences', requireAuth, async (c) => {
    const userId = c.get('userId')!;

    return c.json({
        userId,
        pushEnabled: false,
        emailEnabled: false,
        inAppEnabled: true,
        quietHoursEnabled: false,
        quietHoursTimezone: 'UTC',
        maxDailyNotifications: 10,
        minIntervalMinutes: 5,
        pacFollowupEnabled: true,
        pacEmailFallback: false,
    });
});

// PATCH /api/notifications/preferences - Update preferences
app.patch('/preferences', requireAuth, async (c) => {
    const userId = c.get('userId')!;
    const body = await c.req.json();

    console.log('Preferences update (stub):', { userId, ...body });

    return c.json({ success: true });
});

// ============================================
// SSE STREAM FOR IN-APP NOTIFICATIONS
// ============================================

// GET /api/notifications/stream - SSE stream for in-app notifications
app.get('/stream', requireAuth, async (c) => {
    const userId = c.get('userId')!;

    const stream = new ReadableStream({
        async start(controller) {
            // Send initial connection message
            controller.enqueue(
                new TextEncoder().encode(`:connected\ndata: {"type":"connected","userId":"${userId}"}\n\n`)
            );

            // Keep connection alive with heartbeat
            const heartbeat = setInterval(() => {
                try {
                    controller.enqueue(
                        new TextEncoder().encode(`:heartbeat\ndata: {"type":"heartbeat"}\n\n`)
                    );
                } catch {
                    clearInterval(heartbeat);
                }
            }, 30000);

            // Cleanup on disconnect
            c.req.raw.signal.addEventListener('abort', () => {
                clearInterval(heartbeat);
                console.log(`SSE connection closed for user ${userId}`);
                controller.close();
            });
        },
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        },
    });
});

export default app;

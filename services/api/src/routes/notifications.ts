/**
 * Notification API Routes - Full Implementation
 *
 * Provides SSE stream, push subscription management, and notification preferences.
 */

import { prisma } from '@aspendos/db';
import { Hono } from 'hono';
import { requireAuth } from '../middleware/auth';
import {
    getUserNotificationPreferences,
    registerPushSubscription,
    updateNotificationPreferences,
} from '../services/notification.service';

const app = new Hono();

// ============================================
// PUSH SUBSCRIPTION MANAGEMENT
// ============================================

// POST /api/notifications/subscribe - Register push subscription
app.post('/subscribe', requireAuth, async (c) => {
    const userId = c.get('userId')!;
    const body = await c.req.json();

    try {
        await registerPushSubscription(userId, {
            endpoint: body.endpoint,
            keys: {
                p256dh: body.keys.p256dh,
                auth: body.keys.auth,
            },
            deviceType: body.deviceType || 'web',
        });

        return c.json({ success: true }, 201);
    } catch (error) {
        console.error('[Notifications] Error registering push subscription:', error);
        return c.json({ error: 'Failed to register push subscription' }, 500);
    }
});

// DELETE /api/notifications/subscribe - Unsubscribe from push
app.delete('/subscribe', requireAuth, async (c) => {
    const userId = c.get('userId')!;
    const body = await c.req.json();

    try {
        await prisma.pushSubscription.deleteMany({
            where: {
                userId,
                endpoint: body.endpoint,
            },
        });

        return c.json({ success: true });
    } catch (error) {
        console.error('[Notifications] Error unsubscribing:', error);
        return c.json({ error: 'Failed to unsubscribe' }, 500);
    }
});

// ============================================
// NOTIFICATION PREFERENCES
// ============================================

// GET /api/notifications/preferences - Get user preferences
app.get('/preferences', requireAuth, async (c) => {
    const userId = c.get('userId')!;

    try {
        const prefs = await getUserNotificationPreferences(userId);
        return c.json(prefs);
    } catch (error) {
        console.error('[Notifications] Error getting preferences:', error);
        return c.json({ error: 'Failed to get preferences' }, 500);
    }
});

// PATCH /api/notifications/preferences - Update preferences
app.patch('/preferences', requireAuth, async (c) => {
    const userId = c.get('userId')!;
    const body = await c.req.json();

    try {
        await updateNotificationPreferences(userId, body);
        return c.json({ success: true });
    } catch (error) {
        console.error('[Notifications] Error updating preferences:', error);
        return c.json({ error: 'Failed to update preferences' }, 500);
    }
});

// ============================================
// SSE STREAM FOR IN-APP NOTIFICATIONS
// ============================================

// GET /api/notifications/stream - SSE stream for in-app notifications
app.get('/stream', requireAuth, async (c) => {
    const userId = c.get('userId')!;

    console.log(`[Notifications] SSE stream connected`);

    const stream = new ReadableStream({
        async start(controller) {
            let isActive = true;

            // Send initial connection message (no userId to prevent leaking internal IDs)
            controller.enqueue(
                new TextEncoder().encode(
                    `:connected\ndata: {"type":"connected"}\n\n`
                )
            );

            // Function to send a notification through SSE
            const sendNotification = (notification: {
                id: string;
                type: string;
                title: string;
                message: string;
                taskId: string | null;
                metadata: unknown;
            }) => {
                try {
                    const data = JSON.stringify({
                        type: 'notification',
                        notification: {
                            id: notification.id,
                            notificationType: notification.type,
                            title: notification.title,
                            message: notification.message,
                            taskId: notification.taskId,
                            metadata: notification.metadata,
                            timestamp: new Date().toISOString(),
                        },
                    });

                    controller.enqueue(new TextEncoder().encode(`data: ${data}\n\n`));
                } catch (error) {
                    console.error('[Notifications] Error sending notification:', error);
                }
            };

            // Poll for pending notifications
            const pollNotifications = async () => {
                if (!isActive) return;

                try {
                    // Get pending in-app notifications for this user
                    const notifications = await prisma.notificationLog.findMany({
                        where: {
                            userId,
                            channel: 'in_app',
                            status: 'pending',
                        },
                        orderBy: {
                            createdAt: 'asc',
                        },
                        take: 10,
                    });

                    // Send each notification and mark as delivered
                    for (const notification of notifications) {
                        sendNotification(notification);

                        // Mark as delivered
                        await prisma.notificationLog.update({
                            where: { id: notification.id },
                            data: {
                                status: 'delivered',
                                deliveredAt: new Date(),
                            },
                        });
                    }
                } catch (error) {
                    console.error('[Notifications] Error polling notifications:', error);
                }
            };

            // Poll immediately and then every 5 seconds
            pollNotifications();
            const pollInterval = setInterval(pollNotifications, 5000);

            // Keep connection alive with heartbeat every 30 seconds
            const heartbeat = setInterval(() => {
                if (!isActive) return;
                try {
                    controller.enqueue(new TextEncoder().encode(`:heartbeat\n\n`));
                } catch {
                    clearInterval(heartbeat);
                    clearInterval(pollInterval);
                    isActive = false;
                }
            }, 30000);

            // Cleanup on disconnect
            c.req.raw.signal.addEventListener('abort', () => {
                isActive = false;
                clearInterval(heartbeat);
                clearInterval(pollInterval);
                console.log(`[Notifications] SSE connection closed`);
                controller.close();
            });
        },
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
        },
    });
});

export default app;

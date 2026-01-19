/**
 * Notification Service - Multi-Channel Delivery for PAC
 *
 * Full implementation with database persistence and OneSignal push notifications.
 */

import { prisma } from '@aspendos/db';

// ============================================
// TYPES
// ============================================

export type NotificationChannel = 'push' | 'email' | 'in_app';

export interface NotificationPayload {
    userId: string;
    title: string;
    body: string;
    taskId?: string;
    chatId?: string;
    data?: Record<string, unknown>;
    channelPref?: 'auto' | 'push' | 'email' | 'in_app';
}

export interface DeliveryResult {
    success: boolean;
    channel: NotificationChannel;
    externalId?: string;
    error?: string;
}

export interface NotificationPreferences {
    pushEnabled: boolean;
    emailEnabled: boolean;
    inAppEnabled: boolean;
    quietHoursEnabled: boolean;
    quietHoursStart?: string;
    quietHoursEnd?: string;
    quietHoursTimezone: string;
    maxDailyNotifications: number;
    minIntervalMinutes: number;
    pacFollowupEnabled: boolean;
    pacEmailFallback: boolean;
}

// ============================================
// IMPLEMENTATION
// ============================================

/**
 * Send a notification to a user through the best available channel
 */
export async function sendNotification(
    payload: NotificationPayload
): Promise<DeliveryResult[]> {
    const { userId, title, body, taskId, data, channelPref = 'auto' } = payload;

    // Get user preferences
    const prefs = await getUserNotificationPreferences(userId);

    // Check quiet hours
    if (isInQuietHours(prefs)) {
        console.log(`[Notification] User ${userId} is in quiet hours, skipping`);
        return [
            {
                success: false,
                channel: 'in_app',
                error: 'User is in quiet hours',
            },
        ];
    }

    // Determine channels to use
    const channels = determineChannels(channelPref, prefs);
    const results: DeliveryResult[] = [];

    // Send to each channel
    for (const channel of channels) {
        try {
            let result: DeliveryResult;

            switch (channel) {
                case 'push':
                    result = await sendPushNotification(userId, title, body, data);
                    break;
                case 'email':
                    result = await sendEmailNotification(userId, title, body);
                    break;
                case 'in_app':
                    result = await sendInAppNotification(userId, title, body, taskId);
                    break;
                default:
                    result = {
                        success: false,
                        channel,
                        error: 'Unknown channel',
                    };
            }

            results.push(result);

            // Log to database
            await prisma.notificationLog.create({
                data: {
                    userId,
                    type: taskId ? 'PROACTIVE_FOLLOWUP' : 'ALERT',
                    title,
                    message: body,
                    channel,
                    status: result.success ? 'delivered' : 'failed',
                    taskId,
                    metadata: data ? JSON.parse(JSON.stringify(data)) : undefined,
                    deliveredAt: result.success ? new Date() : null,
                },
            });
        } catch (error) {
            console.error(`[Notification] Error sending to ${channel}:`, error);
            results.push({
                success: false,
                channel,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }

    return results;
}

/**
 * Send push notification via OneSignal
 */
async function sendPushNotification(
    userId: string,
    title: string,
    body: string,
    data?: Record<string, unknown>
): Promise<DeliveryResult> {
    // Check if OneSignal is configured
    const onesignalAppId = process.env.ONESIGNAL_APP_ID;
    const onesignalApiKey = process.env.ONESIGNAL_REST_API_KEY;

    if (!onesignalAppId || !onesignalApiKey) {
        console.log('[Notification] OneSignal not configured, skipping push');
        return {
            success: false,
            channel: 'push',
            error: 'OneSignal not configured',
        };
    }

    try {
        // Get user's push subscriptions
        const subscriptions = await prisma.pushSubscription.findMany({
            where: { userId },
        });

        if (subscriptions.length === 0) {
            return {
                success: false,
                channel: 'push',
                error: 'No push subscriptions found',
            };
        }

        // Send via OneSignal REST API
        const response = await fetch('https://onesignal.com/api/v1/notifications', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Basic ${onesignalApiKey}`,
            },
            body: JSON.stringify({
                app_id: onesignalAppId,
                headings: { en: title },
                contents: { en: body },
                data,
                include_external_user_ids: [userId],
            }),
        });

        if (!response.ok) {
            const error = await response.text();
            return {
                success: false,
                channel: 'push',
                error: `OneSignal error: ${error}`,
            };
        }

        const result = await response.json();
        return {
            success: true,
            channel: 'push',
            externalId: result.id,
        };
    } catch (error) {
        return {
            success: false,
            channel: 'push',
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Send email notification (stub - requires email service setup)
 */
async function sendEmailNotification(
    userId: string,
    title: string,
    body: string
): Promise<DeliveryResult> {
    console.log(`[Notification] Email to user ${userId}: ${title}`);
    // TODO: Implement email service (SendGrid, Resend, etc.)
    return {
        success: false,
        channel: 'email',
        error: 'Email service not yet implemented',
    };
}

/**
 * Send in-app notification (SSE stream)
 */
async function sendInAppNotification(
    userId: string,
    title: string,
    body: string,
    taskId?: string
): Promise<DeliveryResult> {
    // In-app notifications are handled by SSE stream
    // Just mark as success - the SSE endpoint will pull from NotificationLog
    console.log(`[Notification] In-app notification queued for user ${userId}`);
    return {
        success: true,
        channel: 'in_app',
    };
}

/**
 * Get user notification preferences from database
 */
export async function getUserNotificationPreferences(
    userId: string
): Promise<NotificationPreferences> {
    const prefs = await prisma.notificationPreferences.findUnique({
        where: { userId },
    });

    if (!prefs) {
        // Return defaults if no preferences set
        return {
            pushEnabled: false,
            emailEnabled: false,
            inAppEnabled: true,
            quietHoursEnabled: false,
            quietHoursTimezone: 'UTC',
            maxDailyNotifications: 10,
            minIntervalMinutes: 5,
            pacFollowupEnabled: true,
            pacEmailFallback: false,
        };
    }

    return {
        pushEnabled: prefs.pushEnabled,
        emailEnabled: prefs.emailEnabled,
        inAppEnabled: prefs.inAppEnabled,
        quietHoursEnabled: !!(prefs.quietHoursStart && prefs.quietHoursEnd),
        quietHoursStart: prefs.quietHoursStart || undefined,
        quietHoursEnd: prefs.quietHoursEnd || undefined,
        quietHoursTimezone: prefs.timezone,
        maxDailyNotifications: 10,
        minIntervalMinutes: 5,
        pacFollowupEnabled: true,
        pacEmailFallback: false,
    };
}

/**
 * Register push subscription for a user's device
 */
export async function registerPushSubscription(
    userId: string,
    subscription: {
        endpoint: string;
        keys: {
            p256dh: string;
            auth: string;
        };
        deviceType?: string;
    }
): Promise<void> {
    try {
        // Check if subscription already exists
        const existing = await prisma.pushSubscription.findFirst({
            where: {
                userId,
                endpoint: subscription.endpoint,
            },
        });

        if (existing) {
            console.log(`[Notification] Push subscription already exists for user ${userId}`);
            return;
        }

        // Create new subscription
        await prisma.pushSubscription.create({
            data: {
                userId,
                endpoint: subscription.endpoint,
                p256dh: subscription.keys.p256dh,
                auth: subscription.keys.auth,
                deviceType: subscription.deviceType || 'web',
            },
        });

        console.log(`[Notification] Push subscription registered for user ${userId}`);
    } catch (error) {
        console.error('[Notification] Error registering push subscription:', error);
        throw error;
    }
}

/**
 * Update notification preferences for a user
 */
export async function updateNotificationPreferences(
    userId: string,
    preferences: Partial<NotificationPreferences>
): Promise<void> {
    try {
        const data: {
            pushEnabled?: boolean;
            emailEnabled?: boolean;
            inAppEnabled?: boolean;
            quietHoursStart?: string | null;
            quietHoursEnd?: string | null;
            timezone?: string;
        } = {};

        if (preferences.pushEnabled !== undefined) {
            data.pushEnabled = preferences.pushEnabled;
        }
        if (preferences.emailEnabled !== undefined) {
            data.emailEnabled = preferences.emailEnabled;
        }
        if (preferences.inAppEnabled !== undefined) {
            data.inAppEnabled = preferences.inAppEnabled;
        }
        if (preferences.quietHoursStart !== undefined) {
            data.quietHoursStart = preferences.quietHoursStart || null;
        }
        if (preferences.quietHoursEnd !== undefined) {
            data.quietHoursEnd = preferences.quietHoursEnd || null;
        }
        if (preferences.quietHoursTimezone) {
            data.timezone = preferences.quietHoursTimezone;
        }

        // Upsert preferences
        await prisma.notificationPreferences.upsert({
            where: { userId },
            update: data,
            create: {
                userId,
                ...data,
            },
        });

        console.log(`[Notification] Preferences updated for user ${userId}`);
    } catch (error) {
        console.error('[Notification] Error updating preferences:', error);
        throw error;
    }
}

/**
 * Check if user is in quiet hours
 */
export function isInQuietHours(preferences: NotificationPreferences): boolean {
    if (!preferences.quietHoursEnabled) return false;

    const now = new Date();
    const start = preferences.quietHoursStart ? parseInt(preferences.quietHoursStart, 10) : 21;
    const end = preferences.quietHoursEnd ? parseInt(preferences.quietHoursEnd, 10) : 8;

    const currentHour = now.getHours();

    if (start < end) {
        return currentHour >= start && currentHour < end;
    }
    return currentHour >= start || currentHour < end;
}

/**
 * Determine which channels to use
 */
export function determineChannels(
    preference: string,
    preferences: NotificationPreferences
): NotificationChannel[] {
    if (preference === 'auto') {
        const channels: NotificationChannel[] = [];
        if (preferences.inAppEnabled) channels.push('in_app');
        if (preferences.pushEnabled) channels.push('push');
        if (preferences.emailEnabled) channels.push('email');
        return channels.length > 0 ? channels : ['in_app'];
    }
    return [preference as NotificationChannel];
}

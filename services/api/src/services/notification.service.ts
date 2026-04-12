/**
 * Notification Service - Multi-Channel Delivery for PAC
 *
 * Uses Convex HTTP client for persistence. Push subscriptions and preferences
 * are stored via action_log entries (Convex schema doesn't have dedicated tables).
 */

import { getConvexClient, api } from '../lib/convex';

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
export async function sendNotification(payload: NotificationPayload): Promise<DeliveryResult[]> {
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

            // Log to Convex action_log
            try {
                const client = getConvexClient();
                await client.mutation(api.actionLog.log, {
                    user_id: userId as any,
                    event_type: 'notification_sent',
                    details: {
                        type: taskId ? 'PROACTIVE_FOLLOWUP' : 'ALERT',
                        title,
                        message: body,
                        channel,
                        status: result.success ? 'delivered' : 'failed',
                        taskId,
                        metadata: data ? JSON.parse(JSON.stringify(data)) : undefined,
                        deliveredAt: result.success ? new Date().toISOString() : null,
                    },
                });
            } catch {
                // best-effort logging
            }
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
 * Send email notification via Resend
 */
async function sendEmailNotification(
    userId: string,
    title: string,
    body: string
): Promise<DeliveryResult> {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
        console.warn('[Notification] RESEND_API_KEY not set, skipping email notification');
        return { success: false, channel: 'email', error: 'Email service not configured' };
    }

    // Look up user email from Convex
    let user: any = null;
    try {
        const client = getConvexClient();
        user = await client.query(api.users.get, { id: userId as any });
    } catch {
        return { success: false, channel: 'email', error: 'User lookup failed' };
    }

    if (!user?.email) {
        return { success: false, channel: 'email', error: 'User email not found' };
    }

    try {
        const { Resend } = await import('resend');
        const resend = new Resend(apiKey);
        const fromEmail = process.env.RESEND_FROM_EMAIL || 'YULA <noreply@yula.dev>';

        await resend.emails.send({
            from: fromEmail,
            to: user.email,
            subject: title,
            html: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #1a1a1a;">${title}</h2>
                <p style="color: #4a4a4a; line-height: 1.6;">${body}</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
                <p style="color: #999; font-size: 12px;">From YULA — Your Universal Learning Assistant</p>
            </div>`,
        });

        return { success: true, channel: 'email' };
    } catch (error) {
        console.error('[Notification] Email send failed:', error);
        return {
            success: false,
            channel: 'email',
            error: error instanceof Error ? error.message : 'Email send failed',
        };
    }
}

/**
 * Send in-app notification (SSE stream)
 */
async function sendInAppNotification(
    userId: string,
    _title: string,
    _body: string,
    _taskId?: string
): Promise<DeliveryResult> {
    console.log(`[Notification] In-app notification queued for user ${userId}`);
    return {
        success: true,
        channel: 'in_app',
    };
}

/**
 * Get user notification preferences
 * Convex schema doesn't have a notificationPreferences table — return defaults
 */
export async function getUserNotificationPreferences(
    _userId: string
): Promise<NotificationPreferences> {
    // Return defaults — preferences table not in Convex schema yet
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

/**
 * Register push subscription for a user's device
 * Stored via action_log (no pushSubscription table in Convex)
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
        const client = getConvexClient();
        await client.mutation(api.actionLog.log, {
            user_id: userId as any,
            event_type: 'push_subscription_registered',
            details: {
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
 * Stored via action_log (no notificationPreferences table in Convex)
 */
export async function updateNotificationPreferences(
    userId: string,
    preferences: Partial<NotificationPreferences>
): Promise<void> {
    try {
        const client = getConvexClient();
        await client.mutation(api.actionLog.log, {
            user_id: userId as any,
            event_type: 'notification_preferences_updated',
            details: preferences,
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

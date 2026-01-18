/**
 * Notification Service - Multi-Channel Delivery for PAC
 *
 * Handles notification delivery through multiple channels:
 * - Push notifications (OneSignal - web & mobile)
 * - Email (Resend)
 * - In-app (SSE/WebSocket)
 */
import { type Prisma, prisma, type ScheduledTask } from '@aspendos/db';

// ============================================
// CONFIGURATION
// ============================================

// OneSignal Configuration
const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID || '';
const ONESIGNAL_REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY || '';
const ONESIGNAL_API_URL = 'https://api.onesignal.com/notifications';

// Resend Configuration
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const RESEND_API_URL = 'https://api.resend.com/emails';
const EMAIL_FROM = process.env.EMAIL_FROM || 'Aspendos <notifications@aspendos.ai>';

// App URLs for deep links
const WEB_APP_URL = process.env.WEB_APP_URL || 'https://app.aspendos.ai';

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

// SSE Connections Registry (in-memory for now, can be upgraded to Redis)
const activeSSEConnections = new Map<string, Set<(data: string) => void>>();

// ============================================
// MAIN DELIVERY FUNCTION
// ============================================

/**
 * Send a notification to a user through the best available channel
 */
export async function sendNotification(payload: NotificationPayload): Promise<DeliveryResult[]> {
    const results: DeliveryResult[] = [];

    // Get user preferences
    const preferences = await getUserNotificationPreferences(payload.userId);

    // Check quiet hours
    if (preferences.quietHoursEnabled && isInQuietHours(preferences)) {
        console.log(`User ${payload.userId} is in quiet hours, deferring notification`);
        // Queue for later delivery or skip
        return [
            {
                success: false,
                channel: 'push',
                error: 'User is in quiet hours',
            },
        ];
    }

    // Check if PAC follow-ups are enabled
    if (payload.taskId && !preferences.pacFollowupEnabled) {
        return [
            {
                success: false,
                channel: 'push',
                error: 'PAC follow-ups disabled by user',
            },
        ];
    }

    // Determine channels to use based on preference
    const channels = determineChannels(payload.channelPref || 'auto', preferences);

    // Try each channel in priority order
    for (const channel of channels) {
        try {
            let result: DeliveryResult;

            switch (channel) {
                case 'push':
                    result = await sendPushNotification(payload);
                    break;
                case 'email':
                    result = await sendEmailNotification(payload);
                    break;
                case 'in_app':
                    result = await sendInAppNotification(payload);
                    break;
                default:
                    continue;
            }

            results.push(result);

            // Log the notification
            await logNotification({
                userId: payload.userId,
                taskId: payload.taskId,
                channel,
                status: result.success ? 'sent' : 'failed',
                title: payload.title,
                body: payload.body,
                data: payload.data,
                oneSignalNotificationId: channel === 'push' ? result.externalId : undefined,
                resendMessageId: channel === 'email' ? result.externalId : undefined,
                errorMessage: result.error,
            });

            // If push succeeded, we're done (unless email fallback is preferred)
            if (result.success && channel === 'push') {
                break;
            }

            // If push failed and email fallback is enabled, continue to email
            if (!result.success && channel === 'push' && preferences.pacEmailFallback) {
            }
        } catch (error) {
            console.error(`Failed to send ${channel} notification:`, error);
            results.push({
                success: false,
                channel,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }

    return results;
}

// ============================================
// CHANNEL-SPECIFIC IMPLEMENTATIONS
// ============================================

/**
 * Send push notification via OneSignal
 */
async function sendPushNotification(payload: NotificationPayload): Promise<DeliveryResult> {
    if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
        return {
            success: false,
            channel: 'push',
            error: 'OneSignal not configured',
        };
    }

    // Get user's push subscriptions
    const subscriptions = await prisma.pushSubscription.findMany({
        where: {
            userId: payload.userId,
            isActive: true,
        },
    });

    if (subscriptions.length === 0) {
        return {
            success: false,
            channel: 'push',
            error: 'No active push subscriptions',
        };
    }

    // Build OneSignal payload
    const oneSignalPayload = {
        app_id: ONESIGNAL_APP_ID,
        target_channel: 'push',
        headings: { en: payload.title },
        contents: { en: payload.body },
        // Target by external user ID (our user ID)
        include_aliases: {
            external_id: [payload.userId],
        },
        // Deep link to chat if available
        url: payload.chatId ? `${WEB_APP_URL}/chat/${payload.chatId}` : WEB_APP_URL,
        // Web-specific options
        chrome_web_image: `${WEB_APP_URL}/icon-192.png`,
        chrome_web_badge: `${WEB_APP_URL}/badge.png`,
        // iOS-specific options
        ios_attachments: {},
        // Android-specific options
        android_channel_id: 'pac-followups',
        android_accent_color: 'FF6366F1', // Indigo
        // Custom data
        data: {
            taskId: payload.taskId,
            chatId: payload.chatId,
            type: 'pac_followup',
            ...payload.data,
        },
        // TTL
        ttl: 86400, // 24 hours
    };

    try {
        const response = await fetch(ONESIGNAL_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json; charset=utf-8',
                Authorization: `Key ${ONESIGNAL_REST_API_KEY}`,
            },
            body: JSON.stringify(oneSignalPayload),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('OneSignal API error:', errorText);
            return {
                success: false,
                channel: 'push',
                error: `OneSignal error: ${response.status}`,
            };
        }

        const result = (await response.json()) as {
            id: string;
            recipients: number;
        };

        return {
            success: result.recipients > 0,
            channel: 'push',
            externalId: result.id,
        };
    } catch (error) {
        console.error('OneSignal request failed:', error);
        return {
            success: false,
            channel: 'push',
            error: error instanceof Error ? error.message : 'Request failed',
        };
    }
}

/**
 * Send email notification via Resend
 */
async function sendEmailNotification(payload: NotificationPayload): Promise<DeliveryResult> {
    if (!RESEND_API_KEY) {
        return {
            success: false,
            channel: 'email',
            error: 'Resend not configured',
        };
    }

    // Get user email
    const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { email: true, name: true },
    });

    if (!user?.email) {
        return {
            success: false,
            channel: 'email',
            error: 'User email not found',
        };
    }

    // Build email content
    const chatUrl = payload.chatId ? `${WEB_APP_URL}/chat/${payload.chatId}` : WEB_APP_URL;

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${payload.title}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5;">
    <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="background: white; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <!-- Logo -->
            <div style="text-align: center; margin-bottom: 24px;">
                <img src="${WEB_APP_URL}/logo.png" alt="Aspendos" height="32" style="height: 32px;">
            </div>

            <!-- Content -->
            <h1 style="font-size: 20px; font-weight: 600; color: #18181b; margin: 0 0 16px 0;">
                ${payload.title}
            </h1>

            <p style="font-size: 16px; line-height: 1.6; color: #3f3f46; margin: 0 0 24px 0;">
                ${payload.body}
            </p>

            <!-- CTA Button -->
            <div style="text-align: center;">
                <a href="${chatUrl}" style="display: inline-block; background: #6366f1; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 500; font-size: 14px;">
                    Continue Conversation
                </a>
            </div>

            <!-- Footer -->
            <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e4e4e7; text-align: center;">
                <p style="font-size: 12px; color: #71717a; margin: 0;">
                    This is an automated follow-up from your AI assistant.
                    <br>
                    <a href="${WEB_APP_URL}/settings/notifications" style="color: #6366f1;">Manage notification preferences</a>
                </p>
            </div>
        </div>
    </div>
</body>
</html>
    `;

    try {
        const response = await fetch(RESEND_API_URL, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${RESEND_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from: EMAIL_FROM,
                to: user.email,
                subject: payload.title,
                html: htmlContent,
                text: `${payload.title}\n\n${payload.body}\n\nContinue the conversation: ${chatUrl}`,
                tags: [
                    { name: 'type', value: 'pac_followup' },
                    { name: 'user_id', value: payload.userId },
                ],
            }),
        });

        if (!response.ok) {
            const errorData = (await response.json()) as { message?: string };
            return {
                success: false,
                channel: 'email',
                error: errorData.message || `Resend error: ${response.status}`,
            };
        }

        const result = (await response.json()) as { id: string };

        return {
            success: true,
            channel: 'email',
            externalId: result.id,
        };
    } catch (error) {
        console.error('Resend request failed:', error);
        return {
            success: false,
            channel: 'email',
            error: error instanceof Error ? error.message : 'Request failed',
        };
    }
}

/**
 * Send in-app notification via SSE
 */
async function sendInAppNotification(payload: NotificationPayload): Promise<DeliveryResult> {
    const connections = activeSSEConnections.get(payload.userId);

    if (!connections || connections.size === 0) {
        return {
            success: false,
            channel: 'in_app',
            error: 'User not connected',
        };
    }

    const ssePayload = JSON.stringify({
        type: 'pac_followup',
        title: payload.title,
        body: payload.body,
        taskId: payload.taskId,
        chatId: payload.chatId,
        data: payload.data,
        timestamp: new Date().toISOString(),
    });

    let deliveredCount = 0;
    for (const send of connections) {
        try {
            send(`data: ${ssePayload}\n\n`);
            deliveredCount++;
        } catch (error) {
            console.error('SSE send failed:', error);
        }
    }

    return {
        success: deliveredCount > 0,
        channel: 'in_app',
        error: deliveredCount === 0 ? 'All SSE connections failed' : undefined,
    };
}

// ============================================
// SSE CONNECTION MANAGEMENT
// ============================================

/**
 * Register an SSE connection for a user
 */
export function registerSSEConnection(userId: string, sendFn: (data: string) => void): () => void {
    if (!activeSSEConnections.has(userId)) {
        activeSSEConnections.set(userId, new Set());
    }

    activeSSEConnections.get(userId)!.add(sendFn);

    // Return cleanup function
    return () => {
        const connections = activeSSEConnections.get(userId);
        if (connections) {
            connections.delete(sendFn);
            if (connections.size === 0) {
                activeSSEConnections.delete(userId);
            }
        }
    };
}

/**
 * Check if a user is currently connected via SSE
 */
export function isUserConnected(userId: string): boolean {
    const connections = activeSSEConnections.get(userId);
    return connections !== undefined && connections.size > 0;
}

// ============================================
// PUSH SUBSCRIPTION MANAGEMENT
// ============================================

/**
 * Register or update a push subscription
 */
export async function registerPushSubscription(input: {
    userId: string;
    oneSignalPlayerId?: string;
    oneSignalExternalId?: string;
    endpoint?: string;
    p256dh?: string;
    auth?: string;
    platform: 'web' | 'ios' | 'android';
    deviceName?: string;
    browserName?: string;
    osVersion?: string;
}) {
    // If OneSignal player ID provided, update or create
    if (input.oneSignalPlayerId) {
        return prisma.pushSubscription.upsert({
            where: { oneSignalPlayerId: input.oneSignalPlayerId },
            update: {
                userId: input.userId,
                oneSignalExternalId: input.oneSignalExternalId,
                platform: input.platform,
                deviceName: input.deviceName,
                browserName: input.browserName,
                osVersion: input.osVersion,
                isActive: true,
                lastActiveAt: new Date(),
            },
            create: {
                userId: input.userId,
                oneSignalPlayerId: input.oneSignalPlayerId,
                oneSignalExternalId: input.oneSignalExternalId,
                platform: input.platform,
                deviceName: input.deviceName,
                browserName: input.browserName,
                osVersion: input.osVersion,
            },
        });
    }

    // Web Push API subscription
    if (input.endpoint) {
        return prisma.pushSubscription.create({
            data: {
                userId: input.userId,
                endpoint: input.endpoint,
                p256dh: input.p256dh,
                auth: input.auth,
                platform: input.platform,
                deviceName: input.deviceName,
                browserName: input.browserName,
            },
        });
    }

    throw new Error('Either oneSignalPlayerId or endpoint is required');
}

/**
 * Deactivate a push subscription
 */
export async function deactivatePushSubscription(
    userId: string,
    subscriptionId?: string,
    oneSignalPlayerId?: string
) {
    const where: Prisma.PushSubscriptionWhereInput = { userId };

    if (subscriptionId) {
        where.id = subscriptionId;
    } else if (oneSignalPlayerId) {
        where.oneSignalPlayerId = oneSignalPlayerId;
    }

    return prisma.pushSubscription.updateMany({
        where,
        data: { isActive: false },
    });
}

// ============================================
// PREFERENCE MANAGEMENT
// ============================================

/**
 * Get user's notification preferences
 */
export async function getUserNotificationPreferences(
    userId: string
): Promise<NotificationPreferences> {
    const prefs = await prisma.notificationPreferences.findUnique({
        where: { userId },
    });

    // Return defaults if not configured
    if (!prefs) {
        return {
            pushEnabled: true,
            emailEnabled: true,
            inAppEnabled: true,
            quietHoursEnabled: false,
            quietHoursTimezone: 'UTC',
            maxDailyNotifications: 10,
            minIntervalMinutes: 60,
            pacFollowupEnabled: true,
            pacEmailFallback: true,
        };
    }

    return {
        pushEnabled: prefs.pushEnabled,
        emailEnabled: prefs.emailEnabled,
        inAppEnabled: prefs.inAppEnabled,
        quietHoursEnabled: prefs.quietHoursEnabled,
        quietHoursStart: prefs.quietHoursStart || undefined,
        quietHoursEnd: prefs.quietHoursEnd || undefined,
        quietHoursTimezone: prefs.quietHoursTimezone,
        maxDailyNotifications: prefs.maxDailyNotifications,
        minIntervalMinutes: prefs.minIntervalMinutes,
        pacFollowupEnabled: prefs.pacFollowupEnabled,
        pacEmailFallback: prefs.pacEmailFallback,
    };
}

/**
 * Update user's notification preferences
 */
export async function updateNotificationPreferences(
    userId: string,
    updates: Partial<NotificationPreferences>
) {
    return prisma.notificationPreferences.upsert({
        where: { userId },
        update: updates,
        create: {
            userId,
            ...updates,
        },
    });
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Determine which channels to use based on preference
 */
function determineChannels(
    channelPref: 'auto' | 'push' | 'email' | 'in_app',
    preferences: NotificationPreferences
): NotificationChannel[] {
    switch (channelPref) {
        case 'push':
            return preferences.pushEnabled ? ['push'] : [];
        case 'email':
            return preferences.emailEnabled ? ['email'] : [];
        case 'in_app':
            return preferences.inAppEnabled ? ['in_app'] : [];
        case 'auto':
        default: {
            // Priority: in_app (if connected) > push > email
            const channels: NotificationChannel[] = [];
            if (preferences.inAppEnabled) channels.push('in_app');
            if (preferences.pushEnabled) channels.push('push');
            if (preferences.emailEnabled) channels.push('email');
            return channels;
        }
    }
}

/**
 * Check if current time is within quiet hours
 */
function isInQuietHours(preferences: NotificationPreferences): boolean {
    if (
        !preferences.quietHoursEnabled ||
        !preferences.quietHoursStart ||
        !preferences.quietHoursEnd
    ) {
        return false;
    }

    const now = new Date();

    // Convert to user's timezone
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: preferences.quietHoursTimezone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    });

    const currentTime = formatter.format(now);
    const [currentHour, currentMinute] = currentTime.split(':').map(Number);
    const currentMinutes = currentHour * 60 + currentMinute;

    const [startHour, startMinute] = preferences.quietHoursStart.split(':').map(Number);
    const startMinutes = startHour * 60 + startMinute;

    const [endHour, endMinute] = preferences.quietHoursEnd.split(':').map(Number);
    const endMinutes = endHour * 60 + endMinute;

    // Handle overnight quiet hours (e.g., 22:00 - 08:00)
    if (startMinutes > endMinutes) {
        return currentMinutes >= startMinutes || currentMinutes < endMinutes;
    }

    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
}

/**
 * Log a notification for tracking
 */
async function logNotification(input: {
    userId: string;
    taskId?: string;
    channel: string;
    status: string;
    title: string;
    body: string;
    data?: Record<string, unknown>;
    oneSignalNotificationId?: string;
    resendMessageId?: string;
    errorMessage?: string;
}) {
    return prisma.notificationLog.create({
        data: {
            userId: input.userId,
            taskId: input.taskId,
            channel: input.channel,
            status: input.status,
            title: input.title,
            body: input.body,
            data: input.data as Prisma.InputJsonValue,
            sentAt: new Date(),
            oneSignalNotificationId: input.oneSignalNotificationId,
            resendMessageId: input.resendMessageId,
            errorMessage: input.errorMessage,
        },
    });
}

// ============================================
// PAC INTEGRATION HELPERS
// ============================================

/**
 * Send a PAC follow-up notification for a scheduled task
 */
export async function sendPACFollowupNotification(
    task: ScheduledTask,
    message: string
): Promise<DeliveryResult[]> {
    return sendNotification({
        userId: task.userId,
        title: task.topic || 'Follow-up from Aspendos',
        body: message,
        taskId: task.id,
        chatId: task.chatId,
        channelPref: task.channelPref as 'auto' | 'push' | 'email' | 'in_app',
        data: {
            intent: task.intent,
            topic: task.topic,
            tone: task.tone,
        },
    });
}

/**
 * Notification Service - Multi-Channel Delivery for PAC
 *
 * Simplified implementation. Full implementation requires PushSubscription,
 * NotificationPreferences, and NotificationLog tables in Prisma schema.
 */

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
// STUB IMPLEMENTATION
// ============================================

/**
 * Send a notification to a user through the best available channel
 * Currently a stub - requires database schema for full implementation
 */
export async function sendNotification(
    payload: NotificationPayload
): Promise<DeliveryResult[]> {
    console.log('Notification queued (stub implementation):', {
        userId: payload.userId,
        title: payload.title,
        taskId: payload.taskId,
    });

    return [
        {
            success: true,
            channel: 'in_app',
            error: 'Stub implementation - full notification system requires database schema updates',
        },
    ];
}

/**
 * Get user notification preferences
 * Stub - returns defaults
 */
export async function getUserNotificationPreferences(
    _userId: string
): Promise<NotificationPreferences> {
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
 * Register push subscription
 * Stub - requires PushSubscription table
 */
export async function registerPushSubscription(
    _userId: string,
    _subscription: Record<string, unknown>
): Promise<void> {
    console.log('Push subscription registration (stub implementation)');
}

/**
 * Update notification preferences
 * Stub - requires NotificationPreferences table
 */
export async function updateNotificationPreferences(
    _userId: string,
    _preferences: Partial<NotificationPreferences>
): Promise<void> {
    console.log('Preferences update (stub implementation)');
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

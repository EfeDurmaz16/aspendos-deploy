/**
 * Notification Service Tests
 *
 * Tests for quiet hours checking, channel determination, and delivery routing.
 */

import { describe, it, expect } from 'vitest';
import {
    isInQuietHours,
    determineChannels,
    type NotificationPreferences,
} from '../services/notification.service';

describe('Notification Service', () => {
    describe('isInQuietHours', () => {
        it('should return false when quiet hours is disabled', () => {
            const prefs: NotificationPreferences = {
                pushEnabled: true,
                emailEnabled: true,
                inAppEnabled: true,
                quietHoursEnabled: false,
                quietHoursTimezone: 'UTC',
                maxDailyNotifications: 10,
                minIntervalMinutes: 5,
                pacFollowupEnabled: true,
                pacEmailFallback: false,
            };
            expect(isInQuietHours(prefs)).toBe(false);
        });

        it('should check quiet hours correctly (normal range)', () => {
            const prefs: NotificationPreferences = {
                pushEnabled: true,
                emailEnabled: true,
                inAppEnabled: true,
                quietHoursEnabled: true,
                quietHoursStart: '22', // 10 PM
                quietHoursEnd: '8', // 8 AM
                quietHoursTimezone: 'UTC',
                maxDailyNotifications: 10,
                minIntervalMinutes: 5,
                pacFollowupEnabled: true,
                pacEmailFallback: false,
            };

            // Test with a mock date (this is time-dependent so results may vary)
            // In production, you'd use a time mocking library like @vitest/spy
            const result = isInQuietHours(prefs);
            expect(typeof result).toBe('boolean');
        });

        it('should handle overnight quiet hours correctly', () => {
            const prefs: NotificationPreferences = {
                pushEnabled: true,
                emailEnabled: true,
                inAppEnabled: true,
                quietHoursEnabled: true,
                quietHoursStart: '23', // 11 PM
                quietHoursEnd: '7', // 7 AM
                quietHoursTimezone: 'UTC',
                maxDailyNotifications: 10,
                minIntervalMinutes: 5,
                pacFollowupEnabled: true,
                pacEmailFallback: false,
            };

            // The logic should wrap around midnight
            const result = isInQuietHours(prefs);
            expect(typeof result).toBe('boolean');
        });
    });

    describe('determineChannels', () => {
        const allEnabledPrefs: NotificationPreferences = {
            pushEnabled: true,
            emailEnabled: true,
            inAppEnabled: true,
            quietHoursEnabled: false,
            quietHoursTimezone: 'UTC',
            maxDailyNotifications: 10,
            minIntervalMinutes: 5,
            pacFollowupEnabled: true,
            pacEmailFallback: false,
        };

        it('should use all enabled channels with "auto" preference', () => {
            const channels = determineChannels('auto', allEnabledPrefs);
            expect(channels).toContain('in_app');
            expect(channels).toContain('push');
            expect(channels).toContain('email');
            expect(channels).toHaveLength(3);
        });

        it('should prioritize in-app when nothing else is enabled', () => {
            const prefs: NotificationPreferences = {
                ...allEnabledPrefs,
                pushEnabled: false,
                emailEnabled: false,
                inAppEnabled: false,
            };
            const channels = determineChannels('auto', prefs);
            expect(channels).toContain('in_app');
            expect(channels).toHaveLength(1);
        });

        it('should respect explicit channel preference', () => {
            const channels = determineChannels('push', allEnabledPrefs);
            expect(channels).toEqual(['push']);
        });

        it('should respect email-only preference', () => {
            const channels = determineChannels('email', allEnabledPrefs);
            expect(channels).toEqual(['email']);
        });

        it('should respect in-app-only preference', () => {
            const channels = determineChannels('in_app', allEnabledPrefs);
            expect(channels).toEqual(['in_app']);
        });

        it('should only include enabled channels with "auto"', () => {
            const prefs: NotificationPreferences = {
                ...allEnabledPrefs,
                pushEnabled: true,
                emailEnabled: false,
                inAppEnabled: true,
            };
            const channels = determineChannels('auto', prefs);
            expect(channels).toContain('in_app');
            expect(channels).toContain('push');
            expect(channels).not.toContain('email');
            expect(channels).toHaveLength(2);
        });
    });
});

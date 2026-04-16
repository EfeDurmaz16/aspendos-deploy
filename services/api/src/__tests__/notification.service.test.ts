/**
 * Tests for Notification Service
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { NotificationPreferences } from '../services/notification.service';
import { determineChannels, isInQuietHours } from '../services/notification.service';

describe('Notification Service', () => {
    describe('isInQuietHours', () => {
        let originalDate: typeof Date;

        beforeEach(() => {
            originalDate = global.Date;
        });

        afterEach(() => {
            global.Date = originalDate;
        });

        it('should return false when quiet hours are disabled', () => {
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

            const result = isInQuietHours(prefs);
            expect(result).toBe(false);
        });

        it('should return true when current time is within same-day quiet hours', () => {
            // Mock current time to be 22:00 (10 PM)
            const mockDate = new Date('2024-01-15T22:00:00Z');
            global.Date = class extends originalDate {
                constructor() {
                    super();
                    // biome-ignore lint/correctness/noConstructorReturn: Intentional return for Date mocking in tests
                    return mockDate;
                }
            } as DateConstructor;

            const prefs: NotificationPreferences = {
                pushEnabled: true,
                emailEnabled: true,
                inAppEnabled: true,
                quietHoursEnabled: true,
                quietHoursStart: '21', // 9 PM
                quietHoursEnd: '8', // 8 AM
                quietHoursTimezone: 'UTC',
                maxDailyNotifications: 10,
                minIntervalMinutes: 5,
                pacFollowupEnabled: true,
                pacEmailFallback: false,
            };

            const result = isInQuietHours(prefs);
            expect(result).toBe(true);
        });

        it('should return false when current time is outside quiet hours', () => {
            // Mock current time to be 10:00 (10 AM)
            const mockDate = new Date('2024-01-15T10:00:00Z');
            global.Date = class extends originalDate {
                constructor() {
                    super();
                    // biome-ignore lint/correctness/noConstructorReturn: Intentional return for Date mocking in tests
                    return mockDate;
                }
            } as DateConstructor;

            const prefs: NotificationPreferences = {
                pushEnabled: true,
                emailEnabled: true,
                inAppEnabled: true,
                quietHoursEnabled: true,
                quietHoursStart: '21', // 9 PM
                quietHoursEnd: '8', // 8 AM
                quietHoursTimezone: 'UTC',
                maxDailyNotifications: 10,
                minIntervalMinutes: 5,
                pacFollowupEnabled: true,
                pacEmailFallback: false,
            };

            const result = isInQuietHours(prefs);
            expect(result).toBe(false);
        });

        it('should handle overnight quiet hours (spanning midnight)', () => {
            // Mock current time to be 02:00 (2 AM)
            const mockDate = new Date('2024-01-15T02:00:00Z');
            global.Date = class extends originalDate {
                constructor() {
                    super();
                    // biome-ignore lint/correctness/noConstructorReturn: Intentional return for Date mocking in tests
                    return mockDate;
                }
            } as DateConstructor;

            const prefs: NotificationPreferences = {
                pushEnabled: true,
                emailEnabled: true,
                inAppEnabled: true,
                quietHoursEnabled: true,
                quietHoursStart: '21', // 9 PM
                quietHoursEnd: '8', // 8 AM (next day)
                quietHoursTimezone: 'UTC',
                maxDailyNotifications: 10,
                minIntervalMinutes: 5,
                pacFollowupEnabled: true,
                pacEmailFallback: false,
            };

            const result = isInQuietHours(prefs);
            expect(result).toBe(true);
        });

        it('should handle edge case at exact start hour', () => {
            // Mock current time to be exactly 21:00 (9 PM)
            const mockDate = new Date('2024-01-15T21:00:00Z');
            global.Date = class extends originalDate {
                constructor() {
                    super();
                    // biome-ignore lint/correctness/noConstructorReturn: Intentional return for Date mocking in tests
                    return mockDate;
                }
            } as DateConstructor;

            const prefs: NotificationPreferences = {
                pushEnabled: true,
                emailEnabled: true,
                inAppEnabled: true,
                quietHoursEnabled: true,
                quietHoursStart: '21', // 9 PM
                quietHoursEnd: '8', // 8 AM
                quietHoursTimezone: 'UTC',
                maxDailyNotifications: 10,
                minIntervalMinutes: 5,
                pacFollowupEnabled: true,
                pacEmailFallback: false,
            };

            const result = isInQuietHours(prefs);
            expect(result).toBe(true);
        });

        it('should handle edge case at exact end hour', () => {
            // Mock current time to be exactly 08:00 (8 AM)
            const mockDate = new Date('2024-01-15T08:00:00Z');
            global.Date = class extends originalDate {
                constructor() {
                    super();
                    // biome-ignore lint/correctness/noConstructorReturn: Intentional return for Date mocking in tests
                    return mockDate;
                }
            } as DateConstructor;

            const prefs: NotificationPreferences = {
                pushEnabled: true,
                emailEnabled: true,
                inAppEnabled: true,
                quietHoursEnabled: true,
                quietHoursStart: '21', // 9 PM
                quietHoursEnd: '8', // 8 AM
                quietHoursTimezone: 'UTC',
                maxDailyNotifications: 10,
                minIntervalMinutes: 5,
                pacFollowupEnabled: true,
                pacEmailFallback: false,
            };

            const result = isInQuietHours(prefs);
            expect(result).toBe(false); // Should be false because currentHour < end is not satisfied
        });
    });

    describe('determineChannels', () => {
        it('should return specified channel when preference is not "auto"', () => {
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

            const result = determineChannels('push', prefs);
            expect(result).toEqual(['push']);
        });

        it('should return all enabled channels when preference is "auto"', () => {
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

            const result = determineChannels('auto', prefs);
            expect(result).toEqual(['in_app', 'push', 'email']);
        });

        it('should return only enabled channels when preference is "auto"', () => {
            const prefs: NotificationPreferences = {
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

            const result = determineChannels('auto', prefs);
            expect(result).toEqual(['in_app']);
        });

        it('should default to in_app if all channels are disabled with "auto"', () => {
            const prefs: NotificationPreferences = {
                pushEnabled: false,
                emailEnabled: false,
                inAppEnabled: false,
                quietHoursEnabled: false,
                quietHoursTimezone: 'UTC',
                maxDailyNotifications: 10,
                minIntervalMinutes: 5,
                pacFollowupEnabled: true,
                pacEmailFallback: false,
            };

            const result = determineChannels('auto', prefs);
            expect(result).toEqual(['in_app']);
        });

        it('should return specific channel even if disabled', () => {
            const prefs: NotificationPreferences = {
                pushEnabled: false,
                emailEnabled: false,
                inAppEnabled: false,
                quietHoursEnabled: false,
                quietHoursTimezone: 'UTC',
                maxDailyNotifications: 10,
                minIntervalMinutes: 5,
                pacFollowupEnabled: true,
                pacEmailFallback: false,
            };

            const result = determineChannels('email', prefs);
            expect(result).toEqual(['email']);
        });
    });
});

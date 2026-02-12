/**
 * Usage Alerts System Tests
 *
 * Comprehensive test coverage for usage threshold monitoring and alert generation.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    checkAndRecordAlerts,
    checkUsageThresholds,
    clearAlerts_forTesting,
    getAlertConfig,
    getAlertHistory,
    getSystemAlertStats,
    getUserUsageSummary,
    recordUsageEvent,
    shouldSendAlert,
    type UsageMetrics,
} from '../usage-alerts';

describe('Usage Alerts System', () => {
    beforeEach(() => {
        clearAlerts_forTesting();
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-02-01T00:00:00Z'));
    });

    afterEach(() => {
        clearAlerts_forTesting();
        vi.useRealTimers();
    });

    describe('getAlertConfig', () => {
        it('should return FREE tier limits', () => {
            const config = getAlertConfig('FREE');
            expect(config.messages).toBe(100);
            expect(config.council_sessions).toBe(0);
        });

        it('should return STARTER tier limits', () => {
            const config = getAlertConfig('STARTER');
            expect(config.messages).toBe(300);
            expect(config.council_sessions).toBe(10);
        });

        it('should return PRO tier limits', () => {
            const config = getAlertConfig('PRO');
            expect(config.messages).toBe(1500);
            expect(config.council_sessions).toBe(50);
        });

        it('should return ULTRA tier limits', () => {
            const config = getAlertConfig('ULTRA');
            expect(config.messages).toBe(5000);
            expect(config.council_sessions).toBe(200);
        });

        it('should calculate voice_minutes as monthly from daily', () => {
            const config = getAlertConfig('PRO');
            expect(config.voice_minutes).toBe(60 * 30); // 60 daily * 30 days
        });
    });

    describe('checkUsageThresholds', () => {
        it('should detect no alerts when usage is low', () => {
            const usage: UsageMetrics = {
                messagesUsed: 50,
                memoriesUsed: 10,
                councilSessionsUsed: 2,
                voiceMinutesUsed: 100,
                creditsUsed: 10000,
            };

            const alerts = checkUsageThresholds('user1', 'PRO', usage);
            expect(alerts).toHaveLength(0);
        });

        it('should detect warn threshold at 75%', () => {
            const usage: UsageMetrics = {
                messagesUsed: 1125, // 75% of 1500
                memoriesUsed: 10,
                councilSessionsUsed: 2,
                voiceMinutesUsed: 100,
                creditsUsed: 10000,
            };

            const alerts = checkUsageThresholds('user1', 'PRO', usage);
            expect(alerts).toHaveLength(1);
            expect(alerts[0].metric).toBe('messages');
            expect(alerts[0].threshold).toBe('warn');
            expect(alerts[0].currentUsage).toBe(1125);
            expect(alerts[0].limit).toBe(1500);
            expect(alerts[0].percentage).toBe(0.75);
        });

        it('should detect critical threshold at 90%', () => {
            const usage: UsageMetrics = {
                messagesUsed: 1350, // 90% of 1500
                memoriesUsed: 10,
                councilSessionsUsed: 2,
                voiceMinutesUsed: 100,
                creditsUsed: 10000,
            };

            const alerts = checkUsageThresholds('user1', 'PRO', usage);
            expect(alerts).toHaveLength(1);
            expect(alerts[0].threshold).toBe('critical');
            expect(alerts[0].percentage).toBe(0.9);
        });

        it('should detect exceeded threshold at 100%', () => {
            const usage: UsageMetrics = {
                messagesUsed: 1500, // 100% of 1500
                memoriesUsed: 10,
                councilSessionsUsed: 2,
                voiceMinutesUsed: 100,
                creditsUsed: 10000,
            };

            const alerts = checkUsageThresholds('user1', 'PRO', usage);
            expect(alerts).toHaveLength(1);
            expect(alerts[0].threshold).toBe('exceeded');
            expect(alerts[0].percentage).toBe(1);
        });

        it('should detect exceeded threshold over 100%', () => {
            const usage: UsageMetrics = {
                messagesUsed: 1600, // 106% of 1500
                memoriesUsed: 10,
                councilSessionsUsed: 2,
                voiceMinutesUsed: 100,
                creditsUsed: 10000,
            };

            const alerts = checkUsageThresholds('user1', 'PRO', usage);
            expect(alerts).toHaveLength(1);
            expect(alerts[0].threshold).toBe('exceeded');
            expect(alerts[0].percentage).toBeGreaterThan(1);
        });

        it('should detect multiple metric alerts', () => {
            const usage: UsageMetrics = {
                messagesUsed: 1350, // 90% critical
                memoriesUsed: 10,
                councilSessionsUsed: 45, // 90% of 50 - critical
                voiceMinutesUsed: 100,
                creditsUsed: 10000,
            };

            const alerts = checkUsageThresholds('user1', 'PRO', usage);
            expect(alerts).toHaveLength(2);
            expect(alerts.map((a) => a.metric).sort()).toEqual(['council_sessions', 'messages']);
        });

        it('should skip metrics with zero limit', () => {
            const usage: UsageMetrics = {
                messagesUsed: 90, // 90% of 100
                memoriesUsed: 10,
                councilSessionsUsed: 5, // FREE tier has 0 limit
                voiceMinutesUsed: 10, // FREE tier has 0 limit
                creditsUsed: 10000,
            };

            const alerts = checkUsageThresholds('user1', 'FREE', usage);
            expect(alerts).toHaveLength(1);
            expect(alerts[0].metric).toBe('messages');
        });

        it('should handle edge case at exactly 74.9%', () => {
            const usage: UsageMetrics = {
                messagesUsed: 1123, // 74.86% of 1500 - below threshold
                memoriesUsed: 10,
                councilSessionsUsed: 2,
                voiceMinutesUsed: 100,
                creditsUsed: 10000,
            };

            const alerts = checkUsageThresholds('user1', 'PRO', usage);
            expect(alerts).toHaveLength(0);
        });

        it('should handle edge case at exactly 75%', () => {
            const usage: UsageMetrics = {
                messagesUsed: 1125, // Exactly 75%
                memoriesUsed: 10,
                councilSessionsUsed: 2,
                voiceMinutesUsed: 100,
                creditsUsed: 10000,
            };

            const alerts = checkUsageThresholds('user1', 'PRO', usage);
            expect(alerts).toHaveLength(1);
            expect(alerts[0].threshold).toBe('warn');
        });
    });

    describe('recordUsageEvent', () => {
        it('should record messages usage', () => {
            recordUsageEvent('user1', 'PRO', 'messages', 10);
            recordUsageEvent('user1', 'PRO', 'messages', 5);

            const summary = getUserUsageSummary('user1', 'PRO');
            expect(summary.usage.messagesUsed).toBe(15);
        });

        it('should record memories usage', () => {
            recordUsageEvent('user1', 'PRO', 'memories', 3);
            recordUsageEvent('user1', 'PRO', 'memories', 2);

            const summary = getUserUsageSummary('user1', 'PRO');
            expect(summary.usage.memoriesUsed).toBe(5);
        });

        it('should record council_sessions usage', () => {
            recordUsageEvent('user1', 'PRO', 'council_sessions', 1);
            recordUsageEvent('user1', 'PRO', 'council_sessions', 1);

            const summary = getUserUsageSummary('user1', 'PRO');
            expect(summary.usage.councilSessionsUsed).toBe(2);
        });

        it('should record voice_minutes usage', () => {
            recordUsageEvent('user1', 'PRO', 'voice_minutes', 15);
            recordUsageEvent('user1', 'PRO', 'voice_minutes', 10);

            const summary = getUserUsageSummary('user1', 'PRO');
            expect(summary.usage.voiceMinutesUsed).toBe(25);
        });

        it('should record credits usage', () => {
            recordUsageEvent('user1', 'PRO', 'credits', 1000);
            recordUsageEvent('user1', 'PRO', 'credits', 500);

            const summary = getUserUsageSummary('user1', 'PRO');
            expect(summary.usage.creditsUsed).toBe(1500);
        });

        it('should track separate users independently', () => {
            recordUsageEvent('user1', 'PRO', 'messages', 10);
            recordUsageEvent('user2', 'PRO', 'messages', 20);

            const summary1 = getUserUsageSummary('user1', 'PRO');
            const summary2 = getUserUsageSummary('user2', 'PRO');

            expect(summary1.usage.messagesUsed).toBe(10);
            expect(summary2.usage.messagesUsed).toBe(20);
        });

        it('should reset usage when billing period changes', () => {
            recordUsageEvent('user1', 'PRO', 'messages', 100);

            let summary = getUserUsageSummary('user1', 'PRO');
            expect(summary.usage.messagesUsed).toBe(100);
            expect(summary.billingPeriod).toBe('2026-02');

            // Advance to next month
            vi.setSystemTime(new Date('2026-03-01T00:00:00Z'));

            recordUsageEvent('user1', 'PRO', 'messages', 10);
            summary = getUserUsageSummary('user1', 'PRO');
            expect(summary.usage.messagesUsed).toBe(10);
            expect(summary.billingPeriod).toBe('2026-03');
        });

        it('should handle fractional amounts', () => {
            recordUsageEvent('user1', 'PRO', 'voice_minutes', 2.5);
            recordUsageEvent('user1', 'PRO', 'voice_minutes', 1.25);

            const summary = getUserUsageSummary('user1', 'PRO');
            expect(summary.usage.voiceMinutesUsed).toBe(3.75);
        });
    });

    describe('getUserUsageSummary', () => {
        it('should return usage summary with all metrics', () => {
            recordUsageEvent('user1', 'PRO', 'messages', 750);
            recordUsageEvent('user1', 'PRO', 'council_sessions', 25);

            const summary = getUserUsageSummary('user1', 'PRO');

            expect(summary.usage.messagesUsed).toBe(750);
            expect(summary.usage.councilSessionsUsed).toBe(25);
            expect(summary.limits.messages).toBe(1500);
            expect(summary.limits.council_sessions).toBe(50);
            expect(summary.percentages.messages).toBe(0.5);
            expect(summary.percentages.council_sessions).toBe(0.5);
            expect(summary.billingPeriod).toBe('2026-02');
        });

        it('should handle zero limits correctly', () => {
            recordUsageEvent('user1', 'FREE', 'council_sessions', 5);

            const summary = getUserUsageSummary('user1', 'FREE');
            expect(summary.limits.council_sessions).toBe(0);
            expect(summary.percentages.council_sessions).toBe(0);
        });

        it('should initialize to zero for new user', () => {
            const summary = getUserUsageSummary('user1', 'PRO');

            expect(summary.usage.messagesUsed).toBe(0);
            expect(summary.usage.memoriesUsed).toBe(0);
            expect(summary.usage.councilSessionsUsed).toBe(0);
            expect(summary.usage.voiceMinutesUsed).toBe(0);
            expect(summary.usage.creditsUsed).toBe(0);
        });

        it('should update tier if changed', () => {
            recordUsageEvent('user1', 'FREE', 'messages', 50);
            let summary = getUserUsageSummary('user1', 'FREE');
            expect(summary.limits.messages).toBe(100);

            // User upgrades to PRO
            summary = getUserUsageSummary('user1', 'PRO');
            expect(summary.limits.messages).toBe(1500);
            expect(summary.usage.messagesUsed).toBe(50); // Usage persists
        });
    });

    describe('shouldSendAlert', () => {
        it('should return true for first alert', () => {
            expect(shouldSendAlert('user1', 'messages', 'warn')).toBe(true);
        });

        it('should return false after alert is sent', () => {
            recordUsageEvent('user1', 'PRO', 'messages', 1125); // 75% warn

            checkAndRecordAlerts('user1', 'PRO', {
                messagesUsed: 1125,
                memoriesUsed: 0,
                councilSessionsUsed: 0,
                voiceMinutesUsed: 0,
                creditsUsed: 0,
            });

            expect(shouldSendAlert('user1', 'messages', 'warn')).toBe(false);
        });

        it('should allow different threshold levels for same metric', () => {
            checkAndRecordAlerts('user1', 'PRO', {
                messagesUsed: 1125,
                memoriesUsed: 0,
                councilSessionsUsed: 0,
                voiceMinutesUsed: 0,
                creditsUsed: 0,
            });

            expect(shouldSendAlert('user1', 'messages', 'warn')).toBe(false);
            expect(shouldSendAlert('user1', 'messages', 'critical')).toBe(true);
            expect(shouldSendAlert('user1', 'messages', 'exceeded')).toBe(true);
        });

        it('should allow different metrics independently', () => {
            checkAndRecordAlerts('user1', 'PRO', {
                messagesUsed: 1125,
                memoriesUsed: 0,
                councilSessionsUsed: 0,
                voiceMinutesUsed: 0,
                creditsUsed: 0,
            });

            expect(shouldSendAlert('user1', 'messages', 'warn')).toBe(false);
            expect(shouldSendAlert('user1', 'council_sessions', 'warn')).toBe(true);
        });

        it('should reset alerts in new billing period', () => {
            checkAndRecordAlerts('user1', 'PRO', {
                messagesUsed: 1125,
                memoriesUsed: 0,
                councilSessionsUsed: 0,
                voiceMinutesUsed: 0,
                creditsUsed: 0,
            });

            expect(shouldSendAlert('user1', 'messages', 'warn')).toBe(false);

            // Advance to next month
            vi.setSystemTime(new Date('2026-03-01T00:00:00Z'));

            // Alert should be allowed again in new period
            recordUsageEvent('user1', 'PRO', 'messages', 1); // Trigger period reset
            expect(shouldSendAlert('user1', 'messages', 'warn')).toBe(true);
        });
    });

    describe('checkAndRecordAlerts', () => {
        it('should return new alerts and record them', () => {
            const usage: UsageMetrics = {
                messagesUsed: 1125, // 75% warn
                memoriesUsed: 0,
                councilSessionsUsed: 0,
                voiceMinutesUsed: 0,
                creditsUsed: 0,
            };

            const alerts = checkAndRecordAlerts('user1', 'PRO', usage);

            expect(alerts).toHaveLength(1);
            expect(alerts[0].metric).toBe('messages');
            expect(alerts[0].threshold).toBe('warn');
        });

        it('should not return duplicate alerts', () => {
            const usage: UsageMetrics = {
                messagesUsed: 1125,
                memoriesUsed: 0,
                councilSessionsUsed: 0,
                voiceMinutesUsed: 0,
                creditsUsed: 0,
            };

            const alerts1 = checkAndRecordAlerts('user1', 'PRO', usage);
            expect(alerts1).toHaveLength(1);

            const alerts2 = checkAndRecordAlerts('user1', 'PRO', usage);
            expect(alerts2).toHaveLength(0); // Already sent
        });

        it('should return new threshold alerts as usage increases', () => {
            let usage: UsageMetrics = {
                messagesUsed: 1125, // 75% warn
                memoriesUsed: 0,
                councilSessionsUsed: 0,
                voiceMinutesUsed: 0,
                creditsUsed: 0,
            };

            const alerts1 = checkAndRecordAlerts('user1', 'PRO', usage);
            expect(alerts1).toHaveLength(1);
            expect(alerts1[0].threshold).toBe('warn');

            usage = {
                messagesUsed: 1350, // 90% critical
                memoriesUsed: 0,
                councilSessionsUsed: 0,
                voiceMinutesUsed: 0,
                creditsUsed: 0,
            };

            const alerts2 = checkAndRecordAlerts('user1', 'PRO', usage);
            expect(alerts2).toHaveLength(1);
            expect(alerts2[0].threshold).toBe('critical');
        });

        it('should handle multiple metrics crossing thresholds', () => {
            const usage: UsageMetrics = {
                messagesUsed: 1350, // 90% critical
                memoriesUsed: 0,
                councilSessionsUsed: 45, // 90% critical
                voiceMinutesUsed: 0,
                creditsUsed: 0,
            };

            const alerts = checkAndRecordAlerts('user1', 'PRO', usage);
            expect(alerts).toHaveLength(2);
            expect(alerts.map((a) => a.metric).sort()).toEqual(['council_sessions', 'messages']);
        });
    });

    describe('getAlertHistory', () => {
        it('should return alert history for user', () => {
            const usage: UsageMetrics = {
                messagesUsed: 1125,
                memoriesUsed: 0,
                councilSessionsUsed: 0,
                voiceMinutesUsed: 0,
                creditsUsed: 0,
            };

            checkAndRecordAlerts('user1', 'PRO', usage);

            const history = getAlertHistory('user1');
            expect(history).toHaveLength(1);
            expect(history[0].userId).toBe('user1');
            expect(history[0].metric).toBe('messages');
            expect(history[0].threshold).toBe('warn');
            expect(history[0].alertId).toMatch(/^alert_/);
        });

        it('should return alerts in reverse chronological order', () => {
            let usage: UsageMetrics = {
                messagesUsed: 1125, // warn
                memoriesUsed: 0,
                councilSessionsUsed: 0,
                voiceMinutesUsed: 0,
                creditsUsed: 0,
            };

            checkAndRecordAlerts('user1', 'PRO', usage);

            vi.advanceTimersByTime(1000);

            usage = {
                messagesUsed: 1350, // critical
                memoriesUsed: 0,
                councilSessionsUsed: 0,
                voiceMinutesUsed: 0,
                creditsUsed: 0,
            };

            checkAndRecordAlerts('user1', 'PRO', usage);

            const history = getAlertHistory('user1');
            expect(history).toHaveLength(2);
            expect(history[0].threshold).toBe('critical'); // Most recent
            expect(history[1].threshold).toBe('warn');
        });

        it('should limit history results', () => {
            for (let i = 0; i < 10; i++) {
                const usage: UsageMetrics = {
                    messagesUsed: 1125 + i,
                    memoriesUsed: 0,
                    councilSessionsUsed: 0,
                    voiceMinutesUsed: 0,
                    creditsUsed: 0,
                };
                checkAndRecordAlerts(`user${i}`, 'PRO', usage);
            }

            const history = getAlertHistory('user1', 5);
            expect(history.length).toBeLessThanOrEqual(5);
        });

        it('should only return alerts for specified user', () => {
            const usage: UsageMetrics = {
                messagesUsed: 1125,
                memoriesUsed: 0,
                councilSessionsUsed: 0,
                voiceMinutesUsed: 0,
                creditsUsed: 0,
            };

            checkAndRecordAlerts('user1', 'PRO', usage);
            checkAndRecordAlerts('user2', 'PRO', usage);

            const history1 = getAlertHistory('user1');
            const history2 = getAlertHistory('user2');

            expect(history1).toHaveLength(1);
            expect(history2).toHaveLength(1);
            expect(history1[0].userId).toBe('user1');
            expect(history2[0].userId).toBe('user2');
        });

        it('should return empty array for user with no alerts', () => {
            const history = getAlertHistory('user1');
            expect(history).toHaveLength(0);
        });
    });

    describe('getSystemAlertStats', () => {
        it('should return zero stats for empty system', () => {
            const stats = getSystemAlertStats();

            expect(stats.totalUsers).toBe(0);
            expect(stats.usersAtWarn).toBe(0);
            expect(stats.usersAtCritical).toBe(0);
            expect(stats.usersAtExceeded).toBe(0);
        });

        it('should count users at warn threshold', () => {
            recordUsageEvent('user1', 'PRO', 'messages', 1125); // 75% warn
            recordUsageEvent('user2', 'PRO', 'messages', 1125);

            const stats = getSystemAlertStats();
            expect(stats.usersAtWarn).toBe(2);
            expect(stats.usersAtCritical).toBe(0);
            expect(stats.usersAtExceeded).toBe(0);
        });

        it('should count users at critical threshold', () => {
            recordUsageEvent('user1', 'PRO', 'messages', 1350); // 90% critical

            const stats = getSystemAlertStats();
            expect(stats.usersAtWarn).toBe(0);
            expect(stats.usersAtCritical).toBe(1);
            expect(stats.usersAtExceeded).toBe(0);
        });

        it('should count users at exceeded threshold', () => {
            recordUsageEvent('user1', 'PRO', 'messages', 1500); // 100% exceeded

            const stats = getSystemAlertStats();
            expect(stats.usersAtWarn).toBe(0);
            expect(stats.usersAtCritical).toBe(0);
            expect(stats.usersAtExceeded).toBe(1);
        });

        it('should prioritize highest threshold for user count', () => {
            // User with both warn and critical should count as critical
            recordUsageEvent('user1', 'PRO', 'messages', 1350); // critical
            recordUsageEvent('user1', 'PRO', 'council_sessions', 38); // warn (76%)

            const stats = getSystemAlertStats();
            expect(stats.usersAtWarn).toBe(0);
            expect(stats.usersAtCritical).toBe(1);
        });

        it('should count alerts by metric', () => {
            recordUsageEvent('user1', 'PRO', 'messages', 1125); // warn
            recordUsageEvent('user2', 'PRO', 'messages', 1350); // critical
            recordUsageEvent('user3', 'PRO', 'council_sessions', 45); // critical

            const stats = getSystemAlertStats();
            expect(stats.alertsByMetric.messages.warn).toBe(1);
            expect(stats.alertsByMetric.messages.critical).toBe(1);
            expect(stats.alertsByMetric.council_sessions.critical).toBe(1);
        });

        it('should count total users with usage', () => {
            recordUsageEvent('user1', 'PRO', 'messages', 10);
            recordUsageEvent('user2', 'PRO', 'messages', 20);
            recordUsageEvent('user3', 'PRO', 'messages', 30);

            const stats = getSystemAlertStats();
            expect(stats.totalUsers).toBe(3);
        });

        it('should not count users below thresholds', () => {
            recordUsageEvent('user1', 'PRO', 'messages', 100); // Low usage
            recordUsageEvent('user2', 'PRO', 'messages', 1125); // At threshold

            const stats = getSystemAlertStats();
            expect(stats.totalUsers).toBe(2);
            expect(stats.usersAtWarn).toBe(1); // Only user2
        });
    });

    describe('billing period transitions', () => {
        it('should reset usage on period boundary', () => {
            recordUsageEvent('user1', 'PRO', 'messages', 1000);

            let summary = getUserUsageSummary('user1', 'PRO');
            expect(summary.usage.messagesUsed).toBe(1000);
            expect(summary.billingPeriod).toBe('2026-02');

            // Move to March
            vi.setSystemTime(new Date('2026-03-01T00:00:00Z'));

            // Trigger period check
            recordUsageEvent('user1', 'PRO', 'messages', 50);

            summary = getUserUsageSummary('user1', 'PRO');
            expect(summary.usage.messagesUsed).toBe(50);
            expect(summary.billingPeriod).toBe('2026-03');
        });

        it('should clear sent alerts on period boundary', () => {
            const usage: UsageMetrics = {
                messagesUsed: 1125,
                memoriesUsed: 0,
                councilSessionsUsed: 0,
                voiceMinutesUsed: 0,
                creditsUsed: 0,
            };

            checkAndRecordAlerts('user1', 'PRO', usage);
            expect(shouldSendAlert('user1', 'messages', 'warn')).toBe(false);

            // Move to next month
            vi.setSystemTime(new Date('2026-03-01T00:00:00Z'));

            // Trigger period reset by recording new usage
            recordUsageEvent('user1', 'PRO', 'messages', 1);

            // Alert should be sendable again
            expect(shouldSendAlert('user1', 'messages', 'warn')).toBe(true);
        });
    });

    describe('edge cases', () => {
        it('should handle zero usage', () => {
            const usage: UsageMetrics = {
                messagesUsed: 0,
                memoriesUsed: 0,
                councilSessionsUsed: 0,
                voiceMinutesUsed: 0,
                creditsUsed: 0,
            };

            const alerts = checkUsageThresholds('user1', 'PRO', usage);
            expect(alerts).toHaveLength(0);
        });

        it('should handle usage exceeding limit by large margin', () => {
            const usage: UsageMetrics = {
                messagesUsed: 10000, // Far over 1500 limit
                memoriesUsed: 0,
                councilSessionsUsed: 0,
                voiceMinutesUsed: 0,
                creditsUsed: 0,
            };

            const alerts = checkUsageThresholds('user1', 'PRO', usage);
            expect(alerts).toHaveLength(1);
            expect(alerts[0].threshold).toBe('exceeded');
            expect(alerts[0].percentage).toBeGreaterThan(6);
        });

        it('should handle multiple users with same tier', () => {
            recordUsageEvent('user1', 'PRO', 'messages', 1125);
            recordUsageEvent('user2', 'PRO', 'messages', 1350);
            recordUsageEvent('user3', 'PRO', 'messages', 1500);

            const stats = getSystemAlertStats();
            expect(stats.totalUsers).toBe(3);
            expect(stats.usersAtWarn).toBe(1);
            expect(stats.usersAtCritical).toBe(1);
            expect(stats.usersAtExceeded).toBe(1);
        });

        it('should handle mixed tier users', () => {
            recordUsageEvent('user1', 'FREE', 'messages', 75); // 75% warn
            recordUsageEvent('user2', 'PRO', 'messages', 1350); // 90% critical

            const stats = getSystemAlertStats();
            expect(stats.usersAtWarn).toBe(1);
            expect(stats.usersAtCritical).toBe(1);
        });
    });
});

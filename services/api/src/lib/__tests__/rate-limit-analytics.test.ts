/**
 * Rate Limit Analytics Tests
 *
 * Comprehensive test suite for rate limit analytics system.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import {
    getNearLimitEvents,
    getRateLimitDashboard,
    getUserRateLimitHistory,
    rateLimitAnalytics,
    recordRateLimitEvent,
} from '../rate-limit-analytics';

describe('Rate Limit Analytics', () => {
    beforeEach(() => {
        // Clear all events before each test
        rateLimitAnalytics.clear();
    });

    describe('recordRateLimitEvent', () => {
        it('should record a rate limit event', () => {
            recordRateLimitEvent('user-1', 'FREE', '/api/chat', false, 90, 100);

            expect(rateLimitAnalytics.getEventCount()).toBe(1);
        });

        it('should record multiple events', () => {
            recordRateLimitEvent('user-1', 'FREE', '/api/chat', false, 90, 100);
            recordRateLimitEvent('user-1', 'FREE', '/api/chat', false, 89, 100);
            recordRateLimitEvent('user-2', 'PRO', '/api/council', true, 0, 50);

            expect(rateLimitAnalytics.getEventCount()).toBe(3);
        });

        it('should track limited vs non-limited events', () => {
            recordRateLimitEvent('user-1', 'FREE', '/api/chat', false);
            recordRateLimitEvent('user-1', 'FREE', '/api/chat', true);
            recordRateLimitEvent('user-1', 'FREE', '/api/chat', false);

            const dashboard = getRateLimitDashboard();
            expect(dashboard.summary.totalEvents).toBe(3);
            expect(dashboard.summary.totalLimited).toBe(1);
        });

        it('should handle events without quota information', () => {
            recordRateLimitEvent('user-1', 'FREE', '/api/chat', false);

            const history = getUserRateLimitHistory('user-1');
            expect(history).toHaveLength(1);
            expect(history[0].remainingQuota).toBeUndefined();
            expect(history[0].quotaLimit).toBeUndefined();
        });
    });

    describe('getRateLimitDashboard', () => {
        it('should return empty dashboard when no events', () => {
            const dashboard = getRateLimitDashboard();

            expect(dashboard.topConsumers).toHaveLength(0);
            expect(dashboard.hotEndpoints).toHaveLength(0);
            expect(dashboard.tierBreakdown).toHaveLength(0);
            expect(dashboard.rejectionsPerHour).toHaveLength(0);
            expect(dashboard.summary.totalEvents).toBe(0);
            expect(dashboard.summary.totalLimited).toBe(0);
        });

        it('should return top consumers ranked by total requests', () => {
            recordRateLimitEvent('user-1', 'FREE', '/api/chat', false);
            recordRateLimitEvent('user-1', 'FREE', '/api/chat', false);
            recordRateLimitEvent('user-1', 'FREE', '/api/chat', false);
            recordRateLimitEvent('user-2', 'PRO', '/api/council', false);
            recordRateLimitEvent('user-2', 'PRO', '/api/council', false);
            recordRateLimitEvent('user-3', 'STARTER', '/api/memory', true);

            const dashboard = getRateLimitDashboard();

            expect(dashboard.topConsumers).toHaveLength(3);
            expect(dashboard.topConsumers[0].userId).toBe('user-1');
            expect(dashboard.topConsumers[0].totalRequests).toBe(3);
            expect(dashboard.topConsumers[1].userId).toBe('user-2');
            expect(dashboard.topConsumers[1].totalRequests).toBe(2);
            expect(dashboard.topConsumers[2].userId).toBe('user-3');
            expect(dashboard.topConsumers[2].totalRequests).toBe(1);
        });

        it('should calculate limit rate correctly', () => {
            recordRateLimitEvent('user-1', 'FREE', '/api/chat', false);
            recordRateLimitEvent('user-1', 'FREE', '/api/chat', false);
            recordRateLimitEvent('user-1', 'FREE', '/api/chat', true);
            recordRateLimitEvent('user-1', 'FREE', '/api/chat', true);

            const dashboard = getRateLimitDashboard();

            expect(dashboard.topConsumers[0].totalRequests).toBe(4);
            expect(dashboard.topConsumers[0].limitedRequests).toBe(2);
            expect(dashboard.topConsumers[0].limitRate).toBe(50); // 2/4 * 100 = 50%
        });

        it('should return hot endpoints ranked by requests', () => {
            recordRateLimitEvent('user-1', 'FREE', '/api/chat', false);
            recordRateLimitEvent('user-2', 'FREE', '/api/chat', false);
            recordRateLimitEvent('user-3', 'FREE', '/api/chat', false);
            recordRateLimitEvent('user-1', 'PRO', '/api/council', true);
            recordRateLimitEvent('user-2', 'PRO', '/api/council', false);

            const dashboard = getRateLimitDashboard();

            expect(dashboard.hotEndpoints).toHaveLength(2);
            expect(dashboard.hotEndpoints[0].endpoint).toBe('/api/chat');
            expect(dashboard.hotEndpoints[0].totalRequests).toBe(3);
            expect(dashboard.hotEndpoints[0].uniqueUsers).toBe(3);
            expect(dashboard.hotEndpoints[1].endpoint).toBe('/api/council');
            expect(dashboard.hotEndpoints[1].totalRequests).toBe(2);
            expect(dashboard.hotEndpoints[1].uniqueUsers).toBe(2);
        });

        it('should limit top consumers to 20', () => {
            // Create 25 users
            for (let i = 1; i <= 25; i++) {
                recordRateLimitEvent(`user-${i}`, 'FREE', '/api/chat', false);
            }

            const dashboard = getRateLimitDashboard();
            expect(dashboard.topConsumers).toHaveLength(20);
        });

        it('should limit hot endpoints to 20', () => {
            // Create 25 endpoints
            for (let i = 1; i <= 25; i++) {
                recordRateLimitEvent('user-1', 'FREE', `/api/endpoint-${i}`, false);
            }

            const dashboard = getRateLimitDashboard();
            expect(dashboard.hotEndpoints).toHaveLength(20);
        });

        it('should return tier breakdown', () => {
            recordRateLimitEvent('user-1', 'FREE', '/api/chat', false);
            recordRateLimitEvent('user-2', 'FREE', '/api/chat', true);
            recordRateLimitEvent('user-3', 'PRO', '/api/council', false);
            recordRateLimitEvent('user-4', 'PRO', '/api/council', false);
            recordRateLimitEvent('user-5', 'PRO', '/api/council', true);
            recordRateLimitEvent('user-6', 'STARTER', '/api/memory', false);

            const dashboard = getRateLimitDashboard();

            expect(dashboard.tierBreakdown).toHaveLength(3);

            const proTier = dashboard.tierBreakdown.find((t) => t.tier === 'PRO');
            expect(proTier?.totalRequests).toBe(3);
            expect(proTier?.limitedRequests).toBe(1);
            expect(proTier?.limitRate).toBeCloseTo(33.33, 1);

            const freeTier = dashboard.tierBreakdown.find((t) => t.tier === 'FREE');
            expect(freeTier?.totalRequests).toBe(2);
            expect(freeTier?.limitedRequests).toBe(1);
            expect(freeTier?.limitRate).toBe(50);
        });

        it('should return rejections per hour', () => {
            const now = Date.now();
            const oneHourAgo = now - 60 * 60 * 1000;
            const twoHoursAgo = now - 2 * 60 * 60 * 1000;

            recordRateLimitEvent(
                'user-1',
                'FREE',
                '/api/chat',
                false,
                undefined,
                undefined,
                twoHoursAgo
            );
            recordRateLimitEvent(
                'user-1',
                'FREE',
                '/api/chat',
                true,
                undefined,
                undefined,
                twoHoursAgo
            );
            recordRateLimitEvent(
                'user-2',
                'PRO',
                '/api/council',
                false,
                undefined,
                undefined,
                oneHourAgo
            );
            recordRateLimitEvent(
                'user-2',
                'PRO',
                '/api/council',
                true,
                undefined,
                undefined,
                oneHourAgo
            );
            recordRateLimitEvent(
                'user-2',
                'PRO',
                '/api/council',
                false,
                undefined,
                undefined,
                oneHourAgo
            );
            recordRateLimitEvent('user-3', 'FREE', '/api/memory', true, undefined, undefined, now);
            recordRateLimitEvent('user-3', 'FREE', '/api/memory', false, undefined, undefined, now);

            const dashboard = getRateLimitDashboard();

            expect(dashboard.rejectionsPerHour.length).toBeGreaterThan(0);

            // Each hour should have correct counts
            const hourBuckets = dashboard.rejectionsPerHour;
            const totalRequests = hourBuckets.reduce((sum, h) => sum + h.totalRequests, 0);
            const totalLimited = hourBuckets.reduce((sum, h) => sum + h.limitedRequests, 0);

            expect(totalRequests).toBe(7);
            expect(totalLimited).toBe(3);
        });

        it('should track near-limit requests in hourly buckets', () => {
            recordRateLimitEvent('user-1', 'FREE', '/api/chat', false, 15, 100); // 85% usage
            recordRateLimitEvent('user-2', 'FREE', '/api/chat', false, 50, 100); // 50% usage
            recordRateLimitEvent('user-3', 'FREE', '/api/chat', false, 5, 100); // 95% usage

            const dashboard = getRateLimitDashboard();

            expect(dashboard.rejectionsPerHour).toHaveLength(1);
            expect(dashboard.rejectionsPerHour[0].nearLimitRequests).toBe(2); // 85% and 95%
        });

        it('should calculate overall limit rate', () => {
            recordRateLimitEvent('user-1', 'FREE', '/api/chat', false);
            recordRateLimitEvent('user-1', 'FREE', '/api/chat', false);
            recordRateLimitEvent('user-1', 'FREE', '/api/chat', true);

            const dashboard = getRateLimitDashboard();

            expect(dashboard.summary.overallLimitRate).toBeCloseTo(33.33, 1);
        });
    });

    describe('getUserRateLimitHistory', () => {
        it('should return empty array for user with no events', () => {
            const history = getUserRateLimitHistory('user-1');
            expect(history).toHaveLength(0);
        });

        it('should return events for specific user only', () => {
            recordRateLimitEvent('user-1', 'FREE', '/api/chat', false);
            recordRateLimitEvent('user-1', 'FREE', '/api/council', true);
            recordRateLimitEvent('user-2', 'PRO', '/api/memory', false);

            const history = getUserRateLimitHistory('user-1');

            expect(history).toHaveLength(2);
            expect(
                history.every((e) => e.endpoint === '/api/chat' || e.endpoint === '/api/council')
            ).toBe(true);
        });

        it('should return events in reverse chronological order', () => {
            const now = Date.now();
            recordRateLimitEvent(
                'user-1',
                'FREE',
                '/api/chat',
                false,
                undefined,
                undefined,
                now - 2000
            );
            recordRateLimitEvent(
                'user-1',
                'FREE',
                '/api/council',
                false,
                undefined,
                undefined,
                now - 1000
            );
            recordRateLimitEvent('user-1', 'FREE', '/api/memory', false, undefined, undefined, now);

            const history = getUserRateLimitHistory('user-1');

            expect(history).toHaveLength(3);
            expect(history[0].endpoint).toBe('/api/memory'); // Most recent
            expect(history[2].endpoint).toBe('/api/chat'); // Oldest
        });

        it('should respect limit parameter', () => {
            for (let i = 0; i < 10; i++) {
                recordRateLimitEvent('user-1', 'FREE', '/api/chat', false);
            }

            const history = getUserRateLimitHistory('user-1', 5);
            expect(history).toHaveLength(5);
        });

        it('should include quota information when available', () => {
            recordRateLimitEvent('user-1', 'FREE', '/api/chat', false, 80, 100);

            const history = getUserRateLimitHistory('user-1');

            expect(history[0].remainingQuota).toBe(80);
            expect(history[0].quotaLimit).toBe(100);
        });

        it('should format timestamps as ISO strings', () => {
            recordRateLimitEvent('user-1', 'FREE', '/api/chat', false);

            const history = getUserRateLimitHistory('user-1');

            expect(history[0].timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
        });
    });

    describe('getNearLimitEvents', () => {
        it('should return empty array when no near-limit events', () => {
            recordRateLimitEvent('user-1', 'FREE', '/api/chat', false, 90, 100); // 10% usage

            const nearLimits = getNearLimitEvents();
            expect(nearLimits).toHaveLength(0);
        });

        it('should return events at 80%+ usage by default', () => {
            recordRateLimitEvent('user-1', 'FREE', '/api/chat', false, 20, 100); // 80% usage
            recordRateLimitEvent('user-2', 'FREE', '/api/chat', false, 10, 100); // 90% usage
            recordRateLimitEvent('user-3', 'FREE', '/api/chat', false, 50, 100); // 50% usage

            const nearLimits = getNearLimitEvents();

            expect(nearLimits).toHaveLength(2);
            expect(nearLimits.some((e) => e.userId === 'user-1')).toBe(true);
            expect(nearLimits.some((e) => e.userId === 'user-2')).toBe(true);
        });

        it('should respect custom threshold parameter', () => {
            recordRateLimitEvent('user-1', 'FREE', '/api/chat', false, 40, 100); // 60% usage
            recordRateLimitEvent('user-2', 'FREE', '/api/chat', false, 10, 100); // 90% usage

            const nearLimits = getNearLimitEvents(50);

            expect(nearLimits).toHaveLength(2);
        });

        it('should calculate usage percent correctly', () => {
            recordRateLimitEvent('user-1', 'FREE', '/api/chat', false, 5, 100); // 95% usage

            const nearLimits = getNearLimitEvents();

            expect(nearLimits).toHaveLength(1);
            expect(nearLimits[0].usagePercent).toBe(95);
            expect(nearLimits[0].remainingQuota).toBe(5);
        });

        it('should exclude events without quota information', () => {
            recordRateLimitEvent('user-1', 'FREE', '/api/chat', false); // No quota info
            recordRateLimitEvent('user-2', 'FREE', '/api/chat', false, 10, 100); // 90% usage

            const nearLimits = getNearLimitEvents();

            expect(nearLimits).toHaveLength(1);
            expect(nearLimits[0].userId).toBe('user-2');
        });

        it('should limit results to 100', () => {
            for (let i = 0; i < 150; i++) {
                recordRateLimitEvent(`user-${i}`, 'FREE', '/api/chat', false, 5, 100);
            }

            const nearLimits = getNearLimitEvents();
            expect(nearLimits).toHaveLength(100);
        });

        it('should return events in reverse chronological order', () => {
            const now = Date.now();
            recordRateLimitEvent('user-1', 'FREE', '/api/chat', false, 10, 100, now - 1000);
            recordRateLimitEvent('user-2', 'FREE', '/api/council', false, 5, 100, now);

            const nearLimits = getNearLimitEvents();

            expect(nearLimits[0].userId).toBe('user-2'); // Most recent
            expect(nearLimits[1].userId).toBe('user-1'); // Older
        });
    });

    describe('cleanup', () => {
        it('should remove events older than 24 hours', async () => {
            const now = Date.now();
            const oneDayAgo = now - 24 * 60 * 60 * 1000 - 1000; // 24 hours + 1 second ago

            recordRateLimitEvent(
                'user-old',
                'FREE',
                '/api/chat',
                false,
                undefined,
                undefined,
                oneDayAgo
            ); // Old event
            recordRateLimitEvent(
                'user-recent',
                'FREE',
                '/api/chat',
                false,
                undefined,
                undefined,
                now
            ); // Recent event

            expect(rateLimitAnalytics.getEventCount()).toBe(2);

            // Trigger cleanup by adding many events
            for (let i = 0; i < 100001; i++) {
                recordRateLimitEvent(`user-${i}`, 'FREE', '/api/chat', false);
            }

            // Old event should be cleaned up, recent event should remain
            const dashboard = getRateLimitDashboard();
            const hasOldEvent = dashboard.topConsumers.some((c) => c.userId === 'user-old');
            const hasRecentEvent = dashboard.topConsumers.some((c) => c.userId === 'user-recent');

            expect(hasOldEvent).toBe(false);
            expect(hasRecentEvent).toBe(true);
        });

        it('should not remove events within 24 hours', () => {
            recordRateLimitEvent('user-1', 'FREE', '/api/chat', false);
            recordRateLimitEvent('user-2', 'FREE', '/api/chat', false);

            expect(rateLimitAnalytics.getEventCount()).toBe(2);

            // Events are recent, should not be cleaned
            const dashboard = getRateLimitDashboard();
            expect(dashboard.summary.totalEvents).toBe(2);
        });
    });

    describe('edge cases', () => {
        it('should handle zero quota limit gracefully', () => {
            recordRateLimitEvent('user-1', 'FREE', '/api/chat', false, 0, 0);

            const nearLimits = getNearLimitEvents();
            expect(nearLimits).toHaveLength(0); // Should not crash or include invalid data
        });

        it('should handle very large number of events', () => {
            for (let i = 0; i < 10000; i++) {
                recordRateLimitEvent(
                    `user-${i % 100}`,
                    'FREE',
                    `/api/endpoint-${i % 10}`,
                    i % 5 === 0
                );
            }

            const dashboard = getRateLimitDashboard();

            expect(dashboard.summary.totalEvents).toBe(10000);
            expect(dashboard.topConsumers.length).toBeLessThanOrEqual(20);
            expect(dashboard.hotEndpoints.length).toBeLessThanOrEqual(20);
        });

        it('should handle multiple tiers correctly', () => {
            recordRateLimitEvent('user-1', 'FREE', '/api/chat', false);
            recordRateLimitEvent('user-2', 'STARTER', '/api/chat', false);
            recordRateLimitEvent('user-3', 'PRO', '/api/chat', false);
            recordRateLimitEvent('user-4', 'ULTRA', '/api/chat', false);

            const dashboard = getRateLimitDashboard();

            expect(dashboard.tierBreakdown).toHaveLength(4);
            expect(dashboard.tierBreakdown.map((t) => t.tier).sort()).toEqual([
                'FREE',
                'PRO',
                'STARTER',
                'ULTRA',
            ]);
        });
    });
});

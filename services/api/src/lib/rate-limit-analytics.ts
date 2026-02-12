/**
 * Rate Limit Analytics
 *
 * Tracks rate limit events, near-limits, rejections, and provides dashboard data.
 * In-memory storage with 24-hour retention and automatic cleanup.
 */

export interface RateLimitEvent {
    userId: string;
    tier: 'FREE' | 'STARTER' | 'PRO' | 'ULTRA';
    endpoint: string;
    timestamp: number;
    wasLimited: boolean;
    remainingQuota?: number;
    quotaLimit?: number;
}

interface UserConsumption {
    userId: string;
    tier: 'FREE' | 'STARTER' | 'PRO' | 'ULTRA';
    totalRequests: number;
    limitedRequests: number;
    endpoints: Map<string, { requests: number; limited: number }>;
}

interface EndpointStats {
    endpoint: string;
    totalRequests: number;
    limitedRequests: number;
    uniqueUsers: Set<string>;
}

interface HourlyBucket {
    hour: number; // Unix timestamp rounded to hour
    totalRequests: number;
    limitedRequests: number;
    nearLimitRequests: number; // 80%+ usage
}

class RateLimitAnalytics {
    private events: RateLimitEvent[] = [];
    private readonly retentionMs = 24 * 60 * 60 * 1000; // 24 hours
    private cleanupIntervalId?: NodeJS.Timeout;

    constructor() {
        // Auto-cleanup every hour
        this.cleanupIntervalId = setInterval(
            () => {
                this.cleanup();
            },
            60 * 60 * 1000
        );
    }

    /**
     * Record a rate limit event
     */
    recordRateLimitEvent(
        userId: string,
        tier: 'FREE' | 'STARTER' | 'PRO' | 'ULTRA',
        endpoint: string,
        wasLimited: boolean,
        remainingQuota?: number,
        quotaLimit?: number,
        timestamp?: number
    ): void {
        const event: RateLimitEvent = {
            userId,
            tier,
            endpoint,
            timestamp: timestamp ?? Date.now(),
            wasLimited,
            remainingQuota,
            quotaLimit,
        };

        this.events.push(event);

        // Inline cleanup if events grow too large (prevent memory leak)
        if (this.events.length > 100000) {
            this.cleanup();
        }
    }

    /**
     * Clean up events older than retention period
     */
    private cleanup(): void {
        const cutoff = Date.now() - this.retentionMs;
        const before = this.events.length;
        this.events = this.events.filter((e) => e.timestamp >= cutoff);
        const removed = before - this.events.length;
        if (removed > 0) {
            console.log(`[RateLimitAnalytics] Cleaned up ${removed} old events`);
        }
    }

    /**
     * Get comprehensive rate limit dashboard data
     */
    getRateLimitDashboard(): {
        topConsumers: Array<{
            userId: string;
            tier: string;
            totalRequests: number;
            limitedRequests: number;
            limitRate: number;
        }>;
        hotEndpoints: Array<{
            endpoint: string;
            totalRequests: number;
            limitedRequests: number;
            uniqueUsers: number;
            limitRate: number;
        }>;
        tierBreakdown: Array<{
            tier: string;
            totalRequests: number;
            limitedRequests: number;
            limitRate: number;
        }>;
        rejectionsPerHour: Array<{
            hour: string;
            totalRequests: number;
            limitedRequests: number;
            nearLimitRequests: number;
        }>;
        summary: {
            totalEvents: number;
            totalLimited: number;
            overallLimitRate: number;
            last24Hours: number;
        };
    } {
        // Top consumers
        const userMap = new Map<string, UserConsumption>();
        for (const event of this.events) {
            let user = userMap.get(event.userId);
            if (!user) {
                user = {
                    userId: event.userId,
                    tier: event.tier,
                    totalRequests: 0,
                    limitedRequests: 0,
                    endpoints: new Map(),
                };
                userMap.set(event.userId, user);
            }
            user.totalRequests++;
            if (event.wasLimited) {
                user.limitedRequests++;
            }

            // Track per-endpoint stats for this user
            const endpointKey = event.endpoint;
            const endpointStats = user.endpoints.get(endpointKey) || { requests: 0, limited: 0 };
            endpointStats.requests++;
            if (event.wasLimited) {
                endpointStats.limited++;
            }
            user.endpoints.set(endpointKey, endpointStats);
        }

        const topConsumers = Array.from(userMap.values())
            .map((u) => ({
                userId: u.userId,
                tier: u.tier,
                totalRequests: u.totalRequests,
                limitedRequests: u.limitedRequests,
                limitRate: u.totalRequests > 0 ? (u.limitedRequests / u.totalRequests) * 100 : 0,
            }))
            .sort((a, b) => b.totalRequests - a.totalRequests)
            .slice(0, 20);

        // Hot endpoints
        const endpointMap = new Map<string, EndpointStats>();
        for (const event of this.events) {
            let endpoint = endpointMap.get(event.endpoint);
            if (!endpoint) {
                endpoint = {
                    endpoint: event.endpoint,
                    totalRequests: 0,
                    limitedRequests: 0,
                    uniqueUsers: new Set(),
                };
                endpointMap.set(event.endpoint, endpoint);
            }
            endpoint.totalRequests++;
            if (event.wasLimited) {
                endpoint.limitedRequests++;
            }
            endpoint.uniqueUsers.add(event.userId);
        }

        const hotEndpoints = Array.from(endpointMap.values())
            .map((e) => ({
                endpoint: e.endpoint,
                totalRequests: e.totalRequests,
                limitedRequests: e.limitedRequests,
                uniqueUsers: e.uniqueUsers.size,
                limitRate: e.totalRequests > 0 ? (e.limitedRequests / e.totalRequests) * 100 : 0,
            }))
            .sort((a, b) => b.totalRequests - a.totalRequests)
            .slice(0, 20);

        // Tier breakdown
        const tierMap = new Map<string, { total: number; limited: number }>();
        for (const event of this.events) {
            const tier = event.tier;
            const stats = tierMap.get(tier) || { total: 0, limited: 0 };
            stats.total++;
            if (event.wasLimited) {
                stats.limited++;
            }
            tierMap.set(tier, stats);
        }

        const tierBreakdown = Array.from(tierMap.entries())
            .map(([tier, stats]) => ({
                tier,
                totalRequests: stats.total,
                limitedRequests: stats.limited,
                limitRate: stats.total > 0 ? (stats.limited / stats.total) * 100 : 0,
            }))
            .sort((a, b) => b.totalRequests - a.totalRequests);

        // Rejections per hour
        const hourlyMap = new Map<number, HourlyBucket>();
        for (const event of this.events) {
            const hour = Math.floor(event.timestamp / (60 * 60 * 1000)) * (60 * 60 * 1000);
            const bucket = hourlyMap.get(hour) || {
                hour,
                totalRequests: 0,
                limitedRequests: 0,
                nearLimitRequests: 0,
            };
            bucket.totalRequests++;
            if (event.wasLimited) {
                bucket.limitedRequests++;
            }

            // Check if near limit (80%+ usage)
            if (
                event.remainingQuota !== undefined &&
                event.quotaLimit !== undefined &&
                event.quotaLimit > 0
            ) {
                const usagePercent =
                    ((event.quotaLimit - event.remainingQuota) / event.quotaLimit) * 100;
                if (usagePercent >= 80) {
                    bucket.nearLimitRequests++;
                }
            }

            hourlyMap.set(hour, bucket);
        }

        const rejectionsPerHour = Array.from(hourlyMap.values())
            .map((b) => ({
                hour: new Date(b.hour).toISOString(),
                totalRequests: b.totalRequests,
                limitedRequests: b.limitedRequests,
                nearLimitRequests: b.nearLimitRequests,
            }))
            .sort((a, b) => a.hour.localeCompare(b.hour));

        // Summary
        const totalEvents = this.events.length;
        const totalLimited = this.events.filter((e) => e.wasLimited).length;
        const overallLimitRate = totalEvents > 0 ? (totalLimited / totalEvents) * 100 : 0;

        return {
            topConsumers,
            hotEndpoints,
            tierBreakdown,
            rejectionsPerHour,
            summary: {
                totalEvents,
                totalLimited,
                overallLimitRate,
                last24Hours: totalEvents,
            },
        };
    }

    /**
     * Get rate limit history for a specific user
     */
    getUserRateLimitHistory(
        userId: string,
        limit = 100
    ): Array<{
        endpoint: string;
        timestamp: string;
        wasLimited: boolean;
        remainingQuota?: number;
        quotaLimit?: number;
    }> {
        return this.events
            .filter((e) => e.userId === userId)
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, limit)
            .map((e) => ({
                endpoint: e.endpoint,
                timestamp: new Date(e.timestamp).toISOString(),
                wasLimited: e.wasLimited,
                remainingQuota: e.remainingQuota,
                quotaLimit: e.quotaLimit,
            }));
    }

    /**
     * Get near-limit events (users approaching their quota)
     */
    getNearLimitEvents(thresholdPercent = 80): Array<{
        userId: string;
        tier: string;
        endpoint: string;
        timestamp: string;
        usagePercent: number;
        remainingQuota: number;
    }> {
        return this.events
            .filter((e) => {
                if (
                    e.remainingQuota === undefined ||
                    e.quotaLimit === undefined ||
                    e.quotaLimit === 0
                ) {
                    return false;
                }
                const usagePercent = ((e.quotaLimit - e.remainingQuota) / e.quotaLimit) * 100;
                return usagePercent >= thresholdPercent;
            })
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, 100)
            .map((e) => {
                const usagePercent =
                    e.quotaLimit && e.remainingQuota !== undefined
                        ? ((e.quotaLimit - e.remainingQuota) / e.quotaLimit) * 100
                        : 0;
                return {
                    userId: e.userId,
                    tier: e.tier,
                    endpoint: e.endpoint,
                    timestamp: new Date(e.timestamp).toISOString(),
                    usagePercent,
                    remainingQuota: e.remainingQuota || 0,
                };
            });
    }

    /**
     * Clear all events (for testing)
     */
    clear(): void {
        this.events = [];
    }

    /**
     * Stop cleanup interval (for graceful shutdown)
     */
    destroy(): void {
        if (this.cleanupIntervalId) {
            clearInterval(this.cleanupIntervalId);
            this.cleanupIntervalId = undefined;
        }
    }

    /**
     * Get event count (for testing/debugging)
     */
    getEventCount(): number {
        return this.events.length;
    }
}

// Singleton instance
export const rateLimitAnalytics = new RateLimitAnalytics();

// Export function to record events
export function recordRateLimitEvent(
    userId: string,
    tier: 'FREE' | 'STARTER' | 'PRO' | 'ULTRA',
    endpoint: string,
    wasLimited: boolean,
    remainingQuota?: number,
    quotaLimit?: number,
    timestamp?: number
): void {
    rateLimitAnalytics.recordRateLimitEvent(
        userId,
        tier,
        endpoint,
        wasLimited,
        remainingQuota,
        quotaLimit,
        timestamp
    );
}

// Export function to get dashboard
export function getRateLimitDashboard() {
    return rateLimitAnalytics.getRateLimitDashboard();
}

// Export function to get user history
export function getUserRateLimitHistory(userId: string, limit?: number) {
    return rateLimitAnalytics.getUserRateLimitHistory(userId, limit);
}

// Export function to get near-limit events
export function getNearLimitEvents(thresholdPercent?: number) {
    return rateLimitAnalytics.getNearLimitEvents(thresholdPercent);
}

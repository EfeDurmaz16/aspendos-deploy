/**
 * Usage Alert System - Notify users when approaching tier limits
 *
 * Tracks per-user usage across all metrics (messages, memories, council sessions, voice, credits)
 * and generates alerts at threshold levels (75% warn, 90% critical, 100% exceeded).
 *
 * Features:
 * - Automatic threshold detection
 * - Alert deduplication (one alert per threshold per metric per period)
 * - Billing period auto-reset
 * - Usage tracking for all tier-limited metrics
 */

import { getLimit, type TierName } from '../config/tiers';

export interface UsageMetrics {
    messagesUsed: number;
    memoriesUsed: number;
    councilSessionsUsed: number;
    voiceMinutesUsed: number;
    creditsUsed: number;
}

export type MetricName = 'messages' | 'memories' | 'council_sessions' | 'voice_minutes' | 'credits';
export type ThresholdLevel = 'warn' | 'critical' | 'exceeded';

export interface UsageAlert {
    metric: MetricName;
    threshold: ThresholdLevel;
    currentUsage: number;
    limit: number;
    percentage: number;
}

export interface AlertRecord {
    alertId: string;
    userId: string;
    metric: MetricName;
    threshold: ThresholdLevel;
    currentUsage: number;
    limit: number;
    percentage: number;
    timestamp: Date;
    billingPeriod: string;
}

interface UserUsage {
    userId: string;
    tier: TierName;
    billingPeriod: string;
    metrics: UsageMetrics;
}

interface AlertSent {
    userId: string;
    metric: MetricName;
    threshold: ThresholdLevel;
    billingPeriod: string;
}

export interface SystemAlertStats {
    totalUsers: number;
    usersAtWarn: number;
    usersAtCritical: number;
    usersAtExceeded: number;
    alertsByMetric: Record<MetricName, { warn: number; critical: number; exceeded: number }>;
}

// In-memory storage
const userUsageMap = new Map<string, UserUsage>();
const alertHistory: AlertRecord[] = [];
const alertsSentMap = new Map<string, AlertSent>();

// Threshold percentages
const THRESHOLD_WARN = 0.75; // 75%
const THRESHOLD_CRITICAL = 0.9; // 90%
const THRESHOLD_EXCEEDED = 1.0; // 100%

function generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function getCurrentBillingPeriod(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function getAlertKey(userId: string, metric: MetricName, threshold: ThresholdLevel): string {
    return `${userId}:${metric}:${threshold}:${getCurrentBillingPeriod()}`;
}

function ensureUserUsage(userId: string, tier: TierName): UserUsage {
    const currentPeriod = getCurrentBillingPeriod();
    let usage = userUsageMap.get(userId);

    // Reset if billing period changed
    if (!usage || usage.billingPeriod !== currentPeriod) {
        usage = {
            userId,
            tier,
            billingPeriod: currentPeriod,
            metrics: {
                messagesUsed: 0,
                memoriesUsed: 0,
                councilSessionsUsed: 0,
                voiceMinutesUsed: 0,
                creditsUsed: 0,
            },
        };
        userUsageMap.set(userId, usage);

        // Clear alert tracking for new period
        const keysToDelete: string[] = [];
        for (const key of alertsSentMap.keys()) {
            if (key.startsWith(`${userId}:`)) {
                keysToDelete.push(key);
            }
        }
        for (const key of keysToDelete) {
            alertsSentMap.delete(key);
        }
    }

    // Update tier if changed
    if (usage.tier !== tier) {
        usage.tier = tier;
    }

    return usage;
}

function getThresholdLevel(percentage: number): ThresholdLevel | null {
    if (percentage >= THRESHOLD_EXCEEDED) return 'exceeded';
    if (percentage >= THRESHOLD_CRITICAL) return 'critical';
    if (percentage >= THRESHOLD_WARN) return 'warn';
    return null;
}

function _mapMetricToConfigKey(metric: MetricName): string {
    switch (metric) {
        case 'messages':
            return 'monthlyChats';
        case 'memories':
            return 'monthlyChats'; // Using chats as proxy for memories
        case 'council_sessions':
            return 'monthlyCouncilSessions';
        case 'voice_minutes':
            return 'dailyVoiceMinutes';
        case 'credits':
            return 'monthlyTokens'; // Using tokens as proxy for credits
    }
}

/**
 * Get tier-specific limits from config
 */
export function getAlertConfig(tier: TierName): Record<MetricName, number> {
    return {
        messages: getLimit(tier, 'monthlyChats'),
        memories: getLimit(tier, 'monthlyChats'), // Using chats as proxy
        council_sessions: getLimit(tier, 'monthlyCouncilSessions'),
        voice_minutes: getLimit(tier, 'dailyVoiceMinutes') * 30, // Approximate monthly
        credits: getLimit(tier, 'monthlyTokens'),
    };
}

/**
 * Check all metrics against tier limits.
 * Returns array of alerts at or above thresholds.
 */
export function checkUsageThresholds(
    _userId: string,
    tier: TierName,
    usage: UsageMetrics
): UsageAlert[] {
    const limits = getAlertConfig(tier);
    const alerts: UsageAlert[] = [];

    const metrics: Array<{ metric: MetricName; used: number }> = [
        { metric: 'messages', used: usage.messagesUsed },
        { metric: 'memories', used: usage.memoriesUsed },
        { metric: 'council_sessions', used: usage.councilSessionsUsed },
        { metric: 'voice_minutes', used: usage.voiceMinutesUsed },
        { metric: 'credits', used: usage.creditsUsed },
    ];

    for (const { metric, used } of metrics) {
        const limit = limits[metric];

        // Skip metrics with no limit (unlimited)
        if (limit === 0) continue;

        const percentage = used / limit;
        const threshold = getThresholdLevel(percentage);

        if (threshold) {
            alerts.push({
                metric,
                threshold,
                currentUsage: used,
                limit,
                percentage: Math.round(percentage * 100) / 100,
            });
        }
    }

    return alerts;
}

/**
 * Track cumulative usage per billing period.
 * Auto-resets at billing period boundary.
 */
export function recordUsageEvent(
    userId: string,
    tier: TierName,
    metric: MetricName,
    amount: number
): void {
    const usage = ensureUserUsage(userId, tier);

    switch (metric) {
        case 'messages':
            usage.metrics.messagesUsed += amount;
            break;
        case 'memories':
            usage.metrics.memoriesUsed += amount;
            break;
        case 'council_sessions':
            usage.metrics.councilSessionsUsed += amount;
            break;
        case 'voice_minutes':
            usage.metrics.voiceMinutesUsed += amount;
            break;
        case 'credits':
            usage.metrics.creditsUsed += amount;
            break;
    }
}

/**
 * Return current period usage vs limits for all metrics.
 */
export function getUserUsageSummary(
    userId: string,
    tier: TierName
): {
    usage: UsageMetrics;
    limits: Record<MetricName, number>;
    percentages: Record<MetricName, number>;
    billingPeriod: string;
} {
    const usage = ensureUserUsage(userId, tier);
    const limits = getAlertConfig(tier);

    const percentages: Record<MetricName, number> = {
        messages: limits.messages > 0 ? usage.metrics.messagesUsed / limits.messages : 0,
        memories: limits.memories > 0 ? usage.metrics.memoriesUsed / limits.memories : 0,
        council_sessions:
            limits.council_sessions > 0
                ? usage.metrics.councilSessionsUsed / limits.council_sessions
                : 0,
        voice_minutes:
            limits.voice_minutes > 0 ? usage.metrics.voiceMinutesUsed / limits.voice_minutes : 0,
        credits: limits.credits > 0 ? usage.metrics.creditsUsed / limits.credits : 0,
    };

    return {
        usage: { ...usage.metrics },
        limits,
        percentages,
        billingPeriod: usage.billingPeriod,
    };
}

/**
 * Deduplicate alerts - only send once per threshold per metric per period.
 * Returns true only if this alert hasn't been sent yet.
 */
export function shouldSendAlert(
    userId: string,
    metric: MetricName,
    threshold: ThresholdLevel
): boolean {
    const key = getAlertKey(userId, metric, threshold);
    return !alertsSentMap.has(key);
}

/**
 * Mark alert as sent for deduplication.
 * Internal function called after alert is actually sent.
 */
function markAlertSent(
    userId: string,
    metric: MetricName,
    threshold: ThresholdLevel,
    currentUsage: number,
    limit: number,
    percentage: number
): void {
    const key = getAlertKey(userId, metric, threshold);
    const currentPeriod = getCurrentBillingPeriod();

    alertsSentMap.set(key, {
        userId,
        metric,
        threshold,
        billingPeriod: currentPeriod,
    });

    const alertRecord: AlertRecord = {
        alertId: generateId('alert'),
        userId,
        metric,
        threshold,
        currentUsage,
        limit,
        percentage,
        timestamp: new Date(),
        billingPeriod: currentPeriod,
    };

    alertHistory.push(alertRecord);
}

/**
 * Check thresholds and record alerts that should be sent.
 * Returns alerts that haven't been sent yet in this period.
 */
export function checkAndRecordAlerts(
    userId: string,
    tier: TierName,
    usage: UsageMetrics
): UsageAlert[] {
    const alerts = checkUsageThresholds(userId, tier, usage);
    const newAlerts: UsageAlert[] = [];

    for (const alert of alerts) {
        if (shouldSendAlert(userId, alert.metric, alert.threshold)) {
            markAlertSent(
                userId,
                alert.metric,
                alert.threshold,
                alert.currentUsage,
                alert.limit,
                alert.percentage
            );
            newAlerts.push(alert);
        }
    }

    return newAlerts;
}

/**
 * Get recent alerts sent to user.
 */
export function getAlertHistory(userId: string, limit = 50): AlertRecord[] {
    return alertHistory
        .filter((alert) => alert.userId === userId)
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, limit);
}

/**
 * Get system-wide alert statistics.
 * How many users at each threshold level.
 */
export function getSystemAlertStats(): SystemAlertStats {
    const userThresholds = new Map<string, Set<ThresholdLevel>>();
    const metricStats: Record<MetricName, { warn: number; critical: number; exceeded: number }> = {
        messages: { warn: 0, critical: 0, exceeded: 0 },
        memories: { warn: 0, critical: 0, exceeded: 0 },
        council_sessions: { warn: 0, critical: 0, exceeded: 0 },
        voice_minutes: { warn: 0, critical: 0, exceeded: 0 },
        credits: { warn: 0, critical: 0, exceeded: 0 },
    };

    // Analyze all users with usage data
    for (const usage of userUsageMap.values()) {
        const alerts = checkUsageThresholds(usage.userId, usage.tier, usage.metrics);

        if (!userThresholds.has(usage.userId)) {
            userThresholds.set(usage.userId, new Set());
        }

        for (const alert of alerts) {
            userThresholds.get(usage.userId)!.add(alert.threshold);
            metricStats[alert.metric][alert.threshold]++;
        }
    }

    // Count users at each threshold level
    let usersAtWarn = 0;
    let usersAtCritical = 0;
    let usersAtExceeded = 0;

    for (const thresholds of userThresholds.values()) {
        if (thresholds.has('exceeded')) usersAtExceeded++;
        else if (thresholds.has('critical')) usersAtCritical++;
        else if (thresholds.has('warn')) usersAtWarn++;
    }

    return {
        totalUsers: userUsageMap.size,
        usersAtWarn,
        usersAtCritical,
        usersAtExceeded,
        alertsByMetric: metricStats,
    };
}

/**
 * Clear all state. Only for use in tests.
 */
export function clearAlerts_forTesting(): void {
    userUsageMap.clear();
    alertHistory.length = 0;
    alertsSentMap.clear();
}

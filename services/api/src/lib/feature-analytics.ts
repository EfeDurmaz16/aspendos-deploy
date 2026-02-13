/**
 * Feature Analytics System
 * Tracks feature usage to identify which features drive retention
 */

type FeatureName =
    | 'chat'
    | 'memory_search'
    | 'memory_create'
    | 'council'
    | 'pac_reminder'
    | 'voice_transcribe'
    | 'voice_synthesize'
    | 'import'
    | 'export'
    | 'workspace'
    | 'api_key'
    | 'template';

interface FeatureEvent {
    userId: string;
    feature: FeatureName;
    timestamp: Date;
    metadata?: Record<string, unknown>;
}

interface FeatureUsage {
    feature: FeatureName;
    count: number;
    lastUsedAt: Date;
    firstUsedAt: Date;
}

interface FeaturePopularity {
    feature: FeatureName;
    totalUses: number;
    uniqueUsers: number;
    avgUsesPerUser: number;
}

interface UserFeatureProfile {
    features: FeatureUsage[];
    primaryFeature: FeatureName | null;
    diversityScore: number;
}

interface FeatureRetention {
    feature: FeatureName;
    usersWhoUsed: number;
    day7Retention: number;
    day30Retention: number;
}

interface FeatureCorrelation {
    overlap: number;
    featureAOnly: number;
    featureBOnly: number;
    neither: number;
    correlationCoefficient: number;
}

interface FunnelStep {
    feature: FeatureName;
    entered: number;
    completed: number;
    dropOff: number;
}

interface FeatureGrowthPoint {
    date: string;
    uses: number;
    uniqueUsers: number;
}

interface EngagedUser {
    userId: string;
    totalUses: number;
    uniqueFeatures: number;
    diversityScore: number;
}

// In-memory storage
const featureEvents: FeatureEvent[] = [];
const userRetentionData = new Map<
    string,
    { lastSeen: Date; day7Active: boolean; day30Active: boolean }
>();

/**
 * Record a feature usage event
 */
export function trackFeatureUse(
    userId: string,
    feature: FeatureName,
    metadata?: Record<string, unknown>
): void {
    featureEvents.push({
        userId,
        feature,
        timestamp: new Date(),
        metadata,
    });

    // Update retention tracking
    const now = new Date();
    const existing = userRetentionData.get(userId);

    if (existing) {
        const daysSinceFirst = Math.floor(
            (now.getTime() - existing.lastSeen.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysSinceFirst >= 7) {
            existing.day7Active = true;
        }
        if (daysSinceFirst >= 30) {
            existing.day30Active = true;
        }
        existing.lastSeen = now;
    } else {
        userRetentionData.set(userId, {
            lastSeen: now,
            day7Active: false,
            day30Active: false,
        });
    }
}

/**
 * Get feature popularity ranking
 */
export function getFeaturePopularity(period?: number): FeaturePopularity[] {
    const cutoffDate =
        period !== undefined ? new Date(Date.now() - period * 24 * 60 * 60 * 1000) : new Date(0);

    const relevantEvents = featureEvents.filter((e) => e.timestamp >= cutoffDate);

    const featureStats = new Map<FeatureName, { totalUses: number; users: Set<string> }>();

    for (const event of relevantEvents) {
        const stats = featureStats.get(event.feature) || { totalUses: 0, users: new Set<string>() };
        stats.totalUses++;
        stats.users.add(event.userId);
        featureStats.set(event.feature, stats);
    }

    const result: FeaturePopularity[] = [];
    for (const [feature, stats] of featureStats.entries()) {
        result.push({
            feature,
            totalUses: stats.totalUses,
            uniqueUsers: stats.users.size,
            avgUsesPerUser: stats.totalUses / stats.users.size,
        });
    }

    return result.sort((a, b) => b.totalUses - a.totalUses);
}

/**
 * Get user's feature usage profile
 */
export function getUserFeatureProfile(userId: string): UserFeatureProfile {
    const userEvents = featureEvents.filter((e) => e.userId === userId);

    const featureMap = new Map<FeatureName, { count: number; timestamps: Date[] }>();

    for (const event of userEvents) {
        const data = featureMap.get(event.feature) || { count: 0, timestamps: [] };
        data.count++;
        data.timestamps.push(event.timestamp);
        featureMap.set(event.feature, data);
    }

    const features: FeatureUsage[] = [];
    let maxCount = 0;
    let primaryFeature: FeatureName | null = null;

    for (const [feature, data] of featureMap.entries()) {
        const timestamps = data.timestamps.sort((a, b) => a.getTime() - b.getTime());
        features.push({
            feature,
            count: data.count,
            lastUsedAt: timestamps[timestamps.length - 1],
            firstUsedAt: timestamps[0],
        });

        if (data.count > maxCount) {
            maxCount = data.count;
            primaryFeature = feature;
        }
    }

    // Calculate diversity score (0-100 based on how many different features used)
    const totalFeatures = 12; // Total possible features
    const usedFeatures = featureMap.size;
    const diversityScore = Math.round((usedFeatures / totalFeatures) * 100);

    return {
        features: features.sort((a, b) => b.count - a.count),
        primaryFeature,
        diversityScore,
    };
}

/**
 * Get retention metrics for a specific feature
 */
export function getRetentionByFeature(feature: FeatureName): FeatureRetention {
    const usersWhoUsedFeature = new Set(
        featureEvents.filter((e) => e.feature === feature).map((e) => e.userId)
    );

    let day7Retained = 0;
    let day30Retained = 0;

    for (const userId of usersWhoUsedFeature) {
        const retentionData = userRetentionData.get(userId);
        if (retentionData) {
            if (retentionData.day7Active) day7Retained++;
            if (retentionData.day30Active) day30Retained++;
        }
    }

    const usersWhoUsed = usersWhoUsedFeature.size;

    return {
        feature,
        usersWhoUsed,
        day7Retention: usersWhoUsed > 0 ? (day7Retained / usersWhoUsed) * 100 : 0,
        day30Retention: usersWhoUsed > 0 ? (day30Retained / usersWhoUsed) * 100 : 0,
    };
}

/**
 * Get correlation between two features
 */
export function getFeatureCorrelation(
    featureA: FeatureName,
    featureB: FeatureName
): FeatureCorrelation {
    const usersWithA = new Set(
        featureEvents.filter((e) => e.feature === featureA).map((e) => e.userId)
    );
    const usersWithB = new Set(
        featureEvents.filter((e) => e.feature === featureB).map((e) => e.userId)
    );
    const allUsers = new Set(featureEvents.map((e) => e.userId));

    const overlap = new Set([...usersWithA].filter((u) => usersWithB.has(u))).size;
    const featureAOnly = new Set([...usersWithA].filter((u) => !usersWithB.has(u))).size;
    const featureBOnly = new Set([...usersWithB].filter((u) => !usersWithA.has(u))).size;
    const neither = allUsers.size - overlap - featureAOnly - featureBOnly;

    // Pearson correlation coefficient (phi coefficient for binary variables)
    const n = allUsers.size;

    if (n === 0) {
        return {
            overlap,
            featureAOnly,
            featureBOnly,
            neither,
            correlationCoefficient: 0,
        };
    }

    const nA = usersWithA.size;
    const nB = usersWithB.size;
    const nAB = overlap;

    const numerator = n * nAB - nA * nB;
    const denominator = Math.sqrt((n * nA - nA * nA) * (n * nB - nB * nB));
    const correlationCoefficient = denominator === 0 ? 0 : numerator / denominator;

    return {
        overlap,
        featureAOnly,
        featureBOnly,
        neither,
        correlationCoefficient,
    };
}

/**
 * Analyze feature funnel
 */
export function getFeatureFunnel(features: FeatureName[]): FunnelStep[] {
    const usersByFeature = new Map<FeatureName, Set<string>>();

    for (const feature of features) {
        const users = new Set(
            featureEvents.filter((e) => e.feature === feature).map((e) => e.userId)
        );
        usersByFeature.set(feature, users);
    }

    const result: FunnelStep[] = [];
    let previousStepUsers: Set<string> | null = null;

    for (const feature of features) {
        const usersAtThisStep = usersByFeature.get(feature) || new Set<string>();
        const entered = previousStepUsers ? previousStepUsers.size : usersAtThisStep.size;
        const completed = usersAtThisStep.size;
        const dropOff = entered - completed;

        result.push({
            feature,
            entered,
            completed,
            dropOff,
        });

        previousStepUsers = usersAtThisStep;
    }

    return result;
}

/**
 * Get daily usage trend for a feature
 */
export function getFeatureGrowth(feature: FeatureName, days = 30): FeatureGrowthPoint[] {
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const relevantEvents = featureEvents.filter(
        (e) => e.feature === feature && e.timestamp >= cutoffDate
    );

    const dailyStats = new Map<string, { uses: number; users: Set<string> }>();

    for (const event of relevantEvents) {
        const dateKey = event.timestamp.toISOString().split('T')[0];
        const stats = dailyStats.get(dateKey) || { uses: 0, users: new Set<string>() };
        stats.uses++;
        stats.users.add(event.userId);
        dailyStats.set(dateKey, stats);
    }

    // Fill in missing dates with zeros
    const result: FeatureGrowthPoint[] = [];
    const now = new Date();
    const todayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

    // Start from 'days' ago and go up to today
    for (let i = days - 1; i >= 0; i--) {
        const date = new Date(todayUtc);
        date.setUTCDate(todayUtc.getUTCDate() - i);
        const dateKey = date.toISOString().split('T')[0];

        const stats = dailyStats.get(dateKey);
        result.push({
            date: dateKey,
            uses: stats?.uses || 0,
            uniqueUsers: stats?.users.size || 0,
        });
    }

    return result;
}

/**
 * Get most engaged users by total feature uses
 */
export function getMostEngagedUsers(limit = 10): EngagedUser[] {
    const userStats = new Map<string, { totalUses: number; features: Set<FeatureName> }>();

    for (const event of featureEvents) {
        const stats = userStats.get(event.userId) || {
            totalUses: 0,
            features: new Set<FeatureName>(),
        };
        stats.totalUses++;
        stats.features.add(event.feature);
        userStats.set(event.userId, stats);
    }

    const result: EngagedUser[] = [];
    const totalFeatures = 12;

    for (const [userId, stats] of userStats.entries()) {
        const diversityScore = Math.round((stats.features.size / totalFeatures) * 100);
        result.push({
            userId,
            totalUses: stats.totalUses,
            uniqueFeatures: stats.features.size,
            diversityScore,
        });
    }

    return result.sort((a, b) => b.totalUses - a.totalUses).slice(0, limit);
}

/**
 * Clear all analytics data (for testing)
 */
export function clearFeatureAnalytics_forTesting(): void {
    featureEvents.length = 0;
    userRetentionData.clear();
}

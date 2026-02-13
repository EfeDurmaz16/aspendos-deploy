/**
 * Switching Cost / Moat Measurement System
 *
 * Quantifies why users can't easily leave by tracking:
 * - Data investment (memories, conversations, templates)
 * - Habit formation (daily use, streaks, feature adoption)
 * - Network effects (team members, shared content, referrals)
 * - Customization (PAC settings, preferences, API keys)
 * - Integration depth (MCP connections, webhooks, API usage)
 *
 * Scoring: Each dimension 0-20, total 0-100
 * Weights: dataInvestment(25%), habitFormation(25%), networkEffects(20%),
 *          customization(15%), integrationDepth(15%)
 */

export type SwitchingCostDimension =
    | 'dataInvestment'
    | 'habitFormation'
    | 'networkEffects'
    | 'customization'
    | 'integrationDepth';

export interface SwitchingCostMetric {
    dimension: SwitchingCostDimension;
    metric: string;
    value: number;
    timestamp: number;
}

export interface SwitchingCostBreakdown {
    dataInvestment: number;
    habitFormation: number;
    networkEffects: number;
    customization: number;
    integrationDepth: number;
    total: number;
    weightedTotal: number;
}

export interface UserSegmentBySwitchingCost {
    low: number; // 0-33
    medium: number; // 34-66
    high: number; // 67-100
}

export interface ChurnRiskBySwitchingCost {
    low: number; // users with low switching cost
    medium: number;
    high: number;
    correlationStrength: number; // -1 to 1, negative means higher switching cost = lower churn
}

// In-memory storage
const userMetrics = new Map<string, SwitchingCostMetric[]>();
const churnData = new Map<string, boolean>(); // userId -> hasChurned

// Dimension weights (sum to 100%)
const DIMENSION_WEIGHTS = {
    dataInvestment: 0.25,
    habitFormation: 0.25,
    networkEffects: 0.2,
    customization: 0.15,
    integrationDepth: 0.15,
};

/**
 * Record a user investment in a switching cost dimension
 */
export function recordUserInvestment(
    userId: string,
    dimension: SwitchingCostDimension,
    metric: string,
    value: number
): void {
    if (!userMetrics.has(userId)) {
        userMetrics.set(userId, []);
    }

    const metrics = userMetrics.get(userId);
    if (metrics) {
        metrics.push({
            dimension,
            metric,
            value,
            timestamp: Date.now(),
        });
    }
}

/**
 * Calculate score for data investment dimension (0-20)
 */
function calculateDataInvestmentScore(metrics: SwitchingCostMetric[]): number {
    const dataMetrics = metrics.filter((m) => m.dimension === 'dataInvestment');
    if (dataMetrics.length === 0) return 0;

    let score = 0;

    // Memories stored (0-8 points, cap at 100 memories)
    const memories = Math.max(0, dataMetrics
        .filter((m) => m.metric === 'memoriesStored')
        .reduce((sum, m) => sum + m.value, 0));
    score += Math.min(8, (memories / 100) * 8);

    // Conversations (0-7 points, cap at 50 conversations)
    const conversations = Math.max(0, dataMetrics
        .filter((m) => m.metric === 'conversations')
        .reduce((sum, m) => sum + m.value, 0));
    score += Math.min(7, (conversations / 50) * 7);

    // Custom templates (0-5 points, cap at 20 templates)
    const templates = Math.max(0, dataMetrics
        .filter((m) => m.metric === 'customTemplates')
        .reduce((sum, m) => sum + m.value, 0));
    score += Math.min(5, (templates / 20) * 5);

    return Math.min(20, score);
}

/**
 * Calculate score for habit formation dimension (0-20)
 */
function calculateHabitFormationScore(metrics: SwitchingCostMetric[]): number {
    const habitMetrics = metrics.filter((m) => m.dimension === 'habitFormation');
    if (habitMetrics.length === 0) return 0;

    let score = 0;

    // Days active (0-8 points, cap at 90 days)
    const daysActive = Math.max(0, habitMetrics
        .filter((m) => m.metric === 'daysActive')
        .reduce((sum, m) => sum + m.value, 0));
    score += Math.min(8, (daysActive / 90) * 8);

    // Session frequency (0-7 points, sessions per week, cap at 20)
    const sessionFrequency = Math.max(0, habitMetrics
        .filter((m) => m.metric === 'sessionFrequency')
        .reduce((sum, m) => sum + m.value, 0));
    score += Math.min(7, (sessionFrequency / 20) * 7);

    // Features used (0-5 points, unique features, cap at 10)
    const featuresUsed = Math.max(0, habitMetrics
        .filter((m) => m.metric === 'featuresUsed')
        .reduce((sum, m) => sum + m.value, 0));
    score += Math.min(5, (featuresUsed / 10) * 5);

    return Math.min(20, score);
}

/**
 * Calculate score for network effects dimension (0-20)
 */
function calculateNetworkEffectsScore(metrics: SwitchingCostMetric[]): number {
    const networkMetrics = metrics.filter((m) => m.dimension === 'networkEffects');
    if (networkMetrics.length === 0) return 0;

    let score = 0;

    // Workspace members (0-8 points, cap at 10 members)
    const workspaceMembers = Math.max(0, networkMetrics
        .filter((m) => m.metric === 'workspaceMembers')
        .reduce((sum, m) => sum + m.value, 0));
    score += Math.min(8, (workspaceMembers / 10) * 8);

    // Shared conversations (0-7 points, cap at 30)
    const sharedConversations = Math.max(0, networkMetrics
        .filter((m) => m.metric === 'sharedConversations')
        .reduce((sum, m) => sum + m.value, 0));
    score += Math.min(7, (sharedConversations / 30) * 7);

    // Referrals made (0-5 points, cap at 10)
    const referrals = Math.max(0, networkMetrics
        .filter((m) => m.metric === 'referralsMade')
        .reduce((sum, m) => sum + m.value, 0));
    score += Math.min(5, (referrals / 10) * 5);

    return Math.min(20, score);
}

/**
 * Calculate score for customization dimension (0-20)
 */
function calculateCustomizationScore(metrics: SwitchingCostMetric[]): number {
    const customMetrics = metrics.filter((m) => m.dimension === 'customization');
    if (customMetrics.length === 0) return 0;

    let score = 0;

    // PAC settings configured (0-7 points, cap at 10)
    const pacSettings = Math.max(0, customMetrics
        .filter((m) => m.metric === 'pacSettingsConfigured')
        .reduce((sum, m) => sum + m.value, 0));
    score += Math.min(7, (pacSettings / 10) * 7);

    // Model preferences (0-6 points, cap at 5)
    const modelPreferences = Math.max(0, customMetrics
        .filter((m) => m.metric === 'modelPreferences')
        .reduce((sum, m) => sum + m.value, 0));
    score += Math.min(6, (modelPreferences / 5) * 6);

    // API keys created (0-7 points, cap at 5)
    const apiKeys = Math.max(0, customMetrics
        .filter((m) => m.metric === 'apiKeysCreated')
        .reduce((sum, m) => sum + m.value, 0));
    score += Math.min(7, (apiKeys / 5) * 7);

    return Math.min(20, score);
}

/**
 * Calculate score for integration depth dimension (0-20)
 */
function calculateIntegrationDepthScore(metrics: SwitchingCostMetric[]): number {
    const integrationMetrics = metrics.filter((m) => m.dimension === 'integrationDepth');
    if (integrationMetrics.length === 0) return 0;

    let score = 0;

    // MCP connections (0-7 points, cap at 5)
    const mcpConnections = Math.max(0, integrationMetrics
        .filter((m) => m.metric === 'mcpConnections')
        .reduce((sum, m) => sum + m.value, 0));
    score += Math.min(7, (mcpConnections / 5) * 7);

    // Webhooks configured (0-6 points, cap at 5)
    const webhooks = Math.max(0, integrationMetrics
        .filter((m) => m.metric === 'webhooksConfigured')
        .reduce((sum, m) => sum + m.value, 0));
    score += Math.min(6, (webhooks / 5) * 6);

    // API usage (0-7 points, cap at 10000 calls)
    const apiUsage = Math.max(0, integrationMetrics
        .filter((m) => m.metric === 'apiUsage')
        .reduce((sum, m) => sum + m.value, 0));
    score += Math.min(7, (apiUsage / 10000) * 7);

    return Math.min(20, score);
}

/**
 * Get switching cost breakdown by dimension
 */
export function getSwitchingCostBreakdown(userId: string): SwitchingCostBreakdown {
    const metrics = userMetrics.get(userId) || [];

    const dataInvestment = calculateDataInvestmentScore(metrics);
    const habitFormation = calculateHabitFormationScore(metrics);
    const networkEffects = calculateNetworkEffectsScore(metrics);
    const customization = calculateCustomizationScore(metrics);
    const integrationDepth = calculateIntegrationDepthScore(metrics);

    const total =
        dataInvestment + habitFormation + networkEffects + customization + integrationDepth;

    const weightedTotal =
        dataInvestment * DIMENSION_WEIGHTS.dataInvestment +
        habitFormation * DIMENSION_WEIGHTS.habitFormation +
        networkEffects * DIMENSION_WEIGHTS.networkEffects +
        customization * DIMENSION_WEIGHTS.customization +
        integrationDepth * DIMENSION_WEIGHTS.integrationDepth;

    return {
        dataInvestment,
        habitFormation,
        networkEffects,
        customization,
        integrationDepth,
        total,
        weightedTotal: weightedTotal * 5, // Scale to 0-100
    };
}

/**
 * Get composite switching cost score (0-100)
 */
export function getSwitchingCostScore(userId: string): number {
    const breakdown = getSwitchingCostBreakdown(userId);
    return Math.round(breakdown.weightedTotal);
}

/**
 * Get data portability score (inverse of lock-in, 0-100)
 * Higher score = easier to export data = less lock-in
 */
export function getDataPortabilityScore(userId: string): number {
    const metrics = userMetrics.get(userId) || [];
    const dataMetrics = metrics.filter((m) => m.dimension === 'dataInvestment');

    if (dataMetrics.length === 0) return 100; // No data = fully portable

    // Assume 80% of data is exportable in standard formats
    // Reduce by 1% for each 10 memories (more data = harder to migrate)
    const memories = dataMetrics
        .filter((m) => m.metric === 'memoriesStored')
        .reduce((sum, m) => sum + m.value, 0);

    const portabilityReduction = Math.min(20, Math.floor(memories / 10));
    return Math.max(60, 100 - portabilityReduction);
}

/**
 * Get habit strength score (0-100)
 * Based on session frequency and streak length
 */
export function getHabitStrength(userId: string): number {
    const metrics = userMetrics.get(userId) || [];
    const habitMetrics = metrics.filter((m) => m.dimension === 'habitFormation');

    if (habitMetrics.length === 0) return 0;

    let score = 0;

    // Session frequency (0-50 points)
    const sessionFrequency = habitMetrics
        .filter((m) => m.metric === 'sessionFrequency')
        .reduce((sum, m) => sum + m.value, 0);
    score += Math.min(50, (sessionFrequency / 20) * 50);

    // Days active / streak (0-50 points)
    const daysActive = habitMetrics
        .filter((m) => m.metric === 'daysActive')
        .reduce((sum, m) => sum + m.value, 0);
    score += Math.min(50, (daysActive / 90) * 50);

    return Math.round(score);
}

/**
 * Get network effect strength (0-100)
 * Value derived from other users
 */
export function getNetworkEffectStrength(userId: string): number {
    const metrics = userMetrics.get(userId) || [];
    const networkMetrics = metrics.filter((m) => m.dimension === 'networkEffects');

    if (networkMetrics.length === 0) return 0;

    const score = calculateNetworkEffectsScore(networkMetrics);
    return Math.round((score / 20) * 100);
}

/**
 * Get average switching cost across all users
 */
export function getAverageSwitchingCost(): number {
    if (userMetrics.size === 0) return 0;

    let totalScore = 0;
    for (const userId of userMetrics.keys()) {
        totalScore += getSwitchingCostScore(userId);
    }

    return Math.round(totalScore / userMetrics.size);
}

/**
 * Segment users by switching cost level
 */
export function getUserSegmentBySwitchingCost(): UserSegmentBySwitchingCost {
    const segments = {
        low: 0,
        medium: 0,
        high: 0,
    };

    for (const userId of userMetrics.keys()) {
        const score = getSwitchingCostScore(userId);

        if (score <= 33) {
            segments.low++;
        } else if (score <= 66) {
            segments.medium++;
        } else {
            segments.high++;
        }
    }

    return segments;
}

/**
 * Record churn event for correlation analysis
 */
export function recordChurn(userId: string, hasChurned: boolean): void {
    churnData.set(userId, hasChurned);
}

/**
 * Analyze correlation between switching cost and churn
 */
export function getChurnRiskBySwitchingCost(): ChurnRiskBySwitchingCost {
    const lowCost: number[] = [];
    const mediumCost: number[] = [];
    const highCost: number[] = [];

    for (const userId of userMetrics.keys()) {
        const score = getSwitchingCostScore(userId);
        const churned = churnData.get(userId) || false;

        if (score <= 33) {
            lowCost.push(churned ? 1 : 0);
        } else if (score <= 66) {
            mediumCost.push(churned ? 1 : 0);
        } else {
            highCost.push(churned ? 1 : 0);
        }
    }

    const calculateChurnRate = (costs: number[]): number => {
        if (costs.length === 0) return 0;
        const churned = costs.filter((c) => c === 1).length;
        return Math.round((churned / costs.length) * 100);
    };

    const lowRate = calculateChurnRate(lowCost);
    const mediumRate = calculateChurnRate(mediumCost);
    const highRate = calculateChurnRate(highCost);

    // Calculate correlation strength (simplified)
    // Negative correlation = higher switching cost = lower churn
    let correlationStrength = 0;
    if (lowCost.length > 0 && highCost.length > 0) {
        const diff = lowRate - highRate;
        correlationStrength = -Math.min(1, Math.max(-1, diff / 100));
    }

    return {
        low: lowRate,
        medium: mediumRate,
        high: highRate,
        correlationStrength,
    };
}

/**
 * Get platform-level moat score (0-100)
 * Combines average switching cost, user segmentation, and churn correlation
 */
export function getMoatScore(): number {
    if (userMetrics.size === 0) return 0;

    // Average switching cost (40% weight)
    const avgCost = getAverageSwitchingCost();
    const costScore = avgCost * 0.4;

    // High switching cost users (30% weight)
    const segments = getUserSegmentBySwitchingCost();
    const totalUsers = segments.low + segments.medium + segments.high;
    const highCostRatio = totalUsers > 0 ? segments.high / totalUsers : 0;
    const segmentScore = highCostRatio * 100 * 0.3;

    // Churn correlation strength (30% weight)
    const churnRisk = getChurnRiskBySwitchingCost();
    const correlationScore = Math.abs(churnRisk.correlationStrength) * 100 * 0.3;

    const moatScore = costScore + segmentScore + correlationScore;
    return Math.round(Math.min(100, moatScore));
}

/**
 * Clear all switching cost data (for testing)
 */
export function clearSwitchingCosts_forTesting(): void {
    userMetrics.clear();
    churnData.clear();
}

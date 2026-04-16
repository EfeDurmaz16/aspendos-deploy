/**
 * Canary Deployment Support
 *
 * Enables safe rollouts by routing a percentage of traffic to new versions
 * and monitoring error rates for automatic rollback decisions.
 */

import { createHash } from 'node:crypto';

interface DeploymentInfo {
    version: string;
    commitSha: string;
    environment: string;
    deployedAt: string;
    isCanary: boolean;
}

interface CanaryMetrics {
    canaryErrorRate: number;
    stableErrorRate: number;
    isHealthy: boolean;
    sampleSize: {
        canary: number;
        stable: number;
    };
}

interface CanaryStats {
    success: number;
    error: number;
}

// In-memory metrics storage (use Redis in production)
const metrics = {
    canary: { success: 0, error: 0 } as CanaryStats,
    stable: { success: 0, error: 0 } as CanaryStats,
};

/**
 * Check if canary mode is active
 */
export function isCanaryEnabled(): boolean {
    return process.env.CANARY_ENABLED === 'true';
}

/**
 * Get percentage of traffic routed to canary (default 10%)
 */
export function getCanaryPercentage(): number {
    const percentage = Number.parseInt(process.env.CANARY_PERCENTAGE || '10', 10);

    if (Number.isNaN(percentage) || percentage < 0 || percentage > 100) {
        return 10;
    }

    return percentage;
}

/**
 * Deterministic routing based on userId hash
 * Same user always goes to same version for consistency
 */
export function shouldRouteToCanary(userId: string): boolean {
    if (!isCanaryEnabled()) {
        return false;
    }

    const percentage = getCanaryPercentage();

    // Hash userId and convert to percentage (0-99)
    const hash = createHash('sha256').update(userId).digest('hex');
    const hashValue = Number.parseInt(hash.substring(0, 8), 16);
    const userPercentile = hashValue % 100;

    return userPercentile < percentage;
}

/**
 * Get deployment information
 */
export function getDeploymentInfo(): DeploymentInfo {
    return {
        version: process.env.APP_VERSION || 'unknown',
        commitSha: process.env.COMMIT_SHA || 'unknown',
        environment: process.env.NODE_ENV || 'development',
        deployedAt: process.env.DEPLOY_TIME || new Date().toISOString(),
        isCanary: process.env.IS_CANARY === 'true',
    };
}

/**
 * Get canary metrics comparing error rates
 */
export function getCanaryMetrics(): CanaryMetrics {
    const canaryTotal = metrics.canary.success + metrics.canary.error;
    const stableTotal = metrics.stable.success + metrics.stable.error;

    const canaryErrorRate = canaryTotal > 0 ? metrics.canary.error / canaryTotal : 0;

    const stableErrorRate = stableTotal > 0 ? metrics.stable.error / stableTotal : 0;

    // Canary is healthy if error rate is not significantly higher
    // Allow 2x error rate threshold
    const isHealthy = canaryTotal < 100 || canaryErrorRate <= stableErrorRate * 2;

    return {
        canaryErrorRate,
        stableErrorRate,
        isHealthy,
        sampleSize: {
            canary: canaryTotal,
            stable: stableTotal,
        },
    };
}

/**
 * Record a request result for canary comparison
 */
export function recordCanaryResult(isCanary: boolean, success: boolean): void {
    const target = isCanary ? metrics.canary : metrics.stable;

    if (success) {
        target.success++;
    } else {
        target.error++;
    }
}

/**
 * Determine if automatic rollback should occur
 * Returns true if canary error rate is >2x stable with sufficient samples
 */
export function shouldAutoRollback(): boolean {
    const canaryMetrics = getCanaryMetrics();

    // Need sufficient samples to make a decision
    if (canaryMetrics.sampleSize.canary < 100) {
        return false;
    }

    // Need some stable baseline
    if (canaryMetrics.sampleSize.stable < 50) {
        return false;
    }

    // Check if canary error rate is >2x stable
    const threshold = canaryMetrics.stableErrorRate * 2;

    return canaryMetrics.canaryErrorRate > threshold && canaryMetrics.canaryErrorRate > 0.01; // At least 1% error rate
}

/**
 * Get version headers to add to responses
 */
export function getVersionHeaders(): Record<string, string> {
    const info = getDeploymentInfo();

    return {
        'X-Version': info.version,
        'X-Canary': info.isCanary ? 'true' : 'false',
    };
}

/**
 * Clear metrics (for testing only)
 */
export function clearCanary_forTesting(): void {
    metrics.canary = { success: 0, error: 0 };
    metrics.stable = { success: 0, error: 0 };
}

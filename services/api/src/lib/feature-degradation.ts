/**
 * Feature Degradation / Graceful Fallback System
 *
 * Per-feature health tracking with automatic degradation and recovery.
 * Uses a half-open pattern (similar to circuit breaker) to auto-recover
 * disabled features after a cooldown period.
 *
 * Degradation triggers:
 * - Error rate > 10% over last 100 requests
 * - p99 latency > 5000ms
 *
 * Recovery: auto-recovers after 60 seconds (half-open probe)
 */

export type FeatureName =
    | 'memory_search'
    | 'council'
    | 'voice'
    | 'import'
    | 'pac_reminders'
    | 'billing';

export type FeatureStatus = 'healthy' | 'degraded' | 'disabled';

export interface FeatureHealth {
    feature: FeatureName;
    status: FeatureStatus;
    successCount: number;
    failureCount: number;
    p99Latency: number;
    lastFailure: number | null;
    errorRate: number;
}

interface LatencyRecord {
    timestamp: number;
    latencyMs: number;
}

interface FeatureState {
    successCount: number;
    failureCount: number;
    latencies: LatencyRecord[];
    lastFailure: number | null;
    status: FeatureStatus;
    disabledAt: number | null;
}

const WINDOW_SIZE = 100;
const ERROR_RATE_THRESHOLD = 0.10; // 10%
const P99_LATENCY_THRESHOLD = 5000; // 5000ms
const RECOVERY_TIMEOUT_MS = 60_000; // 60 seconds

const ALL_FEATURES: FeatureName[] = [
    'memory_search',
    'council',
    'voice',
    'import',
    'pac_reminders',
    'billing',
];

function createInitialState(): FeatureState {
    return {
        successCount: 0,
        failureCount: 0,
        latencies: [],
        lastFailure: null,
        status: 'healthy',
        disabledAt: null,
    };
}

const featureStates = new Map<FeatureName, FeatureState>();

function initializeFeatures(): void {
    for (const feature of ALL_FEATURES) {
        if (!featureStates.has(feature)) {
            featureStates.set(feature, createInitialState());
        }
    }
}

// Initialize on module load
initializeFeatures();

function getState(feature: FeatureName): FeatureState {
    let state = featureStates.get(feature);
    if (!state) {
        state = createInitialState();
        featureStates.set(feature, state);
    }
    return state;
}

function calculateErrorRate(state: FeatureState): number {
    const total = state.successCount + state.failureCount;
    if (total === 0) return 0;
    const windowTotal = Math.min(total, WINDOW_SIZE);
    const recentFailures = Math.min(state.failureCount, windowTotal);
    return recentFailures / windowTotal;
}

function calculateP99(state: FeatureState): number {
    if (state.latencies.length === 0) return 0;
    const sorted = [...state.latencies].sort((a, b) => a.latencyMs - b.latencyMs);
    const index = Math.min(Math.ceil(sorted.length * 0.99), sorted.length - 1);
    return sorted[index].latencyMs;
}

function evaluateHealth(state: FeatureState): void {
    if (state.status === 'disabled') return;

    const errorRate = calculateErrorRate(state);
    const p99 = calculateP99(state);

    if (errorRate > ERROR_RATE_THRESHOLD || p99 > P99_LATENCY_THRESHOLD) {
        state.status = 'degraded';
        const total = state.successCount + state.failureCount;
        if (total >= 10 && (errorRate > ERROR_RATE_THRESHOLD * 2 || p99 > P99_LATENCY_THRESHOLD * 1.5)) {
            state.status = 'disabled';
            state.disabledAt = Date.now();
        }
    }
}

function trimLatencies(state: FeatureState): void {
    if (state.latencies.length > WINDOW_SIZE) {
        state.latencies = state.latencies.slice(-WINDOW_SIZE);
    }
}

/**
 * Record a successful operation for a feature
 */
export function recordSuccess(feature: FeatureName, latencyMs: number): void {
    const state = getState(feature);
    state.successCount++;
    state.latencies.push({ timestamp: Date.now(), latencyMs });
    trimLatencies(state);

    // If recovering from degraded, check if we should go back to healthy
    if (state.status === 'degraded') {
        const errorRate = calculateErrorRate(state);
        const p99 = calculateP99(state);
        if (errorRate <= ERROR_RATE_THRESHOLD && p99 <= P99_LATENCY_THRESHOLD) {
            state.status = 'healthy';
        }
    }
}

/**
 * Record a failed operation for a feature
 */
export function recordFailure(feature: FeatureName, _error: Error): void {
    const state = getState(feature);
    state.failureCount++;
    state.lastFailure = Date.now();
    evaluateHealth(state);
}

/**
 * Check if a feature is available (healthy or recovering via half-open)
 */
export function isFeatureAvailable(feature: FeatureName): boolean {
    const state = getState(feature);

    if (state.status === 'healthy' || state.status === 'degraded') {
        return true;
    }

    // Half-open: auto-recover after RECOVERY_TIMEOUT_MS
    if (state.status === 'disabled' && state.disabledAt !== null) {
        if (Date.now() - state.disabledAt >= RECOVERY_TIMEOUT_MS) {
            state.status = 'degraded';
            state.disabledAt = null;
            // Reset counters for fresh evaluation
            state.successCount = 0;
            state.failureCount = 0;
            state.latencies = [];
            return true;
        }
    }

    return false;
}

/**
 * Get health status for all tracked features
 */
export function getFeatureHealth(): FeatureHealth[] {
    return ALL_FEATURES.map((feature) => {
        const state = getState(feature);
        return {
            feature,
            status: state.status,
            successCount: state.successCount,
            failureCount: state.failureCount,
            p99Latency: calculateP99(state),
            lastFailure: state.lastFailure,
            errorRate: calculateErrorRate(state),
        };
    });
}

/**
 * Get list of currently degraded or disabled feature names
 */
export function getDegradedFeatures(): FeatureName[] {
    return ALL_FEATURES.filter((feature) => {
        const state = getState(feature);
        return state.status === 'degraded' || state.status === 'disabled';
    });
}

/**
 * Execute primary function with automatic fallback on feature degradation.
 * If the feature is disabled, skips primary and goes straight to fallback.
 * If primary throws, records the failure and uses fallback.
 */
export async function withFeatureFallback<T>(
    feature: FeatureName,
    primaryFn: () => Promise<T>,
    fallbackFn: () => Promise<T>
): Promise<T> {
    if (!isFeatureAvailable(feature)) {
        return fallbackFn();
    }

    const start = Date.now();
    try {
        const result = await primaryFn();
        recordSuccess(feature, Date.now() - start);
        return result;
    } catch (error) {
        recordFailure(feature, error instanceof Error ? error : new Error(String(error)));
        return fallbackFn();
    }
}

/**
 * Reset all feature health state. For testing only.
 */
export function resetFeatureHealth_forTesting(): void {
    featureStates.clear();
    initializeFeatures();
}

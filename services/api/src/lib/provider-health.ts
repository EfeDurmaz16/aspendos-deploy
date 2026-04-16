/**
 * Provider Health Tracking and Circuit Breaker System
 *
 * Tracks response times and error rates for AI providers and implements
 * a circuit breaker pattern to prevent cascading failures.
 */

export type Provider = 'openai' | 'anthropic' | 'google' | 'groq';

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface HealthMetrics {
    provider: Provider;
    circuitState: CircuitState;
    totalRequests: number;
    successCount: number;
    failureCount: number;
    consecutiveFailures: number;
    errorRate: number;
    avgLatencyMs: number;
    lastFailureTime?: number;
    circuitOpenedAt?: number;
}

interface RequestRecord {
    timestamp: number;
    success: boolean;
    latencyMs?: number;
}

class ProviderHealthTracker {
    private readonly WINDOW_MS = 5 * 60 * 1000; // 5 minutes
    private readonly ERROR_RATE_THRESHOLD = 0.5; // 50%
    private readonly CONSECUTIVE_FAILURES_THRESHOLD = 5;
    private readonly CIRCUIT_HALF_OPEN_DELAY_MS = 30 * 1000; // 30 seconds

    private records: Map<Provider, RequestRecord[]> = new Map();
    private consecutiveFailures: Map<Provider, number> = new Map();
    private circuitStates: Map<Provider, CircuitState> = new Map();
    private circuitOpenedAt: Map<Provider, number> = new Map();

    constructor() {
        // Initialize all providers
        const providers: Provider[] = ['openai', 'anthropic', 'google', 'groq'];
        for (const provider of providers) {
            this.records.set(provider, []);
            this.consecutiveFailures.set(provider, 0);
            this.circuitStates.set(provider, 'CLOSED');
        }
    }

    /**
     * Record a successful provider request
     */
    recordSuccess(provider: Provider, latencyMs: number): void {
        const now = Date.now();

        // Reset consecutive failures on success
        this.consecutiveFailures.set(provider, 0);

        // Add success record
        this.addRecord(provider, {
            timestamp: now,
            success: true,
            latencyMs,
        });

        // Update circuit state
        const currentState = this.circuitStates.get(provider);
        if (currentState === 'HALF_OPEN') {
            // Success in HALF_OPEN state closes the circuit
            this.circuitStates.set(provider, 'CLOSED');
            this.circuitOpenedAt.delete(provider);
        }
    }

    /**
     * Record a failed provider request
     */
    recordFailure(provider: Provider, _error: Error): void {
        const now = Date.now();

        // Increment consecutive failures
        const consecutive = (this.consecutiveFailures.get(provider) || 0) + 1;
        this.consecutiveFailures.set(provider, consecutive);

        // Add failure record
        this.addRecord(provider, {
            timestamp: now,
            success: false,
        });

        // Check if circuit should open
        if (consecutive >= this.CONSECUTIVE_FAILURES_THRESHOLD) {
            this.circuitStates.set(provider, 'OPEN');
            this.circuitOpenedAt.set(provider, now);
        }
    }

    /**
     * Check if a provider is healthy and available
     */
    isProviderHealthy(provider: Provider): boolean {
        const state = this.getCircuitState(provider);

        // Provider is unhealthy if circuit is OPEN
        if (state === 'OPEN') {
            return false;
        }

        // Check error rate in sliding window
        const metrics = this.calculateMetrics(provider);
        return metrics.errorRate < this.ERROR_RATE_THRESHOLD;
    }

    /**
     * Get the best available provider from a list
     * Returns the provider with lowest latency and healthy status
     */
    getBestProvider(providers: Provider[]): Provider | null {
        const healthyProviders = providers
            .filter((p) => this.isProviderHealthy(p))
            .map((p) => ({
                provider: p,
                metrics: this.calculateMetrics(p),
            }))
            .filter(({ metrics }) => metrics.totalRequests > 0)
            .sort((a, b) => a.metrics.avgLatencyMs - b.metrics.avgLatencyMs);

        // If no healthy providers with history, return first healthy one
        if (healthyProviders.length === 0) {
            const anyHealthy = providers.find((p) => this.isProviderHealthy(p));
            return anyHealthy || null;
        }

        return healthyProviders[0].provider;
    }

    /**
     * Get health status for all providers
     */
    getHealthStatus(): HealthMetrics[] {
        const providers: Provider[] = ['openai', 'anthropic', 'google', 'groq'];
        return providers.map((provider) => this.getProviderHealth(provider));
    }

    /**
     * Get health status for a specific provider
     */
    getProviderHealth(provider: Provider): HealthMetrics {
        const metrics = this.calculateMetrics(provider);
        const state = this.getCircuitState(provider);
        const records = this.getRecentRecords(provider);
        const lastFailure = records
            .filter((r) => !r.success)
            .sort((a, b) => b.timestamp - a.timestamp)[0];

        return {
            provider,
            circuitState: state,
            totalRequests: metrics.totalRequests,
            successCount: metrics.successCount,
            failureCount: metrics.failureCount,
            consecutiveFailures: this.consecutiveFailures.get(provider) || 0,
            errorRate: metrics.errorRate,
            avgLatencyMs: metrics.avgLatencyMs,
            lastFailureTime: lastFailure?.timestamp,
            circuitOpenedAt: this.circuitOpenedAt.get(provider),
        };
    }

    /**
     * Reset all health metrics (useful for testing)
     */
    reset(): void {
        for (const provider of this.records.keys()) {
            this.records.set(provider, []);
            this.consecutiveFailures.set(provider, 0);
            this.circuitStates.set(provider, 'CLOSED');
            this.circuitOpenedAt.delete(provider);
        }
    }

    private addRecord(provider: Provider, record: RequestRecord): void {
        const records = this.records.get(provider) || [];
        records.push(record);
        this.records.set(provider, records);
        this.cleanupOldRecords(provider);
    }

    private getRecentRecords(provider: Provider): RequestRecord[] {
        this.cleanupOldRecords(provider);
        return this.records.get(provider) || [];
    }

    private cleanupOldRecords(provider: Provider): void {
        const now = Date.now();
        const records = this.records.get(provider) || [];
        const recentRecords = records.filter((r) => now - r.timestamp < this.WINDOW_MS);
        this.records.set(provider, recentRecords);
    }

    private calculateMetrics(provider: Provider): {
        totalRequests: number;
        successCount: number;
        failureCount: number;
        errorRate: number;
        avgLatencyMs: number;
    } {
        const records = this.getRecentRecords(provider);
        const totalRequests = records.length;
        const successCount = records.filter((r) => r.success).length;
        const failureCount = totalRequests - successCount;
        const errorRate = totalRequests > 0 ? failureCount / totalRequests : 0;

        const latencies = records
            .filter((r) => r.success && r.latencyMs !== undefined)
            .map((r) => r.latencyMs!);
        const avgLatencyMs =
            latencies.length > 0 ? latencies.reduce((sum, l) => sum + l, 0) / latencies.length : 0;

        return {
            totalRequests,
            successCount,
            failureCount,
            errorRate,
            avgLatencyMs,
        };
    }

    private getCircuitState(provider: Provider): CircuitState {
        const state = this.circuitStates.get(provider) || 'CLOSED';

        // Check if circuit should transition from OPEN to HALF_OPEN
        if (state === 'OPEN') {
            const openedAt = this.circuitOpenedAt.get(provider);
            if (openedAt && Date.now() - openedAt >= this.CIRCUIT_HALF_OPEN_DELAY_MS) {
                this.circuitStates.set(provider, 'HALF_OPEN');
                return 'HALF_OPEN';
            }
        }

        return state;
    }
}

// Singleton instance
const healthTracker = new ProviderHealthTracker();

// Export singleton methods
export const recordSuccess = (provider: Provider, latencyMs: number) =>
    healthTracker.recordSuccess(provider, latencyMs);

export const recordFailure = (provider: Provider, error: Error) =>
    healthTracker.recordFailure(provider, error);

export const isProviderHealthy = (provider: Provider): boolean =>
    healthTracker.isProviderHealthy(provider);

export const getBestProvider = (providers: Provider[]): Provider | null =>
    healthTracker.getBestProvider(providers);

export const getHealthStatus = (): HealthMetrics[] => healthTracker.getHealthStatus();

export const getProviderHealth = (provider: Provider): HealthMetrics =>
    healthTracker.getProviderHealth(provider);

export const resetHealthTracking = () => healthTracker.reset();

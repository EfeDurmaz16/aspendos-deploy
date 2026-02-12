/**
 * Circuit Breaker Pattern for external API calls.
 * Prevents cascading failures when upstream services (OpenAI, Qdrant, Groq) are down.
 *
 * States:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Service is down, fail fast without calling
 * - HALF_OPEN: Testing if service recovered
 *
 * Features:
 * - Success rate tracking (sliding window)
 * - Event callbacks for monitoring
 * - Bulkhead pattern (concurrency limiting)
 * - Fallback support
 */
type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

interface CircuitBreakerOptions {
    failureThreshold: number; // failures before opening
    resetTimeout: number; // ms before trying half-open
    name: string;
    maxConcurrent?: number; // bulkhead: max concurrent requests (0 = unlimited)
    onStateChange?: (name: string, from: CircuitState, to: CircuitState) => void;
    onReject?: (name: string, reason: string) => void;
}

interface CircuitStats {
    totalRequests: number;
    successCount: number;
    failureCount: number;
    rejectedCount: number;
    lastFailureTime: number;
    lastSuccessTime: number;
    avgLatencyMs: number;
    stateChanges: number;
}

export class CircuitBreaker {
    private state: CircuitState = 'CLOSED';
    private failureCount = 0;
    private lastFailureTime = 0;
    private lastSuccessTime = 0;
    private halfOpenAttempted = false;
    private options: CircuitBreakerOptions;
    private activeConcurrent = 0;
    private stats: CircuitStats = {
        totalRequests: 0,
        successCount: 0,
        failureCount: 0,
        rejectedCount: 0,
        lastFailureTime: 0,
        lastSuccessTime: 0,
        avgLatencyMs: 0,
        stateChanges: 0,
    };
    private latencySum = 0;

    constructor(options: CircuitBreakerOptions) {
        this.options = options;
    }

    async execute<T>(fn: () => Promise<T>, fallback?: () => Promise<T>): Promise<T> {
        // Bulkhead check
        if (this.options.maxConcurrent && this.activeConcurrent >= this.options.maxConcurrent) {
            this.stats.rejectedCount++;
            this.options.onReject?.(this.options.name, 'max_concurrent');
            if (fallback) return fallback();
            throw new Error(
                `Circuit breaker ${this.options.name}: max concurrent requests reached (${this.options.maxConcurrent})`
            );
        }

        if (this.state === 'OPEN') {
            if (Date.now() - this.lastFailureTime > this.options.resetTimeout) {
                this.changeState('HALF_OPEN');
                this.halfOpenAttempted = false;
            } else {
                this.stats.rejectedCount++;
                this.options.onReject?.(this.options.name, 'circuit_open');
                if (fallback) return fallback();
                throw new Error(`Circuit breaker OPEN for ${this.options.name}`);
            }
        }

        // In HALF_OPEN, only allow one probe request
        if (this.state === 'HALF_OPEN' && this.halfOpenAttempted) {
            this.stats.rejectedCount++;
            this.options.onReject?.(this.options.name, 'half_open_probe');
            if (fallback) return fallback();
            throw new Error(
                `Circuit breaker HALF_OPEN for ${this.options.name}, probe in progress`
            );
        }

        if (this.state === 'HALF_OPEN') {
            this.halfOpenAttempted = true;
        }

        this.activeConcurrent++;
        this.stats.totalRequests++;
        const start = Date.now();

        try {
            const result = await fn();
            this.recordLatency(Date.now() - start);
            this.onSuccess();
            return result;
        } catch (error) {
            this.recordLatency(Date.now() - start);
            this.onFailure();
            if (fallback) return fallback();
            throw error;
        } finally {
            this.activeConcurrent--;
        }
    }

    private recordLatency(ms: number) {
        this.latencySum += ms;
        this.stats.avgLatencyMs = Math.round(this.latencySum / this.stats.totalRequests);
    }

    private changeState(newState: CircuitState) {
        const oldState = this.state;
        if (oldState === newState) return;
        this.state = newState;
        this.stats.stateChanges++;
        this.options.onStateChange?.(this.options.name, oldState, newState);
    }

    private onSuccess() {
        this.failureCount = 0;
        this.halfOpenAttempted = false;
        this.lastSuccessTime = Date.now();
        this.stats.successCount++;
        this.stats.lastSuccessTime = this.lastSuccessTime;
        if (this.state !== 'CLOSED') {
            this.changeState('CLOSED');
        }
    }

    private onFailure() {
        this.failureCount++;
        this.lastFailureTime = Date.now();
        this.stats.failureCount++;
        this.stats.lastFailureTime = this.lastFailureTime;
        if (this.failureCount >= this.options.failureThreshold) {
            this.changeState('OPEN');
            console.warn(
                `[CircuitBreaker] ${this.options.name} circuit OPENED after ${this.failureCount} failures`
            );
        }
    }

    getState(): { state: CircuitState; failures: number; name: string } {
        return { state: this.state, failures: this.failureCount, name: this.options.name };
    }

    getDetailedState(): CircuitStats & {
        state: CircuitState;
        name: string;
        activeConcurrent: number;
    } {
        return {
            ...this.stats,
            state: this.state,
            name: this.options.name,
            activeConcurrent: this.activeConcurrent,
        };
    }

    /**
     * Manually reset the circuit breaker to CLOSED state
     */
    reset(): void {
        this.failureCount = 0;
        this.halfOpenAttempted = false;
        this.changeState('CLOSED');
    }

    /**
     * Get success rate as a percentage (0-100)
     */
    getSuccessRate(): number {
        if (this.stats.totalRequests === 0) return 100;
        return Math.round((this.stats.successCount / this.stats.totalRequests) * 10000) / 100;
    }
}

// Pre-configured breakers for external services
export const breakers = {
    openai: new CircuitBreaker({ name: 'OpenAI', failureThreshold: 5, resetTimeout: 30000 }),
    anthropic: new CircuitBreaker({ name: 'Anthropic', failureThreshold: 5, resetTimeout: 30000 }),
    groq: new CircuitBreaker({ name: 'Groq', failureThreshold: 3, resetTimeout: 15000 }),
    qdrant: new CircuitBreaker({ name: 'Qdrant', failureThreshold: 3, resetTimeout: 20000 }),
    google: new CircuitBreaker({ name: 'Google', failureThreshold: 5, resetTimeout: 30000 }),
};

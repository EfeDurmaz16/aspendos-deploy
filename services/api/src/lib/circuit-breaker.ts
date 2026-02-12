/**
 * Circuit Breaker Pattern for external API calls.
 * Prevents cascading failures when upstream services (OpenAI, Qdrant, Groq) are down.
 *
 * States:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Service is down, fail fast without calling
 * - HALF_OPEN: Testing if service recovered
 */
type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

interface CircuitBreakerOptions {
    failureThreshold: number; // failures before opening
    resetTimeout: number; // ms before trying half-open
    name: string;
}

export class CircuitBreaker {
    private state: CircuitState = 'CLOSED';
    private failureCount = 0;
    private lastFailureTime = 0;
    private options: CircuitBreakerOptions;

    constructor(options: CircuitBreakerOptions) {
        this.options = options;
    }

    async execute<T>(fn: () => Promise<T>): Promise<T> {
        if (this.state === 'OPEN') {
            if (Date.now() - this.lastFailureTime > this.options.resetTimeout) {
                this.state = 'HALF_OPEN';
            } else {
                throw new Error(`Circuit breaker OPEN for ${this.options.name}`);
            }
        }

        try {
            const result = await fn();
            this.onSuccess();
            return result;
        } catch (error) {
            this.onFailure();
            throw error;
        }
    }

    private onSuccess() {
        this.failureCount = 0;
        this.state = 'CLOSED';
    }

    private onFailure() {
        this.failureCount++;
        this.lastFailureTime = Date.now();
        if (this.failureCount >= this.options.failureThreshold) {
            this.state = 'OPEN';
            console.warn(
                `[CircuitBreaker] ${this.options.name} circuit OPENED after ${this.failureCount} failures`
            );
        }
    }

    getState(): { state: CircuitState; failures: number; name: string } {
        return { state: this.state, failures: this.failureCount, name: this.options.name };
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

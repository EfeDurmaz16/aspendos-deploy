/**
 * Database Connection Pool Manager
 *
 * Provides connection pool monitoring, a database-specific circuit breaker,
 * and retry logic with exponential backoff for database operations.
 *
 * Features:
 * - Pool metrics tracking (active connections, idle, wait queue depth)
 * - Circuit breaker for database operations (separate from AI provider breakers)
 * - Connection timeout with exponential backoff retry
 * - Pool health status for readiness probes
 * - Connection validation (warm connections)
 */

import { prisma } from '@aspendos/db';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export type PoolHealthStatus = 'healthy' | 'degraded' | 'unhealthy';

export interface PoolMetrics {
    activeConnections: number;
    idleConnections: number;
    waitQueueDepth: number;
    totalQueriesExecuted: number;
    totalFailures: number;
    avgQueryTimeMs: number;
    lastActivityAt: number;
}

export interface PoolHealth {
    status: PoolHealthStatus;
    circuitState: CircuitState;
    consecutiveFailures: number;
    lastErrorMessage: string | null;
    lastHealthCheckAt: number;
    uptimeMs: number;
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const CIRCUIT_BREAKER_FAILURE_THRESHOLD = 5;
const CIRCUIT_BREAKER_RESET_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_RETRIES = 3;
const BASE_RETRY_DELAY_MS = 200;
const MAX_RETRY_DELAY_MS = 5_000;
const CONNECTION_VALIDATION_TIMEOUT_MS = 5_000;

// ---------------------------------------------------------------------------
// Internal State
// ---------------------------------------------------------------------------

let circuitState: CircuitState = 'CLOSED';
let consecutiveFailures = 0;
let lastFailureTime = 0;
let lastErrorMessage: string | null = null;
let halfOpenProbeInFlight = false;

let activeConnections = 0;
let waitQueueDepth = 0;
let totalQueriesExecuted = 0;
let totalFailures = 0;
let queryTimeSum = 0;
let lastActivityAt = 0;

const startedAt = Date.now();

// ---------------------------------------------------------------------------
// Circuit Breaker (database-specific)
// ---------------------------------------------------------------------------

function transitionTo(newState: CircuitState): void {
    if (circuitState === newState) return;
    const prev = circuitState;
    circuitState = newState;
    console.warn(`[DbPoolManager] Circuit ${prev} -> ${newState}`);
}

function recordSuccess(): void {
    consecutiveFailures = 0;
    halfOpenProbeInFlight = false;
    lastActivityAt = Date.now();
    totalQueriesExecuted++;
    if (circuitState !== 'CLOSED') {
        transitionTo('CLOSED');
    }
}

function recordFailure(error: unknown): void {
    consecutiveFailures++;
    totalFailures++;
    lastFailureTime = Date.now();
    lastActivityAt = Date.now();
    lastErrorMessage = error instanceof Error ? error.message : String(error);

    if (consecutiveFailures >= CIRCUIT_BREAKER_FAILURE_THRESHOLD) {
        transitionTo('OPEN');
    }
}

function canAttempt(): boolean {
    if (circuitState === 'CLOSED') return true;

    if (circuitState === 'OPEN') {
        if (Date.now() - lastFailureTime >= CIRCUIT_BREAKER_RESET_TIMEOUT_MS) {
            transitionTo('HALF_OPEN');
            halfOpenProbeInFlight = false;
            // fall through to HALF_OPEN logic
        } else {
            return false;
        }
    }

    // HALF_OPEN: allow a single probe
    if (circuitState === 'HALF_OPEN') {
        if (halfOpenProbeInFlight) return false;
        halfOpenProbeInFlight = true;
        return true;
    }

    return false;
}

// ---------------------------------------------------------------------------
// Retry with Exponential Backoff
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function computeDelay(attempt: number): number {
    const exponential = BASE_RETRY_DELAY_MS * Math.pow(2, attempt);
    const jitter = Math.random() * exponential * 0.3;
    return Math.min(exponential + jitter, MAX_RETRY_DELAY_MS);
}

/**
 * Execute a database operation with circuit-breaker protection and
 * exponential-backoff retry on transient failures.
 */
export async function withDatabaseRetry<T>(
    fn: () => Promise<T>,
    maxRetries: number = DEFAULT_MAX_RETRIES
): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        if (!canAttempt()) {
            throw new Error(
                `Database circuit breaker is ${circuitState} - failing fast (consecutive failures: ${consecutiveFailures})`
            );
        }

        activeConnections++;
        if (attempt > 0) {
            waitQueueDepth++;
        }

        const start = Date.now();
        try {
            const result = await fn();
            const elapsed = Date.now() - start;
            queryTimeSum += elapsed;
            recordSuccess();
            return result;
        } catch (error) {
            const elapsed = Date.now() - start;
            queryTimeSum += elapsed;
            lastError = error instanceof Error ? error : new Error(String(error));
            recordFailure(error);

            if (attempt < maxRetries && isRetryableDbError(lastError)) {
                const delay = computeDelay(attempt);
                await sleep(delay);
            } else {
                break;
            }
        } finally {
            activeConnections--;
            if (attempt > 0) {
                waitQueueDepth = Math.max(0, waitQueueDepth - 1);
            }
        }
    }

    throw lastError ?? new Error('Database operation failed after retries');
}

function isRetryableDbError(error: Error): boolean {
    const msg = error.message.toLowerCase();
    return (
        msg.includes('connection') ||
        msg.includes('timeout') ||
        msg.includes('deadlock') ||
        msg.includes('too many clients') ||
        msg.includes('econnrefused') ||
        msg.includes('econnreset') ||
        msg.includes('pool') ||
        msg.includes('serialization')
    );
}

// ---------------------------------------------------------------------------
// Connection Validation (Warm Connections)
// ---------------------------------------------------------------------------

/**
 * Validate the database connection by executing a lightweight query.
 * Returns latency in milliseconds or throws on failure.
 */
export async function validateConnection(): Promise<number> {
    const start = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(
        () => controller.abort(),
        CONNECTION_VALIDATION_TIMEOUT_MS
    );

    try {
        await prisma.$queryRawUnsafe('SELECT 1');
        const latency = Date.now() - start;
        recordSuccess();
        return latency;
    } catch (error) {
        recordFailure(error);
        throw error;
    } finally {
        clearTimeout(timeout);
    }
}

// ---------------------------------------------------------------------------
// Public API: Metrics & Health
// ---------------------------------------------------------------------------

/**
 * Return current pool metrics snapshot.
 */
export function getPoolMetrics(): PoolMetrics {
    const executed = totalQueriesExecuted || 1; // avoid division by zero
    return {
        activeConnections,
        idleConnections: Math.max(0, 10 - activeConnections), // estimated pool size of 10
        waitQueueDepth,
        totalQueriesExecuted,
        totalFailures,
        avgQueryTimeMs: Math.round(queryTimeSum / executed),
        lastActivityAt,
    };
}

/**
 * Return pool health status suitable for readiness probes.
 */
export function getPoolHealth(): PoolHealth {
    let status: PoolHealthStatus = 'healthy';

    if (circuitState === 'OPEN') {
        status = 'unhealthy';
    } else if (circuitState === 'HALF_OPEN' || consecutiveFailures > 0) {
        status = 'degraded';
    }

    return {
        status,
        circuitState,
        consecutiveFailures,
        lastErrorMessage,
        lastHealthCheckAt: Date.now(),
        uptimeMs: Date.now() - startedAt,
    };
}

// ---------------------------------------------------------------------------
// Test Helpers
// ---------------------------------------------------------------------------

/**
 * Reset all internal state. Exported for test use only.
 */
export function _forTestingReset(): void {
    circuitState = 'CLOSED';
    consecutiveFailures = 0;
    lastFailureTime = 0;
    lastErrorMessage = null;
    halfOpenProbeInFlight = false;
    activeConnections = 0;
    waitQueueDepth = 0;
    totalQueriesExecuted = 0;
    totalFailures = 0;
    queryTimeSum = 0;
    lastActivityAt = 0;
}

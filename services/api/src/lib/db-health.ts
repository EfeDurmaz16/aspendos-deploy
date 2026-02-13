/**
 * Database Health & Resilience Utilities
 *
 * Provides pool utilization tracking and a generic retry wrapper with
 * exponential backoff + jitter for database operations. Complements the
 * circuit-breaker logic in db-pool-manager.ts with focused, composable
 * helpers.
 *
 * Features:
 * - Pool utilization snapshot (estimated active vs. configured limit)
 * - Generic `withRetry` for any async operation with configurable backoff
 * - Exponential backoff with decorrelated jitter to avoid thundering herd
 */

import { checkDatabaseHealth, type DatabaseHealthResult } from '@aspendos/db';
import { getPoolMetrics, getPoolHealth, type PoolMetrics, type PoolHealth } from './db-pool-manager';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/**
 * Default connection pool size. Matches the Prisma default formula
 * (num_cpus * 2 + 1) with a reasonable server-side baseline of 20.
 * Override via the `connection_limit` DATABASE_URL query parameter.
 */
const DEFAULT_POOL_SIZE = 20;

const DEFAULT_MAX_RETRIES = 3;
const BASE_DELAY_MS = 200;
const MAX_DELAY_MS = 5_000;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PoolUtilization {
    /** Number of connections currently in use (estimated). */
    activeConnections: number;
    /** Configured or estimated maximum pool size. */
    poolSize: number;
    /** Utilization ratio between 0 and 1. */
    utilization: number;
    /** Human-readable status derived from utilization. */
    status: 'idle' | 'normal' | 'busy' | 'saturated';
    /** Total queries executed since process start. */
    totalQueriesExecuted: number;
    /** Total query failures since process start. */
    totalFailures: number;
    /** Average query duration in milliseconds. */
    avgQueryTimeMs: number;
    /** Circuit breaker state from the pool manager. */
    circuitState: string;
    /** Database health check result (only present when includeHealthCheck is true). */
    healthCheck?: DatabaseHealthResult;
}

export interface RetryOptions {
    /** Maximum number of retry attempts (default: 3). */
    maxRetries?: number;
    /** Base delay in milliseconds before the first retry (default: 200). */
    baseDelayMs?: number;
    /** Maximum delay cap in milliseconds (default: 5000). */
    maxDelayMs?: number;
    /** Custom predicate to decide if an error is retryable. Defaults to true for all errors. */
    isRetryable?: (error: Error) => boolean;
    /** Optional callback invoked before each retry with the attempt number and delay. */
    onRetry?: (attempt: number, delayMs: number, error: Error) => void;
}

// ---------------------------------------------------------------------------
// Backoff calculation
// ---------------------------------------------------------------------------

/**
 * Compute the delay before the next retry using decorrelated jitter.
 *
 * The algorithm uses: delay = min(maxDelay, random_between(base, lastDelay * 3))
 * This produces less correlated retry storms compared to standard full-jitter
 * while still spreading load.
 *
 * @internal Exported for testing purposes.
 */
export function computeBackoff(
    attempt: number,
    baseDelayMs: number = BASE_DELAY_MS,
    maxDelayMs: number = MAX_DELAY_MS
): number {
    // Decorrelated jitter: random between base and base * 2^attempt * 1.3
    const ceiling = baseDelayMs * Math.pow(2, attempt);
    const jitter = Math.random() * ceiling;
    return Math.min(baseDelayMs + jitter, maxDelayMs);
}

// ---------------------------------------------------------------------------
// Pool Utilization
// ---------------------------------------------------------------------------

/**
 * Return a snapshot of the current connection pool utilization.
 *
 * Combines metrics from the pool manager with an optional live health check.
 * Suitable for dashboards, alerting thresholds, and auto-scaling signals.
 *
 * @param options.poolSize     Override the assumed pool size (default: 20).
 * @param options.includeHealthCheck  Run a live SELECT 1 check (default: false).
 */
export async function checkPoolUtilization(options?: {
    poolSize?: number;
    includeHealthCheck?: boolean;
}): Promise<PoolUtilization> {
    const poolSize = options?.poolSize ?? DEFAULT_POOL_SIZE;
    const metrics: PoolMetrics = getPoolMetrics();
    const health: PoolHealth = getPoolHealth();

    const utilization = poolSize > 0
        ? Math.min(metrics.activeConnections / poolSize, 1)
        : 0;

    let status: PoolUtilization['status'];
    if (utilization === 0) {
        status = 'idle';
    } else if (utilization < 0.5) {
        status = 'normal';
    } else if (utilization < 0.85) {
        status = 'busy';
    } else {
        status = 'saturated';
    }

    const result: PoolUtilization = {
        activeConnections: metrics.activeConnections,
        poolSize,
        utilization: Math.round(utilization * 1000) / 1000, // 3 decimal places
        status,
        totalQueriesExecuted: metrics.totalQueriesExecuted,
        totalFailures: metrics.totalFailures,
        avgQueryTimeMs: metrics.avgQueryTimeMs,
        circuitState: health.circuitState,
    };

    if (options?.includeHealthCheck) {
        result.healthCheck = await checkDatabaseHealth();
    }

    return result;
}

// ---------------------------------------------------------------------------
// Generic Retry with Exponential Backoff
// ---------------------------------------------------------------------------

/**
 * Execute an async function with automatic retries and exponential backoff.
 *
 * Unlike `withDatabaseRetry` in db-pool-manager.ts (which is tightly coupled
 * to the circuit breaker), this is a general-purpose retry wrapper that can be
 * used for any async database operation or external call.
 *
 * @param fn          The async function to execute.
 * @param maxRetries  Maximum number of retries (default: 3). Pass 0 for no retries.
 * @param options     Additional retry configuration.
 * @returns           The result of the function.
 * @throws            The last error encountered after all retries are exhausted.
 *
 * @example
 * ```ts
 * const user = await withRetry(
 *   () => prisma.user.findUniqueOrThrow({ where: { id } }),
 *   3,
 *   { isRetryable: (err) => err.message.includes('connection') }
 * );
 * ```
 */
export async function withRetry<T>(
    fn: () => Promise<T>,
    maxRetries: number = DEFAULT_MAX_RETRIES,
    options?: Omit<RetryOptions, 'maxRetries'>
): Promise<T> {
    const baseDelay = options?.baseDelayMs ?? BASE_DELAY_MS;
    const maxDelay = options?.maxDelayMs ?? MAX_DELAY_MS;
    const isRetryable = options?.isRetryable ?? (() => true);
    const onRetry = options?.onRetry;

    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));

            // If we have retries left and the error is retryable, back off and retry
            if (attempt < maxRetries && isRetryable(lastError)) {
                const delay = computeBackoff(attempt, baseDelay, maxDelay);

                if (onRetry) {
                    onRetry(attempt + 1, delay, lastError);
                }

                await new Promise((resolve) => setTimeout(resolve, delay));
            } else {
                // Either no retries left or error is not retryable
                break;
            }
        }
    }

    throw lastError ?? new Error('Operation failed after retries');
}

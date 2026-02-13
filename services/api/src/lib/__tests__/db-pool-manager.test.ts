import { describe, expect, it, vi, beforeEach } from 'vitest';

// Mock @aspendos/db inline (no vi.hoisted)
vi.mock('@aspendos/db', () => ({
    prisma: {
        $queryRawUnsafe: vi.fn(),
    },
}));

import { prisma } from '@aspendos/db';
import {
    getPoolHealth,
    getPoolMetrics,
    withDatabaseRetry,
    validateConnection,
    _forTestingReset,
} from '../db-pool-manager';

const mockPrisma = prisma as any;

describe('Database Pool Manager', () => {
    beforeEach(() => {
        _forTestingReset();
        vi.clearAllMocks();
    });

    // -----------------------------------------------------------------------
    // Pool Metrics Tracking
    // -----------------------------------------------------------------------

    describe('getPoolMetrics', () => {
        it('should return zeroed metrics on init', () => {
            const metrics = getPoolMetrics();
            expect(metrics.activeConnections).toBe(0);
            expect(metrics.waitQueueDepth).toBe(0);
            expect(metrics.totalQueriesExecuted).toBe(0);
            expect(metrics.totalFailures).toBe(0);
            expect(metrics.avgQueryTimeMs).toBeGreaterThanOrEqual(0);
        });

        it('should track total queries executed after successful calls', async () => {
            await withDatabaseRetry(async () => 'result-1');
            await withDatabaseRetry(async () => 'result-2');
            await withDatabaseRetry(async () => 'result-3');

            const metrics = getPoolMetrics();
            expect(metrics.totalQueriesExecuted).toBe(3);
            expect(metrics.totalFailures).toBe(0);
        });

        it('should track failures', async () => {
            try {
                await withDatabaseRetry(async () => {
                    throw new Error('non-retryable failure');
                }, 0);
            } catch { /* expected */ }

            const metrics = getPoolMetrics();
            expect(metrics.totalFailures).toBe(1);
        });

        it('should report idle connections as pool size minus active', () => {
            const metrics = getPoolMetrics();
            expect(metrics.idleConnections).toBe(10); // default pool size estimate
        });

        it('should update lastActivityAt after operations', async () => {
            const before = Date.now();
            await withDatabaseRetry(async () => 'ok');
            const metrics = getPoolMetrics();
            expect(metrics.lastActivityAt).toBeGreaterThanOrEqual(before);
        });
    });

    // -----------------------------------------------------------------------
    // Circuit Breaker
    // -----------------------------------------------------------------------

    describe('circuit breaker', () => {
        it('should start in CLOSED state', () => {
            const health = getPoolHealth();
            expect(health.circuitState).toBe('CLOSED');
            expect(health.status).toBe('healthy');
        });

        it('should open after 5 consecutive failures', async () => {
            for (let i = 0; i < 5; i++) {
                try {
                    await withDatabaseRetry(async () => {
                        throw new Error('non-retryable db error');
                    }, 0);
                } catch { /* expected */ }
            }

            const health = getPoolHealth();
            expect(health.circuitState).toBe('OPEN');
            expect(health.status).toBe('unhealthy');
            expect(health.consecutiveFailures).toBe(5);
        });

        it('should fail fast when circuit is OPEN', async () => {
            // Force circuit open
            for (let i = 0; i < 5; i++) {
                try {
                    await withDatabaseRetry(async () => {
                        throw new Error('non-retryable');
                    }, 0);
                } catch { /* expected */ }
            }

            await expect(
                withDatabaseRetry(async () => 'should not run', 0)
            ).rejects.toThrow('circuit breaker is OPEN');
        });

        it('should reset to CLOSED on success', async () => {
            // Accumulate some failures (but below threshold)
            for (let i = 0; i < 3; i++) {
                try {
                    await withDatabaseRetry(async () => {
                        throw new Error('non-retryable');
                    }, 0);
                } catch { /* expected */ }
            }

            expect(getPoolHealth().consecutiveFailures).toBe(3);
            expect(getPoolHealth().circuitState).toBe('CLOSED');

            await withDatabaseRetry(async () => 'success');

            const health = getPoolHealth();
            expect(health.consecutiveFailures).toBe(0);
            expect(health.circuitState).toBe('CLOSED');
            expect(health.status).toBe('healthy');
        });

        it('should report degraded status when there are recent failures', async () => {
            try {
                await withDatabaseRetry(async () => {
                    throw new Error('non-retryable');
                }, 0);
            } catch { /* expected */ }

            const health = getPoolHealth();
            expect(health.status).toBe('degraded');
            expect(health.consecutiveFailures).toBe(1);
        });

        it('should track the last error message', async () => {
            try {
                await withDatabaseRetry(async () => {
                    throw new Error('unique db error 42');
                }, 0);
            } catch { /* expected */ }

            const health = getPoolHealth();
            expect(health.lastErrorMessage).toBe('unique db error 42');
        });
    });

    // -----------------------------------------------------------------------
    // Retry with Exponential Backoff
    // -----------------------------------------------------------------------

    describe('withDatabaseRetry', () => {
        it('should return the result on first success', async () => {
            const result = await withDatabaseRetry(async () => 'hello');
            expect(result).toBe('hello');
        });

        it('should retry on retryable errors and succeed', async () => {
            let attempts = 0;
            const result = await withDatabaseRetry(async () => {
                attempts++;
                if (attempts < 3) {
                    throw new Error('connection reset');
                }
                return 'recovered';
            }, 3);

            expect(result).toBe('recovered');
            expect(attempts).toBe(3);
        });

        it('should not retry non-retryable errors', async () => {
            let attempts = 0;

            try {
                await withDatabaseRetry(async () => {
                    attempts++;
                    throw new Error('unique constraint violation');
                }, 3);
            } catch { /* expected */ }

            expect(attempts).toBe(1);
        });

        it('should throw after exhausting all retries', async () => {
            await expect(
                withDatabaseRetry(async () => {
                    throw new Error('connection timeout');
                }, 2)
            ).rejects.toThrow('connection timeout');
        });

        it('should respect maxRetries parameter', async () => {
            let attempts = 0;

            try {
                await withDatabaseRetry(async () => {
                    attempts++;
                    throw new Error('connection refused econnrefused');
                }, 1);
            } catch { /* expected */ }

            // attempt 0 + 1 retry = 2 total attempts
            expect(attempts).toBe(2);
        });

        it('should handle async functions that resolve with various types', async () => {
            const num = await withDatabaseRetry(async () => 42);
            expect(num).toBe(42);

            const obj = await withDatabaseRetry(async () => ({ id: 1, name: 'test' }));
            expect(obj).toEqual({ id: 1, name: 'test' });

            const arr = await withDatabaseRetry(async () => [1, 2, 3]);
            expect(arr).toEqual([1, 2, 3]);
        });
    });

    // -----------------------------------------------------------------------
    // Pool Health Status
    // -----------------------------------------------------------------------

    describe('getPoolHealth', () => {
        it('should return healthy status initially', () => {
            const health = getPoolHealth();
            expect(health.status).toBe('healthy');
            expect(health.circuitState).toBe('CLOSED');
            expect(health.consecutiveFailures).toBe(0);
            expect(health.lastErrorMessage).toBeNull();
            expect(health.uptimeMs).toBeGreaterThanOrEqual(0);
            expect(health.lastHealthCheckAt).toBeGreaterThan(0);
        });

        it('should report unhealthy when circuit is OPEN', async () => {
            for (let i = 0; i < 5; i++) {
                try {
                    await withDatabaseRetry(async () => {
                        throw new Error('non-retryable');
                    }, 0);
                } catch { /* expected */ }
            }

            const health = getPoolHealth();
            expect(health.status).toBe('unhealthy');
        });

        it('should include uptime', () => {
            const health = getPoolHealth();
            expect(typeof health.uptimeMs).toBe('number');
            expect(health.uptimeMs).toBeGreaterThanOrEqual(0);
        });
    });

    // -----------------------------------------------------------------------
    // Connection Validation
    // -----------------------------------------------------------------------

    describe('validateConnection', () => {
        it('should return latency on successful validation', async () => {
            mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([{ '?column?': 1 }]);

            const latency = await validateConnection();
            expect(latency).toBeGreaterThanOrEqual(0);
            expect(mockPrisma.$queryRawUnsafe).toHaveBeenCalledWith('SELECT 1');
        });

        it('should record a success in metrics after validation', async () => {
            mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([{ '?column?': 1 }]);

            await validateConnection();

            const metrics = getPoolMetrics();
            expect(metrics.totalQueriesExecuted).toBe(1);
        });

        it('should record a failure when validation fails', async () => {
            mockPrisma.$queryRawUnsafe.mockRejectedValueOnce(
                new Error('database is not available')
            );

            await expect(validateConnection()).rejects.toThrow(
                'database is not available'
            );

            const health = getPoolHealth();
            expect(health.consecutiveFailures).toBe(1);
            expect(health.lastErrorMessage).toBe('database is not available');
        });
    });

    // -----------------------------------------------------------------------
    // Test Reset Helper
    // -----------------------------------------------------------------------

    describe('_forTestingReset', () => {
        it('should fully reset internal state', async () => {
            // Create some state
            for (let i = 0; i < 5; i++) {
                try {
                    await withDatabaseRetry(async () => {
                        throw new Error('non-retryable');
                    }, 0);
                } catch { /* expected */ }
            }
            expect(getPoolHealth().circuitState).toBe('OPEN');

            _forTestingReset();

            const health = getPoolHealth();
            expect(health.circuitState).toBe('CLOSED');
            expect(health.consecutiveFailures).toBe(0);
            expect(health.status).toBe('healthy');
            expect(health.lastErrorMessage).toBeNull();

            const metrics = getPoolMetrics();
            expect(metrics.totalQueriesExecuted).toBe(0);
            expect(metrics.totalFailures).toBe(0);
        });
    });
});

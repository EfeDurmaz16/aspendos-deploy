import { describe, expect, it, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@aspendos/db', () => ({
    prisma: {
        $queryRaw: vi.fn(),
    },
    checkDatabaseHealth: vi.fn(),
}));

vi.mock('../db-pool-manager', () => ({
    getPoolMetrics: vi.fn(),
    getPoolHealth: vi.fn(),
}));

import { checkDatabaseHealth } from '@aspendos/db';
import { getPoolMetrics, getPoolHealth } from '../db-pool-manager';
import {
    checkPoolUtilization,
    withRetry,
    computeBackoff,
} from '../db-health';

const mockCheckDatabaseHealth = checkDatabaseHealth as ReturnType<typeof vi.fn>;
const mockGetPoolMetrics = getPoolMetrics as ReturnType<typeof vi.fn>;
const mockGetPoolHealth = getPoolHealth as ReturnType<typeof vi.fn>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function defaultMetrics(overrides?: Partial<ReturnType<typeof getPoolMetrics>>) {
    return {
        activeConnections: 0,
        idleConnections: 20,
        waitQueueDepth: 0,
        totalQueriesExecuted: 0,
        totalFailures: 0,
        avgQueryTimeMs: 0,
        lastActivityAt: 0,
        ...overrides,
    };
}

function defaultHealth(overrides?: Partial<ReturnType<typeof getPoolHealth>>) {
    return {
        status: 'healthy' as const,
        circuitState: 'CLOSED',
        consecutiveFailures: 0,
        lastErrorMessage: null,
        lastHealthCheckAt: Date.now(),
        uptimeMs: 1000,
        ...overrides,
    };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('db-health', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockGetPoolMetrics.mockReturnValue(defaultMetrics());
        mockGetPoolHealth.mockReturnValue(defaultHealth());
    });

    // -------------------------------------------------------------------
    // computeBackoff
    // -------------------------------------------------------------------

    describe('computeBackoff', () => {
        it('should return a value between base and max delay', () => {
            for (let attempt = 0; attempt < 10; attempt++) {
                const delay = computeBackoff(attempt, 200, 5000);
                expect(delay).toBeGreaterThanOrEqual(200);
                expect(delay).toBeLessThanOrEqual(5000);
            }
        });

        it('should respect the max delay cap', () => {
            // With a very high attempt number, delay must still be capped
            const delay = computeBackoff(20, 200, 3000);
            expect(delay).toBeLessThanOrEqual(3000);
        });

        it('should always be at least the base delay', () => {
            for (let i = 0; i < 50; i++) {
                const delay = computeBackoff(0, 100, 5000);
                expect(delay).toBeGreaterThanOrEqual(100);
            }
        });

        it('should produce varying values (jitter)', () => {
            const delays = new Set<number>();
            for (let i = 0; i < 20; i++) {
                delays.add(computeBackoff(2, 200, 5000));
            }
            // With 20 samples and random jitter, we should see at least 2 unique values
            expect(delays.size).toBeGreaterThan(1);
        });
    });

    // -------------------------------------------------------------------
    // withRetry
    // -------------------------------------------------------------------

    describe('withRetry', () => {
        it('should return the result on first success', async () => {
            const result = await withRetry(async () => 'hello', 3);
            expect(result).toBe('hello');
        });

        it('should return results of various types', async () => {
            const num = await withRetry(async () => 42);
            expect(num).toBe(42);

            const obj = await withRetry(async () => ({ key: 'value' }));
            expect(obj).toEqual({ key: 'value' });

            const arr = await withRetry(async () => [1, 2, 3]);
            expect(arr).toEqual([1, 2, 3]);

            const nul = await withRetry(async () => null);
            expect(nul).toBeNull();
        });

        it('should retry on failure and eventually succeed', async () => {
            let attempts = 0;
            const result = await withRetry(
                async () => {
                    attempts++;
                    if (attempts < 3) {
                        throw new Error('transient failure');
                    }
                    return 'recovered';
                },
                3
            );

            expect(result).toBe('recovered');
            expect(attempts).toBe(3);
        });

        it('should throw after exhausting all retries', async () => {
            await expect(
                withRetry(
                    async () => {
                        throw new Error('persistent failure');
                    },
                    2
                )
            ).rejects.toThrow('persistent failure');
        });

        it('should not retry when maxRetries is 0', async () => {
            let attempts = 0;

            await expect(
                withRetry(
                    async () => {
                        attempts++;
                        throw new Error('fail');
                    },
                    0
                )
            ).rejects.toThrow('fail');

            expect(attempts).toBe(1);
        });

        it('should respect the isRetryable predicate', async () => {
            let attempts = 0;

            await expect(
                withRetry(
                    async () => {
                        attempts++;
                        throw new Error('not retryable');
                    },
                    5,
                    {
                        isRetryable: (err) => err.message.includes('transient'),
                    }
                )
            ).rejects.toThrow('not retryable');

            // Should only attempt once since the error is not retryable
            expect(attempts).toBe(1);
        });

        it('should retry when isRetryable returns true', async () => {
            let attempts = 0;

            const result = await withRetry(
                async () => {
                    attempts++;
                    if (attempts < 3) {
                        throw new Error('transient error');
                    }
                    return 'ok';
                },
                5,
                {
                    isRetryable: (err) => err.message.includes('transient'),
                }
            );

            expect(result).toBe('ok');
            expect(attempts).toBe(3);
        });

        it('should call onRetry callback before each retry', async () => {
            const onRetry = vi.fn();
            let attempts = 0;

            await withRetry(
                async () => {
                    attempts++;
                    if (attempts < 3) {
                        throw new Error('retry me');
                    }
                    return 'done';
                },
                3,
                { onRetry }
            );

            // Two retries occurred (attempt 1 fails, attempt 2 fails, attempt 3 succeeds)
            expect(onRetry).toHaveBeenCalledTimes(2);
            expect(onRetry).toHaveBeenNthCalledWith(
                1,
                1,
                expect.any(Number),
                expect.any(Error)
            );
            expect(onRetry).toHaveBeenNthCalledWith(
                2,
                2,
                expect.any(Number),
                expect.any(Error)
            );
        });

        it('should handle non-Error thrown values', async () => {
            await expect(
                withRetry(
                    async () => {
                        throw 'string error';
                    },
                    0
                )
            ).rejects.toThrow('string error');
        });

        it('should respect custom baseDelayMs and maxDelayMs', async () => {
            const startTime = Date.now();
            let attempts = 0;

            await expect(
                withRetry(
                    async () => {
                        attempts++;
                        throw new Error('fail');
                    },
                    1,
                    {
                        baseDelayMs: 50,
                        maxDelayMs: 100,
                    }
                )
            ).rejects.toThrow('fail');

            const elapsed = Date.now() - startTime;
            expect(attempts).toBe(2);
            // Should have waited at least 50ms (baseDelay) but not excessively long
            expect(elapsed).toBeGreaterThanOrEqual(40); // slight tolerance
            expect(elapsed).toBeLessThan(2000);
        });

        it('should count total attempts as maxRetries + 1', async () => {
            let attempts = 0;

            try {
                await withRetry(
                    async () => {
                        attempts++;
                        throw new Error('always fails');
                    },
                    4
                );
            } catch {
                /* expected */
            }

            // maxRetries=4 means: 1 initial + 4 retries = 5 total attempts
            expect(attempts).toBe(5);
        });
    });

    // -------------------------------------------------------------------
    // checkPoolUtilization
    // -------------------------------------------------------------------

    describe('checkPoolUtilization', () => {
        it('should return idle status when no connections are active', async () => {
            mockGetPoolMetrics.mockReturnValue(defaultMetrics({ activeConnections: 0 }));

            const util = await checkPoolUtilization();

            expect(util.status).toBe('idle');
            expect(util.utilization).toBe(0);
            expect(util.poolSize).toBe(20);
            expect(util.activeConnections).toBe(0);
        });

        it('should return normal status at low utilization', async () => {
            mockGetPoolMetrics.mockReturnValue(defaultMetrics({ activeConnections: 5 }));

            const util = await checkPoolUtilization({ poolSize: 20 });

            expect(util.status).toBe('normal');
            expect(util.utilization).toBe(0.25);
        });

        it('should return busy status at moderate utilization', async () => {
            mockGetPoolMetrics.mockReturnValue(defaultMetrics({ activeConnections: 12 }));

            const util = await checkPoolUtilization({ poolSize: 20 });

            expect(util.status).toBe('busy');
            expect(util.utilization).toBe(0.6);
        });

        it('should return saturated status at high utilization', async () => {
            mockGetPoolMetrics.mockReturnValue(defaultMetrics({ activeConnections: 18 }));

            const util = await checkPoolUtilization({ poolSize: 20 });

            expect(util.status).toBe('saturated');
            expect(util.utilization).toBe(0.9);
        });

        it('should cap utilization at 1.0 when active exceeds pool size', async () => {
            mockGetPoolMetrics.mockReturnValue(defaultMetrics({ activeConnections: 30 }));

            const util = await checkPoolUtilization({ poolSize: 20 });

            expect(util.utilization).toBe(1);
            expect(util.status).toBe('saturated');
        });

        it('should use default pool size of 20 when not specified', async () => {
            mockGetPoolMetrics.mockReturnValue(defaultMetrics({ activeConnections: 10 }));

            const util = await checkPoolUtilization();

            expect(util.poolSize).toBe(20);
            expect(util.utilization).toBe(0.5);
            expect(util.status).toBe('busy');
        });

        it('should accept a custom pool size', async () => {
            mockGetPoolMetrics.mockReturnValue(defaultMetrics({ activeConnections: 5 }));

            const util = await checkPoolUtilization({ poolSize: 10 });

            expect(util.poolSize).toBe(10);
            expect(util.utilization).toBe(0.5);
        });

        it('should include circuit breaker state from pool health', async () => {
            mockGetPoolHealth.mockReturnValue(defaultHealth({ circuitState: 'OPEN' }));

            const util = await checkPoolUtilization();

            expect(util.circuitState).toBe('OPEN');
        });

        it('should include query metrics from pool manager', async () => {
            mockGetPoolMetrics.mockReturnValue(
                defaultMetrics({
                    totalQueriesExecuted: 1500,
                    totalFailures: 12,
                    avgQueryTimeMs: 45,
                })
            );

            const util = await checkPoolUtilization();

            expect(util.totalQueriesExecuted).toBe(1500);
            expect(util.totalFailures).toBe(12);
            expect(util.avgQueryTimeMs).toBe(45);
        });

        it('should not include healthCheck by default', async () => {
            const util = await checkPoolUtilization();

            expect(util.healthCheck).toBeUndefined();
            expect(mockCheckDatabaseHealth).not.toHaveBeenCalled();
        });

        it('should include healthCheck when includeHealthCheck is true', async () => {
            mockCheckDatabaseHealth.mockResolvedValue({
                healthy: true,
                latencyMs: 3,
            });

            const util = await checkPoolUtilization({ includeHealthCheck: true });

            expect(util.healthCheck).toBeDefined();
            expect(util.healthCheck!.healthy).toBe(true);
            expect(util.healthCheck!.latencyMs).toBe(3);
            expect(mockCheckDatabaseHealth).toHaveBeenCalledTimes(1);
        });

        it('should include failed healthCheck when database is down', async () => {
            mockCheckDatabaseHealth.mockResolvedValue({
                healthy: false,
                latencyMs: 5001,
                error: 'Health check timed out after 5000ms',
            });

            const util = await checkPoolUtilization({ includeHealthCheck: true });

            expect(util.healthCheck).toBeDefined();
            expect(util.healthCheck!.healthy).toBe(false);
            expect(util.healthCheck!.error).toContain('timed out');
        });

        it('should handle zero pool size gracefully', async () => {
            mockGetPoolMetrics.mockReturnValue(defaultMetrics({ activeConnections: 5 }));

            const util = await checkPoolUtilization({ poolSize: 0 });

            expect(util.utilization).toBe(0);
            expect(util.status).toBe('idle');
        });

        it('should round utilization to 3 decimal places', async () => {
            mockGetPoolMetrics.mockReturnValue(defaultMetrics({ activeConnections: 1 }));

            const util = await checkPoolUtilization({ poolSize: 3 });

            // 1/3 = 0.33333... should round to 0.333
            expect(util.utilization).toBe(0.333);
        });
    });
});

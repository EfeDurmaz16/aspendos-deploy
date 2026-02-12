import { describe, expect, it, vi } from 'vitest';
import { CircuitBreaker } from '../circuit-breaker';

describe('CircuitBreaker', () => {
    describe('basic operation', () => {
        it('should start in CLOSED state', () => {
            const cb = new CircuitBreaker({
                name: 'test',
                failureThreshold: 3,
                resetTimeout: 1000,
            });
            expect(cb.getState().state).toBe('CLOSED');
            expect(cb.getState().failures).toBe(0);
        });

        it('should pass through successful calls', async () => {
            const cb = new CircuitBreaker({
                name: 'test',
                failureThreshold: 3,
                resetTimeout: 1000,
            });
            const result = await cb.execute(async () => 42);
            expect(result).toBe(42);
            expect(cb.getState().state).toBe('CLOSED');
        });

        it('should track failures', async () => {
            const cb = new CircuitBreaker({
                name: 'test',
                failureThreshold: 3,
                resetTimeout: 1000,
            });
            try {
                await cb.execute(async () => {
                    throw new Error('fail');
                });
            } catch {
                /* expected */
            }
            expect(cb.getState().failures).toBe(1);
            expect(cb.getState().state).toBe('CLOSED');
        });

        it('should open after failure threshold', async () => {
            const cb = new CircuitBreaker({
                name: 'test',
                failureThreshold: 2,
                resetTimeout: 1000,
            });
            const failFn = async () => {
                throw new Error('fail');
            };

            try {
                await cb.execute(failFn);
            } catch {
                /* expected */
            }
            try {
                await cb.execute(failFn);
            } catch {
                /* expected */
            }

            expect(cb.getState().state).toBe('OPEN');
            expect(cb.getState().failures).toBe(2);
        });

        it('should reject calls when OPEN', async () => {
            const cb = new CircuitBreaker({
                name: 'test',
                failureThreshold: 1,
                resetTimeout: 60000,
            });
            try {
                await cb.execute(async () => {
                    throw new Error('fail');
                });
            } catch {
                /* expected */
            }

            await expect(cb.execute(async () => 'ok')).rejects.toThrow('Circuit breaker OPEN');
        });

        it('should reset failures on success', async () => {
            const cb = new CircuitBreaker({
                name: 'test',
                failureThreshold: 3,
                resetTimeout: 1000,
            });

            try {
                await cb.execute(async () => {
                    throw new Error('fail');
                });
            } catch {
                /* expected */
            }
            expect(cb.getState().failures).toBe(1);

            await cb.execute(async () => 'ok');
            expect(cb.getState().failures).toBe(0);
        });
    });

    describe('half-open state', () => {
        it('should transition to HALF_OPEN after reset timeout', async () => {
            const cb = new CircuitBreaker({ name: 'test', failureThreshold: 1, resetTimeout: 50 });

            try {
                await cb.execute(async () => {
                    throw new Error('fail');
                });
            } catch {
                /* expected */
            }
            expect(cb.getState().state).toBe('OPEN');

            await new Promise((r) => setTimeout(r, 60));

            // Next call should succeed - circuit in HALF_OPEN allows probe
            const result = await cb.execute(async () => 'recovered');
            expect(result).toBe('recovered');
            expect(cb.getState().state).toBe('CLOSED');
        });

        it('should re-open on failure during HALF_OPEN', async () => {
            const cb = new CircuitBreaker({ name: 'test', failureThreshold: 1, resetTimeout: 50 });

            try {
                await cb.execute(async () => {
                    throw new Error('fail');
                });
            } catch {
                /* expected */
            }
            await new Promise((r) => setTimeout(r, 60));

            try {
                await cb.execute(async () => {
                    throw new Error('fail again');
                });
            } catch {
                /* expected */
            }
            expect(cb.getState().state).toBe('OPEN');
        });
    });

    describe('fallback support', () => {
        it('should use fallback when circuit is OPEN', async () => {
            const cb = new CircuitBreaker({
                name: 'test',
                failureThreshold: 1,
                resetTimeout: 60000,
            });

            try {
                await cb.execute(async () => {
                    throw new Error('fail');
                });
            } catch {
                /* expected */
            }

            const result = await cb.execute(
                async () => 'primary',
                async () => 'fallback'
            );
            expect(result).toBe('fallback');
        });

        it('should use fallback when execution fails', async () => {
            const cb = new CircuitBreaker({
                name: 'test',
                failureThreshold: 5,
                resetTimeout: 1000,
            });

            const result = await cb.execute(
                async () => {
                    throw new Error('fail');
                },
                async () => 'fallback-value'
            );
            expect(result).toBe('fallback-value');
        });
    });

    describe('bulkhead pattern', () => {
        it('should reject when max concurrent is reached', async () => {
            const cb = new CircuitBreaker({
                name: 'test',
                failureThreshold: 5,
                resetTimeout: 1000,
                maxConcurrent: 2,
            });

            // Start 2 slow operations
            const slow1 = cb.execute(() => new Promise((r) => setTimeout(() => r('a'), 200)));
            const slow2 = cb.execute(() => new Promise((r) => setTimeout(() => r('b'), 200)));

            // Third should be rejected
            await expect(cb.execute(async () => 'c')).rejects.toThrow('max concurrent');

            await Promise.all([slow1, slow2]);
        });

        it('should allow new requests after concurrent ones complete', async () => {
            const cb = new CircuitBreaker({
                name: 'test',
                failureThreshold: 5,
                resetTimeout: 1000,
                maxConcurrent: 1,
            });

            const result1 = await cb.execute(async () => 'first');
            expect(result1).toBe('first');

            const result2 = await cb.execute(async () => 'second');
            expect(result2).toBe('second');
        });

        it('should use fallback when bulkhead is full', async () => {
            const cb = new CircuitBreaker({
                name: 'test',
                failureThreshold: 5,
                resetTimeout: 1000,
                maxConcurrent: 1,
            });

            const slow = cb.execute(() => new Promise((r) => setTimeout(() => r('slow'), 200)));

            const result = await cb.execute(
                async () => 'primary',
                async () => 'bulkhead-fallback'
            );
            expect(result).toBe('bulkhead-fallback');

            await slow;
        });
    });

    describe('event callbacks', () => {
        it('should call onStateChange', async () => {
            const stateChanges: Array<{ from: string; to: string }> = [];
            const cb = new CircuitBreaker({
                name: 'test',
                failureThreshold: 1,
                resetTimeout: 50,
                onStateChange: (_name, from, to) => stateChanges.push({ from, to }),
            });

            try {
                await cb.execute(async () => {
                    throw new Error('fail');
                });
            } catch {
                /* expected */
            }
            expect(stateChanges).toEqual([{ from: 'CLOSED', to: 'OPEN' }]);

            await new Promise((r) => setTimeout(r, 60));
            await cb.execute(async () => 'ok');

            expect(stateChanges).toEqual([
                { from: 'CLOSED', to: 'OPEN' },
                { from: 'OPEN', to: 'HALF_OPEN' },
                { from: 'HALF_OPEN', to: 'CLOSED' },
            ]);
        });

        it('should call onReject when circuit is OPEN', async () => {
            const rejections: string[] = [];
            const cb = new CircuitBreaker({
                name: 'test',
                failureThreshold: 1,
                resetTimeout: 60000,
                onReject: (_name, reason) => rejections.push(reason),
            });

            try {
                await cb.execute(async () => {
                    throw new Error('fail');
                });
            } catch {
                /* expected */
            }
            try {
                await cb.execute(async () => 'ok');
            } catch {
                /* expected */
            }

            expect(rejections).toContain('circuit_open');
        });
    });

    describe('statistics', () => {
        it('should track detailed stats', async () => {
            const cb = new CircuitBreaker({
                name: 'test',
                failureThreshold: 5,
                resetTimeout: 1000,
            });

            await cb.execute(async () => 'ok');
            await cb.execute(async () => 'ok');
            try {
                await cb.execute(async () => {
                    throw new Error('fail');
                });
            } catch {
                /* expected */
            }

            const stats = cb.getDetailedState();
            expect(stats.totalRequests).toBe(3);
            expect(stats.successCount).toBe(2);
            expect(stats.failureCount).toBe(1);
            expect(stats.avgLatencyMs).toBeGreaterThanOrEqual(0);
        });

        it('should calculate success rate', async () => {
            const cb = new CircuitBreaker({
                name: 'test',
                failureThreshold: 5,
                resetTimeout: 1000,
            });

            expect(cb.getSuccessRate()).toBe(100); // No requests yet

            await cb.execute(async () => 'ok');
            try {
                await cb.execute(async () => {
                    throw new Error('fail');
                });
            } catch {
                /* expected */
            }

            expect(cb.getSuccessRate()).toBe(50);
        });

        it('should track rejected requests', async () => {
            const cb = new CircuitBreaker({
                name: 'test',
                failureThreshold: 1,
                resetTimeout: 60000,
            });

            try {
                await cb.execute(async () => {
                    throw new Error('fail');
                });
            } catch {
                /* expected */
            }
            try {
                await cb.execute(async () => 'ok');
            } catch {
                /* expected */
            }
            try {
                await cb.execute(async () => 'ok');
            } catch {
                /* expected */
            }

            const stats = cb.getDetailedState();
            expect(stats.rejectedCount).toBe(2);
        });
    });

    describe('manual reset', () => {
        it('should reset to CLOSED', async () => {
            const cb = new CircuitBreaker({
                name: 'test',
                failureThreshold: 1,
                resetTimeout: 60000,
            });

            try {
                await cb.execute(async () => {
                    throw new Error('fail');
                });
            } catch {
                /* expected */
            }
            expect(cb.getState().state).toBe('OPEN');

            cb.reset();
            expect(cb.getState().state).toBe('CLOSED');
            expect(cb.getState().failures).toBe(0);

            const result = await cb.execute(async () => 'after-reset');
            expect(result).toBe('after-reset');
        });
    });

    describe('name', () => {
        it('should include name in state', () => {
            const cb = new CircuitBreaker({
                name: 'MyService',
                failureThreshold: 3,
                resetTimeout: 1000,
            });
            expect(cb.getState().name).toBe('MyService');
        });

        it('should include name in error messages', async () => {
            const cb = new CircuitBreaker({
                name: 'OpenAI',
                failureThreshold: 1,
                resetTimeout: 60000,
            });
            try {
                await cb.execute(async () => {
                    throw new Error('fail');
                });
            } catch {
                /* expected */
            }
            await expect(cb.execute(async () => 'ok')).rejects.toThrow('OpenAI');
        });
    });
});

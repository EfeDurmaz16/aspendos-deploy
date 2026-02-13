import { beforeEach, describe, expect, it } from 'vitest';
import {
    clearChaos_forTesting,
    type FaultTarget,
    getActiveFaults,
    getFaultConfig,
    getRecoveryTime,
    getResilienceReport,
    getResilienceScore,
    injectFault,
    isFaultActive,
    recordRecovery,
    removeAllFaults,
    removeFault,
    runResilienceTest,
    simulateError,
    simulateLatency,
    simulateResourceExhaustion,
    simulateTimeout,
} from '../chaos-testing';

describe('Chaos Testing Framework', () => {
    beforeEach(() => {
        clearChaos_forTesting();
    });

    describe('injectFault', () => {
        it('should inject a fault and return fault ID', () => {
            const faultId = injectFault('database', 'latency', {
                minMs: 100,
                maxMs: 500,
            });

            expect(faultId).toMatch(/^fault_\d+$/);
        });

        it('should inject fault with empty config', () => {
            const faultId = injectFault('cache', 'error');

            expect(faultId).toMatch(/^fault_\d+$/);
            const faults = getActiveFaults();
            expect(faults).toHaveLength(1);
            expect(faults[0].config).toEqual({});
        });

        it('should generate unique fault IDs', () => {
            const id1 = injectFault('database', 'latency');
            const id2 = injectFault('cache', 'error');
            const id3 = injectFault('ai_provider', 'timeout');

            expect(id1).not.toBe(id2);
            expect(id2).not.toBe(id3);
            expect(id1).not.toBe(id3);
        });

        it('should store fault with correct metadata', () => {
            const beforeTime = Date.now();
            const faultId = injectFault('webhook', 'network_partition', {
                partition: true,
            });
            const afterTime = Date.now();

            const faults = getActiveFaults();
            expect(faults).toHaveLength(1);
            expect(faults[0].id).toBe(faultId);
            expect(faults[0].target).toBe('webhook');
            expect(faults[0].type).toBe('network_partition');
            expect(faults[0].config).toEqual({ partition: true });
            expect(faults[0].injectedAt).toBeGreaterThanOrEqual(beforeTime);
            expect(faults[0].injectedAt).toBeLessThanOrEqual(afterTime);
        });
    });

    describe('removeFault', () => {
        it('should remove a specific fault', () => {
            const faultId = injectFault('database', 'latency');

            const removed = removeFault(faultId);

            expect(removed).toBe(true);
            expect(getActiveFaults()).toHaveLength(0);
        });

        it('should return false for non-existent fault', () => {
            const removed = removeFault('fault_999');

            expect(removed).toBe(false);
        });

        it('should only remove specified fault', () => {
            const id1 = injectFault('database', 'latency');
            const id2 = injectFault('cache', 'error');
            const id3 = injectFault('ai_provider', 'timeout');

            removeFault(id2);

            const faults = getActiveFaults();
            expect(faults).toHaveLength(2);
            expect(faults.map((f) => f.id)).toContain(id1);
            expect(faults.map((f) => f.id)).toContain(id3);
            expect(faults.map((f) => f.id)).not.toContain(id2);
        });
    });

    describe('removeAllFaults', () => {
        it('should remove all active faults', () => {
            injectFault('database', 'latency');
            injectFault('cache', 'error');
            injectFault('ai_provider', 'timeout');

            removeAllFaults();

            expect(getActiveFaults()).toHaveLength(0);
        });

        it('should work when no faults exist', () => {
            removeAllFaults();

            expect(getActiveFaults()).toHaveLength(0);
        });
    });

    describe('getActiveFaults', () => {
        it('should return empty array when no faults', () => {
            expect(getActiveFaults()).toEqual([]);
        });

        it('should return all active faults', () => {
            injectFault('database', 'latency');
            injectFault('cache', 'error');
            injectFault('ai_provider', 'timeout');

            const faults = getActiveFaults();

            expect(faults).toHaveLength(3);
            expect(faults.map((f) => f.target)).toContain('database');
            expect(faults.map((f) => f.target)).toContain('cache');
            expect(faults.map((f) => f.target)).toContain('ai_provider');
        });

        it('should return faults with complete information', () => {
            injectFault('memory_store', 'data_corruption', { corruptionRate: 0.1 });

            const faults = getActiveFaults();

            expect(faults[0]).toHaveProperty('id');
            expect(faults[0]).toHaveProperty('target');
            expect(faults[0]).toHaveProperty('type');
            expect(faults[0]).toHaveProperty('config');
            expect(faults[0]).toHaveProperty('injectedAt');
        });
    });

    describe('isFaultActive', () => {
        it('should return false when no faults on target', () => {
            expect(isFaultActive('database')).toBe(false);
        });

        it('should return true when fault exists on target', () => {
            injectFault('database', 'latency');

            expect(isFaultActive('database')).toBe(true);
        });

        it('should return false for different target', () => {
            injectFault('database', 'latency');

            expect(isFaultActive('cache')).toBe(false);
        });

        it('should handle multiple faults on same target', () => {
            injectFault('database', 'latency');
            injectFault('database', 'error');

            expect(isFaultActive('database')).toBe(true);
        });
    });

    describe('getFaultConfig', () => {
        it('should return null when no fault on target', () => {
            expect(getFaultConfig('database')).toBeNull();
        });

        it('should return fault config for target', () => {
            const config = { minMs: 100, maxMs: 500 };
            injectFault('database', 'latency', config);

            expect(getFaultConfig('database')).toEqual(config);
        });

        it('should return first fault config when multiple faults', () => {
            const config1 = { minMs: 100, maxMs: 500 };
            const config2 = { errorRate: 0.5 };
            injectFault('database', 'latency', config1);
            injectFault('database', 'error', config2);

            const result = getFaultConfig('database');
            expect(result).toEqual(config1);
        });

        it('should return empty config when fault has no config', () => {
            injectFault('cache', 'error');

            expect(getFaultConfig('cache')).toEqual({});
        });
    });

    describe('simulateLatency', () => {
        it('should inject latency fault with correct config', () => {
            const faultId = simulateLatency('ai_provider', 200, 1000);

            expect(faultId).toMatch(/^fault_\d+$/);
            const config = getFaultConfig('ai_provider');
            expect(config).toEqual({ minMs: 200, maxMs: 1000 });
        });

        it('should create fault with latency type', () => {
            simulateLatency('webhook', 50, 150);

            const faults = getActiveFaults();
            expect(faults[0].type).toBe('latency');
        });
    });

    describe('simulateError', () => {
        it('should inject error fault with rate', () => {
            const faultId = simulateError('database', 0.3);

            expect(faultId).toMatch(/^fault_\d+$/);
            const config = getFaultConfig('database');
            expect(config).toEqual({ errorRate: 0.3 });
        });

        it('should inject error fault with rate and type', () => {
            simulateError('cache', 0.5, 'CONNECTION_REFUSED');

            const config = getFaultConfig('cache');
            expect(config).toEqual({
                errorRate: 0.5,
                errorType: 'CONNECTION_REFUSED',
            });
        });

        it('should create fault with error type', () => {
            simulateError('memory_store', 0.8);

            const faults = getActiveFaults();
            expect(faults[0].type).toBe('error');
        });
    });

    describe('simulateTimeout', () => {
        it('should inject timeout fault with correct config', () => {
            const faultId = simulateTimeout('ai_provider', 5000);

            expect(faultId).toMatch(/^fault_\d+$/);
            const config = getFaultConfig('ai_provider');
            expect(config).toEqual({ timeoutMs: 5000 });
        });

        it('should create fault with timeout type', () => {
            simulateTimeout('webhook', 3000);

            const faults = getActiveFaults();
            expect(faults[0].type).toBe('timeout');
        });
    });

    describe('simulateResourceExhaustion', () => {
        it('should inject resource exhaustion fault', () => {
            const faultId = simulateResourceExhaustion('database', 95);

            expect(faultId).toMatch(/^fault_\d+$/);
            const config = getFaultConfig('database');
            expect(config).toEqual({ utilizationPercent: 95 });
        });

        it('should create fault with resource_exhaustion type', () => {
            simulateResourceExhaustion('cache', 80);

            const faults = getActiveFaults();
            expect(faults[0].type).toBe('resource_exhaustion');
        });
    });

    describe('runResilienceTest', () => {
        it('should run test and return result', async () => {
            const result = await runResilienceTest('test-scenario', async () => {
                // Test passes
            });

            expect(result.scenarioName).toBe('test-scenario');
            expect(result.passed).toBe(true);
            expect(result.errors).toEqual([]);
            expect(result.duration).toBeGreaterThanOrEqual(0);
        });

        it('should capture test failures', async () => {
            const result = await runResilienceTest('failing-test', async () => {
                throw new Error('Test failed');
            });

            expect(result.passed).toBe(false);
            expect(result.errors).toContain('Test failed');
        });

        it('should measure test duration', async () => {
            const result = await runResilienceTest('timed-test', async () => {
                await new Promise((resolve) => setTimeout(resolve, 50));
            });

            expect(result.duration).toBeGreaterThanOrEqual(50);
        });

        it('should include metrics in result', async () => {
            injectFault('database', 'latency');
            recordRecovery('database', 100);

            const result = await runResilienceTest('metrics-test', async () => {
                // Test logic
            });

            expect(result.metrics).toHaveProperty('activeFaults');
            expect(result.metrics).toHaveProperty('recoveryEvents');
            expect(result.metrics.activeFaults).toBe(1);
            expect(result.metrics.recoveryEvents).toBe(1);
        });

        it('should add result to resilience report', async () => {
            await runResilienceTest('test-1', async () => {});
            await runResilienceTest('test-2', async () => {});

            const report = getResilienceReport();
            expect(report.totalTests).toBe(2);
        });
    });

    describe('getResilienceReport', () => {
        it('should return empty report when no tests run', () => {
            const report = getResilienceReport();

            expect(report.totalTests).toBe(0);
            expect(report.passedTests).toBe(0);
            expect(report.failedTests).toBe(0);
            expect(report.averageDuration).toBe(0);
        });

        it('should aggregate test results', async () => {
            await runResilienceTest('test-1', async () => {});
            await runResilienceTest('test-2', async () => {
                throw new Error('Failed');
            });
            await runResilienceTest('test-3', async () => {});

            const report = getResilienceReport();

            expect(report.totalTests).toBe(3);
            expect(report.passedTests).toBe(2);
            expect(report.failedTests).toBe(1);
        });

        it('should calculate average duration', async () => {
            await runResilienceTest('test-1', async () => {
                await new Promise((resolve) => setTimeout(resolve, 50));
            });
            await runResilienceTest('test-2', async () => {
                await new Promise((resolve) => setTimeout(resolve, 100));
            });

            const report = getResilienceReport();

            expect(report.averageDuration).toBeGreaterThan(0);
            expect(report.averageDuration).toBeGreaterThanOrEqual(75);
        });

        it('should include resilience score', async () => {
            await runResilienceTest('test-1', async () => {});

            const report = getResilienceReport();

            expect(report.resilienceScore).toBeGreaterThanOrEqual(0);
            expect(report.resilienceScore).toBeLessThanOrEqual(100);
        });
    });

    describe('getRecoveryTime', () => {
        it('should return null when no recovery events', () => {
            expect(getRecoveryTime('database')).toBeNull();
        });

        it('should return most recent recovery time', () => {
            recordRecovery('database', 100);
            recordRecovery('database', 200);
            recordRecovery('database', 150);

            expect(getRecoveryTime('database')).toBe(150);
        });

        it('should return null for target with no recovery events', () => {
            recordRecovery('database', 100);

            expect(getRecoveryTime('cache')).toBeNull();
        });

        it('should handle multiple targets independently', () => {
            recordRecovery('database', 100);
            recordRecovery('cache', 200);

            expect(getRecoveryTime('database')).toBe(100);
            expect(getRecoveryTime('cache')).toBe(200);
        });
    });

    describe('recordRecovery', () => {
        it('should record recovery event', () => {
            const _beforeTime = Date.now();
            recordRecovery('database', 500);
            const _afterTime = Date.now();

            const recoveryTime = getRecoveryTime('database');
            expect(recoveryTime).toBe(500);
        });

        it('should record multiple recovery events', () => {
            recordRecovery('database', 100);
            recordRecovery('cache', 200);
            recordRecovery('ai_provider', 300);

            expect(getRecoveryTime('database')).toBe(100);
            expect(getRecoveryTime('cache')).toBe(200);
            expect(getRecoveryTime('ai_provider')).toBe(300);
        });
    });

    describe('getResilienceScore', () => {
        it('should return 100 when no tests run', () => {
            expect(getResilienceScore()).toBe(100);
        });

        it('should return lower score for failed tests', async () => {
            await runResilienceTest('test-1', async () => {
                throw new Error('Failed');
            });

            const score = getResilienceScore();
            expect(score).toBeLessThan(100);
        });

        it('should return higher score for passed tests', async () => {
            await runResilienceTest('test-1', async () => {});
            await runResilienceTest('test-2', async () => {});

            const score = getResilienceScore();
            expect(score).toBeGreaterThan(0);
        });

        it('should factor in recovery times', async () => {
            await runResilienceTest('test-1', async () => {});
            recordRecovery('database', 100); // Fast recovery

            const score1 = getResilienceScore();

            clearChaos_forTesting();
            await runResilienceTest('test-2', async () => {});
            recordRecovery('cache', 10000); // Slow recovery

            const score2 = getResilienceScore();

            expect(score1).toBeGreaterThan(score2);
        });

        it('should return score between 0 and 100', async () => {
            await runResilienceTest('test-1', async () => {});
            recordRecovery('database', 500);

            const score = getResilienceScore();
            expect(score).toBeGreaterThanOrEqual(0);
            expect(score).toBeLessThanOrEqual(100);
        });
    });

    describe('clearChaos_forTesting', () => {
        it('should clear all faults', () => {
            injectFault('database', 'latency');
            injectFault('cache', 'error');

            clearChaos_forTesting();

            expect(getActiveFaults()).toHaveLength(0);
        });

        it('should clear recovery events', () => {
            recordRecovery('database', 100);
            recordRecovery('cache', 200);

            clearChaos_forTesting();

            expect(getRecoveryTime('database')).toBeNull();
            expect(getRecoveryTime('cache')).toBeNull();
        });

        it('should clear resilience test results', async () => {
            await runResilienceTest('test-1', async () => {});
            await runResilienceTest('test-2', async () => {});

            clearChaos_forTesting();

            const report = getResilienceReport();
            expect(report.totalTests).toBe(0);
        });

        it('should reset fault counter', () => {
            injectFault('database', 'latency');
            clearChaos_forTesting();

            const faultId = injectFault('cache', 'error');
            expect(faultId).toBe('fault_1');
        });
    });

    describe('Multiple simultaneous faults', () => {
        it('should handle multiple faults on same target', () => {
            const _id1 = simulateLatency('database', 100, 500);
            const _id2 = simulateError('database', 0.5);
            const _id3 = simulateTimeout('database', 3000);

            expect(getActiveFaults()).toHaveLength(3);
            expect(isFaultActive('database')).toBe(true);
        });

        it('should handle multiple faults on different targets', () => {
            simulateLatency('database', 100, 500);
            simulateError('cache', 0.5);
            simulateTimeout('ai_provider', 3000);
            simulateResourceExhaustion('webhook', 95);

            expect(getActiveFaults()).toHaveLength(4);
            expect(isFaultActive('database')).toBe(true);
            expect(isFaultActive('cache')).toBe(true);
            expect(isFaultActive('ai_provider')).toBe(true);
            expect(isFaultActive('webhook')).toBe(true);
        });

        it('should remove faults independently', () => {
            const _id1 = simulateLatency('database', 100, 500);
            const id2 = simulateError('cache', 0.5);
            const _id3 = simulateTimeout('ai_provider', 3000);

            removeFault(id2);

            expect(getActiveFaults()).toHaveLength(2);
            expect(isFaultActive('database')).toBe(true);
            expect(isFaultActive('cache')).toBe(false);
            expect(isFaultActive('ai_provider')).toBe(true);
        });
    });

    describe('Edge cases', () => {
        it('should handle fault injection on non-existent target gracefully', () => {
            const faultId = injectFault('unknown_service' as FaultTarget, 'latency');

            expect(faultId).toMatch(/^fault_\d+$/);
            expect(getActiveFaults()).toHaveLength(1);
        });

        it('should handle removal of non-existent fault', () => {
            const removed = removeFault('fault_nonexistent');

            expect(removed).toBe(false);
            expect(getActiveFaults()).toHaveLength(0);
        });

        it('should handle double removal of same fault', () => {
            const faultId = injectFault('database', 'latency');

            const removed1 = removeFault(faultId);
            const removed2 = removeFault(faultId);

            expect(removed1).toBe(true);
            expect(removed2).toBe(false);
        });

        it('should handle recovery recording without active faults', () => {
            recordRecovery('database', 100);

            expect(getRecoveryTime('database')).toBe(100);
        });

        it('should handle empty config objects', () => {
            injectFault('database', 'latency', {});

            const config = getFaultConfig('database');
            expect(config).toEqual({});
        });
    });
});

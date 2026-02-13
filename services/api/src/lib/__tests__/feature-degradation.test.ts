import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
    recordSuccess,
    recordFailure,
    isFeatureAvailable,
    getFeatureHealth,
    getDegradedFeatures,
    withFeatureFallback,
    resetFeatureHealth_forTesting,
} from '../feature-degradation';

describe('Feature Degradation', () => {
    beforeEach(() => {
        vi.useRealTimers();
        resetFeatureHealth_forTesting();
    });

    describe('initial state', () => {
        it('should start all features as healthy', () => {
            const health = getFeatureHealth();
            for (const entry of health) {
                expect(entry.status).toBe('healthy');
                expect(entry.successCount).toBe(0);
                expect(entry.failureCount).toBe(0);
                expect(entry.p99Latency).toBe(0);
                expect(entry.lastFailure).toBeNull();
            }
        });

        it('should report all features as available', () => {
            expect(isFeatureAvailable('memory_search')).toBe(true);
            expect(isFeatureAvailable('council')).toBe(true);
            expect(isFeatureAvailable('voice')).toBe(true);
            expect(isFeatureAvailable('import')).toBe(true);
            expect(isFeatureAvailable('pac_reminders')).toBe(true);
            expect(isFeatureAvailable('billing')).toBe(true);
        });

        it('should return empty degraded features list', () => {
            expect(getDegradedFeatures()).toEqual([]);
        });
    });

    describe('recording success', () => {
        it('should increment success count and track latency', () => {
            recordSuccess('memory_search', 50);
            recordSuccess('memory_search', 100);

            const health = getFeatureHealth();
            const memoryHealth = health.find((h) => h.feature === 'memory_search');
            expect(memoryHealth?.successCount).toBe(2);
            expect(memoryHealth?.status).toBe('healthy');
        });
    });

    describe('recording failure', () => {
        it('should increment failure count and set last failure', () => {
            recordFailure('council', new Error('timeout'));

            const health = getFeatureHealth();
            const councilHealth = health.find((h) => h.feature === 'council');
            expect(councilHealth?.failureCount).toBe(1);
            expect(councilHealth?.lastFailure).not.toBeNull();
        });
    });

    describe('feature degradation', () => {
        it('should degrade feature after high error rate', () => {
            // Create > 10% error rate over enough requests
            for (let i = 0; i < 8; i++) {
                recordSuccess('voice', 100);
            }
            for (let i = 0; i < 3; i++) {
                recordFailure('voice', new Error('fail'));
            }

            const health = getFeatureHealth();
            const voiceHealth = health.find((h) => h.feature === 'voice');
            expect(voiceHealth?.status).not.toBe('healthy');
        });

        it('should disable feature after sustained high error rate', () => {
            // Push error rate well above threshold with enough samples
            for (let i = 0; i < 5; i++) {
                recordSuccess('import', 100);
            }
            for (let i = 0; i < 8; i++) {
                recordFailure('import', new Error('service down'));
            }

            const health = getFeatureHealth();
            const importHealth = health.find((h) => h.feature === 'import');
            expect(importHealth?.status).toBe('disabled');
            expect(isFeatureAvailable('import')).toBe(false);
        });

        it('should list degraded features via getDegradedFeatures', () => {
            // Degrade voice
            for (let i = 0; i < 5; i++) {
                recordSuccess('voice', 100);
            }
            for (let i = 0; i < 8; i++) {
                recordFailure('voice', new Error('fail'));
            }

            const degraded = getDegradedFeatures();
            expect(degraded).toContain('voice');
            expect(degraded).not.toContain('memory_search');
        });
    });

    describe('auto-recovery (half-open pattern)', () => {
        it('should auto-recover after timeout', () => {
            vi.useFakeTimers();

            // Disable the feature
            for (let i = 0; i < 5; i++) {
                recordSuccess('pac_reminders', 100);
            }
            for (let i = 0; i < 8; i++) {
                recordFailure('pac_reminders', new Error('fail'));
            }

            expect(isFeatureAvailable('pac_reminders')).toBe(false);

            // Advance past the 60-second recovery timeout
            vi.advanceTimersByTime(61_000);

            // Feature should be available again (half-open / degraded)
            expect(isFeatureAvailable('pac_reminders')).toBe(true);

            vi.useRealTimers();
        });

        it('should not recover before timeout', () => {
            vi.useFakeTimers();

            for (let i = 0; i < 5; i++) {
                recordSuccess('billing', 100);
            }
            for (let i = 0; i < 8; i++) {
                recordFailure('billing', new Error('fail'));
            }

            expect(isFeatureAvailable('billing')).toBe(false);

            // Advance only 30 seconds -- not enough
            vi.advanceTimersByTime(30_000);

            expect(isFeatureAvailable('billing')).toBe(false);

            vi.useRealTimers();
        });
    });

    describe('p99 latency tracking', () => {
        it('should calculate p99 latency correctly', () => {
            // 99 fast requests + 1 slow request
            for (let i = 0; i < 99; i++) {
                recordSuccess('memory_search', 50);
            }
            recordSuccess('memory_search', 6000);

            const health = getFeatureHealth();
            const memoryHealth = health.find((h) => h.feature === 'memory_search');
            expect(memoryHealth?.p99Latency).toBe(6000);
        });

        it('should return 0 for p99 with no data', () => {
            const health = getFeatureHealth();
            const memoryHealth = health.find((h) => h.feature === 'memory_search');
            expect(memoryHealth?.p99Latency).toBe(0);
        });
    });

    describe('error rate calculation', () => {
        it('should calculate error rate as ratio of failures to total', () => {
            for (let i = 0; i < 9; i++) {
                recordSuccess('council', 100);
            }
            recordFailure('council', new Error('fail'));

            const health = getFeatureHealth();
            const councilHealth = health.find((h) => h.feature === 'council');
            // 1 failure / 10 total = 10%
            expect(councilHealth?.errorRate).toBeCloseTo(0.1, 1);
        });

        it('should return 0 error rate with no requests', () => {
            const health = getFeatureHealth();
            const councilHealth = health.find((h) => h.feature === 'council');
            expect(councilHealth?.errorRate).toBe(0);
        });
    });

    describe('getFeatureHealth', () => {
        it('should return health for all tracked features', () => {
            const health = getFeatureHealth();
            const featureNames = health.map((h) => h.feature);

            expect(featureNames).toContain('memory_search');
            expect(featureNames).toContain('council');
            expect(featureNames).toContain('voice');
            expect(featureNames).toContain('import');
            expect(featureNames).toContain('pac_reminders');
            expect(featureNames).toContain('billing');
            expect(health).toHaveLength(6);
        });

        it('should reflect mixed statuses across features', () => {
            // Keep memory_search healthy
            recordSuccess('memory_search', 50);

            // Degrade voice
            for (let i = 0; i < 5; i++) {
                recordSuccess('voice', 100);
            }
            for (let i = 0; i < 8; i++) {
                recordFailure('voice', new Error('fail'));
            }

            const health = getFeatureHealth();
            const memoryHealth = health.find((h) => h.feature === 'memory_search');
            const voiceHealth = health.find((h) => h.feature === 'voice');

            expect(memoryHealth?.status).toBe('healthy');
            expect(voiceHealth?.status).not.toBe('healthy');
        });
    });

    describe('withFeatureFallback', () => {
        it('should use primary function when feature is healthy', async () => {
            const result = await withFeatureFallback(
                'memory_search',
                async () => 'primary-result',
                async () => 'fallback-result'
            );

            expect(result).toBe('primary-result');
        });

        it('should use fallback when feature is disabled', async () => {
            // Disable the feature
            for (let i = 0; i < 5; i++) {
                recordSuccess('council', 100);
            }
            for (let i = 0; i < 8; i++) {
                recordFailure('council', new Error('fail'));
            }

            expect(isFeatureAvailable('council')).toBe(false);

            const result = await withFeatureFallback(
                'council',
                async () => 'primary-result',
                async () => 'fallback-result'
            );

            expect(result).toBe('fallback-result');
        });

        it('should fall back when primary throws', async () => {
            const result = await withFeatureFallback(
                'voice',
                async () => {
                    throw new Error('primary failed');
                },
                async () => 'fallback-result'
            );

            expect(result).toBe('fallback-result');
        });

        it('should record success on primary completion', async () => {
            await withFeatureFallback(
                'billing',
                async () => 'ok',
                async () => 'fallback'
            );

            const health = getFeatureHealth();
            const billingHealth = health.find((h) => h.feature === 'billing');
            expect(billingHealth?.successCount).toBe(1);
        });

        it('should record failure when primary throws', async () => {
            await withFeatureFallback(
                'billing',
                async () => {
                    throw new Error('fail');
                },
                async () => 'fallback'
            );

            const health = getFeatureHealth();
            const billingHealth = health.find((h) => h.feature === 'billing');
            expect(billingHealth?.failureCount).toBe(1);
            expect(billingHealth?.lastFailure).not.toBeNull();
        });
    });

    describe('resetFeatureHealth_forTesting', () => {
        it('should reset all features to initial state', () => {
            // Dirty some state
            recordSuccess('memory_search', 100);
            recordFailure('council', new Error('fail'));

            resetFeatureHealth_forTesting();

            const health = getFeatureHealth();
            for (const entry of health) {
                expect(entry.status).toBe('healthy');
                expect(entry.successCount).toBe(0);
                expect(entry.failureCount).toBe(0);
            }
        });
    });
});

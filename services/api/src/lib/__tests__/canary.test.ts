/**
 * Canary Deployment Tests
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
    clearCanary_forTesting,
    getCanaryMetrics,
    getCanaryPercentage,
    getDeploymentInfo,
    getVersionHeaders,
    isCanaryEnabled,
    recordCanaryResult,
    shouldAutoRollback,
    shouldRouteToCanary,
} from '../canary';

describe('Canary Deployment', () => {
    const originalEnv = { ...process.env };

    beforeEach(() => {
        clearCanary_forTesting();
    });

    afterEach(() => {
        process.env = { ...originalEnv };
        clearCanary_forTesting();
    });

    describe('isCanaryEnabled', () => {
        it('should return true when CANARY_ENABLED=true', () => {
            process.env.CANARY_ENABLED = 'true';
            expect(isCanaryEnabled()).toBe(true);
        });

        it('should return false when CANARY_ENABLED is not set', () => {
            delete process.env.CANARY_ENABLED;
            expect(isCanaryEnabled()).toBe(false);
        });

        it('should return false when CANARY_ENABLED=false', () => {
            process.env.CANARY_ENABLED = 'false';
            expect(isCanaryEnabled()).toBe(false);
        });

        it('should return false for invalid values', () => {
            process.env.CANARY_ENABLED = 'yes';
            expect(isCanaryEnabled()).toBe(false);
        });
    });

    describe('getCanaryPercentage', () => {
        it('should return 10 as default', () => {
            delete process.env.CANARY_PERCENTAGE;
            expect(getCanaryPercentage()).toBe(10);
        });

        it('should return configured percentage', () => {
            process.env.CANARY_PERCENTAGE = '25';
            expect(getCanaryPercentage()).toBe(25);
        });

        it('should return default for invalid percentage', () => {
            process.env.CANARY_PERCENTAGE = 'invalid';
            expect(getCanaryPercentage()).toBe(10);
        });

        it('should return default for negative percentage', () => {
            process.env.CANARY_PERCENTAGE = '-5';
            expect(getCanaryPercentage()).toBe(10);
        });

        it('should return default for percentage > 100', () => {
            process.env.CANARY_PERCENTAGE = '150';
            expect(getCanaryPercentage()).toBe(10);
        });

        it('should accept 0 percent', () => {
            process.env.CANARY_PERCENTAGE = '0';
            expect(getCanaryPercentage()).toBe(0);
        });

        it('should accept 100 percent', () => {
            process.env.CANARY_PERCENTAGE = '100';
            expect(getCanaryPercentage()).toBe(100);
        });
    });

    describe('shouldRouteToCanary', () => {
        it('should return false when canary is disabled', () => {
            process.env.CANARY_ENABLED = 'false';
            expect(shouldRouteToCanary('user123')).toBe(false);
        });

        it('should deterministically route users', () => {
            process.env.CANARY_ENABLED = 'true';
            process.env.CANARY_PERCENTAGE = '50';

            const userId = 'user123';
            const result1 = shouldRouteToCanary(userId);
            const result2 = shouldRouteToCanary(userId);
            const result3 = shouldRouteToCanary(userId);

            expect(result1).toBe(result2);
            expect(result2).toBe(result3);
        });

        it('should distribute users according to percentage', () => {
            process.env.CANARY_ENABLED = 'true';
            process.env.CANARY_PERCENTAGE = '30';

            const samples = 1000;
            let canaryCount = 0;

            for (let i = 0; i < samples; i++) {
                if (shouldRouteToCanary(`user${i}`)) {
                    canaryCount++;
                }
            }

            const actualPercentage = (canaryCount / samples) * 100;
            // Allow 5% variance
            expect(actualPercentage).toBeGreaterThan(25);
            expect(actualPercentage).toBeLessThan(35);
        });

        it('should route 0% with percentage=0', () => {
            process.env.CANARY_ENABLED = 'true';
            process.env.CANARY_PERCENTAGE = '0';

            for (let i = 0; i < 100; i++) {
                expect(shouldRouteToCanary(`user${i}`)).toBe(false);
            }
        });

        it('should route 100% with percentage=100', () => {
            process.env.CANARY_ENABLED = 'true';
            process.env.CANARY_PERCENTAGE = '100';

            for (let i = 0; i < 100; i++) {
                expect(shouldRouteToCanary(`user${i}`)).toBe(true);
            }
        });
    });

    describe('getDeploymentInfo', () => {
        it('should return deployment information from env vars', () => {
            process.env.APP_VERSION = '1.2.3';
            process.env.COMMIT_SHA = 'abc123';
            process.env.NODE_ENV = 'production';
            process.env.DEPLOY_TIME = '2026-01-15T10:00:00Z';
            process.env.IS_CANARY = 'true';

            const info = getDeploymentInfo();

            expect(info.version).toBe('1.2.3');
            expect(info.commitSha).toBe('abc123');
            expect(info.environment).toBe('production');
            expect(info.deployedAt).toBe('2026-01-15T10:00:00Z');
            expect(info.isCanary).toBe(true);
        });

        it('should return defaults for missing env vars', () => {
            delete process.env.APP_VERSION;
            delete process.env.COMMIT_SHA;
            delete process.env.NODE_ENV;
            delete process.env.DEPLOY_TIME;
            delete process.env.IS_CANARY;

            const info = getDeploymentInfo();

            expect(info.version).toBe('unknown');
            expect(info.commitSha).toBe('unknown');
            expect(info.environment).toBe('development');
            expect(info.deployedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
            expect(info.isCanary).toBe(false);
        });
    });

    describe('recordCanaryResult and getCanaryMetrics', () => {
        it('should record canary success', () => {
            recordCanaryResult(true, true);
            recordCanaryResult(true, true);

            const metrics = getCanaryMetrics();
            expect(metrics.sampleSize.canary).toBe(2);
            expect(metrics.canaryErrorRate).toBe(0);
        });

        it('should record canary errors', () => {
            recordCanaryResult(true, false);
            recordCanaryResult(true, false);

            const metrics = getCanaryMetrics();
            expect(metrics.sampleSize.canary).toBe(2);
            expect(metrics.canaryErrorRate).toBe(1);
        });

        it('should record stable results separately', () => {
            recordCanaryResult(false, true);
            recordCanaryResult(false, true);
            recordCanaryResult(true, true);

            const metrics = getCanaryMetrics();
            expect(metrics.sampleSize.stable).toBe(2);
            expect(metrics.sampleSize.canary).toBe(1);
        });

        it('should calculate error rates correctly', () => {
            // Canary: 2 success, 8 errors = 80% error rate
            for (let i = 0; i < 2; i++) recordCanaryResult(true, true);
            for (let i = 0; i < 8; i++) recordCanaryResult(true, false);

            // Stable: 9 success, 1 error = 10% error rate
            for (let i = 0; i < 9; i++) recordCanaryResult(false, true);
            recordCanaryResult(false, false);

            const metrics = getCanaryMetrics();
            expect(metrics.canaryErrorRate).toBe(0.8);
            expect(metrics.stableErrorRate).toBe(0.1);
        });

        it('should return isHealthy=true when canary has few samples', () => {
            recordCanaryResult(true, false);
            recordCanaryResult(false, true);

            const metrics = getCanaryMetrics();
            expect(metrics.isHealthy).toBe(true);
        });

        it('should return isHealthy=false when canary error rate is >2x stable', () => {
            // Canary: 50 success, 50 errors = 50% error rate
            for (let i = 0; i < 50; i++) recordCanaryResult(true, true);
            for (let i = 0; i < 50; i++) recordCanaryResult(true, false);

            // Stable: 90 success, 10 errors = 10% error rate
            for (let i = 0; i < 90; i++) recordCanaryResult(false, true);
            for (let i = 0; i < 10; i++) recordCanaryResult(false, false);

            const metrics = getCanaryMetrics();
            expect(metrics.isHealthy).toBe(false);
            expect(metrics.canaryErrorRate).toBe(0.5);
            expect(metrics.stableErrorRate).toBe(0.1);
        });

        it('should return isHealthy=true when canary error rate is within threshold', () => {
            // Canary: 85 success, 15 errors = 15% error rate
            for (let i = 0; i < 85; i++) recordCanaryResult(true, true);
            for (let i = 0; i < 15; i++) recordCanaryResult(true, false);

            // Stable: 90 success, 10 errors = 10% error rate
            for (let i = 0; i < 90; i++) recordCanaryResult(false, true);
            for (let i = 0; i < 10; i++) recordCanaryResult(false, false);

            const metrics = getCanaryMetrics();
            expect(metrics.isHealthy).toBe(true);
            expect(metrics.canaryErrorRate).toBe(0.15);
            expect(metrics.stableErrorRate).toBe(0.1);
        });
    });

    describe('shouldAutoRollback', () => {
        it('should return false with insufficient canary samples', () => {
            // Only 50 canary samples
            for (let i = 0; i < 50; i++) recordCanaryResult(true, false);
            for (let i = 0; i < 100; i++) recordCanaryResult(false, true);

            expect(shouldAutoRollback()).toBe(false);
        });

        it('should return false with insufficient stable samples', () => {
            // Only 30 stable samples
            for (let i = 0; i < 100; i++) recordCanaryResult(true, false);
            for (let i = 0; i < 30; i++) recordCanaryResult(false, true);

            expect(shouldAutoRollback()).toBe(false);
        });

        it('should return true when canary error rate is >2x stable', () => {
            // Canary: 50 success, 50 errors = 50% error rate
            for (let i = 0; i < 50; i++) recordCanaryResult(true, true);
            for (let i = 0; i < 50; i++) recordCanaryResult(true, false);

            // Stable: 90 success, 10 errors = 10% error rate
            for (let i = 0; i < 90; i++) recordCanaryResult(false, true);
            for (let i = 0; i < 10; i++) recordCanaryResult(false, false);

            expect(shouldAutoRollback()).toBe(true);
        });

        it('should return false when canary error rate is acceptable', () => {
            // Canary: 90 success, 10 errors = 10% error rate
            for (let i = 0; i < 90; i++) recordCanaryResult(true, true);
            for (let i = 0; i < 10; i++) recordCanaryResult(true, false);

            // Stable: 95 success, 5 errors = 5% error rate
            for (let i = 0; i < 95; i++) recordCanaryResult(false, true);
            for (let i = 0; i < 5; i++) recordCanaryResult(false, false);

            expect(shouldAutoRollback()).toBe(false);
        });

        it('should require at least 1% error rate for rollback', () => {
            // Canary: 99.5 success, 0.5 errors = 0.5% error rate (even if 10x stable)
            for (let i = 0; i < 199; i++) recordCanaryResult(true, true);
            recordCanaryResult(true, false);

            // Stable: 99.95 success, 0.05 errors = 0.05% error rate
            for (let i = 0; i < 1999; i++) recordCanaryResult(false, true);
            recordCanaryResult(false, false);

            expect(shouldAutoRollback()).toBe(false);
        });
    });

    describe('getVersionHeaders', () => {
        it('should return version headers', () => {
            process.env.APP_VERSION = '2.0.0';
            process.env.IS_CANARY = 'true';

            const headers = getVersionHeaders();

            expect(headers['X-Version']).toBe('2.0.0');
            expect(headers['X-Canary']).toBe('true');
        });

        it('should return false for non-canary', () => {
            process.env.APP_VERSION = '1.0.0';
            process.env.IS_CANARY = 'false';

            const headers = getVersionHeaders();

            expect(headers['X-Version']).toBe('1.0.0');
            expect(headers['X-Canary']).toBe('false');
        });
    });

    describe('clearCanary_forTesting', () => {
        it('should reset all metrics', () => {
            recordCanaryResult(true, true);
            recordCanaryResult(true, false);
            recordCanaryResult(false, true);
            recordCanaryResult(false, false);

            clearCanary_forTesting();

            const metrics = getCanaryMetrics();
            expect(metrics.sampleSize.canary).toBe(0);
            expect(metrics.sampleSize.stable).toBe(0);
            expect(metrics.canaryErrorRate).toBe(0);
            expect(metrics.stableErrorRate).toBe(0);
        });
    });
});

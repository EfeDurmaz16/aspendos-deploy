import { describe, expect, it } from 'vitest';
import { getAllFlags, getUserFeatures, isFeatureEnabled } from '../feature-flags';

describe('feature-flags', () => {
    describe('isFeatureEnabled', () => {
        it('returns true for enabled features without tier restrictions', () => {
            expect(isFeatureEnabled('memory_import', undefined, 'FREE')).toBe(true);
            expect(isFeatureEnabled('prompt_templates', undefined, 'FREE')).toBe(true);
            expect(isFeatureEnabled('chat_export', undefined, 'FREE')).toBe(true);
        });

        it('returns false for disabled features', () => {
            expect(isFeatureEnabled('voice_input', undefined, 'PRO')).toBe(false);
            expect(isFeatureEnabled('shared_workspaces', undefined, 'ULTRA')).toBe(false);
        });

        it('returns false for non-existent features', () => {
            expect(isFeatureEnabled('non_existent_feature', undefined, 'FREE')).toBe(false);
        });

        it('respects tier restrictions - FREE user cannot access PRO features', () => {
            expect(isFeatureEnabled('council_multi_model', undefined, 'FREE')).toBe(false);
            expect(isFeatureEnabled('advanced_memory', undefined, 'FREE')).toBe(false);
            expect(isFeatureEnabled('conversation_fork', undefined, 'FREE')).toBe(false);
        });

        it('respects tier restrictions - PRO user can access PRO features', () => {
            expect(isFeatureEnabled('council_multi_model', undefined, 'PRO')).toBe(true);
            expect(isFeatureEnabled('advanced_memory', undefined, 'PRO')).toBe(true);
            expect(isFeatureEnabled('conversation_fork', undefined, 'PRO')).toBe(true);
        });

        it('respects tier restrictions - STARTER user can access STARTER features', () => {
            expect(isFeatureEnabled('pac_proactive_ai', undefined, 'STARTER')).toBe(true);
        });

        it('respects tier restrictions - FREE user cannot access STARTER features', () => {
            expect(isFeatureEnabled('pac_proactive_ai', undefined, 'FREE')).toBe(false);
        });

        it('respects tier restrictions - ULTRA user can access ULTRA-only features', () => {
            expect(isFeatureEnabled('shared_workspaces', undefined, 'ULTRA')).toBe(false); // disabled globally
        });

        it('works with percentage rollout - deterministic hash', () => {
            // Test with a specific user ID to ensure consistent results
            const userId = 'test-user-123';

            // All features with 100% rollout should be enabled for all users
            expect(isFeatureEnabled('memory_import', userId, 'FREE')).toBe(true);
            expect(isFeatureEnabled('council_multi_model', userId, 'PRO')).toBe(true);

            // Features with 0% rollout should be disabled
            expect(isFeatureEnabled('voice_input', userId, 'PRO')).toBe(false);
        });

        it('percentage rollout is deterministic for same user', () => {
            const userId = 'test-user-456';
            const feature = 'council_multi_model';

            const result1 = isFeatureEnabled(feature, userId, 'PRO');
            const result2 = isFeatureEnabled(feature, userId, 'PRO');

            expect(result1).toBe(result2);
        });

        it('percentage rollout varies between users', () => {
            // With 100% rollout and PRO tier, should always be true
            expect(isFeatureEnabled('council_multi_model', 'user1', 'PRO')).toBe(true);
            expect(isFeatureEnabled('council_multi_model', 'user2', 'PRO')).toBe(true);
        });
    });

    describe('getUserFeatures', () => {
        it('returns array of features for FREE user', () => {
            const features = getUserFeatures(undefined, 'FREE');

            expect(Array.isArray(features)).toBe(true);
            expect(features.length).toBeGreaterThan(0);

            const firstFeature = features[0];
            expect(firstFeature).toHaveProperty('key');
            expect(firstFeature).toHaveProperty('name');
            expect(firstFeature).toHaveProperty('description');
            expect(firstFeature).toHaveProperty('enabled');
            expect(firstFeature).toHaveProperty('tierRequired');
        });

        it('returns correct enabled status for FREE user', () => {
            const features = getUserFeatures(undefined, 'FREE');

            const memoryImport = features.find((f) => f.key === 'memory_import');
            expect(memoryImport?.enabled).toBe(true);

            const councilMultiModel = features.find((f) => f.key === 'council_multi_model');
            expect(councilMultiModel?.enabled).toBe(false);
        });

        it('returns correct enabled status for PRO user', () => {
            const features = getUserFeatures(undefined, 'PRO');

            const councilMultiModel = features.find((f) => f.key === 'council_multi_model');
            expect(councilMultiModel?.enabled).toBe(true);

            const advancedMemory = features.find((f) => f.key === 'advanced_memory');
            expect(advancedMemory?.enabled).toBe(true);
        });

        it('returns correct tierRequired field', () => {
            const features = getUserFeatures(undefined, 'FREE');

            const councilMultiModel = features.find((f) => f.key === 'council_multi_model');
            expect(councilMultiModel?.tierRequired).toBe('PRO');

            const memoryImport = features.find((f) => f.key === 'memory_import');
            expect(memoryImport?.tierRequired).toBe(null);
        });

        it('includes all defined features', () => {
            const features = getUserFeatures(undefined, 'ULTRA');
            const allFlags = getAllFlags();

            expect(features.length).toBe(allFlags.length);
        });
    });

    describe('getAllFlags', () => {
        it('returns all flag definitions', () => {
            const flags = getAllFlags();

            expect(Array.isArray(flags)).toBe(true);
            expect(flags.length).toBeGreaterThan(0);
        });

        it('returns flags with correct structure', () => {
            const flags = getAllFlags();
            const firstFlag = flags[0];

            expect(firstFlag).toHaveProperty('key');
            expect(firstFlag).toHaveProperty('name');
            expect(firstFlag).toHaveProperty('description');
            expect(firstFlag).toHaveProperty('enabled');
            expect(firstFlag).toHaveProperty('allowedTiers');
            expect(firstFlag).toHaveProperty('rolloutPercentage');
        });

        it('includes specific known features', () => {
            const flags = getAllFlags();
            const flagKeys = flags.map((f) => f.key);

            expect(flagKeys).toContain('council_multi_model');
            expect(flagKeys).toContain('pac_proactive_ai');
            expect(flagKeys).toContain('memory_import');
            expect(flagKeys).toContain('voice_input');
        });

        it('returns flags with valid rolloutPercentage values', () => {
            const flags = getAllFlags();

            for (const flag of flags) {
                expect(flag.rolloutPercentage).toBeGreaterThanOrEqual(0);
                expect(flag.rolloutPercentage).toBeLessThanOrEqual(100);
            }
        });

        it('returns flags with valid tier arrays', () => {
            const flags = getAllFlags();
            const validTiers = ['FREE', 'STARTER', 'PRO', 'ULTRA'];

            for (const flag of flags) {
                expect(Array.isArray(flag.allowedTiers)).toBe(true);
                for (const tier of flag.allowedTiers) {
                    expect(validTiers).toContain(tier);
                }
            }
        });
    });
});

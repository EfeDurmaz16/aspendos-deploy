import { beforeEach, describe, expect, it } from 'vitest';
import {
    clearFeatureAnalytics_forTesting,
    getFeatureCorrelation,
    getFeatureFunnel,
    getFeatureGrowth,
    getFeaturePopularity,
    getMostEngagedUsers,
    getRetentionByFeature,
    getUserFeatureProfile,
    trackFeatureUse,
} from '../feature-analytics';

describe('Feature Analytics', () => {
    beforeEach(() => {
        clearFeatureAnalytics_forTesting();
    });

    describe('trackFeatureUse', () => {
        it('should record a feature usage event', () => {
            trackFeatureUse('user1', 'chat');

            const profile = getUserFeatureProfile('user1');
            expect(profile.features).toHaveLength(1);
            expect(profile.features[0].feature).toBe('chat');
        });

        it('should track multiple events for same user and feature', () => {
            trackFeatureUse('user1', 'chat');
            trackFeatureUse('user1', 'chat');
            trackFeatureUse('user1', 'chat');

            const profile = getUserFeatureProfile('user1');
            expect(profile.features[0].count).toBe(3);
        });

        it('should track different features for same user', () => {
            trackFeatureUse('user1', 'chat');
            trackFeatureUse('user1', 'memory_search');
            trackFeatureUse('user1', 'council');

            const profile = getUserFeatureProfile('user1');
            expect(profile.features).toHaveLength(3);
        });

        it('should accept optional metadata', () => {
            trackFeatureUse('user1', 'chat', { model: 'gpt-4', duration: 150 });

            const profile = getUserFeatureProfile('user1');
            expect(profile.features).toHaveLength(1);
        });

        it('should track timestamp for each event', () => {
            const before = new Date();
            trackFeatureUse('user1', 'chat');
            const after = new Date();

            const profile = getUserFeatureProfile('user1');
            const firstUsed = profile.features[0].firstUsedAt;

            expect(firstUsed.getTime()).toBeGreaterThanOrEqual(before.getTime());
            expect(firstUsed.getTime()).toBeLessThanOrEqual(after.getTime());
        });
    });

    describe('getFeaturePopularity', () => {
        it('should return empty array when no events tracked', () => {
            const popularity = getFeaturePopularity();
            expect(popularity).toEqual([]);
        });

        it('should rank features by total usage count', () => {
            trackFeatureUse('user1', 'chat');
            trackFeatureUse('user1', 'chat');
            trackFeatureUse('user1', 'chat');

            trackFeatureUse('user2', 'memory_search');
            trackFeatureUse('user2', 'memory_search');

            trackFeatureUse('user3', 'council');

            const popularity = getFeaturePopularity();

            expect(popularity[0].feature).toBe('chat');
            expect(popularity[0].totalUses).toBe(3);
            expect(popularity[1].feature).toBe('memory_search');
            expect(popularity[1].totalUses).toBe(2);
            expect(popularity[2].feature).toBe('council');
            expect(popularity[2].totalUses).toBe(1);
        });

        it('should count unique users per feature', () => {
            trackFeatureUse('user1', 'chat');
            trackFeatureUse('user2', 'chat');
            trackFeatureUse('user3', 'chat');

            trackFeatureUse('user1', 'memory_search');

            const popularity = getFeaturePopularity();

            const chatStats = popularity.find((p) => p.feature === 'chat');
            expect(chatStats?.uniqueUsers).toBe(3);

            const memoryStats = popularity.find((p) => p.feature === 'memory_search');
            expect(memoryStats?.uniqueUsers).toBe(1);
        });

        it('should calculate average uses per user', () => {
            trackFeatureUse('user1', 'chat');
            trackFeatureUse('user1', 'chat');
            trackFeatureUse('user1', 'chat');

            trackFeatureUse('user2', 'chat');
            trackFeatureUse('user2', 'chat');

            trackFeatureUse('user3', 'chat');

            const popularity = getFeaturePopularity();
            const chatStats = popularity.find((p) => p.feature === 'chat');

            // Total: 6, Users: 3, Avg: 2
            expect(chatStats?.avgUsesPerUser).toBe(2);
        });

        it('should support period filtering', () => {
            // This will be tracked as "now"
            trackFeatureUse('user1', 'chat');

            const popularity = getFeaturePopularity(1); // Last 1 day
            expect(popularity).toHaveLength(1);

            // Period=0 means cutoff=now, events at same ms still pass >= check
            const popularityZero = getFeaturePopularity(0);
            expect(popularityZero.length).toBeLessThanOrEqual(1);
        });
    });

    describe('getUserFeatureProfile', () => {
        it('should return empty profile for non-existent user', () => {
            const profile = getUserFeatureProfile('non-existent');

            expect(profile.features).toEqual([]);
            expect(profile.primaryFeature).toBeNull();
            expect(profile.diversityScore).toBe(0);
        });

        it('should identify primary feature (most used)', () => {
            trackFeatureUse('user1', 'chat');
            trackFeatureUse('user1', 'chat');
            trackFeatureUse('user1', 'chat');

            trackFeatureUse('user1', 'memory_search');

            const profile = getUserFeatureProfile('user1');
            expect(profile.primaryFeature).toBe('chat');
        });

        it('should calculate diversity score based on unique features', () => {
            trackFeatureUse('user1', 'chat');
            trackFeatureUse('user1', 'memory_search');
            trackFeatureUse('user1', 'council');

            const profile = getUserFeatureProfile('user1');
            // 3 features out of 12 total = 25%
            expect(profile.diversityScore).toBe(25);
        });

        it('should sort features by usage count descending', () => {
            trackFeatureUse('user1', 'chat');

            trackFeatureUse('user1', 'memory_search');
            trackFeatureUse('user1', 'memory_search');

            trackFeatureUse('user1', 'council');
            trackFeatureUse('user1', 'council');
            trackFeatureUse('user1', 'council');

            const profile = getUserFeatureProfile('user1');

            expect(profile.features[0].feature).toBe('council');
            expect(profile.features[0].count).toBe(3);
            expect(profile.features[1].feature).toBe('memory_search');
            expect(profile.features[1].count).toBe(2);
            expect(profile.features[2].feature).toBe('chat');
            expect(profile.features[2].count).toBe(1);
        });

        it('should track first and last usage timestamps', () => {
            trackFeatureUse('user1', 'chat');
            trackFeatureUse('user1', 'chat');

            const profile = getUserFeatureProfile('user1');
            const chatUsage = profile.features[0];

            expect(chatUsage.firstUsedAt).toBeInstanceOf(Date);
            expect(chatUsage.lastUsedAt).toBeInstanceOf(Date);
            expect(chatUsage.lastUsedAt.getTime()).toBeGreaterThanOrEqual(
                chatUsage.firstUsedAt.getTime()
            );
        });

        it('should calculate 100% diversity when all features used', () => {
            const allFeatures = [
                'chat',
                'memory_search',
                'memory_create',
                'council',
                'pac_reminder',
                'voice_transcribe',
                'voice_synthesize',
                'import',
                'export',
                'workspace',
                'api_key',
                'template',
            ] as const;

            for (const feature of allFeatures) {
                trackFeatureUse('user1', feature);
            }

            const profile = getUserFeatureProfile('user1');
            expect(profile.diversityScore).toBe(100);
        });
    });

    describe('getRetentionByFeature', () => {
        it('should return zero retention when no users used feature', () => {
            const retention = getRetentionByFeature('chat');

            expect(retention.usersWhoUsed).toBe(0);
            expect(retention.day7Retention).toBe(0);
            expect(retention.day30Retention).toBe(0);
        });

        it('should count users who used the feature', () => {
            trackFeatureUse('user1', 'chat');
            trackFeatureUse('user2', 'chat');
            trackFeatureUse('user3', 'chat');

            const retention = getRetentionByFeature('chat');
            expect(retention.usersWhoUsed).toBe(3);
        });

        it('should track feature-specific retention', () => {
            trackFeatureUse('user1', 'chat');
            trackFeatureUse('user2', 'memory_search');

            const chatRetention = getRetentionByFeature('chat');
            const memoryRetention = getRetentionByFeature('memory_search');

            expect(chatRetention.usersWhoUsed).toBe(1);
            expect(memoryRetention.usersWhoUsed).toBe(1);
        });
    });

    describe('getFeatureCorrelation', () => {
        it('should calculate overlap between two features', () => {
            trackFeatureUse('user1', 'chat');
            trackFeatureUse('user1', 'memory_search');

            trackFeatureUse('user2', 'chat');
            trackFeatureUse('user2', 'memory_search');

            trackFeatureUse('user3', 'chat');

            const correlation = getFeatureCorrelation('chat', 'memory_search');

            expect(correlation.overlap).toBe(2); // user1 and user2 use both
            expect(correlation.featureAOnly).toBe(1); // user3 only uses chat
            expect(correlation.featureBOnly).toBe(0); // no one uses only memory_search
        });

        it('should handle no correlation', () => {
            trackFeatureUse('user1', 'chat');
            trackFeatureUse('user2', 'memory_search');

            const correlation = getFeatureCorrelation('chat', 'memory_search');

            expect(correlation.overlap).toBe(0);
            expect(correlation.featureAOnly).toBe(1);
            expect(correlation.featureBOnly).toBe(1);
        });

        it('should handle perfect correlation', () => {
            trackFeatureUse('user1', 'chat');
            trackFeatureUse('user1', 'memory_search');

            trackFeatureUse('user2', 'chat');
            trackFeatureUse('user2', 'memory_search');

            const correlation = getFeatureCorrelation('chat', 'memory_search');

            expect(correlation.overlap).toBe(2);
            expect(correlation.featureAOnly).toBe(0);
            expect(correlation.featureBOnly).toBe(0);
        });

        it('should calculate correlation coefficient', () => {
            // Need variance: some users with both, some with neither
            trackFeatureUse('user1', 'chat');
            trackFeatureUse('user1', 'memory_search');

            trackFeatureUse('user2', 'chat');
            trackFeatureUse('user2', 'memory_search');

            trackFeatureUse('user3', 'council'); // Uses neither -> creates variance

            const correlation = getFeatureCorrelation('chat', 'memory_search');

            expect(correlation.correlationCoefficient).toBeGreaterThan(0);
            expect(correlation.correlationCoefficient).toBeLessThanOrEqual(1);
        });

        it('should count neither category', () => {
            trackFeatureUse('user1', 'chat');
            trackFeatureUse('user1', 'memory_search');

            trackFeatureUse('user2', 'council'); // Uses neither

            const correlation = getFeatureCorrelation('chat', 'memory_search');

            expect(correlation.neither).toBe(1);
        });
    });

    describe('getFeatureFunnel', () => {
        it('should return empty funnel for empty feature list', () => {
            const funnel = getFeatureFunnel([]);
            expect(funnel).toEqual([]);
        });

        it('should track users through feature progression', () => {
            trackFeatureUse('user1', 'chat');
            trackFeatureUse('user1', 'memory_create');
            trackFeatureUse('user1', 'council');

            trackFeatureUse('user2', 'chat');
            trackFeatureUse('user2', 'memory_create');

            trackFeatureUse('user3', 'chat');

            const funnel = getFeatureFunnel(['chat', 'memory_create', 'council']);

            expect(funnel[0].feature).toBe('chat');
            expect(funnel[0].entered).toBe(3);
            expect(funnel[0].completed).toBe(3);
            expect(funnel[0].dropOff).toBe(0);

            expect(funnel[1].feature).toBe('memory_create');
            expect(funnel[1].entered).toBe(3);
            expect(funnel[1].completed).toBe(2);
            expect(funnel[1].dropOff).toBe(1);

            expect(funnel[2].feature).toBe('council');
            expect(funnel[2].entered).toBe(2);
            expect(funnel[2].completed).toBe(1);
            expect(funnel[2].dropOff).toBe(1);
        });

        it('should handle single feature funnel', () => {
            trackFeatureUse('user1', 'chat');
            trackFeatureUse('user2', 'chat');

            const funnel = getFeatureFunnel(['chat']);

            expect(funnel).toHaveLength(1);
            expect(funnel[0].completed).toBe(2);
        });

        it('should calculate drop-off correctly', () => {
            trackFeatureUse('user1', 'chat');
            trackFeatureUse('user1', 'memory_create');

            trackFeatureUse('user2', 'chat');

            const funnel = getFeatureFunnel(['chat', 'memory_create']);

            expect(funnel[1].dropOff).toBe(1); // 2 entered, 1 completed
        });
    });

    describe('getFeatureGrowth', () => {
        it('should return daily growth data', () => {
            trackFeatureUse('user1', 'chat');

            const growth = getFeatureGrowth('chat', 7);

            expect(growth).toHaveLength(7);
            expect(growth[0].date).toBeTruthy();
        });

        it('should count daily uses and unique users', () => {
            trackFeatureUse('user1', 'chat');
            trackFeatureUse('user1', 'chat');
            trackFeatureUse('user2', 'chat');

            const growth = getFeatureGrowth('chat', 7);
            const today = growth[growth.length - 1];

            expect(today.uses).toBe(3);
            expect(today.uniqueUsers).toBe(2);
        });

        it('should fill missing dates with zeros', () => {
            trackFeatureUse('user1', 'chat');

            const growth = getFeatureGrowth('chat', 7);

            // Most days will have 0 uses
            const zeroDays = growth.filter((g) => g.uses === 0);
            expect(zeroDays.length).toBeGreaterThan(0);
        });

        it('should respect days parameter', () => {
            const growth30 = getFeatureGrowth('chat', 30);
            const growth7 = getFeatureGrowth('chat', 7);

            expect(growth30).toHaveLength(30);
            expect(growth7).toHaveLength(7);
        });

        it('should format dates as ISO strings', () => {
            const growth = getFeatureGrowth('chat', 1);

            expect(growth[0].date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        });
    });

    describe('getMostEngagedUsers', () => {
        it('should return empty array when no users tracked', () => {
            const engaged = getMostEngagedUsers();
            expect(engaged).toEqual([]);
        });

        it('should rank users by total feature uses', () => {
            trackFeatureUse('user1', 'chat');

            trackFeatureUse('user2', 'chat');
            trackFeatureUse('user2', 'memory_search');

            trackFeatureUse('user3', 'chat');
            trackFeatureUse('user3', 'memory_search');
            trackFeatureUse('user3', 'council');

            const engaged = getMostEngagedUsers();

            expect(engaged[0].userId).toBe('user3');
            expect(engaged[0].totalUses).toBe(3);
            expect(engaged[1].userId).toBe('user2');
            expect(engaged[1].totalUses).toBe(2);
            expect(engaged[2].userId).toBe('user1');
            expect(engaged[2].totalUses).toBe(1);
        });

        it('should count unique features per user', () => {
            trackFeatureUse('user1', 'chat');
            trackFeatureUse('user1', 'chat');
            trackFeatureUse('user1', 'memory_search');

            const engaged = getMostEngagedUsers();

            expect(engaged[0].uniqueFeatures).toBe(2);
        });

        it('should calculate user diversity score', () => {
            trackFeatureUse('user1', 'chat');
            trackFeatureUse('user1', 'memory_search');
            trackFeatureUse('user1', 'council');

            const engaged = getMostEngagedUsers();

            // 3 features out of 12 = 25%
            expect(engaged[0].diversityScore).toBe(25);
        });

        it('should respect limit parameter', () => {
            for (let i = 1; i <= 20; i++) {
                trackFeatureUse(`user${i}`, 'chat');
            }

            const top5 = getMostEngagedUsers(5);
            const top10 = getMostEngagedUsers(10);

            expect(top5).toHaveLength(5);
            expect(top10).toHaveLength(10);
        });

        it('should default to 10 users when limit not specified', () => {
            for (let i = 1; i <= 20; i++) {
                trackFeatureUse(`user${i}`, 'chat');
            }

            const engaged = getMostEngagedUsers();
            expect(engaged).toHaveLength(10);
        });
    });

    describe('clearFeatureAnalytics_forTesting', () => {
        it('should clear all tracked events', () => {
            trackFeatureUse('user1', 'chat');
            trackFeatureUse('user2', 'memory_search');

            clearFeatureAnalytics_forTesting();

            const popularity = getFeaturePopularity();
            expect(popularity).toEqual([]);
        });

        it('should reset user profiles', () => {
            trackFeatureUse('user1', 'chat');

            clearFeatureAnalytics_forTesting();

            const profile = getUserFeatureProfile('user1');
            expect(profile.features).toEqual([]);
        });

        it('should reset retention data', () => {
            trackFeatureUse('user1', 'chat');

            clearFeatureAnalytics_forTesting();

            const retention = getRetentionByFeature('chat');
            expect(retention.usersWhoUsed).toBe(0);
        });
    });
});

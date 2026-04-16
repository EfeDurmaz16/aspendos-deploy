import { beforeEach, describe, expect, it } from 'vitest';
import {
    clearOnboarding_forTesting,
    getActivatedUsers,
    getActivationFunnel,
    getActivationScore,
    getChurnRisk,
    getMilestones,
    getOnboardingStats,
    recordMilestone,
} from '../onboarding-tracker';

describe('Onboarding Tracker', () => {
    beforeEach(() => {
        clearOnboarding_forTesting();
    });

    describe('recordMilestone', () => {
        it('should record a milestone for a new user', () => {
            const result = recordMilestone('user1', 'account_created');
            expect(result).toBe(true);

            const milestones = getMilestones('user1');
            expect(milestones).toHaveLength(1);
            expect(milestones[0].milestone).toBe('account_created');
        });

        it('should be idempotent - same milestone cannot be recorded twice', () => {
            recordMilestone('user1', 'first_message');
            const result = recordMilestone('user1', 'first_message');

            expect(result).toBe(false);

            const milestones = getMilestones('user1');
            expect(milestones).toHaveLength(1);
        });

        it('should record multiple different milestones', () => {
            recordMilestone('user1', 'account_created');
            recordMilestone('user1', 'first_message');
            recordMilestone('user1', 'profile_completed');

            const milestones = getMilestones('user1');
            expect(milestones).toHaveLength(3);
        });

        it('should record timestamp for each milestone', () => {
            const before = new Date();
            recordMilestone('user1', 'first_message');
            const after = new Date();

            const milestones = getMilestones('user1');
            const timestamp = milestones[0].timestamp;

            expect(timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
            expect(timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
        });
    });

    describe('getMilestones', () => {
        it('should return empty array for non-existent user', () => {
            const milestones = getMilestones('non-existent');
            expect(milestones).toEqual([]);
        });

        it('should return all milestones for a user', () => {
            recordMilestone('user1', 'account_created');
            recordMilestone('user1', 'first_message');
            recordMilestone('user1', 'first_memory_created');

            const milestones = getMilestones('user1');
            expect(milestones).toHaveLength(3);
        });

        it('should return a copy of milestones (not reference)', () => {
            recordMilestone('user1', 'first_message');

            const milestones1 = getMilestones('user1');
            const milestones2 = getMilestones('user1');

            expect(milestones1).toEqual(milestones2);
            expect(milestones1).not.toBe(milestones2);
        });
    });

    describe('getActivationScore', () => {
        it('should return 0 for user with no milestones', () => {
            const score = getActivationScore('non-existent');
            expect(score).toBe(0);
        });

        it('should return 0 for account_created only', () => {
            recordMilestone('user1', 'account_created');
            const score = getActivationScore('user1');
            expect(score).toBe(0);
        });

        it('should return 20 for first_message', () => {
            recordMilestone('user1', 'first_message');
            const score = getActivationScore('user1');
            expect(score).toBe(20);
        });

        it('should calculate correct score for multiple milestones', () => {
            recordMilestone('user1', 'first_message'); // 20
            recordMilestone('user1', 'first_memory_created'); // 15
            recordMilestone('user1', 'profile_completed'); // 5

            const score = getActivationScore('user1');
            expect(score).toBe(40);
        });

        it('should calculate score of 100 for all milestones', () => {
            recordMilestone('user1', 'account_created'); // 0
            recordMilestone('user1', 'first_message'); // 20
            recordMilestone('user1', 'first_memory_created'); // 15
            recordMilestone('user1', 'first_import'); // 15
            recordMilestone('user1', 'first_council'); // 15
            recordMilestone('user1', 'first_pac_reminder'); // 15
            recordMilestone('user1', 'profile_completed'); // 5
            recordMilestone('user1', 'invited_member'); // 10
            recordMilestone('user1', 'upgraded_plan'); // 5

            const score = getActivationScore('user1');
            expect(score).toBe(100);
        });

        it('should cap score at 100', () => {
            // Even if weights somehow exceed 100, cap it
            recordMilestone('user1', 'first_message');
            recordMilestone('user1', 'first_memory_created');
            recordMilestone('user1', 'first_import');
            recordMilestone('user1', 'first_council');
            recordMilestone('user1', 'first_pac_reminder');
            recordMilestone('user1', 'profile_completed');
            recordMilestone('user1', 'invited_member');
            recordMilestone('user1', 'upgraded_plan');

            const score = getActivationScore('user1');
            expect(score).toBeLessThanOrEqual(100);
        });
    });

    describe('getActivationFunnel', () => {
        it('should return empty funnel for no users', () => {
            const funnel = getActivationFunnel();
            expect(funnel.steps).toHaveLength(9);
            expect(funnel.steps[0].count).toBe(0);
        });

        it('should count users at each milestone', () => {
            recordMilestone('user1', 'account_created');
            recordMilestone('user1', 'first_message');

            recordMilestone('user2', 'account_created');

            const funnel = getActivationFunnel();

            const accountCreatedStep = funnel.steps.find((s) => s.milestone === 'account_created');
            const firstMessageStep = funnel.steps.find((s) => s.milestone === 'first_message');

            expect(accountCreatedStep?.count).toBe(2);
            expect(firstMessageStep?.count).toBe(1);
        });

        it('should calculate percentages correctly', () => {
            recordMilestone('user1', 'account_created');
            recordMilestone('user1', 'first_message');

            recordMilestone('user2', 'account_created');

            const funnel = getActivationFunnel();

            const accountCreatedStep = funnel.steps.find((s) => s.milestone === 'account_created');
            const firstMessageStep = funnel.steps.find((s) => s.milestone === 'first_message');

            expect(accountCreatedStep?.percentage).toBe(100); // 2/2
            expect(firstMessageStep?.percentage).toBe(50); // 1/2
        });

        it('should calculate drop-off between steps', () => {
            recordMilestone('user1', 'account_created');
            recordMilestone('user1', 'first_message');
            recordMilestone('user1', 'first_memory_created');

            recordMilestone('user2', 'account_created');
            recordMilestone('user2', 'first_message');

            recordMilestone('user3', 'account_created');

            const funnel = getActivationFunnel();

            const accountCreatedStep = funnel.steps.find((s) => s.milestone === 'account_created');
            const firstMessageStep = funnel.steps.find((s) => s.milestone === 'first_message');
            const firstMemoryStep = funnel.steps.find(
                (s) => s.milestone === 'first_memory_created'
            );

            // account_created: 3 users, dropOff from total (3 users) = 0%
            expect(accountCreatedStep?.dropOff).toBe(0);

            // first_message: 2 users, dropOff from account_created (3) = 33.33%
            expect(firstMessageStep?.dropOff).toBeCloseTo(33.33, 1);

            // first_memory_created: 1 user, dropOff from first_message (2) = 50%
            expect(firstMemoryStep?.dropOff).toBe(50);
        });

        it('should return steps in correct order', () => {
            const funnel = getActivationFunnel();

            const expectedOrder = [
                'account_created',
                'first_message',
                'first_memory_created',
                'profile_completed',
                'first_import',
                'first_council',
                'first_pac_reminder',
                'invited_member',
                'upgraded_plan',
            ];

            const actualOrder = funnel.steps.map((s) => s.milestone);
            expect(actualOrder).toEqual(expectedOrder);
        });
    });

    describe('getActivatedUsers', () => {
        it('should return empty array when no users activated', () => {
            recordMilestone('user1', 'account_created');

            const activated = getActivatedUsers();
            expect(activated).toEqual([]);
        });

        it('should return users with score >= 60 (default threshold)', () => {
            // user1: 20 + 15 + 15 + 15 = 65
            recordMilestone('user1', 'first_message');
            recordMilestone('user1', 'first_memory_created');
            recordMilestone('user1', 'first_import');
            recordMilestone('user1', 'first_council');

            // user2: 20 + 15 = 35
            recordMilestone('user2', 'first_message');
            recordMilestone('user2', 'first_memory_created');

            const activated = getActivatedUsers();
            expect(activated).toEqual(['user1']);
        });

        it('should support custom threshold', () => {
            recordMilestone('user1', 'first_message'); // 20
            recordMilestone('user2', 'first_message'); // 20
            recordMilestone('user2', 'profile_completed'); // 5

            const activated = getActivatedUsers(25);
            expect(activated).toEqual(['user2']);
        });

        it('should return multiple activated users', () => {
            recordMilestone('user1', 'first_message');
            recordMilestone('user1', 'first_memory_created');
            recordMilestone('user1', 'first_import');
            recordMilestone('user1', 'first_council');
            recordMilestone('user1', 'first_pac_reminder');

            recordMilestone('user2', 'first_message');
            recordMilestone('user2', 'first_import');
            recordMilestone('user2', 'first_council');
            recordMilestone('user2', 'first_pac_reminder');

            const activated = getActivatedUsers(60);
            expect(activated).toHaveLength(2);
            expect(activated).toContain('user1');
            expect(activated).toContain('user2');
        });
    });

    describe('getChurnRisk', () => {
        it('should return HIGH risk for non-existent user', () => {
            const risk = getChurnRisk('non-existent');
            expect(risk.risk).toBe('HIGH');
            expect(risk.score).toBe(0);
        });

        it('should return LOW risk for active user with score >= 60', () => {
            recordMilestone('user1', 'first_message');
            recordMilestone('user1', 'first_memory_created');
            recordMilestone('user1', 'first_import');
            recordMilestone('user1', 'first_council');
            recordMilestone('user1', 'first_pac_reminder');

            const risk = getChurnRisk('user1');
            expect(risk.risk).toBe('LOW');
            expect(risk.score).toBeGreaterThanOrEqual(60);
            expect(risk.daysSinceActive).toBe(0);
        });

        it('should track days since last activity', () => {
            recordMilestone('user1', 'first_message');

            const risk = getChurnRisk('user1');
            expect(risk.daysSinceActive).toBe(0);
            expect(risk.lastActivity).toBeInstanceOf(Date);
        });

        it('should provide recommendations based on risk level', () => {
            // LOW risk user
            recordMilestone('user1', 'first_message');
            recordMilestone('user1', 'first_memory_created');
            recordMilestone('user1', 'first_import');
            recordMilestone('user1', 'first_council');
            recordMilestone('user1', 'first_pac_reminder');

            const lowRisk = getChurnRisk('user1');
            expect(lowRisk.recommendation).toContain('activated');

            // User with low score
            recordMilestone('user2', 'first_message');
            const mediumRisk = getChurnRisk('user2');
            expect(mediumRisk.recommendation).toBeTruthy();
        });
    });

    describe('getOnboardingStats', () => {
        it('should return zero stats for no users', () => {
            const stats = getOnboardingStats();
            expect(stats.totalUsers).toBe(0);
            expect(stats.activatedUsers).toBe(0);
            expect(stats.activationRate).toBe(0);
            expect(stats.avgScore).toBe(0);
        });

        it('should calculate total users correctly', () => {
            recordMilestone('user1', 'first_message');
            recordMilestone('user2', 'first_message');
            recordMilestone('user3', 'first_message');

            const stats = getOnboardingStats();
            expect(stats.totalUsers).toBe(3);
        });

        it('should calculate activated users correctly', () => {
            // Activated user (score >= 60)
            recordMilestone('user1', 'first_message');
            recordMilestone('user1', 'first_memory_created');
            recordMilestone('user1', 'first_import');
            recordMilestone('user1', 'first_council');
            recordMilestone('user1', 'first_pac_reminder');

            // Not activated (score < 60)
            recordMilestone('user2', 'first_message');

            const stats = getOnboardingStats();
            expect(stats.activatedUsers).toBe(1);
        });

        it('should calculate activation rate correctly', () => {
            recordMilestone('user1', 'first_message');
            recordMilestone('user1', 'first_memory_created');
            recordMilestone('user1', 'first_import');
            recordMilestone('user1', 'first_council');
            recordMilestone('user1', 'first_pac_reminder');

            recordMilestone('user2', 'first_message');

            const stats = getOnboardingStats();
            expect(stats.activationRate).toBe(50); // 1/2 = 50%
        });

        it('should calculate average score correctly', () => {
            recordMilestone('user1', 'first_message'); // 20
            recordMilestone('user2', 'first_message'); // 20
            recordMilestone('user2', 'first_memory_created'); // 15

            const stats = getOnboardingStats();
            expect(stats.avgScore).toBe(27.5); // (20 + 35) / 2
        });

        it('should track churn risk distribution', () => {
            // LOW risk user
            recordMilestone('user1', 'first_message');
            recordMilestone('user1', 'first_memory_created');
            recordMilestone('user1', 'first_import');
            recordMilestone('user1', 'first_council');
            recordMilestone('user1', 'first_pac_reminder');

            // MEDIUM/HIGH risk user
            recordMilestone('user2', 'first_message');

            const stats = getOnboardingStats();
            expect(stats.churnRiskDistribution.LOW).toBeGreaterThan(0);
        });
    });

    describe('clearOnboarding_forTesting', () => {
        it('should reset all onboarding data', () => {
            recordMilestone('user1', 'first_message');
            recordMilestone('user2', 'first_message');

            clearOnboarding_forTesting();

            const stats = getOnboardingStats();
            expect(stats.totalUsers).toBe(0);
        });
    });
});

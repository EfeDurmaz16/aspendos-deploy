import { beforeEach, describe, expect, it } from 'vitest';
import {
    assignCohort,
    clearCohorts_forTesting,
    getBestPerformingCohort,
    getCohortComparison,
    getCohortRetention,
    getCohortSize,
    getRetentionMatrix,
    recordCohortActivity,
} from '../cohort-analysis';

describe('Cohort Analysis', () => {
    beforeEach(() => {
        clearCohorts_forTesting();
    });

    describe('assignCohort', () => {
        it('should assign user to correct cohort based on signup date', () => {
            const userId = 'user1';
            const signupDate = new Date('2025-01-15');

            const cohortId = assignCohort(userId, signupDate);

            expect(cohortId).toMatch(/W2025-\d{2}/);
            expect(getCohortSize(cohortId)).toBe(1);
        });

        it('should assign multiple users to same cohort if they signed up in same week', () => {
            const date1 = new Date('2025-01-15');
            const date2 = new Date('2025-01-16');

            const cohort1 = assignCohort('user1', date1);
            const cohort2 = assignCohort('user2', date2);

            expect(cohort1).toBe(cohort2);
            expect(getCohortSize(cohort1)).toBe(2);
        });

        it('should assign users to different cohorts if they signed up in different weeks', () => {
            const date1 = new Date('2025-01-08');
            const date2 = new Date('2025-01-15');

            const cohort1 = assignCohort('user1', date1);
            const cohort2 = assignCohort('user2', date2);

            expect(cohort1).not.toBe(cohort2);
            expect(getCohortSize(cohort1)).toBe(1);
            expect(getCohortSize(cohort2)).toBe(1);
        });

        it('should format cohort ID as W{year}-{weekNumber}', () => {
            const cohortId = assignCohort('user1', new Date('2025-01-15'));

            expect(cohortId).toMatch(/^W\d{4}-\d{2}$/);
        });

        it('should automatically record signup week as first activity', () => {
            const cohortId = assignCohort('user1', new Date('2025-01-15'));
            const retention = getCohortRetention(cohortId);

            expect(retention.retentionByWeek.get(0)).toBe(100);
        });

        it('should handle year boundary correctly', () => {
            const cohort1 = assignCohort('user1', new Date('2024-12-31'));
            const cohort2 = assignCohort('user2', new Date('2025-01-01'));

            expect(cohort1).not.toBe(cohort2);
        });
    });

    describe('recordCohortActivity', () => {
        it('should record activity for a user', () => {
            const signupDate = new Date('2025-01-08');
            assignCohort('user1', signupDate);

            const activityDate = new Date('2025-01-15');
            recordCohortActivity('user1', activityDate);

            // Should not throw
            expect(true).toBe(true);
        });

        it('should throw error if user not assigned to cohort', () => {
            expect(() => {
                recordCohortActivity('nonexistent-user');
            }).toThrow('User nonexistent-user not found');
        });

        it('should use current date if activityDate not provided', () => {
            assignCohort('user1', new Date('2025-01-01'));

            expect(() => {
                recordCohortActivity('user1');
            }).not.toThrow();
        });

        it('should record multiple activities across different weeks', () => {
            const cohortId = assignCohort('user1', new Date('2025-01-01'));

            recordCohortActivity('user1', new Date('2025-01-08'));
            recordCohortActivity('user1', new Date('2025-01-15'));
            recordCohortActivity('user1', new Date('2025-01-22'));

            const retention = getCohortRetention(cohortId);
            expect(retention.retentionByWeek.size).toBeGreaterThan(1);
        });

        it('should handle duplicate activity records for same week', () => {
            const cohortId = assignCohort('user1', new Date('2025-01-01'));

            recordCohortActivity('user1', new Date('2025-01-08'));
            recordCohortActivity('user1', new Date('2025-01-09'));
            recordCohortActivity('user1', new Date('2025-01-10'));

            const retention = getCohortRetention(cohortId);
            // Week 1 should still show 100% retention (1 out of 1 user)
            expect(retention.retentionByWeek.get(1)).toBe(100);
        });
    });

    describe('getCohortRetention', () => {
        it('should return empty retention for non-existent cohort', () => {
            const retention = getCohortRetention('W2025-99');

            expect(retention.cohortId).toBe('W2025-99');
            expect(retention.cohortSize).toBe(0);
            expect(retention.retentionByWeek.size).toBe(0);
        });

        it('should calculate 100% retention for week 0 (signup week)', () => {
            const cohortId = assignCohort('user1', new Date('2025-01-01'));
            const retention = getCohortRetention(cohortId);

            expect(retention.retentionByWeek.get(0)).toBe(100);
        });

        it('should calculate correct retention percentage for single user', () => {
            const cohortId = assignCohort('user1', new Date('2025-01-01'));
            recordCohortActivity('user1', new Date('2025-01-08'));

            const retention = getCohortRetention(cohortId);

            expect(retention.cohortSize).toBe(1);
            expect(retention.retentionByWeek.get(0)).toBe(100);
            expect(retention.retentionByWeek.get(1)).toBe(100);
        });

        it('should calculate correct retention percentage for multiple users', () => {
            const cohortId = assignCohort('user1', new Date('2025-01-01'));
            assignCohort('user2', new Date('2025-01-02'));
            assignCohort('user3', new Date('2025-01-03'));

            // Only 2 out of 3 users active in week 1
            recordCohortActivity('user1', new Date('2025-01-08'));
            recordCohortActivity('user2', new Date('2025-01-09'));

            const retention = getCohortRetention(cohortId);

            expect(retention.cohortSize).toBe(3);
            expect(retention.retentionByWeek.get(0)).toBe(100);
            expect(retention.retentionByWeek.get(1)).toBeCloseTo(66.67, 1);
        });

        it('should handle zero retention weeks', () => {
            const cohortId = assignCohort('user1', new Date('2025-01-01'));

            const retention = getCohortRetention(cohortId);

            // Week 1 should not exist if no one was active
            expect(retention.retentionByWeek.has(1)).toBe(false);
        });

        it('should calculate retention across multiple weeks', () => {
            const cohortId = assignCohort('user1', new Date('2025-01-01'));
            assignCohort('user2', new Date('2025-01-02'));

            // user1 active in weeks 1, 2, 4
            recordCohortActivity('user1', new Date('2025-01-08'));
            recordCohortActivity('user1', new Date('2025-01-15'));
            recordCohortActivity('user1', new Date('2025-01-29'));

            // user2 active in weeks 1, 2
            recordCohortActivity('user2', new Date('2025-01-08'));
            recordCohortActivity('user2', new Date('2025-01-15'));

            const retention = getCohortRetention(cohortId);

            expect(retention.retentionByWeek.get(1)).toBe(100);
            expect(retention.retentionByWeek.get(2)).toBe(100);
            expect(retention.retentionByWeek.has(3)).toBe(false); // Week with 0 users not stored
            expect(retention.retentionByWeek.get(4)).toBe(50);
        });

        it('should not include weeks with zero active users in retention map', () => {
            const cohortId = assignCohort('user1', new Date('2025-01-01'));
            recordCohortActivity('user1', new Date('2025-02-01')); // Week 4+

            const retention = getCohortRetention(cohortId);

            // Weeks 1-3 should not be in the map
            expect(retention.retentionByWeek.has(1)).toBe(false);
            expect(retention.retentionByWeek.has(2)).toBe(false);
            expect(retention.retentionByWeek.has(3)).toBe(false);
        });
    });

    describe('getCohortComparison', () => {
        it('should return empty array if no cohorts exist', () => {
            const comparison = getCohortComparison();

            expect(comparison).toEqual([]);
        });

        it('should return comparison for single cohort', () => {
            const cohortId = assignCohort('user1', new Date('2025-01-01'));

            const comparison = getCohortComparison();

            expect(comparison).toHaveLength(1);
            expect(comparison[0].cohortId).toBe(cohortId);
            expect(comparison[0].cohortSize).toBe(1);
        });

        it('should compare multiple cohorts', () => {
            assignCohort('user1', new Date('2025-01-01'));
            assignCohort('user2', new Date('2025-01-15'));
            assignCohort('user3', new Date('2025-02-01'));

            const comparison = getCohortComparison();

            expect(comparison).toHaveLength(3);
        });

        it('should sort cohorts chronologically', () => {
            assignCohort('user1', new Date('2025-02-01'));
            assignCohort('user2', new Date('2025-01-01'));
            assignCohort('user3', new Date('2025-01-15'));

            const comparison = getCohortComparison();

            expect(comparison[0].cohortId).toMatch(/W2025-0[0-9]/);
            expect(comparison[2].cohortId).toMatch(/W2025-0[5-9]/);
        });

        it('should include week1, week4, and week8 retention metrics', () => {
            const _cohortId = assignCohort('user1', new Date('2025-01-01'));
            recordCohortActivity('user1', new Date('2025-01-08')); // Week 1
            recordCohortActivity('user1', new Date('2025-01-29')); // Week 4
            recordCohortActivity('user1', new Date('2025-02-26')); // Week 8

            const comparison = getCohortComparison();

            expect(comparison[0].week1Retention).toBe(100);
            expect(comparison[0].week4Retention).toBe(100);
            expect(comparison[0].week8Retention).toBe(100);
        });

        it('should show 0 for retention weeks with no activity', () => {
            assignCohort('user1', new Date('2025-01-01'));
            // No activity after signup

            const comparison = getCohortComparison();

            expect(comparison[0].week1Retention).toBe(0);
            expect(comparison[0].week4Retention).toBe(0);
            expect(comparison[0].week8Retention).toBe(0);
        });
    });

    describe('getRetentionMatrix', () => {
        it('should return empty array if no cohorts exist', () => {
            const matrix = getRetentionMatrix();

            expect(matrix).toEqual([]);
        });

        it('should return matrix with default 12 weeks', () => {
            assignCohort('user1', new Date('2025-01-01'));

            const matrix = getRetentionMatrix();

            expect(matrix).toHaveLength(1);
            expect(matrix[0].weeks).toHaveLength(12);
        });

        it('should return matrix with custom week count', () => {
            assignCohort('user1', new Date('2025-01-01'));

            const matrix = getRetentionMatrix(5);

            expect(matrix[0].weeks).toHaveLength(5);
        });

        it('should include null for weeks with no data', () => {
            assignCohort('user1', new Date('2025-01-01'));
            // Only signup week has data

            const matrix = getRetentionMatrix(5);

            expect(matrix[0].weeks[0]).toBe(100);
            expect(matrix[0].weeks[1]).toBeNull();
            expect(matrix[0].weeks[2]).toBeNull();
        });

        it('should populate matrix with retention percentages', () => {
            const _cohortId = assignCohort('user1', new Date('2025-01-01'));
            assignCohort('user2', new Date('2025-01-02'));

            recordCohortActivity('user1', new Date('2025-01-08')); // Week 1
            recordCohortActivity('user1', new Date('2025-01-15')); // Week 2

            const matrix = getRetentionMatrix();

            expect(matrix[0].weeks[0]).toBe(100);
            expect(matrix[0].weeks[1]).toBe(50);
            expect(matrix[0].weeks[2]).toBe(50);
        });

        it('should round retention percentages to 1 decimal place', () => {
            assignCohort('user1', new Date('2025-01-01'));
            assignCohort('user2', new Date('2025-01-02'));
            assignCohort('user3', new Date('2025-01-03'));

            recordCohortActivity('user1', new Date('2025-01-08'));

            const matrix = getRetentionMatrix();

            // 1/3 = 33.333... should round to 33.3
            expect(matrix[0].weeks[1]).toBe(33.3);
        });

        it('should sort cohorts chronologically in matrix', () => {
            assignCohort('user1', new Date('2025-02-01'));
            assignCohort('user2', new Date('2025-01-01'));

            const matrix = getRetentionMatrix();

            expect(matrix[0].cohortId).toMatch(/W2025-0[0-9]/);
            expect(matrix[1].cohortId).toMatch(/W2025-0[5-9]/);
        });
    });

    describe('getBestPerformingCohort', () => {
        it('should return null if no cohorts exist', () => {
            const best = getBestPerformingCohort();

            expect(best).toBeNull();
        });

        it('should return the only cohort if only one exists', () => {
            const cohortId = assignCohort('user1', new Date('2025-01-01'));
            recordCohortActivity('user1', new Date('2025-01-08'));

            const best = getBestPerformingCohort();

            expect(best?.cohortId).toBe(cohortId);
        });

        it('should identify cohort with highest average retention', () => {
            // Cohort 1: Poor retention
            const _cohort1 = assignCohort('user1', new Date('2025-01-01'));
            assignCohort('user2', new Date('2025-01-02'));
            recordCohortActivity('user1', new Date('2025-01-08')); // 50% week 1

            // Cohort 2: Great retention
            const cohort2 = assignCohort('user3', new Date('2025-01-15'));
            assignCohort('user4', new Date('2025-01-16'));
            recordCohortActivity('user3', new Date('2025-01-22'));
            recordCohortActivity('user4', new Date('2025-01-22'));
            recordCohortActivity('user3', new Date('2025-01-29'));
            recordCohortActivity('user4', new Date('2025-01-29'));

            const best = getBestPerformingCohort();

            expect(best?.cohortId).toBe(cohort2);
        });

        it('should calculate average across weeks 1-4', () => {
            const _cohortId = assignCohort('user1', new Date('2025-01-01'));
            recordCohortActivity('user1', new Date('2025-01-08')); // Week 1
            recordCohortActivity('user1', new Date('2025-01-15')); // Week 2
            recordCohortActivity('user1', new Date('2025-01-22')); // Week 3
            recordCohortActivity('user1', new Date('2025-01-29')); // Week 4

            const best = getBestPerformingCohort();

            expect(best?.avgRetention).toBe(100);
        });

        it('should round average retention to 1 decimal place', () => {
            const _cohortId = assignCohort('user1', new Date('2025-01-01'));
            assignCohort('user2', new Date('2025-01-02'));
            assignCohort('user3', new Date('2025-01-03'));

            recordCohortActivity('user1', new Date('2025-01-08')); // 33.33% week 1
            recordCohortActivity('user1', new Date('2025-01-15')); // 33.33% week 2

            const best = getBestPerformingCohort();

            expect(best?.avgRetention).toBe(33.3);
        });

        it('should handle cohorts with no retention data after signup', () => {
            assignCohort('user1', new Date('2025-01-01'));
            const cohort2 = assignCohort('user2', new Date('2025-01-15'));
            recordCohortActivity('user2', new Date('2025-01-22'));

            const best = getBestPerformingCohort();

            expect(best?.cohortId).toBe(cohort2);
        });
    });

    describe('getCohortSize', () => {
        it('should return 0 for non-existent cohort', () => {
            const size = getCohortSize('W2025-99');

            expect(size).toBe(0);
        });

        it('should return correct size for cohort with one user', () => {
            const cohortId = assignCohort('user1', new Date('2025-01-01'));

            expect(getCohortSize(cohortId)).toBe(1);
        });

        it('should return correct size for cohort with multiple users', () => {
            const cohortId = assignCohort('user1', new Date('2025-01-01'));
            assignCohort('user2', new Date('2025-01-02'));
            assignCohort('user3', new Date('2025-01-03'));

            expect(getCohortSize(cohortId)).toBe(3);
        });

        it('should update size when new users join cohort', () => {
            const cohortId = assignCohort('user1', new Date('2025-01-01'));
            expect(getCohortSize(cohortId)).toBe(1);

            assignCohort('user2', new Date('2025-01-02'));
            expect(getCohortSize(cohortId)).toBe(2);
        });
    });

    describe('clearCohorts_forTesting', () => {
        it('should clear all cohorts', () => {
            assignCohort('user1', new Date('2025-01-01'));
            assignCohort('user2', new Date('2025-01-15'));

            clearCohorts_forTesting();

            expect(getCohortComparison()).toEqual([]);
        });

        it('should clear all user data', () => {
            const cohortId = assignCohort('user1', new Date('2025-01-01'));

            clearCohorts_forTesting();

            expect(getCohortSize(cohortId)).toBe(0);
        });

        it('should allow fresh start after clearing', () => {
            assignCohort('user1', new Date('2025-01-01'));
            clearCohorts_forTesting();

            const cohortId = assignCohort('user2', new Date('2025-01-15'));

            expect(getCohortComparison()).toHaveLength(1);
            expect(getCohortSize(cohortId)).toBe(1);
        });
    });

    describe('Edge cases', () => {
        it('should handle empty cohort correctly', () => {
            const retention = getCohortRetention('W2025-01');

            expect(retention.cohortSize).toBe(0);
            expect(retention.retentionByWeek.size).toBe(0);
        });

        it('should handle single user with sporadic activity', () => {
            const cohortId = assignCohort('user1', new Date('2025-01-01'));
            recordCohortActivity('user1', new Date('2025-01-15')); // Week 2
            recordCohortActivity('user1', new Date('2025-02-15')); // Week 6+

            const retention = getCohortRetention(cohortId);

            expect(retention.retentionByWeek.get(0)).toBe(100);
            expect(retention.retentionByWeek.has(1)).toBe(false);
            expect(retention.retentionByWeek.get(2)).toBe(100);
        });

        it('should handle far future dates', () => {
            const cohortId = assignCohort('user1', new Date('2025-01-01'));
            recordCohortActivity('user1', new Date('2026-01-01')); // ~52 weeks later

            const retention = getCohortRetention(cohortId);

            expect(retention.retentionByWeek.size).toBeGreaterThan(1);
        });

        it('should handle same user assigned to cohort multiple times', () => {
            const _cohort1 = assignCohort('user1', new Date('2025-01-01'));
            const cohort2 = assignCohort('user1', new Date('2025-01-15'));

            // Should update to new cohort
            expect(getCohortSize(cohort2)).toBe(1);
        });

        it('should handle activity before signup date gracefully', () => {
            assignCohort('user1', new Date('2025-01-15'));

            // Activity before signup (shouldn't happen in practice)
            expect(() => {
                recordCohortActivity('user1', new Date('2025-01-01'));
            }).not.toThrow();
        });
    });
});

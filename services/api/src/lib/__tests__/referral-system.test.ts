/**
 * Referral System Tests
 *
 * Comprehensive test suite for viral referral tracking.
 * Tests all functions and edge cases.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { clearCredits_forTesting, getBalance } from '../credit-system';
import {
    clearReferrals_forTesting,
    generateReferralCode,
    getReferralChain,
    getReferralCode,
    getReferralLeaderboard,
    getReferralStats,
    getSystemReferralStats,
    qualifyReferral,
    recordReferral,
    rewardReferral,
} from '../referral-system';

describe('Referral System', () => {
    beforeEach(() => {
        clearReferrals_forTesting();
        clearCredits_forTesting();
    });

    describe('generateReferralCode', () => {
        it('should generate 8 character alphanumeric code', () => {
            const code = generateReferralCode('user_123');
            expect(code).toHaveLength(8);
            expect(code).toMatch(/^[A-Z0-9]{8}$/);
        });

        it('should be deterministic for same userId', () => {
            const code1 = generateReferralCode('user_abc');
            const code2 = generateReferralCode('user_abc');
            expect(code1).toBe(code2);
        });

        it('should generate different codes for different users', () => {
            const code1 = generateReferralCode('user_1');
            const code2 = generateReferralCode('user_2');
            expect(code1).not.toBe(code2);
        });

        it('should handle long user IDs', () => {
            const longUserId = 'user_' + 'a'.repeat(100);
            const code = generateReferralCode(longUserId);
            expect(code).toHaveLength(8);
        });

        it('should handle special characters in userId', () => {
            const code = generateReferralCode('user@test.com-123');
            expect(code).toHaveLength(8);
            expect(code).toMatch(/^[A-Z0-9]{8}$/);
        });
    });

    describe('getReferralCode', () => {
        it('should return code for new user', () => {
            const code = getReferralCode('user_1');
            expect(code).toHaveLength(8);
        });

        it('should return same code on subsequent calls (idempotent)', () => {
            const code1 = getReferralCode('user_1');
            const code2 = getReferralCode('user_1');
            const code3 = getReferralCode('user_1');
            expect(code1).toBe(code2);
            expect(code2).toBe(code3);
        });

        it('should return different codes for different users', () => {
            const code1 = getReferralCode('user_1');
            const code2 = getReferralCode('user_2');
            expect(code1).not.toBe(code2);
        });
    });

    describe('recordReferral', () => {
        it('should successfully record valid referral', () => {
            const referrerCode = getReferralCode('referrer_1');
            const result = recordReferral(referrerCode, 'new_user_1');

            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.referralId).toBeTruthy();
                expect(result.referralId).toMatch(/^ref_/);
            }
        });

        it('should reject invalid referral code', () => {
            const result = recordReferral('INVALID99', 'new_user_1');

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.reason).toBe('invalid_referral_code');
            }
        });

        it('should reject self-referral', () => {
            const userId = 'user_1';
            const code = getReferralCode(userId);
            const result = recordReferral(code, userId);

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.reason).toBe('self_referral_not_allowed');
            }
        });

        it('should reject duplicate referral for same user', () => {
            const referrerCode = getReferralCode('referrer_1');
            const newUserId = 'new_user_1';

            const result1 = recordReferral(referrerCode, newUserId);
            expect(result1.success).toBe(true);

            const result2 = recordReferral(referrerCode, newUserId);
            expect(result2.success).toBe(false);
            if (!result2.success) {
                expect(result2.reason).toBe('user_already_referred');
            }
        });

        it('should enforce max referrals limit (50)', () => {
            const referrerCode = getReferralCode('referrer_1');

            // Create 50 referrals
            for (let i = 1; i <= 50; i++) {
                const result = recordReferral(referrerCode, `user_${i}`);
                expect(result.success).toBe(true);
            }

            // 51st should fail
            const result = recordReferral(referrerCode, 'user_51');
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.reason).toBe('max_referrals_reached');
            }
        });
    });

    describe('qualifyReferral', () => {
        it('should mark pending referral as qualified', () => {
            const referrerCode = getReferralCode('referrer_1');
            const newUserId = 'new_user_1';

            recordReferral(referrerCode, newUserId);
            const result = qualifyReferral(newUserId);

            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.referralId).toBeTruthy();
            }
        });

        it('should fail if no pending referral exists', () => {
            const result = qualifyReferral('nonexistent_user');

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.reason).toBe('referral_not_found_or_already_qualified');
            }
        });

        it('should fail if referral already qualified', () => {
            const referrerCode = getReferralCode('referrer_1');
            const newUserId = 'new_user_1';

            recordReferral(referrerCode, newUserId);
            qualifyReferral(newUserId);

            // Try to qualify again
            const result = qualifyReferral(newUserId);
            expect(result.success).toBe(false);
        });
    });

    describe('rewardReferral', () => {
        it('should award credits to both referrer and referred user', async () => {
            const referrerId = 'referrer_1';
            const newUserId = 'new_user_1';
            const referrerCode = getReferralCode(referrerId);

            recordReferral(referrerCode, newUserId);
            qualifyReferral(newUserId);

            const result = await rewardReferral(newUserId);

            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.referrerReward).toBe(100);
                expect(result.referredReward).toBe(50);
                expect(result.referralId).toBeTruthy();

                // Check balances
                const referrerBalance = getBalance(referrerId);
                const referredBalance = getBalance(newUserId);
                expect(referrerBalance).toBe(100);
                expect(referredBalance).toBe(50);
            }
        });

        it('should fail if referral not qualified', async () => {
            const referrerCode = getReferralCode('referrer_1');
            const newUserId = 'new_user_1';

            recordReferral(referrerCode, newUserId);
            // Don't qualify

            const result = await rewardReferral(newUserId);
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.reason).toBe('referral_not_qualified');
            }
        });

        it('should fail if no referral exists', async () => {
            const result = await rewardReferral('nonexistent_user');
            expect(result.success).toBe(false);
        });

        it('should not reward same referral twice', async () => {
            const referrerId = 'referrer_1';
            const newUserId = 'new_user_1';
            const referrerCode = getReferralCode(referrerId);

            recordReferral(referrerCode, newUserId);
            qualifyReferral(newUserId);

            const result1 = await rewardReferral(newUserId);
            expect(result1.success).toBe(true);

            // Try to reward again
            const result2 = await rewardReferral(newUserId);
            expect(result2.success).toBe(false);

            // Balance should only have single reward
            const referrerBalance = getBalance(referrerId);
            expect(referrerBalance).toBe(100);
        });
    });

    describe('getReferralStats', () => {
        it('should return stats for user with no referrals', () => {
            const stats = getReferralStats('user_1');

            expect(stats.totalReferred).toBe(0);
            expect(stats.qualified).toBe(0);
            expect(stats.rewarded).toBe(0);
            expect(stats.totalCreditsEarned).toBe(0);
            expect(stats.referralCode).toBeTruthy();
            expect(stats.leaderboardRank).toBe(0);
        });

        it('should return correct stats with pending referrals', () => {
            const referrerId = 'referrer_1';
            const referrerCode = getReferralCode(referrerId);

            recordReferral(referrerCode, 'user_1');
            recordReferral(referrerCode, 'user_2');

            const stats = getReferralStats(referrerId);
            expect(stats.totalReferred).toBe(2);
            expect(stats.qualified).toBe(0);
            expect(stats.rewarded).toBe(0);
            expect(stats.totalCreditsEarned).toBe(0);
        });

        it('should return correct stats with qualified referrals', () => {
            const referrerId = 'referrer_1';
            const referrerCode = getReferralCode(referrerId);

            recordReferral(referrerCode, 'user_1');
            recordReferral(referrerCode, 'user_2');
            qualifyReferral('user_1');

            const stats = getReferralStats(referrerId);
            expect(stats.totalReferred).toBe(2);
            expect(stats.qualified).toBe(1);
            expect(stats.rewarded).toBe(0);
            expect(stats.totalCreditsEarned).toBe(0);
        });

        it('should return correct stats with rewarded referrals', async () => {
            const referrerId = 'referrer_1';
            const referrerCode = getReferralCode(referrerId);

            recordReferral(referrerCode, 'user_1');
            recordReferral(referrerCode, 'user_2');
            qualifyReferral('user_1');
            qualifyReferral('user_2');
            await rewardReferral('user_1');

            const stats = getReferralStats(referrerId);
            expect(stats.totalReferred).toBe(2);
            expect(stats.qualified).toBe(2);
            expect(stats.rewarded).toBe(1);
            expect(stats.totalCreditsEarned).toBe(100);
        });

        it('should include leaderboard rank', async () => {
            // Create multiple referrers
            const ref1Code = getReferralCode('ref_1');
            const ref2Code = getReferralCode('ref_2');

            // ref_1 gets 2 qualified
            recordReferral(ref1Code, 'user_1');
            recordReferral(ref1Code, 'user_2');
            qualifyReferral('user_1');
            qualifyReferral('user_2');

            // ref_2 gets 1 qualified
            recordReferral(ref2Code, 'user_3');
            qualifyReferral('user_3');

            const stats1 = getReferralStats('ref_1');
            const stats2 = getReferralStats('ref_2');

            expect(stats1.leaderboardRank).toBe(1);
            expect(stats2.leaderboardRank).toBe(2);
        });
    });

    describe('getReferralLeaderboard', () => {
        it('should return empty array when no referrals', () => {
            const leaderboard = getReferralLeaderboard();
            expect(leaderboard).toEqual([]);
        });

        it('should rank by qualified count', () => {
            const ref1Code = getReferralCode('ref_1');
            const ref2Code = getReferralCode('ref_2');
            const ref3Code = getReferralCode('ref_3');

            // ref_1: 3 qualified
            recordReferral(ref1Code, 'user_1');
            recordReferral(ref1Code, 'user_2');
            recordReferral(ref1Code, 'user_3');
            qualifyReferral('user_1');
            qualifyReferral('user_2');
            qualifyReferral('user_3');

            // ref_2: 1 qualified
            recordReferral(ref2Code, 'user_4');
            qualifyReferral('user_4');

            // ref_3: 2 qualified
            recordReferral(ref3Code, 'user_5');
            recordReferral(ref3Code, 'user_6');
            qualifyReferral('user_5');
            qualifyReferral('user_6');

            const leaderboard = getReferralLeaderboard();

            expect(leaderboard).toHaveLength(3);
            expect(leaderboard[0].userId).toBe('ref_1');
            expect(leaderboard[0].qualified).toBe(3);
            expect(leaderboard[1].userId).toBe('ref_3');
            expect(leaderboard[1].qualified).toBe(2);
            expect(leaderboard[2].userId).toBe('ref_2');
            expect(leaderboard[2].qualified).toBe(1);
        });

        it('should respect limit parameter', () => {
            const ref1Code = getReferralCode('ref_1');
            const ref2Code = getReferralCode('ref_2');
            const ref3Code = getReferralCode('ref_3');

            recordReferral(ref1Code, 'user_1');
            recordReferral(ref2Code, 'user_2');
            recordReferral(ref3Code, 'user_3');
            qualifyReferral('user_1');
            qualifyReferral('user_2');
            qualifyReferral('user_3');

            const leaderboard = getReferralLeaderboard(2);
            expect(leaderboard).toHaveLength(2);
        });

        it('should include total earnings', async () => {
            const refCode = getReferralCode('ref_1');

            recordReferral(refCode, 'user_1');
            recordReferral(refCode, 'user_2');
            qualifyReferral('user_1');
            qualifyReferral('user_2');
            await rewardReferral('user_1');
            await rewardReferral('user_2');

            const leaderboard = getReferralLeaderboard();
            expect(leaderboard[0].totalEarned).toBe(200); // 100 + 100
        });

        it('should break ties by rewarded count', async () => {
            const ref1Code = getReferralCode('ref_1');
            const ref2Code = getReferralCode('ref_2');

            // Both have 2 qualified
            recordReferral(ref1Code, 'user_1');
            recordReferral(ref1Code, 'user_2');
            recordReferral(ref2Code, 'user_3');
            recordReferral(ref2Code, 'user_4');
            qualifyReferral('user_1');
            qualifyReferral('user_2');
            qualifyReferral('user_3');
            qualifyReferral('user_4');

            // ref_1 has 2 rewarded, ref_2 has 1 rewarded
            await rewardReferral('user_1');
            await rewardReferral('user_2');
            await rewardReferral('user_3');

            const leaderboard = getReferralLeaderboard();
            expect(leaderboard[0].userId).toBe('ref_1');
            expect(leaderboard[0].rewarded).toBe(2);
        });
    });

    describe('getReferralChain', () => {
        it('should return single entry for user with no referrer', () => {
            const chain = getReferralChain('user_1');

            expect(chain).toHaveLength(1);
            expect(chain[0].level).toBe(0);
            expect(chain[0].userId).toBe('user_1');
            expect(chain[0].referredBy).toBeUndefined();
        });

        it('should trace chain of 2 levels', () => {
            const ref1Code = getReferralCode('ref_1');
            recordReferral(ref1Code, 'user_1');

            const chain = getReferralChain('user_1');

            expect(chain).toHaveLength(2);
            expect(chain[0].userId).toBe('user_1');
            expect(chain[0].referredBy).toBe('ref_1');
            expect(chain[1].userId).toBe('ref_1');
        });

        it('should trace chain up to depth 3', () => {
            const ref1Code = getReferralCode('ref_1');
            const ref2Code = getReferralCode('ref_2');
            const ref3Code = getReferralCode('ref_3');

            recordReferral(ref1Code, 'ref_2');
            recordReferral(ref2Code, 'ref_3');
            recordReferral(ref3Code, 'user_1');

            const chain = getReferralChain('user_1');

            expect(chain).toHaveLength(4); // user_1 -> ref_3 -> ref_2 -> ref_1
            expect(chain[0].userId).toBe('user_1');
            expect(chain[1].userId).toBe('ref_3');
            expect(chain[2].userId).toBe('ref_2');
            expect(chain[3].userId).toBe('ref_1');
        });

        it('should stop at max depth 3', () => {
            // Create chain of 5 levels
            const ref1Code = getReferralCode('ref_1');
            const ref2Code = getReferralCode('ref_2');
            const ref3Code = getReferralCode('ref_3');
            const ref4Code = getReferralCode('ref_4');
            const ref5Code = getReferralCode('ref_5');

            recordReferral(ref1Code, 'ref_2');
            recordReferral(ref2Code, 'ref_3');
            recordReferral(ref3Code, 'ref_4');
            recordReferral(ref4Code, 'ref_5');
            recordReferral(ref5Code, 'user_1');

            const chain = getReferralChain('user_1');

            // Should only go 3 levels deep (plus starting user = 4 entries)
            expect(chain.length).toBeLessThanOrEqual(4);
        });
    });

    describe('getSystemReferralStats', () => {
        it('should return zero stats when no referrals', () => {
            const stats = getSystemReferralStats();

            expect(stats.totalReferrals).toBe(0);
            expect(stats.conversionRate).toBe(0);
            expect(stats.avgTimeToQualify).toBe(0);
            expect(stats.topChannels).toEqual([]);
        });

        it('should calculate conversion rate', () => {
            const refCode = getReferralCode('ref_1');

            recordReferral(refCode, 'user_1');
            recordReferral(refCode, 'user_2');
            recordReferral(refCode, 'user_3');

            qualifyReferral('user_1');

            const stats = getSystemReferralStats();
            expect(stats.totalReferrals).toBe(3);
            expect(stats.conversionRate).toBeCloseTo(1 / 3);
        });

        it('should calculate average time to qualify', async () => {
            const refCode = getReferralCode('ref_1');

            recordReferral(refCode, 'user_1');
            await new Promise((resolve) => setTimeout(resolve, 10));
            qualifyReferral('user_1');

            const stats = getSystemReferralStats();
            expect(stats.avgTimeToQualify).toBeGreaterThan(0);
        });

        it('should return top channels', () => {
            const ref1Code = getReferralCode('ref_1');
            const ref2Code = getReferralCode('ref_2');

            recordReferral(ref1Code, 'user_1');
            recordReferral(ref1Code, 'user_2');
            recordReferral(ref2Code, 'user_3');

            qualifyReferral('user_1');
            qualifyReferral('user_2');
            qualifyReferral('user_3');

            const stats = getSystemReferralStats();
            expect(stats.topChannels).toHaveLength(2);
            expect(stats.topChannels[0].userId).toBe('ref_1');
            expect(stats.topChannels[0].qualified).toBe(2);
        });

        it('should limit top channels to 5', () => {
            // Create 10 referrers with 1 qualified each
            for (let i = 1; i <= 10; i++) {
                const code = getReferralCode(`ref_${i}`);
                recordReferral(code, `user_${i}`);
                qualifyReferral(`user_${i}`);
            }

            const stats = getSystemReferralStats();
            expect(stats.topChannels).toHaveLength(5);
        });
    });

    describe('clearReferrals_forTesting', () => {
        it('should clear all referral data', () => {
            const refCode = getReferralCode('ref_1');
            recordReferral(refCode, 'user_1');

            clearReferrals_forTesting();

            const stats = getSystemReferralStats();
            expect(stats.totalReferrals).toBe(0);
        });
    });

    describe('Edge Cases and Anti-Abuse', () => {
        it('should handle concurrent referrals from same user', () => {
            const refCode = getReferralCode('ref_1');

            // Simulate concurrent signups
            const results = [
                recordReferral(refCode, 'user_1'),
                recordReferral(refCode, 'user_2'),
                recordReferral(refCode, 'user_3'),
            ];

            expect(results.every((r) => r.success)).toBe(true);
        });

        it('should handle empty userId gracefully', () => {
            expect(() => getReferralCode('')).not.toThrow();
        });

        it('should maintain consistency after partial operations', async () => {
            const refCode = getReferralCode('ref_1');

            // Record and qualify
            recordReferral(refCode, 'user_1');
            qualifyReferral('user_1');

            // Attempt invalid reward
            const invalidReward = await rewardReferral('nonexistent');
            expect(invalidReward.success).toBe(false);

            // Valid reward should still work
            const validReward = await rewardReferral('user_1');
            expect(validReward.success).toBe(true);

            // Stats should be consistent
            const stats = getReferralStats('ref_1');
            expect(stats.rewarded).toBe(1);
        });
    });
});

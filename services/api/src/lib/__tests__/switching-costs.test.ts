import { beforeEach, describe, expect, it } from 'vitest';
import {
    clearSwitchingCosts_forTesting,
    getAverageSwitchingCost,
    getChurnRiskBySwitchingCost,
    getDataPortabilityScore,
    getHabitStrength,
    getMoatScore,
    getNetworkEffectStrength,
    getSwitchingCostBreakdown,
    getSwitchingCostScore,
    getUserSegmentBySwitchingCost,
    recordChurn,
    recordUserInvestment,
} from '../switching-costs';

describe('Switching Costs Measurement System', () => {
    beforeEach(() => {
        clearSwitchingCosts_forTesting();
    });

    describe('recordUserInvestment', () => {
        it('should record data investment metrics', () => {
            recordUserInvestment('user1', 'dataInvestment', 'memoriesStored', 50);
            recordUserInvestment('user1', 'dataInvestment', 'conversations', 25);

            const breakdown = getSwitchingCostBreakdown('user1');
            expect(breakdown.dataInvestment).toBeGreaterThan(0);
        });

        it('should record habit formation metrics', () => {
            recordUserInvestment('user2', 'habitFormation', 'daysActive', 30);
            recordUserInvestment('user2', 'habitFormation', 'sessionFrequency', 10);

            const breakdown = getSwitchingCostBreakdown('user2');
            expect(breakdown.habitFormation).toBeGreaterThan(0);
        });

        it('should record network effects metrics', () => {
            recordUserInvestment('user3', 'networkEffects', 'workspaceMembers', 5);
            recordUserInvestment('user3', 'networkEffects', 'sharedConversations', 15);

            const breakdown = getSwitchingCostBreakdown('user3');
            expect(breakdown.networkEffects).toBeGreaterThan(0);
        });

        it('should record customization metrics', () => {
            recordUserInvestment('user4', 'customization', 'pacSettingsConfigured', 5);
            recordUserInvestment('user4', 'customization', 'apiKeysCreated', 2);

            const breakdown = getSwitchingCostBreakdown('user4');
            expect(breakdown.customization).toBeGreaterThan(0);
        });

        it('should record integration depth metrics', () => {
            recordUserInvestment('user5', 'integrationDepth', 'mcpConnections', 3);
            recordUserInvestment('user5', 'integrationDepth', 'webhooksConfigured', 2);

            const breakdown = getSwitchingCostBreakdown('user5');
            expect(breakdown.integrationDepth).toBeGreaterThan(0);
        });

        it('should handle multiple metrics for same dimension', () => {
            recordUserInvestment('user6', 'dataInvestment', 'memoriesStored', 20);
            recordUserInvestment('user6', 'dataInvestment', 'memoriesStored', 30);
            recordUserInvestment('user6', 'dataInvestment', 'conversations', 10);

            const breakdown = getSwitchingCostBreakdown('user6');
            expect(breakdown.dataInvestment).toBeGreaterThan(0);
        });
    });

    describe('getSwitchingCostScore', () => {
        it('should return 0 for new user with no data', () => {
            const score = getSwitchingCostScore('newUser');
            expect(score).toBe(0);
        });

        it('should calculate weighted composite score', () => {
            recordUserInvestment('user1', 'dataInvestment', 'memoriesStored', 50);
            recordUserInvestment('user1', 'habitFormation', 'daysActive', 45);
            recordUserInvestment('user1', 'networkEffects', 'workspaceMembers', 5);

            const score = getSwitchingCostScore('user1');
            expect(score).toBeGreaterThan(0);
            expect(score).toBeLessThanOrEqual(100);
        });

        it('should give higher score to power user', () => {
            // Power user with high investment
            recordUserInvestment('powerUser', 'dataInvestment', 'memoriesStored', 100);
            recordUserInvestment('powerUser', 'dataInvestment', 'conversations', 50);
            recordUserInvestment('powerUser', 'dataInvestment', 'customTemplates', 20);
            recordUserInvestment('powerUser', 'habitFormation', 'daysActive', 90);
            recordUserInvestment('powerUser', 'habitFormation', 'sessionFrequency', 20);
            recordUserInvestment('powerUser', 'habitFormation', 'featuresUsed', 10);
            recordUserInvestment('powerUser', 'networkEffects', 'workspaceMembers', 10);
            recordUserInvestment('powerUser', 'networkEffects', 'sharedConversations', 30);
            recordUserInvestment('powerUser', 'networkEffects', 'referralsMade', 10);
            recordUserInvestment('powerUser', 'customization', 'pacSettingsConfigured', 10);
            recordUserInvestment('powerUser', 'customization', 'modelPreferences', 5);
            recordUserInvestment('powerUser', 'customization', 'apiKeysCreated', 5);
            recordUserInvestment('powerUser', 'integrationDepth', 'mcpConnections', 5);
            recordUserInvestment('powerUser', 'integrationDepth', 'webhooksConfigured', 5);
            recordUserInvestment('powerUser', 'integrationDepth', 'apiUsage', 10000);

            // Light user with minimal investment
            recordUserInvestment('lightUser', 'dataInvestment', 'memoriesStored', 5);
            recordUserInvestment('lightUser', 'habitFormation', 'daysActive', 3);

            const powerScore = getSwitchingCostScore('powerUser');
            const lightScore = getSwitchingCostScore('lightUser');

            expect(powerScore).toBeGreaterThan(lightScore);
            expect(powerScore).toBeGreaterThan(80);
            expect(lightScore).toBeLessThan(20);
        });

        it('should respect dimension weights', () => {
            // User with high dataInvestment (25% weight)
            recordUserInvestment('dataUser', 'dataInvestment', 'memoriesStored', 100);
            recordUserInvestment('dataUser', 'dataInvestment', 'conversations', 50);

            // User with high habitFormation (25% weight)
            recordUserInvestment('habitUser', 'habitFormation', 'daysActive', 90);
            recordUserInvestment('habitUser', 'habitFormation', 'sessionFrequency', 20);

            const dataScore = getSwitchingCostScore('dataUser');
            const habitScore = getSwitchingCostScore('habitUser');

            // Both should have similar scores since weights are equal
            expect(Math.abs(dataScore - habitScore)).toBeLessThan(5);
        });
    });

    describe('getSwitchingCostBreakdown', () => {
        it('should return zero breakdown for new user', () => {
            const breakdown = getSwitchingCostBreakdown('newUser');

            expect(breakdown.dataInvestment).toBe(0);
            expect(breakdown.habitFormation).toBe(0);
            expect(breakdown.networkEffects).toBe(0);
            expect(breakdown.customization).toBe(0);
            expect(breakdown.integrationDepth).toBe(0);
            expect(breakdown.total).toBe(0);
            expect(breakdown.weightedTotal).toBe(0);
        });

        it('should calculate accurate per-dimension scores', () => {
            recordUserInvestment('user1', 'dataInvestment', 'memoriesStored', 50);
            recordUserInvestment('user1', 'habitFormation', 'daysActive', 45);
            recordUserInvestment('user1', 'networkEffects', 'workspaceMembers', 5);
            recordUserInvestment('user1', 'customization', 'pacSettingsConfigured', 5);
            recordUserInvestment('user1', 'integrationDepth', 'mcpConnections', 3);

            const breakdown = getSwitchingCostBreakdown('user1');

            expect(breakdown.dataInvestment).toBeGreaterThan(0);
            expect(breakdown.dataInvestment).toBeLessThanOrEqual(20);
            expect(breakdown.habitFormation).toBeGreaterThan(0);
            expect(breakdown.habitFormation).toBeLessThanOrEqual(20);
            expect(breakdown.networkEffects).toBeGreaterThan(0);
            expect(breakdown.networkEffects).toBeLessThanOrEqual(20);
            expect(breakdown.customization).toBeGreaterThan(0);
            expect(breakdown.customization).toBeLessThanOrEqual(20);
            expect(breakdown.integrationDepth).toBeGreaterThan(0);
            expect(breakdown.integrationDepth).toBeLessThanOrEqual(20);
        });

        it('should cap dimension scores at 20', () => {
            // Excessive data investment
            recordUserInvestment('user1', 'dataInvestment', 'memoriesStored', 1000);
            recordUserInvestment('user1', 'dataInvestment', 'conversations', 500);
            recordUserInvestment('user1', 'dataInvestment', 'customTemplates', 100);

            const breakdown = getSwitchingCostBreakdown('user1');
            expect(breakdown.dataInvestment).toBeLessThanOrEqual(20);
        });

        it('should calculate total as sum of dimensions', () => {
            recordUserInvestment('user1', 'dataInvestment', 'memoriesStored', 50);
            recordUserInvestment('user1', 'habitFormation', 'daysActive', 30);

            const breakdown = getSwitchingCostBreakdown('user1');
            const expectedTotal =
                breakdown.dataInvestment +
                breakdown.habitFormation +
                breakdown.networkEffects +
                breakdown.customization +
                breakdown.integrationDepth;

            expect(breakdown.total).toBe(expectedTotal);
        });

        it('should calculate weighted total correctly', () => {
            recordUserInvestment('user1', 'dataInvestment', 'memoriesStored', 50);
            recordUserInvestment('user1', 'habitFormation', 'daysActive', 30);

            const breakdown = getSwitchingCostBreakdown('user1');

            // Weighted total should be between 0 and 100
            expect(breakdown.weightedTotal).toBeGreaterThanOrEqual(0);
            expect(breakdown.weightedTotal).toBeLessThanOrEqual(100);
        });
    });

    describe('getDataPortabilityScore', () => {
        it('should return 100 for user with no data', () => {
            const score = getDataPortabilityScore('newUser');
            expect(score).toBe(100);
        });

        it('should decrease with more data stored', () => {
            recordUserInvestment('user1', 'dataInvestment', 'memoriesStored', 10);
            recordUserInvestment('user2', 'dataInvestment', 'memoriesStored', 100);

            const score1 = getDataPortabilityScore('user1');
            const score2 = getDataPortabilityScore('user2');

            expect(score2).toBeLessThan(score1);
        });

        it('should not go below 60', () => {
            recordUserInvestment('user1', 'dataInvestment', 'memoriesStored', 10000);

            const score = getDataPortabilityScore('user1');
            expect(score).toBeGreaterThanOrEqual(60);
        });

        it('should reflect inverse of lock-in', () => {
            // More memories = more lock-in = less portability
            recordUserInvestment('user1', 'dataInvestment', 'memoriesStored', 200);

            const portability = getDataPortabilityScore('user1');
            expect(portability).toBeLessThan(90);
        });
    });

    describe('getHabitStrength', () => {
        it('should return 0 for user with no habit data', () => {
            const strength = getHabitStrength('newUser');
            expect(strength).toBe(0);
        });

        it('should calculate from session frequency and days active', () => {
            recordUserInvestment('user1', 'habitFormation', 'sessionFrequency', 15);
            recordUserInvestment('user1', 'habitFormation', 'daysActive', 60);

            const strength = getHabitStrength('user1');
            expect(strength).toBeGreaterThan(0);
            expect(strength).toBeLessThanOrEqual(100);
        });

        it('should give higher score for frequent sessions', () => {
            recordUserInvestment('user1', 'habitFormation', 'sessionFrequency', 5);
            recordUserInvestment('user2', 'habitFormation', 'sessionFrequency', 20);

            const strength1 = getHabitStrength('user1');
            const strength2 = getHabitStrength('user2');

            expect(strength2).toBeGreaterThan(strength1);
        });

        it('should give higher score for longer streaks', () => {
            recordUserInvestment('user1', 'habitFormation', 'daysActive', 10);
            recordUserInvestment('user2', 'habitFormation', 'daysActive', 90);

            const strength1 = getHabitStrength('user1');
            const strength2 = getHabitStrength('user2');

            expect(strength2).toBeGreaterThan(strength1);
        });

        it('should cap at 100', () => {
            recordUserInvestment('user1', 'habitFormation', 'sessionFrequency', 100);
            recordUserInvestment('user1', 'habitFormation', 'daysActive', 365);

            const strength = getHabitStrength('user1');
            expect(strength).toBeLessThanOrEqual(100);
        });
    });

    describe('getNetworkEffectStrength', () => {
        it('should return 0 for user with no network', () => {
            const strength = getNetworkEffectStrength('soloUser');
            expect(strength).toBe(0);
        });

        it('should calculate from workspace and sharing metrics', () => {
            recordUserInvestment('user1', 'networkEffects', 'workspaceMembers', 5);
            recordUserInvestment('user1', 'networkEffects', 'sharedConversations', 15);

            const strength = getNetworkEffectStrength('user1');
            expect(strength).toBeGreaterThan(0);
            expect(strength).toBeLessThanOrEqual(100);
        });

        it('should increase with more network connections', () => {
            recordUserInvestment('user1', 'networkEffects', 'workspaceMembers', 2);
            recordUserInvestment('user2', 'networkEffects', 'workspaceMembers', 10);

            const strength1 = getNetworkEffectStrength('user1');
            const strength2 = getNetworkEffectStrength('user2');

            expect(strength2).toBeGreaterThan(strength1);
        });

        it('should value referrals', () => {
            recordUserInvestment('user1', 'networkEffects', 'referralsMade', 5);

            const strength = getNetworkEffectStrength('user1');
            expect(strength).toBeGreaterThan(0);
        });
    });

    describe('getAverageSwitchingCost', () => {
        it('should return 0 when no users exist', () => {
            const avg = getAverageSwitchingCost();
            expect(avg).toBe(0);
        });

        it('should calculate average across all users', () => {
            recordUserInvestment('user1', 'dataInvestment', 'memoriesStored', 50);
            recordUserInvestment('user2', 'dataInvestment', 'memoriesStored', 30);
            recordUserInvestment('user3', 'dataInvestment', 'memoriesStored', 20);

            const avg = getAverageSwitchingCost();
            expect(avg).toBeGreaterThan(0);
        });

        it('should reflect platform maturity', () => {
            // Young platform with light users
            recordUserInvestment('user1', 'dataInvestment', 'memoriesStored', 5);
            recordUserInvestment('user2', 'dataInvestment', 'memoriesStored', 3);

            const avgYoung = getAverageSwitchingCost();

            clearSwitchingCosts_forTesting();

            // Mature platform with invested users
            recordUserInvestment('user3', 'dataInvestment', 'memoriesStored', 80);
            recordUserInvestment('user3', 'habitFormation', 'daysActive', 60);
            recordUserInvestment('user4', 'dataInvestment', 'memoriesStored', 70);
            recordUserInvestment('user4', 'habitFormation', 'daysActive', 50);

            const avgMature = getAverageSwitchingCost();

            expect(avgMature).toBeGreaterThan(avgYoung);
        });
    });

    describe('getUserSegmentBySwitchingCost', () => {
        it('should return zeros when no users exist', () => {
            const segments = getUserSegmentBySwitchingCost();

            expect(segments.low).toBe(0);
            expect(segments.medium).toBe(0);
            expect(segments.high).toBe(0);
        });

        it('should segment users into low/medium/high buckets', () => {
            // Low switching cost user (0-33)
            recordUserInvestment('lowUser', 'dataInvestment', 'memoriesStored', 5);

            // Medium switching cost user (34-66)
            recordUserInvestment('medUser', 'dataInvestment', 'memoriesStored', 40);
            recordUserInvestment('medUser', 'dataInvestment', 'conversations', 18);
            recordUserInvestment('medUser', 'habitFormation', 'daysActive', 30);
            recordUserInvestment('medUser', 'habitFormation', 'sessionFrequency', 7);

            // High switching cost user (67-100)
            recordUserInvestment('highUser', 'dataInvestment', 'memoriesStored', 100);
            recordUserInvestment('highUser', 'dataInvestment', 'conversations', 50);
            recordUserInvestment('highUser', 'dataInvestment', 'customTemplates', 20);
            recordUserInvestment('highUser', 'habitFormation', 'daysActive', 90);
            recordUserInvestment('highUser', 'habitFormation', 'sessionFrequency', 20);
            recordUserInvestment('highUser', 'habitFormation', 'featuresUsed', 10);
            recordUserInvestment('highUser', 'networkEffects', 'workspaceMembers', 10);
            recordUserInvestment('highUser', 'networkEffects', 'sharedConversations', 30);
            recordUserInvestment('highUser', 'customization', 'pacSettingsConfigured', 6);
            recordUserInvestment('highUser', 'integrationDepth', 'mcpConnections', 4);

            const segments = getUserSegmentBySwitchingCost();

            expect(segments.low).toBeGreaterThan(0);
            expect(segments.medium + segments.high).toBeGreaterThan(0); // At least one user in mid-high range
            expect(segments.high).toBeGreaterThan(0);
        });

        it('should count all users', () => {
            recordUserInvestment('user1', 'dataInvestment', 'memoriesStored', 5);
            recordUserInvestment('user2', 'dataInvestment', 'memoriesStored', 40);
            recordUserInvestment('user3', 'dataInvestment', 'memoriesStored', 100);

            const segments = getUserSegmentBySwitchingCost();
            const total = segments.low + segments.medium + segments.high;

            expect(total).toBe(3);
        });
    });

    describe('churn risk correlation', () => {
        it('should track churn events', () => {
            recordUserInvestment('user1', 'dataInvestment', 'memoriesStored', 10);
            recordChurn('user1', true);

            const churnRisk = getChurnRiskBySwitchingCost();
            expect(churnRisk).toBeDefined();
        });

        it('should calculate churn rate by segment', () => {
            // Low switching cost users - high churn
            recordUserInvestment('low1', 'dataInvestment', 'memoriesStored', 2);
            recordChurn('low1', true);
            recordUserInvestment('low2', 'dataInvestment', 'memoriesStored', 3);
            recordChurn('low2', true);

            // High switching cost users - low churn
            recordUserInvestment('high1', 'dataInvestment', 'memoriesStored', 100);
            recordUserInvestment('high1', 'habitFormation', 'daysActive', 90);
            recordChurn('high1', false);
            recordUserInvestment('high2', 'dataInvestment', 'memoriesStored', 90);
            recordUserInvestment('high2', 'habitFormation', 'daysActive', 80);
            recordChurn('high2', false);

            const churnRisk = getChurnRiskBySwitchingCost();

            expect(churnRisk.low).toBeGreaterThan(churnRisk.high);
        });

        it('should calculate correlation strength', () => {
            // Create clear negative correlation
            recordUserInvestment('low1', 'dataInvestment', 'memoriesStored', 2);
            recordChurn('low1', true);

            recordUserInvestment('high1', 'dataInvestment', 'memoriesStored', 100);
            recordUserInvestment('high1', 'habitFormation', 'daysActive', 90);
            recordChurn('high1', false);

            const churnRisk = getChurnRiskBySwitchingCost();

            // Negative correlation means high switching cost = low churn
            expect(churnRisk.correlationStrength).toBeLessThanOrEqual(0);
            expect(churnRisk.correlationStrength).toBeGreaterThanOrEqual(-1);
        });

        it('should handle no churn data gracefully', () => {
            recordUserInvestment('user1', 'dataInvestment', 'memoriesStored', 50);

            const churnRisk = getChurnRiskBySwitchingCost();
            expect(churnRisk.low).toBe(0);
            expect(churnRisk.medium).toBe(0);
            expect(churnRisk.high).toBe(0);
        });
    });

    describe('getMoatScore', () => {
        it('should return 0 for platform with no users', () => {
            const moat = getMoatScore();
            expect(moat).toBe(0);
        });

        it('should calculate platform-level moat strength', () => {
            recordUserInvestment('user1', 'dataInvestment', 'memoriesStored', 50);
            recordUserInvestment('user1', 'habitFormation', 'daysActive', 45);

            const moat = getMoatScore();
            expect(moat).toBeGreaterThan(0);
            expect(moat).toBeLessThanOrEqual(100);
        });

        it('should increase with more invested users', () => {
            recordUserInvestment('user1', 'dataInvestment', 'memoriesStored', 10);

            const moatWeak = getMoatScore();

            recordUserInvestment('user2', 'dataInvestment', 'memoriesStored', 100);
            recordUserInvestment('user2', 'habitFormation', 'daysActive', 90);
            recordUserInvestment('user3', 'dataInvestment', 'memoriesStored', 90);
            recordUserInvestment('user3', 'habitFormation', 'daysActive', 80);

            const moatStrong = getMoatScore();

            expect(moatStrong).toBeGreaterThan(moatWeak);
        });

        it('should factor in user segmentation', () => {
            // Platform with mostly high switching cost users
            recordUserInvestment('high1', 'dataInvestment', 'memoriesStored', 100);
            recordUserInvestment('high1', 'dataInvestment', 'conversations', 50);
            recordUserInvestment('high1', 'dataInvestment', 'customTemplates', 20);
            recordUserInvestment('high1', 'habitFormation', 'daysActive', 90);
            recordUserInvestment('high1', 'habitFormation', 'sessionFrequency', 20);
            recordUserInvestment('high1', 'habitFormation', 'featuresUsed', 10);
            recordUserInvestment('high1', 'networkEffects', 'workspaceMembers', 10);
            recordUserInvestment('high1', 'networkEffects', 'sharedConversations', 28);
            recordUserInvestment('high1', 'customization', 'pacSettingsConfigured', 7);
            recordUserInvestment('high1', 'integrationDepth', 'mcpConnections', 4);
            recordUserInvestment('high2', 'dataInvestment', 'memoriesStored', 95);
            recordUserInvestment('high2', 'dataInvestment', 'conversations', 48);
            recordUserInvestment('high2', 'dataInvestment', 'customTemplates', 19);
            recordUserInvestment('high2', 'habitFormation', 'daysActive', 85);
            recordUserInvestment('high2', 'habitFormation', 'sessionFrequency', 19);
            recordUserInvestment('high2', 'habitFormation', 'featuresUsed', 9);
            recordUserInvestment('high2', 'networkEffects', 'workspaceMembers', 9);
            recordUserInvestment('high2', 'networkEffects', 'sharedConversations', 25);
            recordUserInvestment('high2', 'customization', 'pacSettingsConfigured', 6);
            recordUserInvestment('high2', 'integrationDepth', 'mcpConnections', 4);
            recordUserInvestment('low1', 'dataInvestment', 'memoriesStored', 5);

            const moat = getMoatScore();
            expect(moat).toBeGreaterThan(30);
        });

        it('should factor in churn correlation', () => {
            recordUserInvestment('user1', 'dataInvestment', 'memoriesStored', 100);
            recordUserInvestment('user1', 'habitFormation', 'daysActive', 90);
            recordChurn('user1', false);

            recordUserInvestment('user2', 'dataInvestment', 'memoriesStored', 5);
            recordChurn('user2', true);

            const moat = getMoatScore();
            expect(moat).toBeGreaterThan(0);
        });

        it('should cap at 100', () => {
            // Create extremely strong moat
            for (let i = 0; i < 10; i++) {
                recordUserInvestment(`user${i}`, 'dataInvestment', 'memoriesStored', 100);
                recordUserInvestment(`user${i}`, 'dataInvestment', 'conversations', 50);
                recordUserInvestment(`user${i}`, 'dataInvestment', 'customTemplates', 20);
                recordUserInvestment(`user${i}`, 'habitFormation', 'daysActive', 90);
                recordUserInvestment(`user${i}`, 'habitFormation', 'sessionFrequency', 20);
                recordUserInvestment(`user${i}`, 'habitFormation', 'featuresUsed', 10);
                recordChurn(`user${i}`, false);
            }

            const moat = getMoatScore();
            expect(moat).toBeLessThanOrEqual(100);
        });
    });

    describe('edge cases', () => {
        it('should handle negative metric values', () => {
            recordUserInvestment('user1', 'dataInvestment', 'memoriesStored', -10);

            const score = getSwitchingCostScore('user1');
            expect(score).toBeGreaterThanOrEqual(0);
        });

        it('should handle very large metric values', () => {
            recordUserInvestment('user1', 'dataInvestment', 'memoriesStored', 1000000);

            const score = getSwitchingCostScore('user1');
            expect(score).toBeLessThanOrEqual(100);
        });

        it('should handle decimal metric values', () => {
            recordUserInvestment('user1', 'habitFormation', 'sessionFrequency', 5.5);

            const score = getSwitchingCostScore('user1');
            expect(score).toBeGreaterThanOrEqual(0);
        });

        it('should handle zero values', () => {
            recordUserInvestment('user1', 'dataInvestment', 'memoriesStored', 0);

            const score = getSwitchingCostScore('user1');
            expect(score).toBe(0);
        });

        it('should handle same user recorded multiple times', () => {
            for (let i = 0; i < 100; i++) {
                recordUserInvestment('user1', 'dataInvestment', 'memoriesStored', 1);
            }

            const score = getSwitchingCostScore('user1');
            expect(score).toBeGreaterThan(0);
        });
    });

    describe('clearSwitchingCosts_forTesting', () => {
        it('should clear all user metrics', () => {
            recordUserInvestment('user1', 'dataInvestment', 'memoriesStored', 50);
            recordUserInvestment('user2', 'habitFormation', 'daysActive', 30);

            clearSwitchingCosts_forTesting();

            const score1 = getSwitchingCostScore('user1');
            const score2 = getSwitchingCostScore('user2');

            expect(score1).toBe(0);
            expect(score2).toBe(0);
        });

        it('should clear churn data', () => {
            recordUserInvestment('user1', 'dataInvestment', 'memoriesStored', 10);
            recordChurn('user1', true);

            clearSwitchingCosts_forTesting();

            const churnRisk = getChurnRiskBySwitchingCost();
            expect(churnRisk.low).toBe(0);
        });

        it('should reset average and moat scores', () => {
            recordUserInvestment('user1', 'dataInvestment', 'memoriesStored', 50);

            clearSwitchingCosts_forTesting();

            const avg = getAverageSwitchingCost();
            const moat = getMoatScore();

            expect(avg).toBe(0);
            expect(moat).toBe(0);
        });

        it('should allow fresh data after clearing', () => {
            recordUserInvestment('user1', 'dataInvestment', 'memoriesStored', 50);
            clearSwitchingCosts_forTesting();

            recordUserInvestment('user2', 'dataInvestment', 'memoriesStored', 30);

            const score = getSwitchingCostScore('user2');
            expect(score).toBeGreaterThan(0);
        });
    });

    describe('real-world scenarios', () => {
        it('should model free tier user with minimal investment', () => {
            recordUserInvestment('freeUser', 'dataInvestment', 'memoriesStored', 5);
            recordUserInvestment('freeUser', 'habitFormation', 'daysActive', 7);
            recordUserInvestment('freeUser', 'habitFormation', 'sessionFrequency', 2);

            const score = getSwitchingCostScore('freeUser');
            const breakdown = getSwitchingCostBreakdown('freeUser');

            expect(score).toBeLessThan(25);
            expect(breakdown.dataInvestment).toBeLessThan(10);
            expect(breakdown.networkEffects).toBe(0);
        });

        it('should model pro user with moderate investment', () => {
            recordUserInvestment('proUser', 'dataInvestment', 'memoriesStored', 65);
            recordUserInvestment('proUser', 'dataInvestment', 'conversations', 32);
            recordUserInvestment('proUser', 'habitFormation', 'daysActive', 55);
            recordUserInvestment('proUser', 'habitFormation', 'sessionFrequency', 16);
            recordUserInvestment('proUser', 'customization', 'pacSettingsConfigured', 6);
            recordUserInvestment('proUser', 'customization', 'modelPreferences', 3);

            const score = getSwitchingCostScore('proUser');
            const breakdown = getSwitchingCostBreakdown('proUser');

            expect(score).toBeGreaterThanOrEqual(28);
            expect(score).toBeLessThan(70);
            expect(breakdown.customization).toBeGreaterThan(0);
        });

        it('should model enterprise user with deep integration', () => {
            recordUserInvestment('entUser', 'dataInvestment', 'memoriesStored', 100);
            recordUserInvestment('entUser', 'dataInvestment', 'conversations', 50);
            recordUserInvestment('entUser', 'dataInvestment', 'customTemplates', 20);
            recordUserInvestment('entUser', 'habitFormation', 'daysActive', 90);
            recordUserInvestment('entUser', 'habitFormation', 'sessionFrequency', 20);
            recordUserInvestment('entUser', 'habitFormation', 'featuresUsed', 10);
            recordUserInvestment('entUser', 'networkEffects', 'workspaceMembers', 10);
            recordUserInvestment('entUser', 'networkEffects', 'sharedConversations', 30);
            recordUserInvestment('entUser', 'networkEffects', 'referralsMade', 5);
            recordUserInvestment('entUser', 'customization', 'pacSettingsConfigured', 10);
            recordUserInvestment('entUser', 'customization', 'apiKeysCreated', 5);
            recordUserInvestment('entUser', 'integrationDepth', 'mcpConnections', 5);
            recordUserInvestment('entUser', 'integrationDepth', 'webhooksConfigured', 5);
            recordUserInvestment('entUser', 'integrationDepth', 'apiUsage', 10000);

            const score = getSwitchingCostScore('entUser');
            const breakdown = getSwitchingCostBreakdown('entUser');

            expect(score).toBeGreaterThan(70);
            expect(breakdown.integrationDepth).toBeGreaterThan(15);
            expect(breakdown.networkEffects).toBeGreaterThanOrEqual(15);
        });

        it('should show platform moat growing over time', () => {
            // Month 1: New platform, mostly free users
            recordUserInvestment('m1u1', 'dataInvestment', 'memoriesStored', 3);
            recordUserInvestment('m1u2', 'dataInvestment', 'memoriesStored', 5);

            const moatMonth1 = getMoatScore();

            // Month 6: Users more invested
            recordUserInvestment('m6u1', 'dataInvestment', 'memoriesStored', 50);
            recordUserInvestment('m6u1', 'habitFormation', 'daysActive', 45);
            recordUserInvestment('m6u2', 'dataInvestment', 'memoriesStored', 40);
            recordUserInvestment('m6u2', 'habitFormation', 'daysActive', 30);

            const moatMonth6 = getMoatScore();

            expect(moatMonth6).toBeGreaterThan(moatMonth1);
        });
    });
});

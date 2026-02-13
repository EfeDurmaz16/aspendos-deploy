import { beforeEach, describe, expect, it } from 'vitest';
import {
    clearRevenue_forTesting,
    getAverageRevenuePerUser,
    getChurnRate,
    getLifetimeValue,
    getMarginAnalysis,
    getMonthlyRecurringRevenue,
    getRevenueByTier,
    getRevenueForecasts,
    getRevenueGrowthRate,
    getUnitEconomics,
    recordChurn,
    recordExpense,
    recordRevenue,
    TIER_PRICING,
} from '../revenue-analytics';

describe('Revenue Analytics', () => {
    beforeEach(() => {
        clearRevenue_forTesting();
    });

    describe('recordRevenue', () => {
        it('should record a revenue event', () => {
            const event = recordRevenue('user1', 19, 'subscription', 'pro');

            expect(event.userId).toBe('user1');
            expect(event.amount).toBe(19);
            expect(event.type).toBe('subscription');
            expect(event.tier).toBe('pro');
            expect(event.timestamp).toBeInstanceOf(Date);
        });

        it('should record multiple revenue events', () => {
            recordRevenue('user1', 19, 'subscription', 'pro');
            recordRevenue('user2', 49, 'subscription', 'ultra');
            recordRevenue('user3', 199, 'subscription', 'enterprise');

            const mrr = getMonthlyRecurringRevenue();
            expect(mrr).toBe(267);
        });

        it('should handle refunds as negative revenue', () => {
            recordRevenue('user1', 19, 'subscription', 'pro');
            recordRevenue('user1', -19, 'refund', 'pro');

            const arpu = getAverageRevenuePerUser();
            expect(arpu).toBe(0);
        });
    });

    describe('getMonthlyRecurringRevenue', () => {
        it('should return 0 when no subscriptions', () => {
            expect(getMonthlyRecurringRevenue()).toBe(0);
        });

        it('should calculate MRR from active subscriptions', () => {
            recordRevenue('user1', 19, 'subscription', 'pro');
            recordRevenue('user2', 49, 'subscription', 'ultra');
            recordRevenue('user3', 199, 'subscription', 'enterprise');

            expect(getMonthlyRecurringRevenue()).toBe(267);
        });

        it('should not include one-time revenue in MRR', () => {
            recordRevenue('user1', 19, 'subscription', 'pro');
            recordRevenue('user2', 100, 'one_time', 'pro');

            expect(getMonthlyRecurringRevenue()).toBe(19);
        });

        it('should update MRR when user upgrades', () => {
            recordRevenue('user1', 19, 'subscription', 'pro');
            expect(getMonthlyRecurringRevenue()).toBe(19);

            recordRevenue('user1', 49, 'subscription', 'ultra');
            expect(getMonthlyRecurringRevenue()).toBe(49);
        });

        it('should handle mixed tier subscriptions', () => {
            recordRevenue('user1', 19, 'subscription', 'pro');
            recordRevenue('user2', 19, 'subscription', 'pro');
            recordRevenue('user3', 49, 'subscription', 'ultra');
            recordRevenue('user4', 199, 'subscription', 'enterprise');

            expect(getMonthlyRecurringRevenue()).toBe(286);
        });
    });

    describe('getAverageRevenuePerUser', () => {
        it('should return 0 when no revenue', () => {
            expect(getAverageRevenuePerUser()).toBe(0);
        });

        it('should calculate ARPU correctly', () => {
            recordRevenue('user1', 19, 'subscription', 'pro');
            recordRevenue('user2', 49, 'subscription', 'ultra');
            recordRevenue('user3', 199, 'subscription', 'enterprise');

            const arpu = getAverageRevenuePerUser();
            expect(arpu).toBe((19 + 49 + 199) / 3);
        });

        it('should count same user multiple times', () => {
            recordRevenue('user1', 19, 'subscription', 'pro');
            recordRevenue('user1', 100, 'credit_purchase', 'pro');

            const arpu = getAverageRevenuePerUser();
            expect(arpu).toBe(119);
        });

        it('should handle single user', () => {
            recordRevenue('user1', 19, 'subscription', 'pro');

            expect(getAverageRevenuePerUser()).toBe(19);
        });
    });

    describe('getLifetimeValue', () => {
        it('should use industry average when no churn', () => {
            recordRevenue('user1', 19, 'subscription', 'pro');

            const ltv = getLifetimeValue('pro');
            expect(ltv).toBe(TIER_PRICING.pro * 20);
        });

        it('should calculate LTV based on churn rate', () => {
            recordRevenue('user1', 19, 'subscription', 'pro');
            recordRevenue('user2', 19, 'subscription', 'pro');
            recordChurn('user1');

            const churnRate = getChurnRate();
            const ltv = getLifetimeValue('pro');

            expect(ltv).toBeGreaterThan(0);
            expect(ltv).toBe(19 / churnRate);
        });

        it('should calculate overall LTV without tier', () => {
            recordRevenue('user1', 19, 'subscription', 'pro');
            recordRevenue('user2', 49, 'subscription', 'ultra');
            recordChurn('user1');

            const ltv = getLifetimeValue();
            expect(ltv).toBeGreaterThan(0);
        });

        it('should handle tier-specific LTV', () => {
            recordRevenue('user1', 19, 'subscription', 'pro');
            recordRevenue('user2', 49, 'subscription', 'ultra');
            recordChurn('user1');

            const proLTV = getLifetimeValue('pro');
            const ultraLTV = getLifetimeValue('ultra');

            expect(proLTV).toBeLessThan(ultraLTV);
        });
    });

    describe('getChurnRate', () => {
        it('should return 0 when no users', () => {
            expect(getChurnRate()).toBe(0);
        });

        it('should calculate churn rate correctly', () => {
            recordRevenue('user1', 19, 'subscription', 'pro');
            recordRevenue('user2', 19, 'subscription', 'pro');
            recordRevenue('user3', 19, 'subscription', 'pro');
            recordChurn('user1');

            const churnRate = getChurnRate();
            expect(churnRate).toBe(1 / 3);
        });

        it('should only count churns in period', () => {
            recordRevenue('user1', 19, 'subscription', 'pro');
            recordRevenue('user2', 19, 'subscription', 'pro');

            // Simulate old churn by setting timestamp
            const oldChurn = recordChurn('user1');
            oldChurn.timestamp = new Date('2020-01-01');

            const churnRate = getChurnRate(30);
            expect(churnRate).toBe(0);
        });

        it('should handle 100% churn', () => {
            recordRevenue('user1', 19, 'subscription', 'pro');
            recordChurn('user1');

            expect(getChurnRate()).toBe(1);
        });
    });

    describe('getRevenueByTier', () => {
        it('should return zeros when no revenue', () => {
            const breakdown = getRevenueByTier();

            expect(breakdown.free).toBe(0);
            expect(breakdown.pro).toBe(0);
            expect(breakdown.ultra).toBe(0);
            expect(breakdown.enterprise).toBe(0);
        });

        it('should breakdown revenue by tier', () => {
            recordRevenue('user1', 19, 'subscription', 'pro');
            recordRevenue('user2', 49, 'subscription', 'ultra');
            recordRevenue('user3', 199, 'subscription', 'enterprise');

            const breakdown = getRevenueByTier();

            expect(breakdown.pro).toBe(19);
            expect(breakdown.ultra).toBe(49);
            expect(breakdown.enterprise).toBe(199);
            expect(breakdown.free).toBe(0);
        });

        it('should aggregate multiple payments in same tier', () => {
            recordRevenue('user1', 19, 'subscription', 'pro');
            recordRevenue('user2', 19, 'subscription', 'pro');
            recordRevenue('user3', 19, 'subscription', 'pro');

            const breakdown = getRevenueByTier();
            expect(breakdown.pro).toBe(57);
        });

        it('should handle all tier types', () => {
            recordRevenue('user1', 0, 'one_time', 'free');
            recordRevenue('user2', 19, 'subscription', 'pro');
            recordRevenue('user3', 49, 'subscription', 'ultra');
            recordRevenue('user4', 199, 'subscription', 'enterprise');

            const breakdown = getRevenueByTier();

            expect(breakdown.free).toBe(0);
            expect(breakdown.pro).toBe(19);
            expect(breakdown.ultra).toBe(49);
            expect(breakdown.enterprise).toBe(199);
        });
    });

    describe('getRevenueGrowthRate', () => {
        it('should return 0 when no revenue', () => {
            expect(getRevenueGrowthRate()).toBe(0);
        });

        it('should calculate growth rate', () => {
            // Month 1
            recordRevenue('user1', 100, 'subscription', 'pro');

            // Month 2
            recordRevenue('user2', 200, 'subscription', 'pro');

            const growthRate = getRevenueGrowthRate(2);
            expect(growthRate).toBeGreaterThanOrEqual(0);
        });

        it('should handle negative growth', () => {
            recordRevenue('user1', 200, 'subscription', 'pro');
            recordRevenue('user2', 100, 'subscription', 'pro');

            const growthRate = getRevenueGrowthRate(2);
            expect(typeof growthRate).toBe('number');
        });

        it('should average over multiple months', () => {
            const growthRate = getRevenueGrowthRate(3);
            expect(typeof growthRate).toBe('number');
        });
    });

    describe('getUnitEconomics', () => {
        it('should calculate unit economics', () => {
            recordRevenue('user1', 19, 'subscription', 'pro');
            recordExpense('marketing', 50);

            const economics = getUnitEconomics();

            expect(economics.cac).toBeGreaterThan(0);
            expect(economics.ltv).toBeGreaterThan(0);
            expect(economics.ltvCacRatio).toBeGreaterThan(0);
            expect(economics.paybackMonths).toBeGreaterThanOrEqual(0);
            expect(typeof economics.grossMargin).toBe('number');
        });

        it('should have healthy LTV/CAC ratio', () => {
            recordRevenue('user1', 19, 'subscription', 'pro');
            recordRevenue('user2', 49, 'subscription', 'ultra');
            recordRevenue('user3', 199, 'subscription', 'enterprise');
            recordExpense('marketing', 30);

            const economics = getUnitEconomics();

            expect(economics.ltvCacRatio).toBeGreaterThan(3);
        });

        it('should calculate CAC from acquisition expenses', () => {
            recordRevenue('user1', 19, 'subscription', 'pro');
            recordExpense('marketing', 50);
            recordExpense('advertising', 30);

            const economics = getUnitEconomics();

            expect(economics.cac).toBe(80);
        });

        it('should calculate gross margin', () => {
            recordRevenue('user1', 100, 'subscription', 'pro');
            recordExpense('compute', 20);
            recordExpense('api', 10);

            const economics = getUnitEconomics();

            expect(economics.grossMargin).toBe(70);
        });

        it('should handle zero CAC', () => {
            recordRevenue('user1', 19, 'subscription', 'pro');

            const economics = getUnitEconomics();

            expect(economics.cac).toBe(0);
            expect(economics.ltvCacRatio).toBe(0);
        });
    });

    describe('getRevenueForecasts', () => {
        it('should project future revenue', () => {
            recordRevenue('user1', 19, 'subscription', 'pro');
            recordRevenue('user2', 49, 'subscription', 'ultra');

            const forecasts = getRevenueForecasts(6);

            expect(forecasts).toHaveLength(6);
            expect(forecasts[0].month).toBe(1);
            expect(forecasts[5].month).toBe(6);
        });

        it('should include confidence intervals', () => {
            recordRevenue('user1', 19, 'subscription', 'pro');

            const forecasts = getRevenueForecasts(3);

            for (const forecast of forecasts) {
                expect(forecast.confidenceInterval.low).toBeLessThan(forecast.projectedRevenue);
                expect(forecast.confidenceInterval.high).toBeGreaterThan(forecast.projectedRevenue);
            }
        });

        it('should project MRR growth', () => {
            recordRevenue('user1', 19, 'subscription', 'pro');
            recordRevenue('user2', 49, 'subscription', 'ultra');

            const forecasts = getRevenueForecasts(3);

            expect(forecasts[0].projectedMRR).toBeGreaterThan(0);
            expect(forecasts[2].projectedMRR).toBeGreaterThanOrEqual(forecasts[0].projectedMRR);
        });

        it('should handle zero growth rate', () => {
            recordRevenue('user1', 19, 'subscription', 'pro');

            const forecasts = getRevenueForecasts(2);

            expect(forecasts).toHaveLength(2);
            expect(forecasts[0].projectedRevenue).toBeGreaterThanOrEqual(0);
        });
    });

    describe('recordChurn', () => {
        it('should record churn event', () => {
            recordRevenue('user1', 19, 'subscription', 'pro');
            const churnEvent = recordChurn('user1');

            expect(churnEvent.userId).toBe('user1');
            expect(churnEvent.timestamp).toBeInstanceOf(Date);
        });

        it('should remove user from active subscriptions', () => {
            recordRevenue('user1', 19, 'subscription', 'pro');
            expect(getMonthlyRecurringRevenue()).toBe(19);

            recordChurn('user1');
            expect(getMonthlyRecurringRevenue()).toBe(0);
        });

        it('should affect churn rate calculation', () => {
            recordRevenue('user1', 19, 'subscription', 'pro');
            recordRevenue('user2', 19, 'subscription', 'pro');

            expect(getChurnRate()).toBe(0);

            recordChurn('user1');
            expect(getChurnRate()).toBeGreaterThan(0);
        });
    });

    describe('recordExpense', () => {
        it('should record expense event', () => {
            const expense = recordExpense('compute', 100);

            expect(expense.category).toBe('compute');
            expect(expense.amount).toBe(100);
            expect(expense.timestamp).toBeInstanceOf(Date);
        });

        it('should track multiple expense categories', () => {
            recordExpense('compute', 50);
            recordExpense('api', 30);
            recordExpense('infra', 20);

            const analysis = getMarginAnalysis();

            expect(analysis.expensesByCategory.compute).toBe(50);
            expect(analysis.expensesByCategory.api).toBe(30);
            expect(analysis.expensesByCategory.infra).toBe(20);
        });

        it('should aggregate expenses in same category', () => {
            recordExpense('compute', 50);
            recordExpense('compute', 50);
            recordExpense('compute', 50);

            const analysis = getMarginAnalysis();
            expect(analysis.expensesByCategory.compute).toBe(150);
        });
    });

    describe('getMarginAnalysis', () => {
        it('should calculate margin correctly', () => {
            recordRevenue('user1', 100, 'subscription', 'pro');
            recordExpense('compute', 30);

            const analysis = getMarginAnalysis();

            expect(analysis.totalRevenue).toBe(100);
            expect(analysis.totalExpenses).toBe(30);
            expect(analysis.grossMargin).toBe(70);
            expect(analysis.marginPercentage).toBe(70);
        });

        it('should break down expenses by category', () => {
            recordRevenue('user1', 200, 'subscription', 'pro');
            recordExpense('compute', 50);
            recordExpense('api', 30);
            recordExpense('marketing', 20);

            const analysis = getMarginAnalysis();

            expect(analysis.expensesByCategory).toEqual({
                compute: 50,
                api: 30,
                marketing: 20,
            });
        });

        it('should handle negative margin', () => {
            recordRevenue('user1', 50, 'subscription', 'pro');
            recordExpense('compute', 100);

            const analysis = getMarginAnalysis();

            expect(analysis.grossMargin).toBe(-50);
            expect(analysis.marginPercentage).toBe(-100);
        });

        it('should handle zero revenue', () => {
            recordExpense('compute', 50);

            const analysis = getMarginAnalysis();

            expect(analysis.totalRevenue).toBe(0);
            expect(analysis.totalExpenses).toBe(50);
            expect(analysis.marginPercentage).toBe(0);
        });

        it('should handle zero expenses', () => {
            recordRevenue('user1', 100, 'subscription', 'pro');

            const analysis = getMarginAnalysis();

            expect(analysis.totalRevenue).toBe(100);
            expect(analysis.totalExpenses).toBe(0);
            expect(analysis.grossMargin).toBe(100);
            expect(analysis.marginPercentage).toBe(100);
        });
    });

    describe('clearRevenue_forTesting', () => {
        it('should clear all revenue data', () => {
            recordRevenue('user1', 19, 'subscription', 'pro');
            recordRevenue('user2', 49, 'subscription', 'ultra');
            recordExpense('compute', 50);
            recordChurn('user1');

            clearRevenue_forTesting();

            expect(getMonthlyRecurringRevenue()).toBe(0);
            expect(getAverageRevenuePerUser()).toBe(0);
            expect(getChurnRate()).toBe(0);

            const breakdown = getRevenueByTier();
            expect(breakdown.pro).toBe(0);
            expect(breakdown.ultra).toBe(0);

            const analysis = getMarginAnalysis();
            expect(analysis.totalRevenue).toBe(0);
            expect(analysis.totalExpenses).toBe(0);
        });
    });

    describe('TIER_PRICING', () => {
        it('should have correct pricing', () => {
            expect(TIER_PRICING.free).toBe(0);
            expect(TIER_PRICING.pro).toBe(19);
            expect(TIER_PRICING.ultra).toBe(49);
            expect(TIER_PRICING.enterprise).toBe(199);
        });
    });

    describe('Edge Cases', () => {
        it('should handle refunds reducing total revenue', () => {
            recordRevenue('user1', 100, 'subscription', 'pro');
            recordRevenue('user1', -50, 'refund', 'pro');

            const arpu = getAverageRevenuePerUser();
            expect(arpu).toBe(50);
        });

        it('should handle multiple churns from same user', () => {
            recordRevenue('user1', 19, 'subscription', 'pro');
            recordChurn('user1');
            recordChurn('user1');

            const churnRate = getChurnRate();
            expect(churnRate).toBeGreaterThan(0);
        });

        it('should handle large revenue numbers', () => {
            for (let i = 0; i < 1000; i++) {
                recordRevenue(`user${i}`, 199, 'subscription', 'enterprise');
            }

            const mrr = getMonthlyRecurringRevenue();
            expect(mrr).toBe(199000);
        });

        it('should handle mixed revenue types', () => {
            recordRevenue('user1', 19, 'subscription', 'pro');
            recordRevenue('user1', 100, 'credit_purchase', 'pro');
            recordRevenue('user1', 50, 'one_time', 'pro');
            recordRevenue('user1', -10, 'refund', 'pro');

            const arpu = getAverageRevenuePerUser();
            expect(arpu).toBe(159);
        });
    });
});

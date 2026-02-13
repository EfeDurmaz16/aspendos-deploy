/**
 * Revenue and LTV Analytics
 *
 * Tracks revenue events and calculates key business metrics to prove unit economics.
 * Part of Economic Viability pillar.
 */

export type RevenueType = 'subscription' | 'one_time' | 'credit_purchase' | 'refund';
export type Tier = 'free' | 'pro' | 'ultra' | 'enterprise';

export interface RevenueEvent {
    userId: string;
    amount: number;
    type: RevenueType;
    tier: Tier;
    timestamp: Date;
}

export interface ExpenseEvent {
    category: string;
    amount: number;
    timestamp: Date;
}

export interface ChurnEvent {
    userId: string;
    timestamp: Date;
}

export interface UnitEconomics {
    cac: number;
    ltv: number;
    ltvCacRatio: number;
    paybackMonths: number;
    grossMargin: number;
}

export interface MarginAnalysis {
    totalRevenue: number;
    totalExpenses: number;
    grossMargin: number;
    marginPercentage: number;
    expensesByCategory: Record<string, number>;
}

export interface RevenueForecast {
    month: number;
    projectedRevenue: number;
    projectedMRR: number;
    confidenceInterval: { low: number; high: number };
}

// In-memory storage
let revenueEvents: RevenueEvent[] = [];
let expenseEvents: ExpenseEvent[] = [];
let churnEvents: ChurnEvent[] = [];
const activeSubscriptions: Map<string, { tier: Tier; amount: number; startDate: Date }> = new Map();

// Tier pricing
export const TIER_PRICING: Record<Tier, number> = {
    free: 0,
    pro: 19,
    ultra: 49,
    enterprise: 199,
};

/**
 * Record a revenue event
 */
export function recordRevenue(
    userId: string,
    amount: number,
    type: RevenueType,
    tier: Tier
): RevenueEvent {
    const event: RevenueEvent = {
        userId,
        amount,
        type,
        tier,
        timestamp: new Date(),
    };

    revenueEvents.push(event);

    // Track active subscriptions
    if (type === 'subscription') {
        activeSubscriptions.set(userId, {
            tier,
            amount,
            startDate: event.timestamp,
        });
    }

    return event;
}

/**
 * Calculate Monthly Recurring Revenue from active subscriptions
 */
export function getMonthlyRecurringRevenue(): number {
    let mrr = 0;
    for (const subscription of activeSubscriptions.values()) {
        mrr += subscription.amount;
    }
    return mrr;
}

/**
 * Calculate Average Revenue Per User
 */
export function getAverageRevenuePerUser(): number {
    if (revenueEvents.length === 0) return 0;

    const uniqueUsers = new Set(revenueEvents.map((e) => e.userId));
    const totalRevenue = revenueEvents.reduce((sum, e) => sum + e.amount, 0);

    return totalRevenue / uniqueUsers.size;
}

/**
 * Calculate Lifetime Value by tier
 */
export function getLifetimeValue(tier?: Tier): number {
    const churnRate = getChurnRate();

    if (churnRate === 0) {
        // No churn yet, use industry average of 5% monthly churn
        return tier ? TIER_PRICING[tier] * 20 : getAverageRevenuePerUser() * 20;
    }

    if (tier) {
        // LTV for specific tier
        const tierRevenue = revenueEvents
            .filter((e) => e.tier === tier)
            .reduce((sum, e) => sum + e.amount, 0);

        const tierUsers = new Set(
            revenueEvents.filter((e) => e.tier === tier).map((e) => e.userId)
        );
        const arpu = tierUsers.size > 0 ? tierRevenue / tierUsers.size : TIER_PRICING[tier];

        return arpu / churnRate;
    }

    // Overall LTV
    const arpu = getAverageRevenuePerUser();
    return arpu / churnRate;
}

/**
 * Calculate churn rate as percentage
 */
export function getChurnRate(periodDays = 30): number {
    if (activeSubscriptions.size === 0 && churnEvents.length === 0) return 0;

    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - periodDays);

    const churnsInPeriod = churnEvents.filter((e) => e.timestamp >= periodStart).length;
    const totalSubscribers = activeSubscriptions.size + churnsInPeriod;

    if (totalSubscribers === 0) return 0;

    return churnsInPeriod / totalSubscribers;
}

/**
 * Get revenue breakdown by tier
 */
export function getRevenueByTier(): Record<Tier, number> {
    const breakdown: Record<Tier, number> = {
        free: 0,
        pro: 0,
        ultra: 0,
        enterprise: 0,
    };

    for (const event of revenueEvents) {
        breakdown[event.tier] += event.amount;
    }

    return breakdown;
}

/**
 * Calculate revenue growth rate
 */
export function getRevenueGrowthRate(months = 3): number {
    if (revenueEvents.length === 0) return 0;

    const now = new Date();
    const monthlyRevenue: number[] = [];

    // Calculate revenue for each month
    for (let i = 0; i < months; i++) {
        const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

        const revenue = revenueEvents
            .filter((e) => e.timestamp >= monthStart && e.timestamp <= monthEnd)
            .reduce((sum, e) => sum + e.amount, 0);

        monthlyRevenue.unshift(revenue);
    }

    // Calculate average growth rate
    let totalGrowth = 0;
    let validPeriods = 0;

    for (let i = 1; i < monthlyRevenue.length; i++) {
        if (monthlyRevenue[i - 1] > 0) {
            const growth = (monthlyRevenue[i] - monthlyRevenue[i - 1]) / monthlyRevenue[i - 1];
            totalGrowth += growth;
            validPeriods++;
        }
    }

    return validPeriods > 0 ? totalGrowth / validPeriods : 0;
}

/**
 * Calculate unit economics
 */
export function getUnitEconomics(): UnitEconomics {
    const ltv = getLifetimeValue();
    const cac = calculateCAC();
    const ltvCacRatio = cac > 0 ? ltv / cac : 0;

    const monthlyRevenue = getMonthlyRecurringRevenue();
    const paybackMonths =
        cac > 0 && monthlyRevenue > 0 ? cac / (monthlyRevenue / activeSubscriptions.size) : 0;

    const totalRevenue = revenueEvents.reduce((sum, e) => sum + e.amount, 0);
    const totalExpenses = expenseEvents.reduce((sum, e) => sum + e.amount, 0);
    const grossMargin =
        totalRevenue > 0 ? ((totalRevenue - totalExpenses) / totalRevenue) * 100 : 0;

    return {
        cac,
        ltv,
        ltvCacRatio,
        paybackMonths,
        grossMargin,
    };
}

/**
 * Calculate Customer Acquisition Cost
 * Assumes marketing and sales expenses are categorized appropriately
 */
function calculateCAC(): number {
    const acquisitionExpenses = expenseEvents
        .filter((e) => ['marketing', 'sales', 'advertising'].includes(e.category.toLowerCase()))
        .reduce((sum, e) => sum + e.amount, 0);

    const uniqueUsers = new Set(revenueEvents.map((e) => e.userId));

    return uniqueUsers.size > 0 ? acquisitionExpenses / uniqueUsers.size : 0;
}

/**
 * Project future revenue based on trends
 */
export function getRevenueForecasts(months: number): RevenueForecast[] {
    const growthRate = getRevenueGrowthRate();
    const currentMRR = getMonthlyRecurringRevenue();
    const forecasts: RevenueForecast[] = [];

    for (let i = 1; i <= months; i++) {
        const projectedMRR = currentMRR * (1 + growthRate) ** i;
        const projectedRevenue = projectedMRR;

        // 20% confidence interval
        const confidenceInterval = {
            low: projectedRevenue * 0.8,
            high: projectedRevenue * 1.2,
        };

        forecasts.push({
            month: i,
            projectedRevenue,
            projectedMRR,
            confidenceInterval,
        });
    }

    return forecasts;
}

/**
 * Record a churn event
 */
export function recordChurn(userId: string): ChurnEvent {
    const event: ChurnEvent = {
        userId,
        timestamp: new Date(),
    };

    churnEvents.push(event);
    activeSubscriptions.delete(userId);

    return event;
}

/**
 * Record an expense
 */
export function recordExpense(category: string, amount: number): ExpenseEvent {
    const event: ExpenseEvent = {
        category,
        amount,
        timestamp: new Date(),
    };

    expenseEvents.push(event);
    return event;
}

/**
 * Get margin analysis
 */
export function getMarginAnalysis(): MarginAnalysis {
    const totalRevenue = revenueEvents.reduce((sum, e) => sum + e.amount, 0);
    const totalExpenses = expenseEvents.reduce((sum, e) => sum + e.amount, 0);
    const grossMargin = totalRevenue - totalExpenses;
    const marginPercentage = totalRevenue > 0 ? (grossMargin / totalRevenue) * 100 : 0;

    const expensesByCategory: Record<string, number> = {};
    for (const expense of expenseEvents) {
        expensesByCategory[expense.category] =
            (expensesByCategory[expense.category] || 0) + expense.amount;
    }

    return {
        totalRevenue,
        totalExpenses,
        grossMargin,
        marginPercentage,
        expensesByCategory,
    };
}

/**
 * Clear all revenue data (for testing only)
 */
export function clearRevenue_forTesting(): void {
    revenueEvents = [];
    expenseEvents = [];
    churnEvents = [];
    activeSubscriptions.clear();
}

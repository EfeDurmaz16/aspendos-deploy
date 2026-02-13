/**
 * Cohort Analysis System
 * Tracks user signup cohorts and measures retention over time
 * Part of Product-Market Fit measurement
 */

interface User {
    userId: string;
    signupDate: Date;
    cohortId: string;
}

interface CohortActivity {
    userId: string;
    activityDates: Set<string>; // ISO week strings (YYYY-Wxx)
}

interface CohortRetention {
    cohortId: string;
    cohortSize: number;
    retentionByWeek: Map<number, number>; // week number -> retention %
}

interface CohortComparison {
    cohortId: string;
    cohortSize: number;
    week1Retention: number;
    week4Retention: number;
    week8Retention: number;
}

interface RetentionMatrixRow {
    cohortId: string;
    cohortSize: number;
    weeks: (number | null)[];
}

// In-memory storage
const users = new Map<string, User>();
const cohortActivities = new Map<string, CohortActivity>();
const cohorts = new Map<string, Set<string>>(); // cohortId -> Set<userId>

/**
 * Get ISO week number from date
 * Returns format: W{year}-{weekNumber} (e.g., "W2025-03")
 */
function getCohortId(date: Date): string {
    const yearStart = new Date(date.getFullYear(), 0, 1);
    const weekNumber = Math.ceil(
        ((date.getTime() - yearStart.getTime()) / 86400000 + yearStart.getDay() + 1) / 7
    );
    return `W${date.getFullYear()}-${weekNumber.toString().padStart(2, '0')}`;
}

/**
 * Get week number from cohort ID
 */
function getWeekNumber(cohortId: string): number {
    const match = cohortId.match(/W(\d{4})-(\d{2})/);
    if (!match) throw new Error(`Invalid cohort ID: ${cohortId}`);
    const year = Number.parseInt(match[1], 10);
    const week = Number.parseInt(match[2], 10);
    return year * 100 + week;
}

/**
 * Calculate weeks between two cohort IDs
 */
function weeksBetween(cohortId1: string, cohortId2: string): number {
    const week1 = getWeekNumber(cohortId1);
    const week2 = getWeekNumber(cohortId2);

    const year1 = Math.floor(week1 / 100);
    const weekNum1 = week1 % 100;
    const year2 = Math.floor(week2 / 100);
    const weekNum2 = week2 % 100;

    const yearDiff = year2 - year1;
    const weekDiff = weekNum2 - weekNum1;

    return yearDiff * 52 + weekDiff;
}

/**
 * Assign user to weekly cohort based on signup date
 */
export function assignCohort(userId: string, signupDate: Date): string {
    const cohortId = getCohortId(signupDate);

    // Store user
    users.set(userId, {
        userId,
        signupDate,
        cohortId,
    });

    // Add to cohort
    if (!cohorts.has(cohortId)) {
        cohorts.set(cohortId, new Set());
    }
    cohorts.get(cohortId)?.add(userId);

    // Initialize activity tracking
    if (!cohortActivities.has(userId)) {
        cohortActivities.set(userId, {
            userId,
            activityDates: new Set(),
        });
    }

    // Record signup week as first activity
    cohortActivities.get(userId)?.activityDates.add(cohortId);

    return cohortId;
}

/**
 * Record active session for user
 */
export function recordCohortActivity(userId: string, activityDate = new Date()): void {
    const user = users.get(userId);
    if (!user) {
        throw new Error(`User ${userId} not found. Call assignCohort first.`);
    }

    const activityWeek = getCohortId(activityDate);
    cohortActivities.get(userId)?.activityDates.add(activityWeek);
}

/**
 * Get week-over-week retention rates for a cohort
 */
export function getCohortRetention(cohortId: string): CohortRetention {
    const cohortUsers = cohorts.get(cohortId);
    if (!cohortUsers || cohortUsers.size === 0) {
        return {
            cohortId,
            cohortSize: 0,
            retentionByWeek: new Map(),
        };
    }

    const cohortSize = cohortUsers.size;
    const retentionByWeek = new Map<number, number>();

    // Calculate retention for each week (0 = signup week, 1 = week 1, etc.)
    for (let weekOffset = 0; weekOffset <= 52; weekOffset++) {
        let activeUsers = 0;

        for (const userId of cohortUsers) {
            const activity = cohortActivities.get(userId);
            if (!activity) continue;

            // Check if user was active in this week offset
            for (const activityWeek of activity.activityDates) {
                const weekDiff = weeksBetween(cohortId, activityWeek);
                if (weekDiff === weekOffset) {
                    activeUsers++;
                    break;
                }
            }
        }

        if (activeUsers > 0) {
            retentionByWeek.set(weekOffset, (activeUsers / cohortSize) * 100);
        }
    }

    return {
        cohortId,
        cohortSize,
        retentionByWeek,
    };
}

/**
 * Compare all cohorts side by side
 */
export function getCohortComparison(): CohortComparison[] {
    const comparisons: CohortComparison[] = [];

    for (const cohortId of cohorts.keys()) {
        const retention = getCohortRetention(cohortId);
        comparisons.push({
            cohortId,
            cohortSize: retention.cohortSize,
            week1Retention: retention.retentionByWeek.get(1) ?? 0,
            week4Retention: retention.retentionByWeek.get(4) ?? 0,
            week8Retention: retention.retentionByWeek.get(8) ?? 0,
        });
    }

    // Sort by cohort ID (chronological)
    comparisons.sort((a, b) => getWeekNumber(a.cohortId) - getWeekNumber(b.cohortId));

    return comparisons;
}

/**
 * Get classic retention matrix (cohort x week)
 */
export function getRetentionMatrix(maxWeeks = 12): RetentionMatrixRow[] {
    const matrix: RetentionMatrixRow[] = [];

    for (const cohortId of cohorts.keys()) {
        const retention = getCohortRetention(cohortId);
        const weeks: (number | null)[] = [];

        for (let week = 0; week < maxWeeks; week++) {
            const retentionRate = retention.retentionByWeek.get(week);
            weeks.push(retentionRate !== undefined ? Math.round(retentionRate * 10) / 10 : null);
        }

        matrix.push({
            cohortId,
            cohortSize: retention.cohortSize,
            weeks,
        });
    }

    // Sort by cohort ID (chronological)
    matrix.sort((a, b) => getWeekNumber(a.cohortId) - getWeekNumber(b.cohortId));

    return matrix;
}

/**
 * Identify which signup cohort has best retention
 * Returns cohort with highest average retention across first 4 weeks
 */
export function getBestPerformingCohort(): {
    cohortId: string;
    avgRetention: number;
} | null {
    if (cohorts.size === 0) return null;

    let bestCohort: string | null = null;
    let bestAvgRetention = 0;

    for (const cohortId of cohorts.keys()) {
        const retention = getCohortRetention(cohortId);

        // Calculate average retention for weeks 1-4
        let totalRetention = 0;
        let weekCount = 0;

        for (let week = 1; week <= 4; week++) {
            const rate = retention.retentionByWeek.get(week);
            if (rate !== undefined) {
                totalRetention += rate;
                weekCount++;
            }
        }

        if (weekCount === 0) continue;

        const avgRetention = totalRetention / weekCount;

        if (avgRetention > bestAvgRetention) {
            bestAvgRetention = avgRetention;
            bestCohort = cohortId;
        }
    }

    return bestCohort
        ? {
              cohortId: bestCohort,
              avgRetention: Math.round(bestAvgRetention * 10) / 10,
          }
        : null;
}

/**
 * Get number of users in cohort
 */
export function getCohortSize(cohortId: string): number {
    return cohorts.get(cohortId)?.size ?? 0;
}

/**
 * Reset all cohorts for testing
 */
export function clearCohorts_forTesting(): void {
    users.clear();
    cohortActivities.clear();
    cohorts.clear();
}

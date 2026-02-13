/**
 * User Onboarding and Activation Tracking System
 * Tracks user activation milestones to measure PMF and reduce churn
 */

type ActivationMilestone =
    | 'account_created'
    | 'first_message'
    | 'first_memory_created'
    | 'profile_completed'
    | 'first_import'
    | 'first_council'
    | 'first_pac_reminder'
    | 'invited_member'
    | 'upgraded_plan';

interface MilestoneRecord {
    milestone: ActivationMilestone;
    timestamp: Date;
}

interface UserMilestones {
    userId: string;
    milestones: MilestoneRecord[];
    lastActivity: Date;
}

interface FunnelStep {
    milestone: ActivationMilestone;
    count: number;
    percentage: number;
    dropOff: number;
}

interface ChurnRisk {
    risk: 'HIGH' | 'MEDIUM' | 'LOW';
    lastActivity: Date;
    score: number;
    daysSinceActive: number;
    recommendation: string;
}

interface OnboardingStats {
    totalUsers: number;
    activatedUsers: number;
    activationRate: number;
    avgScore: number;
    churnRiskDistribution: {
        HIGH: number;
        MEDIUM: number;
        LOW: number;
    };
}

// Milestone weights for activation score calculation
const MILESTONE_WEIGHTS: Record<ActivationMilestone, number> = {
    account_created: 0,
    first_message: 20,
    first_memory_created: 15,
    first_import: 15,
    first_council: 15,
    first_pac_reminder: 15,
    profile_completed: 5,
    invited_member: 10,
    upgraded_plan: 5,
};

// Milestone ordering for funnel analysis
const MILESTONE_ORDER: ActivationMilestone[] = [
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

// In-memory storage (replace with database in production)
const userMilestonesStore = new Map<string, UserMilestones>();

/**
 * Record milestone completion for a user
 * Idempotent - same milestone can't be recorded twice
 */
export function recordMilestone(userId: string, milestone: ActivationMilestone): boolean {
    const now = new Date();

    // Get or create user milestones
    let userMilestones = userMilestonesStore.get(userId);

    if (!userMilestones) {
        userMilestones = {
            userId,
            milestones: [],
            lastActivity: now,
        };
        userMilestonesStore.set(userId, userMilestones);
    }

    // Check if milestone already exists (idempotency)
    const exists = userMilestones.milestones.some((m) => m.milestone === milestone);

    if (exists) {
        return false; // Already recorded
    }

    // Add milestone
    userMilestones.milestones.push({
        milestone,
        timestamp: now,
    });

    // Update last activity
    userMilestones.lastActivity = now;

    return true;
}

/**
 * Get user's completed milestones with timestamps
 */
export function getMilestones(userId: string): MilestoneRecord[] {
    const userMilestones = userMilestonesStore.get(userId);

    if (!userMilestones) {
        return [];
    }

    return [...userMilestones.milestones];
}

/**
 * Return 0-100 score based on milestones completed
 */
export function getActivationScore(userId: string): number {
    const milestones = getMilestones(userId);

    let score = 0;

    for (const record of milestones) {
        score += MILESTONE_WEIGHTS[record.milestone];
    }

    return Math.min(100, score);
}

/**
 * System-wide funnel analysis
 * For each milestone, count users who reached it
 * Calculate drop-off percentages between steps
 */
export function getActivationFunnel(): {
    steps: FunnelStep[];
} {
    const milestoneCounts = new Map<ActivationMilestone, number>();

    // Count users who reached each milestone
    for (const userMilestones of userMilestonesStore.values()) {
        const completedMilestones = new Set(userMilestones.milestones.map((m) => m.milestone));

        for (const milestone of completedMilestones) {
            milestoneCounts.set(milestone, (milestoneCounts.get(milestone) || 0) + 1);
        }
    }

    const totalUsers = userMilestonesStore.size;
    const steps: FunnelStep[] = [];

    let previousCount = totalUsers;

    for (const milestone of MILESTONE_ORDER) {
        const count = milestoneCounts.get(milestone) || 0;
        const percentage = totalUsers > 0 ? (count / totalUsers) * 100 : 0;
        const dropOff = previousCount > 0 ? ((previousCount - count) / previousCount) * 100 : 0;

        steps.push({
            milestone,
            count,
            percentage,
            dropOff,
        });

        previousCount = count;
    }

    return { steps };
}

/**
 * Users with activation score >= threshold (default 60)
 */
export function getActivatedUsers(threshold = 60): string[] {
    const activatedUsers: string[] = [];

    for (const userId of userMilestonesStore.keys()) {
        const score = getActivationScore(userId);
        if (score >= threshold) {
            activatedUsers.push(userId);
        }
    }

    return activatedUsers;
}

/**
 * Analyze churn risk for a user
 * - HIGH: No activity in 7+ days, score < 30
 * - MEDIUM: No activity in 3+ days, score < 60
 * - LOW: Active, score >= 60
 */
export function getChurnRisk(userId: string): ChurnRisk {
    const userMilestones = userMilestonesStore.get(userId);

    if (!userMilestones) {
        return {
            risk: 'HIGH',
            lastActivity: new Date(),
            score: 0,
            daysSinceActive: 0,
            recommendation: 'User not found. Consider re-engagement campaign.',
        };
    }

    const score = getActivationScore(userId);
    const now = new Date();
    const lastActivity = userMilestones.lastActivity;
    const daysSinceActive = Math.floor(
        (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24)
    );

    // HIGH risk: No activity in 7+ days, score < 30
    if (daysSinceActive >= 7 && score < 30) {
        return {
            risk: 'HIGH',
            lastActivity,
            score,
            daysSinceActive,
            recommendation:
                'Critical churn risk. Send re-engagement email with value proposition and onboarding tips.',
        };
    }

    // MEDIUM risk: No activity in 3+ days, score < 60
    if (daysSinceActive >= 3 && score < 60) {
        return {
            risk: 'MEDIUM',
            lastActivity,
            score,
            daysSinceActive,
            recommendation:
                'Moderate churn risk. Send nudge notification highlighting unused features (PAC, Council, Import).',
        };
    }

    // LOW risk: Active, score >= 60
    return {
        risk: 'LOW',
        lastActivity,
        score,
        daysSinceActive,
        recommendation:
            'User is activated. Continue nurturing with advanced tips and feature updates.',
    };
}

/**
 * Get onboarding statistics
 */
export function getOnboardingStats(): OnboardingStats {
    const totalUsers = userMilestonesStore.size;
    const activatedUsers = getActivatedUsers(60).length;
    const activationRate = totalUsers > 0 ? (activatedUsers / totalUsers) * 100 : 0;

    let totalScore = 0;
    const churnRiskDistribution = {
        HIGH: 0,
        MEDIUM: 0,
        LOW: 0,
    };

    for (const userId of userMilestonesStore.keys()) {
        totalScore += getActivationScore(userId);
        const churnRisk = getChurnRisk(userId);
        churnRiskDistribution[churnRisk.risk]++;
    }

    const avgScore = totalUsers > 0 ? totalScore / totalUsers : 0;

    return {
        totalUsers,
        activatedUsers,
        activationRate,
        avgScore,
        churnRiskDistribution,
    };
}

/**
 * Reset all onboarding data (for testing only)
 */
export function clearOnboarding_forTesting(): void {
    userMilestonesStore.clear();
}

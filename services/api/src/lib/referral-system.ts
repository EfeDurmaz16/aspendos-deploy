/**
 * Referral Tracking System for Viral Growth
 *
 * Enables viral user acquisition through referral rewards.
 * Tracks referral chains, qualifications, and rewards.
 *
 * Flow:
 * 1. User gets unique referral code via getReferralCode()
 * 2. New user signs up with referrerCode -> recordReferral()
 * 3. New user activates (5 messages) -> qualifyReferral()
 * 4. Referrer gets rewarded -> rewardReferral()
 *
 * Features:
 * - Deterministic referral codes (8 char alphanumeric)
 * - Anti-abuse: max 50 referrals per user
 * - Tiered rewards: 100 credits for referrer, 50 for referred
 * - Referral chain tracking (depth 3)
 * - Leaderboard rankings
 * - System-wide analytics
 */

import { addCredits } from './credit-system';

type ReferralStatus = 'pending' | 'qualified' | 'rewarded';

interface Referral {
    referralId: string;
    referrerUserId: string;
    referrerCode: string;
    referredUserId: string;
    status: ReferralStatus;
    recordedAt: number;
    qualifiedAt?: number;
    rewardedAt?: number;
    creditsAwarded?: {
        referrer: number;
        referred: number;
    };
}

interface ReferralCode {
    userId: string;
    code: string;
    createdAt: number;
}

interface ReferralStats {
    totalReferred: number;
    qualified: number;
    rewarded: number;
    totalCreditsEarned: number;
    referralCode: string;
    leaderboardRank: number;
}

interface SystemReferralStats {
    totalReferrals: number;
    conversionRate: number; // qualified / total
    avgTimeToQualify: number; // ms
    topChannels: Array<{ userId: string; code: string; qualified: number }>;
}

// In-memory storage
const referralCodes = new Map<string, ReferralCode>(); // userId -> ReferralCode
const codeToUserId = new Map<string, string>(); // code -> userId
const referrals = new Map<string, Referral>(); // referralId -> Referral
const userReferrals = new Map<string, string[]>(); // referrerUserId -> referralIds[]

// Config
const REFERRER_REWARD = 100;
const REFERRED_REWARD = 50;
const MAX_REFERRALS_PER_USER = 50;

function generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Generate unique deterministic referral code based on userId.
 * Uses base36 encoding for compact 8-char alphanumeric codes.
 *
 * @param userId - User ID to generate code for
 * @returns 8 character alphanumeric code (e.g., "X7K9M2P4")
 */
export function generateReferralCode(userId: string): string {
    // Create deterministic hash from userId
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
        const char = userId.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash; // Convert to 32bit integer
    }

    // Convert to positive number and encode in base36
    const positiveHash = Math.abs(hash);
    let code = positiveHash.toString(36).toUpperCase();

    // Pad or trim to 8 characters
    if (code.length < 8) {
        // Pad with hash of userId + code
        const seed = `${userId}${code}`;
        let extraHash = 0;
        for (let i = 0; i < seed.length; i++) {
            extraHash = (extraHash << 5) - extraHash + seed.charCodeAt(i);
            extraHash = extraHash & extraHash;
        }
        code = code + Math.abs(extraHash).toString(36).toUpperCase();
    }

    // Return first 8 chars
    return code.slice(0, 8);
}

/**
 * Get existing referral code or generate new one for user.
 * Idempotent - always returns the same code for a given userId.
 *
 * @param userId - User ID
 * @returns Referral code string
 */
export function getReferralCode(userId: string): string {
    // Check if code already exists
    const existing = referralCodes.get(userId);
    if (existing) {
        return existing.code;
    }

    // Generate new code
    const code = generateReferralCode(userId);

    // Store mapping
    const referralCode: ReferralCode = {
        userId,
        code,
        createdAt: Date.now(),
    };

    referralCodes.set(userId, referralCode);
    codeToUserId.set(code, userId);

    return code;
}

/**
 * Record a new referral when user signs up via referral code.
 * Validates referrer exists and prevents self-referral.
 *
 * @param referrerCode - Referral code used during signup
 * @param newUserId - ID of newly registered user
 * @returns { success: true, referralId } or { success: false, reason }
 */
export function recordReferral(
    referrerCode: string,
    newUserId: string
): { success: true; referralId: string } | { success: false; reason: string } {
    // Validate referrer code exists
    const referrerUserId = codeToUserId.get(referrerCode);
    if (!referrerUserId) {
        return { success: false, reason: 'invalid_referral_code' };
    }

    // Prevent self-referral
    if (referrerUserId === newUserId) {
        return { success: false, reason: 'self_referral_not_allowed' };
    }

    // Check if user was already referred
    for (const referral of referrals.values()) {
        if (referral.referredUserId === newUserId) {
            return { success: false, reason: 'user_already_referred' };
        }
    }

    // Check referrer hasn't hit max referrals (anti-abuse)
    const referrerReferrals = userReferrals.get(referrerUserId) || [];
    if (referrerReferrals.length >= MAX_REFERRALS_PER_USER) {
        return { success: false, reason: 'max_referrals_reached' };
    }

    // Create referral record
    const referralId = generateId('ref');
    const referral: Referral = {
        referralId,
        referrerUserId,
        referrerCode,
        referredUserId: newUserId,
        status: 'pending',
        recordedAt: Date.now(),
    };

    referrals.set(referralId, referral);

    // Update referrer's referral list
    if (!userReferrals.has(referrerUserId)) {
        userReferrals.set(referrerUserId, []);
    }
    userReferrals.get(referrerUserId)!.push(referralId);

    return { success: true, referralId };
}

/**
 * Mark referral as qualified after referred user completes activation.
 * Activation = sending 5 messages or other criteria.
 *
 * @param newUserId - ID of referred user who completed activation
 * @returns { success: true, referralId } or { success: false, reason }
 */
export function qualifyReferral(
    newUserId: string
): { success: true; referralId: string } | { success: false; reason: string } {
    // Find referral for this user
    let targetReferral: Referral | null = null;
    for (const referral of referrals.values()) {
        if (referral.referredUserId === newUserId && referral.status === 'pending') {
            targetReferral = referral;
            break;
        }
    }

    if (!targetReferral) {
        return { success: false, reason: 'referral_not_found_or_already_qualified' };
    }

    // Update status
    targetReferral.status = 'qualified';
    targetReferral.qualifiedAt = Date.now();

    return { success: true, referralId: targetReferral.referralId };
}

/**
 * Award credits to both referrer and referred user when referral qualifies.
 * Configurable rewards: 100 credits for referrer, 50 for referred.
 * Anti-abuse: max 50 referrals per user enforced in recordReferral.
 *
 * @param newUserId - ID of referred user
 * @returns { success: true, referrerReward, referredReward } or { success: false, reason }
 */
export async function rewardReferral(
    newUserId: string
): Promise<
    | { success: true; referrerReward: number; referredReward: number; referralId: string }
    | { success: false; reason: string }
> {
    // Find qualified referral for this user
    let targetReferral: Referral | null = null;
    for (const referral of referrals.values()) {
        if (referral.referredUserId === newUserId && referral.status === 'qualified') {
            targetReferral = referral;
            break;
        }
    }

    if (!targetReferral) {
        return { success: false, reason: 'referral_not_qualified' };
    }

    // Award credits to referrer
    await addCredits(targetReferral.referrerUserId, REFERRER_REWARD, 'referral_bonus');

    // Award credits to referred user
    await addCredits(newUserId, REFERRED_REWARD, 'referral_bonus');

    // Update referral status
    targetReferral.status = 'rewarded';
    targetReferral.rewardedAt = Date.now();
    targetReferral.creditsAwarded = {
        referrer: REFERRER_REWARD,
        referred: REFERRED_REWARD,
    };

    return {
        success: true,
        referrerReward: REFERRER_REWARD,
        referredReward: REFERRED_REWARD,
        referralId: targetReferral.referralId,
    };
}

/**
 * Get comprehensive referral statistics for a user.
 *
 * @param userId - User ID
 * @returns Stats object with referral metrics and leaderboard rank
 */
export function getReferralStats(userId: string): ReferralStats {
    const referralCode = getReferralCode(userId);
    const userReferralIds = userReferrals.get(userId) || [];

    let qualified = 0;
    let rewarded = 0;
    let totalCreditsEarned = 0;

    for (const refId of userReferralIds) {
        const referral = referrals.get(refId);
        if (!referral) continue;

        if (referral.status === 'qualified' || referral.status === 'rewarded') {
            qualified++;
        }

        if (referral.status === 'rewarded' && referral.creditsAwarded) {
            rewarded++;
            totalCreditsEarned += referral.creditsAwarded.referrer;
        }
    }

    // Calculate leaderboard rank
    const leaderboard = getReferralLeaderboard();
    const rank = leaderboard.findIndex((entry) => entry.userId === userId) + 1;

    return {
        totalReferred: userReferralIds.length,
        qualified,
        rewarded,
        totalCreditsEarned,
        referralCode,
        leaderboardRank: rank || 0, // 0 if not in leaderboard
    };
}

/**
 * Get top referrers by qualified referral count.
 *
 * @param limit - Number of top referrers to return (default: 10)
 * @returns Array of top referrers with stats
 */
export function getReferralLeaderboard(limit = 10): Array<{
    userId: string;
    code: string;
    qualified: number;
    rewarded: number;
    totalEarned: number;
}> {
    const leaderboard: Map<
        string,
        { userId: string; code: string; qualified: number; rewarded: number; totalEarned: number }
    > = new Map();

    // Aggregate stats per user
    for (const [userId, refIds] of userReferrals.entries()) {
        const code = getReferralCode(userId);
        let qualified = 0;
        let rewarded = 0;
        let totalEarned = 0;

        for (const refId of refIds) {
            const referral = referrals.get(refId);
            if (!referral) continue;

            if (referral.status === 'qualified' || referral.status === 'rewarded') {
                qualified++;
            }

            if (referral.status === 'rewarded' && referral.creditsAwarded) {
                rewarded++;
                totalEarned += referral.creditsAwarded.referrer;
            }
        }

        leaderboard.set(userId, { userId, code, qualified, rewarded, totalEarned });
    }

    // Sort by qualified count (desc), then by rewarded (desc)
    return Array.from(leaderboard.values())
        .sort((a, b) => {
            if (b.qualified !== a.qualified) return b.qualified - a.qualified;
            return b.rewarded - a.rewarded;
        })
        .slice(0, limit);
}

/**
 * Show referral chain: who referred whom up to depth 3.
 *
 * @param userId - User ID to trace chain from
 * @returns Array of referral chain entries
 */
export function getReferralChain(
    userId: string
): Array<{ level: number; userId: string; code: string; referredBy?: string }> {
    const chain: Array<{ level: number; userId: string; code: string; referredBy?: string }> = [];
    const maxDepth = 3;

    // Start with given user
    let currentUserId = userId;
    let level = 0;

    while (level <= maxDepth) {
        const code = getReferralCode(currentUserId);

        // Find who referred this user
        let referredBy: string | undefined;
        for (const referral of referrals.values()) {
            if (referral.referredUserId === currentUserId) {
                referredBy = referral.referrerUserId;
                break;
            }
        }

        chain.push({
            level,
            userId: currentUserId,
            code,
            referredBy,
        });

        // If no referrer, stop chain
        if (!referredBy) break;

        currentUserId = referredBy;
        level++;
    }

    return chain;
}

/**
 * System-wide referral statistics for analytics.
 *
 * @returns System stats with conversion rate and top performers
 */
export function getSystemReferralStats(): SystemReferralStats {
    const totalReferrals = referrals.size;
    let qualifiedCount = 0;
    let totalQualifyTime = 0;
    let qualifyTimeCount = 0;

    for (const referral of referrals.values()) {
        if (referral.status === 'qualified' || referral.status === 'rewarded') {
            qualifiedCount++;

            if (referral.qualifiedAt) {
                const timeToQualify = referral.qualifiedAt - referral.recordedAt;
                totalQualifyTime += timeToQualify;
                qualifyTimeCount++;
            }
        }
    }

    const conversionRate = totalReferrals > 0 ? qualifiedCount / totalReferrals : 0;
    const avgTimeToQualify = qualifyTimeCount > 0 ? totalQualifyTime / qualifyTimeCount : 0;

    // Get top channels (top referrers by qualified count)
    const topChannels = getReferralLeaderboard(5).map((entry) => ({
        userId: entry.userId,
        code: entry.code,
        qualified: entry.qualified,
    }));

    return {
        totalReferrals,
        conversionRate,
        avgTimeToQualify,
        topChannels,
    };
}

/**
 * Clear all referral data. For testing only.
 */
export function clearReferrals_forTesting(): void {
    referralCodes.clear();
    codeToUserId.clear();
    referrals.clear();
    userReferrals.clear();
}

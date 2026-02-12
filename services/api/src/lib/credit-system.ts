/**
 * Credit System with Double-Spend Prevention
 *
 * Atomic credit reservation/deduction system for economic viability.
 * Prevents revenue leakage from race conditions and double-deductions.
 *
 * Flow:
 * 1. reserveCredits() - Lock credits before operation
 * 2. Operation executes (AI call, etc)
 * 3. commitCredits() on success OR releaseCredits() on failure
 *
 * Features:
 * - Atomic reserve/commit/release
 * - Double-deduction prevention via operationId
 * - Auto-expiry of stale reservations (5min)
 * - Full transaction audit trail
 */

import { withLock } from './concurrency-guard';

interface CreditBalance {
    total: number; // Total credits owned
    reserved: number; // Currently reserved (pending operations)
}

interface Reservation {
    reservationId: string;
    userId: string;
    amount: number;
    operationId: string;
    createdAt: number;
    expiresAt: number;
}

interface Transaction {
    transactionId: string;
    userId: string;
    type: 'reserve' | 'commit' | 'release' | 'add';
    amount: number;
    source?: string; // For 'add' type
    reservationId?: string;
    operationId?: string;
    timestamp: number;
}

type CreditSource = 'subscription_renewal' | 'one_time_purchase' | 'admin_grant' | 'referral_bonus';

// In-memory storage
const balances = new Map<string, CreditBalance>();
const reservations = new Map<string, Reservation>();
const transactions: Transaction[] = [];

// System-wide stats
let totalCreditsIssued = 0;
let totalCreditsConsumed = 0;
let expiredReservationsCount = 0;

const RESERVATION_TTL_MS = 5 * 60 * 1000; // 5 minutes

function generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function ensureBalance(userId: string): CreditBalance {
    if (!balances.has(userId)) {
        balances.set(userId, { total: 0, reserved: 0 });
    }
    return balances.get(userId)!;
}

function recordTransaction(tx: Omit<Transaction, 'transactionId' | 'timestamp'>): string {
    const transactionId = generateId('tx');
    transactions.push({
        transactionId,
        timestamp: Date.now(),
        ...tx,
    });
    return transactionId;
}

/**
 * Reserve credits atomically before an operation starts.
 * Uses concurrency guard to prevent double-deduction.
 *
 * @returns { success: true, reservationId, remainingCredits } or { success: false, reason }
 */
export async function reserveCredits(
    userId: string,
    amount: number,
    operationId: string
): Promise<
    | { success: true; reservationId: string; remainingCredits: number }
    | { success: false; reason: 'insufficient_credits' | 'already_reserved' }
> {
    if (amount <= 0) {
        throw new Error('Amount must be positive');
    }

    // Use concurrency guard to prevent race conditions
    return await withLock(`credit:${userId}:${operationId}`, async () => {
        // Check if this operation already has a reservation
        for (const reservation of reservations.values()) {
            if (reservation.operationId === operationId && reservation.userId === userId) {
                return { success: false, reason: 'already_reserved' as const };
            }
        }

        const balance = ensureBalance(userId);
        const available = balance.total - balance.reserved;

        if (available < amount) {
            return { success: false, reason: 'insufficient_credits' as const };
        }

        // Create reservation
        const reservationId = generateId('rsv');
        const reservation: Reservation = {
            reservationId,
            userId,
            amount,
            operationId,
            createdAt: Date.now(),
            expiresAt: Date.now() + RESERVATION_TTL_MS,
        };

        reservations.set(reservationId, reservation);
        balance.reserved += amount;

        recordTransaction({
            userId,
            type: 'reserve',
            amount,
            reservationId,
            operationId,
        });

        return {
            success: true,
            reservationId,
            remainingCredits: balance.total - balance.reserved,
        };
    });
}

/**
 * Confirm credit deduction after operation succeeds.
 * Only works if reservation exists and hasn't expired.
 *
 * @returns { success: true, newBalance } or { success: false, reason }
 */
export async function commitCredits(
    reservationId: string
): Promise<{ success: true; newBalance: number } | { success: false; reason: string }> {
    const reservation = reservations.get(reservationId);

    if (!reservation) {
        return { success: false, reason: 'reservation_not_found' };
    }

    if (Date.now() > reservation.expiresAt) {
        reservations.delete(reservationId);
        return { success: false, reason: 'reservation_expired' };
    }

    return await withLock(`credit:${reservation.userId}:commit`, async () => {
        const balance = ensureBalance(reservation.userId);

        // Deduct from total and unreserve
        balance.total -= reservation.amount;
        balance.reserved -= reservation.amount;

        totalCreditsConsumed += reservation.amount;

        reservations.delete(reservationId);

        recordTransaction({
            userId: reservation.userId,
            type: 'commit',
            amount: reservation.amount,
            reservationId,
            operationId: reservation.operationId,
        });

        return {
            success: true,
            newBalance: balance.total - balance.reserved,
        };
    });
}

/**
 * Cancel reservation if operation fails.
 * Returns credits back to user's balance.
 * Idempotent - safe to call multiple times.
 */
export async function releaseCredits(
    reservationId: string
): Promise<{ success: true; newBalance: number } | { success: false; reason: string }> {
    const reservation = reservations.get(reservationId);

    if (!reservation) {
        // Already released or never existed - idempotent success
        return { success: false, reason: 'reservation_not_found' };
    }

    return await withLock(`credit:${reservation.userId}:release`, async () => {
        const balance = ensureBalance(reservation.userId);

        // Unreserve (but don't change total)
        balance.reserved -= reservation.amount;

        reservations.delete(reservationId);

        recordTransaction({
            userId: reservation.userId,
            type: 'release',
            amount: reservation.amount,
            reservationId,
            operationId: reservation.operationId,
        });

        return {
            success: true,
            newBalance: balance.total - balance.reserved,
        };
    });
}

/**
 * Get current credit balance (available - reserved).
 */
export function getBalance(userId: string): number {
    const balance = ensureBalance(userId);
    return balance.total - balance.reserved;
}

/**
 * Add credits from purchase/subscription renewal.
 *
 * @param source Where credits came from
 * @returns { newBalance, transactionId }
 */
export async function addCredits(
    userId: string,
    amount: number,
    source: CreditSource
): Promise<{ newBalance: number; transactionId: string }> {
    if (amount <= 0) {
        throw new Error('Amount must be positive');
    }

    return await withLock(`credit:${userId}:add`, async () => {
        const balance = ensureBalance(userId);
        balance.total += amount;

        totalCreditsIssued += amount;

        const transactionId = recordTransaction({
            userId,
            type: 'add',
            amount,
            source,
        });

        return {
            newBalance: balance.total - balance.reserved,
            transactionId,
        };
    });
}

/**
 * Get recent credit transactions for a user.
 */
export function getTransactionHistory(userId: string, limit = 50): Transaction[] {
    return transactions
        .filter((tx) => tx.userId === userId)
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, limit);
}

/**
 * Release reservations older than 5 minutes.
 * Returns count of expired reservations.
 */
export async function cleanupExpiredReservations(): Promise<number> {
    const now = Date.now();
    let cleaned = 0;

    const expired = Array.from(reservations.values()).filter((r) => r.expiresAt <= now);

    for (const reservation of expired) {
        await releaseCredits(reservation.reservationId);
        cleaned++;
        expiredReservationsCount++;
    }

    return cleaned;
}

/**
 * System-wide credit statistics for monitoring.
 */
export function getCreditStats() {
    return {
        totalCreditsIssued,
        totalCreditsConsumed,
        activeReservations: reservations.size,
        expiredReservations: expiredReservationsCount,
    };
}

/**
 * Reset all state. Only for use in tests.
 */
export function clearCredits_forTesting(): void {
    balances.clear();
    reservations.clear();
    transactions.length = 0;
    totalCreditsIssued = 0;
    totalCreditsConsumed = 0;
    expiredReservationsCount = 0;
}

/**
 * Concurrency Guard
 *
 * Protects critical operations (billing, chat creation) from race conditions
 * using in-memory distributed-style locks with TTL auto-expiry.
 *
 * Lock key conventions:
 * - billing:${userId}:credit_deduction
 * - billing:${userId}:plan_change
 * - chat:${chatId}:message_create
 */

interface LockEntry {
    token: string;
    expiresAt: number;
}

interface LockStats {
    activeLocks: number;
    totalAcquired: number;
    totalContentionEvents: number;
}

const lockStore = new Map<string, LockEntry>();
let totalAcquired = 0;
let totalContentionEvents = 0;

function generateToken(): string {
    return `lock_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function cleanupExpired(): void {
    const now = Date.now();
    for (const [resource, entry] of lockStore) {
        if (entry.expiresAt <= now) {
            lockStore.delete(resource);
        }
    }
}

/**
 * Acquire an in-memory lock on a resource.
 * Returns a lock token on success, or null if already locked.
 */
export function acquireLock(resource: string, ttlMs = 30_000): string | null {
    cleanupExpired();

    const existing = lockStore.get(resource);
    if (existing && existing.expiresAt > Date.now()) {
        totalContentionEvents++;
        return null;
    }

    const token = generateToken();
    lockStore.set(resource, { token, expiresAt: Date.now() + ttlMs });
    totalAcquired++;
    return token;
}

/**
 * Release a lock. Only succeeds if the provided token matches the active lock.
 */
export function releaseLock(resource: string, token: string): boolean {
    const entry = lockStore.get(resource);
    if (!entry || entry.token !== token) {
        return false;
    }
    lockStore.delete(resource);
    return true;
}

/**
 * Execute a function with lock protection.
 * Waits up to timeoutMs for the lock to become available, polling every 50ms.
 */
export async function withLock<T>(
    resource: string,
    fn: () => Promise<T>,
    timeoutMs = 5000
): Promise<T> {
    const deadline = Date.now() + timeoutMs;
    let token: string | null = null;

    while (Date.now() < deadline) {
        token = acquireLock(resource);
        if (token) break;
        await new Promise((resolve) => setTimeout(resolve, 50));
    }

    if (!token) {
        throw new Error(`Lock timeout: could not acquire lock on "${resource}" within ${timeoutMs}ms`);
    }

    try {
        return await fn();
    } finally {
        releaseLock(resource, token);
    }
}

/**
 * Check if a resource is currently locked.
 */
export function isLocked(resource: string): boolean {
    cleanupExpired();
    const entry = lockStore.get(resource);
    return !!entry && entry.expiresAt > Date.now();
}

/**
 * Return lock statistics for monitoring.
 */
export function getLockStats(): LockStats {
    cleanupExpired();
    return {
        activeLocks: lockStore.size,
        totalAcquired,
        totalContentionEvents,
    };
}

/**
 * Reset all lock state. Only for use in tests.
 */
export function clearLocks_forTesting(): void {
    lockStore.clear();
    totalAcquired = 0;
    totalContentionEvents = 0;
}

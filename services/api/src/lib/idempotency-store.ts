/**
 * Idempotency Store
 *
 * Prevents duplicate operations by caching results keyed by an idempotency key.
 * Uses in-memory Map with TTL-based expiry and LRU eviction at max capacity.
 */

interface IdempotencyEntry {
    result: unknown;
    expiresAt: number;
    lastAccessedAt: number;
}

const MAX_STORE_SIZE = 10_000;
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

const store = new Map<string, IdempotencyEntry>();

function cleanupExpired(): void {
    const now = Date.now();
    for (const [key, entry] of store) {
        if (entry.expiresAt <= now) {
            store.delete(key);
        }
    }
}

function evictLRU(): void {
    if (store.size < MAX_STORE_SIZE) return;

    let oldestKey: string | null = null;
    let oldestAccess = Infinity;

    for (const [key, entry] of store) {
        if (entry.lastAccessedAt < oldestAccess) {
            oldestAccess = entry.lastAccessedAt;
            oldestKey = key;
        }
    }

    if (oldestKey) {
        store.delete(oldestKey);
    }
}

/**
 * Check if an operation was already performed.
 * Returns the cached result or null if not found / expired.
 */
export function checkIdempotency<T = unknown>(key: string): T | null {
    cleanupExpired();

    const entry = store.get(key);
    if (!entry || entry.expiresAt <= Date.now()) {
        if (entry) store.delete(key);
        return null;
    }

    entry.lastAccessedAt = Date.now();
    return entry.result as T;
}

/**
 * Store the result of an operation for future idempotency checks.
 */
export function recordIdempotency(key: string, result: unknown, ttlMs = DEFAULT_TTL_MS): void {
    cleanupExpired();
    evictLRU();

    store.set(key, {
        result,
        expiresAt: Date.now() + ttlMs,
        lastAccessedAt: Date.now(),
    });
}

/**
 * Reset all idempotency state. Only for use in tests.
 */
export function clearIdempotency_forTesting(): void {
    store.clear();
}

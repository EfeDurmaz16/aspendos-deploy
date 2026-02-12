import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
    checkIdempotency,
    recordIdempotency,
    clearIdempotency_forTesting,
} from '../idempotency-store';

describe('IdempotencyStore', () => {
    beforeEach(() => {
        clearIdempotency_forTesting();
        vi.useRealTimers();
    });

    describe('checkIdempotency / recordIdempotency', () => {
        it('should store and retrieve an idempotent result', () => {
            const result = { chargeId: 'ch_123', amount: 1999 };
            recordIdempotency('billing:charge:abc', result);

            const cached = checkIdempotency('billing:charge:abc');
            expect(cached).toEqual(result);
        });

        it('should return null for unknown key', () => {
            const cached = checkIdempotency('nonexistent-key');
            expect(cached).toBeNull();
        });

        it('should handle primitive results', () => {
            recordIdempotency('op:1', 42);
            recordIdempotency('op:2', 'success');
            recordIdempotency('op:3', true);

            expect(checkIdempotency('op:1')).toBe(42);
            expect(checkIdempotency('op:2')).toBe('success');
            expect(checkIdempotency('op:3')).toBe(true);
        });

        it('should overwrite existing entry on re-record', () => {
            recordIdempotency('op:update', { v: 1 });
            recordIdempotency('op:update', { v: 2 });

            expect(checkIdempotency('op:update')).toEqual({ v: 2 });
        });
    });

    describe('TTL expiry', () => {
        it('should expire entries after TTL', () => {
            vi.useFakeTimers();

            recordIdempotency('billing:charge:abc', { ok: true }, 500);
            expect(checkIdempotency('billing:charge:abc')).toEqual({ ok: true });

            vi.advanceTimersByTime(501);
            expect(checkIdempotency('billing:charge:abc')).toBeNull();
        });

        it('should not expire entries before TTL', () => {
            vi.useFakeTimers();

            recordIdempotency('op:keep', 'alive', 1000);

            vi.advanceTimersByTime(999);
            expect(checkIdempotency('op:keep')).toBe('alive');
        });

        it('should use default 24h TTL when not specified', () => {
            vi.useFakeTimers();

            recordIdempotency('op:default-ttl', 'result');

            // Advance 23 hours - should still be there
            vi.advanceTimersByTime(23 * 60 * 60 * 1000);
            expect(checkIdempotency('op:default-ttl')).toBe('result');

            // Advance past 24 hours
            vi.advanceTimersByTime(2 * 60 * 60 * 1000);
            expect(checkIdempotency('op:default-ttl')).toBeNull();
        });
    });

    describe('LRU eviction', () => {
        it('should evict least recently used entry at max size', () => {
            vi.useFakeTimers();

            // Fill to max capacity (10000)
            for (let i = 0; i < 10_000; i++) {
                vi.advanceTimersByTime(1); // ensure different lastAccessedAt
                recordIdempotency(`key:${i}`, `value:${i}`);
            }

            // The first entry should still exist
            expect(checkIdempotency('key:0')).toBe('value:0');

            // Adding one more triggers eviction of LRU
            // key:0 was just accessed by checkIdempotency above, so key:1 is now LRU
            vi.advanceTimersByTime(1);
            recordIdempotency('key:overflow', 'new');

            // key:1 should have been evicted (oldest lastAccessedAt that wasn't recently read)
            expect(checkIdempotency('key:1')).toBeNull();

            // key:0 should still exist because it was accessed recently
            expect(checkIdempotency('key:0')).toBe('value:0');

            // The new key should exist
            expect(checkIdempotency('key:overflow')).toBe('new');
        });
    });

    describe('clearIdempotency_forTesting', () => {
        it('should reset all state', () => {
            recordIdempotency('op:a', 'result-a');
            recordIdempotency('op:b', 'result-b');

            clearIdempotency_forTesting();

            expect(checkIdempotency('op:a')).toBeNull();
            expect(checkIdempotency('op:b')).toBeNull();
        });
    });
});

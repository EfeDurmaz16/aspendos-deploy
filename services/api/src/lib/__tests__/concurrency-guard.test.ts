import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
    acquireLock,
    releaseLock,
    withLock,
    isLocked,
    getLockStats,
    clearLocks_forTesting,
} from '../concurrency-guard';

describe('ConcurrencyGuard', () => {
    beforeEach(() => {
        clearLocks_forTesting();
        vi.useRealTimers();
    });

    describe('acquireLock / releaseLock', () => {
        it('should acquire a lock and return a token', () => {
            const token = acquireLock('billing:user1:credit_deduction');
            expect(token).toBeTruthy();
            expect(typeof token).toBe('string');
        });

        it('should release a lock with the correct token', () => {
            const token = acquireLock('billing:user1:credit_deduction')!;
            const released = releaseLock('billing:user1:credit_deduction', token);
            expect(released).toBe(true);
            expect(isLocked('billing:user1:credit_deduction')).toBe(false);
        });

        it('should prevent double-acquire on the same resource', () => {
            const token1 = acquireLock('billing:user1:plan_change');
            const token2 = acquireLock('billing:user1:plan_change');
            expect(token1).toBeTruthy();
            expect(token2).toBeNull();
        });

        it('should allow independent resources to lock simultaneously', () => {
            const token1 = acquireLock('billing:user1:credit_deduction');
            const token2 = acquireLock('billing:user2:credit_deduction');
            const token3 = acquireLock('chat:chat1:message_create');

            expect(token1).toBeTruthy();
            expect(token2).toBeTruthy();
            expect(token3).toBeTruthy();
        });

        it('should fail to release with wrong token', () => {
            acquireLock('billing:user1:credit_deduction');
            const released = releaseLock('billing:user1:credit_deduction', 'wrong_token');
            expect(released).toBe(false);
            expect(isLocked('billing:user1:credit_deduction')).toBe(true);
        });

        it('should fail to release a non-existent lock', () => {
            const released = releaseLock('nonexistent', 'some_token');
            expect(released).toBe(false);
        });
    });

    describe('lock auto-expiry', () => {
        it('should auto-expire after TTL', () => {
            vi.useFakeTimers();

            acquireLock('billing:user1:credit_deduction', 100);
            expect(isLocked('billing:user1:credit_deduction')).toBe(true);

            vi.advanceTimersByTime(101);
            expect(isLocked('billing:user1:credit_deduction')).toBe(false);
        });

        it('should allow re-acquire after TTL expires', () => {
            vi.useFakeTimers();

            const token1 = acquireLock('billing:user1:plan_change', 100);
            expect(token1).toBeTruthy();

            vi.advanceTimersByTime(101);

            const token2 = acquireLock('billing:user1:plan_change', 100);
            expect(token2).toBeTruthy();
            expect(token2).not.toBe(token1);
        });
    });

    describe('withLock', () => {
        it('should execute a function under lock protection', async () => {
            const result = await withLock('chat:chat1:message_create', async () => {
                return 'created';
            });
            expect(result).toBe('created');
            expect(isLocked('chat:chat1:message_create')).toBe(false);
        });

        it('should release lock even if function throws', async () => {
            await expect(
                withLock('chat:chat1:message_create', async () => {
                    throw new Error('operation failed');
                })
            ).rejects.toThrow('operation failed');

            expect(isLocked('chat:chat1:message_create')).toBe(false);
        });

        it('should throw on timeout when lock is held', async () => {
            acquireLock('billing:user1:credit_deduction', 60_000);

            await expect(
                withLock(
                    'billing:user1:credit_deduction',
                    async () => 'should not run',
                    200
                )
            ).rejects.toThrow('Lock timeout');
        });

        it('should wait and acquire lock when it becomes available', async () => {
            const token = acquireLock('billing:user1:credit_deduction', 60_000)!;

            // Release after 100ms
            setTimeout(() => releaseLock('billing:user1:credit_deduction', token), 100);

            const result = await withLock(
                'billing:user1:credit_deduction',
                async () => 'acquired',
                2000
            );
            expect(result).toBe('acquired');
        });
    });

    describe('isLocked', () => {
        it('should return false for unlocked resource', () => {
            expect(isLocked('nonexistent')).toBe(false);
        });

        it('should return true for locked resource', () => {
            acquireLock('billing:user1:credit_deduction');
            expect(isLocked('billing:user1:credit_deduction')).toBe(true);
        });
    });

    describe('getLockStats', () => {
        it('should track active locks count', () => {
            acquireLock('resource:a');
            acquireLock('resource:b');

            const stats = getLockStats();
            expect(stats.activeLocks).toBe(2);
        });

        it('should track total acquired count', () => {
            const t1 = acquireLock('resource:a')!;
            releaseLock('resource:a', t1);
            acquireLock('resource:a');

            const stats = getLockStats();
            expect(stats.totalAcquired).toBe(2);
        });

        it('should track contention events', () => {
            acquireLock('resource:a');
            acquireLock('resource:a'); // contention
            acquireLock('resource:a'); // contention

            const stats = getLockStats();
            expect(stats.totalContentionEvents).toBe(2);
        });

        it('should not count expired locks as active', () => {
            vi.useFakeTimers();

            acquireLock('resource:a', 100);
            acquireLock('resource:b', 500);

            vi.advanceTimersByTime(200);

            const stats = getLockStats();
            expect(stats.activeLocks).toBe(1);
        });
    });

    describe('clearLocks_forTesting', () => {
        it('should reset all state', () => {
            acquireLock('resource:a');
            acquireLock('resource:b');
            acquireLock('resource:a'); // contention

            clearLocks_forTesting();

            const stats = getLockStats();
            expect(stats.activeLocks).toBe(0);
            expect(stats.totalAcquired).toBe(0);
            expect(stats.totalContentionEvents).toBe(0);
        });
    });
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    clearDLQ_forTesting,
    dlq,
    type OperationType,
    stopDLQCleanup_forTesting,
} from '../dead-letter-queue';

describe('DeadLetterQueue', () => {
    beforeEach(() => {
        clearDLQ_forTesting();
        stopDLQCleanup_forTesting();
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('enqueue', () => {
        it('should add entry to queue with default values', () => {
            const entry = dlq.enqueue({
                id: 'test-1',
                operationType: 'webhook_delivery',
                payload: { url: 'https://example.com' },
                error: 'Connection timeout',
            });

            expect(entry.id).toBe('test-1');
            expect(entry.operationType).toBe('webhook_delivery');
            expect(entry.attemptCount).toBe(0);
            expect(entry.maxRetries).toBe(5);
            expect(entry.state).toBe('pending');
            expect(entry.createdAt).toBeInstanceOf(Date);
            expect(entry.nextRetryAt).toBeInstanceOf(Date);
        });

        it('should accept custom maxRetries', () => {
            const entry = dlq.enqueue({
                id: 'test-2',
                operationType: 'memory_sync',
                payload: {},
                error: 'DB error',
                maxRetries: 3,
            });

            expect(entry.maxRetries).toBe(3);
        });

        it('should accept custom attemptCount', () => {
            const entry = dlq.enqueue({
                id: 'test-3',
                operationType: 'notification_send',
                payload: {},
                error: 'Failed',
                attemptCount: 2,
            });

            expect(entry.attemptCount).toBe(2);
        });

        it('should support all operation types', () => {
            const types: OperationType[] = [
                'webhook_delivery',
                'memory_sync',
                'notification_send',
                'export_job',
                'email_send',
                'vector_index',
                'api_callback',
            ];

            for (const type of types) {
                const entry = dlq.enqueue({
                    id: `test-${type}`,
                    operationType: type,
                    payload: {},
                    error: 'Test error',
                });

                expect(entry.operationType).toBe(type);
            }
        });

        it('should calculate nextRetryAt with exponential backoff', () => {
            const now = Date.now();
            vi.setSystemTime(now);

            const entry0 = dlq.enqueue({
                id: 'backoff-0',
                operationType: 'webhook_delivery',
                payload: {},
                error: 'Failed',
                attemptCount: 0,
            });

            const entry1 = dlq.enqueue({
                id: 'backoff-1',
                operationType: 'webhook_delivery',
                payload: {},
                error: 'Failed',
                attemptCount: 1,
            });

            const entry2 = dlq.enqueue({
                id: 'backoff-2',
                operationType: 'webhook_delivery',
                payload: {},
                error: 'Failed',
                attemptCount: 2,
            });

            // Attempt 0: 1s, Attempt 1: 2s, Attempt 2: 4s
            expect(entry0.nextRetryAt.getTime()).toBe(now + 1000);
            expect(entry1.nextRetryAt.getTime()).toBe(now + 2000);
            expect(entry2.nextRetryAt.getTime()).toBe(now + 4000);
        });
    });

    describe('dequeue', () => {
        it('should return empty array when no entries ready', () => {
            dlq.enqueue({
                id: 'test-1',
                operationType: 'webhook_delivery',
                payload: {},
                error: 'Failed',
            });

            const ready = dlq.dequeue();
            expect(ready).toHaveLength(0);
        });

        it('should return entries when nextRetryAt has passed', () => {
            const now = Date.now();
            vi.setSystemTime(now);

            dlq.enqueue({
                id: 'test-1',
                operationType: 'webhook_delivery',
                payload: {},
                error: 'Failed',
                attemptCount: 0,
            });

            // Advance time past retry delay (1s for attempt 0)
            vi.setSystemTime(now + 1001);

            const ready = dlq.dequeue();
            expect(ready).toHaveLength(1);
            expect(ready[0].id).toBe('test-1');
        });

        it('should mark dequeued entries as processing', () => {
            const now = Date.now();
            vi.setSystemTime(now);

            dlq.enqueue({
                id: 'test-1',
                operationType: 'webhook_delivery',
                payload: {},
                error: 'Failed',
                attemptCount: 0,
            });

            vi.setSystemTime(now + 1001);
            const ready = dlq.dequeue();

            expect(ready[0].state).toBe('processing');
            expect(ready[0].lastAttemptAt).toBeInstanceOf(Date);
        });

        it('should respect batchSize parameter', () => {
            const now = Date.now();
            vi.setSystemTime(now);

            // Create 5 entries
            for (let i = 0; i < 5; i++) {
                dlq.enqueue({
                    id: `test-${i}`,
                    operationType: 'webhook_delivery',
                    payload: {},
                    error: 'Failed',
                    attemptCount: 0,
                });
            }

            vi.setSystemTime(now + 1001);
            const ready = dlq.dequeue(3);

            expect(ready).toHaveLength(3);
        });

        it('should only dequeue pending entries', () => {
            const now = Date.now();
            vi.setSystemTime(now);

            dlq.enqueue({
                id: 'pending-1',
                operationType: 'webhook_delivery',
                payload: {},
                error: 'Failed',
                attemptCount: 0,
            });

            dlq.enqueue({
                id: 'dead-1',
                operationType: 'webhook_delivery',
                payload: {},
                error: 'Failed',
                attemptCount: 5,
                maxRetries: 5,
            });

            // Mark dead-1 as dead
            dlq.markFailed('dead-1', 'Still failed');

            vi.setSystemTime(now + 1001);
            const ready = dlq.dequeue();

            expect(ready).toHaveLength(1);
            expect(ready[0].id).toBe('pending-1');
        });
    });

    describe('markCompleted', () => {
        it('should remove entry from queue', () => {
            dlq.enqueue({
                id: 'test-1',
                operationType: 'webhook_delivery',
                payload: {},
                error: 'Failed',
            });

            const removed = dlq.markCompleted('test-1');
            expect(removed).toBe(true);

            const entry = dlq.getEntry('test-1');
            expect(entry).toBeUndefined();
        });

        it('should increment totalProcessed counter', () => {
            dlq.enqueue({
                id: 'test-1',
                operationType: 'webhook_delivery',
                payload: {},
                error: 'Failed',
            });

            dlq.enqueue({
                id: 'test-2',
                operationType: 'webhook_delivery',
                payload: {},
                error: 'Failed',
            });

            dlq.markCompleted('test-1');
            dlq.markCompleted('test-2');

            const stats = dlq.getStats();
            expect(stats.totalProcessed).toBe(2);
        });

        it('should return false for non-existent entry', () => {
            const removed = dlq.markCompleted('non-existent');
            expect(removed).toBe(false);
        });
    });

    describe('markFailed', () => {
        it('should increment attemptCount', () => {
            dlq.enqueue({
                id: 'test-1',
                operationType: 'webhook_delivery',
                payload: {},
                error: 'Failed',
                attemptCount: 0,
            });

            const entry = dlq.markFailed('test-1', 'Still failed');
            expect(entry?.attemptCount).toBe(1);
        });

        it('should update error message', () => {
            dlq.enqueue({
                id: 'test-1',
                operationType: 'webhook_delivery',
                payload: {},
                error: 'First error',
            });

            const entry = dlq.markFailed('test-1', 'Second error');
            expect(entry?.error).toBe('Second error');
        });

        it('should set state to pending if under maxRetries', () => {
            dlq.enqueue({
                id: 'test-1',
                operationType: 'webhook_delivery',
                payload: {},
                error: 'Failed',
                attemptCount: 0,
                maxRetries: 5,
            });

            const entry = dlq.markFailed('test-1', 'Still failed');
            expect(entry?.state).toBe('pending');
        });

        it('should set state to dead if maxRetries exceeded', () => {
            dlq.enqueue({
                id: 'test-1',
                operationType: 'webhook_delivery',
                payload: {},
                error: 'Failed',
                attemptCount: 4,
                maxRetries: 5,
            });

            const entry = dlq.markFailed('test-1', 'Still failed');
            expect(entry?.state).toBe('dead');
            expect(entry?.attemptCount).toBe(5);
        });

        it('should update nextRetryAt with exponential backoff', () => {
            const now = Date.now();
            vi.setSystemTime(now);

            dlq.enqueue({
                id: 'test-1',
                operationType: 'webhook_delivery',
                payload: {},
                error: 'Failed',
                attemptCount: 0,
            });

            const entry = dlq.markFailed('test-1', 'Still failed');
            // After 1 attempt, backoff should be 2s
            expect(entry?.nextRetryAt.getTime()).toBe(now + 2000);
        });

        it('should return null for non-existent entry', () => {
            const entry = dlq.markFailed('non-existent', 'Error');
            expect(entry).toBeNull();
        });

        it('should set lastAttemptAt', () => {
            const now = Date.now();
            vi.setSystemTime(now);

            dlq.enqueue({
                id: 'test-1',
                operationType: 'webhook_delivery',
                payload: {},
                error: 'Failed',
            });

            const entry = dlq.markFailed('test-1', 'Still failed');
            expect(entry?.lastAttemptAt).toBeInstanceOf(Date);
            expect(entry?.lastAttemptAt?.getTime()).toBe(now);
        });
    });

    describe('getStats', () => {
        it('should return zero stats for empty queue', () => {
            const stats = dlq.getStats();
            expect(stats).toEqual({
                pending: 0,
                processing: 0,
                dead: 0,
                totalProcessed: 0,
                oldestEntry: null,
            });
        });

        it('should count entries by state', () => {
            const now = Date.now();
            vi.setSystemTime(now);

            // Pending
            dlq.enqueue({
                id: 'pending-1',
                operationType: 'webhook_delivery',
                payload: {},
                error: 'Failed',
                attemptCount: 0,
            });

            dlq.enqueue({
                id: 'pending-2',
                operationType: 'webhook_delivery',
                payload: {},
                error: 'Failed',
                attemptCount: 0,
            });

            // Processing
            vi.setSystemTime(now + 1001);
            dlq.dequeue(1);

            // Dead
            dlq.enqueue({
                id: 'dead-1',
                operationType: 'webhook_delivery',
                payload: {},
                error: 'Failed',
                attemptCount: 4,
                maxRetries: 5,
            });
            dlq.markFailed('dead-1', 'Final failure');

            const stats = dlq.getStats();
            expect(stats.pending).toBe(1);
            expect(stats.processing).toBe(1);
            expect(stats.dead).toBe(1);
        });

        it('should track oldest entry', () => {
            const now = Date.now();
            vi.setSystemTime(now);

            dlq.enqueue({
                id: 'old',
                operationType: 'webhook_delivery',
                payload: {},
                error: 'Failed',
            });

            vi.setSystemTime(now + 5000);

            dlq.enqueue({
                id: 'new',
                operationType: 'webhook_delivery',
                payload: {},
                error: 'Failed',
            });

            const stats = dlq.getStats();
            expect(stats.oldestEntry?.getTime()).toBe(now);
        });
    });

    describe('getDead', () => {
        it('should return only dead entries', () => {
            dlq.enqueue({
                id: 'pending',
                operationType: 'webhook_delivery',
                payload: {},
                error: 'Failed',
                attemptCount: 0,
            });

            dlq.enqueue({
                id: 'dead-1',
                operationType: 'webhook_delivery',
                payload: {},
                error: 'Failed',
                attemptCount: 4,
                maxRetries: 5,
            });

            dlq.enqueue({
                id: 'dead-2',
                operationType: 'memory_sync',
                payload: {},
                error: 'Failed',
                attemptCount: 2,
                maxRetries: 3,
            });

            dlq.markFailed('dead-1', 'Final');
            dlq.markFailed('dead-2', 'Final');

            const dead = dlq.getDead();
            expect(dead).toHaveLength(2);
            expect(dead.map((e) => e.id).sort()).toEqual(['dead-1', 'dead-2']);
        });

        it('should return empty array when no dead entries', () => {
            dlq.enqueue({
                id: 'pending',
                operationType: 'webhook_delivery',
                payload: {},
                error: 'Failed',
            });

            const dead = dlq.getDead();
            expect(dead).toHaveLength(0);
        });
    });

    describe('replayDead', () => {
        it('should move dead entry back to pending', () => {
            dlq.enqueue({
                id: 'test-1',
                operationType: 'webhook_delivery',
                payload: {},
                error: 'Failed',
                attemptCount: 4,
                maxRetries: 5,
            });

            dlq.markFailed('test-1', 'Final');

            const entry = dlq.replayDead('test-1');
            expect(entry?.state).toBe('pending');
            expect(entry?.attemptCount).toBe(0);
        });

        it('should set nextRetryAt to now', () => {
            const now = Date.now();
            vi.setSystemTime(now);

            dlq.enqueue({
                id: 'test-1',
                operationType: 'webhook_delivery',
                payload: {},
                error: 'Failed',
                attemptCount: 4,
                maxRetries: 5,
            });

            dlq.markFailed('test-1', 'Final');

            const entry = dlq.replayDead('test-1');
            expect(entry?.nextRetryAt.getTime()).toBe(now);
        });

        it('should return null for non-existent entry', () => {
            const entry = dlq.replayDead('non-existent');
            expect(entry).toBeNull();
        });

        it('should return null for non-dead entry', () => {
            dlq.enqueue({
                id: 'pending',
                operationType: 'webhook_delivery',
                payload: {},
                error: 'Failed',
            });

            const entry = dlq.replayDead('pending');
            expect(entry).toBeNull();
        });
    });

    describe('purgeOlderThan', () => {
        it('should remove dead entries older than threshold', () => {
            const now = Date.now();
            vi.setSystemTime(now);

            // Old dead entry
            dlq.enqueue({
                id: 'old-dead',
                operationType: 'webhook_delivery',
                payload: {},
                error: 'Failed',
                attemptCount: 4,
                maxRetries: 5,
            });
            dlq.markFailed('old-dead', 'Final');

            // Advance time
            vi.setSystemTime(now + 1000 * 60 * 60 * 24 * 8); // 8 days

            // Recent dead entry
            dlq.enqueue({
                id: 'recent-dead',
                operationType: 'webhook_delivery',
                payload: {},
                error: 'Failed',
                attemptCount: 4,
                maxRetries: 5,
            });
            dlq.markFailed('recent-dead', 'Final');

            // Purge entries older than 7 days
            const purged = dlq.purgeOlderThan(1000 * 60 * 60 * 24 * 7);

            expect(purged).toBe(1);
            expect(dlq.getEntry('old-dead')).toBeUndefined();
            expect(dlq.getEntry('recent-dead')).toBeDefined();
        });

        it('should only remove dead entries, not pending', () => {
            const now = Date.now();
            vi.setSystemTime(now);

            dlq.enqueue({
                id: 'old-pending',
                operationType: 'webhook_delivery',
                payload: {},
                error: 'Failed',
                attemptCount: 0,
            });

            vi.setSystemTime(now + 1000 * 60 * 60 * 24 * 8);

            const purged = dlq.purgeOlderThan(1000 * 60 * 60 * 24 * 7);
            expect(purged).toBe(0);
            expect(dlq.getEntry('old-pending')).toBeDefined();
        });

        it('should return count of purged entries', () => {
            const now = Date.now();
            vi.setSystemTime(now);

            for (let i = 0; i < 3; i++) {
                dlq.enqueue({
                    id: `old-${i}`,
                    operationType: 'webhook_delivery',
                    payload: {},
                    error: 'Failed',
                    attemptCount: 4,
                    maxRetries: 5,
                });
                dlq.markFailed(`old-${i}`, 'Final');
            }

            vi.setSystemTime(now + 1000 * 60 * 60 * 24 * 8);

            const purged = dlq.purgeOlderThan(1000 * 60 * 60 * 24 * 7);
            expect(purged).toBe(3);
        });
    });

    describe('exponential backoff', () => {
        it('should cap backoff at max value', () => {
            const now = Date.now();
            vi.setSystemTime(now);

            dlq.enqueue({
                id: 'test-1',
                operationType: 'webhook_delivery',
                payload: {},
                error: 'Failed',
                attemptCount: 20, // Very high attempt count
            });

            const entry = dlq.getEntry('test-1');
            const maxBackoff = 1000 * 60 * 60; // 1 hour
            expect(entry?.nextRetryAt.getTime()).toBeLessThanOrEqual(now + maxBackoff);
        });
    });

    describe('complete retry flow', () => {
        it('should handle full retry cycle', () => {
            const now = Date.now();
            vi.setSystemTime(now);

            // Enqueue
            dlq.enqueue({
                id: 'flow-test',
                operationType: 'webhook_delivery',
                payload: { url: 'https://example.com' },
                error: 'Connection timeout',
                maxRetries: 3,
            });

            let stats = dlq.getStats();
            expect(stats.pending).toBe(1);

            // First retry attempt
            vi.setSystemTime(now + 1001);
            let ready = dlq.dequeue();
            expect(ready).toHaveLength(1);

            stats = dlq.getStats();
            expect(stats.processing).toBe(1);

            // Fail first attempt
            dlq.markFailed('flow-test', 'Still timeout');
            stats = dlq.getStats();
            expect(stats.pending).toBe(1);

            // Second retry attempt (2s backoff)
            vi.setSystemTime(now + 3002);
            ready = dlq.dequeue();
            expect(ready).toHaveLength(1);

            // Fail second attempt
            dlq.markFailed('flow-test', 'Still timeout');

            // Third retry attempt (4s backoff)
            vi.setSystemTime(now + 7003);
            ready = dlq.dequeue();
            expect(ready).toHaveLength(1);

            // Final failure - should go to dead
            dlq.markFailed('flow-test', 'Permanent failure');

            stats = dlq.getStats();
            expect(stats.dead).toBe(1);
            expect(stats.pending).toBe(0);

            const entry = dlq.getEntry('flow-test');
            expect(entry?.attemptCount).toBe(3);
        });
    });
});

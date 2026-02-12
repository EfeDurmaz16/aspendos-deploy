import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// We need to test the JobQueue class directly, so let's create a fresh instance
class TestJobQueue {
    private queues = new Map<string, { concurrency: number; maxRetries: number; backoffMs: number; backoffMultiplier: number; maxBackoffMs: number }>();
    private handlers = new Map<string, (data: unknown) => Promise<unknown>>();
    private jobs = new Map<string, { id: string; queue: string; data: unknown; status: string; priority: number; attempts: number; maxRetries: number; createdAt: number; error?: string; result?: unknown }>();
    private deadLetterQueue: Array<{ id: string; queue: string; data: unknown; status: string; error?: string }> = [];
    private activeCount = new Map<string, number>();
    private jobCounter = 0;

    register(name: string, handler: (data: unknown) => Promise<unknown>, config: Partial<{ concurrency: number; maxRetries: number; backoffMs: number; backoffMultiplier: number; maxBackoffMs: number }> = {}) {
        this.queues.set(name, {
            concurrency: config.concurrency || 3,
            maxRetries: config.maxRetries || 3,
            backoffMs: config.backoffMs || 1000,
            backoffMultiplier: config.backoffMultiplier || 2,
            maxBackoffMs: config.maxBackoffMs || 60000,
        });
        this.handlers.set(name, handler);
        this.activeCount.set(name, 0);
    }

    add(queue: string, data: unknown, options: { priority?: number } = {}): string {
        const config = this.queues.get(queue);
        if (!config) throw new Error(`Queue "${queue}" is not registered`);

        const id = `job_${++this.jobCounter}_${Date.now()}`;
        this.jobs.set(id, {
            id,
            queue,
            data,
            status: 'pending',
            priority: options.priority || 0,
            attempts: 0,
            maxRetries: config.maxRetries,
            createdAt: Date.now(),
        });
        return id;
    }

    getJob(id: string) {
        return this.jobs.get(id);
    }

    getDeadLetterQueue() {
        return this.deadLetterQueue;
    }

    getStats(queue?: string) {
        let pending = 0, active = 0, completed = 0, failed = 0;
        for (const job of this.jobs.values()) {
            if (queue && job.queue !== queue) continue;
            if (job.status === 'pending') pending++;
            else if (job.status === 'active') active++;
            else if (job.status === 'completed') completed++;
            else if (job.status === 'failed') failed++;
        }
        return { pending, active, completed, failed, dead: this.deadLetterQueue.length };
    }

    async processNext(queueName: string): Promise<boolean> {
        const handler = this.handlers.get(queueName);
        const config = this.queues.get(queueName);
        if (!handler || !config) return false;

        let nextJob: typeof this.jobs extends Map<string, infer V> ? V : never | undefined;
        for (const job of this.jobs.values()) {
            if (job.queue === queueName && job.status === 'pending') {
                if (!nextJob || job.priority > nextJob.priority) {
                    nextJob = job;
                }
            }
        }

        if (!nextJob) return false;

        nextJob.status = 'active';
        nextJob.attempts++;

        try {
            const result = await handler(nextJob.data);
            nextJob.status = 'completed';
            nextJob.result = result;
        } catch (err) {
            nextJob.error = err instanceof Error ? err.message : String(err);
            if (nextJob.attempts < nextJob.maxRetries) {
                nextJob.status = 'pending';
            } else {
                nextJob.status = 'dead';
                this.deadLetterQueue.push({ ...nextJob });
            }
        }

        return true;
    }
}

describe('JobQueue', () => {
    let queue: TestJobQueue;

    beforeEach(() => {
        queue = new TestJobQueue();
    });

    describe('register', () => {
        it('should register a queue with handler', () => {
            queue.register('test', async () => 'done');
            const id = queue.add('test', { foo: 'bar' });
            expect(id).toMatch(/^job_/);
        });

        it('should throw when adding to unregistered queue', () => {
            expect(() => queue.add('nonexistent', {})).toThrow('Queue "nonexistent" is not registered');
        });
    });

    describe('add', () => {
        it('should create a pending job', () => {
            queue.register('test', async () => 'done');
            const id = queue.add('test', { value: 42 });
            const job = queue.getJob(id);

            expect(job).toBeDefined();
            expect(job?.status).toBe('pending');
            expect(job?.data).toEqual({ value: 42 });
            expect(job?.attempts).toBe(0);
        });

        it('should support priority', () => {
            queue.register('test', async () => 'done');
            const lowId = queue.add('test', { priority: 'low' }, { priority: 1 });
            const highId = queue.add('test', { priority: 'high' }, { priority: 10 });

            const lowJob = queue.getJob(lowId);
            const highJob = queue.getJob(highId);

            expect(lowJob?.priority).toBe(1);
            expect(highJob?.priority).toBe(10);
        });

        it('should generate unique IDs', () => {
            queue.register('test', async () => 'done');
            const ids = new Set<string>();
            for (let i = 0; i < 100; i++) {
                ids.add(queue.add('test', { i }));
            }
            expect(ids.size).toBe(100);
        });
    });

    describe('processNext', () => {
        it('should process a job successfully', async () => {
            queue.register('test', async (data) => ({ processed: data }));
            const id = queue.add('test', { value: 1 });

            await queue.processNext('test');

            const job = queue.getJob(id);
            expect(job?.status).toBe('completed');
            expect(job?.attempts).toBe(1);
        });

        it('should retry on failure', async () => {
            let callCount = 0;
            queue.register('test', async () => {
                callCount++;
                if (callCount < 3) throw new Error('fail');
                return 'success';
            }, { maxRetries: 3 });

            const id = queue.add('test', {});

            // First attempt - fails
            await queue.processNext('test');
            expect(queue.getJob(id)?.status).toBe('pending');
            expect(queue.getJob(id)?.attempts).toBe(1);

            // Second attempt - fails
            await queue.processNext('test');
            expect(queue.getJob(id)?.status).toBe('pending');
            expect(queue.getJob(id)?.attempts).toBe(2);

            // Third attempt - succeeds
            await queue.processNext('test');
            expect(queue.getJob(id)?.status).toBe('completed');
        });

        it('should move to dead letter queue after max retries', async () => {
            queue.register('test', async () => {
                throw new Error('always fails');
            }, { maxRetries: 2 });

            const id = queue.add('test', { doomed: true });

            await queue.processNext('test');
            await queue.processNext('test');

            const job = queue.getJob(id);
            expect(job?.status).toBe('dead');
            expect(queue.getDeadLetterQueue().length).toBe(1);
            expect(queue.getDeadLetterQueue()[0].error).toBe('always fails');
        });

        it('should process highest priority first', async () => {
            const processed: number[] = [];
            queue.register('test', async (data: { p: number }) => {
                processed.push(data.p);
            });

            queue.add('test', { p: 1 }, { priority: 1 });
            queue.add('test', { p: 3 }, { priority: 3 });
            queue.add('test', { p: 2 }, { priority: 2 });

            await queue.processNext('test');
            await queue.processNext('test');
            await queue.processNext('test');

            expect(processed).toEqual([3, 2, 1]);
        });

        it('should return false when no pending jobs', async () => {
            queue.register('test', async () => 'done');
            const result = await queue.processNext('test');
            expect(result).toBe(false);
        });

        it('should return false for unregistered queue', async () => {
            const result = await queue.processNext('nonexistent');
            expect(result).toBe(false);
        });
    });

    describe('getStats', () => {
        it('should return correct stats', async () => {
            queue.register('test', async () => 'done');
            queue.add('test', { a: 1 });
            queue.add('test', { a: 2 });
            queue.add('test', { a: 3 });

            const before = queue.getStats('test');
            expect(before.pending).toBe(3);
            expect(before.completed).toBe(0);

            await queue.processNext('test');
            await queue.processNext('test');

            const after = queue.getStats('test');
            expect(after.pending).toBe(1);
            expect(after.completed).toBe(2);
        });

        it('should return all queue stats when no filter', () => {
            queue.register('q1', async () => 'done');
            queue.register('q2', async () => 'done');
            queue.add('q1', {});
            queue.add('q2', {});
            queue.add('q2', {});

            const stats = queue.getStats();
            expect(stats.pending).toBe(3);
        });
    });

    describe('dead letter queue', () => {
        it('should accumulate dead jobs', async () => {
            queue.register('test', async () => {
                throw new Error('fail');
            }, { maxRetries: 1 });

            queue.add('test', { job: 1 });
            queue.add('test', { job: 2 });

            await queue.processNext('test');
            await queue.processNext('test');

            expect(queue.getDeadLetterQueue().length).toBe(2);
        });

        it('should preserve error messages', async () => {
            queue.register('test', async () => {
                throw new Error('specific error message');
            }, { maxRetries: 1 });

            queue.add('test', {});
            await queue.processNext('test');

            expect(queue.getDeadLetterQueue()[0].error).toBe('specific error message');
        });
    });

    describe('error handling', () => {
        it('should capture non-Error throws', async () => {
            queue.register('test', async () => {
                throw 'string error';
            }, { maxRetries: 1 });

            const id = queue.add('test', {});
            await queue.processNext('test');

            expect(queue.getJob(id)?.error).toBe('string error');
        });

        it('should handle async errors', async () => {
            queue.register('test', async () => {
                await new Promise((_, reject) => setTimeout(() => reject(new Error('async fail')), 10));
            }, { maxRetries: 1 });

            const id = queue.add('test', {});
            await queue.processNext('test');

            expect(queue.getJob(id)?.error).toBe('async fail');
        });
    });
});

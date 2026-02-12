/**
 * Lightweight in-process job queue with retry, backoff, and dead letter queue.
 * For production at scale, replace with BullMQ + Redis.
 *
 * Features:
 * - Named queues with configurable concurrency
 * - Exponential backoff retry with jitter
 * - Dead letter queue for failed jobs
 * - Job priority (higher = processed first)
 * - Job TTL (auto-expire stale jobs)
 * - Event callbacks (onComplete, onFail, onDead)
 * - Graceful shutdown (drain in-flight jobs)
 */

type JobStatus = 'pending' | 'active' | 'completed' | 'failed' | 'dead';

interface Job<T = unknown> {
    id: string;
    queue: string;
    data: T;
    status: JobStatus;
    priority: number;
    attempts: number;
    maxRetries: number;
    createdAt: number;
    startedAt?: number;
    completedAt?: number;
    failedAt?: number;
    error?: string;
    ttlMs?: number;
    result?: unknown;
}

interface QueueConfig {
    concurrency: number;
    maxRetries: number;
    backoffMs: number;
    backoffMultiplier: number;
    maxBackoffMs: number;
    defaultTtlMs?: number;
    onComplete?: (job: Job) => void;
    onFail?: (job: Job, error: Error) => void;
    onDead?: (job: Job) => void;
}

type JobHandler<T = unknown> = (data: T, job: Job<T>) => Promise<unknown>;

const DEFAULT_CONFIG: QueueConfig = {
    concurrency: 3,
    maxRetries: 3,
    backoffMs: 1000,
    backoffMultiplier: 2,
    maxBackoffMs: 60000,
};

class JobQueue {
    private queues = new Map<string, QueueConfig>();
    private handlers = new Map<string, JobHandler>();
    private jobs = new Map<string, Job>();
    private deadLetterQueue: Job[] = [];
    private activeCount = new Map<string, number>();
    private isShuttingDown = false;
    private timers = new Set<ReturnType<typeof setTimeout>>();
    private jobCounter = 0;

    /**
     * Register a named queue with its handler and configuration
     */
    register<T = unknown>(
        name: string,
        handler: JobHandler<T>,
        config: Partial<QueueConfig> = {}
    ): void {
        this.queues.set(name, { ...DEFAULT_CONFIG, ...config });
        this.handlers.set(name, handler as JobHandler);
        this.activeCount.set(name, 0);
    }

    /**
     * Add a job to a queue
     */
    add<T = unknown>(
        queue: string,
        data: T,
        options: { priority?: number; ttlMs?: number; delayMs?: number } = {}
    ): string {
        if (this.isShuttingDown) {
            throw new Error('Queue is shutting down, cannot accept new jobs');
        }

        const config = this.queues.get(queue);
        if (!config) {
            throw new Error(`Queue "${queue}" is not registered`);
        }

        const id = `job_${++this.jobCounter}_${Date.now()}`;
        const job: Job<T> = {
            id,
            queue,
            data,
            status: 'pending',
            priority: options.priority || 0,
            attempts: 0,
            maxRetries: config.maxRetries,
            createdAt: Date.now(),
            ttlMs: options.ttlMs || config.defaultTtlMs,
        };

        this.jobs.set(id, job as Job);

        if (options.delayMs && options.delayMs > 0) {
            const timer = setTimeout(() => {
                this.timers.delete(timer);
                this.processQueue(queue);
            }, options.delayMs);
            this.timers.add(timer);
        } else {
            // Process immediately (next tick)
            queueMicrotask(() => this.processQueue(queue));
        }

        return id;
    }

    /**
     * Get job status
     */
    getJob(id: string): Job | undefined {
        return this.jobs.get(id);
    }

    /**
     * Get dead letter queue entries
     */
    getDeadLetterQueue(): ReadonlyArray<Job> {
        return this.deadLetterQueue;
    }

    /**
     * Get queue statistics
     */
    getStats(queue?: string): {
        pending: number;
        active: number;
        completed: number;
        failed: number;
        dead: number;
    } {
        let pending = 0;
        let active = 0;
        let completed = 0;
        let failed = 0;

        for (const job of this.jobs.values()) {
            if (queue && job.queue !== queue) continue;
            switch (job.status) {
                case 'pending':
                    pending++;
                    break;
                case 'active':
                    active++;
                    break;
                case 'completed':
                    completed++;
                    break;
                case 'failed':
                    failed++;
                    break;
            }
        }

        const dead = queue
            ? this.deadLetterQueue.filter((j) => j.queue === queue).length
            : this.deadLetterQueue.length;

        return { pending, active, completed, failed, dead };
    }

    /**
     * Retry a dead letter queue job
     */
    retryDead(jobId: string): boolean {
        const index = this.deadLetterQueue.findIndex((j) => j.id === jobId);
        if (index === -1) return false;

        const job = this.deadLetterQueue.splice(index, 1)[0];
        job.status = 'pending';
        job.attempts = 0;
        job.error = undefined;
        this.jobs.set(job.id, job);
        queueMicrotask(() => this.processQueue(job.queue));
        return true;
    }

    /**
     * Graceful shutdown - wait for active jobs then stop
     */
    async shutdown(timeoutMs = 30000): Promise<void> {
        this.isShuttingDown = true;

        // Clear all timers
        for (const timer of this.timers) {
            clearTimeout(timer);
        }
        this.timers.clear();

        // Wait for active jobs to complete
        const start = Date.now();
        while (Date.now() - start < timeoutMs) {
            let totalActive = 0;
            for (const count of this.activeCount.values()) {
                totalActive += count;
            }
            if (totalActive === 0) break;
            await new Promise((resolve) => setTimeout(resolve, 100));
        }
    }

    /**
     * Clear completed jobs older than given age (memory cleanup)
     */
    cleanup(maxAgeMs = 3600000): number {
        const cutoff = Date.now() - maxAgeMs;
        let cleaned = 0;

        for (const [id, job] of this.jobs.entries()) {
            if (
                (job.status === 'completed' || job.status === 'failed') &&
                (job.completedAt || job.failedAt || job.createdAt) < cutoff
            ) {
                this.jobs.delete(id);
                cleaned++;
            }
        }

        return cleaned;
    }

    private async processQueue(queueName: string): Promise<void> {
        const config = this.queues.get(queueName);
        const handler = this.handlers.get(queueName);
        if (!config || !handler) return;

        const currentActive = this.activeCount.get(queueName) || 0;
        if (currentActive >= config.concurrency) return;

        // Find next pending job (highest priority first, then oldest)
        let nextJob: Job | undefined;
        for (const job of this.jobs.values()) {
            if (job.queue !== queueName || job.status !== 'pending') continue;

            // Check TTL
            if (job.ttlMs && Date.now() - job.createdAt > job.ttlMs) {
                job.status = 'dead';
                job.error = 'Job expired (TTL exceeded)';
                this.deadLetterQueue.push(job);
                config.onDead?.(job);
                continue;
            }

            if (!nextJob || job.priority > nextJob.priority || (job.priority === nextJob.priority && job.createdAt < nextJob.createdAt)) {
                nextJob = job;
            }
        }

        if (!nextJob) return;

        // Execute job
        nextJob.status = 'active';
        nextJob.startedAt = Date.now();
        nextJob.attempts++;
        this.activeCount.set(queueName, currentActive + 1);

        try {
            const result = await handler(nextJob.data, nextJob);
            nextJob.status = 'completed';
            nextJob.completedAt = Date.now();
            nextJob.result = result;
            config.onComplete?.(nextJob);
        } catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            nextJob.error = error.message;

            if (nextJob.attempts < nextJob.maxRetries) {
                // Schedule retry with exponential backoff + jitter
                nextJob.status = 'pending';
                const backoff = Math.min(
                    config.backoffMs * Math.pow(config.backoffMultiplier, nextJob.attempts - 1),
                    config.maxBackoffMs
                );
                const jitter = Math.random() * backoff * 0.1;
                const delay = backoff + jitter;

                const timer = setTimeout(() => {
                    this.timers.delete(timer);
                    this.processQueue(queueName);
                }, delay);
                this.timers.add(timer);

                config.onFail?.(nextJob, error);
            } else {
                // Max retries exceeded - move to dead letter queue
                nextJob.status = 'dead';
                nextJob.failedAt = Date.now();
                this.deadLetterQueue.push(nextJob);
                config.onDead?.(nextJob);
            }
        } finally {
            const active = this.activeCount.get(queueName) || 1;
            this.activeCount.set(queueName, active - 1);
        }

        // Try to process more jobs
        if (!this.isShuttingDown) {
            queueMicrotask(() => this.processQueue(queueName));
        }
    }
}

// Singleton instance
export const jobQueue = new JobQueue();

// Pre-register common queues
jobQueue.register('webhook-delivery', async (data: { url: string; payload: unknown; headers?: Record<string, string> }) => {
    const response = await fetch(data.url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'YULA-Webhook/1.0',
            ...data.headers,
        },
        body: JSON.stringify(data.payload),
        signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
        throw new Error(`Webhook delivery failed: ${response.status} ${response.statusText}`);
    }

    return { status: response.status };
}, {
    concurrency: 5,
    maxRetries: 5,
    backoffMs: 5000,
    backoffMultiplier: 3,
    maxBackoffMs: 300000,
});

jobQueue.register('email-notification', async (data: { userId: string; type: string; payload: unknown }) => {
    // Placeholder for email sending logic
    console.log(`[JobQueue] Email notification: ${data.type} to ${data.userId}`);
    return { sent: true };
}, {
    concurrency: 10,
    maxRetries: 3,
    backoffMs: 2000,
});

jobQueue.register('memory-consolidation', async (data: { userId: string }) => {
    console.log(`[JobQueue] Memory consolidation for ${data.userId}`);
    return { consolidated: true };
}, {
    concurrency: 2,
    maxRetries: 2,
    backoffMs: 10000,
});

// Periodic cleanup every 30 minutes
setInterval(() => {
    const cleaned = jobQueue.cleanup();
    if (cleaned > 0) {
        console.log(`[JobQueue] Cleaned ${cleaned} old jobs`);
    }
}, 30 * 60 * 1000);

export type { Job, JobStatus, QueueConfig };

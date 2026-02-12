/**
 * Dead Letter Queue for Failed Async Operations
 *
 * Handles retry logic with exponential backoff for failed operations like:
 * - webhook_delivery
 * - memory_sync
 * - notification_send
 * - export_job
 */

export type OperationType =
    | 'webhook_delivery'
    | 'memory_sync'
    | 'notification_send'
    | 'export_job'
    | 'email_send'
    | 'vector_index'
    | 'api_callback';

export type DLQEntryState = 'pending' | 'processing' | 'dead';

export interface DLQEntry {
    id: string;
    operationType: OperationType;
    payload: unknown;
    error: string;
    attemptCount: number;
    maxRetries: number;
    state: DLQEntryState;
    createdAt: Date;
    nextRetryAt: Date;
    lastAttemptAt?: Date;
}

export interface DLQStats {
    pending: number;
    processing: number;
    dead: number;
    totalProcessed: number;
    oldestEntry: Date | null;
}

export interface EnqueueOptions {
    id: string;
    operationType: OperationType;
    payload: unknown;
    error: string;
    maxRetries?: number;
    attemptCount?: number;
}

const DEFAULT_MAX_RETRIES = 5;
const BASE_BACKOFF_MS = 1000; // 1 second
const MAX_BACKOFF_MS = 1000 * 60 * 60; // 1 hour
const CLEANUP_INTERVAL_MS = 1000 * 60 * 60; // 1 hour
const DEFAULT_RETENTION_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

class DeadLetterQueue {
    private entries: Map<string, DLQEntry> = new Map();
    private totalProcessed = 0;
    private cleanupTimer?: NodeJS.Timeout;

    constructor() {
        this.startAutoCleanup();
    }

    /**
     * Add a failed operation to the queue
     */
    enqueue(options: EnqueueOptions): DLQEntry {
        const {
            id,
            operationType,
            payload,
            error,
            maxRetries = DEFAULT_MAX_RETRIES,
            attemptCount = 0,
        } = options;

        const now = new Date();
        const nextRetryAt = this.calculateNextRetry(attemptCount);

        const entry: DLQEntry = {
            id,
            operationType,
            payload,
            error,
            attemptCount,
            maxRetries,
            state: 'pending',
            createdAt: now,
            nextRetryAt,
        };

        this.entries.set(id, entry);
        return entry;
    }

    /**
     * Get entries ready for retry
     */
    dequeue(batchSize = 10): DLQEntry[] {
        const now = new Date();
        const ready: DLQEntry[] = [];

        for (const entry of this.entries.values()) {
            if (entry.state === 'pending' && entry.nextRetryAt <= now && ready.length < batchSize) {
                entry.state = 'processing';
                entry.lastAttemptAt = now;
                ready.push(entry);
            }
        }

        return ready;
    }

    /**
     * Mark entry as successfully completed
     */
    markCompleted(id: string): boolean {
        const entry = this.entries.get(id);
        if (!entry) {
            return false;
        }

        this.entries.delete(id);
        this.totalProcessed++;
        return true;
    }

    /**
     * Mark entry as failed, increment attempts, apply backoff
     */
    markFailed(id: string, error: string): DLQEntry | null {
        const entry = this.entries.get(id);
        if (!entry) {
            return null;
        }

        entry.attemptCount++;
        entry.error = error;
        entry.lastAttemptAt = new Date();

        if (entry.attemptCount >= entry.maxRetries) {
            entry.state = 'dead';
            entry.nextRetryAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 365); // far future
        } else {
            entry.state = 'pending';
            entry.nextRetryAt = this.calculateNextRetry(entry.attemptCount);
        }

        return entry;
    }

    /**
     * Get queue statistics
     */
    getStats(): DLQStats {
        let pending = 0;
        let processing = 0;
        let dead = 0;
        let oldestEntry: Date | null = null;

        for (const entry of this.entries.values()) {
            if (entry.state === 'pending') pending++;
            else if (entry.state === 'processing') processing++;
            else if (entry.state === 'dead') dead++;

            if (!oldestEntry || entry.createdAt < oldestEntry) {
                oldestEntry = entry.createdAt;
            }
        }

        return {
            pending,
            processing,
            dead,
            totalProcessed: this.totalProcessed,
            oldestEntry,
        };
    }

    /**
     * Get all permanently failed entries
     */
    getDead(): DLQEntry[] {
        return Array.from(this.entries.values()).filter((entry) => entry.state === 'dead');
    }

    /**
     * Move a dead entry back to pending for manual retry
     */
    replayDead(id: string): DLQEntry | null {
        const entry = this.entries.get(id);
        if (!entry || entry.state !== 'dead') {
            return null;
        }

        entry.state = 'pending';
        entry.attemptCount = 0;
        entry.nextRetryAt = new Date();
        return entry;
    }

    /**
     * Remove old dead entries
     */
    purgeOlderThan(ms: number): number {
        const cutoff = new Date(Date.now() - ms);
        let purged = 0;

        for (const [id, entry] of this.entries.entries()) {
            if (entry.state === 'dead' && entry.createdAt < cutoff) {
                this.entries.delete(id);
                purged++;
            }
        }

        return purged;
    }

    /**
     * Get entry by ID
     */
    getEntry(id: string): DLQEntry | undefined {
        return this.entries.get(id);
    }

    /**
     * Get all entries (for testing/debugging)
     */
    getAllEntries(): DLQEntry[] {
        return Array.from(this.entries.values());
    }

    /**
     * Calculate next retry time with exponential backoff
     */
    private calculateNextRetry(attemptCount: number): Date {
        const backoff = Math.min(BASE_BACKOFF_MS * 2 ** attemptCount, MAX_BACKOFF_MS);
        return new Date(Date.now() + backoff);
    }

    /**
     * Start automatic cleanup of old entries
     */
    private startAutoCleanup(): void {
        this.cleanupTimer = setInterval(() => {
            this.purgeOlderThan(DEFAULT_RETENTION_MS);
        }, CLEANUP_INTERVAL_MS);

        // Don't prevent process from exiting
        if (this.cleanupTimer.unref) {
            this.cleanupTimer.unref();
        }
    }

    /**
     * Stop automatic cleanup (for testing)
     */
    stopAutoCleanup(): void {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = undefined;
        }
    }

    /**
     * Clear all entries (for testing)
     */
    clear(): void {
        this.entries.clear();
        this.totalProcessed = 0;
    }
}

// Singleton instance
const dlq = new DeadLetterQueue();

export { dlq };

/**
 * For testing only - clears the DLQ
 */
export function clearDLQ_forTesting(): void {
    dlq.clear();
}

/**
 * For testing only - stops auto cleanup
 */
export function stopDLQCleanup_forTesting(): void {
    dlq.stopAutoCleanup();
}

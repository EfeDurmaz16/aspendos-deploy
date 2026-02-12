/**
 * Transaction Manager
 *
 * Provides safe transaction boundaries for multi-step database operations.
 * Includes retry logic for serialization failures and deadlock detection.
 */

import { prisma } from '@aspendos/db';
import type { PrismaClient } from '@prisma/client';

type TransactionClient = Omit<
    PrismaClient,
    '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

interface TransactionOptions {
    maxRetries?: number;
    timeout?: number; // ms
    isolationLevel?: 'ReadUncommitted' | 'ReadCommitted' | 'RepeatableRead' | 'Serializable';
}

const DEFAULT_OPTIONS: Required<TransactionOptions> = {
    maxRetries: 3,
    timeout: 10000,
    isolationLevel: 'ReadCommitted',
};

/**
 * Execute a function within a database transaction with retry logic
 */
export async function withTransaction<T>(
    fn: (tx: TransactionClient) => Promise<T>,
    options?: TransactionOptions
): Promise<T> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= opts.maxRetries; attempt++) {
        try {
            const result = await prisma.$transaction(fn, {
                maxWait: opts.timeout,
                timeout: opts.timeout,
                isolationLevel: opts.isolationLevel,
            });
            return result;
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));

            // Retry on serialization failures and deadlocks
            const isRetryable = isRetryableError(lastError);
            if (!isRetryable || attempt === opts.maxRetries) {
                throw lastError;
            }

            // Exponential backoff with jitter
            const delay = Math.min(100 * Math.pow(2, attempt - 1), 2000);
            const jitter = Math.random() * delay * 0.3;
            await new Promise((resolve) => setTimeout(resolve, delay + jitter));
        }
    }

    throw lastError || new Error('Transaction failed after max retries');
}

/**
 * Check if an error is retryable (serialization failure, deadlock)
 */
function isRetryableError(error: Error): boolean {
    const message = error.message.toLowerCase();
    return (
        message.includes('deadlock') ||
        message.includes('serialization failure') ||
        message.includes('could not serialize access') ||
        message.includes('lock timeout') ||
        message.includes('concurrent update') ||
        message.includes('write conflict')
    );
}

/**
 * Optimistic locking helper - checks version before update
 */
export async function withOptimisticLock<T extends { version?: number }>(
    getCurrentVersion: () => Promise<number>,
    expectedVersion: number,
    updateFn: () => Promise<T>
): Promise<T> {
    const currentVersion = await getCurrentVersion();

    if (currentVersion !== expectedVersion) {
        throw new OptimisticLockError(
            `Version mismatch: expected ${expectedVersion}, got ${currentVersion}`
        );
    }

    return updateFn();
}

export class OptimisticLockError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'OptimisticLockError';
    }
}

/**
 * Saga pattern for multi-step operations with compensation
 */
export class Saga<T = void> {
    private steps: Array<{
        name: string;
        execute: () => Promise<unknown>;
        compensate: () => Promise<void>;
    }> = [];
    private completedSteps: string[] = [];

    addStep(
        name: string,
        execute: () => Promise<unknown>,
        compensate: () => Promise<void>
    ): Saga<T> {
        this.steps.push({ name, execute, compensate });
        return this;
    }

    async execute(): Promise<void> {
        for (const step of this.steps) {
            try {
                await step.execute();
                this.completedSteps.push(step.name);
            } catch (error) {
                // Compensate in reverse order
                await this.compensate();
                throw new SagaError(
                    `Saga failed at step "${step.name}": ${error instanceof Error ? error.message : String(error)}`,
                    step.name,
                    this.completedSteps
                );
            }
        }
    }

    private async compensate(): Promise<void> {
        const errors: Error[] = [];

        for (let i = this.completedSteps.length - 1; i >= 0; i--) {
            const stepName = this.completedSteps[i];
            const step = this.steps.find((s) => s.name === stepName);

            if (step) {
                try {
                    await step.compensate();
                } catch (error) {
                    errors.push(
                        error instanceof Error
                            ? error
                            : new Error(`Compensation failed for "${stepName}"`)
                    );
                }
            }
        }

        if (errors.length > 0) {
            console.error(
                `[Saga] ${errors.length} compensation errors:`,
                errors.map((e) => e.message)
            );
        }
    }
}

export class SagaError extends Error {
    constructor(
        message: string,
        public failedStep: string,
        public completedSteps: string[]
    ) {
        super(message);
        this.name = 'SagaError';
    }
}

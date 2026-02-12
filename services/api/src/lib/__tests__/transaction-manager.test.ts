import { describe, expect, it, vi } from 'vitest';
import {
    OptimisticLockError,
    Saga,
    SagaError,
    withOptimisticLock,
} from '../transaction-manager';

// Mock prisma
vi.mock('@aspendos/db', () => ({
    prisma: {
        $transaction: vi.fn(async (fn: Function) => fn({})),
    },
}));

describe('Transaction Manager', () => {
    describe('withOptimisticLock', () => {
        it('should execute update when versions match', async () => {
            const result = await withOptimisticLock(
                async () => 1,
                1,
                async () => ({ id: 'test', version: 2 })
            );

            expect(result).toEqual({ id: 'test', version: 2 });
        });

        it('should throw OptimisticLockError when versions mismatch', async () => {
            await expect(
                withOptimisticLock(
                    async () => 2,
                    1,
                    async () => ({ id: 'test', version: 3 })
                )
            ).rejects.toThrow(OptimisticLockError);
        });

        it('should include version details in error message', async () => {
            await expect(
                withOptimisticLock(
                    async () => 5,
                    3,
                    async () => ({})
                )
            ).rejects.toThrow('Version mismatch: expected 3, got 5');
        });
    });

    describe('Saga', () => {
        it('should execute all steps in order', async () => {
            const order: string[] = [];

            const saga = new Saga();
            saga.addStep(
                'step1',
                async () => { order.push('exec1'); },
                async () => { order.push('comp1'); }
            );
            saga.addStep(
                'step2',
                async () => { order.push('exec2'); },
                async () => { order.push('comp2'); }
            );
            saga.addStep(
                'step3',
                async () => { order.push('exec3'); },
                async () => { order.push('comp3'); }
            );

            await saga.execute();
            expect(order).toEqual(['exec1', 'exec2', 'exec3']);
        });

        it('should compensate completed steps on failure (reverse order)', async () => {
            const order: string[] = [];

            const saga = new Saga();
            saga.addStep(
                'step1',
                async () => { order.push('exec1'); },
                async () => { order.push('comp1'); }
            );
            saga.addStep(
                'step2',
                async () => { order.push('exec2'); },
                async () => { order.push('comp2'); }
            );
            saga.addStep(
                'step3',
                async () => { throw new Error('step3 failed'); },
                async () => { order.push('comp3'); }
            );

            await expect(saga.execute()).rejects.toThrow(SagaError);
            expect(order).toEqual(['exec1', 'exec2', 'comp2', 'comp1']);
        });

        it('should include failed step in SagaError', async () => {
            const saga = new Saga();
            saga.addStep(
                'create-user',
                async () => {},
                async () => {}
            );
            saga.addStep(
                'setup-billing',
                async () => { throw new Error('Payment failed'); },
                async () => {}
            );

            try {
                await saga.execute();
                expect.unreachable('Should have thrown');
            } catch (error) {
                expect(error).toBeInstanceOf(SagaError);
                const sagaError = error as SagaError;
                expect(sagaError.failedStep).toBe('setup-billing');
                expect(sagaError.completedSteps).toEqual(['create-user']);
            }
        });

        it('should handle compensation errors gracefully', async () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

            const saga = new Saga();
            saga.addStep(
                'step1',
                async () => {},
                async () => { throw new Error('Comp failed'); }
            );
            saga.addStep(
                'step2',
                async () => { throw new Error('step2 failed'); },
                async () => {}
            );

            await expect(saga.execute()).rejects.toThrow(SagaError);
            expect(consoleSpy).toHaveBeenCalled();

            consoleSpy.mockRestore();
        });

        it('should handle empty saga', async () => {
            const saga = new Saga();
            await saga.execute(); // Should not throw
        });

        it('should handle saga with single step', async () => {
            let executed = false;
            const saga = new Saga();
            saga.addStep(
                'only-step',
                async () => { executed = true; },
                async () => {}
            );

            await saga.execute();
            expect(executed).toBe(true);
        });

        it('should not compensate if first step fails', async () => {
            const order: string[] = [];

            const saga = new Saga();
            saga.addStep(
                'step1',
                async () => { throw new Error('immediate fail'); },
                async () => { order.push('comp1'); }
            );

            await expect(saga.execute()).rejects.toThrow(SagaError);
            expect(order).toEqual([]); // No compensation needed
        });
    });
});

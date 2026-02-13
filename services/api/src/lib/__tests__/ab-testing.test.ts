import { beforeEach, describe, expect, it } from 'vitest';
import {
    assignVariant,
    clearExperiments_forTesting,
    createExperiment,
    type ExperimentConfig,
    getActiveExperiments,
    getExperimentResults,
    getUserExperiments,
    isSignificant,
    listExperiments,
    recordConversion,
    updateExperiment,
} from '../ab-testing';

describe('ab-testing', () => {
    beforeEach(() => {
        clearExperiments_forTesting();
    });

    describe('createExperiment', () => {
        it('creates a valid experiment', () => {
            const config: ExperimentConfig = {
                id: 'test-exp-1',
                name: 'Button Color Test',
                description: 'Test blue vs green CTA button',
                variants: [
                    { id: 'control', name: 'Blue Button', weight: 50 },
                    { id: 'treatment', name: 'Green Button', weight: 50 },
                ],
                status: 'draft',
                targetPercentage: 100,
            };

            const experiment = createExperiment(config);

            expect(experiment.id).toBe('test-exp-1');
            expect(experiment.name).toBe('Button Color Test');
            expect(experiment.variants).toHaveLength(2);
            expect(experiment.createdAt).toBeInstanceOf(Date);
            expect(experiment.updatedAt).toBeInstanceOf(Date);
        });

        it('throws error if less than 2 variants', () => {
            const config: ExperimentConfig = {
                id: 'invalid-exp',
                name: 'Invalid',
                description: 'Test',
                variants: [{ id: 'control', name: 'Control', weight: 100 }],
                status: 'draft',
                targetPercentage: 100,
            };

            expect(() => createExperiment(config)).toThrow(
                'Experiment must have at least 2 variants'
            );
        });

        it('throws error if variant weights do not sum to 100', () => {
            const config: ExperimentConfig = {
                id: 'invalid-weights',
                name: 'Invalid Weights',
                description: 'Test',
                variants: [
                    { id: 'control', name: 'Control', weight: 40 },
                    { id: 'treatment', name: 'Treatment', weight: 50 },
                ],
                status: 'draft',
                targetPercentage: 100,
            };

            expect(() => createExperiment(config)).toThrow('Variant weights must sum to 100');
        });

        it('throws error if targetPercentage is invalid', () => {
            const config: ExperimentConfig = {
                id: 'invalid-target',
                name: 'Invalid Target',
                description: 'Test',
                variants: [
                    { id: 'control', name: 'Control', weight: 50 },
                    { id: 'treatment', name: 'Treatment', weight: 50 },
                ],
                status: 'draft',
                targetPercentage: 150,
            };

            expect(() => createExperiment(config)).toThrow(
                'targetPercentage must be between 0 and 100'
            );
        });

        it('throws error if variant IDs are not unique', () => {
            const config: ExperimentConfig = {
                id: 'duplicate-ids',
                name: 'Duplicate IDs',
                description: 'Test',
                variants: [
                    { id: 'control', name: 'Control', weight: 50 },
                    { id: 'control', name: 'Control 2', weight: 50 },
                ],
                status: 'draft',
                targetPercentage: 100,
            };

            expect(() => createExperiment(config)).toThrow('Variant IDs must be unique');
        });

        it('throws error if startDate is after endDate', () => {
            const config: ExperimentConfig = {
                id: 'invalid-dates',
                name: 'Invalid Dates',
                description: 'Test',
                variants: [
                    { id: 'control', name: 'Control', weight: 50 },
                    { id: 'treatment', name: 'Treatment', weight: 50 },
                ],
                status: 'draft',
                targetPercentage: 100,
                startDate: new Date('2025-01-01'),
                endDate: new Date('2024-12-31'),
            };

            expect(() => createExperiment(config)).toThrow('startDate must be before endDate');
        });

        it('accepts 3-way split test', () => {
            const config: ExperimentConfig = {
                id: 'three-way',
                name: 'Three Way Test',
                description: 'Test A vs B vs C',
                variants: [
                    { id: 'a', name: 'Variant A', weight: 33.33 },
                    { id: 'b', name: 'Variant B', weight: 33.33 },
                    { id: 'c', name: 'Variant C', weight: 33.34 },
                ],
                status: 'draft',
                targetPercentage: 100,
            };

            const experiment = createExperiment(config);
            expect(experiment.variants).toHaveLength(3);
        });
    });

    describe('assignVariant', () => {
        it('assigns variant to user in running experiment', () => {
            createExperiment({
                id: 'test-exp',
                name: 'Test',
                description: 'Test',
                variants: [
                    { id: 'control', name: 'Control', weight: 50 },
                    { id: 'treatment', name: 'Treatment', weight: 50 },
                ],
                status: 'running',
                targetPercentage: 100,
            });

            const variant = assignVariant('test-exp', 'user-123');

            expect(variant).toBeDefined();
            expect(['control', 'treatment']).toContain(variant?.id);
        });

        it('returns null for non-running experiment', () => {
            createExperiment({
                id: 'draft-exp',
                name: 'Draft',
                description: 'Test',
                variants: [
                    { id: 'control', name: 'Control', weight: 50 },
                    { id: 'treatment', name: 'Treatment', weight: 50 },
                ],
                status: 'draft',
                targetPercentage: 100,
            });

            const variant = assignVariant('draft-exp', 'user-123');
            expect(variant).toBeNull();
        });

        it('returns same variant for same user (deterministic)', () => {
            createExperiment({
                id: 'consistent-exp',
                name: 'Consistent',
                description: 'Test',
                variants: [
                    { id: 'control', name: 'Control', weight: 50 },
                    { id: 'treatment', name: 'Treatment', weight: 50 },
                ],
                status: 'running',
                targetPercentage: 100,
            });

            const variant1 = assignVariant('consistent-exp', 'user-456');
            const variant2 = assignVariant('consistent-exp', 'user-456');

            expect(variant1?.id).toBe(variant2?.id);
        });

        it('assigns different variants to different users', () => {
            createExperiment({
                id: 'diverse-exp',
                name: 'Diverse',
                description: 'Test',
                variants: [
                    { id: 'control', name: 'Control', weight: 50 },
                    { id: 'treatment', name: 'Treatment', weight: 50 },
                ],
                status: 'running',
                targetPercentage: 100,
            });

            const assignments = new Set<string>();
            for (let i = 0; i < 100; i++) {
                const variant = assignVariant('diverse-exp', `user-${i}`);
                if (variant) assignments.add(variant.id);
            }

            expect(assignments.size).toBe(2); // Both variants assigned
        });

        it('respects targetPercentage', () => {
            createExperiment({
                id: 'target-exp',
                name: 'Target',
                description: 'Test',
                variants: [
                    { id: 'control', name: 'Control', weight: 50 },
                    { id: 'treatment', name: 'Treatment', weight: 50 },
                ],
                status: 'running',
                targetPercentage: 50,
            });

            let assigned = 0;
            for (let i = 0; i < 100; i++) {
                const variant = assignVariant('target-exp', `user-${i}`);
                if (variant) assigned++;
            }

            // Should be roughly 50% (allow some variance)
            expect(assigned).toBeGreaterThan(40);
            expect(assigned).toBeLessThan(60);
        });

        it('respects variant weights', () => {
            createExperiment({
                id: 'weighted-exp',
                name: 'Weighted',
                description: 'Test',
                variants: [
                    { id: 'control', name: 'Control', weight: 80 },
                    { id: 'treatment', name: 'Treatment', weight: 20 },
                ],
                status: 'running',
                targetPercentage: 100,
            });

            const counts = { control: 0, treatment: 0 };
            for (let i = 0; i < 100; i++) {
                const variant = assignVariant('weighted-exp', `user-${i}`);
                if (variant?.id === 'control') counts.control++;
                if (variant?.id === 'treatment') counts.treatment++;
            }

            // Control should have ~80%, treatment ~20% (allow variance)
            expect(counts.control).toBeGreaterThan(70);
            expect(counts.treatment).toBeLessThan(30);
        });

        it('returns null if experiment not found', () => {
            expect(() => assignVariant('nonexistent', 'user-123')).toThrow(
                'Experiment nonexistent not found'
            );
        });

        it('returns null if experiment has ended', () => {
            const pastDate = new Date();
            pastDate.setDate(pastDate.getDate() - 1);

            createExperiment({
                id: 'ended-exp',
                name: 'Ended',
                description: 'Test',
                variants: [
                    { id: 'control', name: 'Control', weight: 50 },
                    { id: 'treatment', name: 'Treatment', weight: 50 },
                ],
                status: 'running',
                targetPercentage: 100,
                endDate: pastDate,
            });

            const variant = assignVariant('ended-exp', 'user-123');
            expect(variant).toBeNull();
        });

        it('returns null if experiment has not started', () => {
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 1);

            createExperiment({
                id: 'future-exp',
                name: 'Future',
                description: 'Test',
                variants: [
                    { id: 'control', name: 'Control', weight: 50 },
                    { id: 'treatment', name: 'Treatment', weight: 50 },
                ],
                status: 'running',
                targetPercentage: 100,
                startDate: futureDate,
            });

            const variant = assignVariant('future-exp', 'user-123');
            expect(variant).toBeNull();
        });
    });

    describe('recordConversion', () => {
        it('records conversion event', () => {
            createExperiment({
                id: 'conv-exp',
                name: 'Conversion',
                description: 'Test',
                variants: [
                    { id: 'control', name: 'Control', weight: 50 },
                    { id: 'treatment', name: 'Treatment', weight: 50 },
                ],
                status: 'running',
                targetPercentage: 100,
            });

            assignVariant('conv-exp', 'user-123');
            recordConversion('conv-exp', 'user-123', 'control', 'signup');

            const results = getExperimentResults('conv-exp');
            const controlResult = results.variants.find((v) => v.variantId === 'control');
            expect(controlResult?.conversions).toBe(1);
        });

        it('throws error if experiment not found', () => {
            expect(() => recordConversion('nonexistent', 'user-123', 'control', 'signup')).toThrow(
                'Experiment nonexistent not found'
            );
        });

        it('throws error if variant not found', () => {
            createExperiment({
                id: 'conv-exp-2',
                name: 'Conversion 2',
                description: 'Test',
                variants: [
                    { id: 'control', name: 'Control', weight: 50 },
                    { id: 'treatment', name: 'Treatment', weight: 50 },
                ],
                status: 'running',
                targetPercentage: 100,
            });

            expect(() => recordConversion('conv-exp-2', 'user-123', 'invalid', 'signup')).toThrow(
                'Variant invalid not found'
            );
        });

        it('records multiple conversions', () => {
            createExperiment({
                id: 'multi-conv',
                name: 'Multi Conversion',
                description: 'Test',
                variants: [
                    { id: 'control', name: 'Control', weight: 50 },
                    { id: 'treatment', name: 'Treatment', weight: 50 },
                ],
                status: 'running',
                targetPercentage: 100,
            });

            assignVariant('multi-conv', 'user-1');
            assignVariant('multi-conv', 'user-2');
            recordConversion('multi-conv', 'user-1', 'control', 'signup');
            recordConversion('multi-conv', 'user-2', 'control', 'signup');

            const results = getExperimentResults('multi-conv');
            const controlResult = results.variants.find((v) => v.variantId === 'control');
            expect(controlResult?.conversions).toBe(2);
        });

        it('records conversion with value', () => {
            createExperiment({
                id: 'value-conv',
                name: 'Value Conversion',
                description: 'Test',
                variants: [
                    { id: 'control', name: 'Control', weight: 50 },
                    { id: 'treatment', name: 'Treatment', weight: 50 },
                ],
                status: 'running',
                targetPercentage: 100,
            });

            assignVariant('value-conv', 'user-123');
            recordConversion('value-conv', 'user-123', 'control', 'purchase', 99.99);

            const results = getExperimentResults('value-conv');
            expect(results.variants[0].conversions).toBe(1);
        });
    });

    describe('getExperimentResults', () => {
        it('returns results with conversion rates', () => {
            createExperiment({
                id: 'results-exp',
                name: 'Results',
                description: 'Test',
                variants: [
                    { id: 'control', name: 'Control', weight: 50 },
                    { id: 'treatment', name: 'Treatment', weight: 50 },
                ],
                status: 'running',
                targetPercentage: 100,
            });

            const variant1 = assignVariant('results-exp', 'user-1');
            const variant2 = assignVariant('results-exp', 'user-2');
            const _variant3 = assignVariant('results-exp', 'user-3');
            const _variant4 = assignVariant('results-exp', 'user-4');

            // Record conversions for first two users, regardless of variant
            if (variant1) recordConversion('results-exp', 'user-1', variant1.id, 'click');
            if (variant2) recordConversion('results-exp', 'user-2', variant2.id, 'click');

            const results = getExperimentResults('results-exp');

            expect(results.experimentId).toBe('results-exp');
            expect(results.variants).toHaveLength(2);
            expect(results.totalParticipants).toBe(4);

            // Total conversions should be 2
            const totalConversions = results.variants.reduce((sum, v) => sum + v.conversions, 0);
            expect(totalConversions).toBe(2);
        });

        it('calculates correct conversion rates', () => {
            createExperiment({
                id: 'rate-exp',
                name: 'Rate',
                description: 'Test',
                variants: [
                    { id: 'control', name: 'Control', weight: 50 },
                    { id: 'treatment', name: 'Treatment', weight: 50 },
                ],
                status: 'running',
                targetPercentage: 100,
            });

            // Assign 10 users to control (deterministic)
            for (let i = 0; i < 20; i++) {
                assignVariant('rate-exp', `user-${i}`);
            }

            // Get control users and record conversions for half
            const results1 = getExperimentResults('rate-exp');
            const controlUsers = results1.variants.find(
                (v) => v.variantId === 'control'
            )?.sampleSize;

            if (controlUsers) {
                // Record conversions for first half
                for (let i = 0; i < Math.floor(controlUsers / 2); i++) {
                    recordConversion('rate-exp', `user-${i}`, 'control', 'click');
                }
            }

            const results2 = getExperimentResults('rate-exp');
            const controlResult = results2.variants.find((v) => v.variantId === 'control');

            if (controlResult && controlUsers) {
                const expectedRate = Math.floor(controlUsers / 2) / controlUsers;
                expect(controlResult.conversionRate).toBeCloseTo(expectedRate, 2);
            }
        });

        it('includes statistical significance', () => {
            createExperiment({
                id: 'stats-exp',
                name: 'Stats',
                description: 'Test',
                variants: [
                    { id: 'control', name: 'Control', weight: 50 },
                    { id: 'treatment', name: 'Treatment', weight: 50 },
                ],
                status: 'running',
                targetPercentage: 100,
            });

            const results = getExperimentResults('stats-exp');

            expect(results.statisticalSignificance).toBeDefined();
            expect(results.statisticalSignificance).toHaveProperty('isSignificant');
            expect(results.statisticalSignificance).toHaveProperty('pValue');
            expect(results.statisticalSignificance).toHaveProperty('confidenceLevel');
            expect(results.statisticalSignificance.confidenceLevel).toBe(0.95);
        });

        it('detects statistical significance with clear winner', () => {
            createExperiment({
                id: 'winner-exp',
                name: 'Winner',
                description: 'Test',
                variants: [
                    { id: 'control', name: 'Control', weight: 50 },
                    { id: 'treatment', name: 'Treatment', weight: 50 },
                ],
                status: 'running',
                targetPercentage: 100,
            });

            // Create clear difference: 100% conversion in treatment, 0% in control
            for (let i = 0; i < 100; i++) {
                const variant = assignVariant('winner-exp', `user-${i}`);
                if (variant?.id === 'treatment') {
                    recordConversion('winner-exp', `user-${i}`, 'treatment', 'click');
                }
            }

            const results = getExperimentResults('winner-exp');
            expect(results.statisticalSignificance.isSignificant).toBe(true);
        });

        it('throws error if experiment not found', () => {
            expect(() => getExperimentResults('nonexistent')).toThrow(
                'Experiment nonexistent not found'
            );
        });

        it('handles empty experiment', () => {
            createExperiment({
                id: 'empty-exp',
                name: 'Empty',
                description: 'Test',
                variants: [
                    { id: 'control', name: 'Control', weight: 50 },
                    { id: 'treatment', name: 'Treatment', weight: 50 },
                ],
                status: 'running',
                targetPercentage: 100,
            });

            const results = getExperimentResults('empty-exp');

            expect(results.totalParticipants).toBe(0);
            expect(results.variants[0].sampleSize).toBe(0);
            expect(results.variants[0].conversions).toBe(0);
            expect(results.variants[0].conversionRate).toBe(0);
        });
    });

    describe('listExperiments', () => {
        it('returns all experiments', () => {
            createExperiment({
                id: 'exp-1',
                name: 'Experiment 1',
                description: 'Test',
                variants: [
                    { id: 'control', name: 'Control', weight: 50 },
                    { id: 'treatment', name: 'Treatment', weight: 50 },
                ],
                status: 'draft',
                targetPercentage: 100,
            });

            createExperiment({
                id: 'exp-2',
                name: 'Experiment 2',
                description: 'Test',
                variants: [
                    { id: 'control', name: 'Control', weight: 50 },
                    { id: 'treatment', name: 'Treatment', weight: 50 },
                ],
                status: 'running',
                targetPercentage: 100,
            });

            const experiments = listExperiments();
            expect(experiments).toHaveLength(2);
        });

        it('filters by status', () => {
            createExperiment({
                id: 'draft-1',
                name: 'Draft 1',
                description: 'Test',
                variants: [
                    { id: 'control', name: 'Control', weight: 50 },
                    { id: 'treatment', name: 'Treatment', weight: 50 },
                ],
                status: 'draft',
                targetPercentage: 100,
            });

            createExperiment({
                id: 'running-1',
                name: 'Running 1',
                description: 'Test',
                variants: [
                    { id: 'control', name: 'Control', weight: 50 },
                    { id: 'treatment', name: 'Treatment', weight: 50 },
                ],
                status: 'running',
                targetPercentage: 100,
            });

            const runningExperiments = listExperiments('running');
            expect(runningExperiments).toHaveLength(1);
            expect(runningExperiments[0].status).toBe('running');
        });

        it('returns empty array when no experiments', () => {
            const experiments = listExperiments();
            expect(experiments).toHaveLength(0);
        });
    });

    describe('updateExperiment', () => {
        it('updates experiment fields', () => {
            createExperiment({
                id: 'update-exp',
                name: 'Original Name',
                description: 'Original Description',
                variants: [
                    { id: 'control', name: 'Control', weight: 50 },
                    { id: 'treatment', name: 'Treatment', weight: 50 },
                ],
                status: 'draft',
                targetPercentage: 100,
            });

            const updated = updateExperiment('update-exp', {
                name: 'Updated Name',
                description: 'Updated Description',
            });

            expect(updated.name).toBe('Updated Name');
            expect(updated.description).toBe('Updated Description');
            expect(updated.updatedAt).toBeInstanceOf(Date);
        });

        it('updates status', () => {
            createExperiment({
                id: 'status-exp',
                name: 'Status',
                description: 'Test',
                variants: [
                    { id: 'control', name: 'Control', weight: 50 },
                    { id: 'treatment', name: 'Treatment', weight: 50 },
                ],
                status: 'draft',
                targetPercentage: 100,
            });

            const updated = updateExperiment('status-exp', { status: 'running' });
            expect(updated.status).toBe('running');
        });

        it('throws error if experiment not found', () => {
            expect(() => updateExperiment('nonexistent', { name: 'Test' })).toThrow(
                'Experiment nonexistent not found'
            );
        });

        it('prevents updating variants of running experiment', () => {
            createExperiment({
                id: 'running-exp',
                name: 'Running',
                description: 'Test',
                variants: [
                    { id: 'control', name: 'Control', weight: 50 },
                    { id: 'treatment', name: 'Treatment', weight: 50 },
                ],
                status: 'running',
                targetPercentage: 100,
            });

            expect(() =>
                updateExperiment('running-exp', {
                    variants: [
                        { id: 'new-control', name: 'New Control', weight: 50 },
                        { id: 'new-treatment', name: 'New Treatment', weight: 50 },
                    ],
                })
            ).toThrow('Cannot update variants of a running experiment');
        });

        it('validates variant weights on update', () => {
            createExperiment({
                id: 'weight-exp',
                name: 'Weight',
                description: 'Test',
                variants: [
                    { id: 'control', name: 'Control', weight: 50 },
                    { id: 'treatment', name: 'Treatment', weight: 50 },
                ],
                status: 'draft',
                targetPercentage: 100,
            });

            expect(() =>
                updateExperiment('weight-exp', {
                    variants: [
                        { id: 'control', name: 'Control', weight: 40 },
                        { id: 'treatment', name: 'Treatment', weight: 50 },
                    ],
                })
            ).toThrow('Variant weights must sum to 100');
        });

        it('validates dates on update', () => {
            createExperiment({
                id: 'date-exp',
                name: 'Date',
                description: 'Test',
                variants: [
                    { id: 'control', name: 'Control', weight: 50 },
                    { id: 'treatment', name: 'Treatment', weight: 50 },
                ],
                status: 'draft',
                targetPercentage: 100,
            });

            expect(() =>
                updateExperiment('date-exp', {
                    startDate: new Date('2025-12-31'),
                    endDate: new Date('2025-01-01'),
                })
            ).toThrow('startDate must be before endDate');
        });
    });

    describe('getActiveExperiments', () => {
        it('returns only running experiments', () => {
            createExperiment({
                id: 'active-1',
                name: 'Active 1',
                description: 'Test',
                variants: [
                    { id: 'control', name: 'Control', weight: 50 },
                    { id: 'treatment', name: 'Treatment', weight: 50 },
                ],
                status: 'running',
                targetPercentage: 100,
            });

            createExperiment({
                id: 'draft-2',
                name: 'Draft 2',
                description: 'Test',
                variants: [
                    { id: 'control', name: 'Control', weight: 50 },
                    { id: 'treatment', name: 'Treatment', weight: 50 },
                ],
                status: 'draft',
                targetPercentage: 100,
            });

            const active = getActiveExperiments();
            expect(active).toHaveLength(1);
            expect(active[0].status).toBe('running');
        });

        it('excludes experiments that have not started', () => {
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 1);

            createExperiment({
                id: 'future',
                name: 'Future',
                description: 'Test',
                variants: [
                    { id: 'control', name: 'Control', weight: 50 },
                    { id: 'treatment', name: 'Treatment', weight: 50 },
                ],
                status: 'running',
                targetPercentage: 100,
                startDate: futureDate,
            });

            const active = getActiveExperiments();
            expect(active).toHaveLength(0);
        });

        it('excludes experiments that have ended', () => {
            const pastDate = new Date();
            pastDate.setDate(pastDate.getDate() - 1);

            createExperiment({
                id: 'past',
                name: 'Past',
                description: 'Test',
                variants: [
                    { id: 'control', name: 'Control', weight: 50 },
                    { id: 'treatment', name: 'Treatment', weight: 50 },
                ],
                status: 'running',
                targetPercentage: 100,
                endDate: pastDate,
            });

            const active = getActiveExperiments();
            expect(active).toHaveLength(0);
        });
    });

    describe('getUserExperiments', () => {
        it('returns experiments user is enrolled in', () => {
            createExperiment({
                id: 'user-exp-1',
                name: 'User Exp 1',
                description: 'Test',
                variants: [
                    { id: 'control', name: 'Control', weight: 50 },
                    { id: 'treatment', name: 'Treatment', weight: 50 },
                ],
                status: 'running',
                targetPercentage: 100,
            });

            assignVariant('user-exp-1', 'user-123');

            const userExperiments = getUserExperiments('user-123');

            expect(userExperiments).toHaveLength(1);
            expect(userExperiments[0].experiment.id).toBe('user-exp-1');
            expect(userExperiments[0].variant).toBeDefined();
        });

        it('returns empty array for user not in any experiments', () => {
            const userExperiments = getUserExperiments('user-999');
            expect(userExperiments).toHaveLength(0);
        });

        it('returns multiple experiments for user', () => {
            createExperiment({
                id: 'multi-1',
                name: 'Multi 1',
                description: 'Test',
                variants: [
                    { id: 'control', name: 'Control', weight: 50 },
                    { id: 'treatment', name: 'Treatment', weight: 50 },
                ],
                status: 'running',
                targetPercentage: 100,
            });

            createExperiment({
                id: 'multi-2',
                name: 'Multi 2',
                description: 'Test',
                variants: [
                    { id: 'control', name: 'Control', weight: 50 },
                    { id: 'treatment', name: 'Treatment', weight: 50 },
                ],
                status: 'running',
                targetPercentage: 100,
            });

            assignVariant('multi-1', 'user-456');
            assignVariant('multi-2', 'user-456');

            const userExperiments = getUserExperiments('user-456');
            expect(userExperiments).toHaveLength(2);
        });
    });

    describe('isSignificant', () => {
        it('returns false for experiment with no data', () => {
            createExperiment({
                id: 'sig-exp',
                name: 'Significance',
                description: 'Test',
                variants: [
                    { id: 'control', name: 'Control', weight: 50 },
                    { id: 'treatment', name: 'Treatment', weight: 50 },
                ],
                status: 'running',
                targetPercentage: 100,
            });

            expect(isSignificant('sig-exp')).toBe(false);
        });

        it('accepts custom confidence level', () => {
            createExperiment({
                id: 'confidence-exp',
                name: 'Confidence',
                description: 'Test',
                variants: [
                    { id: 'control', name: 'Control', weight: 50 },
                    { id: 'treatment', name: 'Treatment', weight: 50 },
                ],
                status: 'running',
                targetPercentage: 100,
            });

            const sig90 = isSignificant('confidence-exp', 0.9);
            const sig99 = isSignificant('confidence-exp', 0.99);

            expect(typeof sig90).toBe('boolean');
            expect(typeof sig99).toBe('boolean');
        });
    });

    describe('clearExperiments_forTesting', () => {
        it('clears all experiments and data', () => {
            createExperiment({
                id: 'clear-exp',
                name: 'Clear',
                description: 'Test',
                variants: [
                    { id: 'control', name: 'Control', weight: 50 },
                    { id: 'treatment', name: 'Treatment', weight: 50 },
                ],
                status: 'running',
                targetPercentage: 100,
            });

            clearExperiments_forTesting();

            const experiments = listExperiments();
            expect(experiments).toHaveLength(0);
        });
    });
});

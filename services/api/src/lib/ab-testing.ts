/**
 * A/B Testing Framework for Product Decision Validation
 *
 * Provides deterministic variant assignment, conversion tracking, and statistical significance testing
 * for running controlled experiments across YULA OS features.
 *
 * @module ab-testing
 */

import { createHash } from 'node:crypto';

export type ExperimentStatus = 'draft' | 'running' | 'paused' | 'completed';

export interface ExperimentVariant {
    id: string;
    name: string;
    weight: number; // Percentage (0-100)
}

export interface ExperimentConfig {
    id: string;
    name: string;
    description: string;
    variants: ExperimentVariant[];
    status: ExperimentStatus;
    targetPercentage: number; // Percentage of users to include (0-100)
    startDate?: Date;
    endDate?: Date;
}

export interface Experiment extends ExperimentConfig {
    createdAt: Date;
    updatedAt: Date;
}

export interface ConversionEvent {
    id: string;
    experimentId: string;
    userId: string;
    variantId: string;
    metric: string;
    value?: number;
    timestamp: Date;
}

export interface VariantResult {
    variantId: string;
    variantName: string;
    sampleSize: number;
    conversions: number;
    conversionRate: number;
}

export interface ExperimentResults {
    experimentId: string;
    experimentName: string;
    status: ExperimentStatus;
    totalParticipants: number;
    variants: VariantResult[];
    statisticalSignificance: {
        isSignificant: boolean;
        pValue: number;
        confidenceLevel: number;
        chiSquare?: number;
    };
    startDate?: Date;
    endDate?: Date;
}

// In-memory storage (in production, use a database)
const experiments = new Map<string, Experiment>();
const assignments = new Map<string, Map<string, string>>(); // experimentId -> userId -> variantId
const conversions: ConversionEvent[] = [];

/**
 * Deterministic hash function for consistent variant assignment
 */
function hashUserExperiment(experimentId: string, userId: string): number {
    const hash = createHash('sha256');
    hash.update(`${experimentId}:${userId}`);
    const digest = hash.digest('hex');
    // Convert first 8 hex chars to number and normalize to 0-100
    const num = Number.parseInt(digest.substring(0, 8), 16);
    return num % 100;
}

/**
 * Create a new A/B test experiment
 *
 * @param config - Experiment configuration
 * @returns Created experiment
 * @throws Error if validation fails
 */
export function createExperiment(config: ExperimentConfig): Experiment {
    // Validate variants
    if (!config.variants || config.variants.length < 2) {
        throw new Error('Experiment must have at least 2 variants');
    }

    // Validate variant weights sum to 100
    const totalWeight = config.variants.reduce((sum, v) => sum + v.weight, 0);
    if (Math.abs(totalWeight - 100) > 0.01) {
        throw new Error(`Variant weights must sum to 100, got ${totalWeight}`);
    }

    // Validate target percentage
    if (config.targetPercentage < 0 || config.targetPercentage > 100) {
        throw new Error('targetPercentage must be between 0 and 100');
    }

    // Validate variant IDs are unique
    const variantIds = new Set(config.variants.map((v) => v.id));
    if (variantIds.size !== config.variants.length) {
        throw new Error('Variant IDs must be unique');
    }

    // Validate dates
    if (config.startDate && config.endDate && config.startDate >= config.endDate) {
        throw new Error('startDate must be before endDate');
    }

    const experiment: Experiment = {
        ...config,
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    experiments.set(config.id, experiment);
    assignments.set(config.id, new Map());

    return experiment;
}

/**
 * Assign a user to a variant (deterministic based on user ID)
 *
 * @param experimentId - Experiment ID
 * @param userId - User ID
 * @returns Assigned variant or null if user not in target group
 */
export function assignVariant(experimentId: string, userId: string): ExperimentVariant | null {
    const experiment = experiments.get(experimentId);
    if (!experiment) {
        throw new Error(`Experiment ${experimentId} not found`);
    }

    // Only assign to running experiments
    if (experiment.status !== 'running') {
        return null;
    }

    // Check if experiment has ended
    if (experiment.endDate && new Date() > experiment.endDate) {
        return null;
    }

    // Check if experiment has started
    if (experiment.startDate && new Date() < experiment.startDate) {
        return null;
    }

    // Check if already assigned
    const existingAssignment = assignments.get(experimentId)?.get(userId);
    if (existingAssignment) {
        return experiment.variants.find((v) => v.id === existingAssignment) || null;
    }

    // Check if user is in target percentage
    const userHash = hashUserExperiment(experimentId, userId);
    if (userHash >= experiment.targetPercentage) {
        return null; // Not in target group
    }

    // Assign to variant based on weights
    const roll = (userHash / experiment.targetPercentage) * 100; // Normalize to 0-100
    let cumulative = 0;
    let assignedVariant: ExperimentVariant | null = null;

    for (const variant of experiment.variants) {
        cumulative += variant.weight;
        if (roll < cumulative) {
            assignedVariant = variant;
            break;
        }
    }

    // Fallback to last variant (handles floating point rounding)
    if (!assignedVariant) {
        assignedVariant = experiment.variants[experiment.variants.length - 1];
    }

    // Store assignment
    assignments.get(experimentId)?.set(userId, assignedVariant.id);

    return assignedVariant;
}

/**
 * Record a conversion event for an experiment
 *
 * @param experimentId - Experiment ID
 * @param userId - User ID
 * @param variantId - Variant ID
 * @param metric - Metric name (e.g., 'signup', 'purchase', 'click')
 * @param value - Optional numeric value
 */
export function recordConversion(
    experimentId: string,
    userId: string,
    variantId: string,
    metric: string,
    value?: number
): void {
    const experiment = experiments.get(experimentId);
    if (!experiment) {
        throw new Error(`Experiment ${experimentId} not found`);
    }

    // Validate variant exists
    const variant = experiment.variants.find((v) => v.id === variantId);
    if (!variant) {
        throw new Error(`Variant ${variantId} not found in experiment ${experimentId}`);
    }

    // Record conversion
    conversions.push({
        id: crypto.randomUUID(),
        experimentId,
        userId,
        variantId,
        metric,
        value,
        timestamp: new Date(),
    });
}

/**
 * Chi-square test for statistical significance
 * H0: No difference between variants
 * H1: Significant difference exists
 *
 * @param observed - Observed conversion counts [variant1, variant2, ...]
 * @param totals - Total participants per variant [variant1, variant2, ...]
 * @returns p-value and chi-square statistic
 */
function chiSquareTest(
    observed: number[],
    totals: number[]
): { pValue: number; chiSquare: number } {
    const k = observed.length; // number of variants
    const totalObserved = observed.reduce((sum, o) => sum + o, 0);
    const totalParticipants = totals.reduce((sum, t) => sum + t, 0);

    if (totalParticipants === 0) {
        return { pValue: 1, chiSquare: 0 };
    }

    const expectedRate = totalObserved / totalParticipants;

    // Calculate chi-square statistic
    let chiSquare = 0;
    for (let i = 0; i < k; i++) {
        const expected = totals[i] * expectedRate;
        if (expected === 0) continue;
        const diff = observed[i] - expected;
        chiSquare += (diff * diff) / expected;
    }

    // Degrees of freedom = k - 1
    const df = k - 1;

    // Approximate p-value using chi-square CDF
    // For simplicity, use basic approximations
    // In production, use a proper stats library
    const pValue = chiSquarePValue(chiSquare, df);

    return { pValue, chiSquare };
}

/**
 * Approximate chi-square p-value
 * Uses simplified approximation for demo purposes
 * In production, use a proper statistical library
 */
function chiSquarePValue(chiSquare: number, df: number): number {
    if (df === 1) {
        // For 1 degree of freedom (2 variants), use simple approximation
        if (chiSquare > 10.828) return 0.001; // p < 0.001
        if (chiSquare > 6.635) return 0.01; // p < 0.01
        if (chiSquare > 3.841) return 0.05; // p < 0.05
        if (chiSquare > 2.706) return 0.1; // p < 0.1
        return 0.5; // Not significant
    }

    if (df === 2) {
        if (chiSquare > 13.816) return 0.001;
        if (chiSquare > 9.21) return 0.01;
        if (chiSquare > 5.991) return 0.05;
        if (chiSquare > 4.605) return 0.1;
        return 0.5;
    }

    if (df === 3) {
        if (chiSquare > 16.266) return 0.001;
        if (chiSquare > 11.345) return 0.01;
        if (chiSquare > 7.815) return 0.05;
        if (chiSquare > 6.251) return 0.1;
        return 0.5;
    }

    // For df > 3, use rough approximation
    if (chiSquare > df * 3) return 0.001;
    if (chiSquare > df * 2) return 0.01;
    if (chiSquare > df * 1.5) return 0.05;
    return 0.5;
}

/**
 * Get experiment results with statistical analysis
 *
 * @param experimentId - Experiment ID
 * @param confidenceLevel - Confidence level (default 95%)
 * @returns Experiment results
 */
export function getExperimentResults(
    experimentId: string,
    confidenceLevel = 0.95
): ExperimentResults {
    const experiment = experiments.get(experimentId);
    if (!experiment) {
        throw new Error(`Experiment ${experimentId} not found`);
    }

    const experimentAssignments = assignments.get(experimentId) || new Map();
    const experimentConversions = conversions.filter((c) => c.experimentId === experimentId);

    // Calculate results per variant
    const variantResults: VariantResult[] = experiment.variants.map((variant) => {
        const sampleSize = Array.from(experimentAssignments.values()).filter(
            (v) => v === variant.id
        ).length;
        const conversionCount = experimentConversions.filter(
            (c) => c.variantId === variant.id
        ).length;
        const conversionRate = sampleSize > 0 ? conversionCount / sampleSize : 0;

        return {
            variantId: variant.id,
            variantName: variant.name,
            sampleSize,
            conversions: conversionCount,
            conversionRate,
        };
    });

    // Statistical significance test
    const observed = variantResults.map((v) => v.conversions);
    const totals = variantResults.map((v) => v.sampleSize);
    const { pValue, chiSquare } = chiSquareTest(observed, totals);
    const isSignificant = pValue < 1 - confidenceLevel;

    return {
        experimentId: experiment.id,
        experimentName: experiment.name,
        status: experiment.status,
        totalParticipants: experimentAssignments.size,
        variants: variantResults,
        statisticalSignificance: {
            isSignificant,
            pValue,
            confidenceLevel,
            chiSquare,
        },
        startDate: experiment.startDate,
        endDate: experiment.endDate,
    };
}

/**
 * List experiments with optional status filter
 *
 * @param status - Optional status filter
 * @returns Array of experiments
 */
export function listExperiments(status?: ExperimentStatus): Experiment[] {
    const allExperiments = Array.from(experiments.values());
    if (status) {
        return allExperiments.filter((e) => e.status === status);
    }
    return allExperiments;
}

/**
 * Update experiment configuration
 *
 * @param id - Experiment ID
 * @param updates - Partial experiment config to update
 * @returns Updated experiment
 */
export function updateExperiment(
    id: string,
    updates: Partial<Omit<ExperimentConfig, 'id'>>
): Experiment {
    const experiment = experiments.get(id);
    if (!experiment) {
        throw new Error(`Experiment ${id} not found`);
    }

    // Prevent updating running experiments' variants
    if (experiment.status === 'running' && updates.variants) {
        throw new Error('Cannot update variants of a running experiment');
    }

    // Validate variant weights if provided
    if (updates.variants) {
        const totalWeight = updates.variants.reduce((sum, v) => sum + v.weight, 0);
        if (Math.abs(totalWeight - 100) > 0.01) {
            throw new Error(`Variant weights must sum to 100, got ${totalWeight}`);
        }
    }

    // Validate dates if provided
    const newStartDate = updates.startDate ?? experiment.startDate;
    const newEndDate = updates.endDate ?? experiment.endDate;
    if (newStartDate && newEndDate && newStartDate >= newEndDate) {
        throw new Error('startDate must be before endDate');
    }

    const updated: Experiment = {
        ...experiment,
        ...updates,
        id, // Ensure ID doesn't change
        updatedAt: new Date(),
    };

    experiments.set(id, updated);
    return updated;
}

/**
 * Get all active (running) experiments
 *
 * @returns Array of running experiments
 */
export function getActiveExperiments(): Experiment[] {
    const now = new Date();
    return Array.from(experiments.values()).filter((e) => {
        if (e.status !== 'running') return false;
        if (e.startDate && now < e.startDate) return false;
        if (e.endDate && now > e.endDate) return false;
        return true;
    });
}

/**
 * Get all experiments a user is enrolled in
 *
 * @param userId - User ID
 * @returns Array of experiments with assigned variants
 */
export function getUserExperiments(
    userId: string
): Array<{ experiment: Experiment; variant: ExperimentVariant }> {
    const userExperiments: Array<{ experiment: Experiment; variant: ExperimentVariant }> = [];

    for (const [experimentId, userAssignments] of assignments.entries()) {
        const variantId = userAssignments.get(userId);
        if (variantId) {
            const experiment = experiments.get(experimentId);
            const variant = experiment?.variants.find((v) => v.id === variantId);
            if (experiment && variant) {
                userExperiments.push({ experiment, variant });
            }
        }
    }

    return userExperiments;
}

/**
 * Check if experiment results are statistically significant
 *
 * @param experimentId - Experiment ID
 * @param confidenceLevel - Confidence level (default 95%)
 * @returns True if results are statistically significant
 */
export function isSignificant(experimentId: string, confidenceLevel = 0.95): boolean {
    const results = getExperimentResults(experimentId, confidenceLevel);
    return results.statisticalSignificance.isSignificant;
}

/**
 * Clear all experiments (for testing only)
 */
export function clearExperiments_forTesting(): void {
    experiments.clear();
    assignments.clear();
    conversions.length = 0;
}

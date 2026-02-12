/**
 * Onboarding Store Tests
 *
 * Tests for the onboarding state machine, configuration, and helpers.
 * Note: Full Zustand store testing requires a DOM environment (use Vitest).
 * These tests focus on the configuration and helper functions.
 */
import { describe, expect, it } from 'vitest';
import {
    getSpotlightTarget,
    ONBOARDING_STEPS,
    type OnboardingStep,
    SPOTLIGHT_TARGETS,
    STEP_ORDER,
} from '../onboarding-store';

// ==========================================
// STEP CONFIGURATION TESTS
// ==========================================

describe('ONBOARDING_STEPS Configuration', () => {
    it('should have 5 steps defined', () => {
        expect(Object.keys(ONBOARDING_STEPS)).toHaveLength(5);
    });

    it('should have all required steps', () => {
        expect(ONBOARDING_STEPS.welcome).toBeDefined();
        expect(ONBOARDING_STEPS['import-demo']).toBeDefined();
        expect(ONBOARDING_STEPS['pac-demo']).toBeDefined();
        expect(ONBOARDING_STEPS['council-demo']).toBeDefined();
        expect(ONBOARDING_STEPS.complete).toBeDefined();
    });

    it('should have required fields for each step', () => {
        Object.values(ONBOARDING_STEPS).forEach((step) => {
            expect(step.id).toBeDefined();
            expect(step.title).toBeTruthy();
            expect(step.description).toBeTruthy();
            expect(step.feature).toBeDefined();
            expect(step.accentColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
        });
    });

    it('should have correct feature accent colors', () => {
        // IMPORT should be Electric Blue
        expect(ONBOARDING_STEPS['import-demo'].accentColor).toBe('#2563EB');
        // PAC should be Electric Amber
        expect(ONBOARDING_STEPS['pac-demo'].accentColor).toBe('#D97706');
        // COUNCIL should be Electric Violet
        expect(ONBOARDING_STEPS['council-demo'].accentColor).toBe('#7C3AED');
    });

    it('should have correct navigation links', () => {
        // Welcome step
        expect(ONBOARDING_STEPS.welcome.prev).toBeNull();
        expect(ONBOARDING_STEPS.welcome.next).toBe('import-demo');

        // Import demo step
        expect(ONBOARDING_STEPS['import-demo'].prev).toBe('welcome');
        expect(ONBOARDING_STEPS['import-demo'].next).toBe('pac-demo');

        // PAC demo step
        expect(ONBOARDING_STEPS['pac-demo'].prev).toBe('import-demo');
        expect(ONBOARDING_STEPS['pac-demo'].next).toBe('council-demo');

        // Council demo step
        expect(ONBOARDING_STEPS['council-demo'].prev).toBe('pac-demo');
        expect(ONBOARDING_STEPS['council-demo'].next).toBe('complete');

        // Complete step
        expect(ONBOARDING_STEPS.complete.prev).toBe('council-demo');
        expect(ONBOARDING_STEPS.complete.next).toBeNull();
    });

    it('should form a valid linked list', () => {
        let currentStep = ONBOARDING_STEPS.welcome;
        const visited: OnboardingStep[] = [currentStep.id];

        while (currentStep.next) {
            currentStep = ONBOARDING_STEPS[currentStep.next];
            visited.push(currentStep.id);
        }

        expect(visited).toEqual(STEP_ORDER);
    });
});

// ==========================================
// STEP ORDER TESTS
// ==========================================

describe('STEP_ORDER Configuration', () => {
    it('should have 5 steps in order', () => {
        expect(STEP_ORDER).toHaveLength(5);
    });

    it('should have correct step order', () => {
        expect(STEP_ORDER).toEqual([
            'welcome',
            'import-demo',
            'pac-demo',
            'council-demo',
            'complete',
        ]);
    });

    it('should start with welcome', () => {
        expect(STEP_ORDER[0]).toBe('welcome');
    });

    it('should end with complete', () => {
        expect(STEP_ORDER[STEP_ORDER.length - 1]).toBe('complete');
    });

    it('should match ONBOARDING_STEPS keys', () => {
        const stepKeys = Object.keys(ONBOARDING_STEPS);
        STEP_ORDER.forEach((step) => {
            expect(stepKeys).toContain(step);
        });
    });
});

// ==========================================
// SPOTLIGHT TARGETS TESTS
// ==========================================

describe('SPOTLIGHT_TARGETS Configuration', () => {
    it('should have targets for feature demo steps', () => {
        expect(SPOTLIGHT_TARGETS.length).toBeGreaterThanOrEqual(3);
    });

    it('should have required fields for each target', () => {
        SPOTLIGHT_TARGETS.forEach((target) => {
            expect(target.id).toBeTruthy();
            expect(target.step).toBeTruthy();
            expect(target.selector).toBeTruthy();
        });
    });

    it('should have valid CSS selectors', () => {
        SPOTLIGHT_TARGETS.forEach((target) => {
            // Should be a valid selector string starting with [, ., or #
            expect(target.selector).toMatch(/^[[.#]/);
        });
    });

    it('should have valid position values', () => {
        const validPositions = ['top', 'bottom', 'left', 'right', 'auto'];
        SPOTLIGHT_TARGETS.forEach((target) => {
            if (target.position) {
                expect(validPositions).toContain(target.position);
            }
        });
    });
});

// ==========================================
// SPOTLIGHT TARGET HELPER TESTS
// ==========================================

describe('getSpotlightTarget', () => {
    it('should return target for import-demo step', () => {
        const target = getSpotlightTarget('import-demo');
        expect(target).not.toBeNull();
        expect(target?.step).toBe('import-demo');
    });

    it('should return target for pac-demo step', () => {
        const target = getSpotlightTarget('pac-demo');
        expect(target).not.toBeNull();
        expect(target?.step).toBe('pac-demo');
    });

    it('should return target for council-demo step', () => {
        const target = getSpotlightTarget('council-demo');
        expect(target).not.toBeNull();
        expect(target?.step).toBe('council-demo');
    });

    it('should return null for welcome step (no spotlight)', () => {
        const target = getSpotlightTarget('welcome');
        expect(target).toBeNull();
    });

    it('should return null for complete step (no spotlight)', () => {
        const target = getSpotlightTarget('complete');
        expect(target).toBeNull();
    });
});

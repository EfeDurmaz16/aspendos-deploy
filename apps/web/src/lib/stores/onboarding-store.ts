'use client';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

// ============================================
// ONBOARDING STATE MACHINE
// ============================================

/**
 * XState-like state machine for onboarding flow
 * States: welcome → import-demo → pac-demo → council-demo → complete
 */

export type OnboardingStep = 'welcome' | 'import-demo' | 'pac-demo' | 'council-demo' | 'complete';

export interface OnboardingStepConfig {
    id: OnboardingStep;
    title: string;
    description: string;
    feature: 'welcome' | 'import' | 'pac' | 'council' | 'complete';
    accentColor: string;
    next: OnboardingStep | null;
    prev: OnboardingStep | null;
}

// Step configuration with feature accent colors
export const ONBOARDING_STEPS: Record<OnboardingStep, OnboardingStepConfig> = {
    welcome: {
        id: 'welcome',
        title: 'Welcome to YULA',
        description: 'Your Universal Learning Assistant',
        feature: 'welcome',
        accentColor: '#10B981', // Emerald for welcome
        next: 'import-demo',
        prev: null,
    },
    'import-demo': {
        id: 'import-demo',
        title: 'Import Your History',
        description: 'Bring your ChatGPT and Claude conversations',
        feature: 'import',
        accentColor: '#2563EB', // Electric Blue for IMPORT
        next: 'pac-demo',
        prev: 'welcome',
    },
    'pac-demo': {
        id: 'pac-demo',
        title: 'Proactive AI Callbacks',
        description: 'AI that reaches out when you need it',
        feature: 'pac',
        accentColor: '#D97706', // Electric Amber for PAC
        next: 'council-demo',
        prev: 'import-demo',
    },
    'council-demo': {
        id: 'council-demo',
        title: 'The AI Council',
        description: 'Get answers from 4 AI models at once',
        feature: 'council',
        accentColor: '#7C3AED', // Electric Violet for COUNCIL
        next: 'complete',
        prev: 'pac-demo',
    },
    complete: {
        id: 'complete',
        title: "You're Ready!",
        description: 'Start your YULA journey',
        feature: 'complete',
        accentColor: '#10B981', // Emerald for completion
        next: null,
        prev: 'council-demo',
    },
};

// Ordered array of steps for navigation
export const STEP_ORDER: OnboardingStep[] = [
    'welcome',
    'import-demo',
    'pac-demo',
    'council-demo',
    'complete',
];

interface OnboardingState {
    // Current state
    currentStep: OnboardingStep;
    isActive: boolean;
    hasCompleted: boolean;
    hasSkipped: boolean;

    // Step tracking
    visitedSteps: Set<OnboardingStep>;
    startedAt: Date | null;
    completedAt: Date | null;

    // Actions
    nextStep: () => void;
    prevStep: () => void;
    goToStep: (step: OnboardingStep) => void;
    skipTour: () => void;
    restartTour: () => void;
    completeOnboarding: () => void;
    startOnboarding: () => void;

    // Computed helpers
    getCurrentStepConfig: () => OnboardingStepConfig;
    getCurrentStepIndex: () => number;
    getTotalSteps: () => number;
    getProgress: () => number;
    canGoNext: () => boolean;
    canGoPrev: () => boolean;
    isFirstStep: () => boolean;
    isLastStep: () => boolean;
}

// Helper to convert Set to Array for JSON serialization
const setToArray = <T>(set: Set<T>): T[] => Array.from(set);
const arrayToSet = <T>(arr: T[]): Set<T> => new Set(arr);

export const useOnboardingStore = create<OnboardingState>()(
    persist(
        (set, get) => ({
            // Initial state
            currentStep: 'welcome',
            isActive: false,
            hasCompleted: false,
            hasSkipped: false,
            visitedSteps: new Set<OnboardingStep>(['welcome']),
            startedAt: null,
            completedAt: null,

            // Navigate to next step
            nextStep: () => {
                const { currentStep } = get();
                const config = ONBOARDING_STEPS[currentStep];

                if (config.next) {
                    set((state) => ({
                        currentStep: config.next!,
                        visitedSteps: new Set([...state.visitedSteps, config.next!]),
                    }));
                } else {
                    // At last step, complete the tour
                    get().completeOnboarding();
                }
            },

            // Navigate to previous step
            prevStep: () => {
                const { currentStep } = get();
                const config = ONBOARDING_STEPS[currentStep];

                if (config.prev) {
                    set({ currentStep: config.prev });
                }
            },

            // Jump to specific step
            goToStep: (step: OnboardingStep) => {
                if (ONBOARDING_STEPS[step]) {
                    set((state) => ({
                        currentStep: step,
                        visitedSteps: new Set([...state.visitedSteps, step]),
                    }));
                }
            },

            // Skip the tour entirely
            skipTour: () => {
                set({
                    isActive: false,
                    hasSkipped: true,
                    hasCompleted: false,
                    completedAt: new Date(),
                });
            },

            // Restart the tour from beginning
            restartTour: () => {
                set({
                    currentStep: 'welcome',
                    isActive: true,
                    hasCompleted: false,
                    hasSkipped: false,
                    visitedSteps: new Set<OnboardingStep>(['welcome']),
                    startedAt: new Date(),
                    completedAt: null,
                });
            },

            // Mark onboarding as complete
            completeOnboarding: () => {
                set({
                    currentStep: 'complete',
                    isActive: false,
                    hasCompleted: true,
                    hasSkipped: false,
                    completedAt: new Date(),
                });
            },

            // Start the onboarding flow
            startOnboarding: () => {
                set({
                    currentStep: 'welcome',
                    isActive: true,
                    hasCompleted: false,
                    hasSkipped: false,
                    visitedSteps: new Set<OnboardingStep>(['welcome']),
                    startedAt: new Date(),
                    completedAt: null,
                });
            },

            // Computed helpers
            getCurrentStepConfig: () => {
                const { currentStep } = get();
                return ONBOARDING_STEPS[currentStep];
            },

            getCurrentStepIndex: () => {
                const { currentStep } = get();
                return STEP_ORDER.indexOf(currentStep);
            },

            getTotalSteps: () => STEP_ORDER.length,

            getProgress: () => {
                const index = get().getCurrentStepIndex();
                const total = get().getTotalSteps();
                return ((index + 1) / total) * 100;
            },

            canGoNext: () => {
                const { currentStep } = get();
                return ONBOARDING_STEPS[currentStep].next !== null;
            },

            canGoPrev: () => {
                const { currentStep } = get();
                return ONBOARDING_STEPS[currentStep].prev !== null;
            },

            isFirstStep: () => {
                return get().getCurrentStepIndex() === 0;
            },

            isLastStep: () => {
                return get().getCurrentStepIndex() === STEP_ORDER.length - 1;
            },
        }),
        {
            name: 'yula-onboarding-store',
            storage: createJSONStorage(() => localStorage),
            // Custom serialization to handle Set
            partialize: (state) => ({
                currentStep: state.currentStep,
                isActive: state.isActive,
                hasCompleted: state.hasCompleted,
                hasSkipped: state.hasSkipped,
                visitedSteps: setToArray(state.visitedSteps),
                startedAt: state.startedAt,
                completedAt: state.completedAt,
            }),
            // Custom deserialization to restore Set
            onRehydrateStorage: () => (state) => {
                if (state && Array.isArray(state.visitedSteps)) {
                    state.visitedSteps = arrayToSet(
                        state.visitedSteps as unknown as OnboardingStep[]
                    );
                }
            },
        }
    )
);

// ============================================
// SPOTLIGHT TARGET REGISTRY
// ============================================

export interface SpotlightTarget {
    id: string;
    step: OnboardingStep;
    selector: string; // CSS selector for the target element
    padding?: number; // Extra padding around the spotlight
    position?: 'top' | 'bottom' | 'left' | 'right' | 'auto';
}

// Registry of spotlight targets for each step
export const SPOTLIGHT_TARGETS: SpotlightTarget[] = [
    {
        id: 'sidebar-import',
        step: 'import-demo',
        selector: '[data-spotlight="import-button"]',
        padding: 8,
        position: 'right',
    },
    {
        id: 'sidebar-pac',
        step: 'pac-demo',
        selector: '[data-spotlight="pac-button"]',
        padding: 8,
        position: 'right',
    },
    {
        id: 'council-toggle',
        step: 'council-demo',
        selector: '[data-spotlight="council-toggle"]',
        padding: 8,
        position: 'bottom',
    },
];

// Helper to get spotlight target for current step
export const getSpotlightTarget = (step: OnboardingStep): SpotlightTarget | null => {
    return SPOTLIGHT_TARGETS.find((target) => target.step === step) || null;
};

// ============================================
// ONBOARDING HOOKS
// ============================================

/**
 * Hook to check if onboarding should be shown
 * Returns true if user hasn't completed or skipped onboarding
 */
export const useShouldShowOnboarding = (): boolean => {
    const { hasCompleted, hasSkipped, isActive } = useOnboardingStore();
    return !hasCompleted && !hasSkipped && isActive;
};

/**
 * Hook to get current step info
 */
export const useCurrentOnboardingStep = () => {
    const store = useOnboardingStore();
    return {
        step: store.currentStep,
        config: store.getCurrentStepConfig(),
        index: store.getCurrentStepIndex(),
        total: store.getTotalSteps(),
        progress: store.getProgress(),
        canGoNext: store.canGoNext(),
        canGoPrev: store.canGoPrev(),
        isFirst: store.isFirstStep(),
        isLast: store.isLastStep(),
    };
};

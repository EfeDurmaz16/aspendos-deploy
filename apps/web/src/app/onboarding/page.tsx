'use client';

import { AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import {
    CompleteStep,
    CouncilDemoStep,
    ImportDemoStep,
    MemoryDemoStep,
    PacDemoStep,
    WelcomeStep,
} from '@/components/onboarding/steps';
import {
    STEP_ORDER,
    useOnboardingStore,
    type OnboardingStep,
} from '@/lib/stores/onboarding-store';
import { cn } from '@/lib/utils';

export default function OnboardingPage() {
    const router = useRouter();
    const {
        currentStep,
        nextStep,
        prevStep,
        skipTour,
        startOnboarding,
        completeOnboarding,
        restartTour,
    } = useOnboardingStore();

    // Start onboarding flow on mount
    useEffect(() => {
        startOnboarding();
    }, [startOnboarding]);

    const handleSkip = () => {
        skipTour();
        router.push('/chat');
    };

    const handleComplete = () => {
        completeOnboarding();
        router.push('/chat');
    };

    const renderStep = (step: OnboardingStep) => {
        switch (step) {
            case 'welcome':
                return <WelcomeStep onNext={nextStep} onSkip={handleSkip} />;
            case 'import-demo':
                return <ImportDemoStep onNext={nextStep} onPrev={prevStep} onSkip={handleSkip} />;
            case 'memory-demo':
                return <MemoryDemoStep onNext={nextStep} onPrev={prevStep} onSkip={handleSkip} />;
            case 'pac-demo':
                return <PacDemoStep onNext={nextStep} onPrev={prevStep} onSkip={handleSkip} />;
            case 'council-demo':
                return <CouncilDemoStep onNext={nextStep} onPrev={prevStep} onSkip={handleSkip} />;
            case 'complete':
                return <CompleteStep onComplete={handleComplete} onRestart={restartTour} />;
        }
    };

    const currentIndex = STEP_ORDER.indexOf(currentStep);

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
            {/* Subtle background glow */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-foreground/[0.02] rounded-full blur-[120px]" />
            </div>

            <div className="max-w-lg w-full relative z-10">
                <AnimatePresence mode="wait">
                    <div key={currentStep}>
                        {renderStep(currentStep)}
                    </div>
                </AnimatePresence>
            </div>

            {/* Progress dots */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-1.5">
                {STEP_ORDER.map((step, i) => (
                    <div
                        key={step}
                        className={cn(
                            'h-1.5 rounded-full transition-all duration-300',
                            i === currentIndex
                                ? 'w-6 bg-foreground'
                                : i < currentIndex
                                  ? 'w-1.5 bg-foreground/40'
                                  : 'w-1.5 bg-foreground/15'
                        )}
                    />
                ))}
            </div>
        </div>
    );
}

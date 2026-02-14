'use client';

import { ArrowRight, ChatCircle, Export, Lightning, UsersThree } from '@phosphor-icons/react';
import { AnimatePresence, motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const STEPS = [
    {
        id: 'welcome',
        icon: Lightning,
        title: 'Welcome to Yula',
        subtitle: 'Your intelligent light in every conversation.',
        description:
            'Yula connects you to the best AI models with persistent memory that grows with you. Every conversation makes Yula smarter about your preferences.',
        accentClass: 'text-emerald-500',
        bgClass: 'bg-emerald-500/10',
    },
    {
        id: 'import',
        icon: Export,
        title: 'Bring your history',
        subtitle: 'Nothing gets left behind.',
        description:
            'Import your ChatGPT or Claude conversations. Yula transforms them into searchable semantic memory, so your AI already knows your context from day one.',
        accentClass: 'text-blue-500',
        bgClass: 'bg-blue-500/10',
    },
    {
        id: 'pac',
        icon: ChatCircle,
        title: 'AI that reaches out',
        subtitle: 'Proactive, not passive.',
        description:
            'Yula can remind you about deadlines, follow up on tasks, and proactively share insights. The first AI that messages you first.',
        accentClass: 'text-amber-500',
        bgClass: 'bg-amber-500/10',
    },
    {
        id: 'council',
        icon: UsersThree,
        title: 'Ask multiple AIs at once',
        subtitle: 'The Council is in session.',
        description:
            'Send one question to GPT, Claude, Gemini, and Llama simultaneously. Compare answers side-by-side and pick the best response.',
        accentClass: 'text-violet-500',
        bgClass: 'bg-violet-500/10',
    },
];

export default function OnboardingPage() {
    const [step, setStep] = useState(0);
    const router = useRouter();

    const currentStep = STEPS[step];
    const isLastStep = step === STEPS.length - 1;

    const handleNext = () => {
        if (isLastStep) {
            router.push('/chat');
        } else {
            setStep(step + 1);
        }
    };

    const handleSkip = () => {
        router.push('/chat');
    };

    const Icon = currentStep.icon;

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
            {/* Subtle background glow */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-foreground/[0.02] rounded-full blur-[120px]" />
            </div>

            <div className="max-w-md w-full relative z-10">
                {/* Logo */}
                <div className="flex items-center justify-center mb-12">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-foreground flex items-center justify-center">
                            <span className="text-background font-bold text-sm">Y</span>
                        </div>
                        <span className="font-semibold text-foreground tracking-tight text-lg">
                            Yula
                        </span>
                    </div>
                </div>

                {/* Step Content */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={step}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -16 }}
                        transition={{ duration: 0.3 }}
                        className="text-center space-y-6"
                    >
                        {/* Icon */}
                        <motion.div
                            initial={{ scale: 0.8 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', delay: 0.1 }}
                            className="flex justify-center"
                        >
                            <div
                                className={cn(
                                    'w-16 h-16 rounded-2xl flex items-center justify-center',
                                    currentStep.bgClass
                                )}
                            >
                                <Icon
                                    weight="duotone"
                                    className={cn('w-8 h-8', currentStep.accentClass)}
                                />
                            </div>
                        </motion.div>

                        {/* Text */}
                        <div className="space-y-2">
                            <h1 className="text-2xl font-semibold text-foreground tracking-tight">
                                {currentStep.title}
                            </h1>
                            <p className="text-sm font-medium text-muted-foreground">
                                {currentStep.subtitle}
                            </p>
                        </div>

                        <p className="text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto">
                            {currentStep.description}
                        </p>

                        {/* Actions */}
                        <div className="pt-4 space-y-3">
                            <Button
                                size="lg"
                                onClick={handleNext}
                                className="w-full h-11 rounded-xl bg-foreground text-background hover:opacity-90 transition-opacity"
                            >
                                {isLastStep ? 'Start chatting' : 'Continue'}
                                <ArrowRight className="ml-2 w-4 h-4" />
                            </Button>
                            {!isLastStep && (
                                <button
                                    onClick={handleSkip}
                                    className="text-sm text-muted-foreground hover:text-foreground transition-colors w-full py-2"
                                >
                                    Skip tour
                                </button>
                            )}
                        </div>
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Progress indicators */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-1.5">
                {STEPS.map((s, i) => (
                    <button
                        key={s.id}
                        onClick={() => setStep(i)}
                        className={cn(
                            'h-1.5 rounded-full transition-all duration-300',
                            step === i
                                ? 'w-6 bg-foreground'
                                : 'w-1.5 bg-border hover:bg-muted-foreground/50'
                        )}
                    />
                ))}
            </div>
        </div>
    );
}

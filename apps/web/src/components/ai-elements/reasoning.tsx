'use client';

import { Brain, ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ReasoningProps {
    children?: React.ReactNode;
    isStreaming?: boolean;
    className?: string;
    defaultOpen?: boolean;
}

interface ReasoningTriggerProps {
    isOpen: boolean;
    onToggle: () => void;
    isStreaming?: boolean;
}

interface ReasoningContentProps {
    children: React.ReactNode;
    isOpen: boolean;
}

export function Reasoning({
    children,
    isStreaming = false,
    className,
    defaultOpen = true,
}: ReasoningProps) {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    // Auto-open when streaming starts
    useEffect(() => {
        if (isStreaming) {
            setIsOpen(true);
        }
    }, [isStreaming]);

    return (
        <div
            className={cn(
                'rounded-lg border border-amber-200 dark:border-amber-800/50 bg-amber-50/50 dark:bg-amber-950/20',
                'overflow-hidden transition-all duration-200',
                className
            )}
        >
            <ReasoningTrigger
                isOpen={isOpen}
                onToggle={() => setIsOpen(!isOpen)}
                isStreaming={isStreaming}
            />
            <ReasoningContent isOpen={isOpen}>{children}</ReasoningContent>
        </div>
    );
}

export function ReasoningTrigger({ isOpen, onToggle, isStreaming }: ReasoningTriggerProps) {
    return (
        <Button
            variant="ghost"
            onClick={onToggle}
            className={cn(
                'w-full justify-start gap-2 px-3 py-2 h-auto',
                'text-amber-700 dark:text-amber-400 hover:bg-amber-100/50 dark:hover:bg-amber-900/30',
                'rounded-none border-none'
            )}
        >
            {isStreaming ? (
                <Loader2 className="size-4 animate-spin" />
            ) : (
                <Brain className="size-4" />
            )}
            <span className="text-sm font-medium">{isStreaming ? 'Thinking...' : 'Reasoning'}</span>
            {isOpen ? (
                <ChevronDown className="size-4 ml-auto" />
            ) : (
                <ChevronRight className="size-4 ml-auto" />
            )}
        </Button>
    );
}

export function ReasoningContent({ children, isOpen }: ReasoningContentProps) {
    if (!isOpen) return null;

    return (
        <div className="px-3 pb-3 pt-1 text-sm text-amber-900/80 dark:text-amber-200/80">
            <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1">
                {children}
            </div>
        </div>
    );
}

// Chain of Thought component for step-by-step reasoning
interface ChainOfThoughtProps {
    steps: string[];
    currentStep?: number;
    isStreaming?: boolean;
    className?: string;
}

export function ChainOfThought({
    steps,
    currentStep,
    isStreaming = false,
    className,
}: ChainOfThoughtProps) {
    return (
        <div className={cn('space-y-1', className)}>
            {steps.map((step, index) => {
                const isActive = currentStep === index;
                const isComplete = currentStep !== undefined && index < currentStep;

                return (
                    <div
                        key={index}
                        className={cn(
                            'flex items-start gap-2 p-2 rounded-md text-sm',
                            'transition-all duration-200',
                            isActive && 'bg-amber-100/70 dark:bg-amber-900/40',
                            isComplete && 'text-muted-foreground',
                            !isActive && !isComplete && 'text-muted-foreground/60'
                        )}
                    >
                        <span
                            className={cn(
                                'flex-shrink-0 size-5 rounded-full flex items-center justify-center text-xs font-medium',
                                isActive && 'bg-amber-500 text-white',
                                isComplete && 'bg-emerald-500 text-white',
                                !isActive && !isComplete && 'bg-muted text-muted-foreground'
                            )}
                        >
                            {isComplete ? '✓' : index + 1}
                        </span>
                        <span className="flex-1">{step}</span>
                        {isActive && isStreaming && (
                            <Loader2 className="size-4 animate-spin text-amber-500" />
                        )}
                    </div>
                );
            })}
        </div>
    );
}

'use client';

/**
 * Suggestion Component (AI Elements)
 *
 * Renders suggested action chips that users can click to quickly
 * send a message or trigger an action.
 */

import { cn } from '@/lib/utils';

interface SuggestionProps {
    text: string;
    onClick?: () => void;
    icon?: React.ReactNode;
    className?: string;
}

export function Suggestion({ text, onClick, icon, className }: SuggestionProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 text-sm',
                'rounded-full border border-white/10 bg-white/5',
                'hover:bg-white/10 hover:border-white/20 transition-colors',
                'text-neutral-300',
                className
            )}
        >
            {icon}
            {text}
        </button>
    );
}

interface SuggestionGroupProps {
    suggestions: Array<{ text: string; onClick?: () => void; icon?: React.ReactNode }>;
    className?: string;
}

export function SuggestionGroup({ suggestions, className }: SuggestionGroupProps) {
    return (
        <div className={cn('flex flex-wrap gap-2', className)}>
            {suggestions.map((s) => (
                <Suggestion key={s.text} {...s} />
            ))}
        </div>
    );
}

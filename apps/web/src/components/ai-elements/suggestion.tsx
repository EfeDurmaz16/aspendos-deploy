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
            disabled={!onClick}
            className={cn(
                'inline-flex items-center gap-1.5 px-3 min-h-[44px] text-sm',
                'rounded-full border border-white/15 bg-white/5',
                'hover:bg-white/10 hover:border-white/20 transition-colors',
                'focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:outline-none',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                'text-neutral-300',
                className
            )}
        >
            {icon && <span aria-hidden="true">{icon}</span>}
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
        <fieldset
            className={cn('flex flex-wrap gap-2 border-0 p-0 m-0', className)}
            aria-label="Suggestions"
        >
            {suggestions.map((s) => (
                <Suggestion key={s.text} {...s} />
            ))}
        </fieldset>
    );
}

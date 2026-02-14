'use client';

import { Check, ChevronDown, Sparkles, Zap, Brain, Palette } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

// ============================================
// YULA MODE SYSTEM
// ============================================
// Users never see real model names (GPT-5.2, Claude 4.5, etc.)
// Instead they pick a "mode" that maps to optimal models internally.

export type YulaMode = 'auto' | 'smart' | 'fast' | 'creative';

export interface ModeConfig {
    id: YulaMode;
    label: string;
    description: string;
    icon: typeof Sparkles;
    badge?: string;
    /** Internal model mapping - never shown to users */
    _models: {
        primary: string;
        fallback: string;
    };
}

export const YULA_MODES: ModeConfig[] = [
    {
        id: 'auto',
        label: 'Auto',
        description: 'Picks the best model for each query automatically.',
        icon: Sparkles,
        badge: 'Recommended',
        _models: {
            primary: '__router__',
            fallback: 'gpt-4o-mini',
        },
    },
    {
        id: 'smart',
        label: 'Smart',
        description: 'Maximum reasoning power for complex tasks.',
        icon: Brain,
        _models: {
            primary: 'claude-3-5-sonnet-20241022',
            fallback: 'gpt-4o',
        },
    },
    {
        id: 'fast',
        label: 'Fast',
        description: 'Lightning-fast responses for quick questions.',
        icon: Zap,
        _models: {
            primary: 'gpt-4o-mini',
            fallback: 'gemini-2.0-flash',
        },
    },
    {
        id: 'creative',
        label: 'Creative',
        description: 'Best for writing, brainstorming, and ideation.',
        icon: Palette,
        _models: {
            primary: 'gpt-4o',
            fallback: 'claude-3-5-sonnet-20241022',
        },
    },
];

/**
 * Resolve a mode to its primary model ID for the backend.
 * Returns undefined for 'auto' mode (let router decide).
 */
export function resolveMode(mode: YulaMode): string | undefined {
    if (mode === 'auto') return undefined;
    const config = YULA_MODES.find((m) => m.id === mode);
    return config?._models.primary;
}

// ============================================
// MODE PICKER COMPONENT
// ============================================

interface ModePickerProps {
    selectedMode: YulaMode;
    onSelectMode: (mode: YulaMode) => void;
    className?: string;
}

export function ModePicker({ selectedMode, onSelectMode, className }: ModePickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const currentMode = YULA_MODES.find((m) => m.id === selectedMode) || YULA_MODES[0];
    const Icon = currentMode.icon;

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    return (
        <div className={cn('relative', className)} ref={dropdownRef}>
            {/* Trigger */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-1.5 bg-muted hover:bg-muted/80 border border-border rounded-lg text-foreground transition-colors"
            >
                <Icon className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">{currentMode.label}</span>
                <ChevronDown
                    className={cn(
                        'w-3.5 h-3.5 text-muted-foreground transition-transform duration-200',
                        isOpen && 'rotate-180'
                    )}
                />
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute top-full mt-2 left-0 w-[280px] z-50 rounded-xl border border-border bg-popover shadow-lg overflow-hidden">
                    <div className="p-2 space-y-0.5">
                        <div className="px-3 py-2 mb-1">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                Response Mode
                            </p>
                        </div>

                        {YULA_MODES.map((mode) => {
                            const ModeIcon = mode.icon;
                            const isSelected = selectedMode === mode.id;

                            return (
                                <button
                                    key={mode.id}
                                    onClick={() => {
                                        onSelectMode(mode.id);
                                        setIsOpen(false);
                                    }}
                                    className={cn(
                                        'w-full flex items-start gap-3 px-3 py-2.5 rounded-lg transition-colors text-left',
                                        isSelected
                                            ? 'bg-primary/10 text-foreground'
                                            : 'hover:bg-muted text-foreground'
                                    )}
                                >
                                    <ModeIcon
                                        className={cn(
                                            'w-4 h-4 mt-0.5 flex-shrink-0',
                                            isSelected ? 'text-primary' : 'text-muted-foreground'
                                        )}
                                    />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-medium">
                                                {mode.label}
                                            </span>
                                            {mode.badge && (
                                                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                                                    {mode.badge}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                                            {mode.description}
                                        </p>
                                    </div>
                                    {isSelected && (
                                        <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

// Keep backward-compatible export for any existing imports
export { ModePicker as ModelPicker };

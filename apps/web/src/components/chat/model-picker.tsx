'use client';

import type { Icon } from '@phosphor-icons/react';
import { Brain, CaretDown, Check, Lightning, Palette, Sparkle } from '@phosphor-icons/react';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

// ============================================
// YULA MODE SYSTEM
// ============================================

export type YulaMode = 'auto' | 'smart' | 'fast' | 'creative';

export interface ModeConfig {
    id: YulaMode;
    label: string;
    description: string;
    icon: Icon;
    badge?: string;
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
        icon: Sparkle,
        badge: 'Default',
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
        icon: Lightning,
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
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors text-sm"
            >
                <Icon size={14} />
                <span className="font-medium text-[13px]">{currentMode.label}</span>
                <CaretDown
                    size={12}
                    className={cn('transition-transform duration-150', isOpen && 'rotate-180')}
                />
            </button>

            {isOpen && (
                <div className="absolute bottom-full mb-2 left-0 w-[260px] z-50 rounded-xl border border-border bg-popover shadow-md overflow-hidden">
                    <div className="p-1.5 space-y-px">
                        <div className="px-2.5 py-1.5 mb-0.5">
                            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">
                                Mode
                            </p>
                        </div>

                        {YULA_MODES.map((mode) => {
                            const ModeIcon = mode.icon;
                            const isSelected = selectedMode === mode.id;

                            return (
                                <button
                                    type="button"
                                    key={mode.id}
                                    onClick={() => {
                                        onSelectMode(mode.id);
                                        setIsOpen(false);
                                    }}
                                    className={cn(
                                        'w-full flex items-start gap-2.5 px-2.5 py-2 rounded-lg transition-colors text-left',
                                        isSelected
                                            ? 'bg-muted text-foreground'
                                            : 'hover:bg-muted/60 text-foreground'
                                    )}
                                >
                                    <ModeIcon
                                        size={14}
                                        weight={isSelected ? 'fill' : 'regular'}
                                        className={cn(
                                            'mt-0.5 flex-shrink-0',
                                            isSelected ? 'text-foreground' : 'text-muted-foreground'
                                        )}
                                    />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[13px] font-medium">
                                                {mode.label}
                                            </span>
                                            {mode.badge && (
                                                <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                                                    {mode.badge}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                                            {mode.description}
                                        </p>
                                    </div>
                                    {isSelected && (
                                        <Check
                                            size={14}
                                            weight="bold"
                                            className="text-foreground flex-shrink-0 mt-0.5"
                                        />
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

export { ModePicker as ModelPicker };

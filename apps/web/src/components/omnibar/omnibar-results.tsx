'use client';

import { motion } from 'framer-motion';
import {
    CalendarBlank,
    Receipt,
    Sparkle,
    Users,
    House,
    ChatCircle,
    Brain,
    Gear,
    File,
    MagnifyingGlass,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import type { OmnibarResult } from '@/stores/yula-store';

interface OmnibarResultsProps {
    results: OmnibarResult[];
    selectedIndex: number;
    onSelect: (result: OmnibarResult) => void;
    onHover: (index: number) => void;
}

const iconMap: Record<string, typeof CalendarBlank> = {
    calendar: CalendarBlank,
    receipt: Receipt,
    sparkle: Sparkle,
    users: Users,
    home: House,
    chat: ChatCircle,
    brain: Brain,
    settings: Gear,
    file: File,
    search: MagnifyingGlass,
};

const typeLabels: Record<OmnibarResult['type'], string> = {
    action: 'Action',
    memory: 'Memory',
    chat: 'Chat',
    setting: 'Navigation',
};

const typeColors: Record<OmnibarResult['type'], string> = {
    action: 'text-emerald-400',
    memory: 'text-violet-400',
    chat: 'text-sky-400',
    setting: 'text-zinc-400',
};

export function OmnibarResults({ results, selectedIndex, onSelect, onHover }: OmnibarResultsProps) {
    if (results.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
                <MagnifyingGlass className="mb-3 h-8 w-8 opacity-50" />
                <p className="text-sm">No results found</p>
                <p className="mt-1 text-xs text-zinc-600">Try a different search term</p>
            </div>
        );
    }

    // Group results by type
    const groupedResults = results.reduce(
        (acc, result) => {
            const type = result.type;
            if (!acc[type]) acc[type] = [];
            acc[type].push(result);
            return acc;
        },
        {} as Record<OmnibarResult['type'], OmnibarResult[]>
    );

    let globalIndex = -1;

    return (
        <div className="space-y-2">
            {Object.entries(groupedResults).map(([type, items]) => (
                <div key={type}>
                    <div className="mb-1 px-2">
                        <span className={cn('text-xs font-medium uppercase tracking-wider', typeColors[type as OmnibarResult['type']])}>
                            {typeLabels[type as OmnibarResult['type']]}
                        </span>
                    </div>
                    <div className="space-y-0.5">
                        {items.map((result) => {
                            globalIndex++;
                            const currentIndex = globalIndex;
                            const isSelected = selectedIndex === currentIndex;
                            const Icon = iconMap[result.icon || 'file'] || File;

                            return (
                                <motion.button
                                    key={result.id}
                                    initial={{ opacity: 0, y: 4 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: currentIndex * 0.02 }}
                                    onClick={() => onSelect(result)}
                                    onMouseEnter={() => onHover(currentIndex)}
                                    className={cn(
                                        'group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-all duration-150',
                                        isSelected
                                            ? 'bg-white/10 shadow-lg shadow-white/5'
                                            : 'hover:bg-white/5'
                                    )}
                                >
                                    <div
                                        className={cn(
                                            'flex h-9 w-9 items-center justify-center rounded-lg transition-colors',
                                            isSelected ? 'bg-white/15' : 'bg-white/5 group-hover:bg-white/10'
                                        )}
                                    >
                                        <Icon
                                            className={cn('h-4 w-4', isSelected ? 'text-white' : 'text-zinc-400')}
                                            weight={isSelected ? 'fill' : 'regular'}
                                        />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p
                                            className={cn(
                                                'truncate text-sm font-medium transition-colors',
                                                isSelected ? 'text-white' : 'text-zinc-300'
                                            )}
                                        >
                                            {result.title}
                                        </p>
                                        {result.description && (
                                            <p className="truncate text-xs text-zinc-500">{result.description}</p>
                                        )}
                                    </div>
                                    {isSelected && (
                                        <div className="flex items-center gap-1 text-xs text-zinc-500">
                                            <kbd className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[10px]">
                                                Enter
                                            </kbd>
                                        </div>
                                    )}
                                </motion.button>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
}

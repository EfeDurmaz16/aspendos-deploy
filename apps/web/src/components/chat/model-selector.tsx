'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { CaretDown, Check, Lightning, Sparkle, Crown } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

interface Model {
    id: string;
    name: string;
    provider: string;
    tier?: string;
}

interface ModelSelectorProps {
    selectedModel?: string;
    onModelChange: (modelId: string) => void;
    disabled?: boolean;
    className?: string;
}

// Provider icons/colors
const PROVIDER_COLORS: Record<string, string> = {
    openai: 'text-emerald-500',
    anthropic: 'text-amber-500',
    google: 'text-blue-500',
};

// Tier icons
const TIER_ICONS: Record<string, React.ElementType> = {
    STARTER: Lightning,
    PRO: Sparkle,
    ULTRA: Crown,
};

const TIER_LABELS: Record<string, string> = {
    STARTER: 'Starter',
    PRO: 'Pro',
    ULTRA: 'Ultra',
};

export function ModelSelector({
    selectedModel = 'openai/gpt-4o-mini',
    onModelChange,
    disabled = false,
    className,
}: ModelSelectorProps) {
    const { getToken } = useAuth();
    const [models, setModels] = useState<Model[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Fetch models from API
    useEffect(() => {
        const fetchModels = async () => {
            try {
                const token = await getToken();
                const res = await fetch(`${API_BASE}/api/models`, {
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                });

                if (res.ok) {
                    const data = await res.json();
                    setModels(data.models || []);
                }
            } catch (err) {
                console.error('Failed to fetch models:', err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchModels();
    }, [getToken]);

    // Group models by provider
    const groupedModels = models.reduce((acc, model) => {
        const provider = model.provider || 'other';
        if (!acc[provider]) {
            acc[provider] = [];
        }
        acc[provider].push(model);
        return acc;
    }, {} as Record<string, Model[]>);

    // Get current model info
    const currentModel = models.find((m) => m.id === selectedModel);

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild disabled={disabled}>
                <Button
                    variant="ghost"
                    className={cn(
                        'h-8 px-3 gap-2 text-xs font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800',
                        className
                    )}
                >
                    {isLoading ? (
                        <span className="text-zinc-400">Loading...</span>
                    ) : (
                        <>
                            <span className={PROVIDER_COLORS[currentModel?.provider || 'openai']}>
                                {currentModel?.name || selectedModel.split('/')[1]}
                            </span>
                            <CaretDown className="w-3 h-3 text-zinc-400" />
                        </>
                    )}
                </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="center" className="w-64">
                {Object.entries(groupedModels).map(([provider, providerModels]) => (
                    <div key={provider}>
                        <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-zinc-400">
                            {provider}
                        </DropdownMenuLabel>
                        {providerModels.map((model) => {
                            const isSelected = model.id === selectedModel;
                            const TierIcon = TIER_ICONS[model.tier || 'STARTER'] || Lightning;

                            return (
                                <DropdownMenuItem
                                    key={model.id}
                                    onClick={() => onModelChange(model.id)}
                                    className="flex items-center justify-between cursor-pointer"
                                >
                                    <div className="flex items-center gap-2">
                                        <TierIcon
                                            className={cn(
                                                'w-3.5 h-3.5',
                                                model.tier === 'ULTRA'
                                                    ? 'text-purple-500'
                                                    : model.tier === 'PRO'
                                                      ? 'text-blue-500'
                                                      : 'text-zinc-400'
                                            )}
                                        />
                                        <span className="text-sm">{model.name}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {model.tier && (
                                            <span
                                                className={cn(
                                                    'text-[10px] px-1.5 py-0.5 rounded uppercase font-medium',
                                                    model.tier === 'ULTRA'
                                                        ? 'bg-purple-500/10 text-purple-500'
                                                        : model.tier === 'PRO'
                                                          ? 'bg-blue-500/10 text-blue-500'
                                                          : 'bg-zinc-500/10 text-zinc-500'
                                                )}
                                            >
                                                {TIER_LABELS[model.tier]}
                                            </span>
                                        )}
                                        {isSelected && <Check className="w-4 h-4 text-emerald-500" />}
                                    </div>
                                </DropdownMenuItem>
                            );
                        })}
                        <DropdownMenuSeparator />
                    </div>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

export default ModelSelector;

'use client';

import { motion } from 'framer-motion';
import { Lightning, Brain, Gauge } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useYulaStore, type EngineMode } from '@/stores/yula-store';

interface HybridEngineToggleProps {
    className?: string;
    showLabel?: boolean;
    size?: 'sm' | 'md' | 'lg';
}

const modeConfig: Record<
    EngineMode,
    {
        label: string;
        description: string;
        icon: typeof Lightning;
        color: string;
        bgColor: string;
    }
> = {
    speed: {
        label: 'Speed Mode',
        description: 'Fast responses for daily tasks',
        icon: Lightning,
        color: '#f59e0b',
        bgColor: 'bg-amber-500/10',
    },
    deep: {
        label: 'Deep Thought',
        description: 'Complex planning & analysis',
        icon: Brain,
        color: '#8b5cf6',
        bgColor: 'bg-violet-500/10',
    },
};

export function HybridEngineToggle({
    className,
    showLabel = true,
    size = 'md',
}: HybridEngineToggleProps) {
    const { settings, toggleEngineMode, setEngineMode } = useYulaStore();
    const mode = settings.engineMode;
    const config = modeConfig[mode];
    const Icon = config.icon;

    const sizeClasses = {
        sm: {
            container: 'h-8',
            pill: 'h-6 w-6',
            icon: 'h-3.5 w-3.5',
            text: 'text-xs',
        },
        md: {
            container: 'h-10',
            pill: 'h-8 w-8',
            icon: 'h-4 w-4',
            text: 'text-sm',
        },
        lg: {
            container: 'h-12',
            pill: 'h-10 w-10',
            icon: 'h-5 w-5',
            text: 'text-base',
        },
    };

    const sizes = sizeClasses[size];

    return (
        <div className={cn('flex items-center gap-3', className)}>
            {/* Toggle switch */}
            <button
                onClick={toggleEngineMode}
                className={cn(
                    'relative flex items-center rounded-full border border-white/10 bg-zinc-900/80 p-1',
                    'transition-all duration-300 hover:border-white/20',
                    sizes.container
                )}
                style={{ width: size === 'sm' ? 64 : size === 'md' ? 80 : 96 }}
            >
                {/* Background indicator */}
                <motion.div
                    layout
                    className={cn(
                        'absolute rounded-full',
                        sizes.pill
                    )}
                    style={{
                        backgroundColor: `${config.color}20`,
                        left: mode === 'speed' ? 4 : 'auto',
                        right: mode === 'deep' ? 4 : 'auto',
                    }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />

                {/* Speed icon */}
                <div
                    className={cn(
                        'relative z-10 flex items-center justify-center rounded-full transition-colors',
                        sizes.pill
                    )}
                >
                    <Lightning
                        className={sizes.icon}
                        color={mode === 'speed' ? modeConfig.speed.color : '#71717a'}
                        weight={mode === 'speed' ? 'fill' : 'regular'}
                    />
                </div>

                {/* Deep icon */}
                <div
                    className={cn(
                        'relative z-10 flex items-center justify-center rounded-full transition-colors',
                        sizes.pill
                    )}
                >
                    <Brain
                        className={sizes.icon}
                        color={mode === 'deep' ? modeConfig.deep.color : '#71717a'}
                        weight={mode === 'deep' ? 'fill' : 'regular'}
                    />
                </div>
            </button>

            {/* Label */}
            {showLabel && (
                <div className="min-w-0">
                    <p className={cn('font-medium text-white', sizes.text)}>{config.label}</p>
                    <p className="truncate text-xs text-zinc-500">{config.description}</p>
                </div>
            )}
        </div>
    );
}

// Engine mode indicator (compact display)
export function EngineIndicator({ className }: { className?: string }) {
    const { settings } = useYulaStore();
    const mode = settings.engineMode;
    const config = modeConfig[mode];
    const Icon = config.icon;

    return (
        <motion.div
            layout
            className={cn(
                'flex items-center gap-1.5 rounded-full px-2.5 py-1',
                'border border-white/10 bg-zinc-900/80',
                className
            )}
        >
            <Icon className="h-3.5 w-3.5" color={config.color} weight="fill" />
            <span className="text-xs font-medium" style={{ color: config.color }}>
                {mode === 'speed' ? 'Speed' : 'Deep'}
            </span>
        </motion.div>
    );
}

// Full engine settings panel
export function EngineSettingsPanel({ className }: { className?: string }) {
    const { settings, setEngineMode } = useYulaStore();
    const mode = settings.engineMode;

    return (
        <div
            className={cn(
                'rounded-xl border border-white/10 bg-zinc-900/80 p-4',
                className
            )}
        >
            <div className="mb-4 flex items-center gap-2">
                <Gauge className="h-5 w-5 text-violet-400" weight="fill" />
                <h3 className="font-semibold text-white">Hybrid Engine</h3>
            </div>

            <div className="space-y-2">
                {(Object.keys(modeConfig) as EngineMode[]).map((modeKey) => {
                    const config = modeConfig[modeKey];
                    const Icon = config.icon;
                    const isActive = mode === modeKey;

                    return (
                        <button
                            key={modeKey}
                            onClick={() => setEngineMode(modeKey)}
                            className={cn(
                                'flex w-full items-center gap-3 rounded-lg p-3',
                                'border transition-all duration-200',
                                isActive
                                    ? 'border-white/20 bg-white/5'
                                    : 'border-white/5 bg-transparent hover:border-white/10 hover:bg-white/[0.02]'
                            )}
                        >
                            <div
                                className="flex h-10 w-10 items-center justify-center rounded-lg"
                                style={{ backgroundColor: `${config.color}15` }}
                            >
                                <Icon
                                    className="h-5 w-5"
                                    color={config.color}
                                    weight={isActive ? 'fill' : 'regular'}
                                />
                            </div>
                            <div className="flex-1 text-left">
                                <p
                                    className={cn(
                                        'font-medium',
                                        isActive ? 'text-white' : 'text-zinc-400'
                                    )}
                                >
                                    {config.label}
                                </p>
                                <p className="text-xs text-zinc-500">{config.description}</p>
                            </div>
                            {isActive && (
                                <div
                                    className="h-2 w-2 rounded-full"
                                    style={{ backgroundColor: config.color }}
                                />
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

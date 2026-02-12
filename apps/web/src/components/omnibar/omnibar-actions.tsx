'use client';

import {
    ArrowRight,
    CalendarBlank,
    Clipboard,
    Lightning,
    Sparkle,
    Users,
} from '@phosphor-icons/react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface QuickAction {
    id: string;
    title: string;
    description: string;
    icon: React.ComponentType<{ className?: string; weight?: 'fill' | 'regular' }>;
    color: string;
    bgColor: string;
}

const quickActions: QuickAction[] = [
    {
        id: 'plan-weekend',
        title: 'Plan my weekend',
        description: 'Smart scheduling',
        icon: CalendarBlank,
        color: 'text-emerald-400',
        bgColor: 'bg-emerald-500/10',
    },
    {
        id: 'smart-paste',
        title: 'Smart Paste',
        description: 'Paste & process',
        icon: Clipboard,
        color: 'text-violet-400',
        bgColor: 'bg-violet-500/10',
    },
    {
        id: 'quick-task',
        title: 'Quick task',
        description: 'Speed mode',
        icon: Lightning,
        color: 'text-amber-400',
        bgColor: 'bg-amber-500/10',
    },
    {
        id: 'council',
        title: 'The Council',
        description: 'Multi-perspective',
        icon: Users,
        color: 'text-sky-400',
        bgColor: 'bg-sky-500/10',
    },
];

interface OmnibarActionsProps {
    onAction: (actionId: string) => void;
}

export function OmnibarActions({ onAction }: OmnibarActionsProps) {
    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
                <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                    Quick Actions
                </span>
                <Sparkle className="h-3.5 w-3.5 text-zinc-600" weight="fill" />
            </div>
            <div className="grid grid-cols-2 gap-2">
                {quickActions.map((action, index) => {
                    const Icon = action.icon;
                    return (
                        <motion.button
                            key={action.id}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.05, type: 'spring', stiffness: 300 }}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => onAction(action.id)}
                            className={cn(
                                'group relative flex flex-col items-start gap-2 rounded-xl border border-white/5 p-3',
                                'bg-white/[0.02] backdrop-blur-sm',
                                'transition-all duration-200 hover:border-white/10 hover:bg-white/[0.05]'
                            )}
                        >
                            <div
                                className={cn(
                                    'flex h-8 w-8 items-center justify-center rounded-lg',
                                    action.bgColor
                                )}
                            >
                                <Icon className={cn('h-4 w-4', action.color)} weight="fill" />
                            </div>
                            <div className="space-y-0.5">
                                <p className="text-sm font-medium text-zinc-200">{action.title}</p>
                                <p className="text-xs text-zinc-500">{action.description}</p>
                            </div>
                            <ArrowRight
                                className={cn(
                                    'absolute right-3 top-3 h-3.5 w-3.5 text-zinc-600',
                                    'opacity-0 transition-all duration-200',
                                    'group-hover:opacity-100 group-hover:translate-x-0.5'
                                )}
                            />
                        </motion.button>
                    );
                })}
            </div>
        </div>
    );
}

'use client';

import { Brain, ChatCircle, Command, Gear, Lightning, Sparkle, Users } from '@phosphor-icons/react';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { CouncilChat } from '@/components/council';
import { MemoryGraph } from '@/components/memory-graph';
import { WelcomeGuideTrigger } from '@/components/onboarding';
// Components
import { PACTimeline } from '@/components/pac-timeline';
import { EngineIndicator, HybridEngineToggle } from '@/components/settings';
import { cn } from '@/lib/utils';

type ActiveView = 'chat' | 'council' | 'memory';

export default function YulaPage() {
    const [activeView, setActiveView] = useState<ActiveView>('chat');
    const [pacCollapsed, setPacCollapsed] = useState(false);
    const [memoryCollapsed, setMemoryCollapsed] = useState(false);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Cmd+1 = Chat view
            if (e.metaKey && e.key === '1') {
                e.preventDefault();
                setActiveView('chat');
            }
            // Cmd+2 = Council view
            if (e.metaKey && e.key === '2') {
                e.preventDefault();
                setActiveView('council');
            }
            // Cmd+3 = Memory view
            if (e.metaKey && e.key === '3') {
                e.preventDefault();
                setActiveView('memory');
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, []);

    return (
        <div className="flex h-screen overflow-hidden bg-zinc-950">
            {/* PAC Timeline Sidebar */}
            <PACTimeline
                collapsed={pacCollapsed}
                onToggleCollapse={() => setPacCollapsed(!pacCollapsed)}
            />

            {/* Main Content Area */}
            <div className="flex flex-1 flex-col overflow-hidden">
                {/* Top Bar */}
                <header className="flex items-center justify-between border-b border-white/5 bg-zinc-900/50 px-6 py-3">
                    <div className="flex items-center gap-4">
                        {/* Logo */}
                        <div className="flex items-center gap-2">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10">
                                <Sparkle className="h-5 w-5 text-violet-400" weight="fill" />
                            </div>
                            <span className="text-lg font-semibold text-white">Yula</span>
                        </div>

                        {/* View Tabs */}
                        <div className="flex items-center gap-1 rounded-lg border border-white/5 bg-white/[0.02] p-1">
                            {[
                                { id: 'chat', icon: ChatCircle, label: 'Chat' },
                                { id: 'council', icon: Users, label: 'Council' },
                                { id: 'memory', icon: Brain, label: 'Memory' },
                            ].map(({ id, icon: Icon, label }) => (
                                <button
                                    key={id}
                                    onClick={() => setActiveView(id as ActiveView)}
                                    className={cn(
                                        'flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-all',
                                        activeView === id
                                            ? 'bg-white/10 text-white'
                                            : 'text-zinc-500 hover:text-zinc-300'
                                    )}
                                >
                                    <Icon
                                        className="h-4 w-4"
                                        weight={activeView === id ? 'fill' : 'regular'}
                                    />
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Engine Toggle */}
                        <HybridEngineToggle size="sm" showLabel={false} />

                        {/* Search hint */}
                        <button
                            onClick={() => useYulaStore.getState().openOmnibar()}
                            className={cn(
                                'flex items-center gap-2 rounded-lg px-3 py-1.5',
                                'border border-white/10 bg-white/5 text-sm text-zinc-500',
                                'transition-colors hover:bg-white/10 hover:text-zinc-300'
                            )}
                        >
                            <Command className="h-3.5 w-3.5" />
                            <span>K</span>
                        </button>

                        {/* Settings */}
                        <button className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-white/5 hover:text-white">
                            <Gear className="h-4 w-4" />
                        </button>
                    </div>
                </header>

                {/* Main View */}
                <div className="flex flex-1 overflow-hidden">
                    {/* Center Content */}
                    <main className="flex-1 overflow-hidden">
                        {activeView === 'chat' && (
                            <div className="flex h-full flex-col items-center justify-center p-8">
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="max-w-xl text-center"
                                >
                                    <div className="mb-6 flex justify-center">
                                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-500/10">
                                            <Sparkle
                                                className="h-8 w-8 text-violet-400"
                                                weight="fill"
                                            />
                                        </div>
                                    </div>
                                    <h1 className="mb-3 text-2xl font-semibold text-white">
                                        Good evening
                                    </h1>
                                    <p className="mb-8 text-zinc-500">
                                        I'm Yula, your proactive AI companion. How can I help you
                                        today?
                                    </p>

                                    {/* Quick Actions */}
                                    <div className="grid grid-cols-2 gap-3">
                                        {[
                                            {
                                                icon: Lightning,
                                                label: 'Quick Task',
                                                color: '#f59e0b',
                                            },
                                            { icon: Users, label: 'Ask Council', color: '#3b82f6' },
                                            { icon: Brain, label: 'Remember', color: '#ec4899' },
                                            {
                                                icon: ChatCircle,
                                                label: 'New Chat',
                                                color: '#10b981',
                                            },
                                        ].map(({ icon: Icon, label, color }) => (
                                            <button
                                                key={label}
                                                onClick={() => {
                                                    if (label === 'Ask Council')
                                                        setActiveView('council');
                                                    if (label === 'Remember')
                                                        setActiveView('memory');
                                                }}
                                                className={cn(
                                                    'flex items-center gap-3 rounded-xl p-4',
                                                    'border border-white/5 bg-white/[0.02]',
                                                    'transition-all hover:border-white/10 hover:bg-white/[0.04]'
                                                )}
                                            >
                                                <div
                                                    className="flex h-10 w-10 items-center justify-center rounded-lg"
                                                    style={{ backgroundColor: `${color}15` }}
                                                >
                                                    <Icon
                                                        className="h-5 w-5"
                                                        style={{ color }}
                                                        weight="fill"
                                                    />
                                                </div>
                                                <span className="text-sm font-medium text-zinc-300">
                                                    {label}
                                                </span>
                                            </button>
                                        ))}
                                    </div>

                                    {/* Keyboard hints */}
                                    <div className="mt-8 flex justify-center gap-4 text-xs text-zinc-600">
                                        <span className="flex items-center gap-1">
                                            <kbd className="rounded bg-white/5 px-1.5 py-0.5 font-mono">
                                                Cmd+K
                                            </kbd>
                                            Omnibar
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <kbd className="rounded bg-white/5 px-1.5 py-0.5 font-mono">
                                                Cmd+1-3
                                            </kbd>
                                            Switch views
                                        </span>
                                    </div>
                                </motion.div>
                            </div>
                        )}

                        {activeView === 'council' && (
                            <div className="h-full p-6">
                                <CouncilChat className="mx-auto h-full max-w-3xl" />
                            </div>
                        )}

                        {activeView === 'memory' && (
                            <div className="h-full p-6">
                                <MemoryGraph className="h-full" />
                            </div>
                        )}
                    </main>

                    {/* Memory Panel (Right Sidebar) - Only in chat/council view */}
                    {(activeView === 'chat' || activeView === 'council') && !memoryCollapsed && (
                        <motion.aside
                            initial={{ width: 0, opacity: 0 }}
                            animate={{ width: 320, opacity: 1 }}
                            exit={{ width: 0, opacity: 0 }}
                            className="border-l border-white/5 bg-zinc-900/30"
                        >
                            <div className="flex h-full flex-col">
                                <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        <Brain className="h-4 w-4 text-pink-400" weight="fill" />
                                        <span className="text-sm font-medium text-zinc-300">
                                            Memory
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => setMemoryCollapsed(true)}
                                        className="text-xs text-zinc-500 hover:text-zinc-300"
                                    >
                                        Hide
                                    </button>
                                </div>
                                <div className="flex-1 overflow-hidden p-2">
                                    <MemoryGraph height={500} />
                                </div>
                            </div>
                        </motion.aside>
                    )}
                </div>

                {/* Bottom Bar */}
                <footer className="flex items-center justify-between border-t border-white/5 bg-zinc-900/50 px-6 py-2">
                    <div className="flex items-center gap-4">
                        <EngineIndicator />
                        <span className="text-xs text-zinc-600">|</span>
                        <WelcomeGuideTrigger className="text-xs" />
                    </div>
                    <div className="flex items-center gap-2 text-xs text-zinc-600">
                        <Sparkle className="h-3 w-3" weight="fill" />
                        <span>Yula OS v1.0</span>
                    </div>
                </footer>
            </div>
        </div>
    );
}

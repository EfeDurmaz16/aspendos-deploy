'use client';

import { useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MagnifyingGlass, Command, X, Sparkle } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useOmnibar } from './use-omnibar';
import { OmnibarResults } from './omnibar-results';
import { OmnibarActions } from './omnibar-actions';

export function Omnibar() {
    const inputRef = useRef<HTMLInputElement>(null);
    const {
        isOpen,
        query,
        results,
        selectedIndex,
        isLoading,
        close,
        search,
        navigateResults,
        executeSelected,
        executeAction,
    } = useOmnibar();

    // Focus input when opening
    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    // Handle keyboard navigation
    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    navigateResults('down');
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    navigateResults('up');
                    break;
                case 'Enter':
                    e.preventDefault();
                    executeSelected();
                    break;
                case 'Escape':
                    e.preventDefault();
                    close();
                    break;
            }
        },
        [navigateResults, executeSelected, close]
    );

    const handleQuickAction = useCallback(
        (actionId: string) => {
            // Map quick actions to routes or behaviors
            const actionRoutes: Record<string, string> = {
                'plan-weekend': '/chat?prompt=Plan+my+weekend',
                'smart-paste': '/chat?mode=paste',
                'quick-task': '/chat?mode=speed',
                council: '/chat?mode=council',
            };

            const route = actionRoutes[actionId];
            if (route) {
                window.location.href = route;
            }
            close();
        },
        [close]
    );

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
                        onClick={close}
                    />

                    {/* Omnibar Container */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -20 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="fixed left-1/2 top-[15%] z-50 w-full max-w-2xl -translate-x-1/2"
                    >
                        <div
                            className={cn(
                                'overflow-hidden rounded-2xl',
                                'border border-white/10 bg-zinc-900/95 backdrop-blur-xl',
                                'shadow-2xl shadow-black/50',
                                'ring-1 ring-white/5'
                            )}
                        >
                            {/* Search Input */}
                            <div className="relative flex items-center border-b border-white/5 px-4">
                                <div className="flex h-5 w-5 items-center justify-center">
                                    {isLoading ? (
                                        <motion.div
                                            animate={{ rotate: 360 }}
                                            transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                                        >
                                            <Sparkle className="h-4 w-4 text-violet-400" weight="fill" />
                                        </motion.div>
                                    ) : (
                                        <MagnifyingGlass className="h-4 w-4 text-zinc-500" />
                                    )}
                                </div>
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={query}
                                    onChange={(e) => search(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Search or type a command..."
                                    className={cn(
                                        'flex-1 bg-transparent px-3 py-4 text-base text-white',
                                        'placeholder:text-zinc-500 focus:outline-none'
                                    )}
                                    autoComplete="off"
                                    autoCorrect="off"
                                    spellCheck={false}
                                />
                                <div className="flex items-center gap-2">
                                    <kbd className="hidden items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-zinc-400 sm:flex">
                                        <Command className="h-3 w-3" />
                                        <span>K</span>
                                    </kbd>
                                    <button
                                        onClick={close}
                                        className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-white/5 hover:text-zinc-300"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="max-h-[60vh] overflow-y-auto p-3">
                                {query.trim() === '' ? (
                                    <div className="space-y-4">
                                        {/* Quick Actions */}
                                        <OmnibarActions onAction={handleQuickAction} />

                                        {/* Divider */}
                                        <div className="flex items-center gap-3 py-1">
                                            <div className="h-px flex-1 bg-white/5" />
                                            <span className="text-[10px] uppercase tracking-wider text-zinc-600">
                                                or search
                                            </span>
                                            <div className="h-px flex-1 bg-white/5" />
                                        </div>

                                        {/* Recent/Suggestions */}
                                        <OmnibarResults
                                            results={results}
                                            selectedIndex={selectedIndex}
                                            onSelect={executeAction}
                                            onHover={() => {
                                                // Update selected index on hover
                                            }}
                                        />
                                    </div>
                                ) : (
                                    <OmnibarResults
                                        results={results}
                                        selectedIndex={selectedIndex}
                                        onSelect={executeAction}
                                        onHover={() => {
                                            // Update selected index on hover
                                        }}
                                    />
                                )}
                            </div>

                            {/* Footer */}
                            <div className="flex items-center justify-between border-t border-white/5 px-4 py-2">
                                <div className="flex items-center gap-3 text-xs text-zinc-500">
                                    <span className="flex items-center gap-1">
                                        <kbd className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[10px]">
                                            ↑↓
                                        </kbd>
                                        Navigate
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <kbd className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[10px]">
                                            ↵
                                        </kbd>
                                        Select
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <kbd className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[10px]">
                                            esc
                                        </kbd>
                                        Close
                                    </span>
                                </div>
                                <div className="flex items-center gap-1 text-xs text-zinc-600">
                                    <Sparkle className="h-3 w-3" weight="fill" />
                                    <span>Yula OS</span>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

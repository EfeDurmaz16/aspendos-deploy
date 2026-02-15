'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Bell, Check, Clock, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { usePAC } from '@/components/pac-timeline/use-pac';
import { cn } from '@/lib/utils';

/**
 * PAC Toast Wrapper for Chat Pages
 * Shows pending/urgent PAC reminders as floating toasts in the bottom-right.
 * Uses the usePAC hook which polls every 30s for new reminders.
 */
export function PACToastWrapper() {
    const router = useRouter();
    const { pendingItems, urgentItems, approve, dismiss, snoozeFor, getRelativeTime } = usePAC();
    const [dismissedLocally, setDismissedLocally] = useState<Set<string>>(new Set());

    // Show at most 2 toasts, preferring urgent items
    const visibleItems = [...urgentItems, ...pendingItems.filter((i) => !urgentItems.includes(i))]
        .filter((item) => !dismissedLocally.has(item.id))
        .slice(0, 2);

    if (visibleItems.length === 0) return null;

    return (
        <div className="fixed bottom-20 right-4 z-50 flex flex-col gap-2 max-w-sm">
            <AnimatePresence mode="popLayout">
                {visibleItems.map((item) => {
                    const isOverdue = item.scheduledFor && new Date(item.scheduledFor) < new Date();

                    return (
                        <motion.div
                            key={item.id}
                            initial={{ opacity: 0, y: 50, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, x: 20, scale: 0.95 }}
                            className={cn(
                                'rounded-xl border bg-background p-4 shadow-lg',
                                isOverdue
                                    ? 'border-red-500/30'
                                    : 'border-amber-500/30'
                            )}
                        >
                            <div className="flex items-start gap-3">
                                <div
                                    className={cn(
                                        'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                                        isOverdue
                                            ? 'bg-red-500/10'
                                            : 'bg-amber-500/10'
                                    )}
                                >
                                    <Bell
                                        className={cn(
                                            'w-4 h-4',
                                            isOverdue ? 'text-red-500' : 'text-amber-500'
                                        )}
                                    />
                                </div>

                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-foreground line-clamp-2">
                                        {item.title}
                                    </p>
                                    {item.scheduledFor && (
                                        <p className={cn(
                                            'text-xs mt-0.5 flex items-center gap-1',
                                            isOverdue ? 'text-red-500' : 'text-muted-foreground'
                                        )}>
                                            <Clock className="w-3 h-3" />
                                            {getRelativeTime(item.scheduledFor)}
                                        </p>
                                    )}
                                </div>

                                <button
                                    onClick={() => {
                                        dismiss(item.id);
                                        setDismissedLocally((prev) => new Set([...prev, item.id]));
                                    }}
                                    className="p-1 rounded text-muted-foreground hover:text-foreground"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="mt-3 flex items-center gap-2">
                                <Button
                                    variant="default"
                                    size="sm"
                                    onClick={() => {
                                        approve(item.id);
                                        setDismissedLocally((prev) => new Set([...prev, item.id]));
                                    }}
                                    className="flex-1 h-7 text-xs"
                                >
                                    <Check className="w-3 h-3 mr-1" />
                                    Done
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        snoozeFor(item.id, 60);
                                        setDismissedLocally((prev) => new Set([...prev, item.id]));
                                    }}
                                    className="h-7 text-xs"
                                >
                                    1h
                                </Button>
                            </div>
                        </motion.div>
                    );
                })}
            </AnimatePresence>
        </div>
    );
}

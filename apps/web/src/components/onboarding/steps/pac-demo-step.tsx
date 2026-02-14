'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Bell, Calendar, Lightbulb, MessageCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

// Feature accent color: Electric Amber
const ACCENT_COLOR = '#D97706';

interface PacDemoStepProps {
    onNext: () => void;
    onPrev: () => void;
    onSkip: () => void;
}

// Demo notifications that will cycle
const DEMO_NOTIFICATIONS = [
    {
        icon: <MessageCircle className="h-4 w-4" />,
        title: 'Remember your meeting prep?',
        message: 'You mentioned preparing for the Q4 review. Want me to help draft talking points?',
        time: '2 hours ago',
    },
    {
        icon: <Calendar className="h-4 w-4" />,
        title: "Mom's birthday is tomorrow!",
        message: 'You mentioned wanting to order flowers. Should I help you find local florists?',
        time: '1 day ahead',
    },
    {
        icon: <Lightbulb className="h-4 w-4" />,
        title: 'Follow up on your project',
        message: 'You were debugging the auth issue. Did you manage to fix the token refresh?',
        time: 'This morning',
    },
];

export function PacDemoStep({ onNext, onPrev, onSkip }: PacDemoStepProps) {
    const [activeNotification, setActiveNotification] = useState(0);

    // Cycle through notifications
    useEffect(() => {
        const interval = setInterval(() => {
            setActiveNotification((prev) => (prev + 1) % DEMO_NOTIFICATIONS.length);
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    return (
        <motion.div
            className="flex flex-col items-center"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
        >
            {/* Header with accent */}
            <div
                className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl relative"
                style={{ backgroundColor: `${ACCENT_COLOR}20` }}
            >
                <Bell className="h-8 w-8" style={{ color: ACCENT_COLOR }} />
                {/* Notification badge */}
                <motion.div
                    className="absolute -top-1 -right-1 h-4 w-4 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                    style={{ backgroundColor: ACCENT_COLOR }}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.3, type: 'spring' }}
                >
                    3
                </motion.div>
            </div>

            <h2 className="mb-2 text-2xl font-bold text-white">Proactive AI Callbacks</h2>
            <p className="mb-6 text-center text-sm text-zinc-400 max-w-sm">
                Yula doesn't wait for you to ask. It remembers your commitments and reaches out when
                it matters.
            </p>

            {/* Demo notification card */}
            <div className="mb-6 w-full max-w-md">
                <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
                    {/* Phone mockup header */}
                    <div
                        className="flex items-center justify-between px-4 py-2"
                        style={{ backgroundColor: `${ACCENT_COLOR}10` }}
                    >
                        <span className="text-xs text-zinc-400">Yula Notification</span>
                        <div className="flex gap-1">
                            {DEMO_NOTIFICATIONS.map((_, i) => (
                                <div
                                    key={i}
                                    className={cn(
                                        'h-1.5 w-1.5 rounded-full transition-colors',
                                        i === activeNotification ? 'bg-amber-500' : 'bg-white/20'
                                    )}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Notification content */}
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeNotification}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                            className="p-4"
                        >
                            <NotificationCard
                                notification={DEMO_NOTIFICATIONS[activeNotification]}
                            />
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>

            {/* How it works */}
            <div className="mb-6 w-full max-w-md">
                <div className="flex items-start gap-3">
                    <StepIndicator number={1} color={ACCENT_COLOR} />
                    <div>
                        <div className="text-sm font-medium text-white">
                            You mention a commitment
                        </div>
                        <div className="text-xs text-zinc-500">"I need to call mom tomorrow"</div>
                    </div>
                </div>
                <div className="ml-4 h-6 border-l border-dashed border-white/10" />
                <div className="flex items-start gap-3">
                    <StepIndicator number={2} color={ACCENT_COLOR} />
                    <div>
                        <div className="text-sm font-medium text-white">Yula remembers</div>
                        <div className="text-xs text-zinc-500">
                            Stores the intent and schedules follow-up
                        </div>
                    </div>
                </div>
                <div className="ml-4 h-6 border-l border-dashed border-white/10" />
                <div className="flex items-start gap-3">
                    <StepIndicator number={3} color={ACCENT_COLOR} />
                    <div>
                        <div className="text-sm font-medium text-white">You get a nudge</div>
                        <div className="text-xs text-zinc-500">
                            At the right time, Yula checks in
                        </div>
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="flex w-full max-w-md items-center justify-between">
                <button
                    onClick={onSkip}
                    className="text-sm text-zinc-500 transition-colors hover:text-zinc-300"
                >
                    Skip tour
                </button>
                <div className="flex gap-2">
                    <button
                        onClick={onPrev}
                        className={cn(
                            'rounded-lg px-4 py-2 text-sm font-medium',
                            'border border-white/10 text-white',
                            'transition-colors hover:bg-white/5'
                        )}
                    >
                        Back
                    </button>
                    <button
                        onClick={onNext}
                        className={cn(
                            'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium',
                            'text-white transition-colors hover:opacity-90'
                        )}
                        style={{ backgroundColor: ACCENT_COLOR }}
                    >
                        Next
                        <ArrowRight className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </motion.div>
    );
}

function NotificationCard({ notification }: { notification: (typeof DEMO_NOTIFICATIONS)[number] }) {
    return (
        <div className="flex gap-3">
            <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                style={{ backgroundColor: `${ACCENT_COLOR}20`, color: ACCENT_COLOR }}
            >
                {notification.icon}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                    <div className="text-sm font-medium text-white">{notification.title}</div>
                    <div className="text-xs text-zinc-500 shrink-0">{notification.time}</div>
                </div>
                <div className="mt-1 text-xs text-zinc-400 line-clamp-2">
                    {notification.message}
                </div>
                <div className="mt-2 flex gap-2">
                    <button
                        className="rounded-md px-3 py-1 text-xs font-medium text-white"
                        style={{ backgroundColor: ACCENT_COLOR }}
                    >
                        Reply
                    </button>
                    <button className="rounded-md px-3 py-1 text-xs text-zinc-400 bg-white/5">
                        Snooze
                    </button>
                </div>
            </div>
        </div>
    );
}

function StepIndicator({ number, color }: { number: number; color: string }) {
    return (
        <div
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
            style={{ backgroundColor: color }}
        >
            {number}
        </div>
    );
}

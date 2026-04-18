'use client';

import {
    ArrowRight,
    ChatCircle,
    CheckCircle,
    CircleNotch,
    CreditCard,
    Gear,
    Lightning,
    Microphone,
    User,
    WarningCircle,
} from '@phosphor-icons/react';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { useUser } from '@/hooks/use-auth';

interface BillingData {
    plan: string;
    status: string;
    usage: {
        tokens: {
            used: number;
            limit: number;
            percent: number;
            formatted: { used: string; limit: string };
        };
        chats: { remaining: number; percent: number };
        voice: { remaining: number };
    };
    renewal: {
        date: string;
        daysRemaining: number;
    };
}

function UsageBar({
    label,
    percent,
    usedLabel,
    icon,
}: {
    label: string;
    percent: number;
    usedLabel: string;
    icon?: React.ReactNode;
}) {
    const isHigh = percent > 80;
    const isMedium = percent > 60 && percent <= 80;

    return (
        <div className="space-y-3 p-4 rounded-xl bg-white/50 dark:bg-zinc-900/50 backdrop-blur border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                    {icon && <div className="text-zinc-600 dark:text-zinc-400">{icon}</div>}
                    <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                        {label}
                    </span>
                </div>
                <span className="text-sm font-mono text-zinc-900 dark:text-zinc-50 font-semibold">
                    {usedLabel}
                </span>
            </div>
            <div className="h-3 bg-zinc-200/60 dark:bg-zinc-800/60 rounded-full overflow-hidden backdrop-blur">
                <div
                    className={`h-full rounded-full transition-all duration-500 ${
                        isHigh
                            ? 'bg-gradient-to-r from-foreground/60 to-foreground/50 shadow-lg shadow-foreground/20'
                            : isMedium
                              ? 'bg-gradient-to-r from-foreground/50 to-foreground/40 shadow-lg shadow-foreground/15'
                              : 'bg-gradient-to-r from-foreground to-foreground/90 shadow-lg shadow-foreground/20'
                    }`}
                    style={{ width: `${Math.min(percent, 100)}%` }}
                />
            </div>
            {isHigh && (
                <p className="text-xs text-muted-foreground dark:text-muted-foreground flex items-center gap-1">
                    <WarningCircle weight="fill" className="w-3.5 h-3.5" />
                    Approaching limit
                </p>
            )}
        </div>
    );
}

function BillingContent() {
    const { user, isLoaded } = useUser();
    const searchParams = useSearchParams();
    const success = searchParams.get('success');

    const [billing, setBilling] = useState<BillingData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [portalLoading, setPortalLoading] = useState(false);
    const [portalError, setPortalError] = useState<string | null>(null);

    async function openStripePortal() {
        setPortalLoading(true);
        setPortalError(null);
        try {
            const res = await fetch('/api/billing/portal', { method: 'POST' });
            const data = await res.json();
            if (!res.ok || !data?.url) {
                throw new Error(data?.error || 'Unable to open billing portal');
            }
            window.location.href = data.url;
        } catch (err) {
            setPortalError(err instanceof Error ? err.message : 'Something went wrong');
            setPortalLoading(false);
        }
    }

    useEffect(() => {
        if (isLoaded && user) {
            fetch('/api/billing')
                .then((res) => {
                    if (!res.ok) throw new Error('Failed to load billing');
                    return res.json();
                })
                .then((data) => {
                    setBilling(data);
                    setLoading(false);
                })
                .catch((err) => {
                    setError(err.message);
                    setLoading(false);
                });
        }
    }, [isLoaded, user]);

    if (!isLoaded || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white dark:bg-zinc-950">
                <div className="text-center">
                    <CircleNotch
                        className="w-8 h-8 animate-spin text-zinc-400 mx-auto mb-3"
                        weight="bold"
                    />
                    <p className="text-sm text-zinc-500">Loading billing...</p>
                </div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white dark:bg-zinc-950">
                <div className="text-center p-8 bg-white/60 dark:bg-zinc-900/60 backdrop-blur rounded-2xl border border-zinc-200 dark:border-zinc-800">
                    <User className="w-12 h-12 text-zinc-400 mx-auto mb-4" weight="duotone" />
                    <p className="text-zinc-600 dark:text-zinc-400 mb-4">
                        Please sign in to view billing.
                    </p>
                    <a
                        href="/login"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-br from-foreground to-foreground/90 hover:from-foreground/90 hover:to-foreground/80 text-background rounded-xl font-semibold shadow-md hover:shadow-lg transition-all"
                    >
                        Sign In
                        <ArrowRight weight="bold" />
                    </a>
                </div>
            </div>
        );
    }

    if (error || !billing) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white dark:bg-zinc-950">
                <div className="text-center p-8 bg-white/60 dark:bg-zinc-900/60 backdrop-blur rounded-2xl border border-zinc-200 dark:border-zinc-800 max-w-md">
                    <WarningCircle
                        className="w-12 h-12 text-muted-foreground mx-auto mb-4"
                        weight="duotone"
                    />
                    <p className="text-zinc-700 dark:text-zinc-300 mb-6 font-medium">
                        {error || 'Unable to load billing information'}
                    </p>
                    <a
                        href="/pricing"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-900 dark:bg-zinc-50 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 rounded-xl font-semibold shadow-md hover:shadow-lg transition-all"
                    >
                        View pricing plans
                        <ArrowRight weight="bold" />
                    </a>
                </div>
            </div>
        );
    }

    const planDisplayName = billing.plan.charAt(0).toUpperCase() + billing.plan.slice(1);
    const renewalDate = new Date(billing.renewal.date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });

    return (
        <div className="min-h-screen bg-white dark:bg-zinc-950 py-12 px-4 relative overflow-hidden">
            {/* YULA Monolith Background - Amber glow only */}
            <div className="absolute inset-0 pointer-events-none -z-10">
                <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-gradient-to-br from-zinc-200/15 to-transparent dark:from-zinc-800/10 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 left-1/4 w-[500px] h-[500px] bg-gradient-to-bl from-zinc-200/10 to-transparent dark:from-zinc-800/10 rounded-full blur-3xl" />
                <div className="absolute top-1/2 right-1/3 w-[400px] h-[400px] bg-gradient-to-tr from-zinc-100/8 to-transparent dark:from-zinc-700/8 rounded-full blur-3xl" />
            </div>

            <div className="max-w-4xl mx-auto space-y-8 relative z-10">
                {/* Success message */}
                {success && (
                    <div className="p-5 bg-muted dark:bg-muted/20 border border-border dark:border-border rounded-2xl backdrop-blur animate-fade-up flex items-start gap-3">
                        <CheckCircle
                            className="w-6 h-6 text-foreground dark:text-foreground/80 flex-shrink-0 mt-0.5"
                            weight="fill"
                        />
                        <div>
                            <p className="text-foreground dark:text-foreground font-semibold mb-1">
                                Payment successful!
                            </p>
                            <p className="text-sm text-foreground/80 dark:text-foreground/70">
                                Your subscription is now active and ready to use.
                            </p>
                        </div>
                    </div>
                )}

                {/* Header */}
                <div className="animate-fade-up">
                    <h1
                        className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-3"
                        style={{ textWrap: 'balance' as any }}
                    >
                        Billing & Usage
                    </h1>
                    <p className="text-lg text-zinc-600 dark:text-zinc-400">
                        Manage your subscription and track your usage
                    </p>
                </div>

                {/* Plan Overview */}
                <div className="bg-white/60 dark:bg-zinc-900/60 backdrop-blur rounded-2xl border border-zinc-200 dark:border-zinc-800 p-8 shadow-lg animate-fade-up animation-delay-100">
                    <div className="flex items-start justify-between mb-6">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <CreditCard className="w-5 h-5 text-zinc-500" weight="duotone" />
                                <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400 uppercase tracking-wide">
                                    Current Plan
                                </p>
                            </div>
                            <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
                                {planDisplayName}
                            </p>
                            <p className="text-sm text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5">
                                <Lightning className="w-4 h-4" weight="fill" />
                                Renews on {renewalDate}
                                <span className="text-zinc-500">•</span>
                                {billing.renewal.daysRemaining} days remaining
                            </p>
                        </div>
                        <span
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold shadow-sm ${
                                billing.status === 'active'
                                    ? 'bg-muted dark:bg-muted/30 text-foreground dark:text-foreground/80 ring-1 ring-border dark:ring-border'
                                    : billing.status === 'past_due'
                                      ? 'bg-muted dark:bg-muted/30 text-foreground/70 dark:text-foreground/60 ring-1 ring-border dark:ring-border'
                                      : 'bg-muted dark:bg-muted/30 text-foreground/60 dark:text-foreground/50 ring-1 ring-border dark:ring-border'
                            }`}
                        >
                            <CheckCircle className="w-4 h-4" weight="fill" />
                            {billing.status.charAt(0).toUpperCase() +
                                billing.status.slice(1).replace('_', ' ')}
                        </span>
                    </div>
                    <div className="flex gap-3">
                        <a
                            href="/pricing"
                            className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 font-semibold hover:bg-zinc-50 dark:hover:bg-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600 transition-all shadow-sm hover:shadow"
                        >
                            Change Plan
                        </a>
                        <button
                            type="button"
                            onClick={openStripePortal}
                            disabled={portalLoading}
                            className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-br from-foreground to-foreground/90 hover:from-foreground/90 hover:to-foreground/80 text-background font-semibold shadow-md hover:shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {portalLoading ? (
                                <>
                                    <CircleNotch className="w-4 h-4 animate-spin" weight="bold" />
                                    Opening...
                                </>
                            ) : (
                                <>
                                    Manage Subscription
                                    <ArrowRight weight="bold" />
                                </>
                            )}
                        </button>
                    </div>
                    {portalError && (
                        <p className="mt-3 text-sm text-red-500" role="alert">
                            {portalError}
                        </p>
                    )}
                </div>

                {/* Usage Stats */}
                <div className="bg-white/60 dark:bg-zinc-900/60 backdrop-blur rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-lg animate-fade-up animation-delay-200">
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-6">
                        Usage This Period
                    </h2>
                    <div className="space-y-4">
                        <UsageBar
                            label="Tokens"
                            percent={billing.usage.tokens.percent}
                            usedLabel={`${billing.usage.tokens.formatted.used} / ${billing.usage.tokens.formatted.limit} tokens`}
                            icon={<Lightning className="w-4 h-4" weight="duotone" />}
                        />
                        <UsageBar
                            label="Chats"
                            percent={100 - billing.usage.chats.percent}
                            usedLabel={`${billing.usage.chats.remaining} chats remaining`}
                            icon={<ChatCircle className="w-4 h-4" weight="duotone" />}
                        />
                        <UsageBar
                            label="Voice"
                            percent={100 - (billing.usage.voice.remaining / 300) * 100}
                            usedLabel={`${billing.usage.voice.remaining} min remaining`}
                            icon={<Microphone className="w-4 h-4" weight="duotone" />}
                        />
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="grid md:grid-cols-2 gap-4 animate-fade-up animation-delay-300">
                    <a
                        href="/chat"
                        className="group block p-6 bg-white/50 dark:bg-zinc-900/50 backdrop-blur rounded-2xl border border-zinc-200 dark:border-zinc-800 hover:bg-white/70 dark:hover:bg-zinc-900/70 hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-lg transition-all"
                    >
                        <div className="flex items-start gap-3">
                            <div className="p-3 rounded-xl bg-muted dark:bg-muted/30 group-hover:bg-muted/80 dark:group-hover:bg-muted/50 transition-colors">
                                <ChatCircle
                                    className="w-5 h-5 text-foreground dark:text-foreground/80"
                                    weight="duotone"
                                />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-semibold text-zinc-900 dark:text-zinc-50 mb-1">
                                    Start Chatting
                                </h3>
                                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                                    Continue where you left off
                                </p>
                            </div>
                        </div>
                    </a>
                    <a
                        href="/settings"
                        className="group block p-6 bg-white/50 dark:bg-zinc-900/50 backdrop-blur rounded-2xl border border-zinc-200 dark:border-zinc-800 hover:bg-white/70 dark:hover:bg-zinc-900/70 hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-lg transition-all"
                    >
                        <div className="flex items-start gap-3">
                            <div className="p-3 rounded-xl bg-muted dark:bg-muted/30 group-hover:bg-muted/80 dark:group-hover:bg-muted/50 transition-colors">
                                <Gear
                                    className="w-5 h-5 text-foreground dark:text-foreground/80"
                                    weight="duotone"
                                />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-semibold text-zinc-900 dark:text-zinc-50 mb-1">
                                    Account Settings
                                </h3>
                                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                                    Manage your profile and preferences
                                </p>
                            </div>
                        </div>
                    </a>
                </div>
            </div>
        </div>
    );
}

export default function BillingPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
                    Loading...
                </div>
            }
        >
            <BillingContent />
        </Suspense>
    );
}

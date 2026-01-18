'use client';

import { ArrowLeft, CheckCircle, Sparkle, TrendUp, Lightning } from '@phosphor-icons/react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { ModeToggle } from '@/components/mode-toggle';
import { Button } from '@/components/ui/button';
import { useUser } from '@/hooks/use-auth';
import { checkout } from '@/lib/auth-client';

type BillingPeriod = 'weekly' | 'monthly' | 'annual';

const PRICING_DATA = {
    Starter: { weekly: 7, monthly: 20, annual: 200 },
    Pro: { weekly: 15, monthly: 50, annual: 500 },
    Ultra: { weekly: 30, monthly: 100, annual: 1000 },
};

const PRICING_TIERS = [
    {
        name: 'Starter',
        description: 'For trying Aspendos and exploring AI',
        features: [
            '~300 chats/month (~10/day)',
            'GPT-5 Nano + 1 main model',
            '10 min voice/day',
            'Basic memory across chats',
            'Email support',
        ],
        limits: {
            chats: 300,
            voiceMinutes: 10,
            models: 1,
        },
        cta: 'Get Started',
        slug: 'starter',
        popular: false,
    },
    {
        name: 'Pro',
        description: 'Your daily AI operating system',
        features: [
            '~1,500 chats/month (~50/day)',
            'All models: GPT-5, Claude, Gemini',
            '60 min voice/day',
            'Advanced memory + search',
            'Multi-model comparison (2 at once)',
            'Priority routing',
            'Email + chat support',
        ],
        limits: {
            chats: 1500,
            voiceMinutes: 60,
            models: 4,
        },
        cta: 'Upgrade to Pro',
        slug: 'pro',
        popular: true,
    },
    {
        name: 'Ultra',
        description: 'For power users and teams',
        features: [
            '5,000+ chats/month',
            'All models + experimental',
            '180 min voice/day',
            'Full Memory Inspector',
            'Multi-model parallel (4 at once)',
            'Highest priority + performance',
            'Priority support',
        ],
        limits: {
            chats: 5000,
            voiceMinutes: 180,
            models: 10,
        },
        cta: 'Go Ultra',
        slug: 'ultra',
        popular: false,
    },
];

// Mock usage data - in production would come from API
const MOCK_USAGE = {
    chatsThisMonth: 245,
    voiceMinutesThisMonth: 35,
    storageUsed: 2.4,
    forecastedChatsEOM: 320,
};

function UsageBar({ current, limit, label }: { current: number; limit: number; label: string }) {
    const percentage = Math.min((current / limit) * 100, 100);
    const isWarning = percentage > 75;
    return (
        <div className="space-y-1.5">
            <div className="flex justify-between items-center">
                <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">{label}</span>
                <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-50">
                    {current} / {limit}
                </span>
            </div>
            <div className="h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div
                    className={`h-full transition-all rounded-full ${
                        isWarning ? 'bg-orange-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${percentage}%` }}
                />
            </div>
        </div>
    );
}

function PricingContent() {
    const searchParams = useSearchParams();
    const { isSignedIn } = useUser();
    const success = searchParams.get('success');
    const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('monthly');
    const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

    const handleCheckout = async (slug: string) => {
        setCheckoutLoading(slug);
        try {
            await checkout({ slug });
        } catch (error) {
            console.error('Checkout error:', error);
            setCheckoutLoading(null);
        }
    };

    const getPrice = (tierName: string) =>
        PRICING_DATA[tierName as keyof typeof PRICING_DATA][billingPeriod];
    const getPeriodLabel = () =>
        billingPeriod === 'weekly' ? 'week' : billingPeriod === 'monthly' ? 'month' : 'year';
    const getAnnualSavings = (tierName: string) => {
        const tier = PRICING_DATA[tierName as keyof typeof PRICING_DATA];
        return tier.monthly * 12 - tier.annual;
    };

    return (
        <div className="min-h-screen bg-background gradient-mesh">
            {/* Header */}
            <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
                <div className="container max-w-7xl mx-auto flex h-16 items-center justify-between px-6 lg:px-8">
                    <Link
                        href="/"
                        className="flex items-center gap-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span className="font-serif text-xl font-semibold tracking-tight text-zinc-900 dark:text-white">
                            ASPENDOS
                        </span>
                    </Link>
                    <nav className="flex gap-4 items-center">
                        <ModeToggle />
                        {isSignedIn ? (
                            <Button size="sm" className="rounded-full" asChild>
                                <Link href="/chat">Go to Chat</Link>
                            </Button>
                        ) : (
                            <Button size="sm" className="rounded-full" asChild>
                                <Link href="/login">Log in</Link>
                            </Button>
                        )}
                    </nav>
                </div>
            </header>

            <div className="max-w-6xl mx-auto py-16 px-6">
                {/* Success message */}
                {success && (
                    <div className="mb-8 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl text-center animate-fade-up">
                        <p className="text-emerald-800 dark:text-emerald-200 font-medium flex items-center justify-center gap-2">
                            <Sparkle className="w-5 h-5" weight="fill" />
                            Payment successful! Your subscription is now active.
                        </p>
                    </div>
                )}

                {/* Usage dashboard for signed-in users */}
                {isSignedIn && (
                    <div className="mb-12 p-6 bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 animate-fade-up opacity-0 animation-delay-50">
                        <div className="flex items-start justify-between mb-6">
                            <div>
                                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                                    <TrendUp className="w-5 h-5 text-emerald-500" weight="fill" />
                                    Your Usage This Month
                                </h3>
                                <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                                    Forecasted to reach {MOCK_USAGE.forecastedChatsEOM} chats by end of month
                                </p>
                            </div>
                            <Link
                                href="/dashboard/usage"
                                className="text-sm font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 underline underline-offset-2"
                            >
                                View details →
                            </Link>
                        </div>
                        <div className="grid md:grid-cols-2 gap-6">
                            <UsageBar
                                current={MOCK_USAGE.chatsThisMonth}
                                limit={1500}
                                label="Chats This Month"
                            />
                            <UsageBar
                                current={MOCK_USAGE.voiceMinutesThisMonth}
                                limit={60}
                                label="Voice Minutes This Month"
                            />
                        </div>
                    </div>
                )}

                {/* Header */}
                <div className="text-center mb-12 animate-fade-up opacity-0">
                    <h1 className="font-serif text-4xl md:text-5xl font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
                        Simple, transparent pricing
                    </h1>
                    <p className="text-zinc-600 dark:text-zinc-400 text-lg max-w-2xl mx-auto">
                        Your AI operating system. Choose the plan that fits your workflow.
                    </p>
                </div>

                {/* Billing period toggle */}
                <div className="flex justify-center gap-1 mb-12 animate-fade-up opacity-0 animation-delay-100">
                    <div className="inline-flex p-1 rounded-full glass border border-zinc-200/50 dark:border-zinc-700/50">
                        {(['weekly', 'monthly', 'annual'] as const).map((period) => (
                            <button
                                key={period}
                                onClick={() => setBillingPeriod(period)}
                                className={`px-5 py-2 rounded-full text-sm font-medium transition-all relative ${
                                    billingPeriod === period
                                        ? 'bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 shadow-sm'
                                        : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                                }`}
                            >
                                {period.charAt(0).toUpperCase() + period.slice(1)}
                                {period === 'annual' && (
                                    <span className="absolute -top-2 -right-2 bg-emerald-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                                        -17%
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Pricing cards */}
                <div className="grid md:grid-cols-3 gap-8 animate-fade-up opacity-0 animation-delay-200">
                    {PRICING_TIERS.map((tier, index) => (
                        <div
                            key={tier.name}
                            className={`relative bg-white dark:bg-zinc-900 rounded-2xl border p-8 flex flex-col hover-lift ${
                                tier.popular
                                    ? 'border-zinc-900 dark:border-zinc-50 ring-2 ring-zinc-900/10 dark:ring-zinc-50/10 md:-translate-y-4 shadow-xl glow'
                                    : 'border-zinc-200 dark:border-zinc-800 shadow-sm'
                            }`}
                            style={{ animationDelay: `${(index + 3) * 100}ms` }}
                        >
                            {tier.popular && (
                                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-xs font-medium px-3 py-1 rounded-full flex items-center gap-1">
                                    <Sparkle className="w-3 h-3" weight="fill" /> Most Popular
                                </span>
                            )}

                            <div className="mb-6">
                                <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
                                    {tier.name}
                                </h2>
                                <p className="text-zinc-600 dark:text-zinc-400 text-sm">
                                    {tier.description}
                                </p>
                            </div>

                            <div className="mb-2">
                                <span className="text-4xl font-bold text-zinc-900 dark:text-zinc-50">
                                    ${getPrice(tier.name)}
                                </span>
                                <span className="text-zinc-600 dark:text-zinc-400">
                                    /{getPeriodLabel()}
                                </span>
                            </div>

                            {billingPeriod === 'annual' && (
                                <p className="text-sm text-emerald-600 dark:text-emerald-400 mb-4">
                                    Save ${getAnnualSavings(tier.name)}/year — 2 months free
                                </p>
                            )}
                            {billingPeriod === 'weekly' && (
                                <p className="text-xs text-zinc-500 mb-4">
                                    or $
                                    {PRICING_DATA[tier.name as keyof typeof PRICING_DATA].monthly}
                                    /month (save more)
                                </p>
                            )}
                            {billingPeriod === 'monthly' && <div className="h-6 mb-4" />}

                            <ul className="space-y-3 mb-8 flex-grow">
                                {tier.features.map((feature) => (
                                    <li
                                        key={feature}
                                        className="flex items-start gap-2 text-sm text-zinc-600 dark:text-zinc-400"
                                    >
                                        <CheckCircle
                                            className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5"
                                            weight="fill"
                                        />
                                        {feature}
                                    </li>
                                ))}
                            </ul>

                            {tier.name === 'Starter' ? (
                                <Button
                                    variant={tier.popular ? 'default' : 'outline'}
                                    className="w-full rounded-full"
                                    asChild
                                >
                                    <Link href={isSignedIn ? '/chat' : '/signup'}>{tier.cta}</Link>
                                </Button>
                            ) : isSignedIn ? (
                                <Button
                                    variant={tier.popular ? 'default' : 'outline'}
                                    className="w-full rounded-full"
                                    onClick={() => handleCheckout(tier.slug)}
                                    disabled={checkoutLoading === tier.slug}
                                >
                                    {checkoutLoading === tier.slug ? 'Loading...' : tier.cta}
                                </Button>
                            ) : (
                                <Button
                                    variant={tier.popular ? 'default' : 'outline'}
                                    className="w-full rounded-full"
                                    asChild
                                >
                                    <Link href={`/signup?redirect=pricing&tier=${tier.slug}`}>
                                        {tier.cta}
                                    </Link>
                                </Button>
                            )}
                        </div>
                    ))}
                </div>

                {/* Manage subscription link */}
                {isSignedIn && (
                    <div className="text-center mt-12">
                        <Link
                            href="/portal"
                            className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50 underline underline-offset-4"
                        >
                            Manage your subscription →
                        </Link>
                    </div>
                )}

                {/* Comparison note */}
                <div className="text-center mt-16 max-w-2xl mx-auto mb-16">
                    <p className="text-sm text-zinc-500">
                        Compare: ChatGPT Plus $20/mo (1 model) vs Aspendos Pro $50/mo (all models,
                        memory, voice).
                        <br />
                        Cancel anytime. All prices in USD.
                    </p>
                </div>

                {/* Feature comparison table */}
                <div className="mb-16 animate-fade-up opacity-0 animation-delay-300">
                    <h2 className="text-2xl md:text-3xl font-semibold text-zinc-900 dark:text-zinc-50 mb-8 text-center">
                        Detailed Plan Comparison
                    </h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-zinc-200 dark:border-zinc-700">
                                    <th className="px-4 py-3 text-left font-semibold text-zinc-900 dark:text-zinc-50">
                                        Feature
                                    </th>
                                    {PRICING_TIERS.map((tier) => (
                                        <th
                                            key={tier.name}
                                            className="px-4 py-3 text-center font-semibold text-zinc-900 dark:text-zinc-50"
                                        >
                                            {tier.name}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                <tr className="border-b border-zinc-200 dark:border-zinc-700">
                                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                                        Monthly Chats
                                    </td>
                                    {PRICING_TIERS.map((tier) => (
                                        <td key={tier.name} className="px-4 py-3 text-center font-medium text-zinc-900 dark:text-zinc-50">
                                            {tier.limits.chats.toLocaleString()}
                                        </td>
                                    ))}
                                </tr>
                                <tr className="border-b border-zinc-200 dark:border-zinc-700">
                                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                                        Voice Minutes/Day
                                    </td>
                                    {PRICING_TIERS.map((tier) => (
                                        <td key={tier.name} className="px-4 py-3 text-center font-medium text-zinc-900 dark:text-zinc-50">
                                            {tier.limits.voiceMinutes}
                                        </td>
                                    ))}
                                </tr>
                                <tr className="border-b border-zinc-200 dark:border-zinc-700">
                                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                                        AI Models Available
                                    </td>
                                    {PRICING_TIERS.map((tier) => (
                                        <td key={tier.name} className="px-4 py-3 text-center font-medium text-zinc-900 dark:text-zinc-50">
                                            {tier.limits.models}+ models
                                        </td>
                                    ))}
                                </tr>
                                <tr className="border-b border-zinc-200 dark:border-zinc-700">
                                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                                        Memory & Search
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <CheckCircle className="w-5 h-5 text-emerald-500 mx-auto" weight="fill" />
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <CheckCircle className="w-5 h-5 text-emerald-500 mx-auto" weight="fill" />
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <CheckCircle className="w-5 h-5 text-emerald-500 mx-auto" weight="fill" />
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* FAQ Section */}
                <div className="mb-16 max-w-3xl mx-auto animate-fade-up opacity-0 animation-delay-400">
                    <h2 className="text-2xl md:text-3xl font-semibold text-zinc-900 dark:text-zinc-50 mb-8 text-center">
                        Frequently Asked Questions
                    </h2>
                    <div className="space-y-4">
                        <details className="group p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg cursor-pointer hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
                            <summary className="flex items-center gap-3 font-medium text-zinc-900 dark:text-zinc-50">
                                <Lightning className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                                What happens if I exceed my plan limits?
                            </summary>
                            <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
                                You'll receive notifications at 75%, 90%, and 100% of your monthly limit. Once exceeded, you cannot create new chats until your usage resets on the first of next month. Consider upgrading for more capacity.
                            </p>
                        </details>
                        <details className="group p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg cursor-pointer hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
                            <summary className="flex items-center gap-3 font-medium text-zinc-900 dark:text-zinc-50">
                                <Lightning className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                                Can I change plans anytime?
                            </summary>
                            <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
                                Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately. If you downgrade, your current billing cycle remains unchanged.
                            </p>
                        </details>
                        <details className="group p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg cursor-pointer hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
                            <summary className="flex items-center gap-3 font-medium text-zinc-900 dark:text-zinc-50">
                                <Lightning className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                                What is your refund policy?
                            </summary>
                            <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
                                We do not offer refunds for subscriptions. However, you can cancel anytime and will not be charged for the next billing period.
                            </p>
                        </details>
                        <details className="group p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg cursor-pointer hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
                            <summary className="flex items-center gap-3 font-medium text-zinc-900 dark:text-zinc-50">
                                <Lightning className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                                Do you offer a free trial?
                            </summary>
                            <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
                                Yes! Start with the Starter plan to explore Aspendos free for your first 100 chats. No credit card required.
                            </p>
                        </details>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function PricingPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen flex items-center justify-center">Loading...</div>
            }
        >
            <PricingContent />
        </Suspense>
    );
}

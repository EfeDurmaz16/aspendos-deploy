'use client'

import { useSearchParams } from 'next/navigation'
import { useUser } from '@/hooks/use-auth'
import { Suspense, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { CheckCircle, ArrowLeft, Sparkle } from '@phosphor-icons/react'
import { ModeToggle } from '@/components/mode-toggle'

type BillingPeriod = 'weekly' | 'monthly' | 'annual'

const PRICING_DATA = {
    Starter: { weekly: 7, monthly: 20, annual: 200 },
    Pro: { weekly: 15, monthly: 50, annual: 500 },
    Ultra: { weekly: 30, monthly: 100, annual: 1000 },
}

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
        cta: 'Get Started',
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
        cta: 'Upgrade to Pro',
        productId: process.env.NEXT_PUBLIC_POLAR_PRO_PRODUCT_ID,
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
        cta: 'Go Ultra',
        productId: process.env.NEXT_PUBLIC_POLAR_ULTRA_PRODUCT_ID,
        popular: false,
    },
]

function PricingContent() {
    const searchParams = useSearchParams()
    const { isSignedIn } = useUser()
    const success = searchParams.get('success')
    const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('monthly')

    const getPrice = (tierName: string) => PRICING_DATA[tierName as keyof typeof PRICING_DATA][billingPeriod]
    const getPeriodLabel = () => billingPeriod === 'weekly' ? 'week' : billingPeriod === 'monthly' ? 'month' : 'year'
    const getAnnualSavings = (tierName: string) => {
        const tier = PRICING_DATA[tierName as keyof typeof PRICING_DATA]
        return (tier.monthly * 12) - tier.annual
    }

    return (
        <div className="min-h-screen bg-background gradient-mesh">
            {/* Header */}
            <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
                <div className="container max-w-7xl mx-auto flex h-16 items-center justify-between px-6 lg:px-8">
                    <Link href="/" className="flex items-center gap-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors">
                        <ArrowLeft className="w-4 h-4" />
                        <span className="font-serif text-xl font-semibold tracking-tight text-zinc-900 dark:text-white">ASPENDOS</span>
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
                                className={`px-5 py-2 rounded-full text-sm font-medium transition-all relative ${billingPeriod === period
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
                            className={`relative bg-white dark:bg-zinc-900 rounded-2xl border p-8 flex flex-col hover-lift ${tier.popular
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
                                <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-2">{tier.name}</h2>
                                <p className="text-zinc-600 dark:text-zinc-400 text-sm">{tier.description}</p>
                            </div>

                            <div className="mb-2">
                                <span className="text-4xl font-bold text-zinc-900 dark:text-zinc-50">${getPrice(tier.name)}</span>
                                <span className="text-zinc-600 dark:text-zinc-400">/{getPeriodLabel()}</span>
                            </div>

                            {billingPeriod === 'annual' && (
                                <p className="text-sm text-emerald-600 dark:text-emerald-400 mb-4">Save ${getAnnualSavings(tier.name)}/year — 2 months free</p>
                            )}
                            {billingPeriod === 'weekly' && (
                                <p className="text-xs text-zinc-500 mb-4">or ${PRICING_DATA[tier.name as keyof typeof PRICING_DATA].monthly}/month (save more)</p>
                            )}
                            {billingPeriod === 'monthly' && <div className="h-6 mb-4" />}

                            <ul className="space-y-3 mb-8 flex-grow">
                                {tier.features.map((feature) => (
                                    <li key={feature} className="flex items-start gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                                        <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" weight="fill" />
                                        {feature}
                                    </li>
                                ))}
                            </ul>

                            {tier.name === 'Starter' ? (
                                <Button variant={tier.popular ? 'default' : 'outline'} className="w-full rounded-full" asChild>
                                    <Link href={isSignedIn ? '/chat' : '/signup'}>{tier.cta}</Link>
                                </Button>
                            ) : (
                                <Button variant={tier.popular ? 'default' : 'outline'} className="w-full rounded-full" asChild>
                                    <Link href={`/checkout?productId=${tier.productId}`}>{tier.cta}</Link>
                                </Button>
                            )}
                        </div>
                    ))}
                </div>

                {/* Manage subscription link */}
                {isSignedIn && (
                    <div className="text-center mt-12">
                        <Link href="/portal" className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50 underline underline-offset-4">
                            Manage your subscription →
                        </Link>
                    </div>
                )}

                {/* Comparison note */}
                <div className="text-center mt-16 max-w-2xl mx-auto">
                    <p className="text-sm text-zinc-500">
                        Compare: ChatGPT Plus $20/mo (1 model) vs Aspendos Pro $50/mo (all models, memory, voice).
                        <br />
                        Cancel anytime. All prices in USD.
                    </p>
                </div>
            </div>
        </div>
    )
}

export default function PricingPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
            <PricingContent />
        </Suspense>
    )
}

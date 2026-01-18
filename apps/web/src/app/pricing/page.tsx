'use client'

import { useSearchParams } from 'next/navigation'
import { useUser } from '@/hooks/use-auth'
import { Suspense, useState } from 'react'

// Pricing tiers based on approved strategy
// Monthly: $20 / $50 / $100 (round numbers, premium positioning)
// Weekly: Deliberately more expensive to push monthly
// Annual: 17% discount (~2 months free)

type BillingPeriod = 'weekly' | 'monthly' | 'annual'

const PRICING_DATA = {
    Starter: {
        weekly: 7,
        monthly: 20,
        annual: 200, // $16.67/mo equivalent, save $40
    },
    Pro: {
        weekly: 15,
        monthly: 50,
        annual: 500, // $41.67/mo equivalent, save $100
    },
    Ultra: {
        weekly: 30,
        monthly: 100,
        annual: 1000, // $83.33/mo equivalent, save $200
    },
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

    const getPrice = (tierName: string) => {
        const tier = PRICING_DATA[tierName as keyof typeof PRICING_DATA]
        return tier[billingPeriod]
    }

    const getPeriodLabel = () => {
        switch (billingPeriod) {
            case 'weekly': return 'week'
            case 'monthly': return 'month'
            case 'annual': return 'year'
        }
    }

    const getAnnualSavings = (tierName: string) => {
        const tier = PRICING_DATA[tierName as keyof typeof PRICING_DATA]
        return (tier.monthly * 12) - tier.annual
    }

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 py-16 px-4">
            <div className="max-w-6xl mx-auto">
                {/* Success message */}
                {success && (
                    <div className="mb-8 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-center">
                        <p className="text-green-800 dark:text-green-200 font-medium">
                            🎉 Payment successful! Your subscription is now active.
                        </p>
                    </div>
                )}

                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className="font-serif text-4xl font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
                        Simple, transparent pricing
                    </h1>
                    <p className="text-zinc-600 dark:text-zinc-400 text-lg max-w-2xl mx-auto">
                        Your AI operating system. Choose the plan that fits your workflow.
                    </p>
                </div>

                {/* Billing period toggle */}
                <div className="flex justify-center gap-2 mb-12">
                    <button
                        onClick={() => setBillingPeriod('weekly')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition ${billingPeriod === 'weekly'
                            ? 'bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900'
                            : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800'
                            }`}
                    >
                        Weekly
                    </button>
                    <button
                        onClick={() => setBillingPeriod('monthly')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition ${billingPeriod === 'monthly'
                            ? 'bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900'
                            : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800'
                            }`}
                    >
                        Monthly
                    </button>
                    <button
                        onClick={() => setBillingPeriod('annual')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition relative ${billingPeriod === 'annual'
                            ? 'bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900'
                            : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800'
                            }`}
                    >
                        Annual
                        <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">
                            Save 17%
                        </span>
                    </button>
                </div>

                {/* Pricing cards */}
                <div className="grid md:grid-cols-3 gap-8">
                    {PRICING_TIERS.map((tier) => (
                        <div
                            key={tier.name}
                            className={`relative bg-white dark:bg-zinc-900 rounded-2xl border ${tier.popular
                                ? 'border-zinc-900 dark:border-zinc-50 ring-2 ring-zinc-900 dark:ring-zinc-50'
                                : 'border-zinc-200 dark:border-zinc-800'
                                } p-8 flex flex-col`}
                        >
                            {tier.popular && (
                                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 text-xs font-medium px-3 py-1 rounded-full">
                                    Most Popular
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

                            {/* Show savings for annual */}
                            {billingPeriod === 'annual' && (
                                <p className="text-sm text-green-600 dark:text-green-400 mb-4">
                                    Save ${getAnnualSavings(tier.name)}/year — 2 months free
                                </p>
                            )}

                            {/* Show monthly equivalent for weekly */}
                            {billingPeriod === 'weekly' && (
                                <p className="text-xs text-zinc-500 dark:text-zinc-500 mb-4">
                                    or ${PRICING_DATA[tier.name as keyof typeof PRICING_DATA].monthly}/month (save more)
                                </p>
                            )}

                            {billingPeriod === 'monthly' && <div className="h-6 mb-4" />}

                            <ul className="space-y-3 mb-8 flex-grow">
                                {tier.features.map((feature) => (
                                    <li key={feature} className="flex items-start gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                                        <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        {feature}
                                    </li>
                                ))}
                            </ul>

                            {tier.name === 'Starter' ? (
                                <a
                                    href={isSignedIn ? '/chat' : '/signup'}
                                    className={`block w-full text-center py-3 px-4 rounded-lg font-medium transition ${tier.popular
                                        ? 'bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 hover:opacity-90'
                                        : 'border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-50 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                                        }`}
                                >
                                    {tier.cta}
                                </a>
                            ) : (
                                <a
                                    href={`/checkout?productId=${tier.productId}`}
                                    className={`block w-full text-center py-3 px-4 rounded-lg font-medium transition ${tier.popular
                                        ? 'bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 hover:opacity-90'
                                        : 'border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-50 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                                        }`}
                                >
                                    {tier.cta}
                                </a>
                            )}
                        </div>
                    ))}
                </div>

                {/* Manage subscription link */}
                {isSignedIn && (
                    <div className="text-center mt-12">
                        <a
                            href="/portal"
                            className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50 underline"
                        >
                            Manage your subscription →
                        </a>
                    </div>
                )}

                {/* Comparison note */}
                <div className="text-center mt-16 max-w-2xl mx-auto">
                    <p className="text-sm text-zinc-500 dark:text-zinc-500">
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

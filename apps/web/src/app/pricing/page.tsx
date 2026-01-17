'use client'

import { useSearchParams } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { Suspense } from 'react'

// Pricing tiers from aspendos_tech_spec.md
const PRICING_TIERS = [
    {
        name: 'Starter',
        price: 0,
        period: 'forever',
        description: 'Perfect for trying out Aspendos',
        features: [
            '1M tokens/month (~300 chats)',
            'All models (usage-based)',
            '10 min/day voice',
            '5 images/day',
            'Basic memory',
            'Community support',
        ],
        cta: 'Get Started',
        href: '/signup',
        popular: false,
    },
    {
        name: 'Pro',
        price: 25,
        period: 'month',
        description: 'For power users and professionals',
        features: [
            '10M tokens/month (~3K chats)',
            'Priority model access',
            '60 min/day voice',
            '50 images/day',
            'Advanced memory + graph',
            'API access',
            'Priority support',
        ],
        cta: 'Upgrade to Pro',
        productId: process.env.NEXT_PUBLIC_POLAR_PRO_PRODUCT_ID,
        popular: true,
    },
    {
        name: 'Ultra',
        price: 70,
        period: 'month',
        description: 'For teams and heavy users',
        features: [
            'Unlimited tokens',
            'All models unlimited',
            'Unlimited voice',
            'Unlimited images',
            'Full memory suite',
            'Custom agents',
            'Dedicated support',
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
                        Start for free, upgrade when you need more. No hidden fees.
                    </p>
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

                            <div className="mb-6">
                                <span className="text-4xl font-bold text-zinc-900 dark:text-zinc-50">
                                    ${tier.price}
                                </span>
                                <span className="text-zinc-600 dark:text-zinc-400">
                                    /{tier.period}
                                </span>
                            </div>

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

                            {tier.price === 0 ? (
                                <a
                                    href={tier.href}
                                    className="block w-full text-center py-3 px-4 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-50 font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition"
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

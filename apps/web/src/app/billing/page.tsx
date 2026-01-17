'use client'

import { useUser } from '@clerk/nextjs'
import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'

interface BillingData {
    plan: string
    status: string
    usage: {
        tokens: { used: number; limit: number; percent: number; formatted: { used: string; limit: string } }
        chats: { remaining: number; percent: number }
        voice: { remaining: number }
    }
    renewal: {
        date: string
        daysRemaining: number
    }
}

function UsageBar({ label, percent, usedLabel }: { label: string; percent: number; usedLabel: string }) {
    const isHigh = percent > 80

    return (
        <div className="space-y-2">
            <div className="flex justify-between text-sm">
                <span className="text-zinc-600 dark:text-zinc-400">{label}</span>
                <span className="text-zinc-900 dark:text-zinc-50 font-medium">{usedLabel}</span>
            </div>
            <div className="h-2 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all ${isHigh ? 'bg-amber-500' : 'bg-zinc-900 dark:bg-zinc-50'
                        }`}
                    style={{ width: `${Math.min(percent, 100)}%` }}
                />
            </div>
        </div>
    )
}

function BillingContent() {
    const { user, isLoaded } = useUser()
    const searchParams = useSearchParams()
    const success = searchParams.get('success')

    const [billing, setBilling] = useState<BillingData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (isLoaded && user) {
            fetch('/api/billing')
                .then(res => {
                    if (!res.ok) throw new Error('Failed to load billing')
                    return res.json()
                })
                .then(data => {
                    setBilling(data)
                    setLoading(false)
                })
                .catch(err => {
                    setError(err.message)
                    setLoading(false)
                })
        }
    }, [isLoaded, user])

    if (!isLoaded || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
                <div className="animate-pulse text-zinc-500">Loading billing...</div>
            </div>
        )
    }

    if (!user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
                <p className="text-zinc-600 dark:text-zinc-400">Please sign in to view billing.</p>
            </div>
        )
    }

    if (error || !billing) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
                <div className="text-center">
                    <p className="text-zinc-600 dark:text-zinc-400 mb-4">
                        {error || 'Unable to load billing information'}
                    </p>
                    <a href="/pricing" className="text-zinc-900 dark:text-zinc-50 underline">
                        View pricing plans →
                    </a>
                </div>
            </div>
        )
    }

    const planDisplayName = billing.plan.charAt(0).toUpperCase() + billing.plan.slice(1)
    const renewalDate = new Date(billing.renewal.date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    })

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 py-12 px-4">
            <div className="max-w-4xl mx-auto space-y-8">
                {/* Success message */}
                {success && (
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                        <p className="text-green-800 dark:text-green-200 font-medium">
                            🎉 Payment successful! Your subscription is now active.
                        </p>
                    </div>
                )}

                {/* Header */}
                <div>
                    <h1 className="font-serif text-3xl font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
                        Billing & Usage
                    </h1>
                    <p className="text-zinc-600 dark:text-zinc-400">
                        Manage your subscription and track your usage
                    </p>
                </div>

                {/* Plan Overview */}
                <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">Current Plan</p>
                            <p className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
                                {planDisplayName}
                            </p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${billing.status === 'active'
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                                : billing.status === 'past_due'
                                    ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200'
                                    : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
                            }`}>
                            {billing.status.charAt(0).toUpperCase() + billing.status.slice(1).replace('_', ' ')}
                        </span>
                    </div>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6">
                        Renews on {renewalDate} ({billing.renewal.daysRemaining} days remaining)
                    </p>
                    <div className="flex gap-4">
                        <a
                            href="/pricing"
                            className="px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-50 font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition"
                        >
                            Change Plan
                        </a>
                        <a
                            href="/portal"
                            className="px-4 py-2 rounded-lg bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 font-medium hover:opacity-90 transition"
                        >
                            Manage Subscription
                        </a>
                    </div>
                </div>

                {/* Usage Stats */}
                <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-6">
                        Usage This Period
                    </h2>
                    <div className="space-y-6">
                        <UsageBar
                            label="Tokens"
                            percent={billing.usage.tokens.percent}
                            usedLabel={`${billing.usage.tokens.formatted.used} / ${billing.usage.tokens.formatted.limit} tokens`}
                        />
                        <UsageBar
                            label="Chats"
                            percent={100 - billing.usage.chats.percent}
                            usedLabel={`${billing.usage.chats.remaining} chats remaining`}
                        />
                        <UsageBar
                            label="Voice"
                            percent={100 - (billing.usage.voice.remaining / 300 * 100)}
                            usedLabel={`${billing.usage.voice.remaining} min remaining`}
                        />
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="grid md:grid-cols-2 gap-4">
                    <a
                        href="/chat"
                        className="block p-6 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition"
                    >
                        <h3 className="font-semibold text-zinc-900 dark:text-zinc-50 mb-1">
                            Start Chatting
                        </h3>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">
                            Continue where you left off
                        </p>
                    </a>
                    <a
                        href="/settings"
                        className="block p-6 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition"
                    >
                        <h3 className="font-semibold text-zinc-900 dark:text-zinc-50 mb-1">
                            Account Settings
                        </h3>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">
                            Manage your profile and preferences
                        </p>
                    </a>
                </div>
            </div>
        </div>
    )
}

export default function BillingPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">Loading...</div>}>
            <BillingContent />
        </Suspense>
    )
}

'use client'

import { useUser } from '@clerk/nextjs'
import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

// Mock data - TODO: Replace with actual API call to billing service
const mockBillingData = {
    plan: 'Pro',
    status: 'active',
    renewalDate: '2026-02-17',
    usage: {
        tokens: { used: 3500000, limit: 10000000 },
        chats: { used: 847, limit: 3000 },
        voice: { used: 25, limit: 60 },
        images: { used: 32, limit: 50 },
    },
}

function UsageBar({ label, used, limit, unit }: { label: string; used: number; limit: number; unit: string }) {
    const percentage = Math.min((used / limit) * 100, 100)
    const isHigh = percentage > 80

    return (
        <div className="space-y-2">
            <div className="flex justify-between text-sm">
                <span className="text-zinc-600 dark:text-zinc-400">{label}</span>
                <span className="text-zinc-900 dark:text-zinc-50 font-medium">
                    {used.toLocaleString()} / {limit.toLocaleString()} {unit}
                </span>
            </div>
            <div className="h-2 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all ${isHigh ? 'bg-amber-500' : 'bg-zinc-900 dark:bg-zinc-50'
                        }`}
                    style={{ width: `${percentage}%` }}
                />
            </div>
        </div>
    )
}

function BillingContent() {
    const { user, isLoaded } = useUser()
    const searchParams = useSearchParams()
    const success = searchParams.get('success')

    if (!isLoaded) {
        return <div className="min-h-screen flex items-center justify-center">Loading...</div>
    }

    if (!user) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <p>Please sign in to view billing.</p>
            </div>
        )
    }

    const data = mockBillingData

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
                                {data.plan}
                            </p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${data.status === 'active'
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                                : 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200'
                            }`}>
                            {data.status.charAt(0).toUpperCase() + data.status.slice(1)}
                        </span>
                    </div>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6">
                        Renews on {new Date(data.renewalDate).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        })}
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
                            used={data.usage.tokens.used}
                            limit={data.usage.tokens.limit}
                            unit="tokens"
                        />
                        <UsageBar
                            label="Chats"
                            used={data.usage.chats.used}
                            limit={data.usage.chats.limit}
                            unit="chats"
                        />
                        <UsageBar
                            label="Voice Minutes"
                            used={data.usage.voice.used}
                            limit={data.usage.voice.limit}
                            unit="min/day"
                        />
                        <UsageBar
                            label="Images"
                            used={data.usage.images.used}
                            limit={data.usage.images.limit}
                            unit="images/day"
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
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
            <BillingContent />
        </Suspense>
    )
}

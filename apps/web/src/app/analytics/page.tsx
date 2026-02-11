'use client';

import { ChartLine, ChatCircle, CircleNotch, Sparkle } from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    Cell,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/use-auth';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

// Color palette for charts
const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

interface UsageData {
    date: string;
    tokensIn: number;
    tokensOut: number;
    totalTokens: number;
    costUsd: number;
    messageCount: number;
}

interface MessageData {
    date: string;
    userMessages: number;
    assistantMessages: number;
    total: number;
}

interface ModelData {
    model: string;
    count: number;
    tokensIn: number;
    tokensOut: number;
    totalTokens: number;
    costUsd: number;
    percentage: number;
    [key: string]: string | number; // Index signature for Recharts compatibility
}

interface Summary {
    totalMessages: number;
    totalChats: number;
    totalTokensIn: number;
    totalTokensOut: number;
    totalTokens: number;
    totalCostUsd: number;
    messagesThisMonth: number;
}

export default function AnalyticsPage() {
    const router = useRouter();
    const { isLoaded, isSignedIn } = useAuth();

    const [summary, setSummary] = useState<Summary | null>(null);
    const [usageData, setUsageData] = useState<UsageData[]>([]);
    const [messageData, setMessageData] = useState<MessageData[]>([]);
    const [modelData, setModelData] = useState<ModelData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [interval, setInterval] = useState<'day' | 'week' | 'month'>('day');

    useEffect(() => {
        if (!isLoaded || !isSignedIn) {
            router.push('/login');
            return;
        }

        const loadAnalytics = async () => {
            try {
                setIsLoading(true);

                // Fetch all analytics data in parallel
                const [summaryRes, usageRes, messagesRes, modelsRes] = await Promise.all([
                    fetch(`${API_BASE}/api/analytics/summary`, { credentials: 'include' }),
                    fetch(`${API_BASE}/api/analytics/usage?interval=${interval}&limit=30`, {
                        credentials: 'include',
                    }),
                    fetch(`${API_BASE}/api/analytics/messages?limit=30`, {
                        credentials: 'include',
                    }),
                    fetch(`${API_BASE}/api/analytics/models?days=30`, { credentials: 'include' }),
                ]);

                if (summaryRes.ok) {
                    const data = await summaryRes.json();
                    setSummary(data);
                }

                if (usageRes.ok) {
                    const data = await usageRes.json();
                    setUsageData(data.data || []);
                }

                if (messagesRes.ok) {
                    const data = await messagesRes.json();
                    setMessageData(data.data || []);
                }

                if (modelsRes.ok) {
                    const data = await modelsRes.json();
                    setModelData(data.data || []);
                }
            } catch (error) {
                console.error('Failed to load analytics:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadAnalytics();
    }, [isLoaded, isSignedIn, router, interval]);

    if (!isLoaded || !isSignedIn) {
        return (
            <div className="h-screen flex items-center justify-center bg-background">
                <CircleNotch className="w-8 h-8 animate-spin text-zinc-400" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
                        Analytics Dashboard
                    </h1>
                    <p className="text-zinc-600 dark:text-zinc-400">
                        Track your AI usage, costs, and conversation statistics
                    </p>
                </div>

                {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <CircleNotch className="w-10 h-10 animate-spin text-zinc-400" />
                    </div>
                ) : (
                    <>
                        {/* Summary Cards */}
                        {summary && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                                        <CardTitle className="text-sm font-medium">
                                            Total Messages
                                        </CardTitle>
                                        <ChatCircle
                                            className="w-4 h-4 text-zinc-500"
                                            weight="duotone"
                                        />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">
                                            {summary.totalMessages.toLocaleString()}
                                        </div>
                                        <p className="text-xs text-zinc-500 mt-1">
                                            {summary.messagesThisMonth.toLocaleString()} this month
                                        </p>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                                        <CardTitle className="text-sm font-medium">
                                            Total Tokens
                                        </CardTitle>
                                        <Sparkle
                                            className="w-4 h-4 text-zinc-500"
                                            weight="duotone"
                                        />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">
                                            {(summary.totalTokens / 1000).toFixed(1)}K
                                        </div>
                                        <p className="text-xs text-zinc-500 mt-1">
                                            {summary.totalTokensIn.toLocaleString()} in /{' '}
                                            {summary.totalTokensOut.toLocaleString()} out
                                        </p>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                                        <CardTitle className="text-sm font-medium">
                                            Total Cost
                                        </CardTitle>
                                        <ChartLine
                                            className="w-4 h-4 text-zinc-500"
                                            weight="duotone"
                                        />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">
                                            ${summary.totalCostUsd.toFixed(2)}
                                        </div>
                                        <p className="text-xs text-zinc-500 mt-1">All-time usage</p>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                                        <CardTitle className="text-sm font-medium">
                                            Total Chats
                                        </CardTitle>
                                        <ChatCircle
                                            className="w-4 h-4 text-zinc-500"
                                            weight="duotone"
                                        />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">
                                            {summary.totalChats}
                                        </div>
                                        <p className="text-xs text-zinc-500 mt-1">
                                            Conversations created
                                        </p>
                                    </CardContent>
                                </Card>
                            </div>
                        )}

                        {/* Token Usage Chart */}
                        <Card className="mb-8">
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle>Token Usage Over Time</CardTitle>
                                        <CardDescription>
                                            Track your AI token consumption
                                        </CardDescription>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setInterval('day')}
                                            className={`px-3 py-1 text-xs rounded-md transition-colors ${
                                                interval === 'day'
                                                    ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                                                    : 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100'
                                            }`}
                                        >
                                            Day
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setInterval('week')}
                                            className={`px-3 py-1 text-xs rounded-md transition-colors ${
                                                interval === 'week'
                                                    ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                                                    : 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100'
                                            }`}
                                        >
                                            Week
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setInterval('month')}
                                            className={`px-3 py-1 text-xs rounded-md transition-colors ${
                                                interval === 'month'
                                                    ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                                                    : 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100'
                                            }`}
                                        >
                                            Month
                                        </button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {usageData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height={300}>
                                        <AreaChart data={usageData}>
                                            <defs>
                                                <linearGradient
                                                    id="colorTokens"
                                                    x1="0"
                                                    y1="0"
                                                    x2="0"
                                                    y2="1"
                                                >
                                                    <stop
                                                        offset="5%"
                                                        stopColor="#10b981"
                                                        stopOpacity={0.3}
                                                    />
                                                    <stop
                                                        offset="95%"
                                                        stopColor="#10b981"
                                                        stopOpacity={0}
                                                    />
                                                </linearGradient>
                                            </defs>
                                            <XAxis
                                                dataKey="date"
                                                tick={{ fontSize: 12 }}
                                                tickFormatter={(date) =>
                                                    new Date(date).toLocaleDateString('en-US', {
                                                        month: 'short',
                                                        day: 'numeric',
                                                    })
                                                }
                                            />
                                            <YAxis tick={{ fontSize: 12 }} />
                                            <Tooltip
                                                contentStyle={{
                                                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                                    border: '1px solid #e5e7eb',
                                                    borderRadius: '8px',
                                                }}
                                                formatter={(value) =>
                                                    value !== undefined
                                                        ? value.toLocaleString()
                                                        : '0'
                                                }
                                            />
                                            <Area
                                                type="monotone"
                                                dataKey="totalTokens"
                                                stroke="#10b981"
                                                strokeWidth={2}
                                                fillOpacity={1}
                                                fill="url(#colorTokens)"
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="flex items-center justify-center h-[300px] text-zinc-400">
                                        No usage data available
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                            {/* Message Count Chart */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Messages Per Day</CardTitle>
                                    <CardDescription>
                                        User and assistant message breakdown
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {messageData.length > 0 ? (
                                        <ResponsiveContainer width="100%" height={300}>
                                            <BarChart data={messageData}>
                                                <XAxis
                                                    dataKey="date"
                                                    tick={{ fontSize: 12 }}
                                                    tickFormatter={(date) =>
                                                        new Date(date).toLocaleDateString('en-US', {
                                                            month: 'short',
                                                            day: 'numeric',
                                                        })
                                                    }
                                                />
                                                <YAxis tick={{ fontSize: 12 }} />
                                                <Tooltip
                                                    contentStyle={{
                                                        backgroundColor:
                                                            'rgba(255, 255, 255, 0.95)',
                                                        border: '1px solid #e5e7eb',
                                                        borderRadius: '8px',
                                                    }}
                                                />
                                                <Bar
                                                    dataKey="userMessages"
                                                    fill="#3b82f6"
                                                    stackId="a"
                                                />
                                                <Bar
                                                    dataKey="assistantMessages"
                                                    fill="#10b981"
                                                    stackId="a"
                                                />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="flex items-center justify-center h-[300px] text-zinc-400">
                                            No message data available
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Model Distribution Chart */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Model Usage Distribution</CardTitle>
                                    <CardDescription>Last 30 days</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {modelData.length > 0 ? (
                                        <ResponsiveContainer width="100%" height={300}>
                                            <PieChart>
                                                <Pie
                                                    data={modelData}
                                                    dataKey="count"
                                                    nameKey="model"
                                                    cx="50%"
                                                    cy="50%"
                                                    outerRadius={100}
                                                    label={(entry: unknown) => {
                                                        const data = entry as Partial<ModelData>;
                                                        const modelRaw =
                                                            typeof data.model === 'string'
                                                                ? data.model
                                                                : '';
                                                        const model =
                                                            modelRaw.split('/')[1] || modelRaw;
                                                        const percentage =
                                                            typeof data.percentage === 'number'
                                                                ? data.percentage
                                                                : 0;
                                                        return `${model}: ${percentage.toFixed(1)}%`;
                                                    }}
                                                >
                                                    {modelData.map((_, index) => (
                                                        <Cell
                                                            key={`cell-${index}`}
                                                            fill={COLORS[index % COLORS.length]}
                                                        />
                                                    ))}
                                                </Pie>
                                                <Tooltip
                                                    contentStyle={{
                                                        backgroundColor:
                                                            'rgba(255, 255, 255, 0.95)',
                                                        border: '1px solid #e5e7eb',
                                                        borderRadius: '8px',
                                                    }}
                                                />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="flex items-center justify-center h-[300px] text-zinc-400">
                                            No model data available
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

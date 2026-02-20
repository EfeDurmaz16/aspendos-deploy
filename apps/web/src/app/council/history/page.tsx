'use client';

import {
    ArrowLeft,
    Brain,
    CalendarBlank,
    CircleNotch,
    Lightbulb,
    MagnifyingGlass,
    Scales,
    ShieldCheck,
    Warning,
} from '@phosphor-icons/react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { personaDefinitions } from '@/components/council/use-council';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

interface CouncilSessionSummary {
    id: string;
    query: string;
    status: string;
    selectedPersona: string | null;
    synthesis: string | null;
    createdAt: string;
    totalLatencyMs: number | null;
    responses?: {
        persona: string;
        content: string;
        status: string;
    }[];
}

const personaIcons: Record<string, typeof Brain> = {
    SCHOLAR: Brain,
    CREATIVE: Lightbulb,
    PRACTICAL: ShieldCheck,
    DEVILS_ADVOCATE: Warning,
};

const personaColors: Record<string, string> = {
    SCHOLAR: '#3b82f6',
    CREATIVE: '#f59e0b',
    PRACTICAL: '#10b981',
    DEVILS_ADVOCATE: '#ef4444',
};

export default function CouncilHistoryPage() {
    const router = useRouter();
    const { isLoaded, isSignedIn } = useAuth();
    const [sessions, setSessions] = useState<CouncilSessionSummary[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [expandedId, setExpandedId] = useState<string | null>(null);

    useEffect(() => {
        if (isLoaded && !isSignedIn) {
            router.push('/login');
        }
    }, [isLoaded, isSignedIn, router]);

    const loadSessions = useCallback(async () => {
        try {
            setIsLoading(true);
            const res = await fetch(`${API_BASE}/api/council/sessions?limit=50`, {
                credentials: 'include',
            });
            if (res.ok) {
                const data = await res.json();
                setSessions(data.sessions || data || []);
            }
        } catch {
            /* Silently fail */
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isLoaded && isSignedIn) {
            loadSessions();
        }
    }, [isLoaded, isSignedIn, loadSessions]);

    const loadSessionDetail = useCallback(async (sessionId: string) => {
        try {
            const res = await fetch(`${API_BASE}/api/council/sessions/${sessionId}`, {
                credentials: 'include',
            });
            if (res.ok) {
                const data = await res.json();
                setSessions((prev) =>
                    prev.map((s) => (s.id === sessionId ? { ...s, ...data } : s))
                );
            }
        } catch {
            /* Silently fail */
        }
    }, []);

    const handleExpand = useCallback(
        (sessionId: string) => {
            if (expandedId === sessionId) {
                setExpandedId(null);
            } else {
                setExpandedId(sessionId);
                loadSessionDetail(sessionId);
            }
        },
        [expandedId, loadSessionDetail]
    );

    const filteredSessions = sessions.filter((s) =>
        s.query.toLowerCase().includes(search.toLowerCase())
    );

    if (!isLoaded) {
        return (
            <div className="h-screen flex items-center justify-center bg-background">
                <CircleNotch className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!isSignedIn) return null;

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <div className="border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-10">
                <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
                    <Link href="/council">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <ArrowLeft className="w-4 h-4" />
                        </Button>
                    </Link>
                    <div className="flex-1">
                        <h1 className="text-lg font-semibold text-foreground">Council History</h1>
                        <p className="text-xs text-muted-foreground">
                            {sessions.length} session{sessions.length !== 1 ? 's' : ''}
                        </p>
                    </div>
                </div>
            </div>

            {/* Search */}
            <div className="max-w-4xl mx-auto px-4 pt-6 pb-4">
                <div className="relative">
                    <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search council sessions..."
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-muted/50 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500/50"
                    />
                </div>
            </div>

            {/* Sessions List */}
            <div className="max-w-4xl mx-auto px-4 pb-8 space-y-3">
                {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <CircleNotch className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                ) : filteredSessions.length === 0 ? (
                    <div className="text-center py-20">
                        <Scales className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
                        <p className="text-muted-foreground text-sm">
                            {search ? 'No matching sessions found' : 'No council sessions yet'}
                        </p>
                        {!search && (
                            <Link href="/council">
                                <Button variant="outline" size="sm" className="mt-4">
                                    Start your first session
                                </Button>
                            </Link>
                        )}
                    </div>
                ) : (
                    filteredSessions.map((session, index) => (
                        <motion.div
                            key={session.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.03 }}
                        >
                            <button
                                onClick={() => handleExpand(session.id)}
                                className={cn(
                                    'w-full text-left rounded-xl border border-border p-4 transition-all',
                                    'hover:border-violet-500/30 hover:bg-muted/50',
                                    expandedId === session.id && 'border-violet-500/50 bg-muted/50'
                                )}
                            >
                                {/* Session Header */}
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-foreground line-clamp-2">
                                            {session.query}
                                        </p>
                                        <div className="flex items-center gap-3 mt-2">
                                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                                <CalendarBlank className="w-3 h-3" />
                                                {new Date(session.createdAt).toLocaleDateString(undefined, {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    year: 'numeric',
                                                })}
                                            </span>
                                            {session.totalLatencyMs && (
                                                <span className="text-xs text-muted-foreground">
                                                    {(session.totalLatencyMs / 1000).toFixed(1)}s
                                                </span>
                                            )}
                                            <span
                                                className={cn(
                                                    'text-xs px-2 py-0.5 rounded-full',
                                                    session.status === 'COMPLETED'
                                                        ? 'bg-emerald-500/10 text-emerald-500'
                                                        : session.status === 'FAILED'
                                                          ? 'bg-red-500/10 text-red-500'
                                                          : 'bg-amber-500/10 text-amber-500'
                                                )}
                                            >
                                                {session.status.toLowerCase()}
                                            </span>
                                        </div>
                                    </div>
                                    {/* Persona dots */}
                                    <div className="flex gap-1 shrink-0">
                                        {['SCHOLAR', 'CREATIVE', 'PRACTICAL', 'DEVILS_ADVOCATE'].map(
                                            (p) => (
                                                <div
                                                    key={p}
                                                    className={cn(
                                                        'w-2.5 h-2.5 rounded-full',
                                                        session.selectedPersona === p
                                                            ? 'ring-2 ring-offset-1 ring-offset-background'
                                                            : 'opacity-50'
                                                    )}
                                                    style={{
                                                        backgroundColor: personaColors[p],
                                                        ringColor:
                                                            session.selectedPersona === p
                                                                ? personaColors[p]
                                                                : undefined,
                                                    }}
                                                />
                                            )
                                        )}
                                    </div>
                                </div>

                                {/* Synthesis Preview */}
                                {session.synthesis && !expandedId && (
                                    <p className="mt-3 text-xs text-muted-foreground line-clamp-2">
                                        {session.synthesis}
                                    </p>
                                )}
                            </button>

                            {/* Expanded Detail */}
                            {expandedId === session.id && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    className="mt-2 rounded-xl border border-border bg-muted/30 p-4 space-y-4"
                                >
                                    {/* Synthesis */}
                                    {session.synthesis && (
                                        <div>
                                            <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
                                                Verdict
                                            </h4>
                                            <p className="text-sm text-foreground/80">
                                                {session.synthesis}
                                            </p>
                                        </div>
                                    )}

                                    {/* Individual Responses */}
                                    {session.responses && session.responses.length > 0 && (
                                        <div>
                                            <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
                                                Responses
                                            </h4>
                                            <div className="space-y-2">
                                                {session.responses.map((resp) => {
                                                    const Icon =
                                                        personaIcons[resp.persona] || Brain;
                                                    const color =
                                                        personaColors[resp.persona] || '#888';
                                                    return (
                                                        <div
                                                            key={resp.persona}
                                                            className="flex gap-3 rounded-lg border border-border/50 bg-background/50 p-3"
                                                        >
                                                            <div
                                                                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                                                                style={{
                                                                    backgroundColor: `${color}20`,
                                                                }}
                                                            >
                                                                <Icon
                                                                    className="h-3.5 w-3.5"
                                                                    color={color}
                                                                    weight="fill"
                                                                />
                                                            </div>
                                                            <div className="min-w-0 flex-1">
                                                                <p
                                                                    className="text-xs font-medium"
                                                                    style={{ color }}
                                                                >
                                                                    {resp.persona.replace('_', ' ')}
                                                                </p>
                                                                <p className="mt-1 text-xs text-muted-foreground line-clamp-4">
                                                                    {resp.content}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </motion.div>
                    ))
                )}
            </div>
        </div>
    );
}

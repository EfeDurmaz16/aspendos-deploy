'use client';

/**
 * Memory Dashboard Page
 *
 * Displays user's memories with:
 * - Statistics cards (total, by sector)
 * - Sector filter buttons
 * - Memory list with cards
 * - Edit, delete, pin, feedback actions
 */

import {
    ArrowClockwise,
    Brain,
    Clock,
    Database,
    Heart,
    Lightbulb,
    MagnifyingGlass,
    PencilSimple,
    PushPin,
    Sparkle,
    ThumbsDown,
    ThumbsUp,
    Trash,
} from '@phosphor-icons/react';
import { NativeDelete } from '@/components/ui/delete-button';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuSeparator,
    ContextMenuTrigger,
    ContextMenuShortcut,
} from "@/components/ui/context-menu";

interface Memory {
    id: string;
    content: string;
    summary?: string;
    type: string;
    sector: string;
    source?: string;
    importance: number;
    confidence: number;
    decayScore: number;
    accessCount: number;
    isActive: boolean;
    isPinned: boolean;
    tags: string[];
    createdAt: string;
    updatedAt: string;
    lastAccessedAt: string;
}

interface MemoryStats {
    total: number;
    active: number;
    archived: number;
    pinned: number;
    bySector: Record<string, number>;
    avgConfidence: number;
}

interface PaginationInfo {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

const SECTORS = [
    { key: 'all', label: 'All', icon: Database, color: 'bg-zinc-500' },
    { key: 'episodic', label: 'Episodic', icon: Clock, color: 'bg-blue-500' },
    { key: 'semantic', label: 'Semantic', icon: Lightbulb, color: 'bg-emerald-500' },
    { key: 'procedural', label: 'Procedural', icon: Brain, color: 'bg-purple-500' },
    { key: 'emotional', label: 'Emotional', icon: Heart, color: 'bg-rose-500' },
    { key: 'reflective', label: 'Reflective', icon: Sparkle, color: 'bg-amber-500' },
];

const getSectorConfig = (sector: string) => SECTORS.find((s) => s.key === sector) || SECTORS[0];

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

async function fetchWithAuth(url: string, options: RequestInit = {}) {
    const response = await fetch(`${API_BASE}${url}`, {
        ...options,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...options.headers },
    });
    if (!response.ok) throw new Error(`API Error: ${response.status}`);
    return response.json();
}

function StatsCard({
    label,
    value,
    icon: Icon,
    color,
}: {
    label: string;
    value: number | string;
    icon: React.ElementType;
    color: string;
}) {
    return (
        <div className="bg-white/50 dark:bg-zinc-900/50 backdrop-blur border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 flex items-center gap-4 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all hover:shadow-lg">
            <div className={cn('p-3 rounded-lg', color)}>
                <Icon className="w-5 h-5 text-white" weight="fill" />
            </div>
            <div>
                <p className="text-2xl font-semibold font-mono text-zinc-900 dark:text-zinc-50">
                    {value}
                </p>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">{label}</p>
            </div>
        </div>
    );
}

function MemoryCard({
    memory,
    onEdit,
    onDelete,
    onPin,
    onFeedback,
}: {
    memory: Memory;
    onEdit: () => void;
    onDelete: () => void;
    onPin: () => void;
    onFeedback: (helpful: boolean) => void;
}) {
    const sector = getSectorConfig(memory.sector);
    const SectorIcon = sector.icon;

    return (
        <ContextMenu>
            <ContextMenuTrigger>
                <div
                    className={cn(
                        'bg-white/50 dark:bg-zinc-900/50 backdrop-blur border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 space-y-3 transition-all hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-lg hover:bg-white/70 dark:hover:bg-zinc-900/70',
                        memory.isPinned && 'ring-2 ring-amber-500/30 bg-amber-50/20 dark:bg-amber-950/10'
                    )}
                >
                    <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                            <div className={cn('p-1.5 rounded-lg', sector.color)}>
                                <SectorIcon className="w-4 h-4 text-white" weight="fill" />
                            </div>
                            <span className="text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-400">
                                {memory.sector}
                            </span>
                            {memory.isPinned && (
                                <PushPin className="w-4 h-4 text-amber-500 fill-amber-500" weight="fill" />
                            )}
                        </div>
                        <span className="text-xs font-mono bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 rounded-lg text-zinc-700 dark:text-zinc-300">
                            {Math.round(memory.confidence * 100)}%
                        </span>
                    </div>
                    <p className="text-sm leading-relaxed line-clamp-3 text-zinc-900 dark:text-zinc-100">
                        {memory.content}
                    </p>
                    {memory.summary && (
                        <p className="text-xs text-zinc-600 dark:text-zinc-400 italic line-clamp-2">
                            {memory.summary}
                        </p>
                    )}
                    {memory.tags?.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                            {(memory.tags || []).slice(0, 3).map((tag, i) => (
                                <span
                                    key={i}
                                    className="text-xs px-2 py-1 bg-zinc-200 dark:bg-zinc-700 rounded-lg text-zinc-700 dark:text-zinc-300"
                                >
                                    {tag}
                                </span>
                            ))}
                            {(memory.tags || []).length > 3 && (
                                <span className="text-xs text-zinc-600 dark:text-zinc-400">
                                    +{(memory.tags || []).length - 3} more
                                </span>
                            )}
                        </div>
                    )}
                    <div className="flex items-center justify-between pt-3 border-t border-zinc-200 dark:border-zinc-700">
                        <div className="text-xs text-zinc-600 dark:text-zinc-400">
                            {new Date(memory.createdAt).toLocaleDateString()} • {memory.accessCount}{' '}
                            accesses
                        </div>
                        <div className="flex items-center gap-1">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 hover:bg-emerald-100 dark:hover:bg-emerald-900/30"
                                onClick={() => onFeedback(true)}
                                title="Helpful"
                            >
                                <ThumbsUp className="w-3.5 h-3.5 text-emerald-500" weight="fill" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 hover:bg-rose-100 dark:hover:bg-rose-900/30"
                                onClick={() => onFeedback(false)}
                                title="Not helpful"
                            >
                                <ThumbsDown className="w-3.5 h-3.5 text-rose-500" weight="fill" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 hover:bg-amber-100 dark:hover:bg-amber-900/30"
                                onClick={onPin}
                                title={memory.isPinned ? 'Unpin' : 'Pin'}
                            >
                                <PushPin
                                    className={cn(
                                        'w-3.5 h-3.5',
                                        memory.isPinned
                                            ? 'text-amber-500 fill-amber-500'
                                            : 'text-zinc-600 dark:text-zinc-400'
                                    )}
                                    weight={memory.isPinned ? 'fill' : 'regular'}
                                />
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                                onClick={onEdit}
                                title="Edit"
                            >
                                <PencilSimple className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-400" />
                            </Button>
                            <NativeDelete
                                onConfirm={() => { }} // No-op for initial click
                                onDelete={onDelete}
                                buttonText=""
                                confirmText="Confirm"
                                size="sm"
                                className="h-7"
                            />
                        </div>
                    </div>
                </div>
            </ContextMenuTrigger>
            <ContextMenuContent className="w-64">
                <ContextMenuItem onClick={onEdit}>
                    <PencilSimple className="mr-2 h-4 w-4" />
                    Edit Memory
                    <ContextMenuShortcut>⌘E</ContextMenuShortcut>
                </ContextMenuItem>
                <ContextMenuItem onClick={onPin}>
                    <PushPin className={cn("mr-2 h-4 w-4", memory.isPinned ? "text-amber-500 fill-amber-500" : "")} weight={memory.isPinned ? "fill" : "regular"} />
                    {memory.isPinned ? "Unpin Memory" : "Pin Memory"}
                    <ContextMenuShortcut>⌘P</ContextMenuShortcut>
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem onClick={() => onFeedback(true)}>
                    <ThumbsUp className="mr-2 h-4 w-4 text-emerald-500" />
                    Mark as Helpful
                </ContextMenuItem>
                <ContextMenuItem onClick={() => onFeedback(false)}>
                    <ThumbsDown className="mr-2 h-4 w-4 text-rose-500" />
                    Mark as Not Helpful
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem onClick={onDelete} className="text-rose-500 focus:text-rose-500">
                    <Trash className="mr-2 h-4 w-4" />
                    Archive Memory
                    <ContextMenuShortcut>⌫</ContextMenuShortcut>
                </ContextMenuItem>
            </ContextMenuContent>
        </ContextMenu >
    );
}

export default function MemoryDashboardPage() {
    const { isSignedIn } = useAuth();
    const [stats, setStats] = useState<MemoryStats | null>(null);
    const [memories, setMemories] = useState<Memory[]>([]);
    const [pagination, setPagination] = useState<PaginationInfo | null>(null);
    const [activeSector, setActiveSector] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [editingMemory, setEditingMemory] = useState<Memory | null>(null);

    const fetchStats = useCallback(async () => {
        try {
            const data = await fetchWithAuth('/api/memory/dashboard/stats');
            setStats(data);
        } catch (err) {
            console.error('Failed to fetch stats:', err);
        }
    }, []);

    const fetchMemories = useCallback(
        async (page = 1) => {
            try {
                setIsLoading(true);
                const params = new URLSearchParams();
                params.set('page', String(page));
                params.set('limit', '20');
                if (activeSector !== 'all') params.set('sector', activeSector);
                if (searchQuery) params.set('search', searchQuery);

                const data = await fetchWithAuth(`/api/memory/dashboard/list?${params}`);
                setMemories(data.memories);
                setPagination(data.pagination);
                setError(null);
            } catch (err) {
                setError('Failed to load memories');
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        },
        [activeSector, searchQuery]
    );

    useEffect(() => {
        if (isSignedIn) {
            fetchStats();
            fetchMemories();
        }
    }, [fetchStats, fetchMemories, isSignedIn]);

    const handleSectorChange = (sector: string) => setActiveSector(sector);

    const handleFeedback = async (memoryId: string, wasHelpful: boolean) => {
        try {
            await fetchWithAuth('/api/memory/dashboard/feedback', {
                method: 'POST',
                body: JSON.stringify({ memoryId, wasHelpful }),
            });
            fetchStats();
            fetchMemories();
        } catch (err) {
            console.error('Failed to submit feedback:', err);
        }
    };

    const handlePin = async (memory: Memory) => {
        try {
            await fetchWithAuth(`/api/memory/dashboard/${memory.id}`, {
                method: 'PATCH',
                body: JSON.stringify({ isPinned: !memory.isPinned }),
            });
            fetchMemories();
        } catch (err) {
            console.error('Failed to toggle pin:', err);
        }
    };

    const handleDelete = async (memoryId: string) => {
        if (!confirm('Archive this memory?')) return;
        try {
            await fetchWithAuth(`/api/memory/dashboard/${memoryId}`, { method: 'DELETE' });
            fetchStats();
            fetchMemories();
        } catch (err) {
            console.error('Failed to delete memory:', err);
        }
    };

    const handleEditSave = async (updates: { content?: string; sector?: string }) => {
        if (!editingMemory) return;
        try {
            await fetchWithAuth(`/api/memory/dashboard/${editingMemory.id}`, {
                method: 'PATCH',
                body: JSON.stringify(updates),
            });
            setEditingMemory(null);
            fetchMemories();
        } catch (err) {
            console.error('Failed to edit memory:', err);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-white to-zinc-50 dark:from-zinc-950 dark:to-black relative overflow-hidden">
            {/* Gradient mesh backgrounds */}
            <div className="absolute inset-0 pointer-events-none -z-10">
                <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-gradient-to-br from-purple-100/20 to-transparent dark:from-purple-900/15 rounded-full blur-3xl" />
                <div className="absolute top-1/3 right-1/4 w-[600px] h-[600px] bg-gradient-to-bl from-blue-100/15 to-transparent dark:from-blue-900/10 rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-1/2 w-[700px] h-[700px] bg-gradient-to-t from-emerald-100/10 to-transparent dark:from-emerald-900/10 rounded-full blur-3xl" />
            </div>
            <div className="max-w-6xl mx-auto p-6 space-y-8 relative z-10">
                <div className="flex items-center justify-between">
                    <div className="animate-fade-up opacity-0 animation-delay-100">
                        <h1 className="text-4xl md:text-5xl font-bold text-zinc-900 dark:text-zinc-50">
                            Memory Bank
                        </h1>
                        <p className="text-zinc-600 dark:text-zinc-400 mt-2">
                            Organize and refine your memories with Aspendos
                        </p>
                    </div>
                    <Button
                        variant="secondary"
                        onClick={() => {
                            fetchStats();
                            fetchMemories();
                        }}
                        className="animate-fade-up opacity-0 animation-delay-200"
                    >
                        <ArrowClockwise className="w-4 h-4 mr-2" weight="bold" />
                        Refresh
                    </Button>
                </div>

                {stats && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <StatsCard
                            label="Total Memories"
                            value={stats.total}
                            icon={Database}
                            color="bg-zinc-600"
                        />
                        <StatsCard
                            label="Active"
                            value={stats.active}
                            icon={Brain}
                            color="bg-emerald-600"
                        />
                        <StatsCard
                            label="Pinned"
                            value={stats.pinned}
                            icon={PushPin}
                            color="bg-amber-600"
                        />
                        <StatsCard
                            label="Avg Confidence"
                            value={`${Math.round(stats.avgConfidence * 100)}%`}
                            icon={Sparkle}
                            color="bg-purple-600"
                        />
                    </div>
                )}

                {stats && (
                    <div className="bg-white/50 dark:bg-zinc-900/50 backdrop-blur border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 animate-fade-up opacity-0 animation-delay-300">
                        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
                            Memory Distribution
                        </h3>
                        <div className="grid grid-cols-5 gap-4">
                            {SECTORS.slice(1).map((sector) => {
                                const count = stats.bySector[sector.key] || 0;
                                const percentage =
                                    stats.active > 0 ? Math.round((count / stats.active) * 100) : 0;
                                return (
                                    <div key={sector.key} className="text-center">
                                        <div
                                            className={cn(
                                                'w-12 h-12 mx-auto rounded-lg flex items-center justify-center mb-2',
                                                sector.color
                                            )}
                                        >
                                            <sector.icon
                                                className="w-6 h-6 text-white"
                                                weight="fill"
                                            />
                                        </div>
                                        <p className="text-lg font-semibold font-mono text-zinc-900 dark:text-zinc-50">
                                            {count}
                                        </p>
                                        <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400 mt-1">
                                            {sector.label}
                                        </p>
                                        <p className="text-xs text-zinc-500 dark:text-zinc-500">
                                            {percentage}%
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                <div className="flex flex-wrap items-center gap-3 animate-fade-up opacity-0 animation-delay-400">
                    <div className="flex flex-wrap gap-2">
                        {SECTORS.map((sector) => (
                            <Button
                                key={sector.key}
                                variant={activeSector === sector.key ? 'primary' : 'secondary'}
                                size="sm"
                                onClick={() => handleSectorChange(sector.key)}
                            >
                                <sector.icon
                                    className="w-4 h-4 mr-1.5"
                                    weight={activeSector === sector.key ? 'fill' : 'regular'}
                                />
                                {sector.label}
                            </Button>
                        ))}
                    </div>
                    <div className="flex-1 min-w-[200px]">
                        <div className="relative">
                            <MagnifyingGlass
                                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 dark:text-zinc-400"
                                weight="bold"
                            />
                            <input
                                type="text"
                                placeholder="Search memories..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && fetchMemories()}
                                className="w-full pl-10 pr-4 py-2.5 text-sm bg-white/50 dark:bg-zinc-900/50 backdrop-blur border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:focus:ring-emerald-500/50 text-zinc-900 dark:text-zinc-50 placeholder-zinc-500 dark:placeholder-zinc-500 transition-all"
                            />
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="bg-rose-500/10 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-xl p-4 text-center text-rose-700 dark:text-rose-300 animate-fade-up opacity-0 animation-delay-300">
                        <p className="font-medium">{error}</p>
                    </div>
                )}
                {isLoading && (
                    <div className="text-center py-16 animate-fade-up opacity-0 animation-delay-300">
                        <ArrowClockwise className="w-8 h-8 mx-auto animate-spin text-zinc-400" />
                        <p className="mt-3 text-zinc-600 dark:text-zinc-400 font-medium">
                            Loading memories...
                        </p>
                    </div>
                )}
                {!isLoading && memories.length === 0 && (
                    <div className="text-center py-16 bg-white/50 dark:bg-zinc-900/50 backdrop-blur border border-zinc-200 dark:border-zinc-800 rounded-xl animate-fade-up opacity-0 animation-delay-300">
                        <Brain className="w-12 h-12 mx-auto text-zinc-400" weight="thin" />
                        <h3 className="mt-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                            No memories yet
                        </h3>
                        <p className="mt-1 text-zinc-600 dark:text-zinc-400">
                            Start chatting to build your memory bank
                        </p>
                    </div>
                )}

                {!isLoading && memories.length > 0 && (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 animate-fade-up opacity-0 animation-delay-400">
                        {memories.map((memory, idx) => (
                            <div
                                key={memory.id}
                                className="opacity-0 animate-fade-up"
                                style={{ animationDelay: `${150 + idx * 50}ms` }}
                            >
                                <MemoryCard
                                    memory={memory}
                                    onEdit={() => setEditingMemory(memory)}
                                    onDelete={() => handleDelete(memory.id)}
                                    onPin={() => handlePin(memory)}
                                    onFeedback={(helpful) => handleFeedback(memory.id, helpful)}
                                />
                            </div>
                        ))}
                    </div>
                )}

                {pagination && pagination.totalPages > 1 && (
                    <div className="flex justify-center gap-3 animate-fade-up opacity-0 animation-delay-500">
                        <Button
                            variant="secondary"
                            size="sm"
                            disabled={pagination.page <= 1}
                            onClick={() => fetchMemories(pagination.page - 1)}
                        >
                            Previous
                        </Button>
                        <span className="px-4 py-2 text-sm text-zinc-600 dark:text-zinc-400 bg-white/50 dark:bg-zinc-900/50 backdrop-blur border border-zinc-200 dark:border-zinc-800 rounded-lg">
                            Page {pagination.page} of {pagination.totalPages}
                        </span>
                        <Button
                            variant="secondary"
                            size="sm"
                            disabled={pagination.page >= pagination.totalPages}
                            onClick={() => fetchMemories(pagination.page + 1)}
                        >
                            Next
                        </Button>
                    </div>
                )}

                {editingMemory && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur flex items-center justify-center z-50 p-4 animate-fade-up">
                        <div className="bg-white/95 dark:bg-zinc-950/95 backdrop-blur border border-zinc-200 dark:border-zinc-800 rounded-xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
                            <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
                                Edit Memory
                            </h3>
                            <div className="space-y-3">
                                <div>
                                    <label className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                                        Content
                                    </label>
                                    <textarea
                                        className="w-full mt-1 p-3 text-sm bg-white/50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-none text-zinc-900 dark:text-zinc-50 placeholder-zinc-500 dark:placeholder-zinc-500"
                                        rows={4}
                                        defaultValue={editingMemory.content}
                                        id="edit-content"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                                        Sector
                                    </label>
                                    <select
                                        className="w-full mt-1 p-3 text-sm bg-white/50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-zinc-900 dark:text-zinc-50"
                                        defaultValue={editingMemory.sector}
                                        id="edit-sector"
                                    >
                                        {SECTORS.slice(1).map((s) => (
                                            <option key={s.key} value={s.key}>
                                                {s.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                                <Button
                                    variant="secondary"
                                    onClick={() => setEditingMemory(null)}
                                    className="rounded-lg"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    variant="primary"
                                    onClick={() => {
                                        const content = (
                                            document.getElementById(
                                                'edit-content'
                                            ) as HTMLTextAreaElement
                                        )?.value;
                                        const sector = (
                                            document.getElementById(
                                                'edit-sector'
                                            ) as HTMLSelectElement
                                        )?.value;
                                        handleEditSave({ content, sector });
                                    }}
                                    className="rounded-lg"
                                >
                                    Save Changes
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

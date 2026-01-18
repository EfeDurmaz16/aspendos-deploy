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

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Brain, Database, Lightbulb, Heart, Sparkles, Clock, Pin, Trash2, Edit, ThumbsUp, ThumbsDown, Search, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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
    { key: 'reflective', label: 'Reflective', icon: Sparkles, color: 'bg-amber-500' },
];

const getSectorConfig = (sector: string) => SECTORS.find(s => s.key === sector) || SECTORS[0];

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

function StatsCard({ label, value, icon: Icon, color }: { label: string; value: number | string; icon: React.ElementType; color: string }) {
    return (
        <div className="bg-card border border-border rounded-lg p-4 flex items-center gap-4">
            <div className={cn('p-3 rounded-lg', color)}><Icon className="w-5 h-5 text-white" /></div>
            <div>
                <p className="text-2xl font-semibold font-mono">{value}</p>
                <p className="text-sm text-muted-foreground">{label}</p>
            </div>
        </div>
    );
}

function MemoryCard({ memory, onEdit, onDelete, onPin, onFeedback }: { memory: Memory; onEdit: () => void; onDelete: () => void; onPin: () => void; onFeedback: (helpful: boolean) => void }) {
    const sector = getSectorConfig(memory.sector);
    const SectorIcon = sector.icon;

    return (
        <div className={cn("bg-card border border-border rounded-lg p-4 space-y-3 transition-all hover:border-primary/30", memory.isPinned && "ring-2 ring-amber-500/30")}>
            <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                    <div className={cn('p-1.5 rounded', sector.color)}><SectorIcon className="w-3.5 h-3.5 text-white" /></div>
                    <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{memory.sector}</span>
                    {memory.isPinned && <Pin className="w-3.5 h-3.5 text-amber-500" />}
                </div>
                <span className="text-xs text-muted-foreground font-mono">{Math.round(memory.confidence * 100)}%</span>
            </div>
            <p className="text-sm leading-relaxed line-clamp-3">{memory.content}</p>
            {memory.summary && <p className="text-xs text-muted-foreground italic line-clamp-2">{memory.summary}</p>}
            {memory.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                    {memory.tags.slice(0, 3).map((tag, i) => <span key={i} className="text-xs px-2 py-0.5 bg-muted rounded-full">{tag}</span>)}
                    {memory.tags.length > 3 && <span className="text-xs text-muted-foreground">+{memory.tags.length - 3} more</span>}
                </div>
            )}
            <div className="flex items-center justify-between pt-2 border-t border-border">
                <div className="text-xs text-muted-foreground">{new Date(memory.createdAt).toLocaleDateString()} • {memory.accessCount} accesses</div>
                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => onFeedback(true)}><ThumbsUp className="w-3.5 h-3.5 text-emerald-500" /></Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => onFeedback(false)}><ThumbsDown className="w-3.5 h-3.5 text-rose-500" /></Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onPin}><Pin className={cn("w-3.5 h-3.5", memory.isPinned ? "text-amber-500 fill-amber-500" : "text-muted-foreground")} /></Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onEdit}><Edit className="w-3.5 h-3.5 text-muted-foreground" /></Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onDelete}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
                </div>
            </div>
        </div>
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

    const fetchMemories = useCallback(async (page = 1) => {
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
    }, [activeSector, searchQuery]);

    useEffect(() => {
        if (isSignedIn) {
            fetchStats();
            fetchMemories();
        }
    }, [fetchStats, fetchMemories, isSignedIn]);

    const handleSectorChange = (sector: string) => setActiveSector(sector);

    const handleFeedback = async (memoryId: string, wasHelpful: boolean) => {
        try {
            await fetchWithAuth('/api/memory/dashboard/feedback', { method: 'POST', body: JSON.stringify({ memoryId, wasHelpful }) });
            fetchStats();
            fetchMemories();
        } catch (err) {
            console.error('Failed to submit feedback:', err);
        }
    };

    const handlePin = async (memory: Memory) => {
        try {
            await fetchWithAuth(`/api/memory/dashboard/edit/${memory.id}`, { method: 'POST', body: JSON.stringify({ isPinned: !memory.isPinned }) });
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
            await fetchWithAuth(`/api/memory/dashboard/edit/${editingMemory.id}`, { method: 'POST', body: JSON.stringify(updates) });
            setEditingMemory(null);
            fetchMemories();
        } catch (err) {
            console.error('Failed to edit memory:', err);
        }
    };

    return (
        <div className="min-h-screen bg-background">
            <div className="max-w-6xl mx-auto p-6 space-y-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-serif font-semibold">Memory Dashboard</h1>
                        <p className="text-muted-foreground mt-1">View and manage your memories</p>
                    </div>
                    <Button variant="outline" onClick={() => { fetchStats(); fetchMemories(); }}>
                        <RefreshCw className="w-4 h-4 mr-2" />Refresh
                    </Button>
                </div>

                {stats && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <StatsCard label="Total Memories" value={stats.total} icon={Database} color="bg-zinc-600" />
                        <StatsCard label="Active" value={stats.active} icon={Brain} color="bg-emerald-600" />
                        <StatsCard label="Pinned" value={stats.pinned} icon={Pin} color="bg-amber-600" />
                        <StatsCard label="Avg Confidence" value={`${Math.round(stats.avgConfidence * 100)}%`} icon={Sparkles} color="bg-purple-600" />
                    </div>
                )}

                {stats && (
                    <div className="bg-card border border-border rounded-lg p-4">
                        <h3 className="text-sm font-medium mb-3">Sector Distribution</h3>
                        <div className="grid grid-cols-5 gap-2">
                            {SECTORS.slice(1).map((sector) => {
                                const count = stats.bySector[sector.key] || 0;
                                const percentage = stats.active > 0 ? Math.round((count / stats.active) * 100) : 0;
                                return (
                                    <div key={sector.key} className="text-center">
                                        <div className={cn('w-10 h-10 mx-auto rounded-lg flex items-center justify-center', sector.color)}>
                                            <sector.icon className="w-5 h-5 text-white" />
                                        </div>
                                        <p className="text-lg font-semibold font-mono mt-2">{count}</p>
                                        <p className="text-xs text-muted-foreground">{sector.label}</p>
                                        <p className="text-xs text-muted-foreground">{percentage}%</p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex flex-wrap gap-2">
                        {SECTORS.map((sector) => (
                            <Button key={sector.key} variant={activeSector === sector.key ? 'default' : 'outline'} size="sm" onClick={() => handleSectorChange(sector.key)}>
                                <sector.icon className="w-4 h-4 mr-1.5" />{sector.label}
                            </Button>
                        ))}
                    </div>
                    <div className="flex-1 min-w-[200px]">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <input type="text" placeholder="Search memories..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && fetchMemories()} className="w-full pl-10 pr-4 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring" />
                        </div>
                    </div>
                </div>

                {error && <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 text-center text-destructive">{error}</div>}
                {isLoading && <div className="text-center py-12"><RefreshCw className="w-8 h-8 mx-auto animate-spin text-muted-foreground" /><p className="mt-2 text-muted-foreground">Loading memories...</p></div>}
                {!isLoading && memories.length === 0 && (
                    <div className="text-center py-12 bg-card border border-border rounded-lg">
                        <Brain className="w-12 h-12 mx-auto text-muted-foreground" />
                        <h3 className="mt-4 text-lg font-medium">No memories yet</h3>
                        <p className="mt-1 text-muted-foreground">Start chatting to build your memory bank</p>
                    </div>
                )}

                {!isLoading && memories.length > 0 && (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {memories.map((memory) => (
                            <MemoryCard key={memory.id} memory={memory} onEdit={() => setEditingMemory(memory)} onDelete={() => handleDelete(memory.id)} onPin={() => handlePin(memory)} onFeedback={(helpful) => handleFeedback(memory.id, helpful)} />
                        ))}
                    </div>
                )}

                {pagination && pagination.totalPages > 1 && (
                    <div className="flex justify-center gap-2">
                        <Button variant="outline" size="sm" disabled={pagination.page <= 1} onClick={() => fetchMemories(pagination.page - 1)}>Previous</Button>
                        <span className="px-4 py-2 text-sm text-muted-foreground">Page {pagination.page} of {pagination.totalPages}</span>
                        <Button variant="outline" size="sm" disabled={pagination.page >= pagination.totalPages} onClick={() => fetchMemories(pagination.page + 1)}>Next</Button>
                    </div>
                )}

                {editingMemory && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-card border border-border rounded-lg w-full max-w-lg p-6 space-y-4">
                            <h3 className="text-lg font-semibold">Edit Memory</h3>
                            <div className="space-y-3">
                                <div>
                                    <label className="text-sm font-medium">Content</label>
                                    <textarea className="w-full mt-1 p-3 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring resize-none" rows={4} defaultValue={editingMemory.content} id="edit-content" />
                                </div>
                                <div>
                                    <label className="text-sm font-medium">Sector</label>
                                    <select className="w-full mt-1 p-3 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring" defaultValue={editingMemory.sector} id="edit-sector">
                                        {SECTORS.slice(1).map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 pt-4 border-t border-border">
                                <Button variant="outline" onClick={() => setEditingMemory(null)}>Cancel</Button>
                                <Button onClick={() => {
                                    const content = (document.getElementById('edit-content') as HTMLTextAreaElement)?.value;
                                    const sector = (document.getElementById('edit-sector') as HTMLSelectElement)?.value;
                                    handleEditSave({ content, sector });
                                }}>Save Changes</Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

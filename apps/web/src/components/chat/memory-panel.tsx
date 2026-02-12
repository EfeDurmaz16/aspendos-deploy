'use client';

import {
    Brain,
    ChartBar,
    CircleNotch,
    Lightning,
    MagnifyingGlass,
    Sparkle,
    Tag,
    X,
} from '@phosphor-icons/react';
import { useCallback, useEffect, useState } from 'react';
import { ContextMenuMemory } from '@/components/chat/context-menu-memory';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

interface Memory {
    id: string;
    content: string;
    sector: string;
    confidence: number;
    createdAt: string;
    isPinned?: boolean;
    metrics?: {
        relevance: number;
        recency: number;
        importance: number;
    };
    tags?: string[];
}

interface MemoryPanelProps {
    onClose?: () => void;
}

export function MemoryPanel({ onClose }: MemoryPanelProps) {
    const [memories, setMemories] = useState<Memory[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    const fetchMemories = useCallback(async () => {
        try {
            setIsLoading(true);
            const url = searchQuery
                ? `${API_BASE}/api/memory?q=${encodeURIComponent(searchQuery)}&limit=50`
                : `${API_BASE}/api/memory/dashboard/list?limit=50`;

            const res = await fetch(url, { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                setMemories(data.memories || []);
            }
        } catch (err) {
            console.error('Failed to fetch memories:', err);
        } finally {
            setIsLoading(false);
        }
    }, [searchQuery]);

    useEffect(() => {
        const timer = setTimeout(() => fetchMemories(), 300);
        return () => clearTimeout(timer);
    }, [fetchMemories]);

    return (
        <div className="h-full flex flex-col bg-background">
            {/* Header */}
            <div className="h-14 flex items-center justify-between px-4 border-b border-border sticky top-0 z-10 bg-background">
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
                        <Brain className="size-4 text-primary-foreground" weight="fill" />
                    </div>
                    <span className="font-semibold text-sm tracking-tight">Memory</span>
                </div>
                {onClose && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-muted-foreground hover:text-foreground"
                        onClick={onClose}
                    >
                        <X className="size-4" />
                    </Button>
                )}
            </div>

            <ScrollArea className="flex-1">
                <div className="p-4 space-y-5">
                    {/* Search */}
                    <div className="relative">
                        <MagnifyingGlass className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                        <Input
                            placeholder="Search memories..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="h-8 pl-8 text-sm bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-ring"
                        />
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-3 gap-2">
                        <div className="p-3 rounded-xl bg-muted border border-border">
                            <Sparkle className="size-4 text-primary mb-1.5" weight="fill" />
                            <div className="text-lg font-semibold">{memories.length}</div>
                            <div className="text-[10px] text-muted-foreground">Memories</div>
                        </div>
                        <div className="p-3 rounded-xl bg-muted border border-border">
                            <Lightning className="size-4 text-primary mb-1.5" weight="fill" />
                            <div className="text-lg font-semibold">42</div>
                            <div className="text-[10px] text-muted-foreground">Nodes</div>
                        </div>
                        <div className="p-3 rounded-xl bg-muted border border-border">
                            <ChartBar className="size-4 text-primary mb-1.5" weight="fill" />
                            <div className="text-lg font-semibold">89%</div>
                            <div className="text-[10px] text-muted-foreground">Accuracy</div>
                        </div>
                    </div>

                    {/* Memory List */}
                    <div>
                        <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1 flex items-center gap-1.5">
                            <div className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Active Context
                        </h3>
                        <div className="space-y-2">
                            {isLoading ? (
                                <div className="flex justify-center py-8">
                                    <CircleNotch className="size-5 animate-spin text-muted-foreground" />
                                </div>
                            ) : memories.length === 0 ? (
                                <div className="text-center py-8 border border-dashed border-border rounded-xl bg-muted">
                                    <Brain
                                        className="size-8 text-muted-foreground mx-auto mb-2"
                                        weight="duotone"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        No memories found
                                    </p>
                                    <p className="text-[10px] text-muted-foreground mt-1">
                                        Chat to start building context
                                    </p>
                                </div>
                            ) : (
                                memories.slice(0, 10).map((memory) => (
                                    <ContextMenuMemory
                                        key={memory.id}
                                        memory={{
                                            id: memory.id,
                                            content: memory.content,
                                            type: memory.sector,
                                            tags: memory.tags,
                                        }}
                                    >
                                        <MemoryCard memory={memory} />
                                    </ContextMenuMemory>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </ScrollArea>
        </div>
    );
}

function MemoryCard({ memory }: { memory: Memory }) {
    const relevanceScore = memory.metrics?.relevance ?? memory.confidence ?? 0;
    const relevanceColor =
        relevanceScore > 0.7
            ? 'text-emerald-500'
            : relevanceScore > 0.4
              ? 'text-amber-500'
              : 'text-muted-foreground';

    return (
        <div className="group p-3 rounded-xl border border-border bg-card hover:border-border hover:shadow-sm transition-all cursor-pointer">
            <div className="flex items-start gap-2.5">
                <div className="mt-0.5 p-1.5 rounded-lg bg-muted text-muted-foreground group-hover:bg-muted group-hover:text-primary transition-colors">
                    <Tag className="size-3" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-xs text-foreground line-clamp-2 leading-relaxed">
                        {memory.content}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                        <span className={cn('text-[10px] font-medium', relevanceColor)}>
                            {(relevanceScore * 100).toFixed(0)}% match
                        </span>
                        <span className="text-[10px] text-muted-foreground/60">
                            {new Date(memory.createdAt).toLocaleDateString()}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default MemoryPanel;

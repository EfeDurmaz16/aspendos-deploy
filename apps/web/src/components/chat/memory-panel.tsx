'use client';

import {
    Brain,
    CircleNotch,
    MagnifyingGlass,
    Tag,
    X,
} from '@phosphor-icons/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { ContextMenuMemory } from '@/components/chat/context-menu-memory';
import { toast } from 'sonner';

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
        <div className="h-full flex flex-col bg-zinc-50 dark:bg-zinc-950/50 relative border-l border-border/40">
            {/* Header */}
            <div className="h-14 flex items-center justify-between px-4 border-b border-border/40 bg-zinc-50/80 dark:bg-zinc-950/80 backdrop-blur z-10 sticky top-0">
                <div className="flex items-center gap-2 text-foreground/80">
                    <Brain className="w-4 h-4" weight="regular" />
                    <span className="font-semibold text-sm tracking-tight">Memory Context</span>
                </div>
                {onClose && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={onClose}
                    >
                        <X className="w-4 h-4" />
                    </Button>
                )}
            </div>

            <ScrollArea className="flex-1">
                <div className="p-4 space-y-6">
                    {/* Search - simplified */}
                    <div className="relative">
                        <MagnifyingGlass className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                        <Input
                            placeholder="Filter memories..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-background/50 border-border/50 h-9 pl-8 text-sm placeholder:text-muted-foreground/50"
                        />
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-background border border-border/50 rounded-lg shadow-sm">
                            <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-1">Total Memories</div>
                            <div className="text-xl font-serif font-medium">{memories.length}</div>
                        </div>
                        <div className="p-3 bg-background border border-border/50 rounded-lg shadow-sm">
                            <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-1">Graph Nodes</div>
                            <div className="text-xl font-serif font-medium">124</div>
                        </div>
                    </div>

                    {/* Recent Memories */}
                    <div>
                        <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">
                            Active Context
                        </h3>
                        <div className="space-y-2">
                            {isLoading ? (
                                <div className="flex justify-center py-8">
                                    <CircleNotch className="w-4 h-4 animate-spin text-muted-foreground" />
                                </div>
                            ) : memories.length === 0 ? (
                                <div className="text-center py-8 border border-dashed border-border/60 rounded-lg">
                                    <p className="text-xs text-muted-foreground">No relevant memories found</p>
                                </div>
                            ) : (
                                memories.map((memory) => (
                                    <ContextMenuMemory
                                        key={memory.id}
                                        memory={{ id: memory.id, content: memory.content, type: memory.sector, tags: memory.tags }}
                                        onView={(m) => {
                                            toast.info('View memory details coming soon');
                                        }}
                                        onEdit={(m) => {
                                            toast.info('Edit memory coming soon');
                                        }}
                                        onDelete={(id) => {
                                            toast.info('Delete memory coming soon');
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
    return (
        <Card className="group hover:border-foreground/20 transition-all cursor-pointer bg-background border-border/60 shadow-sm">
            <CardHeader className="p-3 pb-1 space-y-0">
                <div className="flex items-start justify-between">
                    <div className="flex gap-2">
                        <div className="mt-0.5 p-1 rounded-md bg-zinc-100 dark:bg-zinc-800 text-muted-foreground group-hover:text-foreground transition-colors">
                            <Tag className="w-3 h-3" />
                        </div>
                        <div>
                            <CardTitle className="text-xs font-medium leading-tight line-clamp-1 group-hover:text-primary transition-colors">
                                {memory.content.substring(0, 40)}...
                            </CardTitle>
                            <CardDescription className="text-[10px] mt-0.5">
                                {new Date(memory.createdAt).toLocaleDateString()}
                            </CardDescription>
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-3 pt-2">
                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {memory.content}
                </p>
                <div className="flex gap-1.5 mt-2 flex-wrap">
                    {memory.metrics && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-zinc-100 dark:bg-zinc-800 text-muted-foreground">
                            rel: {memory.metrics.relevance.toFixed(2)}
                        </span>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

export default MemoryPanel;

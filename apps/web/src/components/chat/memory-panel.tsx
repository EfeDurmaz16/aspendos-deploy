'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';
import {
    Brain,
    PushPin,
    MagnifyingGlass,
    Plus,
    Trash,
    PencilSimple,
    X,
    CircleNotch,
    Clock,
    Lightbulb,
    Heart,
    Sparkle,
} from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

// Sector icons and colors
const SECTOR_CONFIG: Record<string, { icon: typeof Brain; color: string }> = {
    episodic: { icon: Clock, color: 'text-blue-500' },
    semantic: { icon: Lightbulb, color: 'text-emerald-500' },
    procedural: { icon: Brain, color: 'text-purple-500' },
    emotional: { icon: Heart, color: 'text-rose-500' },
    reflective: { icon: Sparkle, color: 'text-amber-500' },
};

interface Memory {
    id: string;
    content: string;
    sector: string;
    confidence: number;
    createdAt?: string;
    isPinned?: boolean;
}

interface MemoryPanelProps {
    onClose?: () => void;
}

export function MemoryPanel({ onClose }: MemoryPanelProps) {
    // Better Auth uses cookies - getToken removed
    const [memories, setMemories] = useState<Memory[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [editingMemory, setEditingMemory] = useState<Memory | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [newMemoryContent, setNewMemoryContent] = useState('');
    const [newMemorySector, setNewMemorySector] = useState('semantic');

    // Fetch memories
    const fetchMemories = useCallback(async () => {
        try {
            setIsLoading(true);
            const token = await getToken();
            const url = searchQuery
                ? `${API_BASE}/api/memory?q=${encodeURIComponent(searchQuery)}&limit=50`
                : `${API_BASE}/api/memory/dashboard/list?limit=50`;

            const res = await fetch(url, {
                headers: { /* credentials: include handles auth */ },
            });

            if (res.ok) {
                const data = await res.json();
                setMemories(data.memories || []);
            }
        } catch (err) {
            console.error('Failed to fetch memories:', err);
        } finally {
            setIsLoading(false);
        }
    }, [getToken, searchQuery]);

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchMemories();
        }, 300);

        return () => clearTimeout(timer);
    }, [fetchMemories]);

    // Create memory
    const handleCreate = async () => {
        if (!newMemoryContent.trim()) return;

        try {
            const token = await getToken();
            const res = await fetch(`${API_BASE}/api/memory`, {
                method: 'POST',
                headers: {
                    /* credentials: include handles auth */,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    content: newMemoryContent,
                    sector: newMemorySector,
                }),
            });

            if (res.ok) {
                setNewMemoryContent('');
                setIsCreating(false);
                fetchMemories();
            }
        } catch (err) {
            console.error('Failed to create memory:', err);
        }
    };

    // Update memory
    const handleUpdate = async () => {
        if (!editingMemory) return;

        try {
            const token = await getToken();
            await fetch(`${API_BASE}/api/memory/dashboard/${editingMemory.id}`, {
                method: 'PATCH',
                headers: {
                    /* credentials: include handles auth */,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    content: editingMemory.content,
                    sector: editingMemory.sector,
                }),
            });

            setEditingMemory(null);
            fetchMemories();
        } catch (err) {
            console.error('Failed to update memory:', err);
        }
    };

    // Delete single memory
    const handleDelete = async (id: string) => {
        try {
            const token = await getToken();
            await fetch(`${API_BASE}/api/memory/dashboard/${id}`, {
                method: 'DELETE',
                headers: { /* credentials: include handles auth */ },
            });
            fetchMemories();
        } catch (err) {
            console.error('Failed to delete memory:', err);
        }
    };

    // Bulk delete
    const handleBulkDelete = async () => {
        if (selectedIds.size === 0) return;

        try {
            const token = await getToken();
            await fetch(`${API_BASE}/api/memory/dashboard/bulk-delete`, {
                method: 'POST',
                headers: {
                    /* credentials: include handles auth */,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ ids: Array.from(selectedIds) }),
            });
            setSelectedIds(new Set());
            fetchMemories();
        } catch (err) {
            console.error('Failed to bulk delete:', err);
        }
    };

    // Toggle selection
    const toggleSelection = (id: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    };

    // Group memories by sector
    const groupedMemories = useMemo(() => {
        const groups: Record<string, Memory[]> = {};
        for (const memory of memories) {
            const sector = memory.sector || 'semantic';
            if (!groups[sector]) groups[sector] = [];
            groups[sector].push(memory);
        }
        return groups;
    }, [memories]);

    return (
        <div className="h-full flex flex-col bg-zinc-50 dark:bg-zinc-950">
            {/* Header */}
            <div className="h-14 flex items-center justify-between px-4 border-b border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                    <Brain size={18} weight="duotone" />
                    <span className="font-serif font-medium">Memory</span>
                    <span className="text-xs bg-zinc-200 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
                        {memories.length}
                    </span>
                </div>
                <div className="flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setIsCreating(true)}
                        title="Add memory"
                    >
                        <Plus size={16} />
                    </Button>
                    {selectedIds.size > 0 && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-500"
                            onClick={handleBulkDelete}
                            title={`Delete ${selectedIds.size} selected`}
                        >
                            <Trash size={16} />
                        </Button>
                    )}
                    {onClose && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-zinc-400"
                            onClick={onClose}
                        >
                            <X size={16} />
                        </Button>
                    )}
                </div>
            </div>

            {/* Search */}
            <div className="p-3 border-b border-zinc-200 dark:border-zinc-800">
                <div className="relative">
                    <MagnifyingGlass
                        size={14}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
                    />
                    <Input
                        type="text"
                        placeholder="Search memories..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 h-8 text-sm"
                    />
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {isLoading ? (
                    <div className="flex justify-center py-8">
                        <CircleNotch className="w-6 h-6 animate-spin text-zinc-400" />
                    </div>
                ) : memories.length === 0 ? (
                    <div className="text-center py-8 text-zinc-400 text-sm">
                        <Brain size={32} className="mx-auto mb-2 opacity-50" />
                        <p>No memories yet</p>
                        <p className="text-xs mt-1">
                            Chat to build your memory context
                        </p>
                    </div>
                ) : (
                    Object.entries(groupedMemories).map(([sector, sectorMemories]) => {
                        const config = SECTOR_CONFIG[sector] || SECTOR_CONFIG.semantic;
                        const SectorIcon = config.icon;

                        return (
                            <div key={sector}>
                                <div className="flex items-center gap-2 mb-2">
                                    <SectorIcon
                                        size={14}
                                        className={config.color}
                                        weight="duotone"
                                    />
                                    <h4 className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">
                                        {sector}
                                    </h4>
                                    <span className="text-[10px] text-zinc-400">
                                        ({sectorMemories.length})
                                    </span>
                                </div>
                                <div className="space-y-2">
                                    {sectorMemories.map((memory) => (
                                        <MemoryItem
                                            key={memory.id}
                                            memory={memory}
                                            isSelected={selectedIds.has(memory.id)}
                                            onSelect={() => toggleSelection(memory.id)}
                                            onEdit={() => setEditingMemory(memory)}
                                            onDelete={() => handleDelete(memory.id)}
                                        />
                                    ))}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Create Memory Modal */}
            {isCreating && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg w-full max-w-sm p-4">
                        <h3 className="font-medium mb-3">Add Memory</h3>
                        <textarea
                            value={newMemoryContent}
                            onChange={(e) => setNewMemoryContent(e.target.value)}
                            placeholder="What should I remember?"
                            className="w-full h-24 p-2 text-sm border rounded-lg resize-none focus:outline-none focus:ring-1 focus:ring-zinc-300 dark:bg-zinc-800 dark:border-zinc-700"
                        />
                        <select
                            value={newMemorySector}
                            onChange={(e) => setNewMemorySector(e.target.value)}
                            className="w-full mt-2 p-2 text-sm border rounded-lg dark:bg-zinc-800 dark:border-zinc-700"
                        >
                            <option value="semantic">Semantic (Facts)</option>
                            <option value="episodic">Episodic (Events)</option>
                            <option value="procedural">Procedural (How-to)</option>
                            <option value="emotional">Emotional (Feelings)</option>
                            <option value="reflective">Reflective (Insights)</option>
                        </select>
                        <div className="flex justify-end gap-2 mt-4">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setIsCreating(false)}
                            >
                                Cancel
                            </Button>
                            <Button size="sm" onClick={handleCreate}>
                                Save
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Memory Modal */}
            {editingMemory && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg w-full max-w-sm p-4">
                        <h3 className="font-medium mb-3">Edit Memory</h3>
                        <textarea
                            value={editingMemory.content}
                            onChange={(e) =>
                                setEditingMemory({ ...editingMemory, content: e.target.value })
                            }
                            className="w-full h-24 p-2 text-sm border rounded-lg resize-none focus:outline-none focus:ring-1 focus:ring-zinc-300 dark:bg-zinc-800 dark:border-zinc-700"
                        />
                        <select
                            value={editingMemory.sector}
                            onChange={(e) =>
                                setEditingMemory({ ...editingMemory, sector: e.target.value })
                            }
                            className="w-full mt-2 p-2 text-sm border rounded-lg dark:bg-zinc-800 dark:border-zinc-700"
                        >
                            <option value="semantic">Semantic</option>
                            <option value="episodic">Episodic</option>
                            <option value="procedural">Procedural</option>
                            <option value="emotional">Emotional</option>
                            <option value="reflective">Reflective</option>
                        </select>
                        <div className="flex justify-end gap-2 mt-4">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setEditingMemory(null)}
                            >
                                Cancel
                            </Button>
                            <Button size="sm" onClick={handleUpdate}>
                                Save
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function MemoryItem({
    memory,
    isSelected,
    onSelect,
    onEdit,
    onDelete,
}: {
    memory: Memory;
    isSelected: boolean;
    onSelect: () => void;
    onEdit: () => void;
    onDelete: () => void;
}) {
    return (
        <div
            className={cn(
                'p-3 rounded-lg border text-left transition-all group',
                isSelected
                    ? 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800'
                    : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
            )}
        >
            <div className="flex items-start gap-2">
                <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={onSelect}
                    className="mt-1 rounded"
                />
                <div className="flex-1 min-w-0">
                    <p className="text-[13px] text-zinc-700 dark:text-zinc-300 line-clamp-3">
                        {memory.content}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                        <span className="text-[10px] text-zinc-400">
                            {Math.round(memory.confidence * 100)}% confidence
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={onEdit}
                        className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                        title="Edit"
                    >
                        <PencilSimple size={14} />
                    </button>
                    <button
                        onClick={onDelete}
                        className="p-1 text-zinc-400 hover:text-red-500"
                        title="Delete"
                    >
                        <Trash size={14} />
                    </button>
                </div>
            </div>
        </div>
    );
}

export default MemoryPanel;

'use client';

import { useCallback, useEffect, useMemo } from 'react';
import {
    type MemoryEdge,
    type MemoryNode,
    type MemoryNodeCategory,
    useYulaStore,
} from '@/stores/yula-store';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

type MemoryApiItem = {
    id: string;
    content: string;
    sector?: string;
};

type MemoryApiResponse = {
    memories?: MemoryApiItem[];
};

function mapSectorToCategory(sector: string): MemoryNodeCategory {
    if (sector === 'episodic') return 'date';
    if (sector === 'semantic') return 'project';
    if (sector === 'procedural') return 'preference';
    if (sector === 'emotional') return 'person';
    return 'memory';
}

function buildGraph(memories: MemoryApiItem[]): { nodes: MemoryNode[]; edges: MemoryEdge[] } {
    const nodes: MemoryNode[] = [];
    const edges: MemoryEdge[] = [];
    const sectorNodes = new Set<string>();

    for (const memory of memories) {
        const sector = memory.sector || 'memory';
        const sectorNodeId = `sector-${sector}`;

        if (!sectorNodes.has(sectorNodeId)) {
            sectorNodes.add(sectorNodeId);
            nodes.push({
                id: sectorNodeId,
                label: sector,
                category: mapSectorToCategory(sector),
                content: `Memory sector: ${sector}`,
            });
        }

        const label =
            memory.content.length > 48 ? `${memory.content.slice(0, 48).trim()}...` : memory.content;
        nodes.push({
            id: memory.id,
            label: label || 'Memory',
            category: 'memory',
            content: memory.content,
            metadata: { sector },
        });

        edges.push({
            id: `edge-${memory.id}-${sectorNodeId}`,
            source: memory.id,
            target: sectorNodeId,
            relationship: 'in',
        });
    }

    return { nodes, edges };
}

// Category colors for nodes
export const categoryColors: Record<
    MemoryNodeCategory,
    { bg: string; border: string; text: string }
> = {
    person: { bg: '#3b82f6', border: '#60a5fa', text: '#dbeafe' }, // Blue
    project: { bg: '#8b5cf6', border: '#a78bfa', text: '#ede9fe' }, // Violet
    date: { bg: '#f59e0b', border: '#fbbf24', text: '#fef3c7' }, // Amber
    preference: { bg: '#10b981', border: '#34d399', text: '#d1fae5' }, // Emerald
    memory: { bg: '#ec4899', border: '#f472b6', text: '#fce7f3' }, // Pink
};

export function useMemoryGraph() {
    const {
        memoryGraph,
        setMemoryNodes,
        setMemoryEdges,
        addMemoryNode,
        addMemoryEdge,
        selectMemoryNode,
        hoverMemoryNode,
        setMemoryGraphLoading,
    } = useYulaStore();

    // Initialize graph from real backend memories
    useEffect(() => {
        let cancelled = false;
        const loadMemoryGraph = async () => {
            setMemoryGraphLoading(true);
            try {
                const response = await fetch(`${API_BASE}/api/memory/dashboard/list?limit=100`, {
                    credentials: 'include',
                });
                if (!response.ok) {
                    if (!cancelled) {
                        setMemoryNodes([]);
                        setMemoryEdges([]);
                    }
                    return;
                }

                const data = (await response.json()) as MemoryApiResponse;
                const graph = buildGraph(data.memories || []);
                if (!cancelled) {
                    setMemoryNodes(graph.nodes);
                    setMemoryEdges(graph.edges);
                }
            } catch {
                if (!cancelled) {
                    setMemoryNodes([]);
                    setMemoryEdges([]);
                }
            } finally {
                if (!cancelled) {
                    setMemoryGraphLoading(false);
                }
            }
        };

        void loadMemoryGraph();
        return () => {
            cancelled = true;
        };
    }, [
        setMemoryNodes,
        setMemoryEdges,
        setMemoryGraphLoading,
    ]);

    // Convert to graph format for react-force-graph
    const graphData = useMemo(() => {
        return {
            nodes: memoryGraph.nodes.map((node) => ({
                id: node.id,
                name: node.label,
                category: node.category,
                content: node.content,
                val: node.category === 'project' ? 3 : node.category === 'person' ? 2 : 1,
                color: categoryColors[node.category].bg,
            })),
            links: memoryGraph.edges.map((edge) => ({
                source: edge.source,
                target: edge.target,
                relationship: edge.relationship,
            })),
        };
    }, [memoryGraph.nodes, memoryGraph.edges]);

    // Get selected node details
    const selectedNode = useMemo(() => {
        if (!memoryGraph.selectedNodeId) return null;
        return memoryGraph.nodes.find((n) => n.id === memoryGraph.selectedNodeId) || null;
    }, [memoryGraph.nodes, memoryGraph.selectedNodeId]);

    // Get hovered node details
    const hoveredNode = useMemo(() => {
        if (!memoryGraph.hoveredNodeId) return null;
        return memoryGraph.nodes.find((n) => n.id === memoryGraph.hoveredNodeId) || null;
    }, [memoryGraph.nodes, memoryGraph.hoveredNodeId]);

    // Get connected nodes for selected node
    const connectedNodes = useMemo(() => {
        if (!memoryGraph.selectedNodeId) return [];

        const connectedIds = new Set<string>();

        for (const edge of memoryGraph.edges) {
            if (edge.source === memoryGraph.selectedNodeId) {
                connectedIds.add(edge.target);
            } else if (edge.target === memoryGraph.selectedNodeId) {
                connectedIds.add(edge.source);
            }
        }

        return memoryGraph.nodes.filter((n) => connectedIds.has(n.id));
    }, [memoryGraph.nodes, memoryGraph.edges, memoryGraph.selectedNodeId]);

    // Filter nodes by category
    const filterByCategory = useCallback(
        (category: MemoryNodeCategory | null) => {
            if (!category) return memoryGraph.nodes;
            return memoryGraph.nodes.filter((n) => n.category === category);
        },
        [memoryGraph.nodes]
    );

    // Search nodes
    const searchNodes = useCallback(
        (query: string) => {
            if (!query.trim()) return memoryGraph.nodes;
            const lowerQuery = query.toLowerCase();
            return memoryGraph.nodes.filter(
                (n) =>
                    n.label.toLowerCase().includes(lowerQuery) ||
                    n.content?.toLowerCase().includes(lowerQuery)
            );
        },
        [memoryGraph.nodes]
    );

    return {
        // State
        nodes: memoryGraph.nodes,
        edges: memoryGraph.edges,
        selectedNodeId: memoryGraph.selectedNodeId,
        hoveredNodeId: memoryGraph.hoveredNodeId,
        isLoading: memoryGraph.isLoading,
        graphData,
        selectedNode,
        hoveredNode,
        connectedNodes,

        // Actions
        setNodes: setMemoryNodes,
        setEdges: setMemoryEdges,
        addNode: addMemoryNode,
        addEdge: addMemoryEdge,
        selectNode: selectMemoryNode,
        hoverNode: hoverMemoryNode,
        filterByCategory,
        searchNodes,
    };
}

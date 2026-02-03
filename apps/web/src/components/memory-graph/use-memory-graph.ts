'use client';

import { useCallback, useEffect, useMemo } from 'react';
import { useYulaStore, type MemoryNode, type MemoryEdge, type MemoryNodeCategory } from '@/stores/yula-store';

// Sample data generator for demo purposes
function generateSampleData(): { nodes: MemoryNode[]; edges: MemoryEdge[] } {
    const nodes: MemoryNode[] = [
        // Core preferences
        { id: 'pref-1', label: 'Dark Mode', category: 'preference', content: 'User prefers dark interfaces' },
        { id: 'pref-2', label: 'Morning Person', category: 'preference', content: 'Most productive before noon' },
        { id: 'pref-3', label: 'Minimalist', category: 'preference', content: 'Prefers clean, simple designs' },

        // People
        { id: 'person-1', label: 'Alice', category: 'person', content: 'Colleague from engineering team' },
        { id: 'person-2', label: 'Bob', category: 'person', content: 'Project manager' },
        { id: 'person-3', label: 'Carol', category: 'person', content: 'Design lead' },

        // Projects
        { id: 'project-1', label: 'Yula OS', category: 'project', content: 'AI companion project' },
        { id: 'project-2', label: 'Website Redesign', category: 'project', content: 'Q1 initiative' },
        { id: 'project-3', label: 'Mobile App', category: 'project', content: 'Cross-platform app development' },

        // Important dates
        { id: 'date-1', label: 'Q1 Deadline', category: 'date', content: 'March 31st - Major milestone' },
        { id: 'date-2', label: 'Team Offsite', category: 'date', content: 'February 15th - Planning session' },

        // Memories
        { id: 'memory-1', label: 'Coffee Chat Ideas', category: 'memory', content: 'Discussed new features with Alice' },
        { id: 'memory-2', label: 'Design Review', category: 'memory', content: 'Feedback from Carol on UI' },
    ];

    const edges: MemoryEdge[] = [
        // Project connections
        { id: 'edge-1', source: 'person-1', target: 'project-1', relationship: 'works on' },
        { id: 'edge-2', source: 'person-2', target: 'project-1', relationship: 'manages' },
        { id: 'edge-3', source: 'person-3', target: 'project-2', relationship: 'leads' },

        // Memory connections
        { id: 'edge-4', source: 'memory-1', target: 'person-1', relationship: 'with' },
        { id: 'edge-5', source: 'memory-1', target: 'project-1', relationship: 'about' },
        { id: 'edge-6', source: 'memory-2', target: 'person-3', relationship: 'from' },
        { id: 'edge-7', source: 'memory-2', target: 'project-2', relationship: 'about' },

        // Date connections
        { id: 'edge-8', source: 'date-1', target: 'project-1', relationship: 'deadline for' },
        { id: 'edge-9', source: 'date-2', target: 'project-2', relationship: 'planning for' },

        // Preference connections
        { id: 'edge-10', source: 'pref-3', target: 'project-2', relationship: 'influences' },
    ];

    return { nodes, edges };
}

// Category colors for nodes
export const categoryColors: Record<MemoryNodeCategory, { bg: string; border: string; text: string }> = {
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

    // Initialize with sample data if empty
    useEffect(() => {
        if (memoryGraph.nodes.length === 0 && !memoryGraph.isLoading) {
            setMemoryGraphLoading(true);
            // Simulate loading delay
            const timer = setTimeout(() => {
                const { nodes, edges } = generateSampleData();
                setMemoryNodes(nodes);
                setMemoryEdges(edges);
                setMemoryGraphLoading(false);
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [memoryGraph.nodes.length, memoryGraph.isLoading, setMemoryNodes, setMemoryEdges, setMemoryGraphLoading]);

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

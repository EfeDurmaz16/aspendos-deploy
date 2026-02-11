'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Briefcase, CalendarBlank, SlidersHorizontal, Brain, MagnifyingGlass, ArrowsOutSimple, ArrowsInSimple } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useMemoryGraph, categoryColors } from './use-memory-graph';
import { MemoryNodeCard } from './memory-node';
import type { MemoryNodeCategory } from '@/stores/yula-store';
import type { ForceGraphMethods, NodeObject } from 'react-force-graph-2d';

// Dynamically import ForceGraph2D to avoid SSR issues
const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), {
    ssr: false,
    loading: () => (
        <div className="flex h-full items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
        </div>
    ),
});

const categoryIcons: Record<MemoryNodeCategory, typeof User> = {
    person: User,
    project: Briefcase,
    date: CalendarBlank,
    preference: SlidersHorizontal,
    memory: Brain,
};

interface MemoryGraphProps {
    className?: string;
    height?: number;
    width?: number;
}

type GraphNode = NodeObject & {
    id: string;
    name: string;
    color: string;
    category: MemoryNodeCategory;
    x?: number;
    y?: number;
};

export function MemoryGraph({ className, height = 400, width }: MemoryGraphProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const graphRef = useRef<ForceGraphMethods | null>(null);
    const [dimensions, setDimensions] = useState({ width: width || 400, height });
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<MemoryNodeCategory | null>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);

    const {
        graphData,
        selectedNode,
        connectedNodes,
        isLoading,
        selectNode,
        hoverNode,
        filterByCategory,
        searchNodes,
    } = useMemoryGraph();

    // Resize observer
    useEffect(() => {
        if (!containerRef.current) return;

        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                setDimensions({
                    width: entry.contentRect.width,
                    height: isFullscreen ? window.innerHeight - 100 : height,
                });
            }
        });

        resizeObserver.observe(containerRef.current);
        return () => resizeObserver.disconnect();
    }, [height, isFullscreen]);

    // Filter data based on search and category
    const filteredData = useCallback(() => {
        let nodes = graphData.nodes;

        if (searchQuery) {
            const matchingNodes = searchNodes(searchQuery);
            const matchingIds = new Set(matchingNodes.map((n) => n.id));
            nodes = nodes.filter((n) => matchingIds.has(n.id));
        }

        if (selectedCategory) {
            const categoryNodes = filterByCategory(selectedCategory);
            const categoryIds = new Set(categoryNodes.map((n) => n.id));
            nodes = nodes.filter((n) => categoryIds.has(n.id));
        }

        const nodeIds = new Set(nodes.map((n) => n.id));
        const links = graphData.links.filter((l) => {
            const sourceId = typeof l.source === 'string' ? l.source : (l.source as { id: string })?.id;
            const targetId = typeof l.target === 'string' ? l.target : (l.target as { id: string })?.id;
            return nodeIds.has(sourceId) && nodeIds.has(targetId);
        });

        return { nodes, links };
    }, [graphData, searchQuery, selectedCategory, searchNodes, filterByCategory]);

    // Custom node rendering
    const nodeCanvasObject = useCallback(
        (node: GraphNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
            if (typeof node.x !== 'number' || typeof node.y !== 'number') return;
            const label = node.name;
            const fontSize = 12 / globalScale;
            const nodeRadius = 8;

            // Draw node circle
            ctx.beginPath();
            ctx.arc(node.x, node.y, nodeRadius, 0, 2 * Math.PI);
            ctx.fillStyle = node.color;
            ctx.fill();

            // Draw border
            ctx.strokeStyle = categoryColors[node.category as MemoryNodeCategory].border;
            ctx.lineWidth = 2 / globalScale;
            ctx.stroke();

            // Draw label
            ctx.font = `${fontSize}px Inter, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#fafafa';
            ctx.fillText(label, node.x, node.y + nodeRadius + fontSize);
        },
        []
    );

    // Handle node click
    const handleNodeClick = useCallback(
        (node: GraphNode) => {
            selectNode(node.id);
            // Center on node
            if (graphRef.current && typeof node.x === 'number' && typeof node.y === 'number') {
                graphRef.current.centerAt(node.x, node.y, 500);
                graphRef.current.zoom(2, 500);
            }
        },
        [selectNode]
    );

    // Handle node hover
    const handleNodeHover = useCallback(
        (node: GraphNode | null) => {
            hoverNode(node?.id || null);
        },
        [hoverNode]
    );

    // Zoom controls
    const handleZoomIn = useCallback(() => {
        if (graphRef.current) {
            graphRef.current.zoom(graphRef.current.zoom() * 1.5, 300);
        }
    }, []);

    const handleZoomOut = useCallback(() => {
        if (graphRef.current) {
            graphRef.current.zoom(graphRef.current.zoom() / 1.5, 300);
        }
    }, []);

    const handleResetView = useCallback(() => {
        if (graphRef.current) {
            graphRef.current.zoomToFit(400, 50);
        }
    }, []);

    const data = filteredData();

    return (
        <div
            ref={containerRef}
            className={cn(
                'relative overflow-hidden rounded-xl',
                'border border-white/10 bg-zinc-900/50 backdrop-blur-sm',
                isFullscreen && 'fixed inset-4 z-50',
                className
            )}
        >
            {/* Header Controls */}
            <div className="absolute left-0 right-0 top-0 z-10 flex items-center justify-between border-b border-white/5 bg-zinc-900/80 px-4 py-2 backdrop-blur-sm">
                <div className="flex items-center gap-2">
                    <Brain className="h-4 w-4 text-violet-400" weight="fill" />
                    <span className="text-sm font-medium text-zinc-300">Memory Graph</span>
                    <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-zinc-400">
                        {data.nodes.length} nodes
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    {/* Search */}
                    <div className="relative">
                        <MagnifyingGlass className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search..."
                            className="h-7 w-32 rounded-md border border-white/10 bg-white/5 pl-7 pr-2 text-xs text-white placeholder:text-zinc-500 focus:border-violet-500/50 focus:outline-none"
                        />
                    </div>

                    {/* Fullscreen toggle */}
                    <button
                        onClick={() => setIsFullscreen(!isFullscreen)}
                        className="flex h-7 w-7 items-center justify-center rounded-md border border-white/10 bg-white/5 text-zinc-400 transition-colors hover:bg-white/10 hover:text-white"
                    >
                        {isFullscreen ? (
                            <ArrowsInSimple className="h-3.5 w-3.5" />
                        ) : (
                            <ArrowsOutSimple className="h-3.5 w-3.5" />
                        )}
                    </button>
                </div>
            </div>

            {/* Category Filters */}
            <div className="absolute left-4 top-14 z-10 flex flex-col gap-1">
                {(Object.keys(categoryColors) as MemoryNodeCategory[]).map((category) => {
                    const Icon = categoryIcons[category];
                    const colors = categoryColors[category];
                    const isActive = selectedCategory === category;

                    return (
                        <button
                            key={category}
                            onClick={() => setSelectedCategory(isActive ? null : category)}
                            className={cn(
                                'flex h-7 w-7 items-center justify-center rounded-md transition-all duration-200',
                                isActive
                                    ? 'bg-white/15 shadow-lg'
                                    : 'bg-white/5 hover:bg-white/10'
                            )}
                            style={isActive ? { borderColor: colors.bg, borderWidth: 1 } : {}}
                            title={category}
                        >
                            <Icon
                                className={cn('h-3.5 w-3.5', isActive ? '' : 'text-zinc-500')}
                                color={isActive ? colors.bg : undefined}
                                weight={isActive ? 'fill' : 'regular'}
                            />
                        </button>
                    );
                })}
            </div>

            {/* Graph Canvas */}
            <div className="h-full pt-12">
                {isLoading ? (
                    <div className="flex h-full items-center justify-center">
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                        >
                            <Brain className="h-8 w-8 text-violet-400" weight="fill" />
                        </motion.div>
                    </div>
                ) : (
                    <ForceGraph2D
                        ref={graphRef}
                        graphData={data}
                        width={dimensions.width}
                        height={dimensions.height - 48}
                        backgroundColor="transparent"
                        nodeCanvasObject={nodeCanvasObject}
                        nodePointerAreaPaint={(node, color, ctx) => {
                            ctx.beginPath();
                            ctx.arc(node.x!, node.y!, 12, 0, 2 * Math.PI);
                            ctx.fillStyle = color;
                            ctx.fill();
                        }}
                        linkColor={() => 'rgba(255, 255, 255, 0.1)'}
                        linkWidth={1}
                        linkDirectionalParticles={2}
                        linkDirectionalParticleWidth={2}
                        linkDirectionalParticleColor={() => 'rgba(139, 92, 246, 0.5)'}
                        onNodeClick={handleNodeClick}
                        onNodeHover={handleNodeHover}
                        cooldownTicks={100}
                        onEngineStop={() => graphRef.current?.zoomToFit(400, 50)}
                    />
                )}
            </div>

            {/* Zoom Controls */}
            <div className="absolute bottom-4 right-4 z-10 flex flex-col gap-1">
                <button
                    onClick={handleZoomIn}
                    className="flex h-7 w-7 items-center justify-center rounded-md border border-white/10 bg-zinc-900/80 text-sm text-zinc-400 backdrop-blur-sm transition-colors hover:bg-white/10 hover:text-white"
                >
                    +
                </button>
                <button
                    onClick={handleZoomOut}
                    className="flex h-7 w-7 items-center justify-center rounded-md border border-white/10 bg-zinc-900/80 text-sm text-zinc-400 backdrop-blur-sm transition-colors hover:bg-white/10 hover:text-white"
                >
                    -
                </button>
                <button
                    onClick={handleResetView}
                    className="flex h-7 w-7 items-center justify-center rounded-md border border-white/10 bg-zinc-900/80 text-xs text-zinc-400 backdrop-blur-sm transition-colors hover:bg-white/10 hover:text-white"
                    title="Reset view"
                >
                    <ArrowsOutSimple className="h-3.5 w-3.5" />
                </button>
            </div>

            {/* Selected Node Detail Panel */}
            <AnimatePresence>
                {selectedNode && (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="absolute bottom-4 right-14 z-10 w-64"
                    >
                        <MemoryNodeCard
                            node={selectedNode}
                            isSelected
                            showDetails
                            connectedNodes={connectedNodes}
                            onClose={() => selectNode(null)}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

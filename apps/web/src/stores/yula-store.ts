import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

// =============================================================================
// Types
// =============================================================================

export type EngineMode = 'speed' | 'deep';

export type PACItemType = 'reminder' | 'suggestion' | 'alert';
export type PACItemStatus = 'pending' | 'snoozed' | 'approved' | 'dismissed';

export interface PACItem {
    id: string;
    type: PACItemType;
    title: string;
    description: string;
    scheduledFor?: Date;
    createdAt: Date;
    status: PACItemStatus;
    snoozedUntil?: Date;
    metadata?: Record<string, unknown>;
}

export type MemoryNodeCategory = 'person' | 'project' | 'date' | 'preference' | 'memory';

export interface MemoryNode {
    id: string;
    label: string;
    category: MemoryNodeCategory;
    content?: string;
    metadata?: Record<string, unknown>;
    x?: number;
    y?: number;
}

export interface MemoryEdge {
    id: string;
    source: string;
    target: string;
    relationship?: string;
}

export interface OmnibarResult {
    id: string;
    type: 'memory' | 'chat' | 'action' | 'setting';
    title: string;
    description?: string;
    icon?: string;
    action?: () => void;
}

// Council Persona types
export type CouncilPersona = 'logic' | 'creative' | 'prudent' | 'devils-advocate';

export interface CouncilThought {
    persona: CouncilPersona;
    thought: string;
    confidence: number;
    timestamp: Date;
}

export interface CouncilVerdict {
    recommendation: string;
    confidence: number;
    reasoning: string;
    contributions: Record<CouncilPersona, string>;
}

// =============================================================================
// Store State Types
// =============================================================================

interface OmnibarState {
    isOpen: boolean;
    query: string;
    results: OmnibarResult[];
    selectedIndex: number;
    isLoading: boolean;
}

interface MemoryGraphState {
    nodes: MemoryNode[];
    edges: MemoryEdge[];
    selectedNodeId: string | null;
    hoveredNodeId: string | null;
    isLoading: boolean;
}

interface PACState {
    items: PACItem[];
    isExpanded: boolean;
}

interface CouncilState {
    isActive: boolean;
    thoughts: CouncilThought[];
    verdict: CouncilVerdict | null;
    isDeliberating: boolean;
}

interface SettingsState {
    engineMode: EngineMode;
    hasSeenWelcome: boolean;
    sidebarCollapsed: boolean;
    memoryPanelCollapsed: boolean;
}

interface YulaStore {
    // Omnibar
    omnibar: OmnibarState;
    openOmnibar: () => void;
    closeOmnibar: () => void;
    toggleOmnibar: () => void;
    setOmnibarQuery: (query: string) => void;
    setOmnibarResults: (results: OmnibarResult[]) => void;
    setOmnibarSelectedIndex: (index: number) => void;
    setOmnibarLoading: (isLoading: boolean) => void;
    executeOmnibarAction: (result: OmnibarResult) => void;

    // Memory Graph
    memoryGraph: MemoryGraphState;
    setMemoryNodes: (nodes: MemoryNode[]) => void;
    setMemoryEdges: (edges: MemoryEdge[]) => void;
    addMemoryNode: (node: MemoryNode) => void;
    addMemoryEdge: (edge: MemoryEdge) => void;
    selectMemoryNode: (nodeId: string | null) => void;
    hoverMemoryNode: (nodeId: string | null) => void;
    setMemoryGraphLoading: (isLoading: boolean) => void;

    // PAC Timeline
    pac: PACState;
    addPACItem: (item: Omit<PACItem, 'id' | 'createdAt' | 'status'>) => void;
    updatePACItem: (id: string, updates: Partial<PACItem>) => void;
    snoozePACItem: (id: string, until: Date) => void;
    approvePACItem: (id: string) => void;
    dismissPACItem: (id: string) => void;
    togglePACExpanded: () => void;
    removePACItem: (id: string) => void;

    // Council
    council: CouncilState;
    startCouncilDeliberation: () => void;
    addCouncilThought: (thought: CouncilThought) => void;
    setCouncilVerdict: (verdict: CouncilVerdict) => void;
    resetCouncil: () => void;

    // Settings
    settings: SettingsState;
    setEngineMode: (mode: EngineMode) => void;
    toggleEngineMode: () => void;
    markWelcomeSeen: () => void;
    toggleSidebar: () => void;
    toggleMemoryPanel: () => void;

    // Utility
    reset: () => void;
}

// =============================================================================
// Initial State
// =============================================================================

const initialOmnibarState: OmnibarState = {
    isOpen: false,
    query: '',
    results: [],
    selectedIndex: 0,
    isLoading: false,
};

const initialMemoryGraphState: MemoryGraphState = {
    nodes: [],
    edges: [],
    selectedNodeId: null,
    hoveredNodeId: null,
    isLoading: false,
};

const initialPACState: PACState = {
    items: [],
    isExpanded: true,
};

const initialCouncilState: CouncilState = {
    isActive: false,
    thoughts: [],
    verdict: null,
    isDeliberating: false,
};

const initialSettingsState: SettingsState = {
    engineMode: 'speed',
    hasSeenWelcome: false,
    sidebarCollapsed: false,
    memoryPanelCollapsed: false,
};

// =============================================================================
// Store
// =============================================================================

export const useYulaStore = create<YulaStore>()(
    persist(
        (set, get) => ({
            // -----------------------------------------------------------------
            // Omnibar
            // -----------------------------------------------------------------
            omnibar: initialOmnibarState,

            openOmnibar: () =>
                set((state) => ({
                    omnibar: {
                        ...state.omnibar,
                        isOpen: true,
                        query: '',
                        results: [],
                        selectedIndex: 0,
                    },
                })),

            closeOmnibar: () =>
                set((state) => ({
                    omnibar: {
                        ...state.omnibar,
                        isOpen: false,
                        query: '',
                        results: [],
                        selectedIndex: 0,
                    },
                })),

            toggleOmnibar: () => {
                const { omnibar } = get();
                if (omnibar.isOpen) {
                    get().closeOmnibar();
                } else {
                    get().openOmnibar();
                }
            },

            setOmnibarQuery: (query) =>
                set((state) => ({
                    omnibar: { ...state.omnibar, query, selectedIndex: 0 },
                })),

            setOmnibarResults: (results) =>
                set((state) => ({
                    omnibar: { ...state.omnibar, results, selectedIndex: 0 },
                })),

            setOmnibarSelectedIndex: (selectedIndex) =>
                set((state) => ({
                    omnibar: { ...state.omnibar, selectedIndex },
                })),

            setOmnibarLoading: (isLoading) =>
                set((state) => ({
                    omnibar: { ...state.omnibar, isLoading },
                })),

            executeOmnibarAction: (result) => {
                if (result.action) {
                    result.action();
                }
                get().closeOmnibar();
            },

            // -----------------------------------------------------------------
            // Memory Graph
            // -----------------------------------------------------------------
            memoryGraph: initialMemoryGraphState,

            setMemoryNodes: (nodes) =>
                set((state) => ({
                    memoryGraph: { ...state.memoryGraph, nodes },
                })),

            setMemoryEdges: (edges) =>
                set((state) => ({
                    memoryGraph: { ...state.memoryGraph, edges },
                })),

            addMemoryNode: (node) =>
                set((state) => ({
                    memoryGraph: {
                        ...state.memoryGraph,
                        nodes: [...state.memoryGraph.nodes, node],
                    },
                })),

            addMemoryEdge: (edge) =>
                set((state) => ({
                    memoryGraph: {
                        ...state.memoryGraph,
                        edges: [...state.memoryGraph.edges, edge],
                    },
                })),

            selectMemoryNode: (nodeId) =>
                set((state) => ({
                    memoryGraph: { ...state.memoryGraph, selectedNodeId: nodeId },
                })),

            hoverMemoryNode: (nodeId) =>
                set((state) => ({
                    memoryGraph: { ...state.memoryGraph, hoveredNodeId: nodeId },
                })),

            setMemoryGraphLoading: (isLoading) =>
                set((state) => ({
                    memoryGraph: { ...state.memoryGraph, isLoading },
                })),

            // -----------------------------------------------------------------
            // PAC Timeline
            // -----------------------------------------------------------------
            pac: initialPACState,

            addPACItem: (item) =>
                set((state) => ({
                    pac: {
                        ...state.pac,
                        items: [
                            ...state.pac.items,
                            {
                                ...item,
                                id: crypto.randomUUID(),
                                createdAt: new Date(),
                                status: 'pending' as const,
                            },
                        ],
                    },
                })),

            updatePACItem: (id, updates) =>
                set((state) => ({
                    pac: {
                        ...state.pac,
                        items: state.pac.items.map((item) =>
                            item.id === id ? { ...item, ...updates } : item
                        ),
                    },
                })),

            snoozePACItem: (id, until) =>
                set((state) => ({
                    pac: {
                        ...state.pac,
                        items: state.pac.items.map((item) =>
                            item.id === id
                                ? { ...item, status: 'snoozed' as const, snoozedUntil: until }
                                : item
                        ),
                    },
                })),

            approvePACItem: (id) =>
                set((state) => ({
                    pac: {
                        ...state.pac,
                        items: state.pac.items.map((item) =>
                            item.id === id ? { ...item, status: 'approved' as const } : item
                        ),
                    },
                })),

            dismissPACItem: (id) =>
                set((state) => ({
                    pac: {
                        ...state.pac,
                        items: state.pac.items.map((item) =>
                            item.id === id ? { ...item, status: 'dismissed' as const } : item
                        ),
                    },
                })),

            togglePACExpanded: () =>
                set((state) => ({
                    pac: { ...state.pac, isExpanded: !state.pac.isExpanded },
                })),

            removePACItem: (id) =>
                set((state) => ({
                    pac: {
                        ...state.pac,
                        items: state.pac.items.filter((item) => item.id !== id),
                    },
                })),

            // -----------------------------------------------------------------
            // Council
            // -----------------------------------------------------------------
            council: initialCouncilState,

            startCouncilDeliberation: () =>
                set((state) => ({
                    council: {
                        ...state.council,
                        isActive: true,
                        isDeliberating: true,
                        thoughts: [],
                        verdict: null,
                    },
                })),

            addCouncilThought: (thought) =>
                set((state) => ({
                    council: {
                        ...state.council,
                        thoughts: [...state.council.thoughts, thought],
                    },
                })),

            setCouncilVerdict: (verdict) =>
                set((state) => ({
                    council: {
                        ...state.council,
                        verdict,
                        isDeliberating: false,
                    },
                })),

            resetCouncil: () =>
                set(() => ({
                    council: initialCouncilState,
                })),

            // -----------------------------------------------------------------
            // Settings
            // -----------------------------------------------------------------
            settings: initialSettingsState,

            setEngineMode: (engineMode) =>
                set((state) => ({
                    settings: { ...state.settings, engineMode },
                })),

            toggleEngineMode: () =>
                set((state) => ({
                    settings: {
                        ...state.settings,
                        engineMode: state.settings.engineMode === 'speed' ? 'deep' : 'speed',
                    },
                })),

            markWelcomeSeen: () =>
                set((state) => ({
                    settings: { ...state.settings, hasSeenWelcome: true },
                })),

            toggleSidebar: () =>
                set((state) => ({
                    settings: {
                        ...state.settings,
                        sidebarCollapsed: !state.settings.sidebarCollapsed,
                    },
                })),

            toggleMemoryPanel: () =>
                set((state) => ({
                    settings: {
                        ...state.settings,
                        memoryPanelCollapsed: !state.settings.memoryPanelCollapsed,
                    },
                })),

            // -----------------------------------------------------------------
            // Utility
            // -----------------------------------------------------------------
            reset: () =>
                set(() => ({
                    omnibar: initialOmnibarState,
                    memoryGraph: initialMemoryGraphState,
                    pac: initialPACState,
                    council: initialCouncilState,
                    settings: initialSettingsState,
                })),
        }),
        {
            name: 'yula-storage',
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({
                // Only persist settings and PAC items
                settings: state.settings,
                pac: state.pac,
            }),
        }
    )
);

// =============================================================================
// Selectors (for performance optimization)
// =============================================================================

export const useOmnibar = () => useYulaStore((state) => state.omnibar);
export const useMemoryGraph = () => useYulaStore((state) => state.memoryGraph);
export const usePAC = () => useYulaStore((state) => state.pac);
export const useCouncil = () => useYulaStore((state) => state.council);
export const useSettings = () => useYulaStore((state) => state.settings);
export const useEngineMode = () => useYulaStore((state) => state.settings.engineMode);
export const useHasSeenWelcome = () => useYulaStore((state) => state.settings.hasSeenWelcome);

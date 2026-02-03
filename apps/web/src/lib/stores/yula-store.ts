'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// ============================================
// TYPES
// ============================================

export interface MemoryNode {
    id: string;
    type: 'person' | 'project' | 'date' | 'preference' | 'idea' | 'location';
    label: string;
    content: string;
    connections: string[];
    createdAt: Date;
    updatedAt: Date;
    metadata?: Record<string, unknown>;
    position?: { x: number; y: number };
}

export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date;
    model?: string;
    persona?: 'logic' | 'creative' | 'prudent';
}

export interface Conversation {
    id: string;
    title: string;
    messages: ChatMessage[];
    mode: 'normal' | 'council';
    createdAt: Date;
    updatedAt: Date;
}

export interface PACItem {
    id: string;
    type: 'reminder' | 'suggestion' | 'follow-up' | 'insight';
    title: string;
    description: string;
    scheduledFor: Date;
    status: 'pending' | 'approved' | 'snoozed' | 'dismissed';
    snoozeUntil?: Date;
    priority: 'low' | 'medium' | 'high';
    relatedMemoryIds?: string[];
}

export interface YulaSettings {
    engineMode: 'speed' | 'deep';
    theme: 'dark' | 'light' | 'system';
    notifications: boolean;
    soundEffects: boolean;
    hasSeenWelcome: boolean;
    preferredModels: string[];
}

// ============================================
// MEMORY STORE
// ============================================

interface MemoryState {
    nodes: MemoryNode[];
    selectedNodeId: string | null;
    addNode: (node: Omit<MemoryNode, 'id' | 'createdAt' | 'updatedAt'>) => void;
    updateNode: (id: string, updates: Partial<MemoryNode>) => void;
    deleteNode: (id: string) => void;
    connectNodes: (fromId: string, toId: string) => void;
    disconnectNodes: (fromId: string, toId: string) => void;
    selectNode: (id: string | null) => void;
    searchNodes: (query: string) => MemoryNode[];
}

export const useMemoryStore = create<MemoryState>()(
    persist(
        (set, get) => ({
            nodes: [],
            selectedNodeId: null,

            addNode: (nodeData) => {
                const newNode: MemoryNode = {
                    ...nodeData,
                    id: `mem_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                };
                set((state) => ({ nodes: [...state.nodes, newNode] }));
            },

            updateNode: (id, updates) => {
                set((state) => ({
                    nodes: state.nodes.map((node) =>
                        node.id === id
                            ? { ...node, ...updates, updatedAt: new Date() }
                            : node
                    ),
                }));
            },

            deleteNode: (id) => {
                set((state) => ({
                    nodes: state.nodes
                        .filter((node) => node.id !== id)
                        .map((node) => ({
                            ...node,
                            connections: node.connections.filter((connId) => connId !== id),
                        })),
                    selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId,
                }));
            },

            connectNodes: (fromId, toId) => {
                set((state) => ({
                    nodes: state.nodes.map((node) => {
                        if (node.id === fromId && !node.connections.includes(toId)) {
                            return { ...node, connections: [...node.connections, toId] };
                        }
                        if (node.id === toId && !node.connections.includes(fromId)) {
                            return { ...node, connections: [...node.connections, fromId] };
                        }
                        return node;
                    }),
                }));
            },

            disconnectNodes: (fromId, toId) => {
                set((state) => ({
                    nodes: state.nodes.map((node) => {
                        if (node.id === fromId || node.id === toId) {
                            return {
                                ...node,
                                connections: node.connections.filter(
                                    (id) => id !== fromId && id !== toId
                                ),
                            };
                        }
                        return node;
                    }),
                }));
            },

            selectNode: (id) => set({ selectedNodeId: id }),

            searchNodes: (query) => {
                const lowerQuery = query.toLowerCase();
                return get().nodes.filter(
                    (node) =>
                        node.label.toLowerCase().includes(lowerQuery) ||
                        node.content.toLowerCase().includes(lowerQuery)
                );
            },
        }),
        {
            name: 'yula-memory-store',
            storage: createJSONStorage(() => localStorage),
        }
    )
);

// ============================================
// CHAT STORE
// ============================================

interface ChatState {
    conversations: Conversation[];
    activeConversationId: string | null;
    createConversation: (mode?: 'normal' | 'council') => string;
    addMessage: (conversationId: string, message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
    setActiveConversation: (id: string | null) => void;
    deleteConversation: (id: string) => void;
    getActiveConversation: () => Conversation | null;
}

export const useChatStore = create<ChatState>()(
    persist(
        (set, get) => ({
            conversations: [],
            activeConversationId: null,

            createConversation: (mode = 'normal') => {
                const newConversation: Conversation = {
                    id: `conv_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
                    title: 'New Conversation',
                    messages: [],
                    mode,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                };
                set((state) => ({
                    conversations: [newConversation, ...state.conversations],
                    activeConversationId: newConversation.id,
                }));
                return newConversation.id;
            },

            addMessage: (conversationId, messageData) => {
                const newMessage: ChatMessage = {
                    ...messageData,
                    id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
                    timestamp: new Date(),
                };
                set((state) => ({
                    conversations: state.conversations.map((conv) =>
                        conv.id === conversationId
                            ? {
                                  ...conv,
                                  messages: [...conv.messages, newMessage],
                                  updatedAt: new Date(),
                                  title:
                                      conv.messages.length === 0 && messageData.role === 'user'
                                          ? messageData.content.slice(0, 50)
                                          : conv.title,
                              }
                            : conv
                    ),
                }));
            },

            setActiveConversation: (id) => set({ activeConversationId: id }),

            deleteConversation: (id) => {
                set((state) => ({
                    conversations: state.conversations.filter((conv) => conv.id !== id),
                    activeConversationId:
                        state.activeConversationId === id ? null : state.activeConversationId,
                }));
            },

            getActiveConversation: () => {
                const state = get();
                return (
                    state.conversations.find((conv) => conv.id === state.activeConversationId) ||
                    null
                );
            },
        }),
        {
            name: 'yula-chat-store',
            storage: createJSONStorage(() => localStorage),
        }
    )
);

// ============================================
// PAC STORE
// ============================================

interface PACState {
    items: PACItem[];
    addItem: (item: Omit<PACItem, 'id' | 'status'>) => void;
    updateItem: (id: string, updates: Partial<PACItem>) => void;
    approveItem: (id: string) => void;
    snoozeItem: (id: string, duration: number) => void;
    dismissItem: (id: string) => void;
    getPendingItems: () => PACItem[];
    getUpcomingItems: () => PACItem[];
}

export const usePACStore = create<PACState>()(
    persist(
        (set, get) => ({
            items: [],

            addItem: (itemData) => {
                const newItem: PACItem = {
                    ...itemData,
                    id: `pac_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
                    status: 'pending',
                };
                set((state) => ({ items: [...state.items, newItem] }));
            },

            updateItem: (id, updates) => {
                set((state) => ({
                    items: state.items.map((item) =>
                        item.id === id ? { ...item, ...updates } : item
                    ),
                }));
            },

            approveItem: (id) => {
                set((state) => ({
                    items: state.items.map((item) =>
                        item.id === id ? { ...item, status: 'approved' } : item
                    ),
                }));
            },

            snoozeItem: (id, duration) => {
                const snoozeUntil = new Date(Date.now() + duration);
                set((state) => ({
                    items: state.items.map((item) =>
                        item.id === id ? { ...item, status: 'snoozed', snoozeUntil } : item
                    ),
                }));
            },

            dismissItem: (id) => {
                set((state) => ({
                    items: state.items.map((item) =>
                        item.id === id ? { ...item, status: 'dismissed' } : item
                    ),
                }));
            },

            getPendingItems: () => {
                return get().items.filter((item) => item.status === 'pending');
            },

            getUpcomingItems: () => {
                const now = new Date();
                return get()
                    .items.filter(
                        (item) =>
                            item.status === 'pending' ||
                            (item.status === 'snoozed' &&
                                item.snoozeUntil &&
                                new Date(item.snoozeUntil) <= now)
                    )
                    .sort(
                        (a, b) =>
                            new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime()
                    );
            },
        }),
        {
            name: 'yula-pac-store',
            storage: createJSONStorage(() => localStorage),
        }
    )
);

// ============================================
// SETTINGS STORE
// ============================================

interface SettingsState {
    settings: YulaSettings;
    updateSettings: (updates: Partial<YulaSettings>) => void;
    toggleEngineMode: () => void;
    markWelcomeSeen: () => void;
}

const defaultSettings: YulaSettings = {
    engineMode: 'speed',
    theme: 'dark',
    notifications: true,
    soundEffects: true,
    hasSeenWelcome: false,
    preferredModels: ['gpt-4', 'claude-3'],
};

export const useSettingsStore = create<SettingsState>()(
    persist(
        (set) => ({
            settings: defaultSettings,

            updateSettings: (updates) => {
                set((state) => ({
                    settings: { ...state.settings, ...updates },
                }));
            },

            toggleEngineMode: () => {
                set((state) => ({
                    settings: {
                        ...state.settings,
                        engineMode: state.settings.engineMode === 'speed' ? 'deep' : 'speed',
                    },
                }));
            },

            markWelcomeSeen: () => {
                set((state) => ({
                    settings: { ...state.settings, hasSeenWelcome: true },
                }));
            },
        }),
        {
            name: 'yula-settings-store',
            storage: createJSONStorage(() => localStorage),
        }
    )
);

// ============================================
// UI STATE STORE (non-persisted)
// ============================================

interface UIState {
    isOmnibarOpen: boolean;
    isWelcomeOpen: boolean;
    activeSidebarTab: 'chat' | 'memory' | 'pac' | 'settings';
    openOmnibar: () => void;
    closeOmnibar: () => void;
    toggleOmnibar: () => void;
    openWelcome: () => void;
    closeWelcome: () => void;
    setActiveSidebarTab: (tab: 'chat' | 'memory' | 'pac' | 'settings') => void;
}

export const useUIStore = create<UIState>((set) => ({
    isOmnibarOpen: false,
    isWelcomeOpen: false,
    activeSidebarTab: 'chat',

    openOmnibar: () => set({ isOmnibarOpen: true }),
    closeOmnibar: () => set({ isOmnibarOpen: false }),
    toggleOmnibar: () => set((state) => ({ isOmnibarOpen: !state.isOmnibarOpen })),
    openWelcome: () => set({ isWelcomeOpen: true }),
    closeWelcome: () => set({ isWelcomeOpen: false }),
    setActiveSidebarTab: (tab) => set({ activeSidebarTab: tab }),
}));

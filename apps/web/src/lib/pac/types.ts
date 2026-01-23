// ============================================
// PAC (Proactive Agentic Callback) Types
// ============================================

export type PACItemType = 'reminder' | 'suggestion' | 'alert' | 'insight';

export type PACItemStatus = 'pending' | 'delivered' | 'snoozed' | 'dismissed' | 'acted';

export interface PACItem {
    id: string;
    userId: string;
    type: PACItemType;
    title: string;
    description: string;
    scheduledFor: Date;
    status: PACItemStatus;
    priority: 'low' | 'medium' | 'high';
    context?: {
        conversationId?: string;
        relatedMemories?: string[];
        triggerReason?: string;
    };
    actions?: PACAction[];
    snoozedUntil?: Date;
    createdAt: Date;
    deliveredAt?: Date;
}

export interface PACAction {
    id: string;
    label: string;
    type: 'link' | 'api_call' | 'dismiss' | 'snooze';
    payload?: Record<string, unknown>;
}

export interface PACAnalysisResult {
    shouldNotify: boolean;
    items: Array<{
        type: PACItemType;
        title: string;
        description: string;
        priority: 'low' | 'medium' | 'high';
        triggerReason: string;
    }>;
}

// ============================================
// PAC Store State
// ============================================

export interface PACStore {
    items: PACItem[];
    isLoading: boolean;
    lastChecked: Date | null;

    // Actions
    addItem: (item: Omit<PACItem, 'id' | 'createdAt' | 'status'>) => void;
    removeItem: (id: string) => void;
    updateItem: (id: string, updates: Partial<PACItem>) => void;
    snoozeItem: (id: string, until: Date) => void;
    dismissItem: (id: string) => void;
    markDelivered: (id: string) => void;
    fetchItems: () => Promise<void>;
}

// Aspendos Shared Types
// These types are used across all services

// ============================================
// API Request/Response Types
// ============================================

export interface ChatMessage {
    id: string;
    chatId: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    modelUsed?: string;
    tokensIn?: number;
    tokensOut?: number;
    costUsd?: number;
    createdAt: string;
}

export interface Chat {
    id: string;
    userId: string;
    title: string;
    description?: string;
    modelPreference?: string;
    memoryScope: 'global' | 'project' | 'chat';
    projectId?: string;
    isArchived: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface Memory {
    id: string;
    userId: string;
    chatId?: string;
    content: string;
    type: 'context' | 'preference' | 'insight' | 'project';
    source?: string;
    importance: number;
    tags: string[];
    expiresAt?: string;
    createdAt: string;
}

// ============================================
// Model Router Types
// ============================================

export type RouteStrategy = 'LOWEST_COST' | 'LOWEST_LATENCY' | 'BALANCED' | 'USER_PREFERENCE';

export interface RouteRequest {
    userId: string;
    chatId: string;
    preferredModel?: string;
    messages: ChatMessage[];
    strategy: RouteStrategy;
    allowFallback: boolean;
}

export interface RouteResponse {
    selectedModel: string;
    provider: string;
    response: string;
    inputTokens: number;
    outputTokens: number;
    costUsd: number;
    latencyMs: number;
}

// ============================================
// Billing Types
// ============================================

export type Tier = 'PRO' | 'ULTRA' | 'ENTERPRISE';

export interface BillingStatus {
    plan: string;
    status: 'active' | 'past_due' | 'canceled';
    monthlyCredit: number;
    creditUsed: number;
    resetDate: string;
}

// ============================================
// Agent Types
// ============================================

export interface Agent {
    id: string;
    userId: string;
    name: string;
    description?: string;
    modelId: string;
    systemPrompt?: string;
    tools?: AgentTool[];
    isActive: boolean;
    isPublic: boolean;
}

export interface AgentTool {
    name: string;
    type: 'builtin' | 'mcp' | 'custom';
    config?: Record<string, unknown>;
}

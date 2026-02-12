/**
 * YULA SDK Types
 */

/**
 * Configuration options for YulaClient
 */
export interface YulaConfig {
  /** API key for authentication */
  apiKey: string;
  /** Base URL for the API (default: https://api.yula.dev) */
  baseUrl?: string;
}

/**
 * Chat message
 */
export interface ChatMessage {
  id: string;
  chatId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

/**
 * Chat object
 */
export interface Chat {
  id: string;
  title?: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  lastMessage?: ChatMessage;
}

/**
 * Options for sending a chat message
 */
export interface ChatSendOptions {
  /** Stream the response */
  stream?: boolean;
  /** Model to use for the response */
  model?: string;
  /** Enable memory/RAG for this message */
  enableMemory?: boolean;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Options for fetching chat history
 */
export interface ChatHistoryOptions {
  /** Number of messages to fetch */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
  /** Order direction */
  order?: 'asc' | 'desc';
}

/**
 * Chat export format
 */
export type ChatExportFormat = 'json' | 'markdown' | 'txt';

/**
 * Exported chat data
 */
export interface ExportedChat {
  chat: Chat;
  messages: ChatMessage[];
  format: ChatExportFormat;
  exportedAt: string;
}

/**
 * Memory object
 */
export interface Memory {
  id: string;
  content: string;
  embedding?: number[];
  metadata?: Record<string, unknown>;
  createdAt: string;
  lastAccessedAt?: string;
  score?: number;
}

/**
 * Options for memory search
 */
export interface MemorySearchOptions {
  /** Number of results to return */
  limit?: number;
  /** Minimum similarity score (0-1) */
  minScore?: number;
  /** Filter by metadata */
  filter?: Record<string, unknown>;
}

/**
 * Options for listing memories
 */
export interface MemoryListOptions {
  /** Number of memories to fetch */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
  /** Order by field */
  orderBy?: 'createdAt' | 'lastAccessedAt';
  /** Order direction */
  order?: 'asc' | 'desc';
}

/**
 * Template object
 */
export interface Template {
  id: string;
  name: string;
  description?: string;
  content: string;
  variables: string[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Template creation input
 */
export interface TemplateCreateInput {
  name: string;
  description?: string;
  content: string;
}

/**
 * Filled template result
 */
export interface FilledTemplate {
  content: string;
  variables: Record<string, string>;
}

/**
 * Council query response from a single model
 */
export interface CouncilModelResponse {
  model: string;
  response: string;
  confidence?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Council query response
 */
export interface CouncilResponse {
  query: string;
  responses: CouncilModelResponse[];
  consensus?: string;
  createdAt: string;
}

/**
 * Usage statistics
 */
export interface UsageStats {
  period: 'current' | 'month' | 'total';
  messages: number;
  tokens: number;
  memorySearches: number;
  councilQueries: number;
  limits?: {
    messages?: number;
    tokens?: number;
    memorySearches?: number;
    councilQueries?: number;
  };
}

/**
 * Subscription information
 */
export interface Subscription {
  plan: 'free' | 'pro' | 'enterprise';
  status: 'active' | 'cancelled' | 'past_due' | 'trialing';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
}

/**
 * Feature flag
 */
export interface Feature {
  name: string;
  enabled: boolean;
  description?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Health check status
 */
export interface HealthStatus {
  status: 'ok' | 'degraded' | 'down';
  version: string;
  uptime: number;
  services?: {
    database?: 'ok' | 'error';
    vectorStore?: 'ok' | 'error';
    ai?: 'ok' | 'error';
  };
}

/**
 * API Response wrapper
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

/**
 * Streaming message chunk
 */
export interface StreamChunk {
  type: 'content' | 'metadata' | 'done' | 'error';
  content?: string;
  metadata?: Record<string, unknown>;
  error?: string;
}

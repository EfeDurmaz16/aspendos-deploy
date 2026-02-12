/**
 * YULA API Client
 */

import type {
  YulaConfig,
  ChatMessage,
  Chat,
  ChatSendOptions,
  ChatHistoryOptions,
  ChatExportFormat,
  ExportedChat,
  Memory,
  MemorySearchOptions,
  MemoryListOptions,
  Template,
  TemplateCreateInput,
  FilledTemplate,
  CouncilResponse,
  UsageStats,
  Subscription,
  Feature,
  HealthStatus,
  ApiResponse,
  StreamChunk,
} from './types';

import {
  YulaError,
  YulaNetworkError,
  mapStatusToError,
} from './errors';

/**
 * YULA API Client
 */
export class YulaClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(config: YulaConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.yula.dev';
  }

  /**
   * Make a request to the API
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
      ...options.headers,
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        let errorData: any;
        try {
          errorData = await response.json();
        } catch {
          errorData = { message: response.statusText };
        }

        throw mapStatusToError(
          response.status,
          errorData.error?.message || errorData.message || 'Request failed',
          errorData.error?.details || errorData
        );
      }

      const data: ApiResponse<T> = await response.json();

      if (!data.success && data.error) {
        throw new YulaError(
          data.error.message,
          data.error.code,
          undefined,
          data.error.details
        );
      }

      return data.data as T;
    } catch (error) {
      if (error instanceof YulaError) {
        throw error;
      }
      throw new YulaNetworkError(
        error instanceof Error ? error.message : 'Unknown network error',
        error
      );
    }
  }

  /**
   * Stream a request from the API
   */
  private async *stream(
    endpoint: string,
    options: RequestInit = {}
  ): AsyncGenerator<StreamChunk> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
      ...options.headers,
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        let errorData: any;
        try {
          errorData = await response.json();
        } catch {
          errorData = { message: response.statusText };
        }

        throw mapStatusToError(
          response.status,
          errorData.error?.message || errorData.message || 'Request failed',
          errorData.error?.details || errorData
        );
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new YulaError('Response body is not readable', 'STREAM_ERROR');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) {
            continue;
          }

          const data = trimmed.slice(6);
          if (data === '[DONE]') {
            yield { type: 'done' };
            continue;
          }

          try {
            const parsed = JSON.parse(data);
            yield parsed as StreamChunk;
          } catch {
            // Skip invalid JSON
          }
        }
      }
    } catch (error) {
      if (error instanceof YulaError) {
        throw error;
      }
      throw new YulaNetworkError(
        error instanceof Error ? error.message : 'Unknown network error',
        error
      );
    }
  }

  /**
   * Chat methods
   */
  public chat = {
    /**
     * Send a message and get a response
     */
    send: async (
      chatId: string,
      message: string,
      options?: ChatSendOptions
    ): Promise<AsyncGenerator<StreamChunk> | ChatMessage> => {
      if (options?.stream) {
        return this.stream('/chat', {
          method: 'POST',
          body: JSON.stringify({
            chatId,
            message,
            ...options,
          }),
        });
      }

      return this.request<ChatMessage>('/chat', {
        method: 'POST',
        body: JSON.stringify({
          chatId,
          message,
          ...options,
          stream: false,
        }),
      });
    },

    /**
     * Get chat history
     */
    history: async (
      chatId: string,
      options?: ChatHistoryOptions
    ): Promise<ChatMessage[]> => {
      const params = new URLSearchParams();
      if (options?.limit) params.set('limit', options.limit.toString());
      if (options?.offset) params.set('offset', options.offset.toString());
      if (options?.order) params.set('order', options.order);

      return this.request<ChatMessage[]>(
        `/chat/${chatId}/history?${params.toString()}`
      );
    },

    /**
     * List all chats
     */
    list: async (): Promise<Chat[]> => {
      return this.request<Chat[]>('/chat');
    },

    /**
     * Create a new chat
     */
    create: async (title?: string): Promise<Chat> => {
      return this.request<Chat>('/chat', {
        method: 'POST',
        body: JSON.stringify({ title }),
      });
    },

    /**
     * Export a chat
     */
    export: async (
      chatId: string,
      format: ChatExportFormat = 'json'
    ): Promise<ExportedChat> => {
      return this.request<ExportedChat>(
        `/chat/${chatId}/export?format=${format}`
      );
    },

    /**
     * Fork a chat from a specific message
     */
    fork: async (chatId: string, messageId: string): Promise<Chat> => {
      return this.request<Chat>(`/chat/${chatId}/fork`, {
        method: 'POST',
        body: JSON.stringify({ messageId }),
      });
    },
  };

  /**
   * Memory methods
   */
  public memory = {
    /**
     * Search memories
     */
    search: async (
      query: string,
      options?: MemorySearchOptions
    ): Promise<Memory[]> => {
      return this.request<Memory[]>('/memory/search', {
        method: 'POST',
        body: JSON.stringify({
          query,
          ...options,
        }),
      });
    },

    /**
     * Store a memory
     */
    store: async (
      content: string,
      metadata?: Record<string, unknown>
    ): Promise<Memory> => {
      return this.request<Memory>('/memory', {
        method: 'POST',
        body: JSON.stringify({
          content,
          metadata,
        }),
      });
    },

    /**
     * List memories
     */
    list: async (options?: MemoryListOptions): Promise<Memory[]> => {
      const params = new URLSearchParams();
      if (options?.limit) params.set('limit', options.limit.toString());
      if (options?.offset) params.set('offset', options.offset.toString());
      if (options?.orderBy) params.set('orderBy', options.orderBy);
      if (options?.order) params.set('order', options.order);

      return this.request<Memory[]>(`/memory?${params.toString()}`);
    },

    /**
     * Delete a memory
     */
    delete: async (memoryId: string): Promise<{ success: boolean }> => {
      return this.request<{ success: boolean }>(`/memory/${memoryId}`, {
        method: 'DELETE',
      });
    },
  };

  /**
   * Template methods
   */
  public templates = {
    /**
     * List all templates
     */
    list: async (): Promise<Template[]> => {
      return this.request<Template[]>('/templates');
    },

    /**
     * Create a template
     */
    create: async (template: TemplateCreateInput): Promise<Template> => {
      return this.request<Template>('/templates', {
        method: 'POST',
        body: JSON.stringify(template),
      });
    },

    /**
     * Use a template with variables
     */
    use: async (
      templateId: string,
      variables: Record<string, string>
    ): Promise<FilledTemplate> => {
      return this.request<FilledTemplate>(`/templates/${templateId}/use`, {
        method: 'POST',
        body: JSON.stringify({ variables }),
      });
    },
  };

  /**
   * Council methods
   */
  public council = {
    /**
     * Query multiple AI models in parallel
     */
    query: async (
      message: string,
      models?: string[]
    ): Promise<CouncilResponse> => {
      return this.request<CouncilResponse>('/council/query', {
        method: 'POST',
        body: JSON.stringify({
          message,
          models,
        }),
      });
    },
  };

  /**
   * Billing methods
   */
  public billing = {
    /**
     * Get usage statistics
     */
    usage: async (): Promise<UsageStats> => {
      return this.request<UsageStats>('/billing/usage');
    },

    /**
     * Get subscription information
     */
    subscription: async (): Promise<Subscription> => {
      return this.request<Subscription>('/billing/subscription');
    },
  };

  /**
   * Feature methods
   */
  public features = {
    /**
     * List feature flags
     */
    list: async (): Promise<Feature[]> => {
      return this.request<Feature[]>('/features');
    },
  };

  /**
   * Health methods
   */
  public health = {
    /**
     * Check API health
     */
    check: async (): Promise<HealthStatus> => {
      return this.request<HealthStatus>('/health');
    },
  };
}

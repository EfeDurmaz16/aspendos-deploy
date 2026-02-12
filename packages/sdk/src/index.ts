/**
 * YULA SDK
 *
 * TypeScript SDK for the YULA AI Chat Platform
 *
 * @example
 * ```typescript
 * import { YulaClient } from '@yula/sdk';
 *
 * // Initialize the client
 * const client = new YulaClient({
 *   apiKey: 'your-api-key',
 *   baseUrl: 'https://api.yula.dev' // optional
 * });
 *
 * // Send a chat message
 * const response = await client.chat.send('chat-id', 'Hello!');
 *
 * // Stream a chat response
 * const stream = await client.chat.send('chat-id', 'Tell me a story', { stream: true });
 * for await (const chunk of stream) {
 *   if (chunk.type === 'content') {
 *     console.log(chunk.content);
 *   }
 * }
 *
 * // Search memories
 * const memories = await client.memory.search('vacation photos', {
 *   limit: 10,
 *   minScore: 0.7
 * });
 *
 * // Query council (multiple AI models)
 * const councilResponse = await client.council.query('What is the meaning of life?', [
 *   'gpt-4',
 *   'claude-3',
 *   'gemini-pro'
 * ]);
 *
 * // Check usage
 * const usage = await client.billing.usage();
 * console.log(`Messages used: ${usage.messages}/${usage.limits?.messages}`);
 * ```
 */

export { YulaClient } from './client';

export type {
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
  CouncilModelResponse,
  UsageStats,
  Subscription,
  Feature,
  HealthStatus,
  ApiResponse,
  StreamChunk,
} from './types';

export {
  YulaError,
  YulaAuthError,
  YulaRateLimitError,
  YulaNotFoundError,
  YulaBadRequestError,
  YulaServerError,
  YulaNetworkError,
} from './errors';

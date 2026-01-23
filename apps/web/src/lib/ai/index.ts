/**
 * YULA AI Module
 *
 * Unified AI layer using ONLY Vercel AI SDK.
 * All AI generation uses streamText and generateText.
 */

// Provider configuration
export {
    openai,
    anthropic,
    groq,
    getModel,
    getRouterModel,
    getFallbackRouterModel,
    MODEL_REGISTRY,
    FALLBACK_CHAIN,
    DEFAULT_MODEL,
    DEFAULT_ROUTER_MODEL,
    DEFAULT_CODING_MODEL,
    DEFAULT_FAST_MODEL,
    type ModelId,
    type ProviderType,
    type ModelConfig,
} from './providers';

// Text generation (streamText / generateText)
export {
    createStreamingCompletion,
    createCompletion,
    createRouterCompletion,
    createCodingCompletion,
    createFastCompletion,
    type GenerateOptions,
    type StreamChunk,
    type GenerateResult,
} from './generate';

// Routing
export {
    routeUserMessage,
    fastRoute,
    needsMemorySearch,
    isGreeting,
    AVAILABLE_TOOLS,
    type RouteDecision,
    type ToolName,
} from './router';

// Embeddings
export { createEmbedding, createEmbeddings, getEmbeddingDimension } from './embeddings';

// Memory extraction
export { extractMemoryInsights, summarizeConversation } from './memory';

// Hybrid pipeline
export { executeHybridRoute, createUnifiedStreamingCompletion, type HybridRouteResult } from './hybrid';

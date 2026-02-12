/**
 * YULA AI Module
 *
 * Unified AI layer using ONLY Vercel AI SDK.
 * All AI generation uses streamText and generateText.
 */

// Embeddings
export { createEmbedding, createEmbeddings, getEmbeddingDimension } from './embeddings';

// Text generation (streamText / generateText)
export {
    createCodingCompletion,
    createCompletion,
    createFastCompletion,
    createRouterCompletion,
    createStreamingCompletion,
    type GenerateOptions,
    type GenerateResult,
    type StreamChunk,
} from './generate';
// Hybrid pipeline
export {
    createUnifiedStreamingCompletion,
    executeHybridRoute,
    type HybridRouteResult,
} from './hybrid';
// Memory extraction
export { extractMemoryInsights, summarizeConversation } from './memory';
// Provider configuration
export {
    anthropic,
    DEFAULT_CODING_MODEL,
    DEFAULT_FAST_MODEL,
    DEFAULT_MODEL,
    DEFAULT_ROUTER_MODEL,
    FALLBACK_CHAIN,
    getFallbackRouterModel,
    getModel,
    getRouterModel,
    groq,
    MODEL_REGISTRY,
    type ModelConfig,
    type ModelId,
    openai,
    type ProviderType,
} from './providers';
// Routing
export {
    AVAILABLE_TOOLS,
    fastRoute,
    isGreeting,
    needsMemorySearch,
    type RouteDecision,
    routeUserMessage,
    type ToolName,
} from './router';

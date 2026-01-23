/**
 * Tests for Hybrid Router (Decision Engine)
 *
 * Tests the unified routing pipeline that coordinates between
 * Groq routing, memory search, and multi-model streaming.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the dependencies
vi.mock('@/lib/services/groq', () => ({
    routeUserMessage: vi.fn(),
    createGroqStreamingCompletion: vi.fn(),
    ROUTER_MODEL: 'llama-3.1-8b-instant',
}));

vi.mock('@/lib/services/openai', () => ({
    createStreamingChatCompletion: vi.fn(),
    createEmbedding: vi.fn(),
}));

vi.mock('@/lib/services/anthropic', () => ({
    createAnthropicStreamingCompletion: vi.fn(),
}));

vi.mock('@/lib/services/qdrant', () => ({
    searchMemories: vi.fn(),
}));

// Import after mocking
import { executeHybridRoute, createUnifiedStreamingCompletion, AVAILABLE_TOOLS } from '@/lib/services/hybrid-router';
import { routeUserMessage } from '@/lib/services/groq';
import { createStreamingChatCompletion as createOpenAIStream, createEmbedding } from '@/lib/services/openai';
import { createAnthropicStreamingCompletion } from '@/lib/services/anthropic';
import { searchMemories } from '@/lib/services/qdrant';

describe('Hybrid Router', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('executeHybridRoute', () => {
        it('should route a direct_reply decision without memory search', async () => {
            const mockDecision = {
                type: 'direct_reply' as const,
                model: 'gpt-4o-mini',
                reason: 'Simple greeting',
            };

            vi.mocked(routeUserMessage).mockResolvedValueOnce(mockDecision);
            vi.mocked(createEmbedding).mockResolvedValueOnce(new Array(1536).fill(0.1));
            vi.mocked(searchMemories).mockResolvedValueOnce([]);

            const result = await executeHybridRoute('Hello!', 'user-123');

            expect(routeUserMessage).toHaveBeenCalledWith('Hello!', {
                recentMessages: undefined,
            });
            expect(result.decision).toEqual(mockDecision);
            expect(result.memories).toEqual([]);
        });

        it('should perform RAG search for rag_search decisions', async () => {
            const mockDecision = {
                type: 'rag_search' as const,
                query: 'travel plans',
                model: 'gpt-4o',
                reason: 'User asking about past plans',
            };

            const mockMemories = [
                { content: 'User plans to visit Paris in March', score: 0.95 },
                { content: 'User prefers business class flights', score: 0.85 },
            ];

            vi.mocked(routeUserMessage).mockResolvedValueOnce(mockDecision);
            vi.mocked(createEmbedding).mockResolvedValueOnce(new Array(1536).fill(0.2));
            vi.mocked(searchMemories).mockResolvedValueOnce(mockMemories.map(m => ({
                id: 'mem-' + Math.random(),
                ...m,
                type: 'context',
                conversationId: 'conv-1',
                createdAt: new Date().toISOString(),
            })));

            const result = await executeHybridRoute('What are my travel plans?', 'user-123');

            expect(createEmbedding).toHaveBeenCalledWith('travel plans');
            expect(searchMemories).toHaveBeenCalled();
            expect(result.memoryContext).toContain('User plans to visit Paris in March');
            expect(result.memories).toHaveLength(2);
        });

        it('should skip router when forceModel is provided', async () => {
            const result = await executeHybridRoute('Hello', 'user-123', {
                skipRouter: true,
                forceModel: 'claude-3-haiku-20240307',
            });

            expect(routeUserMessage).not.toHaveBeenCalled();
            expect(result.decision.type).toBe('direct_reply');
            if (result.decision.type === 'direct_reply') {
                expect(result.decision.model).toBe('claude-3-haiku-20240307');
            }
        });

        it('should include recent messages in context', async () => {
            vi.mocked(routeUserMessage).mockResolvedValueOnce({
                type: 'direct_reply',
                model: 'gpt-4o-mini',
                reason: 'Follow-up question',
            });
            vi.mocked(createEmbedding).mockResolvedValueOnce(new Array(1536).fill(0.1));
            vi.mocked(searchMemories).mockResolvedValueOnce([]);

            await executeHybridRoute('What about that?', 'user-123', {
                recentMessages: ['User: I have a coding problem', 'Assistant: Tell me more'],
            });

            expect(routeUserMessage).toHaveBeenCalledWith('What about that?', {
                recentMessages: ['User: I have a coding problem', 'Assistant: Tell me more'],
            });
        });

        it('should handle memory search errors gracefully', async () => {
            vi.mocked(routeUserMessage).mockResolvedValueOnce({
                type: 'rag_search',
                query: 'test query',
                model: 'gpt-4o',
                reason: 'Test',
            });
            vi.mocked(createEmbedding).mockRejectedValueOnce(new Error('Embedding failed'));

            const result = await executeHybridRoute('What did I say?', 'user-123');

            // Should still return a result, just without memories
            expect(result.decision.type).toBe('rag_search');
            expect(result.memoryContext).toBe('');
            expect(result.memories).toEqual([]);
        });
    });

    describe('createUnifiedStreamingCompletion', () => {
        it('should route to OpenAI for GPT models', async () => {
            const mockStream = (async function* () {
                yield { type: 'text' as const, content: 'Hello' };
                yield { type: 'text' as const, content: ' there!' };
                yield { type: 'done' as const, content: '' };
            })();

            vi.mocked(createOpenAIStream).mockReturnValueOnce(mockStream);

            const messages = [{ role: 'user' as const, content: 'Hi' }];
            const stream = createUnifiedStreamingCompletion(messages, { model: 'gpt-4o-mini' });

            const chunks: string[] = [];
            for await (const chunk of stream) {
                if (chunk.type === 'text') {
                    chunks.push(chunk.content);
                }
            }

            expect(createOpenAIStream).toHaveBeenCalledWith(messages, expect.objectContaining({
                model: 'gpt-4o-mini',
            }));
            expect(chunks).toEqual(['Hello', ' there!']);
        });

        it('should route to Anthropic for Claude models', async () => {
            const mockStream = (async function* () {
                yield { type: 'text' as const, content: 'Response from Claude' };
                yield { type: 'done' as const, content: '' };
            })();

            vi.mocked(createAnthropicStreamingCompletion).mockReturnValueOnce(mockStream);

            const messages = [
                { role: 'system' as const, content: 'You are helpful' },
                { role: 'user' as const, content: 'Hi' },
            ];
            const stream = createUnifiedStreamingCompletion(messages, {
                model: 'claude-3-5-sonnet-20241022',
            });

            const chunks: string[] = [];
            for await (const chunk of stream) {
                if (chunk.type === 'text') {
                    chunks.push(chunk.content);
                }
            }

            expect(createAnthropicStreamingCompletion).toHaveBeenCalledWith(
                [{ role: 'user', content: 'Hi' }],
                expect.objectContaining({
                    model: 'claude-3-5-sonnet-20241022',
                    systemPrompt: 'You are helpful',
                })
            );
        });

        it('should fallback to next model on failure', async () => {
            // First model fails
            vi.mocked(createOpenAIStream).mockImplementationOnce(() => {
                throw new Error('OpenAI rate limit');
            });

            // Fallback to Claude succeeds
            const mockStream = (async function* () {
                yield { type: 'text' as const, content: 'Fallback response' };
                yield { type: 'done' as const, content: '' };
            })();
            vi.mocked(createAnthropicStreamingCompletion).mockReturnValueOnce(mockStream);

            const messages = [{ role: 'user' as const, content: 'Test' }];
            const stream = createUnifiedStreamingCompletion(messages, { model: 'gpt-4o' });

            const results: Array<{ type: string; content: string }> = [];
            for await (const chunk of stream) {
                results.push(chunk);
            }

            // Should have fallback notification
            const fallbackChunk = results.find(r => r.type === 'fallback');
            expect(fallbackChunk).toBeDefined();
            expect(fallbackChunk?.content).toContain('claude-3-5-sonnet-20241022');
        });

        it('should return error when all models fail', async () => {
            vi.mocked(createOpenAIStream).mockImplementation(() => {
                throw new Error('OpenAI failed');
            });
            vi.mocked(createAnthropicStreamingCompletion).mockImplementation(() => {
                throw new Error('Anthropic failed');
            });

            // Mock Groq as well since it's in the fallback chain
            const { createGroqStreamingCompletion } = await import('@/lib/services/groq');
            vi.mocked(createGroqStreamingCompletion).mockImplementation(() => {
                throw new Error('Groq failed');
            });

            const messages = [{ role: 'user' as const, content: 'Test' }];
            const stream = createUnifiedStreamingCompletion(messages, { model: 'gpt-4o' });

            const results: Array<{ type: string; content: string }> = [];
            for await (const chunk of stream) {
                results.push(chunk);
            }

            const errorChunk = results.find(r => r.type === 'error');
            expect(errorChunk).toBeDefined();
            expect(errorChunk?.content).toContain('All models failed');
        });
    });

    describe('AVAILABLE_TOOLS', () => {
        it('should export web_search tool', () => {
            expect(AVAILABLE_TOOLS.web_search).toBeDefined();
            expect(AVAILABLE_TOOLS.web_search.name).toBe('web_search');
            expect(AVAILABLE_TOOLS.web_search.params).toContain('query');
        });

        it('should export image_generation tool', () => {
            expect(AVAILABLE_TOOLS.image_generation).toBeDefined();
            expect(AVAILABLE_TOOLS.image_generation.params).toContain('prompt');
            expect(AVAILABLE_TOOLS.image_generation.params).toContain('style');
        });

        it('should export code_execution tool', () => {
            expect(AVAILABLE_TOOLS.code_execution).toBeDefined();
            expect(AVAILABLE_TOOLS.code_execution.params).toContain('language');
            expect(AVAILABLE_TOOLS.code_execution.params).toContain('code');
        });
    });
});

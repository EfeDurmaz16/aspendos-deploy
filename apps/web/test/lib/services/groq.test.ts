/**
 * Tests for Groq Router Service
 *
 * This tests the routing decision engine that determines how to handle user messages.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockGenerateText, mockGateway } = vi.hoisted(() => ({
    mockGenerateText: vi.fn(),
    mockGateway: vi.fn((modelId: string) => modelId),
}));

vi.mock('ai', () => ({
    gateway: mockGateway,
    generateText: mockGenerateText,
    streamText: vi.fn(),
}));

// Import after mocking
import { routeUserMessage, ROUTER_MODEL, type RouteDecision } from '@/lib/services/groq';

describe('Groq Router Service', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('routeUserMessage', () => {
        it('should route simple greetings to direct_reply', async () => {
            const mockResponse: RouteDecision = {
                type: 'direct_reply',
                model: 'gpt-5-mini',
                reason: 'Simple greeting, use fast model',
            };

            mockGenerateText.mockResolvedValueOnce({ text: JSON.stringify(mockResponse) });

            const result = await routeUserMessage('Hello!');

            expect(result.type).toBe('direct_reply');
            if (result.type === 'direct_reply') {
                expect(result.model).toBe('gpt-5-mini');
            }
            expect(mockGenerateText).toHaveBeenCalledWith(
                expect.objectContaining({
                    model: `groq/${ROUTER_MODEL}`,
                })
            );
        });

        it('should route memory queries to rag_search', async () => {
            const mockResponse: RouteDecision = {
                type: 'rag_search',
                query: 'travel plans Paris',
                model: 'gpt-4o-mini',
                reason: 'User asking about past conversations',
            };

            mockGenerateText.mockResolvedValueOnce({ text: JSON.stringify(mockResponse) });

            const result = await routeUserMessage('What did I say about my travel plans to Paris?');

            expect(result.type).toBe('rag_search');
            if (result.type === 'rag_search') {
                expect(result.query).toBe('travel plans Paris');
            }
        });

        it('should route tool requests to tool_call', async () => {
            const mockResponse: RouteDecision = {
                type: 'tool_call',
                tool: 'web_search',
                params: { query: 'latest news on AI' },
                reason: 'User wants external information',
            };

            mockGenerateText.mockResolvedValueOnce({ text: JSON.stringify(mockResponse) });

            const result = await routeUserMessage('Search the web for latest AI news');

            expect(result.type).toBe('tool_call');
            if (result.type === 'tool_call') {
                expect(result.tool).toBe('web_search');
                expect(result.params).toEqual({ query: 'latest news on AI' });
            }
        });

        it('should route reminder requests to proactive_schedule', async () => {
            const mockResponse: RouteDecision = {
                type: 'proactive_schedule',
                schedule: { time: '5pm', action: 'Call mom' },
                reason: 'User wants a reminder',
            };

            mockGenerateText.mockResolvedValueOnce({ text: JSON.stringify(mockResponse) });

            const result = await routeUserMessage('Remind me to call mom at 5pm');

            expect(result.type).toBe('proactive_schedule');
            if (result.type === 'proactive_schedule') {
                expect(result.schedule.time).toBe('5pm');
                expect(result.schedule.action).toBe('Call mom');
            }
        });

        it('should fallback to direct_reply when router fails', async () => {
            // Primary router fails
            mockGenerateText.mockRejectedValueOnce(new Error('API Error'));
            // Fallback also fails
            mockGenerateText.mockRejectedValueOnce(new Error('Fallback Error'));

            const result = await routeUserMessage('Hello');

            expect(result.type).toBe('direct_reply');
            if (result.type === 'direct_reply') {
                expect(result.model).toBe('gpt-5-mini');
                expect(result.reason).toContain('fallback');
            }
        });

        it('should use context when provided', async () => {
            const mockResponse: RouteDecision = {
                type: 'direct_reply',
                model: 'gpt-5',
                reason: 'Complex question with context',
            };

            mockGenerateText.mockResolvedValueOnce({ text: JSON.stringify(mockResponse) });

            await routeUserMessage('What do you think about that?', {
                recentMessages: [
                    'User: I have a complex coding problem',
                    'Assistant: Tell me more',
                ],
            });

            // Verify context was included in the call
            expect(mockGenerateText).toHaveBeenCalledWith(
                expect.objectContaining({
                    prompt: expect.stringContaining('Recent conversation context'),
                })
            );
        });

        it('should handle empty responses gracefully', async () => {
            // Return empty content
            mockGenerateText.mockResolvedValueOnce({ text: '' });
            // Fallback also returns empty
            mockGenerateText.mockResolvedValueOnce({ text: '' });

            const result = await routeUserMessage('Test message');

            // Should fall back to default
            expect(result.type).toBe('direct_reply');
        });

        it('should extract JSON from malformed responses', async () => {
            // Primary fails
            mockGenerateText.mockRejectedValueOnce(new Error('Primary failed'));

            // Fallback returns JSON embedded in text
            mockGenerateText.mockResolvedValueOnce({
                text: 'Here is the decision: {"type": "direct_reply", "model": "gpt-5-mini", "reason": "Simple query"} done.',
            });

            const result = await routeUserMessage('Hello');

            expect(result.type).toBe('direct_reply');
            if (result.type === 'direct_reply') {
                expect(result.model).toBe('gpt-5-mini');
            }
        });
    });
});

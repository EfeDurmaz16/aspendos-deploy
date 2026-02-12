/**
 * Tests for Groq Router Service
 *
 * This tests the routing decision engine that determines how to handle user messages.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the entire groq-sdk module before importing our module
const mockCreate = vi.fn();
vi.mock('groq-sdk', () => ({
    default: class MockGroq {
        chat = {
            completions: {
                create: mockCreate,
            },
        };
    },
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
                model: 'gpt-4o-mini',
                reason: 'Simple greeting, use fast model',
            };

            mockCreate.mockResolvedValueOnce({
                choices: [
                    {
                        message: {
                            content: JSON.stringify(mockResponse),
                        },
                    },
                ],
            });

            const result = await routeUserMessage('Hello!');

            expect(result.type).toBe('direct_reply');
            if (result.type === 'direct_reply') {
                expect(result.model).toBe('gpt-4o-mini');
            }
            expect(mockCreate).toHaveBeenCalledWith(
                expect.objectContaining({
                    model: ROUTER_MODEL,
                    response_format: { type: 'json_object' },
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

            mockCreate.mockResolvedValueOnce({
                choices: [
                    {
                        message: {
                            content: JSON.stringify(mockResponse),
                        },
                    },
                ],
            });

            const result = await routeUserMessage(
                'What did I say about my travel plans to Paris?'
            );

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

            mockCreate.mockResolvedValueOnce({
                choices: [
                    {
                        message: {
                            content: JSON.stringify(mockResponse),
                        },
                    },
                ],
            });

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

            mockCreate.mockResolvedValueOnce({
                choices: [
                    {
                        message: {
                            content: JSON.stringify(mockResponse),
                        },
                    },
                ],
            });

            const result = await routeUserMessage('Remind me to call mom at 5pm');

            expect(result.type).toBe('proactive_schedule');
            if (result.type === 'proactive_schedule') {
                expect(result.schedule.time).toBe('5pm');
                expect(result.schedule.action).toBe('Call mom');
            }
        });

        it('should fallback to direct_reply when router fails', async () => {
            // Primary router fails
            mockCreate.mockRejectedValueOnce(new Error('API Error'));
            // Fallback also fails
            mockCreate.mockRejectedValueOnce(new Error('Fallback Error'));

            const result = await routeUserMessage('Hello');

            expect(result.type).toBe('direct_reply');
            if (result.type === 'direct_reply') {
                expect(result.model).toBe('gpt-4o-mini');
                expect(result.reason).toContain('fallback');
            }
        });

        it('should use context when provided', async () => {
            const mockResponse: RouteDecision = {
                type: 'direct_reply',
                model: 'gpt-4o',
                reason: 'Complex question with context',
            };

            mockCreate.mockResolvedValueOnce({
                choices: [
                    {
                        message: {
                            content: JSON.stringify(mockResponse),
                        },
                    },
                ],
            });

            await routeUserMessage('What do you think about that?', {
                recentMessages: ['User: I have a complex coding problem', 'Assistant: Tell me more'],
            });

            // Verify context was included in the call
            expect(mockCreate).toHaveBeenCalledWith(
                expect.objectContaining({
                    messages: expect.arrayContaining([
                        expect.objectContaining({
                            role: 'user',
                            content: expect.stringContaining('Recent conversation context'),
                        }),
                    ]),
                })
            );
        });

        it('should handle empty responses gracefully', async () => {
            // Return empty content
            mockCreate.mockResolvedValueOnce({
                choices: [{ message: { content: null } }],
            });
            // Fallback also returns empty
            mockCreate.mockResolvedValueOnce({
                choices: [{ message: { content: '' } }],
            });

            const result = await routeUserMessage('Test message');

            // Should fall back to default
            expect(result.type).toBe('direct_reply');
        });

        it('should extract JSON from malformed responses', async () => {
            // Primary fails
            mockCreate.mockRejectedValueOnce(new Error('Primary failed'));

            // Fallback returns JSON embedded in text
            mockCreate.mockResolvedValueOnce({
                choices: [
                    {
                        message: {
                            content:
                                'Here is the decision: {"type": "direct_reply", "model": "gpt-4o-mini", "reason": "Simple query"} done.',
                        },
                    },
                ],
            });

            const result = await routeUserMessage('Hello');

            expect(result.type).toBe('direct_reply');
            if (result.type === 'direct_reply') {
                expect(result.model).toBe('gpt-4o-mini');
            }
        });
    });
});

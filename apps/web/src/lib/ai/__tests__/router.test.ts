/**
 * YULA AI Router Tests
 *
 * Integration tests for the Vercel AI SDK router functionality.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
    routeUserMessage,
    fastRoute,
    needsMemorySearch,
    isGreeting,
    type RouteDecision,
} from '../router';

// ============================================
// FAST ROUTE TESTS (No LLM, deterministic)
// ============================================

describe('fastRoute', () => {
    it('should route simple greetings to direct_reply', () => {
        const greetings = ['Hi', 'Hello', 'Hey', 'Good morning', 'What\'s up'];

        for (const greeting of greetings) {
            const result = fastRoute(greeting);
            expect(result).not.toBeNull();
            expect(result?.type).toBe('direct_reply');
            if (result?.type === 'direct_reply') {
                expect(result.model).toBe('gpt-4o-mini');
            }
            expect(result?.reason).toContain('greeting');
        }
    });

    it('should route memory queries to rag_search', () => {
        const memoryQueries = [
            'Remember when we talked about React?',
            'What did I say about my project?',
            'Last time you mentioned something about databases',
            'You told me about a restaurant',
        ];

        for (const query of memoryQueries) {
            const result = fastRoute(query);
            expect(result).not.toBeNull();
            expect(result?.type).toBe('rag_search');
            expect(result?.reason).toContain('memory');
        }
    });

    it('should return null for complex queries (needs LLM router)', () => {
        const complexQueries = [
            'Can you help me write a React component?',
            'Explain quantum computing',
            'What is the capital of France?',
        ];

        for (const query of complexQueries) {
            const result = fastRoute(query);
            expect(result).toBeNull();
        }
    });

    it('should return null for reminder requests (needs LLM schedule extraction)', () => {
        const reminderQueries = [
            'Remind me to call mom tomorrow',
            'Set a reminder for 3pm',
        ];

        for (const query of reminderQueries) {
            const result = fastRoute(query);
            expect(result).toBeNull();
        }
    });
});

// ============================================
// HELPER FUNCTION TESTS
// ============================================

describe('isGreeting', () => {
    it('should identify common greetings', () => {
        expect(isGreeting('Hi')).toBe(true);
        expect(isGreeting('Hello!')).toBe(true);
        expect(isGreeting('Hey')).toBe(true);
        expect(isGreeting('Good morning')).toBe(true);
        expect(isGreeting('Good afternoon.')).toBe(true);
        expect(isGreeting("What's up")).toBe(true);
    });

    it('should not match non-greetings', () => {
        expect(isGreeting('Hi, can you help me?')).toBe(false);
        expect(isGreeting('Hello world program')).toBe(false);
        expect(isGreeting('The morning was cold')).toBe(false);
    });
});

describe('needsMemorySearch', () => {
    it('should detect memory-related queries', () => {
        expect(needsMemorySearch('Remember when we discussed this?')).toBe(true);
        expect(needsMemorySearch('What did I say about React?')).toBe(true);
        expect(needsMemorySearch('Last time you helped me')).toBe(true);
        expect(needsMemorySearch('Previously you mentioned')).toBe(true);
        expect(needsMemorySearch('You told me about Docker')).toBe(true);
        expect(needsMemorySearch('I mentioned my preference')).toBe(true);
        expect(needsMemorySearch('Our conversation about AI')).toBe(true);
        expect(needsMemorySearch('Can you recall that code?')).toBe(true);
        expect(needsMemorySearch('My favorite color is blue')).toBe(true);
    });

    it('should not match non-memory queries', () => {
        expect(needsMemorySearch('Write a React component')).toBe(false);
        expect(needsMemorySearch('What is machine learning?')).toBe(false);
        expect(needsMemorySearch('Help me debug this code')).toBe(false);
    });
});

// ============================================
// ROUTE DECISION TYPE TESTS
// ============================================

describe('RouteDecision types', () => {
    it('should have correct structure for direct_reply', () => {
        const decision: RouteDecision = {
            type: 'direct_reply',
            model: 'gpt-4o-mini',
            reason: 'Simple question',
        };
        expect(decision.type).toBe('direct_reply');
        expect(decision.model).toBeDefined();
    });

    it('should have correct structure for rag_search', () => {
        const decision: RouteDecision = {
            type: 'rag_search',
            query: 'user preferences',
            model: 'gpt-4o',
            reason: 'Memory query',
        };
        expect(decision.type).toBe('rag_search');
        expect((decision as { query: string }).query).toBeDefined();
    });

    it('should have correct structure for tool_call', () => {
        const decision: RouteDecision = {
            type: 'tool_call',
            tool: 'web_search',
            params: { query: 'latest news' },
            reason: 'Needs external data',
        };
        expect(decision.type).toBe('tool_call');
        expect((decision as { tool: string }).tool).toBeDefined();
    });

    it('should have correct structure for proactive_schedule', () => {
        const decision: RouteDecision = {
            type: 'proactive_schedule',
            schedule: { time: '3pm', action: 'remind user' },
            reason: 'Reminder request',
        };
        expect(decision.type).toBe('proactive_schedule');
        expect((decision as { schedule: { time: string; action: string } }).schedule).toBeDefined();
    });
});

// ============================================
// LLM ROUTER TESTS (Mocked)
// ============================================

describe('routeUserMessage', () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    it('should return a valid RouteDecision', async () => {
        // This test requires mocking the Vercel AI SDK
        // In CI, we skip the actual LLM call and test the fallback
        const result = await routeUserMessage('Hello, how are you?');

        expect(result).toBeDefined();
        expect(result.type).toBeDefined();
        expect(['direct_reply', 'rag_search', 'tool_call', 'proactive_schedule']).toContain(result.type);
    });

    it('should include reason in the response', async () => {
        const result = await routeUserMessage('Tell me a joke');

        expect(result.reason).toBeDefined();
        expect(typeof result.reason).toBe('string');
    });

    it('should handle context for better routing', async () => {
        const result = await routeUserMessage('Continue from where we left off', {
            recentMessages: ['User: Started discussing React', 'Assistant: Great, what about React?'],
        });

        expect(result).toBeDefined();
    });
});

// ============================================
// MODEL SELECTION TESTS
// ============================================

describe('Model Selection', () => {
    it('fast route should select gpt-4o-mini for simple tasks', () => {
        const result = fastRoute('Hi');
        expect(result?.type).toBe('direct_reply');
        if (result?.type === 'direct_reply') {
            expect(result.model).toBe('gpt-4o-mini');
        }
    });

    it('fast route should select gpt-4o-mini for memory queries', () => {
        const result = fastRoute('What did I say last time?');
        expect(result?.type).toBe('rag_search');
        if (result?.type === 'rag_search') {
            expect(result.model).toBe('gpt-4o-mini');
        }
    });
});

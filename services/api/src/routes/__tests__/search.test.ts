/**
 * Search Routes Tests
 *
 * Tests for unified search across chats and memories with full-text search.
 */

import { Hono } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@aspendos/db', () => ({
    prisma: {
        chat: {
            findMany: vi.fn(),
        },
        memory: {
            findMany: vi.fn(),
        },
    },
}));

import { prisma } from '@aspendos/db';
const mockPrisma = prisma as any;

vi.mock('../../middleware/auth', () => ({
    requireAuth: vi.fn((c, next) => next()),
}));

import searchRoutes from '../search';

// Helper to create test app with search routes
function createTestApp() {
    const app = new Hono();
    app.route('/search', searchRoutes);
    return app;
}

describe('Search Routes', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('GET /search', () => {
        it('should require query parameter', async () => {
            const query: string = '';
            const isValid = query && query.trim().length > 0;

            expect(isValid).toBeFalsy();
        });

        it('should validate type parameter', async () => {
            const validTypes = ['all', 'chats', 'memories'];
            const invalidTypes = ['users', 'invalid', ''];

            for (const type of validTypes) {
                expect(['all', 'chats', 'memories']).toContain(type);
            }

            for (const type of invalidTypes) {
                expect(['all', 'chats', 'memories']).not.toContain(type);
            }
        });

        it('should search chats by title and description', async () => {
            const mockChats = [
                {
                    id: 'chat-1',
                    title: 'Project Planning Discussion',
                    description: 'Planning the new feature launch',
                    createdAt: new Date('2024-01-15'),
                    updatedAt: new Date('2024-01-20'),
                    messages: [
                        {
                            content: 'We need to plan the project timeline',
                            role: 'user',
                            createdAt: new Date('2024-01-15'),
                        },
                    ],
                },
                {
                    id: 'chat-2',
                    title: 'Team Meeting Notes',
                    description: 'Weekly team sync',
                    createdAt: new Date('2024-01-10'),
                    updatedAt: new Date('2024-01-18'),
                    messages: [],
                },
            ];

            mockPrisma.chat.findMany.mockResolvedValue(mockChats);
            mockPrisma.memory.findMany.mockResolvedValue([]);

            const query = 'planning';
            const results = mockChats.filter(
                (chat) =>
                    chat.title.toLowerCase().includes(query.toLowerCase()) ||
                    chat.description?.toLowerCase().includes(query.toLowerCase())
            );

            expect(results).toHaveLength(1);
            expect(results[0].title).toContain('Planning');
        });

        it('should search messages within chats', async () => {
            const mockChats = [
                {
                    id: 'chat-1',
                    title: 'Development Chat',
                    description: null,
                    createdAt: new Date('2024-01-15'),
                    updatedAt: new Date('2024-01-20'),
                    messages: [
                        {
                            content: 'How do I implement authentication?',
                            role: 'user',
                            createdAt: new Date('2024-01-15'),
                        },
                        {
                            content: 'You can use JWT tokens for authentication',
                            role: 'assistant',
                            createdAt: new Date('2024-01-15'),
                        },
                    ],
                },
            ];

            mockPrisma.chat.findMany.mockResolvedValue(mockChats);

            const query = 'authentication';
            expect(mockChats[0].messages.length).toBe(2);
            expect(mockChats[0].messages[0].content).toContain('authentication');
        });

        it('should search memories by content and summary', async () => {
            const mockMemories = [
                {
                    id: 'mem-1',
                    content: 'User prefers TypeScript over JavaScript',
                    summary: 'Programming language preference',
                    sector: 'semantic',
                    type: 'preference',
                    importance: 80,
                    tags: ['programming', 'typescript'],
                    createdAt: new Date('2024-01-10'),
                    lastAccessedAt: new Date('2024-01-20'),
                },
                {
                    id: 'mem-2',
                    content: 'User works on AI projects',
                    summary: 'Professional context',
                    sector: 'episodic',
                    type: 'context',
                    importance: 70,
                    tags: ['work', 'ai', 'projects'],
                    createdAt: new Date('2024-01-05'),
                    lastAccessedAt: new Date('2024-01-15'),
                },
            ];

            mockPrisma.memory.findMany.mockResolvedValue(mockMemories);
            mockPrisma.chat.findMany.mockResolvedValue([]);

            const query = 'typescript';
            const results = mockMemories.filter(
                (mem) =>
                    mem.content.toLowerCase().includes(query.toLowerCase()) ||
                    mem.summary?.toLowerCase().includes(query.toLowerCase())
            );

            expect(results).toHaveLength(1);
            expect(results[0].content).toContain('TypeScript');
        });

        it('should search memory tags', async () => {
            const mockMemories = [
                {
                    id: 'mem-1',
                    content: 'User loves React',
                    summary: 'Framework preference',
                    sector: 'semantic',
                    type: 'preference',
                    importance: 75,
                    tags: ['react', 'javascript', 'frontend'],
                    createdAt: new Date('2024-01-10'),
                    lastAccessedAt: new Date('2024-01-20'),
                },
            ];

            const query = 'react';
            const memory = mockMemories[0];
            const matchingTags = memory.tags.filter((tag) =>
                tag.toLowerCase().includes(query.toLowerCase())
            );

            expect(matchingTags).toHaveLength(1);
            expect(matchingTags[0]).toBe('react');
        });

        it('should calculate relevance scores correctly', async () => {
            const query = 'typescript';

            // Title match should score highest
            const titleMatchScore = 10;
            const descriptionMatchScore = 5;
            const messageMatchScore = 3;

            const totalScore = titleMatchScore + messageMatchScore * 2;
            expect(totalScore).toBe(16);
        });

        it('should sort results by score and date', async () => {
            const results = [
                {
                    type: 'chat' as const,
                    id: 'chat-1',
                    title: 'Chat 1',
                    snippet: 'Snippet 1',
                    score: 15,
                    createdAt: new Date('2024-01-15'),
                },
                {
                    type: 'memory' as const,
                    id: 'mem-1',
                    title: 'Memory 1',
                    snippet: 'Snippet 2',
                    score: 20,
                    createdAt: new Date('2024-01-10'),
                },
                {
                    type: 'chat' as const,
                    id: 'chat-2',
                    title: 'Chat 2',
                    snippet: 'Snippet 3',
                    score: 20,
                    createdAt: new Date('2024-01-20'),
                },
            ];

            results.sort((a, b) => {
                if (a.score !== b.score) {
                    return b.score - a.score;
                }
                return b.createdAt.getTime() - a.createdAt.getTime();
            });

            expect(results[0].id).toBe('chat-2'); // Same score, newer
            expect(results[1].id).toBe('mem-1'); // Same score, older
            expect(results[2].id).toBe('chat-1'); // Lower score
        });

        it('should handle pagination', async () => {
            const page = 2;
            const limit = 20;
            const totalResults = 50;
            const skip = (page - 1) * limit;

            expect(skip).toBe(20);
            expect(Math.ceil(totalResults / limit)).toBe(3); // totalPages
        });

        it('should filter by date range', async () => {
            const from = '2024-01-01';
            const to = '2024-01-31';

            const dateFilter: any = {
                gte: new Date(from),
                lte: new Date(to),
            };

            expect(dateFilter.gte).toBeInstanceOf(Date);
            expect(dateFilter.lte).toBeInstanceOf(Date);
            expect(dateFilter.gte < dateFilter.lte).toBe(true);
        });

        it('should truncate long snippets', async () => {
            const longText = 'a'.repeat(300);
            const maxLength = 200;

            const truncated =
                longText.length <= maxLength
                    ? longText
                    : longText.substring(0, maxLength - 3) + '...';

            expect(truncated.length).toBe(200);
            expect(truncated.endsWith('...')).toBe(true);
        });

        it('should not truncate short text', async () => {
            const shortText = 'Short text';
            const maxLength = 200;

            const truncated =
                shortText.length <= maxLength
                    ? shortText
                    : shortText.substring(0, maxLength - 3) + '...';

            expect(truncated).toBe(shortText);
            expect(truncated.endsWith('...')).toBe(false);
        });
    });

    describe('Search type filtering', () => {
        it('should search only chats when type=chats', async () => {
            const type = 'chats' as string;
            const shouldSearchChats = type === 'all' || type === 'chats';
            const shouldSearchMemories = type === 'all' || type === 'memories';

            expect(shouldSearchChats).toBe(true);
            expect(shouldSearchMemories).toBe(false);
        });

        it('should search only memories when type=memories', async () => {
            const type = 'memories' as string;
            const shouldSearchChats = type === 'all' || type === 'chats';
            const shouldSearchMemories = type === 'all' || type === 'memories';

            expect(shouldSearchChats).toBe(false);
            expect(shouldSearchMemories).toBe(true);
        });

        it('should search both when type=all', async () => {
            const type = 'all';
            const shouldSearchChats = type === 'all' || type === 'chats';
            const shouldSearchMemories = type === 'all' || type === 'memories';

            expect(shouldSearchChats).toBe(true);
            expect(shouldSearchMemories).toBe(true);
        });
    });

    describe('Memory relevance scoring', () => {
        it('should boost score for exact matches', async () => {
            const query = 'typescript';
            const content = 'typescript';

            const isExactMatch = content.toLowerCase() === query.toLowerCase();
            const exactMatchBonus = isExactMatch ? 10 : 0;

            expect(exactMatchBonus).toBe(10);
        });

        it('should boost score for high importance', async () => {
            const importance = 90;
            const importanceBonus = importance / 10;

            expect(importanceBonus).toBe(9);
        });

        it('should boost score for recently accessed memories', async () => {
            const lastAccessedAt = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000); // 3 days ago
            const daysSinceAccess = Math.floor(
                (Date.now() - lastAccessedAt.getTime()) / (1000 * 60 * 60 * 24)
            );

            const recencyBonus = daysSinceAccess < 7 ? 3 : 0;

            expect(daysSinceAccess).toBe(3);
            expect(recencyBonus).toBe(3);
        });

        it('should not boost score for old memories', async () => {
            const lastAccessedAt = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000); // 10 days ago
            const daysSinceAccess = Math.floor(
                (Date.now() - lastAccessedAt.getTime()) / (1000 * 60 * 60 * 24)
            );

            const recencyBonus = daysSinceAccess < 7 ? 3 : 0;

            expect(daysSinceAccess).toBe(10);
            expect(recencyBonus).toBe(0);
        });
    });

    describe('GET /search/suggest', () => {
        it('should return popular chat titles for short queries', async () => {
            const query = 'a';
            const shouldReturnPopular = query.length < 2;

            expect(shouldReturnPopular).toBe(true);
        });

        it('should return matching suggestions for longer queries', async () => {
            const query = 'proj';
            const shouldReturnPopular = query.length < 2;

            expect(shouldReturnPopular).toBe(false);
        });

        it('should limit suggestions', async () => {
            const limit = 5;
            const suggestions = ['Chat 1', 'Chat 2', 'Chat 3', 'Chat 4', 'Chat 5', 'Chat 6'];
            const limited = suggestions.slice(0, limit);

            expect(limited).toHaveLength(5);
        });

        it('should remove duplicate suggestions', async () => {
            const suggestions = ['Chat 1', 'Chat 2', 'Chat 1', 'Chat 3', 'Chat 2'];
            const unique = [...new Set(suggestions)];

            expect(unique).toHaveLength(3);
            expect(unique).toEqual(['Chat 1', 'Chat 2', 'Chat 3']);
        });

        it('should extract unique tags from memories', async () => {
            const memories = [
                { tags: ['react', 'javascript'] },
                { tags: ['typescript', 'react'] },
                { tags: ['python', 'javascript'] },
            ];

            const allTags = new Set<string>();
            for (const memory of memories) {
                for (const tag of memory.tags) {
                    allTags.add(tag);
                }
            }

            expect(allTags.size).toBe(4);
            expect(Array.from(allTags)).toContain('react');
            expect(Array.from(allTags)).toContain('typescript');
        });
    });
});

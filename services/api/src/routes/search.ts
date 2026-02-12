/**
 * Search API Routes
 *
 * Unified search across chats and memories with full-text and semantic search.
 */

import { prisma } from '@aspendos/db';
import { Hono } from 'hono';
import { requireAuth } from '../middleware/auth';

type Variables = {
    userId?: string;
};

const app = new Hono<{ Variables: Variables }>();

// Apply auth middleware to all routes
app.use('*', requireAuth);

interface SearchResult {
    type: 'chat' | 'memory';
    id: string;
    title: string;
    snippet: string;
    score: number;
    createdAt: Date;
    metadata?: Record<string, any>;
}

/**
 * GET /search - Unified search across chats and memories
 *
 * Query params:
 * - q: search query (required)
 * - type: all|chats|memories (default: all)
 * - page: page number (default: 1)
 * - limit: results per page (default: 20, max: 100)
 * - from: date range start (ISO string)
 * - to: date range end (ISO string)
 */
app.get('/', async (c) => {
    const userId = c.get('userId')!;
    const query = c.req.query('q') || '';
    const type = c.req.query('type') || 'all';
    const page = Math.max(1, parseInt(c.req.query('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(c.req.query('limit') || '20', 10)));
    const from = c.req.query('from');
    const to = c.req.query('to');

    if (!query || query.trim().length === 0) {
        return c.json({ error: 'Query parameter "q" is required' }, 400);
    }

    if (!['all', 'chats', 'memories'].includes(type)) {
        return c.json({ error: 'Invalid type. Must be all, chats, or memories' }, 400);
    }

    try {
        const results: SearchResult[] = [];
        let totalCount = 0;

        // Build date range filter
        const dateFilter: any = {};
        if (from) {
            dateFilter.gte = new Date(from);
        }
        if (to) {
            dateFilter.lte = new Date(to);
        }

        // Search chats (PostgreSQL full-text search using ILIKE)
        if (type === 'all' || type === 'chats') {
            const chatResults = await searchChats(userId, query, dateFilter, limit);
            results.push(...chatResults);
        }

        // Search memories (PostgreSQL full-text search using ILIKE)
        if (type === 'all' || type === 'memories') {
            const memoryResults = await searchMemories(userId, query, dateFilter, limit);
            results.push(...memoryResults);
        }

        // Sort by score (relevance) and created date
        results.sort((a, b) => {
            if (a.score !== b.score) {
                return b.score - a.score; // Higher score first
            }
            return b.createdAt.getTime() - a.createdAt.getTime(); // Newer first
        });

        // Paginate results
        totalCount = results.length;
        const skip = (page - 1) * limit;
        const paginatedResults = results.slice(skip, skip + limit);

        return c.json({
            results: paginatedResults,
            total: totalCount,
            page,
            limit,
            totalPages: Math.ceil(totalCount / limit),
            query,
            type,
        });
    } catch (error) {
        console.error('[Search] Error performing search:', error);
        return c.json({ error: 'Search failed' }, 500);
    }
});

/**
 * Search chats using PostgreSQL ILIKE for full-text search
 */
async function searchChats(
    userId: string,
    query: string,
    dateFilter: any,
    limit: number
): Promise<SearchResult[]> {
    const whereClause: any = {
        userId,
        OR: [
            { title: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } },
        ],
    };

    if (Object.keys(dateFilter).length > 0) {
        whereClause.createdAt = dateFilter;
    }

    const chats = await prisma.chat.findMany({
        where: whereClause,
        select: {
            id: true,
            title: true,
            description: true,
            createdAt: true,
            updatedAt: true,
            messages: {
                where: {
                    content: { contains: query, mode: 'insensitive' },
                },
                select: {
                    content: true,
                    role: true,
                    createdAt: true,
                },
                take: 3,
                orderBy: { createdAt: 'desc' },
            },
        },
        take: limit,
        orderBy: { updatedAt: 'desc' },
    });

    return chats.map((chat) => {
        // Calculate relevance score
        let score = 0;

        // Title match gets highest score
        if (chat.title.toLowerCase().includes(query.toLowerCase())) {
            score += 10;
        }

        // Description match
        if (chat.description?.toLowerCase().includes(query.toLowerCase())) {
            score += 5;
        }

        // Message matches
        score += chat.messages.length * 3;

        // Create snippet from description or first matching message
        let snippet = chat.description || '';
        if (chat.messages.length > 0) {
            const firstMessage = chat.messages[0];
            snippet = truncateText(firstMessage.content, 200);
        }

        return {
            type: 'chat' as const,
            id: chat.id,
            title: chat.title,
            snippet,
            score,
            createdAt: chat.createdAt,
            metadata: {
                messageCount: chat.messages.length,
                updatedAt: chat.updatedAt,
            },
        };
    });
}

/**
 * Search memories using PostgreSQL ILIKE for full-text search
 */
async function searchMemories(
    userId: string,
    query: string,
    dateFilter: any,
    limit: number
): Promise<SearchResult[]> {
    const whereClause: any = {
        userId,
        isActive: true,
        OR: [
            { content: { contains: query, mode: 'insensitive' } },
            { summary: { contains: query, mode: 'insensitive' } },
        ],
    };

    if (Object.keys(dateFilter).length > 0) {
        whereClause.createdAt = dateFilter;
    }

    const memories = await prisma.memory.findMany({
        where: whereClause,
        select: {
            id: true,
            content: true,
            summary: true,
            sector: true,
            type: true,
            importance: true,
            tags: true,
            createdAt: true,
            lastAccessedAt: true,
        },
        take: limit,
        orderBy: [{ importance: 'desc' }, { lastAccessedAt: 'desc' }],
    });

    return memories.map((memory) => {
        // Calculate relevance score
        let score = 0;

        // Exact match in content
        const contentLower = memory.content.toLowerCase();
        const queryLower = query.toLowerCase();

        if (contentLower.includes(queryLower)) {
            score += 15;

            // Bonus for exact phrase match
            if (contentLower === queryLower) {
                score += 10;
            }
        }

        // Summary match
        if (memory.summary?.toLowerCase().includes(queryLower)) {
            score += 8;
        }

        // Tag match
        const matchingTags = memory.tags.filter((tag) =>
            tag.toLowerCase().includes(queryLower)
        );
        score += matchingTags.length * 5;

        // Importance boost
        score += memory.importance / 10;

        // Recent access boost
        const daysSinceAccess = Math.floor(
            (Date.now() - memory.lastAccessedAt.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysSinceAccess < 7) {
            score += 3;
        }

        return {
            type: 'memory' as const,
            id: memory.id,
            title: truncateText(memory.content, 100),
            snippet: memory.summary || truncateText(memory.content, 200),
            score,
            createdAt: memory.createdAt,
            metadata: {
                sector: memory.sector,
                type: memory.type,
                importance: memory.importance,
                tags: memory.tags,
                lastAccessedAt: memory.lastAccessedAt,
            },
        };
    });
}

/**
 * Truncate text to specified length with ellipsis
 */
function truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
        return text;
    }
    return text.substring(0, maxLength - 3) + '...';
}

/**
 * GET /search/suggest - Search suggestions/autocomplete
 *
 * Returns quick suggestions based on recent searches and popular queries
 */
app.get('/suggest', async (c) => {
    const userId = c.get('userId')!;
    const q = c.req.query('q') || '';
    const limit = Math.min(10, Math.max(1, parseInt(c.req.query('limit') || '5', 10)));

    try {
        const suggestions: string[] = [];

        if (q.length < 2) {
            // Return popular chat titles if query is too short
            const popularChats = await prisma.chat.findMany({
                where: { userId },
                select: { title: true },
                orderBy: { updatedAt: 'desc' },
                take: limit,
            });

            suggestions.push(...popularChats.map((c) => c.title));
        } else {
            // Return matching chat titles and memory tags
            const [matchingChats, matchingMemories] = await Promise.all([
                prisma.chat.findMany({
                    where: {
                        userId,
                        title: { contains: q, mode: 'insensitive' },
                    },
                    select: { title: true },
                    take: limit,
                }),
                prisma.memory.findMany({
                    where: {
                        userId,
                        isActive: true,
                        content: { contains: q, mode: 'insensitive' },
                    },
                    select: { tags: true },
                    take: limit,
                }),
            ]);

            suggestions.push(...matchingChats.map((c) => c.title));

            // Add unique tags from memories
            const tags = new Set<string>();
            for (const memory of matchingMemories) {
                for (const tag of memory.tags) {
                    if (tag.toLowerCase().includes(q.toLowerCase())) {
                        tags.add(tag);
                    }
                }
            }
            suggestions.push(...Array.from(tags).slice(0, limit));
        }

        // Remove duplicates and limit
        const uniqueSuggestions = [...new Set(suggestions)].slice(0, limit);

        return c.json({
            suggestions: uniqueSuggestions,
            query: q,
        });
    } catch (error) {
        console.error('[Search] Error generating suggestions:', error);
        return c.json({ error: 'Failed to generate suggestions' }, 500);
    }
});

export default app;

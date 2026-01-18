/**
 * Memory Database Service
 * Handles CRUD operations for memories using Prisma.
 *
 * Dashboard Functions (Phase 1):
 * - getMemoryStats: Aggregate stats by sector
 * - listMemoriesForDashboard: Filtered/paginated list
 * - updateMemory: Edit memory content/sector/confidence
 * - softDeleteMemory: Archive (isActive = false)
 * - submitFeedback: Log user feedback
 */
import { type Memory, type MemoryFeedback, prisma } from '@aspendos/db';

// ============================================
// TYPES
// ============================================

export interface CreateMemoryInput {
    userId: string;
    chatId?: string;
    content: string;
    type: 'context' | 'preference' | 'insight' | 'project';
    sector?: 'episodic' | 'semantic' | 'procedural' | 'emotional' | 'reflective';
    source?: string;
    importance?: number;
    tags?: string[];
}

export interface SearchMemoriesOptions {
    userId: string;
    chatId?: string;
    type?: string;
    tags?: string[];
    limit?: number;
}

export interface DashboardListOptions {
    userId: string;
    sector?: string;
    sortBy: 'createdAt' | 'confidence' | 'accessCount' | 'lastAccessedAt';
    sortOrder: 'asc' | 'desc';
    page: number;
    limit: number;
    search?: string;
}

export interface UpdateMemoryInput {
    content?: string;
    sector?: string;
    confidence?: number;
    isPinned?: boolean;
    summary?: string;
}

export interface FeedbackInput {
    memoryId: string;
    userId: string;
    wasHelpful: boolean;
    notes?: string;
    queryText?: string;
}

export interface MemoryStats {
    total: number;
    active: number;
    archived: number;
    pinned: number;
    bySector: Record<string, number>;
    avgConfidence: number;
}

export interface PaginatedMemories {
    memories: Memory[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

// ============================================
// DASHBOARD FUNCTIONS
// ============================================

/**
 * Get memory statistics for dashboard
 */
export async function getMemoryStats(userId: string): Promise<MemoryStats> {
    const [total, active, pinned, sectors, avgConfidence] = await Promise.all([
        // Total memories
        prisma.memory.count({ where: { userId } }),
        // Active memories
        prisma.memory.count({ where: { userId, isActive: true } }),
        // Pinned memories
        prisma.memory.count({ where: { userId, isPinned: true } }),
        // Count by sector
        prisma.memory.groupBy({
            by: ['sector'],
            where: { userId, isActive: true },
            _count: { sector: true },
        }),
        // Average confidence
        prisma.memory.aggregate({
            where: { userId, isActive: true },
            _avg: { confidence: true },
        }),
    ]);

    const bySector: Record<string, number> = {
        episodic: 0,
        semantic: 0,
        procedural: 0,
        emotional: 0,
        reflective: 0,
    };

    sectors.forEach((s) => {
        bySector[s.sector] = s._count.sector;
    });

    return {
        total,
        active,
        archived: total - active,
        pinned,
        bySector,
        avgConfidence: avgConfidence._avg.confidence || 0,
    };
}

/**
 * List memories for dashboard with filtering and pagination
 */
export async function listMemoriesForDashboard(
    options: DashboardListOptions
): Promise<PaginatedMemories> {
    const { userId, sector, sortBy, sortOrder, page, limit, search } = options;

    const where = {
        userId,
        isActive: true,
        ...(sector && { sector }),
        ...(search && {
            content: { contains: search, mode: 'insensitive' as const },
        }),
    };

    const [memories, total] = await Promise.all([
        prisma.memory.findMany({
            where,
            orderBy: { [sortBy]: sortOrder },
            skip: (page - 1) * limit,
            take: limit,
        }),
        prisma.memory.count({ where }),
    ]);

    return {
        memories,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    };
}

/**
 * Update a memory
 */
export async function updateMemory(id: string, data: UpdateMemoryInput): Promise<Memory> {
    // Filter out undefined values
    const updateData: Record<string, unknown> = {};
    if (data.content !== undefined) updateData.content = data.content;
    if (data.sector !== undefined) updateData.sector = data.sector;
    if (data.confidence !== undefined) updateData.confidence = data.confidence;
    if (data.isPinned !== undefined) updateData.isPinned = data.isPinned;
    if (data.summary !== undefined) updateData.summary = data.summary;

    return prisma.memory.update({
        where: { id },
        data: updateData,
    });
}

/**
 * Soft delete a memory (archive)
 */
export async function softDeleteMemory(id: string): Promise<Memory> {
    return prisma.memory.update({
        where: { id },
        data: { isActive: false },
    });
}

/**
 * Submit feedback on a memory and adjust confidence
 */
export async function submitFeedback(input: FeedbackInput): Promise<MemoryFeedback> {
    // Create feedback record
    const feedback = await prisma.memoryFeedback.create({
        data: {
            memoryId: input.memoryId,
            userId: input.userId,
            wasHelpful: input.wasHelpful,
            notes: input.notes,
            queryText: input.queryText,
        },
    });

    // Adjust memory confidence based on feedback
    // Positive feedback: +5% confidence, negative: -10%
    const delta = input.wasHelpful ? 0.05 : -0.1;

    await prisma.memory.update({
        where: { id: input.memoryId },
        data: {
            confidence: {
                increment: delta,
            },
        },
    });

    return feedback;
}

// ============================================
// LEGACY CRUD FUNCTIONS
// ============================================

/**
 * Create a memory
 */
export async function createMemory(input: CreateMemoryInput): Promise<Memory> {
    return prisma.memory.create({
        data: {
            userId: input.userId,
            chatId: input.chatId,
            content: input.content,
            type: input.type,
            sector: input.sector || 'semantic',
            source: input.source || 'user_input',
            importance: input.importance || 50,
            tags: input.tags || [],
        },
    });
}

/**
 * Search memories
 */
export async function searchMemories(options: SearchMemoriesOptions): Promise<Memory[]> {
    return prisma.memory.findMany({
        where: {
            userId: options.userId,
            isActive: true,
            chatId: options.chatId,
            type: options.type,
            tags: options.tags ? { hasSome: options.tags } : undefined,
        },
        orderBy: { importance: 'desc' },
        take: options.limit || 20,
    });
}

/**
 * Get memory by ID
 */
export async function getMemory(id: string, userId: string): Promise<Memory | null> {
    return prisma.memory.findFirst({
        where: { id, userId },
    });
}

/**
 * Update memory access time and count
 */
export async function touchMemory(id: string) {
    return prisma.memory.update({
        where: { id },
        data: {
            lastAccessedAt: new Date(),
            accessCount: { increment: 1 },
        },
    });
}

/**
 * Hard delete memory
 */
export async function deleteMemory(id: string, userId: string) {
    return prisma.memory.deleteMany({
        where: { id, userId },
    });
}

/**
 * Get user's global memories (not tied to a specific chat)
 */
export async function getGlobalMemories(userId: string, limit?: number): Promise<Memory[]> {
    return prisma.memory.findMany({
        where: {
            userId,
            chatId: null,
            isActive: true,
        },
        orderBy: { importance: 'desc' },
        take: limit || 50,
    });
}

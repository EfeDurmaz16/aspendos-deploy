/**
 * Memory Database Service
 * Handles CRUD operations for memories using Prisma.
 */
import { prisma, Memory } from '@aspendos/db';

export interface CreateMemoryInput {
    userId: string;
    chatId?: string;
    content: string;
    type: 'context' | 'preference' | 'insight' | 'project';
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
 * Update memory access time
 */
export async function touchMemory(id: string) {
    return prisma.memory.update({
        where: { id },
        data: { lastAccessedAt: new Date() },
    });
}

/**
 * Delete memory
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
        },
        orderBy: { importance: 'desc' },
        take: limit || 50,
    });
}

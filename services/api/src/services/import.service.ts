/**
 * Import Service
 *
 * Handles importing chat history from ChatGPT and Claude exports.
 * Parses conversation formats, stores in database, and indexes for search.
 */

import { prisma } from '../lib/prisma';
import * as openMemory from './openmemory.service';

// Types for parsed conversations
export interface ParsedMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
    createdAt: Date;
}

export interface ParsedConversation {
    externalId: string;
    title: string;
    messages: ParsedMessage[];
    createdAt: Date;
    updatedAt: Date;
    source: 'CHATGPT' | 'CLAUDE';
}

/**
 * Create a new import job
 */
export async function createImportJob(
    userId: string,
    source: 'CHATGPT' | 'CLAUDE',
    fileName: string,
    fileSize: number
) {
    return prisma.importJob.create({
        data: {
            userId,
            source,
            fileName,
            fileSize,
            status: 'PENDING',
        },
    });
}

/**
 * Update import job status
 */
export async function updateImportJobStatus(
    jobId: string,
    status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED',
    error?: string
) {
    return prisma.importJob.update({
        where: { id: jobId },
        data: {
            status,
            error,
            ...(status === 'COMPLETED' || status === 'FAILED'
                ? { completedAt: new Date() }
                : {}),
        },
    });
}

/**
 * Get import job by ID
 */
export async function getImportJob(jobId: string, userId: string) {
    return prisma.importJob.findFirst({
        where: { id: jobId, userId },
        include: { entities: true },
    });
}

/**
 * List import jobs for a user
 */
export async function listImportJobs(userId: string, limit = 20) {
    return prisma.importJob.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
    });
}

/**
 * Parse ChatGPT export format
 */
export function parseChatGPTExport(data: unknown): ParsedConversation[] {
    const conversations: ParsedConversation[] = [];

    if (!Array.isArray(data)) {
        throw new Error('Invalid ChatGPT export format: expected array');
    }

    for (const conv of data) {
        if (!conv.mapping || !conv.title) continue;

        const messages: ParsedMessage[] = [];
        const mapping = conv.mapping as Record<string, unknown>;

        // Build message tree
        for (const node of Object.values(mapping)) {
            if (
                node &&
                typeof node === 'object' &&
                'message' in node &&
                node.message &&
                typeof node.message === 'object'
            ) {
                const msg = node.message as {
                    author?: { role?: string };
                    content?: { parts?: string[] };
                    create_time?: number;
                };

                const role = msg.author?.role;
                const content = msg.content?.parts?.join('\n');

                if (role && content && (role === 'user' || role === 'assistant')) {
                    messages.push({
                        role: role as 'user' | 'assistant',
                        content,
                        createdAt: new Date((msg.create_time || 0) * 1000),
                    });
                }
            }
        }

        // Sort messages by creation time
        messages.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

        conversations.push({
            externalId: conv.id || `chatgpt-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            title: conv.title,
            messages,
            createdAt: new Date((conv.create_time || 0) * 1000),
            updatedAt: new Date((conv.update_time || 0) * 1000),
            source: 'CHATGPT',
        });
    }

    return conversations;
}

/**
 * Parse Claude export format
 */
export function parseClaudeExport(data: unknown): ParsedConversation[] {
    const conversations: ParsedConversation[] = [];

    if (!Array.isArray(data)) {
        throw new Error('Invalid Claude export format: expected array');
    }

    for (const conv of data) {
        const messages: ParsedMessage[] = [];

        if (Array.isArray(conv.chat_messages)) {
            for (const msg of conv.chat_messages) {
                if (msg.sender && msg.text) {
                    messages.push({
                        role: msg.sender === 'human' ? 'user' : 'assistant',
                        content: msg.text,
                        createdAt: new Date(msg.created_at || conv.created_at),
                    });
                }
            }
        }

        conversations.push({
            externalId: conv.uuid || `claude-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            title: conv.name || 'Untitled Conversation',
            messages,
            createdAt: new Date(conv.created_at),
            updatedAt: new Date(conv.updated_at),
            source: 'CLAUDE',
        });
    }

    return conversations;
}

/**
 * Store parsed entities for preview
 */
export async function storeImportEntities(
    jobId: string,
    conversations: ParsedConversation[]
) {
    const entities = conversations.map((conv) => ({
        jobId,
        type: 'CONVERSATION' as const,
        externalId: conv.externalId,
        title: conv.title,
        content: {
            messages: conv.messages,
            source: conv.source,
            createdAt: conv.createdAt.toISOString(),
            updatedAt: conv.updatedAt.toISOString(),
        },
        selected: true,
        imported: false,
    }));

    await prisma.importEntity.createMany({ data: entities });

    // Update job with total count
    await prisma.importJob.update({
        where: { id: jobId },
        data: { totalItems: entities.length },
    });

    return entities.length;
}

/**
 * Update entity selection
 */
export async function updateEntitySelection(entityId: string, selected: boolean) {
    return prisma.importEntity.update({
        where: { id: entityId },
        data: { selected },
    });
}

/**
 * Execute import for selected entities
 */
export async function executeImport(jobId: string, userId: string) {
    // Get selected entities
    const entities = await prisma.importEntity.findMany({
        where: { jobId, selected: true, imported: false },
    });

    if (entities.length === 0) {
        throw new Error('No entities selected for import');
    }

    // Update job status
    await updateImportJobStatus(jobId, 'PROCESSING');

    let importedCount = 0;

    for (const entity of entities) {
        try {
            const content = entity.content as {
                messages: ParsedMessage[];
                source: string;
                createdAt: string;
                updatedAt: string;
            };

            // Create conversation in YULA
            const conversation = await prisma.conversation.create({
                data: {
                    userId,
                    title: entity.title || 'Imported Conversation',
                    model: 'imported',
                    importedFrom: content.source,
                    importedAt: new Date(),
                },
            });

            // Create messages
            const messageData = content.messages.map((msg, index) => ({
                conversationId: conversation.id,
                role: msg.role,
                content: msg.content,
                createdAt: new Date(msg.createdAt),
                order: index,
            }));

            await prisma.message.createMany({ data: messageData });

            // Index in memory for search
            const memoryContent = content.messages
                .map((m) => `${m.role}: ${m.content}`)
                .join('\n\n')
                .slice(0, 10000); // Limit size

            await openMemory.addMemory(
                memoryContent,
                userId,
                {
                    sector: 'episodic',
                    metadata: {
                        type: 'imported_conversation',
                        source: content.source,
                        title: entity.title,
                        conversationId: conversation.id,
                        importJobId: jobId,
                    },
                }
            );

            // Mark entity as imported
            await prisma.importEntity.update({
                where: { id: entity.id },
                data: { imported: true },
            });

            importedCount++;

            // Update job progress
            await prisma.importJob.update({
                where: { id: jobId },
                data: { importedItems: importedCount },
            });
        } catch (error) {
            console.error(`Failed to import entity ${entity.id}:`, error);
            // Continue with next entity
        }
    }

    // Update job status
    await updateImportJobStatus(
        jobId,
        importedCount > 0 ? 'COMPLETED' : 'FAILED',
        importedCount === 0 ? 'No entities were imported' : undefined
    );

    return {
        total: entities.length,
        imported: importedCount,
        failed: entities.length - importedCount,
    };
}

/**
 * Get import statistics for a user
 */
export async function getImportStats(userId: string) {
    const [jobs, totalImported] = await Promise.all([
        prisma.importJob.count({ where: { userId } }),
        prisma.importJob.aggregate({
            where: { userId, status: 'COMPLETED' },
            _sum: { importedItems: true },
        }),
    ]);

    return {
        totalJobs: jobs,
        totalImported: totalImported._sum.importedItems || 0,
    };
}

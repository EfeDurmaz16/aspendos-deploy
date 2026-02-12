/**
 * Import Service
 *
 * Handles importing chat history from ChatGPT and Claude exports.
 * Parses conversation formats, stores in database, and indexes for search.
 */

import { randomUUID } from 'node:crypto';
import { prisma } from '../lib/prisma';
import * as importParsers from './import-parsers';
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
    source: 'CHATGPT' | 'CLAUDE' | 'GEMINI' | 'PERPLEXITY';
}

/**
 * Create a new import job
 */
export async function createImportJob(
    userId: string,
    source: 'CHATGPT' | 'CLAUDE' | 'GEMINI' | 'PERPLEXITY',
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
            errorMessage: error,
            ...(status === 'COMPLETED' || status === 'FAILED' ? { completedAt: new Date() } : {}),
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
 *
 * ChatGPT exports use a complex linked-list/tree structure where messages
 * are stored in a `mapping` dict with parent/children references.
 * This requires tree traversal to reconstruct linear conversations.
 *
 * Based on Klaros ChatGPT loader implementation.
 */
export function parseChatGPTExport(data: unknown): ParsedConversation[] {
    const conversations: ParsedConversation[] = [];

    if (!Array.isArray(data)) {
        throw new Error('Invalid ChatGPT export format: expected array');
    }

    for (const conv of data) {
        if (!conv.mapping || !conv.title) continue;

        const mapping = conv.mapping as Record<string, ChatGPTNode>;

        // Find the root node (no parent)
        const rootId = findChatGPTRoot(mapping);
        if (!rootId) continue;

        // Traverse the tree to extract messages in order
        const messages = traverseChatGPTTree(mapping, rootId);

        if (messages.length === 0) continue;

        conversations.push({
            externalId: conv.id || `chatgpt-${randomUUID()}`,
            title: conv.title,
            messages,
            createdAt: new Date((conv.create_time || 0) * 1000),
            updatedAt: new Date((conv.update_time || 0) * 1000),
            source: 'CHATGPT',
        });
    }

    return conversations;
}

// ChatGPT node type for tree traversal
interface ChatGPTNode {
    id?: string;
    parent?: string | null;
    children?: string[];
    message?: {
        id?: string;
        author?: { role?: string };
        content?: { content_type?: string; parts?: (string | { text?: string })[] };
        create_time?: number;
        metadata?: { is_visually_hidden_from_conversation?: boolean; model_slug?: string };
    };
}

/**
 * Find the root node ID (node with no parent)
 */
function findChatGPTRoot(mapping: Record<string, ChatGPTNode>): string | null {
    for (const [nodeId, node] of Object.entries(mapping)) {
        if (node.parent === null || node.parent === undefined) {
            return nodeId;
        }
    }
    return null;
}

/**
 * Recursively traverse the message tree to reconstruct linear conversation.
 * Follows the first child at each level (main thread).
 */
function traverseChatGPTTree(
    mapping: Record<string, ChatGPTNode>,
    nodeId: string
): ParsedMessage[] {
    const node = mapping[nodeId];
    if (!node) return [];

    const messages: ParsedMessage[] = [];
    const msgData = node.message;

    if (msgData) {
        const parsed = parseChatGPTMessage(msgData);
        if (parsed) {
            messages.push(parsed);
        }
    }

    // Follow children (take first child for main thread)
    const children = node.children || [];
    if (children.length > 0) {
        messages.push(...traverseChatGPTTree(mapping, children[0]));
    }

    return messages;
}

/**
 * Parse a single ChatGPT message from the mapping structure.
 */
function parseChatGPTMessage(msgData: ChatGPTNode['message']): ParsedMessage | null {
    if (!msgData) return null;

    const author = msgData.author || {};
    const roleStr = author.role || '';

    // Only include user and assistant messages
    if (roleStr !== 'user' && roleStr !== 'assistant') {
        return null;
    }

    // Skip visually hidden messages
    const metadata = msgData.metadata || {};
    if (metadata.is_visually_hidden_from_conversation) {
        return null;
    }

    // Extract text content
    const content = msgData.content || {};
    const contentType = content.content_type || '';

    // Skip non-text content types (except user_editable_context)
    if (contentType !== 'text' && contentType !== 'user_editable_context') {
        return null;
    }

    // Get text from parts array
    const parts = content.parts || [];
    const textParts: string[] = [];
    for (const part of parts) {
        if (typeof part === 'string') {
            textParts.push(part);
        } else if (part && typeof part === 'object' && part.text) {
            textParts.push(part.text);
        }
    }

    const text = textParts.join('\n').trim();
    if (!text) return null;

    return {
        role: roleStr as 'user' | 'assistant',
        content: text,
        createdAt: new Date((msgData.create_time || 0) * 1000),
    };
}

/**
 * Parse Claude export format
 *
 * Claude exports have a simpler structure than ChatGPT, but may have
 * content in either `text` field or `content` array.
 *
 * Based on Klaros Claude loader implementation.
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
                const parsed = parseClaudeMessage(msg, conv.created_at);
                if (parsed) {
                    messages.push(parsed);
                }
            }
        }

        conversations.push({
            externalId: conv.uuid || `claude-${randomUUID()}`,
            title: conv.name || 'Untitled Conversation',
            messages,
            createdAt: new Date(conv.created_at),
            updatedAt: new Date(conv.updated_at),
            source: 'CLAUDE',
        });
    }

    return conversations;
}

// Claude message type for parsing
interface ClaudeMessage {
    sender?: string;
    text?: string;
    content?: Array<{ type?: string; text?: string }>;
    created_at?: string;
}

/**
 * Parse a single Claude message.
 * Handles both `text` field and `content` array fallback.
 */
function parseClaudeMessage(msg: ClaudeMessage, convCreatedAt?: string): ParsedMessage | null {
    if (!msg.sender) return null;

    // Get text content - try text field first, then content array
    let text = msg.text || '';

    // If text is empty, try to get from content array (newer Claude export format)
    if (!text && Array.isArray(msg.content)) {
        for (const contentItem of msg.content) {
            if (contentItem && contentItem.type === 'text' && contentItem.text) {
                text = contentItem.text;
                break;
            }
        }
    }

    if (!text.trim()) return null;

    return {
        role: msg.sender === 'human' ? 'user' : 'assistant',
        content: text,
        createdAt: new Date(msg.created_at || convCreatedAt || Date.now()),
    };
}

/**
 * Parse Gemini export format
 *
 * Gemini exports conversations as JSON with entries array.
 * Uses the import-parsers module for parsing logic.
 */
export function parseGeminiExport(data: unknown): ParsedConversation[] {
    const conversations: ParsedConversation[] = [];

    // Convert data to JSON string for parser
    const jsonString = JSON.stringify(data);
    const parsed = importParsers.parseGeminiExport(jsonString);

    for (const conv of parsed) {
        conversations.push({
            externalId: `gemini-${randomUUID()}`,
            title: conv.title,
            messages: conv.messages,
            createdAt: conv.messages[0]?.createdAt || new Date(),
            updatedAt: conv.messages[conv.messages.length - 1]?.createdAt || new Date(),
            source: 'GEMINI',
        });
    }

    return conversations;
}

/**
 * Parse Perplexity export format
 *
 * Perplexity exports threads with messages.
 * Citations are stripped from content.
 * Uses the import-parsers module for parsing logic.
 */
export function parsePerplexityExport(data: unknown): ParsedConversation[] {
    const conversations: ParsedConversation[] = [];

    // Convert data to JSON string for parser
    const jsonString = JSON.stringify(data);
    const parsed = importParsers.parsePerplexityExport(jsonString);

    for (const conv of parsed) {
        conversations.push({
            externalId: `perplexity-${randomUUID()}`,
            title: conv.title,
            messages: conv.messages,
            createdAt: conv.messages[0]?.createdAt || new Date(),
            updatedAt: conv.messages[conv.messages.length - 1]?.createdAt || new Date(),
            source: 'PERPLEXITY',
        });
    }

    return conversations;
}

/**
 * Store parsed entities for preview
 */
export async function storeImportEntities(jobId: string, conversations: ParsedConversation[]) {
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
export async function updateEntitySelection(entityId: string, jobId: string, selected: boolean) {
    return prisma.importEntity.update({
        where: { id: entityId, jobId },
        data: { selected },
    });
}

/**
 * Execute import for selected entities
 */
export async function executeImport(jobId: string, userId: string, selectedIds?: string[]) {
    // Get selected entities
    const entities = await prisma.importEntity.findMany({
        where: {
            jobId,
            selected: true,
            imported: false,
            ...(selectedIds ? { id: { in: selectedIds } } : {}),
        },
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
            const chat = await prisma.chat.create({
                data: {
                    userId,
                    title: entity.title || 'Imported Conversation',
                    modelPreference: 'imported',
                    description: `Imported from ${content.source} on ${new Date().toISOString()}`,
                },
            });

            // Create messages
            const messageData = content.messages.map((msg) => ({
                chatId: chat.id,
                userId,
                role: msg.role,
                content: msg.content,
                createdAt: new Date(msg.createdAt),
                modelUsed: 'imported',
            }));

            await prisma.message.createMany({ data: messageData });

            // Index in memory for search
            const memoryContent = content.messages
                .map((m) => `${m.role}: ${m.content}`)
                .join('\n\n')
                .slice(0, 10000); // Limit size

            await openMemory.addMemory(memoryContent, userId, {
                sector: 'episodic',
                metadata: {
                    type: 'imported_conversation',
                    source: content.source,
                    title: entity.title,
                    chatId: chat.id,
                    importJobId: jobId,
                },
            });

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

    // MOAT: Extract memories from imported conversations (fire-and-forget)
    // This creates massive value: we don't just import history, we learn from it
    if (importedCount > 0) {
        extractMemoriesFromImport(userId, jobId).catch((error) => {
            console.error('Memory extraction from import failed (non-blocking):', error);
        });
    }

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

/**
 * MOAT: Extract memories from imported conversations.
 * This is a massive differentiator: when users import from ChatGPT/Claude,
 * we don't just store conversations - we LEARN from them.
 * Competitors just import; we build intelligence from imports.
 */
export async function extractMemoriesFromImport(userId: string, jobId: string): Promise<number> {
    const entities = await prisma.importEntity.findMany({
        where: {
            jobId,
            imported: true,
            type: 'CONVERSATION',
        },
        take: 100, // Process max 100 conversations per import
    });

    if (entities.length === 0) return 0;

    let memoriesCreated = 0;
    const maxMemoriesPerImport = 50; // Cap to prevent abuse

    for (const entity of entities) {
        if (memoriesCreated >= maxMemoriesPerImport) break;

        try {
            const content = entity.content as {
                messages: ParsedMessage[];
                source: string;
                createdAt: string;
            };

            if (!content.messages || content.messages.length === 0) continue;

            // Extract a brief summary of the conversation
            const userMessages = content.messages
                .filter((m) => m.role === 'user')
                .map((m) => m.content)
                .join(' ');

            const assistantMessages = content.messages
                .filter((m) => m.role === 'assistant')
                .map((m) => m.content)
                .join(' ');

            // Create a summary: first user message + topics discussed
            const firstUserMsg = content.messages.find((m) => m.role === 'user')?.content || '';
            const summary = `${entity.title || 'Imported conversation'}: ${firstUserMsg.slice(0, 200)}`;

            // Store as episodic memory
            await openMemory.addMemory(summary, userId, {
                sector: 'episodic',
                metadata: {
                    source: 'import_extraction',
                    importJobId: jobId,
                    originalSource: content.source,
                    chatId: entity.chatId,
                    messageCount: content.messages.length,
                },
            });

            memoriesCreated++;

            // Extract key topics/themes from longer conversations
            if (content.messages.length >= 10 && memoriesCreated < maxMemoriesPerImport) {
                // Look for technical terms, repeated topics
                const allText = `${userMessages} ${assistantMessages}`.toLowerCase();
                const technicalPatterns = [
                    /\b(typescript|javascript|python|react|node|api|database|sql)\b/g,
                    /\b(architecture|design|pattern|implementation|algorithm)\b/g,
                    /\b(learn|study|understand|explain|how to)\b/g,
                ];

                for (const pattern of technicalPatterns) {
                    const matches = allText.match(pattern);
                    if (matches && matches.length >= 3) {
                        const topic = matches[0];
                        await openMemory.addMemory(
                            `User discussed ${topic} in imported conversation from ${content.source}`,
                            userId,
                            {
                                sector: 'semantic',
                                metadata: {
                                    source: 'import_extraction',
                                    importJobId: jobId,
                                    topic,
                                },
                            }
                        );
                        memoriesCreated++;
                        break; // Only one semantic memory per conversation
                    }
                }
            }
        } catch (error) {
            console.error(`Failed to extract memories from entity ${entity.id}:`, error);
            // Continue with next entity
        }
    }

    return memoriesCreated;
}

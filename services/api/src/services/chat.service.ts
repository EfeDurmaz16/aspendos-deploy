/**
 * Chat Database Service
 * Handles CRUD operations for chats and messages using Prisma.
 */
import { prisma, Chat, Message, User, Prisma } from '@aspendos/db';

// ============================================
// USER OPERATIONS
// ============================================

/**
 * Get or create user from Clerk ID
 */
export async function getOrCreateUser(clerkId: string, email: string, name?: string): Promise<User> {
    const existing = await prisma.user.findUnique({
        where: { clerkId },
    });

    if (existing) return existing;

    return prisma.user.create({
        data: {
            clerkId,
            email,
            name,
        },
    });
}

/**
 * Get user by Clerk ID
 */
export async function getUserByClerkId(clerkId: string): Promise<User | null> {
    return prisma.user.findUnique({
        where: { clerkId },
    });
}

// ============================================
// CHAT OPERATIONS
// ============================================

export interface CreateChatInput {
    userId: string;
    title?: string;
    modelPreference?: string;
}

export interface ListChatsOptions {
    userId: string;
    limit?: number;
    includeArchived?: boolean;
}

/**
 * Create a new chat
 */
export async function createChat(input: CreateChatInput): Promise<Chat> {
    return prisma.chat.create({
        data: {
            userId: input.userId,
            title: input.title || 'New Chat',
            modelPreference: input.modelPreference,
        },
    });
}

/**
 * List chats for a user
 */
export async function listChats(options: ListChatsOptions): Promise<Chat[]> {
    return prisma.chat.findMany({
        where: {
            userId: options.userId,
            isArchived: options.includeArchived ? undefined : false,
        },
        orderBy: { updatedAt: 'desc' },
        take: options.limit || 50,
    });
}

/**
 * Get chat by ID with messages
 */
export async function getChatWithMessages(chatId: string, userId: string) {
    return prisma.chat.findFirst({
        where: {
            id: chatId,
            userId, // Ensure user owns this chat
        },
        include: {
            messages: {
                orderBy: { createdAt: 'asc' },
            },
        },
    });
}

/**
 * Get chat by ID
 */
export async function getChat(chatId: string, userId: string): Promise<Chat | null> {
    return prisma.chat.findFirst({
        where: {
            id: chatId,
            userId,
        },
    });
}

/**
 * Update chat
 */
export async function updateChat(chatId: string, userId: string, data: Partial<Pick<Chat, 'title' | 'modelPreference' | 'isArchived'>>) {
    return prisma.chat.updateMany({
        where: {
            id: chatId,
            userId,
        },
        data,
    });
}

/**
 * Delete chat
 */
export async function deleteChat(chatId: string, userId: string) {
    return prisma.chat.deleteMany({
        where: {
            id: chatId,
            userId,
        },
    });
}

// ============================================
// MESSAGE OPERATIONS
// ============================================

export interface CreateMessageInput {
    chatId: string;
    userId: string;
    role: 'user' | 'assistant';
    content: string;
    modelUsed?: string;
    tokensIn?: number;
    tokensOut?: number;
    costUsd?: number;
    metadata?: Record<string, unknown>;
}

/**
 * Create a message
 */
export async function createMessage(input: CreateMessageInput): Promise<Message> {
    // Update chat's updatedAt timestamp
    await prisma.chat.update({
        where: { id: input.chatId },
        data: { updatedAt: new Date() },
    });

    return prisma.message.create({
        data: {
            chatId: input.chatId,
            userId: input.userId,
            role: input.role,
            content: input.content,
            modelUsed: input.modelUsed,
            tokensIn: input.tokensIn || 0,
            tokensOut: input.tokensOut || 0,
            costUsd: input.costUsd || 0,
            metadata: input.metadata as Prisma.InputJsonValue | undefined,
        },
    });
}

/**
 * Get messages for a chat
 */
export async function getMessages(chatId: string, limit?: number): Promise<Message[]> {
    return prisma.message.findMany({
        where: { chatId },
        orderBy: { createdAt: 'asc' },
        take: limit,
    });
}

/**
 * Auto-generate chat title from first message
 */
export async function autoGenerateTitle(chatId: string, firstMessage: string) {
    // Take first 50 chars of message as title
    const title = firstMessage.length > 50
        ? firstMessage.substring(0, 47) + '...'
        : firstMessage;

    return prisma.chat.update({
        where: { id: chatId },
        data: { title },
    });
}

/**
 * Chat Database Service
 * Handles CRUD operations for chats and messages using Prisma.
 */

import { randomBytes } from 'node:crypto';
import { type Chat, type Message, type Prisma, prisma, type User } from '@aspendos/db';

// ============================================
// USER OPERATIONS
// ============================================

/**
 * Get or create user from Better Auth user ID
 * Better Auth already creates the user in the database via Prisma adapter.
 */
export async function getOrCreateUser(
    userId: string,
    email: string,
    _name?: string
): Promise<User> {
    // Better Auth stores users directly with their ID
    const existing = await prisma.user.findUnique({
        where: { id: userId },
    });

    if (existing) return existing;

    // Fallback: try to find by email (in case ID mismatch from Better Auth)
    const byEmail = await prisma.user.findUnique({
        where: { email },
    });

    if (byEmail) return byEmail;

    // User should exist if session is valid - this is an error case
    throw new Error('Authenticated user not found in database');
}

/**
 * Get user by ID
 */
export async function getUserById(userId: string): Promise<User | null> {
    return prisma.user.findUnique({
        where: { id: userId },
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
 * Get chat by ID with paginated messages (cursor-based)
 */
export async function getChatWithMessages(
    chatId: string,
    userId: string,
    options?: { cursor?: string; limit?: number }
) {
    const limit = Math.min(options?.limit || 50, 200);
    return prisma.chat.findFirst({
        where: {
            id: chatId,
            userId, // Ensure user owns this chat
        },
        include: {
            messages: {
                orderBy: { createdAt: 'asc' },
                take: limit,
                ...(options?.cursor
                    ? { cursor: { id: options.cursor }, skip: 1 }
                    : {}),
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
export async function updateChat(
    chatId: string,
    userId: string,
    data: Partial<Pick<Chat, 'title' | 'modelPreference' | 'isArchived'>>
) {
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
 * Get messages for a chat (with optional userId for defense-in-depth ownership check)
 */
export async function getMessages(
    chatId: string,
    limit?: number,
    userId?: string
): Promise<Message[]> {
    return prisma.message.findMany({
        where: {
            chatId,
            ...(userId ? { chat: { userId } } : {}),
        },
        orderBy: { createdAt: 'asc' },
        take: limit,
    });
}

/**
 * Auto-generate chat title from first message
 */
export async function autoGenerateTitle(chatId: string, firstMessage: string) {
    // Take first 50 chars of message as title
    const title = firstMessage.length > 50 ? `${firstMessage.substring(0, 47)}...` : firstMessage;

    return prisma.chat.update({
        where: { id: chatId },
        data: { title },
    });
}

/**
 * Add feedback to a message
 */
export async function addMessageFeedback(
    messageId: string,
    userId: string,
    feedback: 'up' | 'down'
): Promise<Message | null> {
    // Find the message and verify ownership through chat
    const message = await prisma.message.findFirst({
        where: { id: messageId },
        include: { chat: true },
    });

    if (!message || message.chat.userId !== userId) {
        return null;
    }

    // Update message metadata with feedback
    const existingMetadata = (message.metadata as Record<string, unknown>) || {};
    const updatedMetadata = {
        ...existingMetadata,
        feedback,
        feedbackAt: new Date().toISOString(),
    };

    return prisma.message.update({
        where: { id: messageId },
        data: { metadata: updatedMetadata as Prisma.InputJsonValue },
    });
}

// ============================================
// FORK & SHARE OPERATIONS
// ============================================

/**
 * Fork a chat from a specific message
 * Creates a new chat with all messages up to and including the specified message
 */
export async function forkChat(
    chatId: string,
    userId: string,
    fromMessageId?: string
): Promise<Chat> {
    // Get original chat
    const originalChat = await getChatWithMessages(chatId, userId);
    if (!originalChat) {
        throw new Error('Chat not found');
    }

    // Determine which messages to include
    let messagesToCopy = originalChat.messages;
    if (fromMessageId) {
        const messageIndex = messagesToCopy.findIndex((m) => m.id === fromMessageId);
        if (messageIndex === -1) {
            throw new Error('Message not found in chat');
        }
        messagesToCopy = messagesToCopy.slice(0, messageIndex + 1);
    }

    // Create new chat
    const newChat = await prisma.chat.create({
        data: {
            userId,
            title: `Fork of: ${originalChat.title}`,
            modelPreference: originalChat.modelPreference,
        },
    });

    // Copy messages to new chat
    for (const msg of messagesToCopy) {
        await prisma.message.create({
            data: {
                chatId: newChat.id,
                userId: msg.userId,
                role: msg.role,
                content: msg.content,
                modelUsed: msg.modelUsed,
                tokensIn: msg.tokensIn,
                tokensOut: msg.tokensOut,
                costUsd: msg.costUsd,
                metadata: msg.metadata as Prisma.InputJsonValue | undefined,
            },
        });
    }

    return newChat;
}

/**
 * Generate a share token for a chat
 */
export async function createShareToken(chatId: string, userId: string): Promise<string> {
    // Verify ownership
    const chat = await getChat(chatId, userId);
    if (!chat) {
        throw new Error('Chat not found');
    }

    // Generate a random token
    const token = generateRandomToken(32);

    await prisma.chat.update({
        where: { id: chatId },
        data: {
            shareToken: token,
            sharedAt: new Date(),
        },
    });

    return token;
}

/**
 * Get a shared chat by token (public access)
 */
export async function getSharedChat(token: string) {
    const chat = await prisma.chat.findUnique({
        where: { shareToken: token },
        include: {
            messages: {
                orderBy: { createdAt: 'asc' },
            },
            user: {
                select: {
                    name: true,
                    avatar: true,
                },
            },
        },
    });

    if (chat) {
        return {
            id: chat.id,
            title: chat.title,
            messages: chat.messages.map((m) => ({
                id: m.id,
                role: m.role,
                content: m.content,
                createdAt: m.createdAt,
            })),
            author: chat.user?.name || 'Anonymous',
            sharedAt: chat.sharedAt?.toISOString(),
        };
    }

    return null;
}

/**
 * Revoke a share token
 */
export async function revokeShareToken(chatId: string, userId: string): Promise<void> {
    const chat = await getChat(chatId, userId);
    if (!chat) {
        throw new Error('Chat not found');
    }

    await prisma.chat.update({
        where: { id: chatId },
        data: { shareToken: null, sharedAt: null },
    });
}

// Helper to generate cryptographically secure random token
function generateRandomToken(length: number): string {
    // Use crypto.randomBytes for secure token generation
    return randomBytes(length).toString('base64url').slice(0, length);
}

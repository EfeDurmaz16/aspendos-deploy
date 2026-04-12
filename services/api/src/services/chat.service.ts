/**
 * Chat Database Service
 * Handles CRUD operations for chats and messages using Convex HTTP client.
 */

import { randomBytes } from 'node:crypto';
import { getConvexClient, api } from '../lib/convex';

type Chat = any;
type Message = any;
type User = any;

// ============================================
// USER OPERATIONS
// ============================================

/**
 * Get or create user from Better Auth user ID
 * Better Auth already creates the user in the database via adapter.
 */
export async function getOrCreateUser(
    userId: string,
    email: string,
    _name?: string
): Promise<User> {
    try {
        const client = getConvexClient();

        // Try by ID first
        const existing = await client.query(api.users.get, { id: userId as any });
        if (existing) return existing;

        // Fallback: try by email
        const byEmail = await client.query(api.users.getByEmail, { email });
        if (byEmail) return byEmail;
    } catch (err) {
        console.error('[chat.service] getOrCreateUser error:', err);
    }

    // User should exist if session is valid - this is an error case
    throw new Error('Authenticated user not found in database');
}

/**
 * Get user by ID
 */
export async function getUserById(userId: string): Promise<User | null> {
    try {
        const client = getConvexClient();
        return await client.query(api.users.get, { id: userId as any });
    } catch {
        return null;
    }
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
    try {
        const client = getConvexClient();
        const id = await client.mutation(api.conversations.create, {
            user_id: input.userId as any,
            title: input.title || 'New Chat',
        });
        // Return a chat-like object
        return { id, userId: input.userId, title: input.title || 'New Chat', modelPreference: input.modelPreference };
    } catch (err) {
        console.error('[chat.service] createChat error:', err);
        return null;
    }
}

/**
 * List chats for a user
 */
export async function listChats(options: ListChatsOptions): Promise<Chat[]> {
    try {
        const client = getConvexClient();
        const conversations = await client.query(api.conversations.listByUser, {
            user_id: options.userId as any,
            limit: options.limit || 50,
        });
        return conversations || [];
    } catch {
        return [];
    }
}

/**
 * Get chat by ID with paginated messages (cursor-based)
 */
export async function getChatWithMessages(
    chatId: string,
    userId: string,
    options?: { cursor?: string; limit?: number }
) {
    try {
        const client = getConvexClient();
        const limit = Math.min(options?.limit || 50, 200);

        const chat = await client.query(api.conversations.get, { id: chatId as any });
        if (!chat || chat.user_id !== userId) return null;

        const messages = await client.query(api.messages.listByConversation, {
            conversation_id: chatId as any,
            limit,
        });

        return { ...chat, messages: messages || [] };
    } catch {
        return null;
    }
}

/**
 * Get chat by ID
 */
export async function getChat(chatId: string, userId: string): Promise<Chat | null> {
    try {
        const client = getConvexClient();
        const chat = await client.query(api.conversations.get, { id: chatId as any });
        if (!chat || chat.user_id !== userId) return null;
        return chat;
    } catch {
        return null;
    }
}

/**
 * Update chat
 */
export async function updateChat(
    chatId: string,
    userId: string,
    data: Partial<Pick<Chat, 'title' | 'modelPreference' | 'isArchived'>>
) {
    try {
        const client = getConvexClient();
        // Verify ownership first
        const chat = await client.query(api.conversations.get, { id: chatId as any });
        if (!chat || chat.user_id !== userId) return null;

        if (data.title) {
            await client.mutation(api.conversations.updateTitle, {
                id: chatId as any,
                title: data.title,
            });
        }
        return { count: 1 };
    } catch {
        return null;
    }
}

/**
 * Delete chat
 */
export async function deleteChat(chatId: string, userId: string) {
    try {
        const client = getConvexClient();
        // Verify ownership first
        const chat = await client.query(api.conversations.get, { id: chatId as any });
        if (!chat || chat.user_id !== userId) return { count: 0 };

        await client.mutation(api.conversations.remove, { id: chatId as any });
        return { count: 1 };
    } catch {
        return { count: 0 };
    }
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
    try {
        const client = getConvexClient();
        const id = await client.mutation(api.messages.create, {
            conversation_id: input.chatId as any,
            user_id: input.userId as any,
            role: input.role,
            content: input.content,
        });
        return {
            id,
            chatId: input.chatId,
            userId: input.userId,
            role: input.role,
            content: input.content,
            modelUsed: input.modelUsed,
            metadata: input.metadata,
        };
    } catch (err) {
        console.error('[chat.service] createMessage error:', err);
        return null;
    }
}

/**
 * Get messages for a chat (with optional userId for defense-in-depth ownership check)
 */
export async function getMessages(
    chatId: string,
    limit?: number,
    userId?: string
): Promise<Message[]> {
    try {
        const client = getConvexClient();

        // Optionally verify ownership
        if (userId) {
            const chat = await client.query(api.conversations.get, { id: chatId as any });
            if (!chat || chat.user_id !== userId) return [];
        }

        const messages = await client.query(api.messages.listByConversation, {
            conversation_id: chatId as any,
            limit,
        });
        return messages || [];
    } catch {
        return [];
    }
}

/**
 * Auto-generate chat title from first message
 */
export async function autoGenerateTitle(chatId: string, firstMessage: string) {
    try {
        const client = getConvexClient();
        const title = firstMessage.length > 50 ? `${firstMessage.substring(0, 47)}...` : firstMessage;
        await client.mutation(api.conversations.updateTitle, {
            id: chatId as any,
            title,
        });
        return { id: chatId, title };
    } catch {
        return null;
    }
}

/**
 * Add feedback to a message
 */
export async function addMessageFeedback(
    messageId: string,
    userId: string,
    feedback: 'up' | 'down'
): Promise<Message | null> {
    try {
        const client = getConvexClient();
        // Convex messages schema doesn't have metadata/feedback fields yet
        // Log it as an action instead
        const message = await client.query(api.messages.get, { id: messageId as any });
        if (!message) return null;

        // Verify ownership through conversation
        const chat = await client.query(api.conversations.get, { id: message.conversation_id });
        if (!chat || chat.user_id !== userId) return null;

        // Best-effort: log feedback as action log entry
        await client.mutation(api.actionLog.log, {
            user_id: userId as any,
            event_type: 'message_feedback',
            details: { messageId, feedback, feedbackAt: new Date().toISOString() },
        });

        return { ...message, feedback };
    } catch {
        return null;
    }
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
    const originalChat = await getChatWithMessages(chatId, userId);
    if (!originalChat) {
        throw new Error('Chat not found');
    }

    // Determine which messages to include
    let messagesToCopy = originalChat.messages;
    if (fromMessageId) {
        const messageIndex = messagesToCopy.findIndex((m: any) => m._id === fromMessageId || m.id === fromMessageId);
        if (messageIndex === -1) {
            throw new Error('Message not found in chat');
        }
        messagesToCopy = messagesToCopy.slice(0, messageIndex + 1);
    }

    try {
        const client = getConvexClient();

        // Create new conversation
        const newChatId = await client.mutation(api.conversations.create, {
            user_id: userId as any,
            title: `Fork of: ${originalChat.title || 'Untitled'}`,
        });

        // Copy messages to new chat
        for (const msg of messagesToCopy) {
            await client.mutation(api.messages.create, {
                conversation_id: newChatId,
                user_id: msg.user_id || (userId as any),
                role: msg.role,
                content: msg.content,
            });
        }

        return { id: newChatId, userId, title: `Fork of: ${originalChat.title || 'Untitled'}` };
    } catch (err) {
        console.error('[chat.service] forkChat error:', err);
        throw new Error('Failed to fork chat');
    }
}

/**
 * Generate a share token for a chat
 * Note: Convex schema doesn't have shareToken field — store in action_log as workaround
 */
export async function createShareToken(chatId: string, userId: string): Promise<string> {
    const chat = await getChat(chatId, userId);
    if (!chat) {
        throw new Error('Chat not found');
    }

    const token = generateRandomToken(32);

    try {
        const client = getConvexClient();
        await client.mutation(api.actionLog.log, {
            user_id: userId as any,
            event_type: 'share_token_created',
            details: { chatId, token, sharedAt: new Date().toISOString() },
        });
    } catch {
        // best-effort
    }

    return token;
}

/**
 * Get a shared chat by token (public access)
 * Note: Convex schema doesn't have shareToken — this is a degraded stub
 */
export async function getSharedChat(_token: string) {
    // Share tokens are not indexed in Convex schema yet
    // Return null until share feature is migrated
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
    // No-op — share tokens not stored in Convex schema yet
}

// Helper to generate cryptographically secure random token
function generateRandomToken(length: number): string {
    return randomBytes(length).toString('base64url').slice(0, length);
}

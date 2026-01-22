/**
 * Sync Service - Handles data synchronization between local and server
 *
 * Responsibilities:
 * - Sync local data to server when online
 * - Fetch server data to local storage
 * - Handle conflict resolution
 * - Retry failed mutations
 */

import {
    type LocalChat,
    type LocalMessage,
    type LocalMemory,
    type PendingMutation,
    getLocalChats,
    getPendingMutations,
    removeMutation,
    saveLocalChat,
    saveLocalMemory,
    saveLocalMessage,
    setLastSyncTime,
    updateMutationRetry,
} from './database';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

// ============================================
// SYNC ORCHESTRATION
// ============================================

export interface SyncResult {
    success: boolean;
    syncedChats: number;
    syncedMemories: number;
    processedMutations: number;
    errors: string[];
}

/**
 * Full sync - fetch from server and push pending mutations
 */
export async function performFullSync(authToken: string): Promise<SyncResult> {
    const result: SyncResult = {
        success: true,
        syncedChats: 0,
        syncedMemories: 0,
        processedMutations: 0,
        errors: [],
    };

    try {
        // 1. Process pending mutations first (push local changes)
        const mutationResult = await processPendingMutations(authToken);
        result.processedMutations = mutationResult.processed;
        result.errors.push(...mutationResult.errors);

        // 2. Fetch latest data from server
        const fetchResult = await fetchServerData(authToken);
        result.syncedChats = fetchResult.chats;
        result.syncedMemories = fetchResult.memories;
        result.errors.push(...fetchResult.errors);

        // 3. Update last sync time
        await setLastSyncTime(new Date());

        result.success = result.errors.length === 0;
    } catch (error) {
        result.success = false;
        result.errors.push(error instanceof Error ? error.message : 'Unknown sync error');
    }

    return result;
}

// ============================================
// PUSH PENDING MUTATIONS
// ============================================

async function processPendingMutations(
    authToken: string
): Promise<{ processed: number; errors: string[] }> {
    const mutations = await getPendingMutations();
    let processed = 0;
    const errors: string[] = [];

    for (const mutation of mutations) {
        try {
            await executeMutation(mutation, authToken);
            await removeMutation(mutation.id);
            processed++;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            errors.push(`Mutation ${mutation.id}: ${errorMessage}`);

            // Update retry count (max 5 retries)
            if (mutation.retryCount < 5) {
                await updateMutationRetry(mutation.id, errorMessage);
            } else {
                // Remove mutation after max retries
                await removeMutation(mutation.id);
                errors.push(`Mutation ${mutation.id} failed after max retries, discarded`);
            }
        }
    }

    return { processed, errors };
}

async function executeMutation(mutation: PendingMutation, authToken: string): Promise<void> {
    const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
    };

    switch (mutation.type) {
        case 'create_message':
            await fetch(`${API_BASE}/api/chat/messages`, {
                method: 'POST',
                headers,
                body: JSON.stringify(mutation.payload),
            });
            break;

        case 'create_chat':
            await fetch(`${API_BASE}/api/chats`, {
                method: 'POST',
                headers,
                body: JSON.stringify(mutation.payload),
            });
            break;

        case 'delete_chat':
            await fetch(`${API_BASE}/api/chats/${mutation.payload.chatId}`, {
                method: 'DELETE',
                headers,
            });
            break;

        case 'create_memory':
            await fetch(`${API_BASE}/api/memory`, {
                method: 'POST',
                headers,
                body: JSON.stringify(mutation.payload),
            });
            break;
    }
}

// ============================================
// FETCH SERVER DATA
// ============================================

async function fetchServerData(
    authToken: string
): Promise<{ chats: number; memories: number; errors: string[] }> {
    let chats = 0;
    let memories = 0;
    const errors: string[] = [];

    const headers = {
        Authorization: `Bearer ${authToken}`,
    };

    // Fetch chats
    try {
        const response = await fetch(`${API_BASE}/api/chats`, { headers });
        if (response.ok) {
            const data = await response.json();
            const chatList = data.chats || [];

            for (const chat of chatList) {
                const localChat: LocalChat = {
                    id: chat.id,
                    title: chat.title || 'Untitled',
                    modelId: chat.modelId || 'default',
                    createdAt: new Date(chat.createdAt),
                    updatedAt: new Date(chat.updatedAt),
                    lastSyncedAt: new Date(),
                };
                await saveLocalChat(localChat);
                chats++;

                // Fetch messages for this chat
                await fetchChatMessages(chat.id, authToken);
            }
        }
    } catch (error) {
        errors.push(`Fetch chats: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Fetch memories
    try {
        const response = await fetch(`${API_BASE}/api/memory`, { headers });
        if (response.ok) {
            const data = await response.json();
            const memoryList = data.memories || [];

            for (const memory of memoryList) {
                const localMemory: LocalMemory = {
                    id: memory.id,
                    type: memory.type,
                    content: memory.content,
                    metadata: memory.metadata,
                    importance: memory.importance || 0.5,
                    createdAt: new Date(memory.createdAt),
                    lastSyncedAt: new Date(),
                };
                await saveLocalMemory(localMemory);
                memories++;
            }
        }
    } catch (error) {
        errors.push(`Fetch memories: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return { chats, memories, errors };
}

async function fetchChatMessages(chatId: string, authToken: string): Promise<void> {
    try {
        const response = await fetch(`${API_BASE}/api/chats/${chatId}/messages`, {
            headers: { Authorization: `Bearer ${authToken}` },
        });

        if (response.ok) {
            const data = await response.json();
            const messages = data.messages || [];

            for (const msg of messages) {
                const localMessage: LocalMessage = {
                    id: msg.id,
                    chatId,
                    role: msg.role,
                    content: msg.content,
                    createdAt: new Date(msg.createdAt),
                    syncStatus: 'synced',
                };
                await saveLocalMessage(localMessage);
            }
        }
    } catch {
        // Silently fail for individual chat messages
    }
}

// ============================================
// INCREMENTAL SYNC
// ============================================

/**
 * Quick sync - only push pending mutations (for reconnection)
 */
export async function quickSync(authToken: string): Promise<boolean> {
    try {
        const result = await processPendingMutations(authToken);
        return result.errors.length === 0;
    } catch {
        return false;
    }
}

/**
 * Check if there are pending mutations
 */
export async function hasPendingChanges(): Promise<boolean> {
    const mutations = await getPendingMutations();
    return mutations.length > 0;
}

/**
 * Get count of pending mutations
 */
export async function getPendingCount(): Promise<number> {
    const mutations = await getPendingMutations();
    return mutations.length;
}

/**
 * Offline Database - IndexedDB with Dexie
 *
 * Provides local storage for:
 * - Chats and messages (for offline viewing)
 * - Memories (for offline context)
 * - Pending mutations (for sync when online)
 */

import Dexie, { type EntityTable } from 'dexie';

// ============================================
// TYPES
// ============================================

export interface LocalChat {
    id: string;
    title: string;
    modelId: string;
    createdAt: Date;
    updatedAt: Date;
    lastSyncedAt?: Date;
}

export interface LocalMessage {
    id: string;
    chatId: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    createdAt: Date;
    syncStatus: 'synced' | 'pending' | 'failed';
}

export interface LocalMemory {
    id: string;
    type: 'SEMANTIC' | 'EPISODIC' | 'PROCEDURAL';
    content: string;
    metadata?: Record<string, unknown>;
    importance: number;
    createdAt: Date;
    lastSyncedAt?: Date;
}

export interface PendingMutation {
    id: string;
    type: 'create_message' | 'create_chat' | 'delete_chat' | 'create_memory';
    payload: Record<string, unknown>;
    createdAt: Date;
    retryCount: number;
    lastError?: string;
}

export interface LocalSettings {
    key: string;
    value: unknown;
    updatedAt: Date;
}

// ============================================
// DATABASE
// ============================================

class OfflineDatabase extends Dexie {
    chats!: EntityTable<LocalChat, 'id'>;
    messages!: EntityTable<LocalMessage, 'id'>;
    memories!: EntityTable<LocalMemory, 'id'>;
    pendingMutations!: EntityTable<PendingMutation, 'id'>;
    settings!: EntityTable<LocalSettings, 'key'>;

    constructor() {
        super('aspendos-offline');

        this.version(1).stores({
            chats: 'id, updatedAt, lastSyncedAt',
            messages: 'id, chatId, createdAt, syncStatus',
            memories: 'id, type, importance, createdAt',
            pendingMutations: 'id, type, createdAt, retryCount',
            settings: 'key',
        });
    }
}

export const offlineDb = new OfflineDatabase();

// ============================================
// CHAT OPERATIONS
// ============================================

export async function getLocalChats(): Promise<LocalChat[]> {
    return offlineDb.chats.orderBy('updatedAt').reverse().toArray();
}

export async function getLocalChat(id: string): Promise<LocalChat | undefined> {
    return offlineDb.chats.get(id);
}

export async function saveLocalChat(chat: LocalChat): Promise<void> {
    await offlineDb.chats.put(chat);
}

export async function deleteLocalChat(id: string): Promise<void> {
    await offlineDb.transaction('rw', [offlineDb.chats, offlineDb.messages], async () => {
        await offlineDb.messages.where('chatId').equals(id).delete();
        await offlineDb.chats.delete(id);
    });
}

// ============================================
// MESSAGE OPERATIONS
// ============================================

export async function getLocalMessages(chatId: string): Promise<LocalMessage[]> {
    return offlineDb.messages.where('chatId').equals(chatId).sortBy('createdAt');
}

export async function saveLocalMessage(message: LocalMessage): Promise<void> {
    await offlineDb.messages.put(message);
}

export async function updateMessageSyncStatus(
    id: string,
    status: LocalMessage['syncStatus']
): Promise<void> {
    await offlineDb.messages.update(id, { syncStatus: status });
}

export async function getPendingMessages(): Promise<LocalMessage[]> {
    return offlineDb.messages.where('syncStatus').equals('pending').toArray();
}

// ============================================
// MEMORY OPERATIONS
// ============================================

export async function getLocalMemories(): Promise<LocalMemory[]> {
    return offlineDb.memories.orderBy('createdAt').reverse().toArray();
}

export async function saveLocalMemory(memory: LocalMemory): Promise<void> {
    await offlineDb.memories.put(memory);
}

export async function deleteLocalMemory(id: string): Promise<void> {
    await offlineDb.memories.delete(id);
}

// ============================================
// PENDING MUTATIONS
// ============================================

export async function queueMutation(mutation: Omit<PendingMutation, 'id'>): Promise<string> {
    const id = crypto.randomUUID();
    await offlineDb.pendingMutations.add({ ...mutation, id });
    return id;
}

export async function getPendingMutations(): Promise<PendingMutation[]> {
    return offlineDb.pendingMutations.orderBy('createdAt').toArray();
}

export async function removeMutation(id: string): Promise<void> {
    await offlineDb.pendingMutations.delete(id);
}

export async function updateMutationRetry(id: string, error: string): Promise<void> {
    const mutation = await offlineDb.pendingMutations.get(id);
    if (mutation) {
        await offlineDb.pendingMutations.update(id, {
            retryCount: mutation.retryCount + 1,
            lastError: error,
        });
    }
}

// ============================================
// SETTINGS
// ============================================

export async function getSetting<T>(key: string): Promise<T | undefined> {
    const setting = await offlineDb.settings.get(key);
    return setting?.value as T | undefined;
}

export async function setSetting(key: string, value: unknown): Promise<void> {
    await offlineDb.settings.put({ key, value, updatedAt: new Date() });
}

// ============================================
// SYNC STATUS
// ============================================

export async function getLastSyncTime(): Promise<Date | undefined> {
    return getSetting<Date>('lastSyncTime');
}

export async function setLastSyncTime(time: Date): Promise<void> {
    await setSetting('lastSyncTime', time);
}

export async function clearAllData(): Promise<void> {
    await offlineDb.transaction(
        'rw',
        [
            offlineDb.chats,
            offlineDb.messages,
            offlineDb.memories,
            offlineDb.pendingMutations,
            offlineDb.settings,
        ],
        async () => {
            await offlineDb.chats.clear();
            await offlineDb.messages.clear();
            await offlineDb.memories.clear();
            await offlineDb.pendingMutations.clear();
            await offlineDb.settings.clear();
        }
    );
}

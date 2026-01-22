'use client';

import { useCallback, useEffect, useState } from 'react';
import {
    type LocalChat,
    type LocalMessage,
    deleteLocalChat,
    getLocalChat,
    getLocalChats,
    getLocalMessages,
    queueMutation,
    saveLocalChat,
    saveLocalMessage,
} from '@/lib/offline/database';
import { usePWA } from './use-pwa';

/**
 * Hook for offline-capable chat functionality
 *
 * Provides:
 * - Local chat storage with optimistic updates
 * - Automatic sync when online
 * - Message queuing for offline sends
 */
export function useOfflineChat() {
    const { isOnline } = usePWA();
    const [chats, setChats] = useState<LocalChat[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Load chats from local storage
    useEffect(() => {
        async function loadChats() {
            try {
                const localChats = await getLocalChats();
                setChats(localChats);
            } catch (error) {
                console.error('[OfflineChat] Failed to load chats:', error);
            } finally {
                setIsLoading(false);
            }
        }

        loadChats();
    }, []);

    // Create a new chat (optimistic + queue if offline)
    const createChat = useCallback(
        async (title: string, modelId: string): Promise<LocalChat> => {
            const now = new Date();
            const chat: LocalChat = {
                id: crypto.randomUUID(),
                title,
                modelId,
                createdAt: now,
                updatedAt: now,
            };

            // Save locally first (optimistic)
            await saveLocalChat(chat);
            setChats((prev) => [chat, ...prev]);

            // Queue for server sync if offline
            if (!isOnline) {
                await queueMutation({
                    type: 'create_chat',
                    payload: { title, modelId },
                    createdAt: now,
                    retryCount: 0,
                });
            }

            return chat;
        },
        [isOnline]
    );

    // Delete a chat
    const deleteChat = useCallback(
        async (chatId: string): Promise<void> => {
            // Delete locally first (optimistic)
            await deleteLocalChat(chatId);
            setChats((prev) => prev.filter((c) => c.id !== chatId));

            // Queue for server sync if offline
            if (!isOnline) {
                await queueMutation({
                    type: 'delete_chat',
                    payload: { chatId },
                    createdAt: new Date(),
                    retryCount: 0,
                });
            }
        },
        [isOnline]
    );

    // Refresh chats from local storage
    const refreshChats = useCallback(async () => {
        const localChats = await getLocalChats();
        setChats(localChats);
    }, []);

    return {
        chats,
        isLoading,
        isOnline,
        createChat,
        deleteChat,
        refreshChats,
    };
}

/**
 * Hook for chat messages with offline support
 */
export function useOfflineMessages(chatId: string | undefined) {
    const { isOnline } = usePWA();
    const [messages, setMessages] = useState<LocalMessage[]>([]);
    const [chat, setChat] = useState<LocalChat | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Load messages from local storage
    useEffect(() => {
        if (!chatId) {
            setMessages([]);
            setChat(null);
            setIsLoading(false);
            return;
        }

        async function loadMessages() {
            try {
                const [localChat, localMessages] = await Promise.all([
                    getLocalChat(chatId!),
                    getLocalMessages(chatId!),
                ]);
                setChat(localChat || null);
                setMessages(localMessages);
            } catch (error) {
                console.error('[OfflineChat] Failed to load messages:', error);
            } finally {
                setIsLoading(false);
            }
        }

        loadMessages();
    }, [chatId]);

    // Add a user message (optimistic + queue if offline)
    const addUserMessage = useCallback(
        async (content: string): Promise<LocalMessage> => {
            if (!chatId) throw new Error('No chat selected');

            const now = new Date();
            const message: LocalMessage = {
                id: crypto.randomUUID(),
                chatId,
                role: 'user',
                content,
                createdAt: now,
                syncStatus: isOnline ? 'synced' : 'pending',
            };

            // Save locally first (optimistic)
            await saveLocalMessage(message);
            setMessages((prev) => [...prev, message]);

            // Queue for server sync if offline
            if (!isOnline) {
                await queueMutation({
                    type: 'create_message',
                    payload: { chatId, role: 'user', content },
                    createdAt: now,
                    retryCount: 0,
                });
            }

            return message;
        },
        [chatId, isOnline]
    );

    // Add an assistant message (from local AI or server)
    const addAssistantMessage = useCallback(
        async (content: string): Promise<LocalMessage> => {
            if (!chatId) throw new Error('No chat selected');

            const message: LocalMessage = {
                id: crypto.randomUUID(),
                chatId,
                role: 'assistant',
                content,
                createdAt: new Date(),
                syncStatus: 'synced', // Local AI responses don't need sync
            };

            await saveLocalMessage(message);
            setMessages((prev) => [...prev, message]);

            return message;
        },
        [chatId]
    );

    // Update a message (for streaming)
    const updateMessage = useCallback(
        async (messageId: string, content: string): Promise<void> => {
            setMessages((prev) =>
                prev.map((m) => (m.id === messageId ? { ...m, content } : m))
            );

            // Also update in IndexedDB
            const existing = messages.find((m) => m.id === messageId);
            if (existing) {
                await saveLocalMessage({ ...existing, content });
            }
        },
        [messages]
    );

    return {
        chat,
        messages,
        isLoading,
        isOnline,
        addUserMessage,
        addAssistantMessage,
        updateMessage,
    };
}

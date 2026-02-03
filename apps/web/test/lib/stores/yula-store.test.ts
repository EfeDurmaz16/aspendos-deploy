import { describe, it, expect, beforeEach } from 'vitest';
import { useYulaStore } from '@/stores/yula-store';

describe('YulaStore', () => {
    beforeEach(() => {
        // Reset the store before each test
        useYulaStore.setState({
            user: null,
            chats: [],
            currentChatId: null,
            council: {
                isActive: false,
                isDeliberating: false,
                thoughts: [],
                verdict: null,
            },
            pac: {
                items: [],
                settings: {
                    enabled: true,
                    quietHours: { start: '22:00', end: '08:00' },
                    notificationChannels: ['push', 'email'],
                },
            },
            memory: {
                items: [],
                searchQuery: '',
            },
            preferences: {
                theme: 'system',
                defaultModel: 'gpt-4o',
                streamResponses: true,
            },
        });
    });

    describe('Chat Management', () => {
        it('should create a new chat', () => {
            const store = useYulaStore.getState();
            const chat = {
                id: 'test-chat-1',
                title: 'Test Chat',
                messages: [],
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            store.addChat(chat);
            expect(useYulaStore.getState().chats).toHaveLength(1);
            expect(useYulaStore.getState().chats[0].title).toBe('Test Chat');
        });

        it('should set current chat', () => {
            const store = useYulaStore.getState();
            store.setCurrentChatId('test-chat-1');
            expect(useYulaStore.getState().currentChatId).toBe('test-chat-1');
        });

        it('should delete a chat', () => {
            const store = useYulaStore.getState();
            const chat = {
                id: 'test-chat-1',
                title: 'Test Chat',
                messages: [],
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            store.addChat(chat);
            expect(useYulaStore.getState().chats).toHaveLength(1);

            store.deleteChat('test-chat-1');
            expect(useYulaStore.getState().chats).toHaveLength(0);
        });
    });

    describe('Council', () => {
        it('should start deliberation', () => {
            const store = useYulaStore.getState();
            store.startCouncilDeliberation();

            const state = useYulaStore.getState();
            expect(state.council.isActive).toBe(true);
            expect(state.council.isDeliberating).toBe(true);
            expect(state.council.thoughts).toHaveLength(0);
        });

        it('should add council thought', () => {
            const store = useYulaStore.getState();
            store.startCouncilDeliberation();

            store.addCouncilThought({
                persona: 'logic',
                thought: 'Test thought',
                confidence: 0.85,
                timestamp: new Date(),
            });

            expect(useYulaStore.getState().council.thoughts).toHaveLength(1);
            expect(useYulaStore.getState().council.thoughts[0].persona).toBe('logic');
        });

        it('should set council verdict', () => {
            const store = useYulaStore.getState();
            store.startCouncilDeliberation();

            const verdict = {
                recommendation: 'Test recommendation',
                confidence: 0.9,
                reasoning: 'Test reasoning',
                contributions: {
                    logic: 'Logic thought',
                    creative: 'Creative thought',
                    prudent: 'Prudent thought',
                },
            };

            store.setCouncilVerdict(verdict);
            const state = useYulaStore.getState();

            expect(state.council.verdict).not.toBeNull();
            expect(state.council.verdict?.recommendation).toBe('Test recommendation');
            expect(state.council.isDeliberating).toBe(false);
        });

        it('should reset council', () => {
            const store = useYulaStore.getState();
            store.startCouncilDeliberation();
            store.addCouncilThought({
                persona: 'logic',
                thought: 'Test',
                confidence: 0.8,
                timestamp: new Date(),
            });

            store.resetCouncil();
            const state = useYulaStore.getState();

            expect(state.council.isActive).toBe(false);
            expect(state.council.isDeliberating).toBe(false);
            expect(state.council.thoughts).toHaveLength(0);
            expect(state.council.verdict).toBeNull();
        });
    });

    describe('PAC', () => {
        it('should add PAC item', () => {
            const store = useYulaStore.getState();
            const item = {
                id: 'pac-1',
                type: 'reminder' as const,
                title: 'Test Reminder',
                description: 'Test description',
                scheduledFor: new Date(),
                status: 'pending' as const,
                createdAt: new Date(),
            };

            store.addPACItem(item);
            expect(useYulaStore.getState().pac.items).toHaveLength(1);
        });

        it('should update PAC item status', () => {
            const store = useYulaStore.getState();
            const item = {
                id: 'pac-1',
                type: 'reminder' as const,
                title: 'Test Reminder',
                description: 'Test description',
                scheduledFor: new Date(),
                status: 'pending' as const,
                createdAt: new Date(),
            };

            store.addPACItem(item);
            store.updatePACItemStatus('pac-1', 'approved');

            expect(useYulaStore.getState().pac.items[0].status).toBe('approved');
        });

        it('should update PAC settings', () => {
            const store = useYulaStore.getState();
            store.updatePACSettings({ enabled: false });

            expect(useYulaStore.getState().pac.settings.enabled).toBe(false);
        });
    });

    describe('Memory', () => {
        it('should add memory item', () => {
            const store = useYulaStore.getState();
            const item = {
                id: 'mem-1',
                content: 'Test memory',
                type: 'explicit' as const,
                createdAt: new Date(),
            };

            store.addMemoryItem(item);
            expect(useYulaStore.getState().memory.items).toHaveLength(1);
        });

        it('should delete memory item', () => {
            const store = useYulaStore.getState();
            const item = {
                id: 'mem-1',
                content: 'Test memory',
                type: 'explicit' as const,
                createdAt: new Date(),
            };

            store.addMemoryItem(item);
            store.deleteMemoryItem('mem-1');
            expect(useYulaStore.getState().memory.items).toHaveLength(0);
        });

        it('should set memory search query', () => {
            const store = useYulaStore.getState();
            store.setMemorySearchQuery('test query');
            expect(useYulaStore.getState().memory.searchQuery).toBe('test query');
        });
    });

    describe('Preferences', () => {
        it('should update preferences', () => {
            const store = useYulaStore.getState();
            store.updatePreferences({ theme: 'dark', defaultModel: 'claude-3-5-sonnet' });

            const state = useYulaStore.getState();
            expect(state.preferences.theme).toBe('dark');
            expect(state.preferences.defaultModel).toBe('claude-3-5-sonnet');
        });
    });
});

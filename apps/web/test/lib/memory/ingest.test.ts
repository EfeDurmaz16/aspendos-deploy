/**
 * Tests for Memory Ingest Module
 *
 * This tests the parsing of ChatGPT/Claude exports and format detection.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    parseChatGPTExport,
    parseClaudeExport,
    detectExportFormat,
    type AspendosExport,
} from '@/lib/memory/ingest';

// Mock dependencies
vi.mock('@/lib/services/openai', () => ({
    createEmbedding: vi.fn(),
    createEmbeddings: vi.fn(),
}));

vi.mock('@/lib/services/qdrant', () => ({
    storeMemory: vi.fn(),
    qdrant: {
        scroll: vi.fn(),
    },
    COLLECTIONS: {
        USER_MEMORIES: 'user_memories',
        CONVERSATION_EMBEDDINGS: 'conversation_embeddings',
    },
    VECTOR_SIZE: 1536,
}));

vi.mock('uuid', () => ({
    v4: () => 'mock-uuid-1234',
}));

describe('Memory Ingest Module', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('parseChatGPTExport', () => {
        it('should parse valid ChatGPT export format', () => {
            const chatGPTData = [
                {
                    title: 'Test Conversation',
                    create_time: 1700000000,
                    update_time: 1700001000,
                    mapping: {
                        'node-1': {
                            message: {
                                id: 'msg-1',
                                author: { role: 'user' },
                                content: { content_type: 'text', parts: ['Hello!'] },
                                create_time: 1700000100,
                            },
                        },
                        'node-2': {
                            message: {
                                id: 'msg-2',
                                author: { role: 'assistant' },
                                content: { content_type: 'text', parts: ['Hi there!'] },
                                create_time: 1700000200,
                            },
                        },
                    },
                },
            ];

            const result = parseChatGPTExport(chatGPTData);

            expect(result.conversations).toHaveLength(1);
            expect(result.messageCount).toBe(2);
            expect(result.conversations[0]).toContain('[Test Conversation]');
            expect(result.conversations[0]).toContain('User: Hello!');
            expect(result.conversations[0]).toContain('Assistant: Hi there!');
        });

        it('should handle conversations without titles', () => {
            const chatGPTData = [
                {
                    create_time: 1700000000,
                    update_time: 1700001000,
                    mapping: {
                        'node-1': {
                            message: {
                                id: 'msg-1',
                                author: { role: 'user' },
                                content: { content_type: 'text', parts: ['Test message'] },
                                create_time: 1700000100,
                            },
                        },
                    },
                },
            ];

            const result = parseChatGPTExport(chatGPTData);

            expect(result.conversations[0]).toContain('[Untitled Conversation]');
        });

        it('should skip system messages', () => {
            const chatGPTData = [
                {
                    title: 'Test',
                    mapping: {
                        'node-1': {
                            message: {
                                id: 'msg-1',
                                author: { role: 'system' },
                                content: { content_type: 'text', parts: ['System prompt'] },
                                create_time: 1700000100,
                            },
                        },
                        'node-2': {
                            message: {
                                id: 'msg-2',
                                author: { role: 'user' },
                                content: { content_type: 'text', parts: ['User message'] },
                                create_time: 1700000200,
                            },
                        },
                    },
                },
            ];

            const result = parseChatGPTExport(chatGPTData);

            expect(result.messageCount).toBe(1);
            expect(result.conversations[0]).not.toContain('System prompt');
        });

        it('should skip null messages', () => {
            const chatGPTData = [
                {
                    title: 'Test',
                    mapping: {
                        'node-1': { message: null },
                        'node-2': {
                            message: {
                                id: 'msg-2',
                                author: { role: 'user' },
                                content: { content_type: 'text', parts: ['Valid message'] },
                                create_time: 1700000200,
                            },
                        },
                    },
                },
            ];

            const result = parseChatGPTExport(chatGPTData);

            expect(result.messageCount).toBe(1);
        });

        it('should throw error for invalid format', () => {
            expect(() => parseChatGPTExport({ invalid: 'data' })).toThrow(
                'Invalid ChatGPT export format'
            );
        });

        it('should handle empty conversations array', () => {
            const result = parseChatGPTExport([]);

            expect(result.conversations).toHaveLength(0);
            expect(result.messageCount).toBe(0);
        });
    });

    describe('parseClaudeExport', () => {
        it('should parse valid Claude export format', () => {
            const claudeData = [
                {
                    uuid: 'conv-123',
                    name: 'Claude Conversation',
                    created_at: '2024-01-01T00:00:00Z',
                    updated_at: '2024-01-01T01:00:00Z',
                    chat_messages: [
                        {
                            uuid: 'msg-1',
                            sender: 'human',
                            text: 'Hello Claude!',
                            created_at: '2024-01-01T00:00:00Z',
                        },
                        {
                            uuid: 'msg-2',
                            sender: 'assistant',
                            text: 'Hello! How can I help?',
                            created_at: '2024-01-01T00:01:00Z',
                        },
                    ],
                },
            ];

            const result = parseClaudeExport(claudeData);

            expect(result.conversations).toHaveLength(1);
            expect(result.messageCount).toBe(2);
            expect(result.conversations[0]).toContain('[Claude Conversation]');
            expect(result.conversations[0]).toContain('User: Hello Claude!');
            expect(result.conversations[0]).toContain('Assistant: Hello! How can I help?');
        });

        it('should handle conversations without names', () => {
            const claudeData = [
                {
                    uuid: 'conv-123',
                    created_at: '2024-01-01T00:00:00Z',
                    updated_at: '2024-01-01T01:00:00Z',
                    chat_messages: [
                        {
                            uuid: 'msg-1',
                            sender: 'human',
                            text: 'Test',
                            created_at: '2024-01-01T00:00:00Z',
                        },
                    ],
                },
            ];

            const result = parseClaudeExport(claudeData);

            expect(result.conversations[0]).toContain('[Untitled Conversation]');
        });

        it('should skip conversations with no messages', () => {
            const claudeData = [
                {
                    uuid: 'conv-1',
                    name: 'Empty',
                    chat_messages: [],
                },
                {
                    uuid: 'conv-2',
                    name: 'Has Messages',
                    chat_messages: [
                        { uuid: 'msg-1', sender: 'human', text: 'Hello', created_at: '' },
                    ],
                },
            ];

            const result = parseClaudeExport(claudeData);

            expect(result.conversations).toHaveLength(1);
            expect(result.conversations[0]).toContain('Has Messages');
        });

        it('should throw error for invalid format', () => {
            expect(() => parseClaudeExport({ invalid: 'data' })).toThrow(
                'Invalid Claude export format'
            );
        });
    });

    describe('detectExportFormat', () => {
        it('should detect ChatGPT format', () => {
            const chatGPTData = [{ mapping: {}, title: 'Test' }];
            expect(detectExportFormat(chatGPTData)).toBe('chatgpt');
        });

        it('should detect Claude format', () => {
            const claudeData = [{ chat_messages: [], uuid: '123', name: 'Test' }];
            expect(detectExportFormat(claudeData)).toBe('claude');
        });

        it('should detect Aspendos format', () => {
            const aspendosData: AspendosExport = {
                version: '1.0',
                exportedAt: '2024-01-01T00:00:00Z',
                userId: 'user-123',
                memories: [],
                stats: {
                    totalMemories: 0,
                    byType: {},
                    bySource: {},
                },
            };
            expect(detectExportFormat(aspendosData)).toBe('aspendos');
        });

        it('should return unknown for null/undefined', () => {
            expect(detectExportFormat(null)).toBe('unknown');
            expect(detectExportFormat(undefined)).toBe('unknown');
        });

        it('should return unknown for empty array', () => {
            expect(detectExportFormat([])).toBe('unknown');
        });

        it('should return unknown for unrecognized format', () => {
            expect(detectExportFormat([{ someOtherFormat: true }])).toBe('unknown');
            expect(detectExportFormat({ random: 'object' })).toBe('unknown');
        });
    });
});

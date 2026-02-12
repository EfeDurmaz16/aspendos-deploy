/**
 * Import Parsing Tests
 *
 * Standalone tests for parsing ChatGPT and Claude export formats.
 * These tests don't require any database or service dependencies.
 */
import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';

// ==========================================
// LOCAL PARSING FUNCTIONS (copied for testing)
// ==========================================

interface ParsedMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
    createdAt: Date;
}

interface ParsedConversation {
    externalId: string;
    title: string;
    messages: ParsedMessage[];
    createdAt: Date;
    updatedAt: Date;
    source: 'CHATGPT' | 'CLAUDE';
}

function parseChatGPTExport(data: unknown): ParsedConversation[] {
    const conversations: ParsedConversation[] = [];

    if (!Array.isArray(data)) {
        throw new Error('Invalid ChatGPT export format: expected array');
    }

    for (const conv of data) {
        if (!conv.mapping || !conv.title) continue;

        const messages: ParsedMessage[] = [];
        const mapping = conv.mapping as Record<string, unknown>;

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

        messages.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

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

function parseClaudeExport(data: unknown): ParsedConversation[] {
    const conversations: ParsedConversation[] = [];

    if (!Array.isArray(data)) {
        throw new Error('Invalid Claude export format: expected array');
    }

    for (const conv of data) {
        const messages: ParsedMessage[] = [];

        if (Array.isArray(conv.chat_messages)) {
            for (const msg of conv.chat_messages) {
                if (!msg.sender) continue;

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

                if (!text.trim()) continue;

                messages.push({
                    role: msg.sender === 'human' ? 'user' : 'assistant',
                    content: text,
                    createdAt: new Date(msg.created_at || conv.created_at),
                });
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

// ==========================================
// CHATGPT EXPORT PARSING TESTS
// ==========================================

describe('parseChatGPTExport', () => {
    it('should parse valid ChatGPT export format', () => {
        const mockExport = [
            {
                id: 'conv-123',
                title: 'Test Conversation',
                create_time: 1700000000,
                update_time: 1700001000,
                mapping: {
                    node1: {
                        message: {
                            author: { role: 'user' },
                            content: { parts: ['Hello!'] },
                            create_time: 1700000100,
                        },
                    },
                    node2: {
                        message: {
                            author: { role: 'assistant' },
                            content: { parts: ['Hi there! How can I help?'] },
                            create_time: 1700000200,
                        },
                    },
                },
            },
        ];

        const result = parseChatGPTExport(mockExport);

        expect(result).toHaveLength(1);
        expect(result[0].title).toBe('Test Conversation');
        expect(result[0].source).toBe('CHATGPT');
        expect(result[0].messages).toHaveLength(2);
        expect(result[0].messages[0].role).toBe('user');
        expect(result[0].messages[0].content).toBe('Hello!');
        expect(result[0].messages[1].role).toBe('assistant');
    });

    it('should handle multiple conversations', () => {
        const mockExport = [
            {
                id: 'conv-1',
                title: 'First Conversation',
                mapping: {
                    node1: {
                        message: {
                            author: { role: 'user' },
                            content: { parts: ['Message 1'] },
                            create_time: 1700000100,
                        },
                    },
                },
            },
            {
                id: 'conv-2',
                title: 'Second Conversation',
                mapping: {
                    node1: {
                        message: {
                            author: { role: 'user' },
                            content: { parts: ['Message 2'] },
                            create_time: 1700000200,
                        },
                    },
                },
            },
        ];

        const result = parseChatGPTExport(mockExport);

        expect(result).toHaveLength(2);
        expect(result[0].title).toBe('First Conversation');
        expect(result[1].title).toBe('Second Conversation');
    });

    it('should sort messages by creation time', () => {
        const mockExport = [
            {
                id: 'conv-123',
                title: 'Test',
                mapping: {
                    node1: {
                        message: {
                            author: { role: 'user' },
                            content: { parts: ['Second message'] },
                            create_time: 1700000200,
                        },
                    },
                    node2: {
                        message: {
                            author: { role: 'user' },
                            content: { parts: ['First message'] },
                            create_time: 1700000100,
                        },
                    },
                },
            },
        ];

        const result = parseChatGPTExport(mockExport);

        expect(result[0].messages[0].content).toBe('First message');
        expect(result[0].messages[1].content).toBe('Second message');
    });

    it('should filter out system messages', () => {
        const mockExport = [
            {
                id: 'conv-123',
                title: 'Test',
                mapping: {
                    node1: {
                        message: {
                            author: { role: 'system' },
                            content: { parts: ['System prompt'] },
                            create_time: 1700000100,
                        },
                    },
                    node2: {
                        message: {
                            author: { role: 'user' },
                            content: { parts: ['User message'] },
                            create_time: 1700000200,
                        },
                    },
                },
            },
        ];

        const result = parseChatGPTExport(mockExport);

        expect(result[0].messages).toHaveLength(1);
        expect(result[0].messages[0].role).toBe('user');
    });

    it('should handle multi-part messages', () => {
        const mockExport = [
            {
                id: 'conv-123',
                title: 'Test',
                mapping: {
                    node1: {
                        message: {
                            author: { role: 'user' },
                            content: { parts: ['Part 1', 'Part 2', 'Part 3'] },
                            create_time: 1700000100,
                        },
                    },
                },
            },
        ];

        const result = parseChatGPTExport(mockExport);

        expect(result[0].messages[0].content).toBe('Part 1\nPart 2\nPart 3');
    });

    it('should skip conversations without title', () => {
        const mockExport = [
            {
                id: 'conv-123',
                mapping: {
                    node1: {
                        message: {
                            author: { role: 'user' },
                            content: { parts: ['Hello'] },
                        },
                    },
                },
            },
        ];

        const result = parseChatGPTExport(mockExport);

        expect(result).toHaveLength(0);
    });

    it('should skip conversations without mapping', () => {
        const mockExport = [
            {
                id: 'conv-123',
                title: 'Test',
            },
        ];

        const result = parseChatGPTExport(mockExport);

        expect(result).toHaveLength(0);
    });

    it('should throw error for non-array input', () => {
        expect(() => parseChatGPTExport({})).toThrow('Invalid ChatGPT export format');
        expect(() => parseChatGPTExport(null)).toThrow('Invalid ChatGPT export format');
        expect(() => parseChatGPTExport('string')).toThrow('Invalid ChatGPT export format');
    });

    it('should handle empty array', () => {
        const result = parseChatGPTExport([]);
        expect(result).toHaveLength(0);
    });

    it('should generate external ID if missing', () => {
        const mockExport = [
            {
                title: 'Test',
                mapping: {
                    node1: {
                        message: {
                            author: { role: 'user' },
                            content: { parts: ['Hello'] },
                        },
                    },
                },
            },
        ];

        const result = parseChatGPTExport(mockExport);

        expect(result[0].externalId).toMatch(/^chatgpt-[0-9a-f-]{36}$/);
    });
});

// ==========================================
// CLAUDE EXPORT PARSING TESTS
// ==========================================

describe('parseClaudeExport', () => {
    it('should parse valid Claude export format', () => {
        const mockExport = [
            {
                uuid: 'uuid-123',
                name: 'Test Conversation',
                created_at: '2024-01-15T10:00:00Z',
                updated_at: '2024-01-15T11:00:00Z',
                chat_messages: [
                    {
                        sender: 'human',
                        text: 'Hello Claude!',
                        created_at: '2024-01-15T10:00:00Z',
                    },
                    {
                        sender: 'assistant',
                        text: 'Hello! How can I assist you?',
                        created_at: '2024-01-15T10:00:10Z',
                    },
                ],
            },
        ];

        const result = parseClaudeExport(mockExport);

        expect(result).toHaveLength(1);
        expect(result[0].title).toBe('Test Conversation');
        expect(result[0].source).toBe('CLAUDE');
        expect(result[0].messages).toHaveLength(2);
        expect(result[0].messages[0].role).toBe('user');
        expect(result[0].messages[0].content).toBe('Hello Claude!');
        expect(result[0].messages[1].role).toBe('assistant');
    });

    it('should handle multiple conversations', () => {
        const mockExport = [
            {
                uuid: 'uuid-1',
                name: 'First',
                created_at: '2024-01-15T10:00:00Z',
                updated_at: '2024-01-15T10:00:00Z',
                chat_messages: [],
            },
            {
                uuid: 'uuid-2',
                name: 'Second',
                created_at: '2024-01-15T11:00:00Z',
                updated_at: '2024-01-15T11:00:00Z',
                chat_messages: [],
            },
        ];

        const result = parseClaudeExport(mockExport);

        expect(result).toHaveLength(2);
        expect(result[0].title).toBe('First');
        expect(result[1].title).toBe('Second');
    });

    it('should convert human sender to user role', () => {
        const mockExport = [
            {
                uuid: 'uuid-123',
                created_at: '2024-01-15T10:00:00Z',
                updated_at: '2024-01-15T10:00:00Z',
                chat_messages: [
                    {
                        sender: 'human',
                        text: 'Test message',
                    },
                ],
            },
        ];

        const result = parseClaudeExport(mockExport);

        expect(result[0].messages[0].role).toBe('user');
    });

    it('should handle missing name with default', () => {
        const mockExport = [
            {
                uuid: 'uuid-123',
                created_at: '2024-01-15T10:00:00Z',
                updated_at: '2024-01-15T10:00:00Z',
                chat_messages: [],
            },
        ];

        const result = parseClaudeExport(mockExport);

        expect(result[0].title).toBe('Untitled Conversation');
    });

    it('should throw error for non-array input', () => {
        expect(() => parseClaudeExport({})).toThrow('Invalid Claude export format');
        expect(() => parseClaudeExport(null)).toThrow('Invalid Claude export format');
        expect(() => parseClaudeExport('string')).toThrow('Invalid Claude export format');
    });

    it('should handle empty array', () => {
        const result = parseClaudeExport([]);
        expect(result).toHaveLength(0);
    });

    it('should generate external ID if uuid missing', () => {
        const mockExport = [
            {
                created_at: '2024-01-15T10:00:00Z',
                updated_at: '2024-01-15T10:00:00Z',
                chat_messages: [],
            },
        ];

        const result = parseClaudeExport(mockExport);

        expect(result[0].externalId).toMatch(/^claude-[0-9a-f-]{36}$/);
    });

    it('should skip messages without sender or text', () => {
        const mockExport = [
            {
                uuid: 'uuid-123',
                created_at: '2024-01-15T10:00:00Z',
                updated_at: '2024-01-15T10:00:00Z',
                chat_messages: [
                    { sender: 'human' }, // Missing text
                    { text: 'Hello' }, // Missing sender
                    { sender: 'human', text: 'Valid message' },
                ],
            },
        ];

        const result = parseClaudeExport(mockExport);

        expect(result[0].messages).toHaveLength(1);
        expect(result[0].messages[0].content).toBe('Valid message');
    });

    it('should handle missing chat_messages array', () => {
        const mockExport = [
            {
                uuid: 'uuid-123',
                created_at: '2024-01-15T10:00:00Z',
                updated_at: '2024-01-15T10:00:00Z',
            },
        ];

        const result = parseClaudeExport(mockExport);

        expect(result[0].messages).toHaveLength(0);
    });

    it('should handle content array fallback when text is empty', () => {
        const mockExport = [
            {
                uuid: 'uuid-123',
                name: 'Test with content array',
                created_at: '2024-01-15T10:00:00Z',
                updated_at: '2024-01-15T10:00:00Z',
                chat_messages: [
                    {
                        sender: 'human',
                        text: '', // Empty text
                        content: [{ type: 'text', text: 'Message from content array' }],
                        created_at: '2024-01-15T10:00:00Z',
                    },
                    {
                        sender: 'assistant',
                        // No text field at all
                        content: [{ type: 'text', text: 'Assistant response from content' }],
                        created_at: '2024-01-15T10:00:10Z',
                    },
                ],
            },
        ];

        const result = parseClaudeExport(mockExport);

        expect(result[0].messages).toHaveLength(2);
        expect(result[0].messages[0].content).toBe('Message from content array');
        expect(result[0].messages[1].content).toBe('Assistant response from content');
    });

    it('should prefer text field over content array', () => {
        const mockExport = [
            {
                uuid: 'uuid-123',
                created_at: '2024-01-15T10:00:00Z',
                updated_at: '2024-01-15T10:00:00Z',
                chat_messages: [
                    {
                        sender: 'human',
                        text: 'Primary text',
                        content: [{ type: 'text', text: 'Fallback text' }],
                    },
                ],
            },
        ];

        const result = parseClaudeExport(mockExport);

        expect(result[0].messages[0].content).toBe('Primary text');
    });

    it('should skip messages with empty content array', () => {
        const mockExport = [
            {
                uuid: 'uuid-123',
                created_at: '2024-01-15T10:00:00Z',
                updated_at: '2024-01-15T10:00:00Z',
                chat_messages: [
                    {
                        sender: 'human',
                        text: '',
                        content: [],
                    },
                    {
                        sender: 'human',
                        text: 'Valid message',
                    },
                ],
            },
        ];

        const result = parseClaudeExport(mockExport);

        expect(result[0].messages).toHaveLength(1);
        expect(result[0].messages[0].content).toBe('Valid message');
    });
});

// ==========================================
// TYPE VALIDATION TESTS
// ==========================================

describe('ParsedConversation Type', () => {
    it('should have correct structure after parsing ChatGPT', () => {
        const mockExport = [
            {
                id: 'conv-123',
                title: 'Test',
                create_time: 1700000000,
                update_time: 1700001000,
                mapping: {
                    node1: {
                        message: {
                            author: { role: 'user' },
                            content: { parts: ['Hello'] },
                            create_time: 1700000100,
                        },
                    },
                },
            },
        ];

        const result = parseChatGPTExport(mockExport);
        const conv: ParsedConversation = result[0];

        expect(typeof conv.externalId).toBe('string');
        expect(typeof conv.title).toBe('string');
        expect(Array.isArray(conv.messages)).toBe(true);
        expect(conv.createdAt).toBeInstanceOf(Date);
        expect(conv.updatedAt).toBeInstanceOf(Date);
        expect(conv.source).toBe('CHATGPT');
    });

    it('should have correct structure after parsing Claude', () => {
        const mockExport = [
            {
                uuid: 'uuid-123',
                name: 'Test',
                created_at: '2024-01-15T10:00:00Z',
                updated_at: '2024-01-15T11:00:00Z',
                chat_messages: [{ sender: 'human', text: 'Hello' }],
            },
        ];

        const result = parseClaudeExport(mockExport);
        const conv: ParsedConversation = result[0];

        expect(typeof conv.externalId).toBe('string');
        expect(typeof conv.title).toBe('string');
        expect(Array.isArray(conv.messages)).toBe(true);
        expect(conv.createdAt).toBeInstanceOf(Date);
        expect(conv.updatedAt).toBeInstanceOf(Date);
        expect(conv.source).toBe('CLAUDE');
    });
});

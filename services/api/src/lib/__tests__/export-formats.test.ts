import { describe, expect, test } from 'vitest';
import {
    type Chat,
    exportChatsForProvider,
    exportToCSV,
    exportToHTML,
    exportToJSON,
    exportToMarkdown,
} from '../export-formats';

describe('exportToJSON', () => {
    test('exports simple data with metadata', () => {
        const data = { test: 'value' };
        const result = exportToJSON(data, 'user123');

        expect(result.mimeType).toBe('application/json');
        expect(result.filename).toMatch(/yula-export-user123-\d{4}-\d{2}-\d{2}\.json/);

        const parsed = JSON.parse(result.content);
        expect(parsed.metadata.version).toBe('1.0.0');
        expect(parsed.metadata.userId).toBe('user123');
        expect(parsed.metadata.itemCount).toBe(1);
        expect(parsed.metadata.exportedAt).toBeDefined();
        expect(parsed.data).toEqual(data);
    });

    test('counts array items correctly', () => {
        const data = [1, 2, 3, 4, 5];
        const result = exportToJSON(data, 'user456');

        const parsed = JSON.parse(result.content);
        expect(parsed.metadata.itemCount).toBe(5);
        expect(parsed.data).toEqual(data);
    });

    test('handles empty array', () => {
        const data: unknown[] = [];
        const result = exportToJSON(data, 'user789');

        const parsed = JSON.parse(result.content);
        expect(parsed.metadata.itemCount).toBe(0);
        expect(parsed.data).toEqual([]);
    });

    test('handles complex nested objects', () => {
        const data = {
            chats: [{ id: 1, messages: [{ role: 'user', content: 'test' }] }],
            metadata: { total: 1 },
        };
        const result = exportToJSON(data, 'user999');

        const parsed = JSON.parse(result.content);
        expect(parsed.data).toEqual(data);
    });
});

describe('exportToCSV', () => {
    test('exports basic data with headers', () => {
        const data = [
            { name: 'Alice', age: 30, city: 'NYC' },
            { name: 'Bob', age: 25, city: 'LA' },
        ];
        const columns = ['name', 'age', 'city'];
        const result = exportToCSV(data, columns, 'user123');

        expect(result.mimeType).toBe('text/csv');
        expect(result.filename).toMatch(/yula-export-user123-\d{4}-\d{2}-\d{2}\.csv/);

        const lines = result.content.split('\n');
        expect(lines[0]).toBe('name,age,city');
        expect(lines[1]).toBe('Alice,30,NYC');
        expect(lines[2]).toBe('Bob,25,LA');
    });

    test('escapes commas in values', () => {
        const data = [{ name: 'Smith, John', city: 'New York, NY' }];
        const columns = ['name', 'city'];
        const result = exportToCSV(data, columns, 'user123');

        const lines = result.content.split('\n');
        expect(lines[1]).toBe('"Smith, John","New York, NY"');
    });

    test('escapes double quotes in values', () => {
        const data = [{ quote: 'He said "Hello"', author: 'John' }];
        const columns = ['quote', 'author'];
        const result = exportToCSV(data, columns, 'user123');

        const lines = result.content.split('\n');
        expect(lines[1]).toBe('"He said ""Hello""",John');
    });

    test('escapes newlines in values', () => {
        const data = [{ text: 'Line 1\nLine 2', id: '1' }];
        const columns = ['text', 'id'];
        const result = exportToCSV(data, columns, 'user123');

        // Check full content since the value contains newlines
        expect(result.content).toBe('text,id\n"Line 1\nLine 2",1');
    });

    test('escapes carriage returns', () => {
        const data = [{ text: 'Line 1\r\nLine 2', id: '2' }];
        const columns = ['text', 'id'];
        const result = exportToCSV(data, columns, 'user123');

        expect(result.content).toContain('"Line 1\r\nLine 2"');
    });

    test('handles unicode characters', () => {
        const data = [{ name: 'José', emoji: '🎉', city: 'São Paulo' }];
        const columns = ['name', 'emoji', 'city'];
        const result = exportToCSV(data, columns, 'user123');

        const lines = result.content.split('\n');
        expect(lines[1]).toBe('José,🎉,São Paulo');
    });

    test('handles empty data', () => {
        const data: Record<string, unknown>[] = [];
        const columns = ['name', 'age'];
        const result = exportToCSV(data, columns, 'user123');

        expect(result.content).toBe('name,age');
    });

    test('handles null and undefined values', () => {
        const data = [{ name: 'Alice', age: null, city: undefined }];
        const columns = ['name', 'age', 'city'];
        const result = exportToCSV(data, columns, 'user123');

        const lines = result.content.split('\n');
        expect(lines[1]).toBe('Alice,,');
    });

    test('handles mixed escaping needs', () => {
        const data = [{ field: 'Complex, "quoted"\nvalue', simple: 'normal' }];
        const columns = ['field', 'simple'];
        const result = exportToCSV(data, columns, 'user123');

        // Check full content since the value contains newlines
        expect(result.content).toBe('field,simple\n"Complex, ""quoted""\nvalue",normal');
    });
});

describe('exportToMarkdown', () => {
    test('exports chat with basic messages', () => {
        const chats: Chat[] = [
            {
                id: 'chat1',
                title: 'Test Chat',
                createdAt: '2026-02-13T10:00:00Z',
                messages: [
                    { role: 'user', content: 'Hello' },
                    { role: 'assistant', content: 'Hi there!', model: 'gpt-4' },
                ],
            },
        ];
        const result = exportToMarkdown(chats, 'user123');

        expect(result.mimeType).toBe('text/markdown');
        expect(result.filename).toMatch(/yula-chats-user123-\d{4}-\d{2}-\d{2}\.md/);
        expect(result.content).toContain('# YULA Chat Export');
        expect(result.content).toContain('## Test Chat');
        expect(result.content).toContain('**User:** Hello');
        expect(result.content).toContain('**AI (gpt-4):** Hi there!');
    });

    test('preserves code blocks in messages', () => {
        const chats: Chat[] = [
            {
                id: 'chat2',
                title: 'Code Chat',
                createdAt: '2026-02-13T10:00:00Z',
                messages: [
                    {
                        role: 'user',
                        content: "Here's some code:\n```js\nconsole.log('test');\n```",
                    },
                    {
                        role: 'assistant',
                        content: "Good code:\n```python\nprint('hello')\n```",
                    },
                ],
            },
        ];
        const result = exportToMarkdown(chats, 'user123');

        expect(result.content).toContain("```js\nconsole.log('test');\n```");
        expect(result.content).toContain("```python\nprint('hello')\n```");
    });

    test('skips system messages', () => {
        const chats: Chat[] = [
            {
                id: 'chat3',
                title: 'Chat with System',
                createdAt: '2026-02-13T10:00:00Z',
                messages: [
                    { role: 'system', content: 'You are a helpful assistant' },
                    { role: 'user', content: 'Hello' },
                    { role: 'assistant', content: 'Hi!' },
                ],
            },
        ];
        const result = exportToMarkdown(chats, 'user123');

        expect(result.content).not.toContain('You are a helpful assistant');
        expect(result.content).toContain('**User:** Hello');
        expect(result.content).toContain('**AI:** Hi!');
    });

    test('handles empty chats', () => {
        const chats: Chat[] = [];
        const result = exportToMarkdown(chats, 'user123');

        expect(result.content).toContain('# YULA Chat Export');
        expect(result.content).toContain('No chats found');
    });

    test('handles chat without title', () => {
        const chats: Chat[] = [
            {
                id: 'chat4',
                createdAt: '2026-02-13T10:00:00Z',
                messages: [{ role: 'user', content: 'Test' }],
            },
        ];
        const result = exportToMarkdown(chats, 'user123');

        expect(result.content).toContain('## Untitled Chat');
    });

    test('formats multiple chats with separators', () => {
        const chats: Chat[] = [
            {
                id: 'chat1',
                title: 'Chat 1',
                createdAt: '2026-02-13T10:00:00Z',
                messages: [{ role: 'user', content: 'First' }],
            },
            {
                id: 'chat2',
                title: 'Chat 2',
                createdAt: '2026-02-13T11:00:00Z',
                messages: [{ role: 'user', content: 'Second' }],
            },
        ];
        const result = exportToMarkdown(chats, 'user123');

        expect(result.content).toContain('## Chat 1');
        expect(result.content).toContain('## Chat 2');
        expect(result.content).toContain('---');
    });
});

describe('exportToHTML', () => {
    test('generates valid HTML structure', () => {
        const chats: Chat[] = [
            {
                id: 'chat1',
                title: 'Test Chat',
                createdAt: '2026-02-13T10:00:00Z',
                messages: [
                    { role: 'user', content: 'Hello' },
                    { role: 'assistant', content: 'Hi!' },
                ],
            },
        ];
        const result = exportToHTML(chats, 'user123');

        expect(result.mimeType).toBe('text/html');
        expect(result.filename).toMatch(/yula-chats-user123-\d{4}-\d{2}-\d{2}\.html/);
        expect(result.content).toContain('<!DOCTYPE html>');
        expect(result.content).toContain('<html lang="en">');
        expect(result.content).toContain('</html>');
        expect(result.content).toContain('<head>');
        expect(result.content).toContain('<body>');
    });

    test('includes inline CSS styles', () => {
        const chats: Chat[] = [];
        const result = exportToHTML(chats, 'user123');

        expect(result.content).toContain('<style>');
        expect(result.content).toContain('body {');
        expect(result.content).toContain('background: #1a1a1a');
        expect(result.content).toContain('.message.user');
        expect(result.content).toContain('.message.assistant');
    });

    test('includes metadata header', () => {
        const chats: Chat[] = [];
        const result = exportToHTML(chats, 'user123');

        expect(result.content).toContain('YULA Chat Export');
        expect(result.content).toContain('User ID: user123');
        expect(result.content).toContain('Total Chats: 0');
        expect(result.content).toContain('Exported:');
    });

    test('renders messages with correct CSS classes', () => {
        const chats: Chat[] = [
            {
                id: 'chat1',
                title: 'Test',
                createdAt: '2026-02-13T10:00:00Z',
                messages: [
                    { role: 'user', content: 'Question' },
                    { role: 'assistant', content: 'Answer', model: 'claude' },
                ],
            },
        ];
        const result = exportToHTML(chats, 'user123');

        expect(result.content).toContain('class="message user"');
        expect(result.content).toContain('class="message assistant"');
        expect(result.content).toContain('AI (claude)');
    });

    test('escapes HTML special characters in content', () => {
        const chats: Chat[] = [
            {
                id: 'chat1',
                title: 'Test',
                createdAt: '2026-02-13T10:00:00Z',
                messages: [
                    { role: 'user', content: "<script>alert('xss')</script>" },
                    { role: 'assistant', content: 'Safe & sound' },
                ],
            },
        ];
        const result = exportToHTML(chats, 'user123');

        expect(result.content).toContain('&lt;script&gt;');
        expect(result.content).toContain('&lt;/script&gt;');
        expect(result.content).toContain('Safe &amp; sound');
        expect(result.content).not.toContain('<script>alert');
    });

    test('escapes HTML in userId', () => {
        const chats: Chat[] = [];
        const result = exportToHTML(chats, 'user<script>123');

        expect(result.content).toContain('user&lt;script&gt;123');
        expect(result.content).not.toContain('user<script>123');
    });

    test('handles empty chats', () => {
        const chats: Chat[] = [];
        const result = exportToHTML(chats, 'user123');

        expect(result.content).toContain('No chats found');
    });

    test('skips system messages', () => {
        const chats: Chat[] = [
            {
                id: 'chat1',
                title: 'Test',
                createdAt: '2026-02-13T10:00:00Z',
                messages: [
                    { role: 'system', content: 'System prompt' },
                    { role: 'user', content: 'User message' },
                ],
            },
        ];
        const result = exportToHTML(chats, 'user123');

        expect(result.content).not.toContain('System prompt');
        expect(result.content).toContain('User message');
    });
});

describe('exportChatsForProvider', () => {
    const sampleChats: Chat[] = [
        {
            id: 'chat1',
            title: 'Test Chat',
            createdAt: '2026-02-13T10:00:00Z',
            messages: [
                {
                    role: 'user',
                    content: 'Hello',
                    timestamp: '2026-02-13T10:00:00Z',
                },
                {
                    role: 'assistant',
                    content: 'Hi!',
                    timestamp: '2026-02-13T10:00:05Z',
                },
            ],
        },
    ];

    test('exports in ChatGPT format', () => {
        const result = exportChatsForProvider(sampleChats, 'chatgpt', 'user123');

        expect(result.mimeType).toBe('application/json');
        expect(result.filename).toMatch(/yula-chatgpt-format-user123-\d{4}-\d{2}-\d{2}\.json/);

        const parsed = JSON.parse(result.content);
        expect(Array.isArray(parsed)).toBe(true);
        expect(parsed[0]).toHaveProperty('id');
        expect(parsed[0]).toHaveProperty('title');
        expect(parsed[0]).toHaveProperty('create_time');
        expect(parsed[0]).toHaveProperty('mapping');

        const mapping = parsed[0].mapping;
        expect(mapping.node_0).toBeDefined();
        expect(mapping.node_0.message.author.role).toBe('user');
        expect(mapping.node_0.message.content.parts[0]).toBe('Hello');
        expect(mapping.node_1.message.author.role).toBe('assistant');
    });

    test('exports in Claude format', () => {
        const result = exportChatsForProvider(sampleChats, 'claude', 'user123');

        expect(result.mimeType).toBe('application/json');
        expect(result.filename).toMatch(/yula-claude-format-user123-\d{4}-\d{2}-\d{2}\.json/);

        const parsed = JSON.parse(result.content);
        expect(Array.isArray(parsed)).toBe(true);
        expect(parsed[0]).toHaveProperty('uuid');
        expect(parsed[0]).toHaveProperty('name');
        expect(parsed[0]).toHaveProperty('chat_messages');

        const messages = parsed[0].chat_messages;
        expect(messages[0].sender).toBe('human');
        expect(messages[0].text).toBe('Hello');
        expect(messages[1].sender).toBe('assistant');
        expect(messages[1].text).toBe('Hi!');
    });

    test('exports in generic format', () => {
        const result = exportChatsForProvider(sampleChats, 'generic', 'user123');

        expect(result.mimeType).toBe('application/json');
        expect(result.filename).toMatch(/yula-generic-format-user123-\d{4}-\d{2}-\d{2}\.json/);

        const parsed = JSON.parse(result.content);
        expect(Array.isArray(parsed)).toBe(true);
        expect(parsed[0]).toHaveProperty('id');
        expect(parsed[0]).toHaveProperty('title');
        expect(parsed[0]).toHaveProperty('messages');

        const messages = parsed[0].messages;
        expect(messages[0].role).toBe('user');
        expect(messages[0].content).toBe('Hello');
        expect(messages[1].role).toBe('assistant');
    });

    test('ChatGPT format has correct node structure', () => {
        const result = exportChatsForProvider(sampleChats, 'chatgpt', 'user123');
        const parsed = JSON.parse(result.content);
        const mapping = parsed[0].mapping;

        expect(mapping.node_0.parent).toBe(null);
        expect(mapping.node_0.children).toEqual(['node_1']);
        expect(mapping.node_1.parent).toBe('node_0');
        expect(mapping.node_1.children).toEqual([]);
    });

    test('handles chats without timestamps', () => {
        const chatsNoTimestamp: Chat[] = [
            {
                id: 'chat2',
                title: 'No Timestamps',
                createdAt: '2026-02-13T12:00:00Z',
                messages: [
                    { role: 'user', content: 'Test' },
                    { role: 'assistant', content: 'Response' },
                ],
            },
        ];

        const result = exportChatsForProvider(chatsNoTimestamp, 'claude', 'user123');
        const parsed = JSON.parse(result.content);

        expect(parsed[0].chat_messages[0].created_at).toBeDefined();
        expect(parsed[0].chat_messages[1].created_at).toBeDefined();
    });
});

describe('large dataset handling', () => {
    test('handles large CSV export (1000 rows)', () => {
        const data = Array.from({ length: 1000 }, (_, i) => ({
            id: i,
            name: `User ${i}`,
            email: `user${i}@example.com`,
        }));
        const columns = ['id', 'name', 'email'];
        const result = exportToCSV(data, columns, 'user123');

        const lines = result.content.split('\n');
        expect(lines.length).toBe(1001); // header + 1000 rows
    });

    test('handles large chat export (100 chats)', () => {
        const chats: Chat[] = Array.from({ length: 100 }, (_, i) => ({
            id: `chat${i}`,
            title: `Chat ${i}`,
            createdAt: '2026-02-13T10:00:00Z',
            messages: [
                { role: 'user', content: `Message ${i}` },
                { role: 'assistant', content: `Response ${i}` },
            ],
        }));

        const result = exportToMarkdown(chats, 'user123');
        expect(result.content).toContain('Total Chats: 100');
        expect(result.content).toContain('Chat 0');
        expect(result.content).toContain('Chat 99');
    });

    test('handles messages with very long content', () => {
        const longContent = 'x'.repeat(10000);
        const chats: Chat[] = [
            {
                id: 'chat1',
                title: 'Long Content',
                createdAt: '2026-02-13T10:00:00Z',
                messages: [{ role: 'user', content: longContent }],
            },
        ];

        const result = exportToHTML(chats, 'user123');
        expect(result.content).toContain(longContent);
    });
});

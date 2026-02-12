/**
 * Import Parsers Tests
 *
 * Tests for Gemini and Perplexity import parsers.
 */
import { describe, expect, it } from 'vitest';
import { parseGeminiExport, parsePerplexityExport } from '../services/import-parsers';

// ==========================================
// GEMINI EXPORT PARSING TESTS
// ==========================================

describe('parseGeminiExport', () => {
    it('should parse valid Gemini export format', () => {
        const mockExport = JSON.stringify([
            {
                title: 'Test Conversation',
                create_time: 1700000000,
                entries: [
                    {
                        role: 'USER',
                        text: 'Hello Gemini!',
                        create_time: 1700000100,
                    },
                    {
                        role: 'MODEL',
                        text: 'Hello! How can I help you today?',
                        create_time: 1700000200,
                    },
                ],
            },
        ]);

        const result = parseGeminiExport(mockExport);

        expect(result).toHaveLength(1);
        expect(result[0].title).toBe('Test Conversation');
        expect(result[0].messages).toHaveLength(2);
        expect(result[0].messages[0].role).toBe('user');
        expect(result[0].messages[0].content).toBe('Hello Gemini!');
        expect(result[0].messages[1].role).toBe('assistant');
        expect(result[0].messages[1].content).toBe('Hello! How can I help you today?');
    });

    it('should handle multiple conversations', () => {
        const mockExport = JSON.stringify([
            {
                title: 'First Conversation',
                entries: [{ role: 'USER', text: 'First message', create_time: 1700000100 }],
            },
            {
                title: 'Second Conversation',
                entries: [{ role: 'USER', text: 'Second message', create_time: 1700000200 }],
            },
        ]);

        const result = parseGeminiExport(mockExport);

        expect(result).toHaveLength(2);
        expect(result[0].title).toBe('First Conversation');
        expect(result[1].title).toBe('Second Conversation');
    });

    it('should use default title for conversations without title', () => {
        const mockExport = JSON.stringify([
            {
                entries: [{ role: 'USER', text: 'Test message' }],
            },
        ]);

        const result = parseGeminiExport(mockExport);

        expect(result[0].title).toBe('Untitled Conversation');
    });

    it('should skip conversations without entries array', () => {
        const mockExport = JSON.stringify([
            {
                title: 'No Entries',
            },
            {
                title: 'Has Entries',
                entries: [{ role: 'USER', text: 'Valid message' }],
            },
        ]);

        const result = parseGeminiExport(mockExport);

        expect(result).toHaveLength(1);
        expect(result[0].title).toBe('Has Entries');
    });

    it('should skip entries without role or text', () => {
        const mockExport = JSON.stringify([
            {
                title: 'Test',
                entries: [
                    { role: 'USER' }, // Missing text
                    { text: 'Missing role' }, // Missing role
                    { role: 'USER', text: 'Valid message' },
                ],
            },
        ]);

        const result = parseGeminiExport(mockExport);

        expect(result[0].messages).toHaveLength(1);
        expect(result[0].messages[0].content).toBe('Valid message');
    });

    it('should skip non-USER and non-MODEL roles', () => {
        const mockExport = JSON.stringify([
            {
                title: 'Test',
                entries: [
                    { role: 'SYSTEM', text: 'System message' },
                    { role: 'USER', text: 'User message' },
                    { role: 'MODEL', text: 'Model message' },
                ],
            },
        ]);

        const result = parseGeminiExport(mockExport);

        expect(result[0].messages).toHaveLength(2);
        expect(result[0].messages[0].role).toBe('user');
        expect(result[0].messages[1].role).toBe('assistant');
    });

    it('should handle timestamps correctly', () => {
        const mockExport = JSON.stringify([
            {
                title: 'Test',
                entries: [
                    { role: 'USER', text: 'Message with timestamp', create_time: 1700000000 },
                    { role: 'USER', text: 'Message without timestamp' },
                ],
            },
        ]);

        const result = parseGeminiExport(mockExport);

        expect(result[0].messages[0].createdAt).toEqual(new Date(1700000000 * 1000));
        expect(result[0].messages[1].createdAt).toBeInstanceOf(Date);
    });

    it('should trim whitespace from text', () => {
        const mockExport = JSON.stringify([
            {
                title: 'Test',
                entries: [{ role: 'USER', text: '  Trimmed message  ' }],
            },
        ]);

        const result = parseGeminiExport(mockExport);

        expect(result[0].messages[0].content).toBe('Trimmed message');
    });

    it('should throw error for invalid JSON', () => {
        expect(() => parseGeminiExport('invalid json')).toThrow('Invalid JSON format');
    });

    it('should throw error for non-array input', () => {
        expect(() => parseGeminiExport(JSON.stringify({}))).toThrow(
            'Invalid Gemini export format: expected array'
        );
    });

    it('should skip conversations with empty entries', () => {
        const mockExport = JSON.stringify([
            {
                title: 'Empty',
                entries: [],
            },
            {
                title: 'Valid',
                entries: [{ role: 'USER', text: 'Message' }],
            },
        ]);

        const result = parseGeminiExport(mockExport);

        expect(result).toHaveLength(1);
        expect(result[0].title).toBe('Valid');
    });
});

// ==========================================
// PERPLEXITY EXPORT PARSING TESTS
// ==========================================

describe('parsePerplexityExport', () => {
    it('should parse valid Perplexity export format', () => {
        const mockExport = JSON.stringify({
            threads: [
                {
                    title: 'Test Thread',
                    created_at: '2024-01-15T10:00:00Z',
                    messages: [
                        {
                            role: 'human',
                            content: 'What is TypeScript?',
                            timestamp: '2024-01-15T10:00:00Z',
                        },
                        {
                            role: 'assistant',
                            content: 'TypeScript is a typed superset of JavaScript [1]',
                            timestamp: '2024-01-15T10:00:10Z',
                        },
                    ],
                },
            ],
        });

        const result = parsePerplexityExport(mockExport);

        expect(result).toHaveLength(1);
        expect(result[0].title).toBe('Test Thread');
        expect(result[0].messages).toHaveLength(2);
        expect(result[0].messages[0].role).toBe('user');
        expect(result[0].messages[0].content).toBe('What is TypeScript?');
        expect(result[0].messages[1].role).toBe('assistant');
    });

    it('should strip citation markers from content', () => {
        const mockExport = JSON.stringify({
            threads: [
                {
                    title: 'Test',
                    messages: [
                        {
                            role: 'assistant',
                            content: 'TypeScript is great [1] and widely used [2]',
                        },
                    ],
                },
            ],
        });

        const result = parsePerplexityExport(mockExport);

        expect(result[0].messages[0].content).toBe('TypeScript is great  and widely used');
    });

    it('should strip multiple consecutive citations', () => {
        const mockExport = JSON.stringify({
            threads: [
                {
                    title: 'Test',
                    messages: [
                        {
                            role: 'assistant',
                            content: 'This is cited [1][2][3]',
                        },
                    ],
                },
            ],
        });

        const result = parsePerplexityExport(mockExport);

        expect(result[0].messages[0].content).toBe('This is cited');
    });

    it('should handle multiple threads', () => {
        const mockExport = JSON.stringify({
            threads: [
                {
                    title: 'First Thread',
                    messages: [{ role: 'human', content: 'Question 1' }],
                },
                {
                    title: 'Second Thread',
                    messages: [{ role: 'human', content: 'Question 2' }],
                },
            ],
        });

        const result = parsePerplexityExport(mockExport);

        expect(result).toHaveLength(2);
        expect(result[0].title).toBe('First Thread');
        expect(result[1].title).toBe('Second Thread');
    });

    it('should use default title for threads without title', () => {
        const mockExport = JSON.stringify({
            threads: [
                {
                    messages: [{ role: 'human', content: 'Test message' }],
                },
            ],
        });

        const result = parsePerplexityExport(mockExport);

        expect(result[0].title).toBe('Untitled Thread');
    });

    it('should skip threads without messages array', () => {
        const mockExport = JSON.stringify({
            threads: [
                {
                    title: 'No Messages',
                },
                {
                    title: 'Has Messages',
                    messages: [{ role: 'human', content: 'Valid message' }],
                },
            ],
        });

        const result = parsePerplexityExport(mockExport);

        expect(result).toHaveLength(1);
        expect(result[0].title).toBe('Has Messages');
    });

    it('should skip messages without role or content', () => {
        const mockExport = JSON.stringify({
            threads: [
                {
                    title: 'Test',
                    messages: [
                        { role: 'human' }, // Missing content
                        { content: 'Missing role' }, // Missing role
                        { role: 'human', content: 'Valid message' },
                    ],
                },
            ],
        });

        const result = parsePerplexityExport(mockExport);

        expect(result[0].messages).toHaveLength(1);
        expect(result[0].messages[0].content).toBe('Valid message');
    });

    it('should skip non-human and non-assistant roles', () => {
        const mockExport = JSON.stringify({
            threads: [
                {
                    title: 'Test',
                    messages: [
                        { role: 'system', content: 'System message' },
                        { role: 'human', content: 'User message' },
                        { role: 'assistant', content: 'Assistant message' },
                    ],
                },
            ],
        });

        const result = parsePerplexityExport(mockExport);

        expect(result[0].messages).toHaveLength(2);
        expect(result[0].messages[0].role).toBe('user');
        expect(result[0].messages[1].role).toBe('assistant');
    });

    it('should handle timestamps correctly', () => {
        const mockExport = JSON.stringify({
            threads: [
                {
                    title: 'Test',
                    messages: [
                        {
                            role: 'human',
                            content: 'With timestamp',
                            timestamp: '2024-01-15T10:00:00Z',
                        },
                        { role: 'human', content: 'Without timestamp' },
                    ],
                },
            ],
        });

        const result = parsePerplexityExport(mockExport);

        expect(result[0].messages[0].createdAt).toEqual(new Date('2024-01-15T10:00:00Z'));
        expect(result[0].messages[1].createdAt).toBeInstanceOf(Date);
    });

    it('should throw error for invalid JSON', () => {
        expect(() => parsePerplexityExport('invalid json')).toThrow('Invalid JSON format');
    });

    it('should throw error for non-object input', () => {
        expect(() => parsePerplexityExport(JSON.stringify([]))).toThrow(
            'Invalid Perplexity export format: missing threads array'
        );
    });

    it('should throw error for missing threads array', () => {
        expect(() => parsePerplexityExport(JSON.stringify({}))).toThrow(
            'Invalid Perplexity export format: missing threads array'
        );
    });

    it('should skip threads with empty messages', () => {
        const mockExport = JSON.stringify({
            threads: [
                {
                    title: 'Empty',
                    messages: [],
                },
                {
                    title: 'Valid',
                    messages: [{ role: 'human', content: 'Message' }],
                },
            ],
        });

        const result = parsePerplexityExport(mockExport);

        expect(result).toHaveLength(1);
        expect(result[0].title).toBe('Valid');
    });
});

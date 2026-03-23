/**
 * Context Compression Tests
 */

import { describe, expect, it } from 'vitest';
import { buildCompressedContextPrompt, needsCompression } from '../context-compression';

describe('needsCompression', () => {
    it('returns false for short conversations', () => {
        const messages = [{ content: 'Hello' }, { content: 'Hi there!' }];
        expect(needsCompression(messages)).toBe(false);
    });

    it('returns true for long conversations', () => {
        const longContent = 'x'.repeat(100000); // ~25K tokens
        const messages = [{ content: longContent }];
        expect(needsCompression(messages)).toBe(true);
    });

    it('respects custom threshold', () => {
        const messages = [{ content: 'x'.repeat(4000) }]; // ~1K tokens
        expect(needsCompression(messages, 500)).toBe(true);
        expect(needsCompression(messages, 2000)).toBe(false);
    });
});

describe('buildCompressedContextPrompt', () => {
    it('builds a formatted prompt from compressed context', () => {
        const context = {
            goal: 'Build a todo app',
            progress: 'Created the database schema',
            decisions: ['Use PostgreSQL', 'Use React'],
            resources: ['schema.prisma'],
            nextSteps: ['Build the API', 'Build the UI'],
            compressedAt: new Date(),
            originalTokenCount: 20000,
            compressedTokenCount: 200,
        };

        const prompt = buildCompressedContextPrompt(context);
        expect(prompt).toContain('Build a todo app');
        expect(prompt).toContain('Use PostgreSQL');
        expect(prompt).toContain('schema.prisma');
        expect(prompt).toContain('Build the API');
        expect(prompt).toContain('Conversation Context');
    });

    it('handles empty arrays gracefully', () => {
        const context = {
            goal: 'Test',
            progress: 'Nothing yet',
            decisions: [],
            resources: [],
            nextSteps: [],
            compressedAt: new Date(),
            originalTokenCount: 100,
            compressedTokenCount: 10,
        };

        const prompt = buildCompressedContextPrompt(context);
        expect(prompt).toContain('Test');
        expect(prompt).not.toContain('Key Decisions');
        expect(prompt).not.toContain('Resources');
    });
});

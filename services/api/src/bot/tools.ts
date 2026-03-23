/**
 * Bot Agent Tools
 *
 * AI SDK tool definitions for the Chat SDK bot.
 * Uses needsApproval for sensitive operations (memory deletion, scheduling).
 * Integrates with SuperMemory tools when available.
 */

import { tool } from 'ai';
import { z } from 'zod';

/**
 * Safe recursive-descent math parser (same as in tools/index.ts).
 * Supports: +, -, *, /, parentheses, unary minus, decimals.
 * No code execution — purely structural parsing.
 */
function safeMathEval(expr: string): number {
    let pos = 0;
    const str = expr.replace(/\s+/g, '');

    function parseExpression(): number {
        let result = parseTerm();
        while (pos < str.length && (str[pos] === '+' || str[pos] === '-')) {
            const op = str[pos++];
            const right = parseTerm();
            result = op === '+' ? result + right : result - right;
        }
        return result;
    }

    function parseTerm(): number {
        let result = parseFactor();
        while (pos < str.length && (str[pos] === '*' || str[pos] === '/')) {
            const op = str[pos++];
            const right = parseFactor();
            result = op === '*' ? result * right : result / right;
        }
        return result;
    }

    function parseFactor(): number {
        if (str[pos] === '-') {
            pos++;
            return -parseFactor();
        }
        if (str[pos] === '(') {
            pos++;
            const result = parseExpression();
            if (str[pos] !== ')') throw new Error('Missing closing parenthesis');
            pos++;
            return result;
        }
        return parseNumber();
    }

    function parseNumber(): number {
        const start = pos;
        while (pos < str.length && ((str[pos] >= '0' && str[pos] <= '9') || str[pos] === '.'))
            pos++;
        if (start === pos) throw new Error(`Unexpected character: ${str[pos] || 'end'}`);
        return parseFloat(str.slice(start, pos));
    }

    const result = parseExpression();
    if (pos < str.length) throw new Error(`Unexpected character: ${str[pos]}`);
    return result;
}

/**
 * Get tools available for a bot user.
 * Includes memory tools, utility tools, and sensitive tools with approval gates.
 */
export async function getAgentTools(userId: string) {
    const tools: Record<string, ReturnType<typeof tool>> = {};

    // Memory search — always available, no approval needed
    tools.memory_search = tool({
        description: "Search the user's memories for relevant context",
        inputSchema: z.object({
            query: z.string().describe('Search query'),
            limit: z.number().optional().default(5),
        }),
        execute: async ({ query, limit }) => {
            const memoryRouter = await import('../services/memory-router.service');
            const results = await memoryRouter.searchMemories(query, userId, { limit });
            return {
                success: true,
                memories: results.map((m) => ({
                    content: m.content,
                    sector: m.sector,
                })),
            };
        },
    });

    // Memory add — available, no approval needed
    tools.memory_add = tool({
        description: "Save important information to the user's memory",
        inputSchema: z.object({
            content: z.string().describe('Content to save'),
            sector: z
                .enum(['episodic', 'semantic', 'procedural', 'emotional', 'reflective'])
                .optional()
                .default('semantic'),
        }),
        execute: async ({ content, sector }) => {
            const memoryRouter = await import('../services/memory-router.service');
            const result = await memoryRouter.addMemory(content, userId, { sector });
            return { success: true, id: result.id };
        },
    });

    // Memory forget — REQUIRES APPROVAL (destructive)
    tools.memory_forget = tool({
        description: 'Forget/delete a memory. This is destructive and requires user approval.',
        inputSchema: z.object({
            memoryContent: z.string().describe('Content of the memory to forget'),
            reason: z.string().describe('Why this memory should be forgotten'),
        }),
        needsApproval: true,
        execute: async ({ memoryContent, reason }) => {
            const memoryRouter = await import('../services/memory-router.service');
            await memoryRouter.supermemory.forgetMemory(userId, { memoryContent, reason });
            return { success: true, message: 'Memory forgotten' };
        },
    });

    // Schedule reminder — REQUIRES APPROVAL (creates a commitment)
    tools.schedule_reminder = tool({
        description:
            'Schedule a reminder for the user. Requires approval since it creates a notification.',
        inputSchema: z.object({
            content: z.string().describe('What to remind about'),
            timeExpression: z
                .string()
                .describe('When to remind (e.g., "in 2 hours", "tomorrow at 9am")'),
        }),
        needsApproval: true,
        execute: async ({ content, timeExpression }) => {
            const { parseTimeExpression, createScheduledTask } = await import(
                '../services/scheduler.service'
            );
            const triggerAt = parseTimeExpression(timeExpression);
            if (!triggerAt) return { success: false, error: 'Could not parse time expression' };

            await createScheduledTask({
                userId,
                chatId: 'bot',
                triggerAt,
                intent: content,
                tone: 'friendly',
            });
            return { success: true, scheduledFor: triggerAt.toISOString() };
        },
    });

    // Calculator — always available (safe recursive-descent parser)
    tools.calculator = tool({
        description: 'Perform mathematical calculations',
        inputSchema: z.object({
            expression: z.string().describe('Math expression (e.g., "2 + 2", "100 * 0.15")'),
        }),
        execute: async ({ expression }) => {
            if (!/^[0-9+\-*/.() \t]+$/.test(expression)) {
                return { success: false, error: 'Invalid characters' };
            }
            try {
                const result = safeMathEval(expression);
                if (!Number.isFinite(result))
                    return { success: false, error: 'Not a finite number' };
                return { success: true, result };
            } catch {
                return { success: false, error: 'Failed to evaluate' };
            }
        },
    });

    // Current time
    tools.current_time = tool({
        description: 'Get the current date and time',
        inputSchema: z.object({
            timezone: z.string().optional().default('UTC'),
        }),
        execute: async ({ timezone }) => {
            const now = new Date();
            return {
                datetime: now.toLocaleString('en-US', { timeZone: timezone }),
                iso: now.toISOString(),
                timezone,
            };
        },
    });

    // Try to add SuperMemory native tools
    try {
        const backend = process.env.MEMORY_BACKEND || 'openmemory';
        if ((backend === 'supermemory' || backend === 'dual') && process.env.SUPERMEMORY_API_KEY) {
            const { supermemoryTools } = await import('@supermemory/tools/ai-sdk');
            const smTools = supermemoryTools({
                apiKey: process.env.SUPERMEMORY_API_KEY,
                containerTags: [`user_${userId}`],
            });
            // Merge, but don't override our custom tools with approval gates
            for (const [name, t] of Object.entries(smTools)) {
                if (!tools[name]) {
                    tools[name] = t;
                }
            }
        }
    } catch {
        // SuperMemory tools not available
    }

    return tools;
}

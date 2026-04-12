export const dynamic = 'force-dynamic';

import { streamText, tool, stepCountIs } from 'ai';
import { gateway } from 'ai';
import type { NextRequest } from 'next/server';
import { z } from 'zod';

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
            pos++;
            return result;
        }
        return parseNumber();
    }

    function parseNumber(): number {
        const start = pos;
        while (pos < str.length && ((str[pos] >= '0' && str[pos] <= '9') || str[pos] === '.')) {
            pos++;
        }
        if (start === pos) throw new Error('Unexpected end');
        return Number.parseFloat(str.slice(start, pos));
    }

    return parseExpression();
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { messages, model: requestedModel } = body;

        if (!messages || !Array.isArray(messages)) {
            return new Response(JSON.stringify({ error: 'Messages array required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const modelId = requestedModel || 'anthropic/claude-sonnet-4.6';

        const result = streamText({
            model: gateway(modelId),
            system: `You are YULA, a deterministic AI agent. Every action you take is cryptographically signed and committed to an audit log. Users can undo, verify, and inspect everything you do.

Be transparent about what you're doing and why. When a tool is blocked or requires approval, explain this clearly.`,
            messages,
            tools: {
                memory_search: tool({
                    description: 'Search user memories for relevant context',
                    parameters: z.object({
                        query: z.string().describe('Search query'),
                    }),
                    execute: async ({ query }) => {
                        if (!process.env.SUPERMEMORY_API_KEY) {
                            return { results: [], note: 'Memory not configured' };
                        }
                        try {
                            const sm = await import('supermemory');
                            const client = new sm.default({ apiKey: process.env.SUPERMEMORY_API_KEY });
                            const results = await client.search.execute({
                                q: query,
                                containerTags: ['user_default'],
                                limit: 5,
                            });
                            return { results: results.results?.map((r: any) => r.content) ?? [] };
                        } catch {
                            return { results: [], note: 'Memory search failed' };
                        }
                    },
                }),
                memory_add: tool({
                    description: 'Save information to user memory',
                    parameters: z.object({
                        content: z.string().describe('Content to remember'),
                    }),
                    execute: async ({ content }) => {
                        if (!process.env.SUPERMEMORY_API_KEY) {
                            return { success: false, note: 'Memory not configured' };
                        }
                        try {
                            const sm = await import('supermemory');
                            const client = new sm.default({ apiKey: process.env.SUPERMEMORY_API_KEY });
                            await client.memories.create({
                                content,
                                containerTags: ['user_default'],
                            });
                            return { success: true };
                        } catch {
                            return { success: false, note: 'Memory save failed' };
                        }
                    },
                }),
                calculator: tool({
                    description: 'Perform mathematical calculations',
                    parameters: z.object({
                        expression: z.string().describe('Math expression to evaluate'),
                    }),
                    execute: async ({ expression }) => {
                        if (!/^[0-9+\-*/.() \t]+$/.test(expression)) {
                            return { error: 'Invalid characters' };
                        }
                        try {
                            const result = safeMathEval(expression);
                            return { result };
                        } catch {
                            return { error: 'Failed to evaluate' };
                        }
                    },
                }),
                current_time: tool({
                    description: 'Get current date and time',
                    parameters: z.object({
                        timezone: z.string().optional().describe('Timezone'),
                    }),
                    execute: async ({ timezone }) => {
                        const now = new Date();
                        return {
                            iso: now.toISOString(),
                            formatted: now.toLocaleString('en-US', {
                                timeZone: timezone || 'UTC',
                            }),
                        };
                    },
                }),
            },
            stopWhen: stepCountIs(5),
        });

        return result.toUIMessageStreamResponse();
    } catch (error) {
        console.error('[Chat Stream] Error:', error);
        return new Response(JSON.stringify({ error: 'Internal server error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}

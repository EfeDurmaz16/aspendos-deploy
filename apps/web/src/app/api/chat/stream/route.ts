export const dynamic = 'force-dynamic';

import { gateway, stepCountIs, streamText, tool } from 'ai';
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { getConvexServer } from '@/lib/convex-server';
import { withGovernance } from '@/lib/governance/step-middleware';
import { api } from '../../../../../../../convex/_generated/api';
import type { Id } from '../../../../../../../convex/_generated/dataModel';

type ChatStreamBody = {
    messages?: unknown;
    message?: unknown;
    chatId?: unknown;
    model?: unknown;
};

export function getMemoryContainerTags(userId: string): string[] {
    return [`user_${userId}`];
}

export function getMessagesFromBody(body: ChatStreamBody) {
    if (Array.isArray(body.messages)) {
        return body.messages;
    }

    if (typeof body.message === 'string' && body.message.trim()) {
        return [{ role: 'user' as const, content: body.message }];
    }

    return null;
}

function getConvexServiceSecret() {
    const secret = process.env.CONVEX_SERVICE_SECRET;
    if (!secret) {
        throw new Error('CONVEX_SERVICE_SECRET is not configured');
    }
    return secret;
}

async function getConvexUserId(workosUser: {
    id: string;
    email?: string | null;
    name?: string | null;
    image?: string | null;
}): Promise<Id<'users'>> {
    const convex = getConvexServer();
    const existing = await convex.query(api.users.getByWorkOSId, {
        service_secret: getConvexServiceSecret(),
        workos_id: workosUser.id,
    });

    if (existing?._id) {
        return existing._id as Id<'users'>;
    }

    if (!workosUser.email) {
        throw new Error('Cannot provision Convex user without email');
    }

    return (await convex.mutation(api.users.upsertFromWorkOS, {
        service_secret: getConvexServiceSecret(),
        workos_id: workosUser.id,
        email: workosUser.email,
        name: workosUser.name || undefined,
        avatar_url: workosUser.image || undefined,
    })) as Id<'users'>;
}

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
        const session = await auth();
        if (!session?.userId) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const body = (await req.json()) as ChatStreamBody;
        const messages = getMessagesFromBody(body);

        if (!messages) {
            return new Response(JSON.stringify({ error: 'Messages array required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const modelId =
            typeof body.model === 'string' && body.model
                ? body.model
                : 'anthropic/claude-sonnet-4.6';
        const sessionId =
            typeof body.chatId === 'string' && body.chatId
                ? body.chatId
                : (req.headers.get('x-yula-session-id') ?? session.session?.id ?? session.userId);
        const memoryContainerTags = getMemoryContainerTags(session.userId);
        const convex = getConvexServer();
        const convexUserId = await getConvexUserId(session.user);

        const streamOptions = withGovernance(
            {
                convex: convex as any,
                userId: convexUserId,
                toolMetadata: {
                    memory_search: {
                        reversibility_class: 'undoable',
                        rollback_strategy: { kind: 'none' },
                        human_explanation: 'Search user memory context',
                    },
                    memory_add: {
                        reversibility_class: 'undoable',
                        rollback_strategy: { kind: 'none' },
                        human_explanation: 'Save content to user memory',
                    },
                    calculator: {
                        reversibility_class: 'undoable',
                        rollback_strategy: { kind: 'none' },
                        human_explanation: 'Evaluate a deterministic local calculation',
                    },
                    current_time: {
                        reversibility_class: 'undoable',
                        rollback_strategy: { kind: 'none' },
                        human_explanation: 'Read the current time',
                    },
                },
            },
            {
                model: gateway(modelId),
                system: `You are YULA, a deterministic AI agent. Every action you take is cryptographically signed and committed to an audit log. Users can undo, verify, and inspect everything you do.

Be transparent about what you're doing and why. When a tool is blocked or requires approval, explain this clearly.`,
                messages,
                tools: {
                    memory_search: tool({
                        description: 'Search user memories for relevant context',
                        inputSchema: z.object({
                            query: z.string().describe('Search query'),
                        }),
                        execute: async ({ query }: { query: string }) => {
                            if (!process.env.SUPERMEMORY_API_KEY) {
                                throw new Error('SuperMemory is not configured');
                            }
                            try {
                                const sm = await import('supermemory');
                                const client = new sm.default({
                                    apiKey: process.env.SUPERMEMORY_API_KEY,
                                });
                                const results = await client.search.execute({
                                    q: query,
                                    containerTags: memoryContainerTags,
                                    limit: 5,
                                });
                                return {
                                    success: true,
                                    results: results.results?.map((r: any) => r.content) ?? [],
                                };
                            } catch (error) {
                                throw new Error(
                                    `SuperMemory query failed: ${
                                        error instanceof Error ? error.message : 'Unknown error'
                                    }`
                                );
                            }
                        },
                    }),
                    memory_add: tool({
                        description: 'Save information to user memory',
                        inputSchema: z.object({
                            content: z.string().describe('Content to remember'),
                        }),
                        execute: async ({ content }: { content: string }) => {
                            if (!process.env.SUPERMEMORY_API_KEY) {
                                throw new Error('SuperMemory is not configured');
                            }
                            try {
                                const sm = await import('supermemory');
                                const client = new sm.default({
                                    apiKey: process.env.SUPERMEMORY_API_KEY,
                                });
                                await client.documents.add({
                                    content,
                                    containerTags: memoryContainerTags,
                                });
                                return { success: true };
                            } catch (error) {
                                throw new Error(
                                    `SuperMemory write failed: ${
                                        error instanceof Error ? error.message : 'Unknown error'
                                    }`
                                );
                            }
                        },
                    }),
                    calculator: tool({
                        description: 'Perform mathematical calculations',
                        inputSchema: z.object({
                            expression: z.string().describe('Math expression to evaluate'),
                        }),
                        execute: async ({ expression }: { expression: string }) => {
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
                        inputSchema: z.object({
                            timezone: z.string().optional().describe('Timezone'),
                        }),
                        execute: async ({ timezone }: { timezone?: string }) => {
                            const now = new Date();
                            return {
                                iso: now.toISOString(),
                                formatted: now.toLocaleString('en-US', {
                                    timeZone: timezone || 'UTC',
                                }),
                            };
                        },
                    }),
                } as any,
                experimental_context: { userId: session.userId, sessionId },
                stopWhen: stepCountIs(5),
            }
        );

        const result = streamText(streamOptions as any);

        return result.toUIMessageStreamResponse();
    } catch (error) {
        console.error('[Chat Stream] Error:', error);
        return new Response(JSON.stringify({ error: 'Internal server error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}

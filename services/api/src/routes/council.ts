/**
 * COUNCIL API Routes - Multi-Model Parallel Querying
 *
 * Handles council sessions with parallel streaming from 4 AI personas.
 */
import { Hono } from 'hono';
import { stream } from 'hono/streaming';
import type { TierName } from '../config/tiers';
import { getLimit } from '../config/tiers';
import { prisma } from '../lib/prisma';
import { moderateContent } from '../lib/content-moderation';
import { requireAuth } from '../middleware/auth';
import { validateBody, validateParams } from '../middleware/validate';
import * as billingService from '../services/billing.service';
import type { PersonaType } from '../services/council.service';
import * as councilService from '../services/council.service';
import {
    createCouncilSessionSchema,
    selectPersonaSchema,
    sessionIdParamSchema,
} from '../validation/council.schema';

type Variables = {
    validatedBody?: unknown;
    validatedQuery?: unknown;
    validatedParams?: unknown;
};
type PersonaStreamChunk = {
    type: 'text' | 'done' | 'error';
    content?: string;
    latencyMs?: number;
    usage?: { promptTokens: number; completionTokens: number };
};

const app = new Hono<{ Variables: Variables }>();

// All routes require authentication
app.use('*', requireAuth);

/**
 * POST /api/council/sessions - Create a new council session and start streaming
 *
 * Returns a streaming response with all 4 personas responding in parallel.
 * Format: Server-Sent Events (SSE)
 */
app.post('/sessions', validateBody(createCouncilSessionSchema), async (c) => {
    const userId = c.get('userId')!;
    const { query } = c.get('validatedBody') as { query: string };

    // Content moderation: block queries with critical safety issues
    const moderation = moderateContent(query);
    if (moderation.action === 'block') {
        return c.json(
            {
                error: 'Query blocked by content safety policy',
                code: 'CONTENT_BLOCKED',
                categories: moderation.categories,
            },
            400
        );
    }

    // Check council session limit based on user's tier
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { tier: true },
    });

    if (!user) {
        return c.json({ error: { code: 'NOT_FOUND', message: 'User not found' } }, 404);
    }

    const tier = (user.tier || 'FREE') as TierName;
    const monthlyLimit = getLimit(tier, 'monthlyCouncilSessions');

    // Check if Council is available for this tier
    if (monthlyLimit === 0) {
        return c.json(
            {
                error: 'Council requires Starter tier or above',
                tier,
                upgradeRequired: true,
            },
            403
        );
    }

    // Count council sessions this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const sessionsThisMonth = await prisma.councilSession.count({
        where: {
            userId,
            createdAt: {
                gte: startOfMonth,
            },
        },
    });

    if (sessionsThisMonth >= monthlyLimit) {
        return c.json(
            {
                error: 'Council session limit reached',
                limit: monthlyLimit,
                used: sessionsThisMonth,
                tier,
            },
            403
        );
    }

    // Create session
    const session = await councilService.createCouncilSession(userId, query);

    // Return session info for streaming endpoint
    return c.json(
        {
            sessionId: session.id,
            streamUrl: `/api/council/sessions/${session.id}/stream`,
            personas: Object.entries(councilService.COUNCIL_PERSONAS).map(([key, def]) => ({
                id: key,
                name: def.name,
                role: def.role,
                color: def.color,
                modelId: def.modelId,
            })),
        },
        201
    );
});

/**
 * GET /api/council/sessions/:id/stream - Stream responses from all personas
 *
 * Server-Sent Events stream with parallel responses.
 */
app.get('/sessions/:id/stream', validateParams(sessionIdParamSchema), async (c) => {
    const userId = c.get('userId')!;
    const { id: sessionId } = c.get('validatedParams') as { id: string };

    // Verify session belongs to user
    const session = await councilService.getCouncilSession(sessionId, userId);
    if (!session) {
        return c.json({ error: { code: 'SESSION_NOT_FOUND', message: 'Session not found' } }, 404);
    }

    // Check token budget for 4 parallel persona calls (~2400 tokens total)
    if (!(await billingService.hasTokens(userId, 2400))) {
        return c.json({ error: 'Insufficient token budget for council session' }, 403);
    }

    // Set up SSE headers
    c.header('Content-Type', 'text/event-stream');
    c.header('Cache-Control', 'no-cache');
    c.header('Connection', 'keep-alive');

    return stream(c, async (stream) => {
        // Use DB-stored persona ordering (learned from user preferences)
        // Session responses are created in preference order during createCouncilSession()
        const dbResponses = session.responses || [];
        const personas: PersonaType[] =
            dbResponses.length > 0
                ? dbResponses.map((r) => r.persona as PersonaType)
                : ['SCHOLAR', 'CREATIVE', 'PRACTICAL', 'DEVILS_ADVOCATE'];

        // Create streaming generators for each persona
        const streams = personas.map((persona) =>
            councilService.streamPersonaResponse(sessionId, persona, session.query, userId)
        );

        // Track completion and per-persona token usage for accurate billing
        const completed = new Set<PersonaType>();
        const generators = new Map<PersonaType, AsyncGenerator<PersonaStreamChunk>>();
        const inFlight = new Map<
            PersonaType,
            Promise<{ persona: PersonaType; result: IteratorResult<PersonaStreamChunk> }>
        >();
        const perPersonaUsage = new Map<
            PersonaType,
            { promptTokens: number; completionTokens: number }
        >();

        personas.forEach((persona, i) => {
            generators.set(persona, streams[i]);
        });

        const queueNext = (persona: PersonaType) => {
            const generator = generators.get(persona);
            if (!generator) return;
            inFlight.set(
                persona,
                generator.next().then((result) => ({
                    persona,
                    result,
                }))
            );
        };

        personas.forEach((persona) => queueNext(persona));

        // Stream all persona chunks as soon as each one is ready (no head-of-line blocking).
        while (inFlight.size > 0) {
            const { persona, result } = await Promise.race(inFlight.values());
            inFlight.delete(persona);

            if (result.done) {
                generators.delete(persona);
                completed.add(persona);
                continue;
            }

            const { type, content, latencyMs, usage } = result.value;

            if (type === 'text') {
                await stream.write(
                    `data: ${JSON.stringify({ persona, type: 'persona_chunk', content })}\n\n`
                );
                queueNext(persona);
            } else if (type === 'done') {
                // Track per-persona token usage for accurate billing
                if (usage) {
                    perPersonaUsage.set(persona, {
                        promptTokens: usage.promptTokens,
                        completionTokens: usage.completionTokens,
                    });
                }
                await stream.write(
                    `data: ${JSON.stringify({ persona, type: 'persona_complete', latencyMs })}\n\n`
                );
                generators.delete(persona);
                completed.add(persona);
            } else if (type === 'error') {
                await stream.write(`data: ${JSON.stringify({ persona, type: 'error', content })}\n\n`);
                generators.delete(persona);
            }
        }

        // Update session status
        await councilService.updateSessionStatus(sessionId);

        // Meter actual token usage per-persona with real model IDs
        // Each persona maps to a real model (gpt-4o, claude-3-5-sonnet, gemini-flash, gpt-4o-mini)
        for (const [persona, usage] of perPersonaUsage) {
            const personaDef = councilService.COUNCIL_PERSONAS[persona];
            if (personaDef && (usage.promptTokens > 0 || usage.completionTokens > 0)) {
                await billingService.recordTokenUsage(
                    userId,
                    usage.promptTokens,
                    usage.completionTokens,
                    personaDef.modelId
                );
            }
        }

        // Send completion event
        await stream.write(`data: ${JSON.stringify({ type: 'complete' })}\n\n`);
    });
});

/**
 * GET /api/council/sessions - List council sessions
 */
app.get('/sessions', async (c) => {
    const userId = c.get('userId')!;
    const limit = Math.min(parseInt(c.req.query('limit') || '20', 10) || 20, 50);

    const sessions = await councilService.listCouncilSessions(userId, limit);

    return c.json({
        sessions: sessions.map((s) => ({
            id: s.id,
            query: s.query,
            status: s.status,
            selectedPersona: s.selectedPersona,
            createdAt: s.createdAt,
            responses: s.responses.map((r) => ({
                persona: r.persona,
                status: r.status,
                latencyMs: r.latencyMs,
            })),
        })),
    });
});

/**
 * GET /api/council/sessions/:id - Get session details
 */
app.get('/sessions/:id', validateParams(sessionIdParamSchema), async (c) => {
    const userId = c.get('userId')!;
    const { id: sessionId } = c.get('validatedParams') as { id: string };

    const session = await councilService.getCouncilSession(sessionId, userId);

    if (!session) {
        return c.json({ error: { code: 'SESSION_NOT_FOUND', message: 'Session not found' } }, 404);
    }

    return c.json({
        session: {
            id: session.id,
            query: session.query,
            status: session.status,
            selectedPersona: session.selectedPersona,
            synthesis: session.synthesis,
            createdAt: session.createdAt,
        },
        responses: session.responses.map((r) => ({
            id: r.id,
            persona: r.persona,
            personaName: councilService.COUNCIL_PERSONAS[r.persona as PersonaType]?.name,
            personaColor: councilService.COUNCIL_PERSONAS[r.persona as PersonaType]?.color,
            modelId: r.modelId,
            content: r.content,
            status: r.status,
            latencyMs: r.latencyMs,
        })),
    });
});

/**
 * POST /api/council/sessions/:id/select - Select preferred response
 */
app.post(
    '/sessions/:id/select',
    validateParams(sessionIdParamSchema),
    validateBody(selectPersonaSchema),
    async (c) => {
        const userId = c.get('userId')!;
        const { id: sessionId } = c.get('validatedParams') as { id: string };
        const { persona } = c.get('validatedBody') as { persona: PersonaType };

        await councilService.selectResponse(sessionId, userId, persona);

        // MOAT: Council→Preference learning (PRO+ only to control costs)
        try {
            const councilUser = await prisma.user.findUnique({
                where: { id: userId },
                select: { tier: true },
            });
            const councilTier = (councilUser?.tier || 'FREE') as string;
            if (councilTier === 'PRO' || councilTier === 'ULTRA') {
                const session = await councilService.getCouncilSession(sessionId, userId);
                if (session) {
                    const openMemory = await import('../services/openmemory.service');
                    await openMemory.addMemory(
                        `Preferred AI persona "${persona}" for query type: ${session.query.slice(0, 100)}`,
                        userId,
                        {
                            sector: 'procedural',
                            metadata: { source: 'council_preference', persona },
                        }
                    );
                }
            }
        } catch {
            // Non-blocking
        }

        return c.json({ success: true });
    }
);

/**
 * POST /api/council/sessions/:id/synthesize - Generate synthesis
 */
app.post('/sessions/:id/synthesize', validateParams(sessionIdParamSchema), async (c) => {
    const userId = c.get('userId')!;
    const { id: sessionId } = c.get('validatedParams') as { id: string };

    // Verify session belongs to user
    const session = await councilService.getCouncilSession(sessionId, userId);
    if (!session) {
        return c.json({ error: { code: 'SESSION_NOT_FOUND', message: 'Session not found' } }, 404);
    }

    // Check token budget before synthesis (uses gpt-4o)
    if (!(await billingService.hasTokens(userId, 2000))) {
        return c.json({ error: 'Insufficient token budget for synthesis' }, 403);
    }

    try {
        const result = await councilService.generateSynthesis(sessionId);

        // Meter actual synthesis token usage
        if (result.usage.promptTokens > 0 || result.usage.completionTokens > 0) {
            await billingService.recordTokenUsage(
                userId,
                result.usage.promptTokens,
                result.usage.completionTokens,
                'openai/gpt-4o'
            );
        }

        return c.json({ synthesis: result.text });
    } catch (_error) {
        return c.json(
            { error: { code: 'INTERNAL_ERROR', message: 'Failed to generate synthesis' } },
            500
        );
    }
});

/**
 * GET /api/council/personas - Get available personas
 */
app.get('/personas', async (c) => {
    return c.json({
        personas: Object.entries(councilService.COUNCIL_PERSONAS).map(([key, def]) => ({
            id: key,
            name: def.name,
            role: def.role,
            color: def.color,
            modelId: def.modelId,
        })),
    });
});

/**
 * GET /api/council/stats - Get council statistics
 */
app.get('/stats', async (c) => {
    const userId = c.get('userId')!;

    const stats = await councilService.getCouncilStats(userId);

    return c.json(stats);
});

export default app;

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
import { requireAuth } from '../middleware/auth';
import type { PersonaType } from '../services/council.service';
import * as councilService from '../services/council.service';

const app = new Hono();

// All routes require authentication
app.use('*', requireAuth);

/**
 * POST /api/council/sessions - Create a new council session and start streaming
 *
 * Returns a streaming response with all 4 personas responding in parallel.
 * Format: Server-Sent Events (SSE)
 */
app.post('/sessions', async (c) => {
    const userId = c.get('userId')!;
    const body = await c.req.json();

    const { query } = body;

    if (!query || typeof query !== 'string') {
        return c.json({ error: 'query is required' }, 400);
    }

    // Check council session limit based on user's tier
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { tier: true },
    });

    if (!user) {
        return c.json({ error: 'User not found' }, 404);
    }

    const tier = (user.tier || 'FREE') as TierName;
    const monthlyLimit = getLimit(tier, 'monthlyCouncilSessions');

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
app.get('/sessions/:id/stream', async (c) => {
    const userId = c.get('userId')!;
    const sessionId = c.req.param('id');

    // Verify session belongs to user
    const session = await councilService.getCouncilSession(sessionId, userId);
    if (!session) {
        return c.json({ error: 'Session not found' }, 404);
    }

    // Set up SSE headers
    c.header('Content-Type', 'text/event-stream');
    c.header('Cache-Control', 'no-cache');
    c.header('Connection', 'keep-alive');

    return stream(c, async (stream) => {
        const personas: PersonaType[] = ['SCHOLAR', 'CREATIVE', 'PRACTICAL', 'DEVILS_ADVOCATE'];

        // Create streaming generators for each persona
        const streams = personas.map((persona) =>
            councilService.streamPersonaResponse(sessionId, persona, session.query)
        );

        // Track completion
        const completed = new Set<PersonaType>();
        const activeStreams = new Map<PersonaType, AsyncGenerator>();

        personas.forEach((persona, i) => {
            activeStreams.set(persona, streams[i]);
        });

        // Stream all responses in parallel
        while (activeStreams.size > 0) {
            const results = await Promise.all(
                Array.from(activeStreams.entries()).map(async ([persona, gen]) => {
                    const result = await gen.next();
                    return { persona, result };
                })
            );

            for (const { persona, result } of results) {
                if (result.done) {
                    activeStreams.delete(persona);
                    completed.add(persona);
                    continue;
                }

                const { type, content, latencyMs } = result.value;

                if (type === 'text') {
                    await stream.write(
                        `data: ${JSON.stringify({ persona, type: 'persona_chunk', content })}\n\n`
                    );
                } else if (type === 'done') {
                    await stream.write(
                        `data: ${JSON.stringify({ persona, type: 'persona_complete', latencyMs })}\n\n`
                    );
                    activeStreams.delete(persona);
                    completed.add(persona);
                } else if (type === 'error') {
                    await stream.write(
                        `data: ${JSON.stringify({ persona, type: 'error', content })}\n\n`
                    );
                    activeStreams.delete(persona);
                }
            }
        }

        // Update session status
        await councilService.updateSessionStatus(sessionId);

        // Send completion event
        await stream.write(`data: ${JSON.stringify({ type: 'complete' })}\n\n`);
    });
});

/**
 * GET /api/council/sessions - List council sessions
 */
app.get('/sessions', async (c) => {
    const userId = c.get('userId')!;
    const limit = parseInt(c.req.query('limit') || '20', 10);

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
app.get('/sessions/:id', async (c) => {
    const userId = c.get('userId')!;
    const sessionId = c.req.param('id');

    const session = await councilService.getCouncilSession(sessionId, userId);

    if (!session) {
        return c.json({ error: 'Session not found' }, 404);
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
app.post('/sessions/:id/select', async (c) => {
    const userId = c.get('userId')!;
    const sessionId = c.req.param('id');
    const body = await c.req.json();

    const { persona } = body;

    const validPersonas: PersonaType[] = ['SCHOLAR', 'CREATIVE', 'PRACTICAL', 'DEVILS_ADVOCATE'];
    if (!persona || !validPersonas.includes(persona)) {
        return c.json({ error: 'Invalid persona' }, 400);
    }

    await councilService.selectResponse(sessionId, userId, persona);

    return c.json({ success: true });
});

/**
 * POST /api/council/sessions/:id/synthesize - Generate synthesis
 */
app.post('/sessions/:id/synthesize', async (c) => {
    const userId = c.get('userId')!;
    const sessionId = c.req.param('id');

    // Verify session belongs to user
    const session = await councilService.getCouncilSession(sessionId, userId);
    if (!session) {
        return c.json({ error: 'Session not found' }, 404);
    }

    try {
        const synthesis = await councilService.generateSynthesis(sessionId);
        return c.json({ synthesis });
    } catch (_error) {
        return c.json({ error: 'Failed to generate synthesis' }, 500);
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

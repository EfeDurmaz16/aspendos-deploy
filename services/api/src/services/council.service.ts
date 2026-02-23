/**
 * COUNCIL Service - Multi-Model Parallel Querying
 *
 * Handles parallel streaming responses from 4 AI personas using different models.
 */

import { streamText } from 'ai';
import { getModelWithFallback } from '../lib/ai-providers';
import { prisma } from '../lib/prisma';
import * as openMemory from './openmemory.service';

// Persona types
export type PersonaType = 'SCHOLAR' | 'CREATIVE' | 'PRACTICAL' | 'DEVILS_ADVOCATE';
export type ResponseStatus = 'PENDING' | 'STREAMING' | 'COMPLETED' | 'FAILED';

// Persona definitions
export const COUNCIL_PERSONAS: Record<
    PersonaType,
    {
        name: string;
        role: string;
        color: string;
        modelId: string;
        systemPrompt: string;
    }
> = {
    SCHOLAR: {
        name: 'The Scholar',
        role: 'Academic & Research Perspective',
        color: '#3B82F6', // Blue
        modelId: 'groq/llama-3.1-70b-versatile',
        systemPrompt: `You are The Scholar, an academic advisor providing well-researched, evidence-based perspectives.
Your approach:
- Cite relevant research, theories, and academic frameworks
- Provide structured analysis with clear reasoning
- Consider historical context and precedents
- Balance depth with accessibility
- Acknowledge limitations and areas of uncertainty

Respond thoughtfully but concisely (150-200 words). Focus on what the research and evidence suggest.`,
    },
    CREATIVE: {
        name: 'The Visionary',
        role: 'Creative & Innovative Perspective',
        color: '#F59E0B', // Amber
        modelId: 'groq/mixtral-8x7b-32768',
        systemPrompt: `You are The Visionary, a creative thinker who explores unconventional possibilities.
Your approach:
- Challenge assumptions and conventional thinking
- Propose innovative and unexpected solutions
- Draw connections between unrelated domains
- Embrace ambiguity and explore "what if" scenarios
- Inspire new ways of seeing the problem

Respond with imagination and energy (150-200 words). Focus on creative possibilities and novel approaches.`,
    },
    PRACTICAL: {
        name: 'The Pragmatist',
        role: 'Practical & Actionable Perspective',
        color: '#10B981', // Emerald
        modelId: 'groq/llama-3.1-8b-instant',
        systemPrompt: `You are The Pragmatist, focused on practical implementation and real-world results.
Your approach:
- Break down into concrete, actionable steps
- Consider resources, constraints, and timelines
- Focus on what's achievable today
- Identify potential obstacles and solutions
- Prioritize efficiency and effectiveness

Respond with clarity and practicality (150-200 words). Focus on what can be done and how to do it.`,
    },
    DEVILS_ADVOCATE: {
        name: "Devil's Advocate",
        role: 'Critical & Contrarian Perspective',
        color: '#EF4444', // Red
        modelId: 'groq/llama-3.1-70b-versatile',
        systemPrompt: `You are the Devil's Advocate, challenging assumptions to strengthen thinking.
Your approach:
- Question underlying assumptions
- Identify potential weaknesses and blind spots
- Present counterarguments respectfully
- Highlight risks that others might overlook
- Push for deeper examination of the problem

Respond thoughtfully but directly (150-200 words). Your role is to make the final decision stronger by testing it.`,
    },
};

// Provider resolution is now centralized via ai-providers.ts with circuit breaker support

/**
 * MOAT: Learn user's persona preferences from selection history.
 * Orders personas by preference so the user's favorite appears first.
 * Competitors show static order; we learn and adapt.
 */
export async function getPersonaPreferenceOrder(userId: string): Promise<PersonaType[]> {
    const selections = await prisma.councilSession.groupBy({
        by: ['selectedPersona'],
        where: {
            userId,
            selectedPersona: { not: null },
        },
        _count: { selectedPersona: true },
        orderBy: { _count: { selectedPersona: 'desc' } },
    });

    const defaultOrder: PersonaType[] = ['SCHOLAR', 'CREATIVE', 'PRACTICAL', 'DEVILS_ADVOCATE'];

    if (selections.length === 0) return defaultOrder;

    // Put selected personas first, then remaining in default order
    const preferred = selections
        .map((s) => s.selectedPersona as PersonaType)
        .filter((p): p is PersonaType => p !== null && defaultOrder.includes(p));
    const remaining = defaultOrder.filter((p) => !preferred.includes(p));

    return [...preferred, ...remaining];
}

/**
 * Get user's preferred persona ordering based on historical selections.
 * Preferred personas stream first, giving the user a better experience.
 */
async function getPersonaOrdering(userId: string): Promise<PersonaType[]> {
    try {
        return await getPersonaPreferenceOrder(userId);
    } catch {
        return ['SCHOLAR', 'CREATIVE', 'PRACTICAL', 'DEVILS_ADVOCATE'];
    }
}

/**
 * Create a new council session with preference-aware persona ordering
 */
export async function createCouncilSession(userId: string, query: string) {
    const session = await prisma.councilSession.create({
        data: {
            userId,
            query,
            status: 'PENDING',
        },
    });

    // Order personas by user preference (learned from selections)
    const orderedPersonas = await getPersonaOrdering(userId);

    await prisma.councilResponse.createMany({
        data: orderedPersonas.map((persona) => ({
            sessionId: session.id,
            persona,
            modelId: COUNCIL_PERSONAS[persona].modelId,
            content: '',
            status: 'PENDING',
        })),
    });

    return session;
}

/**
 * Get a council session with responses
 */
export async function getCouncilSession(sessionId: string, userId: string) {
    return prisma.councilSession.findFirst({
        where: { id: sessionId, userId },
        include: {
            responses: {
                orderBy: { createdAt: 'asc' },
            },
        },
    });
}

/**
 * List council sessions for a user
 */
export async function listCouncilSessions(userId: string, limit = 20) {
    return prisma.councilSession.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: {
            responses: {
                select: {
                    persona: true,
                    status: true,
                    latencyMs: true,
                },
            },
        },
    });
}

/**
 * Stream response from a single persona
 */
export async function* streamPersonaResponse(
    sessionId: string,
    persona: PersonaType,
    query: string,
    userId: string
): AsyncGenerator<{
    type: 'text' | 'done' | 'error';
    content?: string;
    latencyMs?: number;
    usage?: { promptTokens: number; completionTokens: number };
}> {
    const startTime = Date.now();
    const personaDef = COUNCIL_PERSONAS[persona];

    // Update status to streaming
    await prisma.councilResponse.updateMany({
        where: { sessionId, persona },
        data: { status: 'STREAMING' },
    });

    try {
        // Use centralized provider with circuit breaker fallback
        const { model: resolvedModel } = getModelWithFallback(personaDef.modelId);

        let systemPrompt = personaDef.systemPrompt;
        try {
            const memories = await openMemory.searchMemories(query, userId, { limit: 3 });
            if (memories.length > 0) {
                const memoryContext = memories
                    .map((m, i) => `${i + 1}. [${m.sector || 'semantic'}] ${m.content}`)
                    .join('\n');
                systemPrompt += `\n\nUser memory context:\n${memoryContext}\n\nUse this context when relevant, but do not mention memory retrieval explicitly.`;
            }
        } catch (error) {
            console.warn(
                `[Council] Memory retrieval failed for ${persona}:`,
                error instanceof Error ? error.message : 'Unknown'
            );
        }

        const result = streamText({
            model: resolvedModel,
            system: systemPrompt,
            prompt: query,
        });

        let fullContent = '';

        for await (const chunk of result.textStream) {
            fullContent += chunk;
            yield { type: 'text', content: chunk };
        }

        // Get actual token usage from the stream result
        const usage = await result.usage;
        const latencyMs = Date.now() - startTime;

        // Update response in database
        await prisma.councilResponse.updateMany({
            where: { sessionId, persona },
            data: {
                content: fullContent,
                status: 'COMPLETED',
                latencyMs,
            },
        });

        yield {
            type: 'done',
            latencyMs,
            usage: {
                promptTokens: usage?.inputTokens || 0,
                completionTokens: usage?.outputTokens || 0,
            },
        };
    } catch (error) {
        console.error(`Error streaming ${persona}:`, error);

        await prisma.councilResponse.updateMany({
            where: { sessionId, persona },
            data: {
                status: 'FAILED',
                content: 'Failed to generate response',
            },
        });

        yield { type: 'error', content: 'Failed to generate response' };
    }
}

/**
 * Update session status based on responses
 */
export async function updateSessionStatus(sessionId: string) {
    const responses = await prisma.councilResponse.findMany({
        where: { sessionId },
    });

    const allCompleted = responses.every((r) => r.status === 'COMPLETED');
    const anyFailed = responses.some((r) => r.status === 'FAILED');
    const anyPending = responses.some((r) => r.status === 'PENDING' || r.status === 'STREAMING');

    let status: 'PENDING' | 'STREAMING' | 'COMPLETED' | 'FAILED' = 'PENDING';
    if (allCompleted) status = 'COMPLETED';
    else if (anyFailed && !anyPending) status = 'FAILED';
    else if (!anyPending) status = 'STREAMING';

    await prisma.councilSession.update({
        where: { id: sessionId },
        data: { status },
    });

    return status;
}

/**
 * Select the preferred response
 */
export async function selectResponse(sessionId: string, userId: string, persona: PersonaType) {
    const session = await prisma.councilSession.findFirst({
        where: { id: sessionId, userId },
    });

    if (!session) {
        throw new Error('Session not found');
    }

    await prisma.councilSession.update({
        where: { id: sessionId },
        data: { selectedPersona: persona },
    });

    // MOAT: Cross-system feedback loop (Council → Memory)
    // Council selection reveals user's thinking style preference (SCHOLAR/CREATIVE/PRACTICAL/DEVILS_ADVOCATE).
    // Store this as reflective memory to inform future responses and personalization.
    // Competitors show 4 answers; we learn which thinking styles the user values and adapt.
    try {
        const response = await prisma.councilResponse.findFirst({
            where: { sessionId, persona },
            select: { content: true },
        });

        if (response?.content) {
            const openMemory = await import('./openmemory.service');
            const personaName = COUNCIL_PERSONAS[persona]?.name || persona;

            // Save both preference pattern and the actual insight
            await openMemory.addMemory(
                `User prefers ${personaName} perspective for decision-making`,
                userId,
                { sector: 'reflective', metadata: { source: 'council_selection', persona } }
            );

            // Save the selected response content as an episodic insight
            await openMemory.addMemory(
                `Council insight (${personaName}): ${response.content.slice(0, 500)}`,
                userId,
                {
                    sector: 'episodic',
                    metadata: { source: 'council_selection', sessionId, persona },
                }
            );
        }
    } catch {
        /* non-blocking cross-system bridge */
    }

    return { success: true };
}

/**
 * Generate synthesis from all responses
 */
export async function generateSynthesis(sessionId: string) {
    const session = await prisma.councilSession.findFirst({
        where: { id: sessionId },
        include: { responses: true },
    });

    if (!session) {
        throw new Error('Session not found');
    }

    const completedResponses = session.responses.filter((r) => r.status === 'COMPLETED');
    if (completedResponses.length === 0) {
        throw new Error('No completed responses to synthesize');
    }

    // Format responses for synthesis
    const responseSummary = completedResponses
        .map((r) => {
            const persona = COUNCIL_PERSONAS[r.persona as PersonaType];
            return `${persona.name}: ${r.content}`;
        })
        .join('\n\n');

    // Use centralized provider with circuit breaker fallback
    const { model: synthesisModel } = getModelWithFallback('groq/llama-3.1-70b-versatile');

    const result = await streamText({
        model: synthesisModel,
        system: `You are synthesizing multiple perspectives on a question. Provide a balanced, actionable recommendation that:
1. Acknowledges the key insights from each perspective
2. Identifies areas of agreement and tension
3. Offers a clear, practical recommendation
4. Notes any important caveats

Keep your synthesis concise (200-250 words).`,
        prompt: `Original question: ${session.query}

Perspectives received:
${responseSummary}

Please synthesize these perspectives into a balanced recommendation.`,
    });

    let synthesis = '';
    for await (const chunk of result.textStream) {
        synthesis += chunk;
    }

    // Get actual token usage
    const usage = await result.usage;

    // Store synthesis
    await prisma.councilSession.update({
        where: { id: sessionId },
        data: { synthesis },
    });

    return {
        text: synthesis,
        usage: {
            promptTokens: usage?.inputTokens || 0,
            completionTokens: usage?.outputTokens || 0,
        },
    };
}

/**
 * Get council statistics with quality insights
 */
export async function getCouncilStats(userId: string) {
    const [totalSessions, selectedCounts, latencyStats] = await Promise.all([
        prisma.councilSession.count({ where: { userId } }),
        prisma.councilSession.groupBy({
            by: ['selectedPersona'],
            where: { userId, selectedPersona: { not: null } },
            _count: { selectedPersona: true },
        }),
        prisma.councilResponse.aggregate({
            where: {
                session: { userId },
                status: 'COMPLETED',
                latencyMs: { not: 0 },
            },
            _avg: { latencyMs: true },
            _min: { latencyMs: true },
            _max: { latencyMs: true },
        }),
    ]);

    const preferenceMap: Record<string, number> = {};
    for (const count of selectedCounts) {
        if (count.selectedPersona) {
            preferenceMap[count.selectedPersona] = count._count.selectedPersona;
        }
    }

    // Compute quality insights
    const qualityInsights = computeCouncilInsights(preferenceMap, totalSessions);

    return {
        totalSessions,
        preferences: preferenceMap,
        latency: {
            avgMs: Math.round(latencyStats._avg?.latencyMs || 0),
            minMs: latencyStats._min?.latencyMs || 0,
            maxMs: latencyStats._max?.latencyMs || 0,
        },
        insights: qualityInsights,
    };
}

// ============================================
// COUNCIL QUALITY SCORING & LEARNING
// ============================================

interface CouncilInsights {
    dominantPersona: string | null;
    diversityScore: number; // 0-100, how evenly distributed selections are
    recommendation: string;
    personaScores: Record<string, number>; // preference score per persona
}

/**
 * Compute quality insights from Council usage patterns.
 * Learns which perspectives the user values most and provides
 * actionable recommendations. This is a moat differentiator -
 * competitors show 4 answers, we learn which thinking style matches the user.
 */
function computeCouncilInsights(
    preferences: Record<string, number>,
    totalSessions: number
): CouncilInsights {
    const personas = Object.keys(COUNCIL_PERSONAS) as PersonaType[];
    const totalSelections = Object.values(preferences).reduce((a, b) => a + b, 0);

    if (totalSelections === 0) {
        return {
            dominantPersona: null,
            diversityScore: 0,
            recommendation:
                'Start selecting preferred responses to help Council learn your thinking style.',
            personaScores: {},
        };
    }

    // Find dominant persona
    let dominantPersona: string | null = null;
    let maxCount = 0;
    for (const [persona, count] of Object.entries(preferences)) {
        if (count > maxCount) {
            maxCount = count;
            dominantPersona = persona;
        }
    }

    // Shannon diversity index (normalized to 0-100)
    // Higher = more evenly distributed = user values diverse perspectives
    let entropy = 0;
    for (const persona of personas) {
        const p = (preferences[persona] || 0) / totalSelections;
        if (p > 0) {
            entropy -= p * Math.log2(p);
        }
    }
    const maxEntropy = Math.log2(personas.length); // log2(4) = 2
    const diversityScore = Math.round((entropy / maxEntropy) * 100);

    // Compute preference scores (0-100)
    const personaScores: Record<string, number> = {};
    for (const persona of personas) {
        personaScores[persona] =
            totalSelections > 0
                ? Math.round(((preferences[persona] || 0) / totalSelections) * 100)
                : 0;
    }

    // Generate recommendation
    let recommendation = '';
    const dominantName = dominantPersona
        ? COUNCIL_PERSONAS[dominantPersona as PersonaType]?.name
        : null;

    if (diversityScore > 80) {
        recommendation =
            'You value diverse perspectives equally. Council is providing balanced value.';
    } else if (diversityScore > 50) {
        recommendation = `You tend toward ${dominantName || 'one perspective'}, but still appreciate variety. Good balance.`;
    } else if (maxCount > totalSelections * 0.6) {
        recommendation = `You strongly prefer ${dominantName || 'one perspective'}. Consider why other viewpoints don't resonate.`;
    } else {
        recommendation = 'Keep selecting preferred responses to help Council learn your style.';
    }

    // If user rarely uses Council, note that
    if (totalSessions > 0 && totalSelections < totalSessions * 0.3) {
        recommendation += ' Tip: Selecting preferred responses helps us improve recommendations.';
    }

    return {
        dominantPersona,
        diversityScore,
        recommendation,
        personaScores,
    };
}

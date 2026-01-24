/**
 * COUNCIL Service - Multi-Model Parallel Querying
 *
 * Handles parallel streaming responses from 4 AI personas using different models.
 */

import { prisma } from '../lib/prisma';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText } from 'ai';

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
        modelId: 'openai/gpt-4o',
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
        modelId: 'anthropic/claude-3-5-sonnet-20241022',
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
        modelId: 'google/gemini-2.0-flash',
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
        modelId: 'openai/gpt-4o-mini',
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

// Get AI provider for a model
function getProvider(modelId: string) {
    const [provider] = modelId.split('/');

    switch (provider) {
        case 'openai':
            return createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
        case 'anthropic':
            return createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
        case 'google':
            return createGoogleGenerativeAI({ apiKey: process.env.GOOGLE_AI_API_KEY });
        default:
            return createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
}

/**
 * Create a new council session
 */
export async function createCouncilSession(userId: string, query: string) {
    const session = await prisma.councilSession.create({
        data: {
            userId,
            query,
            status: 'PENDING',
        },
    });

    // Create response entries for each persona
    const personas = Object.keys(COUNCIL_PERSONAS) as PersonaType[];
    await prisma.councilResponse.createMany({
        data: personas.map((persona) => ({
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
    query: string
): AsyncGenerator<{ type: 'text' | 'done' | 'error'; content?: string; latencyMs?: number }> {
    const startTime = Date.now();
    const personaDef = COUNCIL_PERSONAS[persona];

    // Update status to streaming
    await prisma.councilResponse.updateMany({
        where: { sessionId, persona },
        data: { status: 'STREAMING' },
    });

    try {
        const provider = getProvider(personaDef.modelId);
        const modelName = personaDef.modelId.split('/')[1];

        const result = streamText({
            model: provider(modelName),
            system: personaDef.systemPrompt,
            prompt: query,
            maxTokens: 500,
        });

        let fullContent = '';

        for await (const chunk of result.textStream) {
            fullContent += chunk;
            yield { type: 'text', content: chunk };
        }

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

        yield { type: 'done', latencyMs };
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

    const provider = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const result = await streamText({
        model: provider('gpt-4o'),
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
        maxTokens: 600,
    });

    let synthesis = '';
    for await (const chunk of result.textStream) {
        synthesis += chunk;
    }

    // Store synthesis
    await prisma.councilSession.update({
        where: { id: sessionId },
        data: { synthesis },
    });

    return synthesis;
}

/**
 * Get council statistics
 */
export async function getCouncilStats(userId: string) {
    const [totalSessions, selectedCounts] = await Promise.all([
        prisma.councilSession.count({ where: { userId } }),
        prisma.councilSession.groupBy({
            by: ['selectedPersona'],
            where: { userId, selectedPersona: { not: null } },
            _count: { selectedPersona: true },
        }),
    ]);

    const preferenceMap: Record<string, number> = {};
    for (const count of selectedCounts) {
        if (count.selectedPersona) {
            preferenceMap[count.selectedPersona] = count._count.selectedPersona;
        }
    }

    return {
        totalSessions,
        preferences: preferenceMap,
    };
}

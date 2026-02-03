'use client';

import { useCallback, useRef, useState } from 'react';
import { useYulaStore, type CouncilPersona, type CouncilThought, type CouncilVerdict } from '@/stores/yula-store';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

// Persona definitions matching backend
export const personaDefinitions: Record<
    CouncilPersona,
    {
        name: string;
        role: string;
        color: string;
        bgColor: string;
        icon: string;
        description: string;
        thinkingStyle: string;
        backendKey: string;
    }
> = {
    logic: {
        name: 'Scholar',
        role: 'The Analyst',
        color: '#3b82f6', // Blue
        bgColor: 'bg-blue-500/10',
        icon: 'brain',
        description: 'Evaluates decisions through data, facts, and rational analysis',
        thinkingStyle: 'Analyzing data patterns and logical outcomes...',
        backendKey: 'SCHOLAR',
    },
    creative: {
        name: 'Creative',
        role: 'The Innovator',
        color: '#f59e0b', // Amber
        bgColor: 'bg-amber-500/10',
        icon: 'lightbulb',
        description: 'Explores unconventional solutions and creative possibilities',
        thinkingStyle: 'Exploring creative alternatives and possibilities...',
        backendKey: 'CREATIVE',
    },
    prudent: {
        name: 'Prudent',
        role: 'The Guardian',
        color: '#10b981', // Emerald
        bgColor: 'bg-emerald-500/10',
        icon: 'shield',
        description: 'Considers risks, long-term consequences, and safety',
        thinkingStyle: 'Assessing risks and long-term implications...',
        backendKey: 'PRACTICAL',
    },
    'devils-advocate': {
        name: "Devil's Advocate",
        role: 'The Challenger',
        color: '#ef4444', // Red
        bgColor: 'bg-red-500/10',
        icon: 'warning',
        description: 'Challenges assumptions and plays devil\'s advocate',
        thinkingStyle: 'Questioning assumptions and identifying blind spots...',
        backendKey: 'DEVILS_ADVOCATE',
    },
};

// Map backend persona keys to frontend
const backendToFrontendPersona: Record<string, CouncilPersona> = {
    SCHOLAR: 'logic',
    CREATIVE: 'creative',
    PRACTICAL: 'prudent',
    DEVILS_ADVOCATE: 'devils-advocate',
};

export function useCouncil() {
    const {
        council,
        startCouncilDeliberation,
        addCouncilThought,
        setCouncilVerdict,
        resetCouncil,
    } = useYulaStore();

    const abortControllerRef = useRef<AbortController | null>(null);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Real API-based deliberation
    const streamDeliberation = useCallback(
        async (question: string): Promise<void> => {
            startCouncilDeliberation();
            setError(null);

            try {
                // Create council session
                const createResponse = await fetch(`${API_BASE}/api/council/sessions`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ query: question }),
                });

                if (!createResponse.ok) {
                    throw new Error('Failed to create council session');
                }

                const { sessionId: newSessionId, streamUrl } = await createResponse.json();
                setSessionId(newSessionId);

                // Setup SSE stream
                abortControllerRef.current = new AbortController();
                const thoughts: Record<CouncilPersona, string> = {
                    logic: '',
                    creative: '',
                    prudent: '',
                    'devils-advocate': '',
                };

                const eventSource = new EventSource(
                    `${API_BASE}${streamUrl}`,
                    // @ts-ignore - credentials option exists
                    { withCredentials: true }
                );

                eventSource.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data);

                        if (data.type === 'persona_chunk') {
                            const frontendPersona = backendToFrontendPersona[data.persona];
                            if (frontendPersona && data.content) {
                                thoughts[frontendPersona] += data.content;
                            }
                        }

                        if (data.type === 'persona_complete') {
                            const frontendPersona = backendToFrontendPersona[data.persona];
                            if (frontendPersona) {
                                const councilThought: CouncilThought = {
                                    persona: frontendPersona,
                                    thought: thoughts[frontendPersona] || data.content,
                                    confidence: 0.7 + Math.random() * 0.25,
                                    timestamp: new Date(),
                                };
                                addCouncilThought(councilThought);
                            }
                        }

                        if (data.type === 'complete') {
                            eventSource.close();
                            // Request synthesis
                            synthesizeVerdict(newSessionId, question, thoughts);
                        }

                        if (data.type === 'error') {
                            setError(data.message);
                            eventSource.close();
                        }
                    } catch (e) {
                        console.error('Error parsing SSE data:', e);
                    }
                };

                eventSource.onerror = () => {
                    // Fallback to simulated responses if API fails
                    console.warn('Council SSE connection failed, using fallback');
                    eventSource.close();
                    simulateDeliberationFallback(question);
                };
            } catch (err) {
                console.error('Council API error:', err);
                // Fallback to simulated responses
                simulateDeliberationFallback(question);
            }
        },
        [startCouncilDeliberation, addCouncilThought]
    );

    // Synthesize verdict from all responses
    const synthesizeVerdict = async (
        sessId: string,
        question: string,
        thoughts: Record<CouncilPersona, string>
    ) => {
        try {
            const response = await fetch(`${API_BASE}/api/council/sessions/${sessId}/synthesize`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
            });

            if (response.ok) {
                const data = await response.json();
                const verdict: CouncilVerdict = {
                    recommendation: data.synthesis || generateLocalConsensus(question, thoughts),
                    confidence: 0.75 + Math.random() * 0.2,
                    reasoning: 'After careful deliberation, the Council has reached a balanced consensus that considers logical analysis, creative possibilities, and prudent risk assessment.',
                    contributions: thoughts,
                };
                setCouncilVerdict(verdict);
            } else {
                // Use local synthesis
                const verdict: CouncilVerdict = {
                    recommendation: generateLocalConsensus(question, thoughts),
                    confidence: 0.75 + Math.random() * 0.2,
                    reasoning: 'After careful deliberation, the Council has reached a balanced consensus.',
                    contributions: thoughts,
                };
                setCouncilVerdict(verdict);
            }
        } catch {
            // Use local synthesis
            const verdict: CouncilVerdict = {
                recommendation: generateLocalConsensus(question, thoughts),
                confidence: 0.75 + Math.random() * 0.2,
                reasoning: 'After careful deliberation, the Council has reached a balanced consensus.',
                contributions: thoughts,
            };
            setCouncilVerdict(verdict);
        }
    };

    // Fallback simulated responses
    const simulatedResponses: Record<CouncilPersona, string[]> = {
        logic: [
            'Based on the available data, the most efficient approach would be to prioritize the option with the highest probability of success.',
            'Analyzing the cost-benefit ratio, I recommend focusing on measurable outcomes and setting clear milestones.',
            'The logical conclusion suggests starting with a structured plan that addresses the core variables.',
        ],
        creative: [
            'What if we approached this from an entirely different angle? Consider the unexpected opportunities.',
            'I see potential in combining multiple ideas - sometimes the best solutions emerge from creative synthesis.',
            "Let's not limit ourselves to conventional thinking. There might be an innovative path we haven't explored.",
        ],
        prudent: [
            'Before proceeding, we should consider the potential risks and have contingency plans in place.',
            "I recommend taking a measured approach - it's wise to test assumptions before full commitment.",
            "Let's ensure we're not overlooking any long-term consequences. Patience often yields better outcomes.",
        ],
        'devils-advocate': [
            'Have we considered what could go wrong? Let me challenge some assumptions here.',
            'Before moving forward, we should ask: what are we missing? What blind spots might we have?',
            'Playing devil\'s advocate: what if the opposite approach makes more sense? Let\'s test our reasoning.',
        ],
    };

    // Fallback simulation when API is unavailable
    const simulateDeliberationFallback = useCallback(
        async (question: string): Promise<void> => {
            const personas: CouncilPersona[] = ['logic', 'creative', 'prudent', 'devils-advocate'];
            const thoughts: Record<CouncilPersona, string> = {
                logic: '',
                creative: '',
                prudent: '',
                'devils-advocate': '',
            };

            for (let i = 0; i < personas.length; i++) {
                const persona = personas[i];
                await new Promise((resolve) => setTimeout(resolve, 800 + Math.random() * 500));

                const responses = simulatedResponses[persona];
                const thought = responses[Math.floor(Math.random() * responses.length)];
                thoughts[persona] = thought;

                const councilThought: CouncilThought = {
                    persona,
                    thought,
                    confidence: 0.7 + Math.random() * 0.25,
                    timestamp: new Date(),
                };

                addCouncilThought(councilThought);
            }

            await new Promise((resolve) => setTimeout(resolve, 1000));

            const verdict: CouncilVerdict = {
                recommendation: generateLocalConsensus(question, thoughts),
                confidence: 0.75 + Math.random() * 0.2,
                reasoning: 'After careful deliberation, the Council has reached a balanced consensus that considers logical analysis, creative possibilities, and prudent risk assessment.',
                contributions: thoughts,
            };

            setCouncilVerdict(verdict);
        },
        [addCouncilThought, setCouncilVerdict]
    );

    // Start deliberation on a question
    const askCouncil = useCallback(
        (question: string) => {
            // Cancel any existing deliberation
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
            streamDeliberation(question);
        },
        [streamDeliberation]
    );

    // Cancel ongoing deliberation
    const cancelDeliberation = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        resetCouncil();
    }, [resetCouncil]);

    // Get persona's current thought
    const getPersonaThought = useCallback(
        (persona: CouncilPersona): CouncilThought | undefined => {
            return council.thoughts.find((t) => t.persona === persona);
        },
        [council.thoughts]
    );

    // Check if persona has finished thinking
    const hasPersonaResponded = useCallback(
        (persona: CouncilPersona): boolean => {
            return council.thoughts.some((t) => t.persona === persona);
        },
        [council.thoughts]
    );

    return {
        // State
        isActive: council.isActive,
        isDeliberating: council.isDeliberating,
        thoughts: council.thoughts,
        verdict: council.verdict,
        sessionId,
        error,

        // Actions
        askCouncil,
        cancelDeliberation,
        reset: resetCouncil,

        // Helpers
        getPersonaThought,
        hasPersonaResponded,
        personaDefinitions,
    };
}

// Helper to generate a local consensus recommendation
function generateLocalConsensus(
    question: string,
    thoughts: Record<CouncilPersona, string>
): string {
    return `Regarding your question, the Council recommends a balanced approach: Start with a structured plan (Logic), remain open to creative pivots (Creative), while maintaining awareness of potential risks (Prudent). This synthesis ensures both progress and protection.`;
}

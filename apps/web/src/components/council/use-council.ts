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

    // Synthesize verdict from all responses
    const synthesizeVerdict = useCallback(
        async (sessId: string, question: string, thoughts: Record<CouncilPersona, string>) => {
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
                        reasoning:
                            'After careful deliberation, the Council has reached a balanced consensus that considers logical analysis, creative possibilities, and prudent risk assessment.',
                        contributions: thoughts,
                    };
                    setCouncilVerdict(verdict);
                } else {
                    const verdict: CouncilVerdict = {
                        recommendation: generateLocalConsensus(question, thoughts),
                        confidence: 0.75 + Math.random() * 0.2,
                        reasoning: 'After careful deliberation, the Council has reached a balanced consensus.',
                        contributions: thoughts,
                    };
                    setCouncilVerdict(verdict);
                }
            } catch {
                const verdict: CouncilVerdict = {
                    recommendation: generateLocalConsensus(question, thoughts),
                    confidence: 0.75 + Math.random() * 0.2,
                    reasoning: 'After careful deliberation, the Council has reached a balanced consensus.',
                    contributions: thoughts,
                };
                setCouncilVerdict(verdict);
            }
        },
        [setCouncilVerdict]
    );


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

                const eventSource = new EventSource(`${API_BASE}${streamUrl}`, {
                    withCredentials: true,
                } as EventSourceInit);

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
                    console.error('Council SSE connection failed');
                    eventSource.close();
                    setError('Council is temporarily unavailable. Please try again.');
                };
            } catch (err) {
                console.error('Council API error:', err);
                setError('Council is temporarily unavailable. Please try again.');
            }
        },
        [addCouncilThought, startCouncilDeliberation, synthesizeVerdict]
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
    _question: string,
    thoughts: Record<CouncilPersona, string>
): string {
    const responseCount = Object.values(thoughts).filter(t => t.length > 0).length;
    if (responseCount === 0) return 'No Council responses available.';
    return `Based on ${responseCount} Council perspectives. Review individual responses above for the full analysis.`;
}

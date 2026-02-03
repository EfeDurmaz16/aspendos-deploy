import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useCouncil, personaDefinitions } from '@/components/council/use-council';

// Mock the store
vi.mock('@/stores/yula-store', () => ({
    useYulaStore: vi.fn(() => ({
        council: {
            isActive: false,
            isDeliberating: false,
            thoughts: [],
            verdict: null,
        },
        startCouncilDeliberation: vi.fn(),
        addCouncilThought: vi.fn(),
        setCouncilVerdict: vi.fn(),
        resetCouncil: vi.fn(),
    })),
}));

describe('useCouncil Hook', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        global.fetch = vi.fn();
    });

    describe('personaDefinitions', () => {
        it('should have all three personas defined', () => {
            expect(personaDefinitions.logic).toBeDefined();
            expect(personaDefinitions.creative).toBeDefined();
            expect(personaDefinitions.prudent).toBeDefined();
        });

        it('should have correct persona properties', () => {
            expect(personaDefinitions.logic.name).toBe('Scholar');
            expect(personaDefinitions.logic.role).toBe('The Analyst');
            expect(personaDefinitions.logic.color).toBe('#3b82f6');
            expect(personaDefinitions.logic.backendKey).toBe('SCHOLAR');
        });

        it('should have backend keys for all personas', () => {
            expect(personaDefinitions.logic.backendKey).toBe('SCHOLAR');
            expect(personaDefinitions.creative.backendKey).toBe('CREATIVE');
            expect(personaDefinitions.prudent.backendKey).toBe('PRACTICAL');
        });
    });

    describe('Initial State', () => {
        it('should have correct initial values', () => {
            const { result } = renderHook(() => useCouncil());

            expect(result.current.isActive).toBe(false);
            expect(result.current.isDeliberating).toBe(false);
            expect(result.current.thoughts).toEqual([]);
            expect(result.current.verdict).toBeNull();
        });

        it('should expose all required methods', () => {
            const { result } = renderHook(() => useCouncil());

            expect(typeof result.current.askCouncil).toBe('function');
            expect(typeof result.current.cancelDeliberation).toBe('function');
            expect(typeof result.current.reset).toBe('function');
            expect(typeof result.current.getPersonaThought).toBe('function');
            expect(typeof result.current.hasPersonaResponded).toBe('function');
        });
    });

    describe('askCouncil', () => {
        it('should call API to create council session', async () => {
            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({
                    sessionId: 'test-session',
                    streamUrl: '/api/council/sessions/test-session/stream',
                }),
            });

            const { result } = renderHook(() => useCouncil());

            act(() => {
                result.current.askCouncil('What should I do?');
            });

            await waitFor(() => {
                expect(global.fetch).toHaveBeenCalledWith(
                    expect.stringContaining('/api/council/sessions'),
                    expect.objectContaining({
                        method: 'POST',
                        body: expect.stringContaining('What should I do?'),
                    })
                );
            });
        });

        it('should fall back to simulated responses on API error', async () => {
            (global.fetch as any).mockRejectedValueOnce(new Error('API Error'));

            const { result } = renderHook(() => useCouncil());

            act(() => {
                result.current.askCouncil('Test question');
            });

            // Should not throw, will use fallback
            expect(result.current.error).toBeNull();
        });
    });

    describe('Helper Functions', () => {
        it('getPersonaThought should return undefined when no thoughts', () => {
            const { result } = renderHook(() => useCouncil());

            expect(result.current.getPersonaThought('logic')).toBeUndefined();
        });

        it('hasPersonaResponded should return false when no thoughts', () => {
            const { result } = renderHook(() => useCouncil());

            expect(result.current.hasPersonaResponded('logic')).toBe(false);
        });
    });
});

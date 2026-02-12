/**
 * Model fallback chain - if primary model fails, try alternatives.
 * This prevents revenue loss when a single provider has an outage.
 */
const FALLBACK_CHAINS: Record<string, string[]> = {
    'openai/gpt-4o': ['anthropic/claude-3.5-sonnet', 'google/gemini-2.0-flash'],
    'openai/gpt-4o-mini': ['groq/llama-3.3-70b', 'google/gemini-2.0-flash'],
    'anthropic/claude-3.5-sonnet': ['openai/gpt-4o', 'google/gemini-2.0-flash'],
    'anthropic/claude-3-haiku': ['groq/llama-3.1-8b', 'openai/gpt-4o-mini'],
    'groq/llama-3.3-70b': ['openai/gpt-4o-mini', 'anthropic/claude-3-haiku'],
};

export function getFallbackModels(modelId: string): string[] {
    return FALLBACK_CHAINS[modelId] || ['openai/gpt-4o-mini'];
}

export async function withFallback<T>(
    primaryFn: () => Promise<T>,
    fallbackFns: (() => Promise<T>)[]
): Promise<{ result: T; modelUsed: string; fallbackUsed: boolean }> {
    // Try primary first
    try {
        const result = await primaryFn();
        return { result, modelUsed: 'primary', fallbackUsed: false };
    } catch (primaryError) {
        console.warn('[ModelFallback] Primary model failed, trying fallbacks...');

        for (let i = 0; i < fallbackFns.length; i++) {
            try {
                const result = await fallbackFns[i]();
                return { result, modelUsed: `fallback-${i}`, fallbackUsed: true };
            } catch {}
        }

        throw primaryError; // All fallbacks failed
    }
}

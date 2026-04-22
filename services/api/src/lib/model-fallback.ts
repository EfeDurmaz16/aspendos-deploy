/**
 * Model fallback chain - if primary model fails, try alternatives.
 * This prevents revenue loss when a single provider has an outage.
 */
const FALLBACK_CHAINS: Record<string, string[]> = {
    // Groq primary - fall back within Groq ecosystem (Llama 4 family)
    'groq/llama-4-maverick': ['groq/llama-4-scout'],
    'groq/llama-4-scout': ['groq/llama-4-maverick'],
    // ULTRA tier premium - fall back to Groq
    'openai/gpt-5': ['groq/llama-4-maverick', 'anthropic/claude-sonnet-4-6'],
    'openai/gpt-5-mini': ['groq/llama-4-scout', 'anthropic/claude-haiku-4-5'],
    'anthropic/claude-sonnet-4-6': ['groq/llama-4-maverick', 'openai/gpt-5'],
    'anthropic/claude-opus-4-7': ['anthropic/claude-sonnet-4-6', 'groq/llama-4-maverick'],
    'anthropic/claude-haiku-4-5': ['groq/llama-4-scout', 'openai/gpt-5-mini'],
    'openai/gpt-5.4-codex': ['anthropic/claude-sonnet-4-6', 'groq/llama-4-maverick'],
    'google/gemini-3.1-pro-preview': ['anthropic/claude-sonnet-4-6', 'openai/gpt-5'],
    'google/gemini-3-flash-preview': ['groq/llama-4-scout', 'openai/gpt-5-mini'],
    'google/gemini-3.1-flash-lite-preview': ['groq/llama-4-scout', 'openai/gpt-5-mini'],
};

export function getFallbackModels(modelId: string): string[] {
    return FALLBACK_CHAINS[modelId] || ['groq/llama-4-scout'];
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

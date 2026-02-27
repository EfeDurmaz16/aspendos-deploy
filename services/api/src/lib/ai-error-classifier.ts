/**
 * AI Error Classifier
 * Classifies AI provider errors into structured error codes.
 * Helps frontend show appropriate messaging and retry logic.
 */

/**
 * Classify AI provider errors into structured error codes.
 * Helps frontend show appropriate messaging and retry logic.
 */
export function classifyAIError(message: string): { error: string; code: string; retryable: boolean } {
    const lower = message.toLowerCase();

    if (lower.includes('rate limit') || lower.includes('429') || lower.includes('too many')) {
        return {
            error: 'AI provider rate limited. Please wait a moment and try again.',
            code: 'RATE_LIMITED',
            retryable: true,
        };
    }
    if (lower.includes('context') && (lower.includes('long') || lower.includes('length'))) {
        return {
            error: 'Conversation too long for this model. Try starting a new chat or a shorter message.',
            code: 'CONTEXT_TOO_LONG',
            retryable: false,
        };
    }
    if (lower.includes('unavailable') || lower.includes('all ai providers')) {
        return {
            error: 'AI providers are temporarily unavailable. Please try again shortly.',
            code: 'PROVIDER_UNAVAILABLE',
            retryable: true,
        };
    }
    if (lower.includes('timeout') || lower.includes('aborted')) {
        return {
            error: 'Request timed out. Please try again with a shorter message.',
            code: 'TIMEOUT',
            retryable: true,
        };
    }
    if (lower.includes('invalid') && lower.includes('key')) {
        return {
            error: 'AI provider configuration error. Please contact support.',
            code: 'CONFIG_ERROR',
            retryable: false,
        };
    }

    return {
        error: 'Failed to generate response. Please try again.',
        code: 'PROVIDER_ERROR',
        retryable: true,
    };
}

export function classifyAIErrorStatus(message: string): 413 | 429 | 500 | 503 | 504 {
    const lower = message.toLowerCase();
    if (lower.includes('rate limit') || lower.includes('429')) return 429;
    if (lower.includes('context') && lower.includes('long')) return 413;
    if (lower.includes('unavailable') || lower.includes('all ai providers')) return 503;
    if (lower.includes('timeout') || lower.includes('aborted')) return 504;
    return 500;
}

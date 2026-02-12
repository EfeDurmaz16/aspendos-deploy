/**
 * Content Moderation & Safety Filter
 * Lightweight pattern-based content safety checking.
 * Used for both user inputs and AI responses.
 */

type Severity = 'low' | 'medium' | 'high' | 'critical';

interface ModerationResult {
    flagged: boolean;
    severity: Severity | null;
    categories: string[];
    action: 'allow' | 'warn' | 'block';
}

// Categories to check
const MODERATION_PATTERNS: Record<string, { patterns: RegExp[]; severity: Severity }> = {
    // PII exposure (credit cards, SSN patterns)
    pii_exposure: {
        patterns: [
            /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/, // Credit card
            /\b\d{3}-\d{2}-\d{4}\b/, // SSN
            /\b[A-Z]{2}\d{2}[A-Z0-9]{4}\d{7}([A-Z0-9]?){0,16}\b/i, // IBAN
        ],
        severity: 'high',
    },
    // Prompt injection attempts
    prompt_injection: {
        patterns: [
            /ignore\s+(all\s+)?previous\s+instructions/i,
            /disregard\s+(all\s+)?(your\s+)?instructions/i,
            /you\s+are\s+now\s+(a|an)\s+/i,
            /system\s*:\s*you\s+are/i,
            /\[INST\]|\[\/INST\]/i,
        ],
        severity: 'medium',
    },
    // Secrets/API keys in messages
    secret_exposure: {
        patterns: [
            /sk-[a-zA-Z0-9]{20,}/, // OpenAI
            /sk-ant-[a-zA-Z0-9]{20,}/, // Anthropic
            /gsk_[a-zA-Z0-9]{20,}/, // Groq
            /ghp_[a-zA-Z0-9]{36}/, // GitHub
            /xoxb-[0-9]{10,}-[a-zA-Z0-9]{20,}/, // Slack
        ],
        severity: 'critical',
    },
    // Malicious code patterns
    code_injection: {
        patterns: [
            /<script[^>]*>.*?<\/script>/is,
            /javascript\s*:/i,
            /on(load|error|click|mouseover)\s*=/i,
            /eval\s*\(/i,
            /document\.cookie/i,
        ],
        severity: 'high',
    },
};

export function moderateContent(text: string): ModerationResult {
    const flaggedCategories: string[] = [];
    let highestSeverity: Severity | null = null;
    const severityOrder: Severity[] = ['low', 'medium', 'high', 'critical'];

    for (const [category, config] of Object.entries(MODERATION_PATTERNS)) {
        for (const pattern of config.patterns) {
            if (pattern.test(text)) {
                flaggedCategories.push(category);
                if (
                    !highestSeverity ||
                    severityOrder.indexOf(config.severity) > severityOrder.indexOf(highestSeverity)
                ) {
                    highestSeverity = config.severity;
                }
                break; // One match per category is enough
            }
        }
    }

    const flagged = flaggedCategories.length > 0;
    let action: 'allow' | 'warn' | 'block' = 'allow';
    if (highestSeverity === 'critical') action = 'block';
    else if (highestSeverity === 'high') action = 'warn';
    else if (highestSeverity === 'medium') action = 'warn';

    return { flagged, severity: highestSeverity, categories: flaggedCategories, action };
}

/**
 * Redact sensitive patterns from text (for logging/display)
 */
export function redactSensitive(text: string): string {
    let redacted = text;
    // Redact credit cards
    redacted = redacted.replace(/\b(\d{4})[- ]?\d{4}[- ]?\d{4}[- ]?(\d{4})\b/g, '$1-****-****-$2');
    // Redact SSN
    redacted = redacted.replace(/\b\d{3}-\d{2}-(\d{4})\b/g, '***-**-$1');
    // Redact API keys
    redacted = redacted.replace(/(sk-[a-zA-Z0-9]{4})[a-zA-Z0-9]{16,}/g, '$1...[REDACTED]');
    redacted = redacted.replace(/(sk-ant-[a-zA-Z0-9]{4})[a-zA-Z0-9]{16,}/g, '$1...[REDACTED]');
    redacted = redacted.replace(/(gsk_[a-zA-Z0-9]{4})[a-zA-Z0-9]{16,}/g, '$1...[REDACTED]');
    redacted = redacted.replace(/(ghp_[a-zA-Z0-9]{4})[a-zA-Z0-9]{32,}/g, '$1...[REDACTED]');
    return redacted;
}

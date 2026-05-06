/**
 * Secrets Manager
 *
 * Provides secure secret access with rotation tracking, audit logging,
 * and validation. In-memory cache with TTL for secret values.
 */

interface SecretConfig {
    key: string;
    envVar: string;
    required: boolean;
    rotationIntervalDays?: number;
    format?: RegExp;
    minLength?: number;
    description: string;
}

interface SecretAccess {
    key: string;
    accessedBy: string;
    accessedAt: number;
    context?: string;
}

interface SecretHealth {
    key: string;
    isSet: boolean;
    isValid: boolean;
    lastAccessed?: number;
    accessCount: number;
    needsRotation: boolean;
    description: string;
}

// Registry of known secrets
const SECRET_REGISTRY: SecretConfig[] = [
    {
        key: 'database_url',
        envVar: 'DATABASE_URL',
        required: true,
        format: /^postgres(ql)?:\/\/.+/,
        description: 'PostgreSQL connection string',
    },
    {
        key: 'convex_service_secret',
        envVar: 'CONVEX_SERVICE_SECRET',
        required: true,
        rotationIntervalDays: 90,
        minLength: 32,
        description: 'Server-only Convex service boundary secret',
    },
    {
        key: 'workos_api_key',
        envVar: 'WORKOS_API_KEY',
        required: true,
        rotationIntervalDays: 90,
        description: 'WorkOS AuthKit API key',
    },
    {
        key: 'workos_cookie_password',
        envVar: 'WORKOS_COOKIE_PASSWORD',
        required: true,
        rotationIntervalDays: 90,
        minLength: 32,
        description: 'WorkOS AuthKit encrypted cookie password',
    },
    {
        key: 'ai_gateway_api_key',
        envVar: 'AI_GATEWAY_API_KEY',
        required: true,
        rotationIntervalDays: 180,
        description: 'AI Gateway API key',
    },
    {
        key: 'openai_api_key',
        envVar: 'OPENAI_API_KEY',
        required: false,
        format: /^sk-/,
        rotationIntervalDays: 180,
        description: 'OpenAI API key',
    },
    {
        key: 'anthropic_api_key',
        envVar: 'ANTHROPIC_API_KEY',
        required: false,
        format: /^sk-ant-/,
        rotationIntervalDays: 180,
        description: 'Anthropic API key',
    },
    {
        key: 'groq_api_key',
        envVar: 'GROQ_API_KEY',
        required: false,
        format: /^gsk_/,
        rotationIntervalDays: 180,
        description: 'Groq API key',
    },
    {
        key: 'stripe_secret_key',
        envVar: 'STRIPE_SECRET_KEY',
        required: true,
        format: /^sk_(test|live)_/,
        rotationIntervalDays: 90,
        description: 'Stripe API secret key',
    },
    {
        key: 'stripe_webhook_secret',
        envVar: 'STRIPE_WEBHOOK_SECRET',
        required: true,
        format: /^whsec_/,
        rotationIntervalDays: 90,
        description: 'Stripe webhook signing secret',
    },
    {
        key: 'bot_approval_webhook_secret',
        envVar: 'BOT_APPROVAL_WEBHOOK_SECRET',
        required: true,
        minLength: 32,
        rotationIntervalDays: 90,
        description: 'Bot approval webhook signing secret',
    },
    {
        key: 'byok_encryption_secret',
        envVar: 'BYOK_ENCRYPTION_SECRET',
        required: false,
        minLength: 32,
        rotationIntervalDays: 365,
        description: 'BYOK credential vault encryption secret',
    },
    {
        key: 'legacy_field_encryption_key',
        envVar: 'ENCRYPTION_KEY',
        required: false,
        rotationIntervalDays: 365,
        description: 'Legacy field-level encryption key',
    },
    {
        key: 'sentry_dsn',
        envVar: 'SENTRY_DSN',
        required: false,
        format: /^https:\/\/.*@.*\.ingest\.sentry\.io/,
        description: 'Sentry error tracking DSN',
    },
];

// In-memory access log (ring buffer)
const MAX_ACCESS_LOG = 1000;
const accessLog: SecretAccess[] = [];
const accessCounts = new Map<string, number>();

// Track when secrets were last set/rotated
const rotationDates = new Map<string, number>();

/**
 * Get a secret value with audit logging
 */
export function getSecret(key: string, context?: string): string | undefined {
    const config = SECRET_REGISTRY.find((s) => s.key === key);
    if (!config) {
        console.warn(`[SecretsManager] Unknown secret key: ${key}`);
        return undefined;
    }

    const value = process.env[config.envVar];

    // Log access
    logAccess(key, context || 'unknown');

    return value;
}

/**
 * Get a secret value, throwing if not set
 */
export function requireSecret(key: string, context?: string): string {
    const value = getSecret(key, context);
    if (!value) {
        const config = SECRET_REGISTRY.find((s) => s.key === key);
        throw new Error(`Required secret "${key}" (${config?.envVar || 'unknown'}) is not set`);
    }
    return value;
}

/**
 * Validate a specific secret's format
 */
export function validateSecret(key: string): { isValid: boolean; reason?: string } {
    const config = SECRET_REGISTRY.find((s) => s.key === key);
    if (!config) {
        return { isValid: false, reason: 'Unknown secret key' };
    }

    const value = process.env[config.envVar];

    if (!value) {
        if (config.required) {
            return { isValid: false, reason: `Required secret ${config.envVar} is not set` };
        }
        return { isValid: true }; // Optional and not set is fine
    }

    if (config.format && !config.format.test(value)) {
        return {
            isValid: false,
            reason: `Secret ${config.envVar} does not match expected format`,
        };
    }

    if (config.minLength && value.length < config.minLength) {
        return {
            isValid: false,
            reason: `Secret ${config.envVar} must be at least ${config.minLength} characters`,
        };
    }

    return { isValid: true };
}

/**
 * Validate all secrets and return health report
 */
export function getSecretsHealth(): SecretHealth[] {
    return SECRET_REGISTRY.map((config) => {
        const value = process.env[config.envVar];
        const isSet = Boolean(value);
        const validation = validateSecret(config.key);
        const count = accessCounts.get(config.key) || 0;
        const rotationDate = rotationDates.get(config.key);

        let needsRotation = false;
        if (config.rotationIntervalDays && rotationDate) {
            const daysSinceRotation = (Date.now() - rotationDate) / (1000 * 60 * 60 * 24);
            needsRotation = daysSinceRotation > config.rotationIntervalDays;
        }

        return {
            key: config.key,
            isSet,
            isValid: validation.isValid,
            lastAccessed: getLastAccess(config.key),
            accessCount: count,
            needsRotation,
            description: config.description,
        };
    });
}

/**
 * Mark a secret as rotated (updates rotation timestamp)
 */
export function markSecretRotated(key: string): void {
    rotationDates.set(key, Date.now());
}

/**
 * Get recent access log entries
 */
export function getAccessLog(limit = 100): SecretAccess[] {
    return accessLog.slice(-limit);
}

/**
 * Check that no secrets appear in a string (for log sanitization)
 */
export function containsSecrets(text: string): boolean {
    for (const config of SECRET_REGISTRY) {
        const value = process.env[config.envVar];
        if (value && value.length > 8 && text.includes(value)) {
            return true;
        }
    }
    return false;
}

/**
 * Redact any secret values from a string
 */
export function redactSecrets(text: string): string {
    let redacted = text;
    for (const config of SECRET_REGISTRY) {
        const value = process.env[config.envVar];
        if (value && value.length > 8) {
            redacted = redacted.replaceAll(value, `[REDACTED:${config.key}]`);
        }
    }
    return redacted;
}

/**
 * Clear access logs (for testing)
 */
export function clearAccessLog(): void {
    accessLog.length = 0;
    accessCounts.clear();
}

// ─── Internal Helpers ──────────────────────────────────────────────────────────

function logAccess(key: string, context: string): void {
    const entry: SecretAccess = {
        key,
        accessedBy: context,
        accessedAt: Date.now(),
    };

    if (accessLog.length >= MAX_ACCESS_LOG) {
        accessLog.shift();
    }
    accessLog.push(entry);

    accessCounts.set(key, (accessCounts.get(key) || 0) + 1);
}

function getLastAccess(key: string): number | undefined {
    for (let i = accessLog.length - 1; i >= 0; i--) {
        if (accessLog[i].key === key) {
            return accessLog[i].accessedAt;
        }
    }
    return undefined;
}

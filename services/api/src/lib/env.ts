/**
 * Environment variable validation - fails fast on missing required vars
 */

const requiredEnvVars = ['DATABASE_URL', 'BETTER_AUTH_SECRET', 'BETTER_AUTH_URL'] as const;

const optionalEnvVars = [
    'SENTRY_DSN',
    'OPENAI_API_KEY',
    'ANTHROPIC_API_KEY',
    'GROQ_API_KEY',
    'GOOGLE_AI_API_KEY',
    'QDRANT_URL',
    'QDRANT_API_KEY',
    'POLAR_ACCESS_TOKEN',
    'POLAR_WEBHOOK_SECRET',
    'CRON_SECRET',
    'AGENTS_URL',
    'FRONTEND_URL',
    'CORS_ORIGINS',
] as const;

export function validateEnv() {
    // Skip validation in test environment
    if (process.env.NODE_ENV === 'test' || process.env.VITEST) {
        return;
    }

    const missing: string[] = [];

    for (const envVar of requiredEnvVars) {
        if (!process.env[envVar]) {
            missing.push(envVar);
        }
    }

    if (missing.length > 0) {
        throw new Error(
            `Missing required environment variables:\n${missing.map((v) => `  - ${v}`).join('\n')}\n\nCheck .env.example for required values.`
        );
    }

    const missingOptional: string[] = [];
    for (const envVar of optionalEnvVars) {
        if (!process.env[envVar]) {
            missingOptional.push(envVar);
        }
    }

    if (missingOptional.length > 0) {
        console.warn(`[env] Missing optional environment variables: ${missingOptional.join(', ')}`);
    }
}

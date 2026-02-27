/**
 * Environment variable validation - fails fast on missing required vars
 */

const requiredEnvVars = [
    'DATABASE_URL',
    'BETTER_AUTH_SECRET',
    'BETTER_AUTH_URL',
    'AI_GATEWAY_API_KEY',
    'CRON_SECRET',
    'POLAR_STARTER_PRODUCT_ID',
    'POLAR_PRO_PRODUCT_ID',
    'POLAR_ULTRA_PRODUCT_ID',
] as const;

const optionalEnvVars = [
    'SENTRY_DSN',
    'QDRANT_URL',
    'QDRANT_API_KEY',
    'POLAR_ACCESS_TOKEN',
    'POLAR_WEBHOOK_SECRET',
    'POLAR_STARTER_ANNUAL_PRODUCT_ID',
    'POLAR_PRO_ANNUAL_PRODUCT_ID',
    'POLAR_ULTRA_ANNUAL_PRODUCT_ID',
    'UPSTASH_REDIS_REST_URL',
    'UPSTASH_REDIS_REST_TOKEN',
    'QSTASH_TOKEN',
    'QSTASH_URL',
    'WEBHOOK_BASE_URL',
    'ONESIGNAL_APP_ID',
    'ONESIGNAL_REST_API_KEY',
    'ENCRYPTION_KEY',
    'ADMIN_USER_IDS',
    'AGENTS_URL',
    'FRONTEND_URL',
    'CORS_ORIGINS',
    'RESEND_API_KEY',
    'RESEND_FROM_EMAIL',
    'METRICS_BEARER_TOKEN',
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

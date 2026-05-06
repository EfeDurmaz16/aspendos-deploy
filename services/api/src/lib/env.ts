/**
 * Environment variable validation - fails fast on missing required vars
 */

const requiredEnvVars = [
    'DATABASE_URL',
    'NEXT_PUBLIC_CONVEX_URL',
    'CONVEX_SERVICE_SECRET',
    'AI_GATEWAY_API_KEY',
] as const;

const optionalEnvVars = [
    'SENTRY_DSN',
    'WORKOS_CLIENT_ID',
    'WORKOS_API_KEY',
    'WORKOS_COOKIE_PASSWORD',
    'SUPERMEMORY_API_KEY',
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'BOT_APPROVAL_WEBHOOK_SECRET',
    'CRON_SECRET',
    'UPSTASH_REDIS_REST_URL',
    'UPSTASH_REDIS_REST_TOKEN',
    'QSTASH_TOKEN',
    'QSTASH_URL',
    'WEBHOOK_BASE_URL',
    'ONESIGNAL_APP_ID',
    'ONESIGNAL_REST_API_KEY',
    'BYOK_ENCRYPTION_SECRET',
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

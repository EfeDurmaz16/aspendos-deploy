/**
 * Environment variable validation - fails fast on missing required vars
 */

const requiredEnvVars = [] as const;

const optionalEnvVars = [
    'NEXT_PUBLIC_CONVEX_URL',
    'WORKOS_CLIENT_ID',
    'WORKOS_API_KEY',
    'OPENAI_API_KEY',
    'ANTHROPIC_API_KEY',
    'GROQ_API_KEY',
    'SUPERMEMORY_API_KEY',
    'STRIPE_SECRET_KEY',
] as const;

export function validateEnv() {
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

    // Warn about missing optional vars
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

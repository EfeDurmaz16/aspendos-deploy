/**
 * Security Routes
 *
 * Security health checks, secrets audit, and access logging endpoints.
 * All endpoints require admin-level access.
 */

import { Hono } from 'hono';
import { getSecretsHealth, getAccessLog } from '../lib/secrets-manager';
import { requireAdmin } from './admin';

const securityRoutes = new Hono();

// All security routes require admin authentication
securityRoutes.use('*', requireAdmin);

// GET /security/secrets-health - Check secrets configuration
securityRoutes.get('/secrets-health', (c) => {
    const health = getSecretsHealth();

    const summary = {
        total: health.length,
        set: health.filter((h) => h.isSet).length,
        valid: health.filter((h) => h.isValid).length,
        needsRotation: health.filter((h) => h.needsRotation).length,
        missing: health.filter((h) => !h.isSet && h.key !== 'encryption_key').length,
    };

    // Don't expose actual secret values - only metadata
    const sanitizedHealth = health.map((h) => ({
        key: h.key,
        isSet: h.isSet,
        isValid: h.isValid,
        needsRotation: h.needsRotation,
        accessCount: h.accessCount,
        description: h.description,
    }));

    return c.json({
        health: sanitizedHealth,
        summary,
        recommendations: getRecommendations(health),
    });
});

// GET /security/access-log - Recent secret access log
securityRoutes.get('/access-log', (c) => {
    const limit = parseInt(c.req.query('limit') || '50', 10);
    const log = getAccessLog(Math.min(limit, 200));

    return c.json({
        entries: log.map((entry) => ({
            key: entry.key,
            accessedBy: entry.accessedBy,
            accessedAt: new Date(entry.accessedAt).toISOString(),
        })),
        total: log.length,
    });
});

// GET /security/audit - Security posture overview
securityRoutes.get('/audit', (c) => {
    const secretsHealth = getSecretsHealth();

    const checks = [
        {
            name: 'Environment Isolation',
            status: process.env.NODE_ENV === 'production' ? 'pass' : 'warn',
            details: `NODE_ENV = ${process.env.NODE_ENV || 'undefined'}`,
        },
        {
            name: 'Database Connection',
            status: process.env.DATABASE_URL ? 'pass' : 'fail',
            details: process.env.DATABASE_URL ? 'Configured' : 'Missing DATABASE_URL',
        },
        {
            name: 'Auth Secret',
            status: process.env.BETTER_AUTH_SECRET ? 'pass' : 'fail',
            details: process.env.BETTER_AUTH_SECRET ? 'Configured' : 'Missing BETTER_AUTH_SECRET',
        },
        {
            name: 'Error Tracking',
            status: process.env.SENTRY_DSN ? 'pass' : 'warn',
            details: process.env.SENTRY_DSN ? 'Sentry configured' : 'No error tracking',
        },
        {
            name: 'Secret Format Validation',
            status: secretsHealth.every((h) => h.isValid) ? 'pass' : 'warn',
            details: `${secretsHealth.filter((h) => !h.isValid).length} invalid secrets`,
        },
        {
            name: 'Secret Rotation',
            status: secretsHealth.some((h) => h.needsRotation) ? 'warn' : 'pass',
            details: `${secretsHealth.filter((h) => h.needsRotation).length} secrets need rotation`,
        },
        {
            name: 'CORS Configuration',
            status: process.env.CORS_ORIGINS ? 'pass' : 'warn',
            details: process.env.CORS_ORIGINS ? 'Custom CORS configured' : 'Using defaults',
        },
        {
            name: 'Redis Rate Limiting',
            status:
                process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
                    ? 'pass'
                    : 'warn',
            details:
                process.env.UPSTASH_REDIS_REST_URL
                    ? 'Distributed rate limiting active'
                    : 'In-memory fallback (not suitable for multi-instance)',
        },
    ];

    const passCount = checks.filter((c) => c.status === 'pass').length;
    const warnCount = checks.filter((c) => c.status === 'warn').length;
    const failCount = checks.filter((c) => c.status === 'fail').length;

    return c.json({
        score: Math.round((passCount / checks.length) * 100),
        status: failCount > 0 ? 'critical' : warnCount > 2 ? 'warning' : 'healthy',
        checks,
        summary: { pass: passCount, warn: warnCount, fail: failCount },
        timestamp: new Date().toISOString(),
    });
});

function getRecommendations(
    health: Array<{ key: string; isSet: boolean; isValid: boolean; needsRotation: boolean }>
): string[] {
    const recs: string[] = [];

    const unset = health.filter((h) => !h.isSet);
    if (unset.length > 0) {
        recs.push(`Configure ${unset.length} missing secrets: ${unset.map((h) => h.key).join(', ')}`);
    }

    const invalid = health.filter((h) => h.isSet && !h.isValid);
    if (invalid.length > 0) {
        recs.push(`Fix ${invalid.length} invalid secrets: ${invalid.map((h) => h.key).join(', ')}`);
    }

    const needsRotation = health.filter((h) => h.needsRotation);
    if (needsRotation.length > 0) {
        recs.push(
            `Rotate ${needsRotation.length} secrets: ${needsRotation.map((h) => h.key).join(', ')}`
        );
    }

    if (recs.length === 0) {
        recs.push('All secrets are properly configured and up to date');
    }

    return recs;
}

export default securityRoutes;

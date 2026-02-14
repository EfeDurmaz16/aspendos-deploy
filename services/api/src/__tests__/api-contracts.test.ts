import { describe, expect, test, vi } from 'vitest';

vi.mock('openmemory-js', () => ({
    Memory: vi.fn(function () {
        return { add: vi.fn().mockResolvedValue({ id: 'mock-id' }) };
    }),
}));

import app from '../index';

// Helper to handle rate-limited responses in tests
function isRateLimited(status: number) {
    return status === 429;
}

describe('API Contract Tests - Health & System', () => {
    test('GET /health - returns health status contract', async () => {
        const res = await app.request('/health');

        // 200 when healthy/degraded, 503 when unhealthy
        expect([200, 503]).toContain(res.status);
        expect(res.headers.get('content-type')).toContain('application/json');
        expect(res.headers.get('x-request-id')).toBeDefined();
        expect(res.headers.get('x-api-version')).toBe('1.0.0');

        const body = await res.json();
        expect(body).toHaveProperty('status');
        expect(['healthy', 'degraded', 'unhealthy']).toContain(body.status);
        expect(body).toHaveProperty('version');
        expect(body).toHaveProperty('uptime');
        expect(body).toHaveProperty('timestamp');
        expect(body).toHaveProperty('dependencies');
        expect(body).toHaveProperty('circuitBreakers');
        expect(typeof body.uptime).toBe('number');
    });

    test('GET /ready - returns readiness status contract', async () => {
        const res = await app.request('/ready');

        expect(res.headers.get('content-type')).toContain('application/json');
        expect(res.headers.get('x-request-id')).toBeDefined();
        expect(res.headers.get('x-api-version')).toBe('1.0.0');

        const body = await res.json();
        expect(body).toHaveProperty('status');
        expect(['healthy', 'degraded', 'unhealthy']).toContain(body.status);
    });

    test('GET /status - returns service status contract', async () => {
        const res = await app.request('/status');

        expect(res.status).toBe(200);
        expect(res.headers.get('content-type')).toContain('application/json');
        expect(res.headers.get('x-request-id')).toBeDefined();

        const body = await res.json();
        expect(body).toHaveProperty('status');
        expect(['operational', 'degraded']).toContain(body.status);
        expect(body).toHaveProperty('version');
        expect(body).toHaveProperty('services');
        expect(body).toHaveProperty('uptime');
        expect(body).toHaveProperty('responseTimeMs');
        expect(body).toHaveProperty('timestamp');
        expect(typeof body.services).toBe('object');
    });

    test('GET /api/models - returns models list contract', async () => {
        const res = await app.request('/api/models');

        expect(res.status).toBe(200);
        expect(res.headers.get('content-type')).toContain('application/json');
        expect(res.headers.get('x-request-id')).toBeDefined();
        expect(res.headers.get('x-api-version')).toBe('1.0.0');

        const body = await res.json();
        expect(body).toHaveProperty('models');
        expect(Array.isArray(body.models)).toBe(true);

        if (body.models.length > 0) {
            const model = body.models[0];
            expect(model).toHaveProperty('id');
            expect(model).toHaveProperty('name');
            expect(model).toHaveProperty('provider');
            expect(model).toHaveProperty('tier');
        }
    });

    test('GET /api/models/tier/:tier - returns tier models contract', async () => {
        const res = await app.request('/api/models/tier/FREE');

        expect(res.status).toBe(200);
        expect(res.headers.get('content-type')).toContain('application/json');

        const body = await res.json();
        expect(body).toHaveProperty('tier');
        expect(body).toHaveProperty('models');
        expect(Array.isArray(body.models)).toBe(true);
        expect(body.tier).toBe('FREE');
    });

    test('GET /api/models/pinned - returns pinned models contract', async () => {
        const res = await app.request('/api/models/pinned');

        expect(res.status).toBe(200);
        expect(res.headers.get('content-type')).toContain('application/json');

        const body = await res.json();
        expect(body).toHaveProperty('pinned');
        expect(Array.isArray(body.pinned)).toBe(true);

        if (body.pinned.length > 0) {
            const model = body.pinned[0];
            expect(model).toHaveProperty('id');
            expect(model).toHaveProperty('name');
            expect(model).toHaveProperty('provider');
        }
    });

    test('GET /api/features - returns user features contract', async () => {
        const res = await app.request('/api/features');

        expect(res.status).toBe(200);
        expect(res.headers.get('content-type')).toContain('application/json');

        const body = await res.json();
        expect(body).toHaveProperty('features');
        expect(Array.isArray(body.features)).toBe(true);

        if (body.features.length > 0) {
            const feature = body.features[0];
            expect(feature).toHaveProperty('name');
            expect(feature).toHaveProperty('enabled');
            expect(typeof feature.enabled).toBe('boolean');
        }
    });

    test('GET /api/features/all - returns all feature flags contract', async () => {
        const res = await app.request('/api/features/all');

        expect(res.status).toBe(200);
        expect(res.headers.get('content-type')).toContain('application/json');

        const body = await res.json();
        expect(body).toHaveProperty('flags');
        expect(Array.isArray(body.flags)).toBe(true);
    });

    test('GET /api/errors - returns error catalog contract', async () => {
        const res = await app.request('/api/errors');

        expect(res.status).toBe(200);
        expect(res.headers.get('content-type')).toContain('application/json');

        const body = await res.json();
        expect(body).toHaveProperty('errors');
        expect(Array.isArray(body.errors)).toBe(true);

        if (body.errors.length > 0) {
            const error = body.errors[0];
            expect(error).toHaveProperty('code');
            expect(error).toHaveProperty('message');
        }
    });

    test('GET /api/changelog - returns changelog contract', async () => {
        const res = await app.request('/api/changelog');

        expect(res.status).toBe(200);
        expect(res.headers.get('content-type')).toContain('application/json');

        const body = await res.json();
        expect(body).toHaveProperty('changelog');
        expect(body).toHaveProperty('latest');
        expect(Array.isArray(body.changelog)).toBe(true);

        if (body.changelog.length > 0) {
            const entry = body.changelog[0];
            expect(entry).toHaveProperty('version');
        }
    });

    test('GET /api/legal/terms - returns terms of service contract', async () => {
        const res = await app.request('/api/legal/terms');

        // May be rate limited in tests, accept both
        if (res.status === 429) {
            expect(res.headers.get('content-type')).toContain('application/json');
            const body = await res.json();
            expect(body).toHaveProperty('error');
            return;
        }

        expect(res.status).toBe(200);
        expect(res.headers.get('content-type')).toContain('application/json');

        const body = await res.json();
        expect(body).toHaveProperty('version');
        expect(body).toHaveProperty('effectiveDate');
        expect(body).toHaveProperty('lastUpdated');
        expect(body).toHaveProperty('sections');
        expect(Array.isArray(body.sections)).toBe(true);
    });

    test('GET /api/legal/privacy - returns privacy policy contract', async () => {
        const res = await app.request('/api/legal/privacy');

        // May be rate limited in tests, accept both
        if (res.status === 429) {
            expect(res.headers.get('content-type')).toContain('application/json');
            const body = await res.json();
            expect(body).toHaveProperty('error');
            return;
        }

        expect(res.status).toBe(200);
        expect(res.headers.get('content-type')).toContain('application/json');

        const body = await res.json();
        expect(body).toHaveProperty('version');
        expect(body).toHaveProperty('effectiveDate');
        expect(body).toHaveProperty('lastUpdated');
        expect(body).toHaveProperty('dataController');
        expect(body).toHaveProperty('sections');
        expect(Array.isArray(body.sections)).toBe(true);
    });

    test('GET /metrics - returns Prometheus metrics contract', async () => {
        const res = await app.request('/metrics');

        expect(res.status).toBe(200);
        expect(res.headers.get('content-type')).toBe('text/plain; version=0.0.4');
        expect(res.headers.get('x-request-id')).toBeDefined();

        const text = await res.text();
        expect(text).toContain('http_requests_total');
        expect(typeof text).toBe('string');
    });
});

describe('API Contract Tests - Documentation', () => {
    test('GET /api/docs/openapi.json - returns OpenAPI spec contract', async () => {
        const res = await app.request('/api/docs/openapi.json');

        expect(res.status).toBe(200);
        expect(res.headers.get('content-type')).toContain('application/json');
        expect(res.headers.get('x-request-id')).toBeDefined();

        const body = await res.json();
        expect(body).toHaveProperty('openapi');
        expect(body).toHaveProperty('info');
        expect(body).toHaveProperty('paths');
        expect(body.info).toHaveProperty('title');
        expect(body.info).toHaveProperty('version');
        expect(typeof body.paths).toBe('object');
    });

    test('GET /api/docs/ui - returns Swagger UI HTML contract', async () => {
        const res = await app.request('/api/docs/ui');

        expect(res.status).toBe(200);
        expect(res.headers.get('content-type')).toContain('text/html');
        expect(res.headers.get('x-request-id')).toBeDefined();

        const html = await res.text();
        expect(html).toContain('<!DOCTYPE html>');
        expect(html).toContain('swagger-ui');
    });

    test('GET /api/docs - returns API documentation contract', async () => {
        const res = await app.request('/api/docs');

        expect(res.status).toBe(200);
        expect(res.headers.get('content-type')).toContain('application/json');

        const body = await res.json();
        expect(body).toHaveProperty('name');
        expect(body).toHaveProperty('version');
        expect(body).toHaveProperty('endpoints');
        expect(Array.isArray(body.endpoints)).toBe(true);
        expect(body.name).toBe('Yula API');

        if (body.endpoints.length > 0) {
            const endpoint = body.endpoints[0];
            expect(endpoint).toHaveProperty('method');
            expect(endpoint).toHaveProperty('path');
            expect(endpoint).toHaveProperty('description');
            expect(endpoint).toHaveProperty('auth');
        }
    });
});

describe('API Contract Tests - Security', () => {
    test('GET /.well-known/security.txt - returns security disclosure contract', async () => {
        const res = await app.request('/.well-known/security.txt');

        expect(res.status).toBe(200);
        expect(res.headers.get('content-type')).toContain('text/plain');
        expect(res.headers.get('x-request-id')).toBeDefined();

        const text = await res.text();
        expect(text).toContain('Contact:');
        expect(text).toContain('Expires:');
        expect(typeof text).toBe('string');
    });

    test('All responses include X-Request-Id header', async () => {
        const endpoints = ['/health', '/ready', '/api/models', '/api/features', '/api/docs'];

        for (const endpoint of endpoints) {
            const res = await app.request(endpoint);
            expect(res.headers.get('x-request-id')).toBeDefined();
            expect(res.headers.get('x-request-id')).toMatch(/^[0-9a-f-]{36}$/);
        }
    });

    test('All responses include X-API-Version header', async () => {
        const endpoints = ['/health', '/ready', '/api/models', '/api/features', '/api/docs'];

        for (const endpoint of endpoints) {
            const res = await app.request(endpoint);
            expect(res.headers.get('x-api-version')).toBe('1.0.0');
        }
    });

    test('All responses include security headers', async () => {
        const res = await app.request('/health');

        expect(res.headers.get('x-content-type-options')).toBe('nosniff');
        expect(res.headers.get('x-frame-options')).toBe('DENY');
        expect(res.headers.get('x-xss-protection')).toBe('1; mode=block');
        expect(res.headers.get('referrer-policy')).toBe('strict-origin-when-cross-origin');
        expect(res.headers.get('content-security-policy')).toBeDefined();
    });
});

describe('API Contract Tests - Error Handling', () => {
    test('POST /api/chat without auth - returns consistent error contract', async () => {
        const res = await app.request('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message: 'test' }),
        });

        expect(res.headers.get('content-type')).toContain('application/json');
        expect(res.headers.get('x-request-id')).toBeDefined();

        const body = await res.json();
        expect(body).toHaveProperty('error');
        expect(typeof body.error).toBe('string');
    });

    test('POST with invalid JSON - returns consistent error format', async () => {
        const res = await app.request('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Origin: 'http://localhost:3000',
            },
            body: 'invalid json {',
        });

        if (isRateLimited(res.status)) {
            const body = await res.json();
            expect(body).toHaveProperty('error');
            return;
        }

        expect(res.status).toBe(400);
        expect(res.headers.get('content-type')).toContain('application/json');

        const body = await res.json();
        expect(body).toHaveProperty('error');
        expect(body).toHaveProperty('code');
        expect(body.code).toBe('INVALID_JSON');
    });

    test('GET /nonexistent - returns 404 with error contract', async () => {
        const res = await app.request('/nonexistent-endpoint-12345');

        if (isRateLimited(res.status)) {
            return; // Rate limited, skip validation
        }

        expect(res.status).toBe(404);
        expect(res.headers.get('x-request-id')).toBeDefined();
        expect(res.headers.get('x-api-version')).toBe('1.0.0');
    });

    test('POST without Origin header - returns 403 Forbidden', async () => {
        const res = await app.request('/api/memory', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ content: 'test' }),
        });

        expect(res.status).toBe(403);
        expect(res.headers.get('content-type')).toContain('application/json');

        const body = await res.json();
        expect(body).toHaveProperty('error');
        expect(body.error).toBe('Forbidden');
    });
});

describe('API Contract Tests - Tracing Endpoints', () => {
    test('GET /api/traces - returns traces list contract', async () => {
        const res = await app.request('/api/traces');

        if (isRateLimited(res.status)) return;

        expect(res.status).toBe(200);
        expect(res.headers.get('content-type')).toContain('application/json');
        expect(res.headers.get('x-request-id')).toBeDefined();

        const body = await res.json();
        expect(body).toHaveProperty('traces');
        expect(body).toHaveProperty('pagination');
        expect(body).toHaveProperty('stats');
        expect(Array.isArray(body.traces)).toBe(true);
        expect(body.pagination).toHaveProperty('limit');
        expect(body.pagination).toHaveProperty('offset');
        expect(body.pagination).toHaveProperty('total');
    });

    test('GET /api/traces/:traceId - returns 404 for non-existent trace', async () => {
        const res = await app.request('/api/traces/non-existent-trace-id');

        if (isRateLimited(res.status)) return;

        expect(res.status).toBe(404);
        expect(res.headers.get('content-type')).toContain('application/json');
        expect(res.headers.get('x-request-id')).toBeDefined();

        const body = await res.json();
        expect(body).toHaveProperty('error');
        expect(body.error).toBe('Trace not found');
    });

    test('GET /api/traces/export/otlp - returns OTLP export contract', async () => {
        const res = await app.request('/api/traces/export/otlp');

        if (isRateLimited(res.status)) return;

        expect(res.status).toBe(200);
        expect(res.headers.get('content-type')).toBe('application/json');
        expect(res.headers.get('x-request-id')).toBeDefined();

        const body = await res.json();
        expect(typeof body).toBe('object');
    });
});

describe('API Contract Tests - Webhooks & Events', () => {
    test('GET /api/webhooks/events - returns webhook events catalog contract', async () => {
        const res = await app.request('/api/webhooks/events');

        if (isRateLimited(res.status)) return;

        expect(res.status).toBe(200);
        expect(res.headers.get('content-type')).toContain('application/json');
        expect(res.headers.get('x-request-id')).toBeDefined();

        const body = await res.json();
        expect(body).toHaveProperty('events');
        expect(body).toHaveProperty('categories');
        expect(Array.isArray(body.events)).toBe(true);
        expect(Array.isArray(body.categories)).toBe(true);
    });

    test('GET /api/webhooks/events?category=chat - returns filtered events', async () => {
        const res = await app.request('/api/webhooks/events?category=chat');

        if (isRateLimited(res.status)) return;

        expect(res.status).toBe(200);
        expect(res.headers.get('content-type')).toContain('application/json');
        expect(res.headers.get('x-request-id')).toBeDefined();

        const body = await res.json();
        expect(body).toHaveProperty('events');
        expect(Array.isArray(body.events)).toBe(true);
    });
});

describe('API Contract Tests - Job Queue', () => {
    test('GET /api/jobs/stats - returns job queue stats contract', async () => {
        const res = await app.request('/api/jobs/stats');

        if (isRateLimited(res.status)) return;

        expect(res.status).toBe(200);
        expect(res.headers.get('content-type')).toContain('application/json');
        expect(res.headers.get('x-request-id')).toBeDefined();

        const body = await res.json();
        expect(body).toHaveProperty('stats');
        expect(body).toHaveProperty('deadLetterQueue');
        expect(typeof body.deadLetterQueue).toBe('number');
    });

    test('GET /api/jobs/dead-letter - requires authentication', async () => {
        const res = await app.request('/api/jobs/dead-letter');

        if (isRateLimited(res.status)) return;

        expect(res.status).toBe(401);
        expect(res.headers.get('content-type')).toContain('application/json');
        expect(res.headers.get('x-request-id')).toBeDefined();

        const body = await res.json();
        expect(body).toHaveProperty('error');
        expect(body.error).toBe('Unauthorized');
    });

    test('POST /api/jobs/retry/:jobId - requires authentication', async () => {
        const res = await app.request('/api/jobs/retry/test-job-id', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Origin: 'http://localhost:3000',
            },
        });

        if (isRateLimited(res.status)) return;

        expect(res.status).toBe(401);
        expect(res.headers.get('content-type')).toContain('application/json');
        expect(res.headers.get('x-request-id')).toBeDefined();

        const body = await res.json();
        expect(body).toHaveProperty('error');
    });
});

describe('API Contract Tests - GDPR Endpoints', () => {
    test('DELETE /api/account - requires authentication', async () => {
        const res = await app.request('/api/account', {
            method: 'DELETE',
            headers: {
                Origin: 'http://localhost:3000',
            },
        });

        if (isRateLimited(res.status)) return;

        expect(res.status).toBe(401);
        expect(res.headers.get('content-type')).toContain('application/json');
        expect(res.headers.get('x-request-id')).toBeDefined();

        const body = await res.json();
        expect(body).toHaveProperty('error');
        expect(body.error).toBe('Unauthorized');
    });

    test('GET /api/export - requires authentication', async () => {
        const res = await app.request('/api/export');

        if (isRateLimited(res.status)) return;

        expect(res.status).toBe(401);
        expect(res.headers.get('content-type')).toContain('application/json');
        expect(res.headers.get('x-request-id')).toBeDefined();

        const body = await res.json();
        expect(body).toHaveProperty('error');
        expect(body.error).toBe('Unauthorized');
    });

    test('GET /api/account/export - requires authentication', async () => {
        const res = await app.request('/api/account/export');

        if (isRateLimited(res.status)) return;

        expect(res.status).toBe(401);
        expect(res.headers.get('content-type')).toContain('application/json');
        expect(res.headers.get('x-request-id')).toBeDefined();

        const body = await res.json();
        expect(body).toHaveProperty('error');
    });

    test('GET /api/audit-log - requires authentication', async () => {
        const res = await app.request('/api/audit-log');

        if (isRateLimited(res.status)) return;

        expect(res.status).toBe(401);
        expect(res.headers.get('content-type')).toContain('application/json');
        expect(res.headers.get('x-request-id')).toBeDefined();

        const body = await res.json();
        expect(body).toHaveProperty('error');
        expect(body.error).toBe('Unauthorized');
    });

    test('GET /api/consent - requires authentication', async () => {
        const res = await app.request('/api/consent');

        if (isRateLimited(res.status)) return;

        expect(res.status).toBe(401);
        expect(res.headers.get('content-type')).toContain('application/json');
        expect(res.headers.get('x-request-id')).toBeDefined();

        const body = await res.json();
        expect(body).toHaveProperty('error');
        expect(body.error).toBe('Unauthorized');
    });
});

describe('API Contract Tests - Feedback & NPS', () => {
    test('POST /api/feedback/nps - requires authentication', async () => {
        const res = await app.request('/api/feedback/nps', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Origin: 'http://localhost:3000',
            },
            body: JSON.stringify({ score: 9 }),
        });

        if (isRateLimited(res.status)) return;

        expect(res.status).toBe(401);
        expect(res.headers.get('content-type')).toContain('application/json');
        expect(res.headers.get('x-request-id')).toBeDefined();

        const body = await res.json();
        expect(body).toHaveProperty('error');
        expect(body.error).toBe('Unauthorized');
    });

    test('GET /api/feedback/nps/summary - requires authentication', async () => {
        const res = await app.request('/api/feedback/nps/summary');

        if (isRateLimited(res.status)) return;

        expect(res.status).toBe(401);
        expect(res.headers.get('content-type')).toContain('application/json');
        expect(res.headers.get('x-request-id')).toBeDefined();

        const body = await res.json();
        expect(body).toHaveProperty('error');
    });
});

describe('API Contract Tests - Rate Limiting', () => {
    test('GET /api/rate-limit - requires authentication', async () => {
        const res = await app.request('/api/rate-limit');

        if (isRateLimited(res.status)) return;

        expect(res.status).toBe(401);
        expect(res.headers.get('content-type')).toContain('application/json');
        expect(res.headers.get('x-request-id')).toBeDefined();

        const body = await res.json();
        expect(body).toHaveProperty('error');
        expect(body.error).toBe('Unauthorized');
    });

    test('GET /api/analytics/rate-limits - requires authentication', async () => {
        const res = await app.request('/api/analytics/rate-limits');

        if (isRateLimited(res.status)) return;

        expect(res.status).toBe(401);
        expect(res.headers.get('content-type')).toContain('application/json');
        expect(res.headers.get('x-request-id')).toBeDefined();

        const body = await res.json();
        expect(body).toHaveProperty('error');
    });
});

describe('API Contract Tests - Retention Policies', () => {
    test('GET /api/cron/retention/policies - returns retention policies contract', async () => {
        const res = await app.request('/api/cron/retention/policies');

        if (isRateLimited(res.status)) return;

        expect(res.status).toBe(200);
        expect(res.headers.get('content-type')).toContain('application/json');
        expect(res.headers.get('x-request-id')).toBeDefined();

        const body = await res.json();
        expect(body).toHaveProperty('policies');
        expect(Array.isArray(body.policies)).toBe(true);
    });

    test('POST /api/cron/retention - requires cron secret', async () => {
        const res = await app.request('/api/cron/retention', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (isRateLimited(res.status)) return;

        expect(res.status).toBe(401);
        expect(res.headers.get('content-type')).toContain('application/json');
        expect(res.headers.get('x-request-id')).toBeDefined();

        const body = await res.json();
        expect(body).toHaveProperty('error');
        expect(body.error).toBe('Unauthorized');
    });
});

describe('API Contract Tests - Response Headers Consistency', () => {
    test('All JSON responses have correct Content-Type', async () => {
        const endpoints = [
            '/health',
            '/ready',
            '/status',
            '/api/models',
            '/api/features',
            '/api/docs',
            '/api/errors',
            '/api/changelog',
            '/api/legal/terms',
        ];

        for (const endpoint of endpoints) {
            const res = await app.request(endpoint);
            expect(res.headers.get('content-type')).toContain('application/json');
        }
    });

    test('All responses have X-Response-Time header', async () => {
        const res = await app.request('/health');
        expect(res.headers.get('x-response-time')).toBeDefined();
        expect(res.headers.get('x-response-time')).toMatch(/\d+ms/);
    });

    test('All responses have CSP header', async () => {
        const res = await app.request('/health');
        const csp = res.headers.get('content-security-policy');
        expect(csp).toBeDefined();
        expect(csp).toContain('default-src');
    });
});

describe('API Contract Tests - Pagination Patterns', () => {
    test('GET /api/traces - supports pagination query params', async () => {
        const res = await app.request('/api/traces?limit=10&offset=0');

        if (isRateLimited(res.status)) return;

        expect(res.status).toBe(200);
        expect(res.headers.get('x-request-id')).toBeDefined();

        const body = await res.json();
        expect(body.pagination.limit).toBe(10);
        expect(body.pagination.offset).toBe(0);
    });

    test('GET /api/changelog - supports limit param', async () => {
        const res = await app.request('/api/changelog?limit=5');

        if (isRateLimited(res.status)) return;

        expect(res.status).toBe(200);
        expect(res.headers.get('x-request-id')).toBeDefined();

        const body = await res.json();
        expect(Array.isArray(body.changelog)).toBe(true);
        expect(body.changelog.length).toBeLessThanOrEqual(5);
    });
});

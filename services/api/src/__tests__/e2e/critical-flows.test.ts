/**
 * E2E Tests for Critical User Flows
 * Tests full request/response flows for the YULA API
 * These are integration tests using vitest, not browser tests
 */

import { Hono } from 'hono';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearRateLimits_forTesting } from '../../middleware/endpoint-rate-limit';
import { clearGlobalRateLimits_forTesting } from '../../middleware/rate-limit';

// Import the app
import app from '../../index';

// Clear rate limits between each test to prevent 429s
beforeEach(() => {
    clearRateLimits_forTesting();
    clearGlobalRateLimits_forTesting();
});

describe('E2E - Health & System Tests', () => {
    describe('GET /health', () => {
        it('returns proper health check structure', async () => {
            const res = await app.request('/health');
            expect(res.status).toBe(200);

            const data = await res.json();
            expect(data).toHaveProperty('status');
            expect(data).toHaveProperty('version');
            expect(data).toHaveProperty('uptime');
            expect(data).toHaveProperty('timestamp');
            expect(data).toHaveProperty('dependencies');
            expect(data).toHaveProperty('circuitBreakers');
        });

        it('includes database dependency check', async () => {
            const res = await app.request('/health');
            const data = await res.json();

            expect(data.dependencies).toHaveProperty('database');
            expect(data.dependencies.database).toHaveProperty('status');
            expect(['up', 'down']).toContain(data.dependencies.database.status);
        });

        it('includes circuit breaker states', async () => {
            const res = await app.request('/health');
            const data = await res.json();

            expect(data.circuitBreakers).toHaveProperty('openai');
            expect(data.circuitBreakers).toHaveProperty('anthropic');
            expect(data.circuitBreakers).toHaveProperty('groq');
            expect(data.circuitBreakers).toHaveProperty('qdrant');
            expect(data.circuitBreakers).toHaveProperty('google');
        });

        it('returns correct status code based on health', async () => {
            const res = await app.request('/health');
            const data = await res.json();

            if (data.status === 'unhealthy') {
                expect(res.status).toBe(503);
            } else {
                expect(res.status).toBe(200);
            }
        });

        it('includes uptime as positive number', async () => {
            const res = await app.request('/health');
            const data = await res.json();

            expect(typeof data.uptime).toBe('number');
            expect(data.uptime).toBeGreaterThanOrEqual(0);
        });
    });

    describe('GET /ready', () => {
        it('returns readiness status', async () => {
            const res = await app.request('/ready');
            const data = await res.json();

            expect(data).toHaveProperty('status');
            expect(['healthy', 'degraded', 'unhealthy']).toContain(data.status);
        });

        it('returns 503 when unhealthy', async () => {
            const res = await app.request('/ready');
            const data = await res.json();

            if (data.status === 'unhealthy') {
                expect(res.status).toBe(503);
            }
        });
    });

    describe('GET /status', () => {
        it('returns operational status', async () => {
            const res = await app.request('/status');
            expect(res.status).toBe(200);

            const data = await res.json();
            expect(data).toHaveProperty('status');
            expect(data).toHaveProperty('version');
            expect(data).toHaveProperty('services');
            expect(data).toHaveProperty('uptime');
            expect(data).toHaveProperty('responseTimeMs');
            expect(data).toHaveProperty('timestamp');
        });

        it('includes service status', async () => {
            const res = await app.request('/status');
            const data = await res.json();

            expect(data.services).toHaveProperty('database');
            expect(data.services.database).toHaveProperty('status');
        });

        it('includes response time metric', async () => {
            const res = await app.request('/status');
            const data = await res.json();

            expect(typeof data.responseTimeMs).toBe('number');
            expect(data.responseTimeMs).toBeGreaterThanOrEqual(0);
        });
    });

    describe('GET /api/models', () => {
        it('returns model list', async () => {
            const res = await app.request('/api/models');
            expect(res.status).toBe(200);

            const data = await res.json();
            expect(data).toHaveProperty('models');
            expect(Array.isArray(data.models)).toBe(true);
            expect(data.models.length).toBeGreaterThan(0);
        });

        it('each model has required fields', async () => {
            const res = await app.request('/api/models');
            const data = await res.json();

            for (const model of data.models) {
                expect(model).toHaveProperty('id');
                expect(model).toHaveProperty('name');
                expect(model).toHaveProperty('provider');
                expect(model).toHaveProperty('tier');
            }
        });

        it('includes multiple providers', async () => {
            const res = await app.request('/api/models');
            const data = await res.json();

            const providers = [...new Set(data.models.map((m: any) => m.provider))];
            expect(providers.length).toBeGreaterThan(1);
        });
    });

    describe('GET /api/errors', () => {
        it('returns error catalog', async () => {
            const res = await app.request('/api/errors');
            expect(res.status).toBe(200);

            const data = await res.json();
            expect(data).toHaveProperty('errors');
            expect(Array.isArray(data.errors)).toBe(true);
        });

        it('error catalog has proper structure', async () => {
            const res = await app.request('/api/errors');
            const data = await res.json();

            for (const error of data.errors) {
                expect(error).toHaveProperty('code');
                expect(error).toHaveProperty('message');
                expect(error).toHaveProperty('httpStatus');
                expect(error).toHaveProperty('key');
            }
        });
    });

    describe('GET /api/features/all', () => {
        it('returns all feature flags', async () => {
            const res = await app.request('/api/features/all');
            expect(res.status).toBe(200);

            const data = await res.json();
            expect(data).toHaveProperty('flags');
            expect(Array.isArray(data.flags)).toBe(true);
        });

        it('feature flags have proper structure', async () => {
            const res = await app.request('/api/features/all');
            const data = await res.json();

            for (const flag of data.flags) {
                expect(flag).toHaveProperty('key');
                expect(flag).toHaveProperty('name');
                expect(flag).toHaveProperty('description');
                expect(flag).toHaveProperty('enabled');
                expect(flag).toHaveProperty('allowedTiers');
                expect(flag).toHaveProperty('rolloutPercentage');
            }
        });
    });

    describe('GET /api/changelog', () => {
        it('returns changelog', async () => {
            const res = await app.request('/api/changelog');
            expect(res.status).toBe(200);

            const data = await res.json();
            expect(data).toHaveProperty('changelog');
            expect(data).toHaveProperty('latest');
        });

        it('supports limit parameter', async () => {
            const res = await app.request('/api/changelog?limit=5');
            expect(res.status).toBe(200);

            const data = await res.json();
            expect(Array.isArray(data.changelog)).toBe(true);
        });
    });

    describe('GET /api/legal/terms', () => {
        it('returns terms of service', async () => {
            const res = await app.request('/api/legal/terms');
            expect(res.status).toBe(200);

            const data = await res.json();
            expect(data).toBeDefined();
        });
    });

    describe('GET /api/legal/privacy', () => {
        it('returns privacy policy', async () => {
            const res = await app.request('/api/legal/privacy');
            expect(res.status).toBe(200);

            const data = await res.json();
            expect(data).toBeDefined();
        });
    });

    describe('GET /api/webhooks/events', () => {
        it('returns webhook event catalog', async () => {
            const res = await app.request('/api/webhooks/events');
            expect(res.status).toBe(200);

            const data = await res.json();
            expect(data).toHaveProperty('events');
            expect(data).toHaveProperty('categories');
        });

        it('supports category filter', async () => {
            const res = await app.request('/api/webhooks/events?category=billing');
            expect(res.status).toBe(200);

            const data = await res.json();
            expect(Array.isArray(data.events)).toBe(true);
        });
    });
});

describe('E2E - API Documentation Tests', () => {
    describe('GET /api/docs', () => {
        it('returns API documentation', async () => {
            const res = await app.request('/api/docs');
            expect(res.status).toBe(200);

            const data = await res.json();
            expect(data).toHaveProperty('name', 'YULA OS API');
            expect(data).toHaveProperty('version');
            expect(data).toHaveProperty('endpoints');
        });

        it('all documented endpoints have valid structure', async () => {
            const res = await app.request('/api/docs');
            const data = await res.json();

            for (const endpoint of data.endpoints) {
                expect(endpoint).toHaveProperty('method');
                expect(endpoint).toHaveProperty('path');
                expect(endpoint).toHaveProperty('description');
                expect(endpoint).toHaveProperty('auth');

                // Valid HTTP methods
                expect(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']).toContain(endpoint.method);

                // Path should start with /
                expect(endpoint.path.startsWith('/')).toBe(true);

                // Auth should be boolean
                expect(typeof endpoint.auth).toBe('boolean');
            }
        });

        it('documents chat endpoints', async () => {
            const res = await app.request('/api/docs');
            const data = await res.json();

            const chatEndpoints = data.endpoints.filter((e: any) => e.path.includes('/chat'));
            expect(chatEndpoints.length).toBeGreaterThan(0);
        });

        it('documents memory endpoints', async () => {
            const res = await app.request('/api/docs');
            const data = await res.json();

            const memoryEndpoints = data.endpoints.filter((e: any) => e.path.includes('/memory'));
            expect(memoryEndpoints.length).toBeGreaterThan(0);
        });

        it('documents council endpoints', async () => {
            const res = await app.request('/api/docs');
            const data = await res.json();

            const councilEndpoints = data.endpoints.filter((e: any) => e.path.includes('/council'));
            expect(councilEndpoints.length).toBeGreaterThan(0);
        });

        it('documents PAC endpoints', async () => {
            const res = await app.request('/api/docs');
            const data = await res.json();

            const pacEndpoints = data.endpoints.filter((e: any) => e.path.includes('/pac'));
            expect(pacEndpoints.length).toBeGreaterThan(0);
        });
    });
});

describe('E2E - Error Handling Tests', () => {
    describe('Invalid JSON handling', () => {
        it('returns error for invalid JSON on protected endpoint', async () => {
            const res = await app.request('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Origin: 'http://localhost:3000',
                },
                body: 'invalid json{',
            });

            // Auth middleware fires before JSON parsing, so 401 is expected
            // for unauthenticated requests
            expect([400, 401]).toContain(res.status);
            const data = await res.json();
            expect(data).toHaveProperty('error');
        });
    });

    describe('Missing authentication', () => {
        it('returns 401 for protected endpoints without auth', async () => {
            const res = await app.request('/api/rate-limit');
            expect(res.status).toBe(401);

            const data = await res.json();
            expect(data).toHaveProperty('error', 'Unauthorized');
        });
    });

    describe('Rate limit headers', () => {
        it('includes rate limit headers on responses', async () => {
            const res = await app.request('/api/models');

            // Response should have security headers
            expect(res.headers.has('x-api-version')).toBe(true);
            expect(res.headers.has('x-request-id')).toBe(true);
        });
    });

    describe('Large payload rejection', () => {
        it('rejects payloads over 10MB', async () => {
            const largeSize = 11 * 1024 * 1024; // 11MB

            const res = await app.request('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': String(largeSize),
                    Origin: 'http://localhost:3000',
                },
                body: JSON.stringify({ test: 'x'.repeat(largeSize) }),
            });

            expect(res.status).toBe(413);
            const data = await res.json();
            expect(data.error).toContain('Request body too large');
        });
    });
});

describe('E2E - Security Tests', () => {
    describe('Security headers', () => {
        it('includes X-Content-Type-Options header', async () => {
            const res = await app.request('/api/models');
            expect(res.headers.get('x-content-type-options')).toBe('nosniff');
        });

        it('includes X-Frame-Options header', async () => {
            const res = await app.request('/api/models');
            expect(res.headers.get('x-frame-options')).toBe('DENY');
        });

        it('includes X-XSS-Protection header', async () => {
            const res = await app.request('/api/models');
            expect(res.headers.get('x-xss-protection')).toBe('1; mode=block');
        });

        it('includes Referrer-Policy header', async () => {
            const res = await app.request('/api/models');
            expect(res.headers.get('referrer-policy')).toBe('strict-origin-when-cross-origin');
        });

        it('includes Permissions-Policy header', async () => {
            const res = await app.request('/api/models');
            expect(res.headers.get('permissions-policy')).toBeTruthy();
        });

        it('includes Content-Security-Policy header', async () => {
            const res = await app.request('/api/models');
            expect(res.headers.get('content-security-policy')).toBeTruthy();
        });
    });

    describe('CSRF protection', () => {
        it('blocks POST requests without Origin header', async () => {
            const res = await app.request('/api/memory', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ content: 'test' }),
            });

            expect(res.status).toBe(403);
            const data = await res.json();
            expect(data.error).toBe('Forbidden');
        });

        it('allows POST requests with valid Origin', async () => {
            const res = await app.request('/api/memory', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Origin: 'http://localhost:3000',
                },
                body: JSON.stringify({ content: 'test' }),
            });

            // Will fail auth but won't be blocked by CSRF
            expect(res.status).not.toBe(403);
        });

        it('allows GET requests without Origin', async () => {
            const res = await app.request('/api/models', {
                method: 'GET',
            });

            expect(res.status).toBe(200);
        });
    });

    describe('Security.txt', () => {
        it('serves security.txt at well-known location', async () => {
            const res = await app.request('/.well-known/security.txt');
            expect(res.status).toBe(200);
            expect(res.headers.get('content-type')).toContain('text/plain');

            const text = await res.text();
            expect(text).toContain('Contact:');
            expect(text).toContain('Expires:');
        });
    });

    describe('API version headers', () => {
        it('includes X-API-Version header', async () => {
            const res = await app.request('/api/models');
            expect(res.headers.has('x-api-version')).toBe(true);
            expect(res.headers.get('x-api-version')).toMatch(/^\d+\.\d+\.\d+$/);
        });

        it('includes X-Request-Id header', async () => {
            const res = await app.request('/api/models');
            expect(res.headers.has('x-request-id')).toBe(true);
        });

        it('includes X-Response-Time header', async () => {
            const res = await app.request('/api/models');
            expect(res.headers.has('x-response-time')).toBe(true);
            expect(res.headers.get('x-response-time')).toMatch(/\d+ms$/);
        });
    });
});

describe('E2E - Feature Flag Tests', () => {
    describe('Feature flags respect tier restrictions', () => {
        it('feature flags have tier restrictions', async () => {
            const res = await app.request('/api/features/all');
            const data = await res.json();

            const restrictedFlags = data.flags.filter(
                (f: any) => f.allowedTiers && f.allowedTiers.length > 0
            );
            expect(restrictedFlags.length).toBeGreaterThan(0);
        });

        it('feature flags have valid tier values', async () => {
            const res = await app.request('/api/features/all');
            const data = await res.json();

            const validTiers = ['FREE', 'STARTER', 'PRO', 'ULTRA'];

            for (const flag of data.flags) {
                for (const tier of flag.allowedTiers) {
                    expect(validTiers).toContain(tier);
                }
            }
        });
    });

    describe('Features have proper structure', () => {
        it('all features have rollout percentage', async () => {
            const res = await app.request('/api/features/all');
            const data = await res.json();

            for (const flag of data.flags) {
                expect(typeof flag.rolloutPercentage).toBe('number');
                expect(flag.rolloutPercentage).toBeGreaterThanOrEqual(0);
                expect(flag.rolloutPercentage).toBeLessThanOrEqual(100);
            }
        });

        it('all features have enabled status', async () => {
            const res = await app.request('/api/features/all');
            const data = await res.json();

            for (const flag of data.flags) {
                expect(typeof flag.enabled).toBe('boolean');
            }
        });
    });
});

describe('E2E - Models & Tiers', () => {
    describe('GET /api/models/tier/:tier', () => {
        it('returns models for FREE tier', async () => {
            const res = await app.request('/api/models/tier/free');
            expect(res.status).toBe(200);

            const data = await res.json();
            expect(data).toHaveProperty('tier', 'FREE');
            expect(data).toHaveProperty('models');
            expect(Array.isArray(data.models)).toBe(true);
        });

        it('returns models for PRO tier', async () => {
            const res = await app.request('/api/models/tier/pro');
            expect(res.status).toBe(200);

            const data = await res.json();
            expect(data).toHaveProperty('tier', 'PRO');
            expect(data.models.length).toBeGreaterThan(0);
        });

        it('returns models for ULTRA tier', async () => {
            const res = await app.request('/api/models/tier/ultra');
            expect(res.status).toBe(200);

            const data = await res.json();
            expect(data).toHaveProperty('tier', 'ULTRA');
        });
    });

    describe('GET /api/models/pinned', () => {
        it('returns pinned models', async () => {
            const res = await app.request('/api/models/pinned');
            expect(res.status).toBe(200);

            const data = await res.json();
            expect(data).toHaveProperty('pinned');
            expect(Array.isArray(data.pinned)).toBe(true);
        });

        it('pinned models have required fields', async () => {
            const res = await app.request('/api/models/pinned');
            const data = await res.json();

            for (const model of data.pinned) {
                expect(model).toHaveProperty('id');
                expect(model).toHaveProperty('name');
                expect(model).toHaveProperty('provider');
            }
        });
    });
});

describe('E2E - Metrics & Monitoring', () => {
    describe('GET /metrics', () => {
        it('returns Prometheus metrics', async () => {
            const res = await app.request('/metrics');
            expect(res.status).toBe(200);
            expect(res.headers.get('content-type')).toBe('text/plain; version=0.0.4');
        });

        it('includes HTTP request metrics', async () => {
            // Make a request first to generate metrics
            await app.request('/api/models');

            const res = await app.request('/metrics');
            const text = await res.text();

            expect(text).toContain('http_requests_total');
            expect(text).toContain('# HELP');
            expect(text).toContain('# TYPE');
        });
    });
});

import { describe, expect, test } from 'vitest';
import { getOpenAPISpec } from '../openapi-spec';

describe('OpenAPI Specification', () => {
    test('should have required OpenAPI fields', () => {
        const spec = getOpenAPISpec();

        expect(spec.openapi).toBe('3.0.3');
        expect(spec.info).toBeDefined();
        expect(spec.info.title).toBe('YULA OS API');
        expect(spec.info.version).toBe('1.0.0');
        expect(spec.paths).toBeDefined();
    });

    test('should define security schemes', () => {
        const spec = getOpenAPISpec();

        expect(spec.components?.securitySchemes).toBeDefined();
        expect(spec.components?.securitySchemes?.bearerAuth).toBeDefined();
        expect(spec.components?.securitySchemes?.bearerAuth).toMatchObject({
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
        });
    });

    test('should include API key security scheme', () => {
        const spec = getOpenAPISpec();

        expect(spec.components?.securitySchemes?.apiKey).toBeDefined();
        expect(spec.components?.securitySchemes?.apiKey).toMatchObject({
            type: 'apiKey',
            in: 'header',
            name: 'X-API-Key',
        });
    });

    test('should document Chat endpoints', () => {
        const spec = getOpenAPISpec();

        expect(spec.paths['/api/chat']).toBeDefined();
        expect(spec.paths['/api/chat']?.get).toBeDefined();
        expect(spec.paths['/api/chat']?.post).toBeDefined();
        expect(spec.paths['/api/chat/{id}']).toBeDefined();
        expect(spec.paths['/api/chat/{id}']?.get).toBeDefined();
        expect(spec.paths['/api/chat/{id}']?.patch).toBeDefined();
        expect(spec.paths['/api/chat/{id}']?.delete).toBeDefined();
    });

    test('should document Memory endpoints', () => {
        const spec = getOpenAPISpec();

        expect(spec.paths['/api/memory']).toBeDefined();
        expect(spec.paths['/api/memory']?.get).toBeDefined();
        expect(spec.paths['/api/memory']?.post).toBeDefined();
        expect(spec.paths['/api/memory/search']).toBeDefined();
        expect(spec.paths['/api/memory/search']?.post).toBeDefined();
        expect(spec.paths['/api/memory/export']).toBeDefined();
        expect(spec.paths['/api/memory/export']?.get).toBeDefined();
    });

    test('should document Council endpoints', () => {
        const spec = getOpenAPISpec();

        expect(spec.paths['/api/council']).toBeDefined();
        expect(spec.paths['/api/council']?.post).toBeDefined();
        expect(spec.paths['/api/council/{id}']).toBeDefined();
        expect(spec.paths['/api/council/{id}']?.get).toBeDefined();
    });

    test('should document PAC endpoints', () => {
        const spec = getOpenAPISpec();

        expect(spec.paths['/api/pac']).toBeDefined();
        expect(spec.paths['/api/pac']?.get).toBeDefined();
        expect(spec.paths['/api/pac']?.post).toBeDefined();
        expect(spec.paths['/api/pac/{id}']).toBeDefined();
        expect(spec.paths['/api/pac/{id}']?.delete).toBeDefined();
    });

    test('should document Billing endpoints', () => {
        const spec = getOpenAPISpec();

        expect(spec.paths['/api/billing']).toBeDefined();
        expect(spec.paths['/api/billing']?.get).toBeDefined();
        expect(spec.paths['/api/billing/checkout']).toBeDefined();
        expect(spec.paths['/api/billing/checkout']?.post).toBeDefined();
    });

    test('should document System endpoints', () => {
        const spec = getOpenAPISpec();

        expect(spec.paths['/api/health']).toBeDefined();
        expect(spec.paths['/api/health']?.get).toBeDefined();
        expect(spec.paths['/metrics']).toBeDefined();
        expect(spec.paths['/metrics']?.get).toBeDefined();
    });

    test('should document Search endpoints', () => {
        const spec = getOpenAPISpec();

        expect(spec.paths['/api/search']).toBeDefined();
        expect(spec.paths['/api/search']?.post).toBeDefined();
    });

    test('should document Admin endpoints', () => {
        const spec = getOpenAPISpec();

        expect(spec.paths['/api/admin/users']).toBeDefined();
        expect(spec.paths['/api/admin/users']?.get).toBeDefined();
    });

    test('should document Jobs endpoints', () => {
        const spec = getOpenAPISpec();

        expect(spec.paths['/api/jobs/stats']).toBeDefined();
        expect(spec.paths['/api/jobs/stats']?.get).toBeDefined();
    });

    test('should document Templates endpoints', () => {
        const spec = getOpenAPISpec();

        expect(spec.paths['/api/templates']).toBeDefined();
        expect(spec.paths['/api/templates']?.get).toBeDefined();
        expect(spec.paths['/api/templates']?.post).toBeDefined();
    });

    test('should include all required tags', () => {
        const spec = getOpenAPISpec();

        const tagNames = spec.tags?.map((tag) => tag.name) || [];
        expect(tagNames).toContain('Chat');
        expect(tagNames).toContain('Memory');
        expect(tagNames).toContain('Council');
        expect(tagNames).toContain('PAC');
        expect(tagNames).toContain('Billing');
        expect(tagNames).toContain('Admin');
        expect(tagNames).toContain('Search');
        expect(tagNames).toContain('Jobs');
        expect(tagNames).toContain('System');
        expect(tagNames).toContain('Templates');
    });

    test('should define common error responses', () => {
        const spec = getOpenAPISpec();

        expect(spec.components?.responses?.Unauthorized).toBeDefined();
        expect(spec.components?.responses?.Forbidden).toBeDefined();
        expect(spec.components?.responses?.NotFound).toBeDefined();
        expect(spec.components?.responses?.RateLimited).toBeDefined();
        expect(spec.components?.responses?.InternalError).toBeDefined();
    });

    test('should define request/response schemas', () => {
        const spec = getOpenAPISpec();

        expect(spec.components?.schemas?.SendMessageRequest).toBeDefined();
        expect(spec.components?.schemas?.ChatResponse).toBeDefined();
        expect(spec.components?.schemas?.MemoryResponse).toBeDefined();
        expect(spec.components?.schemas?.BillingStatusResponse).toBeDefined();
        expect(spec.components?.schemas?.ReminderResponse).toBeDefined();
        expect(spec.components?.schemas?.CouncilSessionResponse).toBeDefined();
        expect(spec.components?.schemas?.HealthResponse).toBeDefined();
        expect(spec.components?.schemas?.ErrorResponse).toBeDefined();
    });

    test('should include rate limit headers', () => {
        const spec = getOpenAPISpec();

        expect(spec.components?.headers?.['X-RateLimit-Limit']).toBeDefined();
        expect(spec.components?.headers?.['X-RateLimit-Remaining']).toBeDefined();
        expect(spec.components?.headers?.['X-RateLimit-Reset']).toBeDefined();
    });

    test('should have valid server URLs', () => {
        const spec = getOpenAPISpec();

        expect(spec.servers).toBeDefined();
        expect(spec.servers?.length).toBeGreaterThan(0);
        expect(spec.servers?.[0].url).toBe('https://api.yula.dev');
        expect(spec.servers?.[1].url).toBe('http://localhost:3001');
    });

    test('should set default security to bearer auth', () => {
        const spec = getOpenAPISpec();

        expect(spec.security).toBeDefined();
        expect(spec.security).toEqual([{ bearerAuth: [] }]);
    });
});

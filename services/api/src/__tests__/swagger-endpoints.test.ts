import { describe, expect, test } from 'vitest';
import app from '../index';

describe('Swagger UI Endpoints', () => {
    test('GET /api/docs/openapi.json should return OpenAPI spec', async () => {
        const res = await app.request('/api/docs/openapi.json');

        expect(res.status).toBe(200);
        expect(res.headers.get('content-type')).toContain('application/json');

        const spec = await res.json();
        expect(spec.openapi).toBe('3.0.3');
        expect(spec.info.title).toBe('YULA OS API');
        expect(spec.paths).toBeDefined();
    });

    test('GET /api/docs/ui should return HTML with Swagger UI', async () => {
        const res = await app.request('/api/docs/ui');

        expect(res.status).toBe(200);
        expect(res.headers.get('content-type')).toContain('text/html');

        const html = await res.text();
        expect(html).toContain('<!DOCTYPE html>');
        expect(html).toContain('YULA OS API Documentation');
        expect(html).toContain('swagger-ui-bundle.js');
        expect(html).toContain('/api/docs/openapi.json');
    });

    test('OpenAPI spec should have dark mode support in UI', async () => {
        const res = await app.request('/api/docs/ui');
        const html = await res.text();

        expect(html).toContain('prefers-color-scheme: dark');
        expect(html).toContain('filter: invert');
    });

    test('Swagger UI should have try-it-out enabled', async () => {
        const res = await app.request('/api/docs/ui');
        const html = await res.text();

        expect(html).toContain('tryItOutEnabled: true');
    });

    test('Swagger UI should persist authorization', async () => {
        const res = await app.request('/api/docs/ui');
        const html = await res.text();

        expect(html).toContain('persistAuthorization: true');
    });

    test('OpenAPI spec should include security schemes', async () => {
        const res = await app.request('/api/docs/openapi.json');
        const spec = await res.json();

        expect(spec.components.securitySchemes.bearerAuth).toBeDefined();
        expect(spec.components.securitySchemes.apiKey).toBeDefined();
    });

    test('OpenAPI spec should document all major endpoint groups', async () => {
        const res = await app.request('/api/docs/openapi.json');
        const spec = await res.json();

        const paths = Object.keys(spec.paths);

        // Check major endpoint groups are documented
        expect(paths.some((p) => p.startsWith('/api/chat'))).toBe(true);
        expect(paths.some((p) => p.startsWith('/api/memory'))).toBe(true);
        expect(paths.some((p) => p.startsWith('/api/council'))).toBe(true);
        expect(paths.some((p) => p.startsWith('/api/pac'))).toBe(true);
        expect(paths.some((p) => p.startsWith('/api/billing'))).toBe(true);
        expect(paths.some((p) => p.startsWith('/api/admin'))).toBe(true);
        expect(paths.some((p) => p.startsWith('/api/search'))).toBe(true);
        expect(paths.some((p) => p.startsWith('/api/jobs'))).toBe(true);
        expect(paths.some((p) => p.startsWith('/api/templates'))).toBe(true);
        expect(paths.some((p) => p.startsWith('/metrics'))).toBe(true);
    });

    test('Swagger UI should include syntax highlighting', async () => {
        const res = await app.request('/api/docs/ui');
        const html = await res.text();

        expect(html).toContain('syntaxHighlight');
        expect(html).toContain('monokai');
    });

    test('Swagger UI should have filter enabled', async () => {
        const res = await app.request('/api/docs/ui');
        const html = await res.text();

        expect(html).toContain('filter: true');
    });
});

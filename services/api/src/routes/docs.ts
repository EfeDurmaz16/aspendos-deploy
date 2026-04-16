/**
 * API documentation routes - /api/docs/*
 */
import { Hono } from 'hono';
import { getOpenAPISpec } from '../lib/openapi-spec';

const docsRoutes = new Hono();

// GET /openapi.json - OpenAPI JSON spec
docsRoutes.get('/openapi.json', (c) => {
    return c.json(getOpenAPISpec());
});

// GET /ui - Swagger UI
docsRoutes.get('/ui', (c) => {
    const nonce = c.get('cspNonce') as string;
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Yula API Documentation</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@latest/swagger-ui.css" />
    <style>
        body { margin: 0; padding: 0; }
        .swagger-ui .topbar { display: none; }
        .swagger-ui .info { margin: 20px 0; }
        @media (prefers-color-scheme: dark) {
            body { background: #1a1a1a; }
            .swagger-ui { filter: invert(88%) hue-rotate(180deg); }
            .swagger-ui img { filter: invert(100%) hue-rotate(180deg); }
        }
    </style>
</head>
<body>
    <div id="swagger-ui"></div>
    <script nonce="${nonce}" src="https://unpkg.com/swagger-ui-dist@latest/swagger-ui-bundle.js"></script>
    <script nonce="${nonce}" src="https://unpkg.com/swagger-ui-dist@latest/swagger-ui-standalone-preset.js"></script>
    <script nonce="${nonce}">
        window.onload = function() {
            SwaggerUIBundle({
                url: '/api/docs/openapi.json',
                dom_id: '#swagger-ui',
                deepLinking: true,
                presets: [
                    SwaggerUIBundle.presets.apis,
                    SwaggerUIStandalonePreset
                ],
                plugins: [
                    SwaggerUIBundle.plugins.DownloadUrl
                ],
                layout: 'StandaloneLayout',
                tryItOutEnabled: true,
                persistAuthorization: true,
                displayRequestDuration: true,
                filter: true,
                syntaxHighlight: {
                    activate: true,
                    theme: 'monokai'
                }
            });
        };
    </script>
</body>
</html>`;
    return c.html(html);
});

// GET / - API documentation index
docsRoutes.get('/', (c) => {
    return c.json({
        name: 'Yula API',
        version: '1.0.0',
        endpoints: [
            { method: 'GET', path: '/api/chat', description: 'List chats', auth: true },
            { method: 'POST', path: '/api/chat', description: 'Create chat', auth: true },
            { method: 'GET', path: '/api/chat/:id', description: 'Get chat details', auth: true },
            { method: 'PATCH', path: '/api/chat/:id', description: 'Update chat', auth: true },
            { method: 'DELETE', path: '/api/chat/:id', description: 'Delete chat', auth: true },
            {
                method: 'POST',
                path: '/api/chat/:id/message',
                description: 'Send message',
                auth: true,
            },
            {
                method: 'POST',
                path: '/api/chat/:id/multi',
                description: 'Multi-model comparison',
                auth: true,
            },
            { method: 'POST', path: '/api/chat/:id/fork', description: 'Fork chat', auth: true },
            {
                method: 'POST',
                path: '/api/chat/:id/share',
                description: 'Create share token',
                auth: true,
            },
            {
                method: 'DELETE',
                path: '/api/chat/:id/share',
                description: 'Revoke share token',
                auth: true,
            },
            {
                method: 'POST',
                path: '/api/chat/message/:messageId/feedback',
                description: 'Add message feedback',
                auth: true,
            },
            { method: 'GET', path: '/api/memory', description: 'Search memories', auth: true },
            { method: 'POST', path: '/api/memory', description: 'Add memory', auth: true },
            {
                method: 'POST',
                path: '/api/memory/search',
                description: 'Semantic search',
                auth: true,
            },
            {
                method: 'POST',
                path: '/api/memory/reinforce/:id',
                description: 'Reinforce memory',
                auth: true,
            },
            { method: 'DELETE', path: '/api/memory/:id', description: 'Delete memory', auth: true },
            {
                method: 'GET',
                path: '/api/memory/dashboard/stats',
                description: 'Memory statistics',
                auth: true,
            },
            {
                method: 'GET',
                path: '/api/memory/dashboard/list',
                description: 'List memories (paginated)',
                auth: true,
            },
            {
                method: 'PATCH',
                path: '/api/memory/dashboard/:id',
                description: 'Update memory',
                auth: true,
            },
            {
                method: 'DELETE',
                path: '/api/memory/dashboard/:id',
                description: 'Delete memory',
                auth: true,
            },
            {
                method: 'POST',
                path: '/api/memory/dashboard/bulk-delete',
                description: 'Bulk delete memories',
                auth: true,
            },
            {
                method: 'POST',
                path: '/api/memory/consolidate',
                description: 'Consolidate memories',
                auth: true,
            },
            {
                method: 'POST',
                path: '/api/council/sessions',
                description: 'Create council session',
                auth: true,
            },
            {
                method: 'GET',
                path: '/api/council/sessions',
                description: 'List council sessions',
                auth: true,
            },
            {
                method: 'GET',
                path: '/api/council/sessions/:id',
                description: 'Get session details',
                auth: true,
            },
            {
                method: 'GET',
                path: '/api/council/sessions/:id/stream',
                description: 'Stream council responses',
                auth: true,
            },
            {
                method: 'POST',
                path: '/api/council/sessions/:id/select',
                description: 'Select preferred response',
                auth: true,
            },
            {
                method: 'POST',
                path: '/api/council/sessions/:id/synthesize',
                description: 'Generate synthesis',
                auth: true,
            },
            {
                method: 'GET',
                path: '/api/council/personas',
                description: 'Get available personas',
                auth: true,
            },
            {
                method: 'GET',
                path: '/api/council/stats',
                description: 'Council statistics',
                auth: true,
            },
            {
                method: 'POST',
                path: '/api/pac/detect',
                description: 'Detect commitments',
                auth: true,
            },
            { method: 'GET', path: '/api/pac/reminders', description: 'Get reminders', auth: true },
            {
                method: 'PATCH',
                path: '/api/pac/reminders/:id/complete',
                description: 'Complete reminder',
                auth: true,
            },
            {
                method: 'PATCH',
                path: '/api/pac/reminders/:id/dismiss',
                description: 'Dismiss reminder',
                auth: true,
            },
            {
                method: 'PATCH',
                path: '/api/pac/reminders/:id/snooze',
                description: 'Snooze reminder',
                auth: true,
            },
            {
                method: 'GET',
                path: '/api/pac/settings',
                description: 'Get PAC settings',
                auth: true,
            },
            {
                method: 'PATCH',
                path: '/api/pac/settings',
                description: 'Update PAC settings',
                auth: true,
            },
            { method: 'GET', path: '/api/pac/stats', description: 'PAC statistics', auth: true },
            { method: 'GET', path: '/api/billing', description: 'Billing status', auth: true },
            {
                method: 'POST',
                path: '/api/billing/sync',
                description: 'Sync with Polar',
                auth: true,
            },
            { method: 'GET', path: '/api/billing/usage', description: 'Usage history', auth: true },
            {
                method: 'GET',
                path: '/api/billing/tiers',
                description: 'Tier comparison',
                auth: true,
            },
            {
                method: 'POST',
                path: '/api/billing/checkout',
                description: 'Create checkout',
                auth: true,
            },
            {
                method: 'POST',
                path: '/api/billing/cancel',
                description: 'Cancel subscription',
                auth: true,
            },
            {
                method: 'GET',
                path: '/api/billing/portal',
                description: 'Customer portal URL',
                auth: true,
            },
            {
                method: 'GET',
                path: '/api/billing/cost-ceiling',
                description: 'Cost ceiling status',
                auth: true,
            },
            {
                method: 'GET',
                path: '/api/billing/cost-summary',
                description: 'Cost summary',
                auth: true,
            },
            {
                method: 'POST',
                path: '/api/billing/webhook',
                description: 'Polar webhook',
                auth: false,
            },
            {
                method: 'POST',
                path: '/api/import/jobs',
                description: 'Create import job',
                auth: true,
            },
            {
                method: 'GET',
                path: '/api/import/jobs',
                description: 'List import jobs',
                auth: true,
            },
            {
                method: 'GET',
                path: '/api/import/jobs/:id',
                description: 'Get import job',
                auth: true,
            },
            {
                method: 'POST',
                path: '/api/import/jobs/:id/execute',
                description: 'Execute import',
                auth: true,
            },
            {
                method: 'GET',
                path: '/api/import/stats',
                description: 'Import statistics',
                auth: true,
            },
            { method: 'GET', path: '/health', description: 'Health check', auth: false },
            { method: 'GET', path: '/api/models', description: 'List models', auth: false },
            {
                method: 'GET',
                path: '/api/models/tier/:tier',
                description: 'Models for tier',
                auth: false,
            },
            { method: 'GET', path: '/api/docs', description: 'API documentation', auth: false },
            { method: 'DELETE', path: '/api/account', description: 'Delete account', auth: true },
            { method: 'GET', path: '/api/export', description: 'Export user data', auth: true },
        ],
    });
});

export default docsRoutes;

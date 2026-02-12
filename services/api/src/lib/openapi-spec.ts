import type { OpenAPIV3 } from 'openapi-types';

export function getOpenAPISpec(): OpenAPIV3.Document {
    return {
        openapi: '3.0.3',
        info: {
            title: 'YULA OS API',
            version: '1.0.0',
            description:
                'Your Universal Learning Assistant - AI Chat Platform with intelligent memory, agentic RAG, and proactive scheduling',
            contact: {
                name: 'YULA Support',
                url: 'https://yula.dev',
            },
            license: {
                name: 'Proprietary',
            },
        },
        servers: [
            {
                url: 'https://api.yula.dev',
                description: 'Production',
            },
            {
                url: 'http://localhost:3001',
                description: 'Development',
            },
        ],
        security: [
            {
                bearerAuth: [],
            },
        ],
        tags: [
            {
                name: 'Chat',
                description: 'Conversational AI endpoints',
            },
            {
                name: 'Memory',
                description: 'Persistent memory and semantic search',
            },
            {
                name: 'Billing',
                description: 'Subscription and payment management',
            },
            {
                name: 'PAC',
                description: 'Proactive AI Callbacks - scheduled reminders',
            },
            {
                name: 'Council',
                description: 'Multi-model parallel querying',
            },
            {
                name: 'Account',
                description: 'User account management',
            },
            {
                name: 'Health',
                description: 'System health monitoring',
            },
            {
                name: 'Admin',
                description: 'Administrative operations',
            },
            {
                name: 'Search',
                description: 'Global search across conversations and memories',
            },
            {
                name: 'Jobs',
                description: 'Background job management',
            },
            {
                name: 'System',
                description: 'System information and metrics',
            },
            {
                name: 'Templates',
                description: 'Prompt template management',
            },
        ],
        paths: {
            '/api/chat': {
                post: {
                    tags: ['Chat'],
                    summary: 'Send message',
                    description: 'Send a message to the AI and receive a streaming response',
                    operationId: 'sendMessage',
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: '#/components/schemas/SendMessageRequest',
                                },
                            },
                        },
                    },
                    responses: {
                        '200': {
                            description: 'Streaming response',
                            headers: {
                                'Content-Type': {
                                    schema: {
                                        type: 'string',
                                        example: 'text/event-stream',
                                    },
                                },
                                'X-RateLimit-Limit': {
                                    $ref: '#/components/headers/X-RateLimit-Limit',
                                },
                                'X-RateLimit-Remaining': {
                                    $ref: '#/components/headers/X-RateLimit-Remaining',
                                },
                                'X-RateLimit-Reset': {
                                    $ref: '#/components/headers/X-RateLimit-Reset',
                                },
                            },
                            content: {
                                'text/event-stream': {
                                    schema: {
                                        type: 'string',
                                        description: 'Server-sent events stream',
                                    },
                                },
                            },
                        },
                        '401': {
                            $ref: '#/components/responses/Unauthorized',
                        },
                        '403': {
                            $ref: '#/components/responses/Forbidden',
                        },
                        '429': {
                            $ref: '#/components/responses/RateLimited',
                        },
                        '500': {
                            $ref: '#/components/responses/InternalError',
                        },
                    },
                },
                get: {
                    tags: ['Chat'],
                    summary: 'List chats',
                    description: 'Retrieve all chat sessions for the authenticated user',
                    operationId: 'listChats',
                    parameters: [
                        {
                            name: 'limit',
                            in: 'query',
                            description: 'Maximum number of chats to return',
                            schema: {
                                type: 'integer',
                                default: 50,
                                minimum: 1,
                                maximum: 100,
                            },
                        },
                        {
                            name: 'offset',
                            in: 'query',
                            description: 'Number of chats to skip',
                            schema: {
                                type: 'integer',
                                default: 0,
                                minimum: 0,
                            },
                        },
                    ],
                    responses: {
                        '200': {
                            description: 'List of chats',
                            headers: {
                                'X-RateLimit-Limit': {
                                    $ref: '#/components/headers/X-RateLimit-Limit',
                                },
                                'X-RateLimit-Remaining': {
                                    $ref: '#/components/headers/X-RateLimit-Remaining',
                                },
                                'X-RateLimit-Reset': {
                                    $ref: '#/components/headers/X-RateLimit-Reset',
                                },
                            },
                            content: {
                                'application/json': {
                                    schema: {
                                        $ref: '#/components/schemas/ChatListResponse',
                                    },
                                },
                            },
                        },
                        '401': {
                            $ref: '#/components/responses/Unauthorized',
                        },
                        '429': {
                            $ref: '#/components/responses/RateLimited',
                        },
                        '500': {
                            $ref: '#/components/responses/InternalError',
                        },
                    },
                },
            },
            '/api/chat/{id}': {
                get: {
                    tags: ['Chat'],
                    summary: 'Get chat',
                    description: 'Retrieve a specific chat with its messages',
                    operationId: 'getChat',
                    parameters: [
                        {
                            name: 'id',
                            in: 'path',
                            required: true,
                            description: 'Chat ID',
                            schema: {
                                type: 'string',
                            },
                        },
                    ],
                    responses: {
                        '200': {
                            description: 'Chat details',
                            content: {
                                'application/json': {
                                    schema: {
                                        $ref: '#/components/schemas/ChatResponse',
                                    },
                                },
                            },
                        },
                        '401': {
                            $ref: '#/components/responses/Unauthorized',
                        },
                        '404': {
                            $ref: '#/components/responses/NotFound',
                        },
                        '429': {
                            $ref: '#/components/responses/RateLimited',
                        },
                        '500': {
                            $ref: '#/components/responses/InternalError',
                        },
                    },
                },
                patch: {
                    tags: ['Chat'],
                    summary: 'Update chat',
                    description: 'Update chat title or model preference',
                    operationId: 'updateChat',
                    parameters: [
                        {
                            name: 'id',
                            in: 'path',
                            required: true,
                            description: 'Chat ID',
                            schema: {
                                type: 'string',
                            },
                        },
                    ],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: '#/components/schemas/UpdateChatRequest',
                                },
                            },
                        },
                    },
                    responses: {
                        '200': {
                            description: 'Chat updated',
                            content: {
                                'application/json': {
                                    schema: {
                                        $ref: '#/components/schemas/ChatResponse',
                                    },
                                },
                            },
                        },
                        '401': {
                            $ref: '#/components/responses/Unauthorized',
                        },
                        '404': {
                            $ref: '#/components/responses/NotFound',
                        },
                        '429': {
                            $ref: '#/components/responses/RateLimited',
                        },
                        '500': {
                            $ref: '#/components/responses/InternalError',
                        },
                    },
                },
                delete: {
                    tags: ['Chat'],
                    summary: 'Delete chat',
                    description: 'Permanently delete a chat and all its messages',
                    operationId: 'deleteChat',
                    parameters: [
                        {
                            name: 'id',
                            in: 'path',
                            required: true,
                            description: 'Chat ID',
                            schema: {
                                type: 'string',
                            },
                        },
                    ],
                    responses: {
                        '204': {
                            description: 'Chat deleted',
                        },
                        '401': {
                            $ref: '#/components/responses/Unauthorized',
                        },
                        '404': {
                            $ref: '#/components/responses/NotFound',
                        },
                        '429': {
                            $ref: '#/components/responses/RateLimited',
                        },
                        '500': {
                            $ref: '#/components/responses/InternalError',
                        },
                    },
                },
            },
            '/api/memory': {
                get: {
                    tags: ['Memory'],
                    summary: 'List memories',
                    description: 'Retrieve all memories for the authenticated user',
                    operationId: 'listMemories',
                    parameters: [
                        {
                            name: 'limit',
                            in: 'query',
                            description: 'Maximum number of memories to return',
                            schema: {
                                type: 'integer',
                                default: 50,
                                minimum: 1,
                                maximum: 100,
                            },
                        },
                        {
                            name: 'offset',
                            in: 'query',
                            description: 'Number of memories to skip',
                            schema: {
                                type: 'integer',
                                default: 0,
                                minimum: 0,
                            },
                        },
                    ],
                    responses: {
                        '200': {
                            description: 'List of memories',
                            content: {
                                'application/json': {
                                    schema: {
                                        $ref: '#/components/schemas/MemoryListResponse',
                                    },
                                },
                            },
                        },
                        '401': {
                            $ref: '#/components/responses/Unauthorized',
                        },
                        '429': {
                            $ref: '#/components/responses/RateLimited',
                        },
                        '500': {
                            $ref: '#/components/responses/InternalError',
                        },
                    },
                },
                post: {
                    tags: ['Memory'],
                    summary: 'Create memory',
                    description: 'Store a new memory with semantic embedding',
                    operationId: 'createMemory',
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: '#/components/schemas/CreateMemoryRequest',
                                },
                            },
                        },
                    },
                    responses: {
                        '201': {
                            description: 'Memory created',
                            content: {
                                'application/json': {
                                    schema: {
                                        $ref: '#/components/schemas/MemoryResponse',
                                    },
                                },
                            },
                        },
                        '401': {
                            $ref: '#/components/responses/Unauthorized',
                        },
                        '429': {
                            $ref: '#/components/responses/RateLimited',
                        },
                        '500': {
                            $ref: '#/components/responses/InternalError',
                        },
                    },
                },
            },
            '/api/memory/search': {
                post: {
                    tags: ['Memory'],
                    summary: 'Search memories',
                    description: 'Perform semantic search across user memories',
                    operationId: 'searchMemories',
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: '#/components/schemas/SearchMemoryRequest',
                                },
                            },
                        },
                    },
                    responses: {
                        '200': {
                            description: 'Search results',
                            content: {
                                'application/json': {
                                    schema: {
                                        $ref: '#/components/schemas/MemorySearchResponse',
                                    },
                                },
                            },
                        },
                        '401': {
                            $ref: '#/components/responses/Unauthorized',
                        },
                        '429': {
                            $ref: '#/components/responses/RateLimited',
                        },
                        '500': {
                            $ref: '#/components/responses/InternalError',
                        },
                    },
                },
            },
            '/api/memory/export': {
                get: {
                    tags: ['Memory'],
                    summary: 'Export memories',
                    description: 'Export all user memories (GDPR compliance)',
                    operationId: 'exportMemories',
                    responses: {
                        '200': {
                            description: 'Memory export',
                            content: {
                                'application/json': {
                                    schema: {
                                        $ref: '#/components/schemas/MemoryExportResponse',
                                    },
                                },
                            },
                        },
                        '401': {
                            $ref: '#/components/responses/Unauthorized',
                        },
                        '429': {
                            $ref: '#/components/responses/RateLimited',
                        },
                        '500': {
                            $ref: '#/components/responses/InternalError',
                        },
                    },
                },
            },
            '/api/billing': {
                get: {
                    tags: ['Billing'],
                    summary: 'Get billing status',
                    description: 'Retrieve current subscription and usage information',
                    operationId: 'getBillingStatus',
                    responses: {
                        '200': {
                            description: 'Billing status',
                            content: {
                                'application/json': {
                                    schema: {
                                        $ref: '#/components/schemas/BillingStatusResponse',
                                    },
                                },
                            },
                        },
                        '401': {
                            $ref: '#/components/responses/Unauthorized',
                        },
                        '429': {
                            $ref: '#/components/responses/RateLimited',
                        },
                        '500': {
                            $ref: '#/components/responses/InternalError',
                        },
                    },
                },
            },
            '/api/billing/checkout': {
                post: {
                    tags: ['Billing'],
                    summary: 'Create checkout session',
                    description: 'Initialize a billing checkout session',
                    operationId: 'createCheckout',
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: '#/components/schemas/CreateCheckoutRequest',
                                },
                            },
                        },
                    },
                    responses: {
                        '200': {
                            description: 'Checkout session created',
                            content: {
                                'application/json': {
                                    schema: {
                                        $ref: '#/components/schemas/CheckoutResponse',
                                    },
                                },
                            },
                        },
                        '401': {
                            $ref: '#/components/responses/Unauthorized',
                        },
                        '429': {
                            $ref: '#/components/responses/RateLimited',
                        },
                        '500': {
                            $ref: '#/components/responses/InternalError',
                        },
                    },
                },
            },
            '/api/pac': {
                get: {
                    tags: ['PAC'],
                    summary: 'List reminders',
                    description: 'Retrieve all scheduled PAC reminders',
                    operationId: 'listReminders',
                    parameters: [
                        {
                            name: 'status',
                            in: 'query',
                            description: 'Filter by reminder status',
                            schema: {
                                type: 'string',
                                enum: ['pending', 'sent', 'cancelled'],
                            },
                        },
                    ],
                    responses: {
                        '200': {
                            description: 'List of reminders',
                            content: {
                                'application/json': {
                                    schema: {
                                        $ref: '#/components/schemas/ReminderListResponse',
                                    },
                                },
                            },
                        },
                        '401': {
                            $ref: '#/components/responses/Unauthorized',
                        },
                        '429': {
                            $ref: '#/components/responses/RateLimited',
                        },
                        '500': {
                            $ref: '#/components/responses/InternalError',
                        },
                    },
                },
                post: {
                    tags: ['PAC'],
                    summary: 'Create reminder',
                    description: 'Schedule a new proactive AI callback',
                    operationId: 'createReminder',
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: '#/components/schemas/CreateReminderRequest',
                                },
                            },
                        },
                    },
                    responses: {
                        '201': {
                            description: 'Reminder created',
                            content: {
                                'application/json': {
                                    schema: {
                                        $ref: '#/components/schemas/ReminderResponse',
                                    },
                                },
                            },
                        },
                        '401': {
                            $ref: '#/components/responses/Unauthorized',
                        },
                        '403': {
                            $ref: '#/components/responses/Forbidden',
                        },
                        '429': {
                            $ref: '#/components/responses/RateLimited',
                        },
                        '500': {
                            $ref: '#/components/responses/InternalError',
                        },
                    },
                },
            },
            '/api/pac/{id}': {
                delete: {
                    tags: ['PAC'],
                    summary: 'Delete reminder',
                    description: 'Cancel a scheduled PAC reminder',
                    operationId: 'deleteReminder',
                    parameters: [
                        {
                            name: 'id',
                            in: 'path',
                            required: true,
                            description: 'Reminder ID',
                            schema: {
                                type: 'string',
                            },
                        },
                    ],
                    responses: {
                        '204': {
                            description: 'Reminder deleted',
                        },
                        '401': {
                            $ref: '#/components/responses/Unauthorized',
                        },
                        '404': {
                            $ref: '#/components/responses/NotFound',
                        },
                        '429': {
                            $ref: '#/components/responses/RateLimited',
                        },
                        '500': {
                            $ref: '#/components/responses/InternalError',
                        },
                    },
                },
            },
            '/api/council': {
                post: {
                    tags: ['Council'],
                    summary: 'Create council session',
                    description: 'Query multiple AI models in parallel',
                    operationId: 'createCouncilSession',
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: '#/components/schemas/CreateCouncilRequest',
                                },
                            },
                        },
                    },
                    responses: {
                        '200': {
                            description: 'Council session created',
                            content: {
                                'application/json': {
                                    schema: {
                                        $ref: '#/components/schemas/CouncilSessionResponse',
                                    },
                                },
                            },
                        },
                        '401': {
                            $ref: '#/components/responses/Unauthorized',
                        },
                        '403': {
                            $ref: '#/components/responses/Forbidden',
                        },
                        '429': {
                            $ref: '#/components/responses/RateLimited',
                        },
                        '500': {
                            $ref: '#/components/responses/InternalError',
                        },
                    },
                },
            },
            '/api/council/{id}': {
                get: {
                    tags: ['Council'],
                    summary: 'Get council session',
                    description: 'Retrieve results from a council session',
                    operationId: 'getCouncilSession',
                    parameters: [
                        {
                            name: 'id',
                            in: 'path',
                            required: true,
                            description: 'Council session ID',
                            schema: {
                                type: 'string',
                            },
                        },
                    ],
                    responses: {
                        '200': {
                            description: 'Council session details',
                            content: {
                                'application/json': {
                                    schema: {
                                        $ref: '#/components/schemas/CouncilSessionResponse',
                                    },
                                },
                            },
                        },
                        '401': {
                            $ref: '#/components/responses/Unauthorized',
                        },
                        '404': {
                            $ref: '#/components/responses/NotFound',
                        },
                        '429': {
                            $ref: '#/components/responses/RateLimited',
                        },
                        '500': {
                            $ref: '#/components/responses/InternalError',
                        },
                    },
                },
            },
            '/api/account': {
                delete: {
                    tags: ['Account'],
                    summary: 'Delete account',
                    description: 'Permanently delete user account and all data (GDPR compliance)',
                    operationId: 'deleteAccount',
                    responses: {
                        '204': {
                            description: 'Account deleted',
                        },
                        '401': {
                            $ref: '#/components/responses/Unauthorized',
                        },
                        '429': {
                            $ref: '#/components/responses/RateLimited',
                        },
                        '500': {
                            $ref: '#/components/responses/InternalError',
                        },
                    },
                },
            },
            '/api/health': {
                get: {
                    tags: ['Health'],
                    summary: 'Health check',
                    description: 'System health status',
                    operationId: 'healthCheck',
                    security: [],
                    responses: {
                        '200': {
                            description: 'System healthy',
                            content: {
                                'application/json': {
                                    schema: {
                                        $ref: '#/components/schemas/HealthResponse',
                                    },
                                },
                            },
                        },
                        '503': {
                            description: 'System unhealthy',
                            content: {
                                'application/json': {
                                    schema: {
                                        $ref: '#/components/schemas/HealthResponse',
                                    },
                                },
                            },
                        },
                    },
                },
            },
            '/api/search': {
                post: {
                    tags: ['Search'],
                    summary: 'Global search',
                    description: 'Search across chats, memories, and messages',
                    operationId: 'globalSearch',
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['query'],
                                    properties: {
                                        query: {
                                            type: 'string',
                                            description: 'Search query',
                                            example: 'project deadline',
                                        },
                                        scope: {
                                            type: 'array',
                                            items: {
                                                type: 'string',
                                                enum: ['chats', 'memories', 'messages'],
                                            },
                                            description: 'Search scope',
                                        },
                                        limit: {
                                            type: 'integer',
                                            default: 20,
                                            minimum: 1,
                                            maximum: 100,
                                        },
                                    },
                                },
                            },
                        },
                    },
                    responses: {
                        '200': {
                            description: 'Search results',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            results: {
                                                type: 'array',
                                                items: {
                                                    type: 'object',
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                        '401': {
                            $ref: '#/components/responses/Unauthorized',
                        },
                    },
                },
            },
            '/api/admin/users': {
                get: {
                    tags: ['Admin'],
                    summary: 'List users',
                    description: 'List all users (admin only)',
                    operationId: 'listUsers',
                    security: [{ bearerAuth: [] }],
                    responses: {
                        '200': {
                            description: 'User list',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            users: {
                                                type: 'array',
                                                items: {
                                                    type: 'object',
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                        '401': {
                            $ref: '#/components/responses/Unauthorized',
                        },
                        '403': {
                            $ref: '#/components/responses/Forbidden',
                        },
                    },
                },
            },
            '/api/jobs/stats': {
                get: {
                    tags: ['Jobs'],
                    summary: 'Job queue statistics',
                    description: 'Get statistics for background job queues',
                    operationId: 'getJobStats',
                    parameters: [
                        {
                            name: 'queue',
                            in: 'query',
                            description: 'Specific queue name',
                            schema: {
                                type: 'string',
                            },
                        },
                    ],
                    responses: {
                        '200': {
                            description: 'Job statistics',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            stats: {
                                                type: 'object',
                                            },
                                            deadLetterQueue: {
                                                type: 'integer',
                                            },
                                        },
                                    },
                                },
                            },
                        },
                        '401': {
                            $ref: '#/components/responses/Unauthorized',
                        },
                    },
                },
            },
            '/metrics': {
                get: {
                    tags: ['System'],
                    summary: 'Prometheus metrics',
                    description: 'Prometheus-compatible metrics endpoint',
                    operationId: 'getMetrics',
                    security: [],
                    responses: {
                        '200': {
                            description: 'Metrics in Prometheus format',
                            content: {
                                'text/plain': {
                                    schema: {
                                        type: 'string',
                                    },
                                },
                            },
                        },
                    },
                },
            },
            '/api/templates': {
                get: {
                    tags: ['Templates'],
                    summary: 'List prompt templates',
                    description: 'Get available prompt templates',
                    operationId: 'listTemplates',
                    responses: {
                        '200': {
                            description: 'Template list',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            templates: {
                                                type: 'array',
                                                items: {
                                                    type: 'object',
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                        '401': {
                            $ref: '#/components/responses/Unauthorized',
                        },
                    },
                },
                post: {
                    tags: ['Templates'],
                    summary: 'Create template',
                    description: 'Create a new prompt template',
                    operationId: 'createTemplate',
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['name', 'content'],
                                    properties: {
                                        name: {
                                            type: 'string',
                                        },
                                        content: {
                                            type: 'string',
                                        },
                                    },
                                },
                            },
                        },
                    },
                    responses: {
                        '201': {
                            description: 'Template created',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                    },
                                },
                            },
                        },
                        '401': {
                            $ref: '#/components/responses/Unauthorized',
                        },
                    },
                },
            },
        },
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                    description: 'JWT token from Better Auth',
                },
                apiKey: {
                    type: 'apiKey',
                    in: 'header',
                    name: 'X-API-Key',
                    description: 'API key for programmatic access',
                },
            },
            headers: {
                'X-RateLimit-Limit': {
                    description: 'Request limit per window',
                    schema: {
                        type: 'integer',
                        example: 100,
                    },
                },
                'X-RateLimit-Remaining': {
                    description: 'Remaining requests in current window',
                    schema: {
                        type: 'integer',
                        example: 95,
                    },
                },
                'X-RateLimit-Reset': {
                    description: 'Unix timestamp when the window resets',
                    schema: {
                        type: 'integer',
                        example: 1640995200,
                    },
                },
            },
            schemas: {
                SendMessageRequest: {
                    type: 'object',
                    required: ['content'],
                    properties: {
                        chatId: {
                            type: 'string',
                            description: 'Chat session ID. Omit to create a new chat.',
                            example: 'chat_12345',
                        },
                        content: {
                            type: 'string',
                            description: 'User message content',
                            example: 'What is the capital of France?',
                        },
                        model: {
                            type: 'string',
                            description: 'AI model to use',
                            enum: ['gpt-4', 'claude-3-opus', 'llama-3-70b'],
                            example: 'gpt-4',
                        },
                    },
                },
                ChatListResponse: {
                    type: 'object',
                    properties: {
                        chats: {
                            type: 'array',
                            items: {
                                $ref: '#/components/schemas/Chat',
                            },
                        },
                        total: {
                            type: 'integer',
                            example: 42,
                        },
                    },
                },
                Chat: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'string',
                            example: 'chat_12345',
                        },
                        title: {
                            type: 'string',
                            example: 'Geography Discussion',
                        },
                        model: {
                            type: 'string',
                            example: 'gpt-4',
                        },
                        createdAt: {
                            type: 'string',
                            format: 'date-time',
                            example: '2024-01-15T10:30:00Z',
                        },
                        updatedAt: {
                            type: 'string',
                            format: 'date-time',
                            example: '2024-01-15T10:35:00Z',
                        },
                    },
                },
                ChatResponse: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'string',
                            example: 'chat_12345',
                        },
                        title: {
                            type: 'string',
                            example: 'Geography Discussion',
                        },
                        model: {
                            type: 'string',
                            example: 'gpt-4',
                        },
                        messages: {
                            type: 'array',
                            items: {
                                $ref: '#/components/schemas/Message',
                            },
                        },
                        createdAt: {
                            type: 'string',
                            format: 'date-time',
                            example: '2024-01-15T10:30:00Z',
                        },
                        updatedAt: {
                            type: 'string',
                            format: 'date-time',
                            example: '2024-01-15T10:35:00Z',
                        },
                    },
                },
                Message: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'string',
                            example: 'msg_67890',
                        },
                        role: {
                            type: 'string',
                            enum: ['user', 'assistant'],
                            example: 'user',
                        },
                        content: {
                            type: 'string',
                            example: 'What is the capital of France?',
                        },
                        createdAt: {
                            type: 'string',
                            format: 'date-time',
                            example: '2024-01-15T10:30:00Z',
                        },
                    },
                },
                UpdateChatRequest: {
                    type: 'object',
                    properties: {
                        title: {
                            type: 'string',
                            example: 'Updated Title',
                        },
                        model: {
                            type: 'string',
                            example: 'claude-3-opus',
                        },
                    },
                },
                CreateMemoryRequest: {
                    type: 'object',
                    required: ['content'],
                    properties: {
                        content: {
                            type: 'string',
                            description: 'Memory content',
                            example: 'User prefers dark mode',
                        },
                        metadata: {
                            type: 'object',
                            additionalProperties: true,
                            description: 'Optional metadata',
                            example: { category: 'preferences' },
                        },
                    },
                },
                MemoryResponse: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'string',
                            example: 'mem_12345',
                        },
                        content: {
                            type: 'string',
                            example: 'User prefers dark mode',
                        },
                        metadata: {
                            type: 'object',
                            additionalProperties: true,
                        },
                        createdAt: {
                            type: 'string',
                            format: 'date-time',
                            example: '2024-01-15T10:30:00Z',
                        },
                    },
                },
                MemoryListResponse: {
                    type: 'object',
                    properties: {
                        memories: {
                            type: 'array',
                            items: {
                                $ref: '#/components/schemas/MemoryResponse',
                            },
                        },
                        total: {
                            type: 'integer',
                            example: 25,
                        },
                    },
                },
                SearchMemoryRequest: {
                    type: 'object',
                    required: ['query'],
                    properties: {
                        query: {
                            type: 'string',
                            description: 'Search query',
                            example: 'user preferences',
                        },
                        limit: {
                            type: 'integer',
                            description: 'Maximum results',
                            default: 10,
                            minimum: 1,
                            maximum: 50,
                        },
                    },
                },
                MemorySearchResponse: {
                    type: 'object',
                    properties: {
                        results: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    memory: {
                                        $ref: '#/components/schemas/MemoryResponse',
                                    },
                                    score: {
                                        type: 'number',
                                        description: 'Relevance score',
                                        example: 0.95,
                                    },
                                },
                            },
                        },
                    },
                },
                MemoryExportResponse: {
                    type: 'object',
                    properties: {
                        memories: {
                            type: 'array',
                            items: {
                                $ref: '#/components/schemas/MemoryResponse',
                            },
                        },
                        exportedAt: {
                            type: 'string',
                            format: 'date-time',
                            example: '2024-01-15T10:30:00Z',
                        },
                    },
                },
                BillingStatusResponse: {
                    type: 'object',
                    properties: {
                        tier: {
                            type: 'string',
                            enum: ['free', 'pro', 'enterprise'],
                            example: 'pro',
                        },
                        subscriptionStatus: {
                            type: 'string',
                            enum: ['active', 'cancelled', 'expired'],
                            example: 'active',
                        },
                        usage: {
                            type: 'object',
                            properties: {
                                messagesUsed: {
                                    type: 'integer',
                                    example: 450,
                                },
                                messagesLimit: {
                                    type: 'integer',
                                    example: 1000,
                                },
                                periodStart: {
                                    type: 'string',
                                    format: 'date-time',
                                    example: '2024-01-01T00:00:00Z',
                                },
                                periodEnd: {
                                    type: 'string',
                                    format: 'date-time',
                                    example: '2024-02-01T00:00:00Z',
                                },
                            },
                        },
                    },
                },
                CreateCheckoutRequest: {
                    type: 'object',
                    required: ['tier'],
                    properties: {
                        tier: {
                            type: 'string',
                            enum: ['pro', 'enterprise'],
                            example: 'pro',
                        },
                        successUrl: {
                            type: 'string',
                            format: 'uri',
                            example: 'https://yula.dev/billing/success',
                        },
                        cancelUrl: {
                            type: 'string',
                            format: 'uri',
                            example: 'https://yula.dev/billing',
                        },
                    },
                },
                CheckoutResponse: {
                    type: 'object',
                    properties: {
                        checkoutUrl: {
                            type: 'string',
                            format: 'uri',
                            example: 'https://checkout.polar.sh/session_xyz',
                        },
                        sessionId: {
                            type: 'string',
                            example: 'session_xyz',
                        },
                    },
                },
                CreateReminderRequest: {
                    type: 'object',
                    required: ['scheduledFor', 'message'],
                    properties: {
                        scheduledFor: {
                            type: 'string',
                            format: 'date-time',
                            description: 'When to send the reminder',
                            example: '2024-01-20T14:00:00Z',
                        },
                        message: {
                            type: 'string',
                            description: 'Reminder message',
                            example: 'Check project status',
                        },
                        context: {
                            type: 'object',
                            additionalProperties: true,
                            description: 'Additional context',
                        },
                    },
                },
                ReminderResponse: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'string',
                            example: 'rem_12345',
                        },
                        scheduledFor: {
                            type: 'string',
                            format: 'date-time',
                            example: '2024-01-20T14:00:00Z',
                        },
                        message: {
                            type: 'string',
                            example: 'Check project status',
                        },
                        status: {
                            type: 'string',
                            enum: ['pending', 'sent', 'cancelled'],
                            example: 'pending',
                        },
                        createdAt: {
                            type: 'string',
                            format: 'date-time',
                            example: '2024-01-15T10:30:00Z',
                        },
                    },
                },
                ReminderListResponse: {
                    type: 'object',
                    properties: {
                        reminders: {
                            type: 'array',
                            items: {
                                $ref: '#/components/schemas/ReminderResponse',
                            },
                        },
                        total: {
                            type: 'integer',
                            example: 5,
                        },
                    },
                },
                CreateCouncilRequest: {
                    type: 'object',
                    required: ['query'],
                    properties: {
                        query: {
                            type: 'string',
                            description: 'Question to ask all models',
                            example: 'What are the best practices for API design?',
                        },
                        models: {
                            type: 'array',
                            description: 'Models to query. Defaults to all available.',
                            items: {
                                type: 'string',
                                example: 'gpt-4',
                            },
                        },
                    },
                },
                CouncilSessionResponse: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'string',
                            example: 'council_12345',
                        },
                        query: {
                            type: 'string',
                            example: 'What are the best practices for API design?',
                        },
                        responses: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    model: {
                                        type: 'string',
                                        example: 'gpt-4',
                                    },
                                    response: {
                                        type: 'string',
                                        example: 'Best practices include...',
                                    },
                                    completedAt: {
                                        type: 'string',
                                        format: 'date-time',
                                        example: '2024-01-15T10:30:05Z',
                                    },
                                },
                            },
                        },
                        createdAt: {
                            type: 'string',
                            format: 'date-time',
                            example: '2024-01-15T10:30:00Z',
                        },
                    },
                },
                HealthResponse: {
                    type: 'object',
                    properties: {
                        status: {
                            type: 'string',
                            enum: ['healthy', 'degraded', 'unhealthy'],
                            example: 'healthy',
                        },
                        timestamp: {
                            type: 'string',
                            format: 'date-time',
                            example: '2024-01-15T10:30:00Z',
                        },
                        services: {
                            type: 'object',
                            properties: {
                                database: {
                                    type: 'string',
                                    enum: ['up', 'down'],
                                    example: 'up',
                                },
                                vectorStore: {
                                    type: 'string',
                                    enum: ['up', 'down'],
                                    example: 'up',
                                },
                                aiProviders: {
                                    type: 'object',
                                    additionalProperties: {
                                        type: 'string',
                                        enum: ['up', 'down'],
                                    },
                                    example: { openai: 'up', anthropic: 'up' },
                                },
                            },
                        },
                    },
                },
                ErrorResponse: {
                    type: 'object',
                    properties: {
                        error: {
                            type: 'string',
                            example: 'Validation error',
                        },
                        message: {
                            type: 'string',
                            example: 'Invalid request parameters',
                        },
                        code: {
                            type: 'string',
                            example: 'INVALID_REQUEST',
                        },
                        details: {
                            type: 'object',
                            additionalProperties: true,
                        },
                    },
                },
            },
            responses: {
                Unauthorized: {
                    description: 'Authentication required',
                    content: {
                        'application/json': {
                            schema: {
                                $ref: '#/components/schemas/ErrorResponse',
                            },
                            example: {
                                error: 'Unauthorized',
                                message: 'Valid authentication token required',
                                code: 'UNAUTHORIZED',
                            },
                        },
                    },
                },
                Forbidden: {
                    description: 'Insufficient permissions or tier limit exceeded',
                    content: {
                        'application/json': {
                            schema: {
                                $ref: '#/components/schemas/ErrorResponse',
                            },
                            example: {
                                error: 'Forbidden',
                                message: 'This feature requires a Pro subscription',
                                code: 'TIER_LIMIT_EXCEEDED',
                            },
                        },
                    },
                },
                NotFound: {
                    description: 'Resource not found',
                    content: {
                        'application/json': {
                            schema: {
                                $ref: '#/components/schemas/ErrorResponse',
                            },
                            example: {
                                error: 'Not Found',
                                message: 'The requested resource does not exist',
                                code: 'NOT_FOUND',
                            },
                        },
                    },
                },
                RateLimited: {
                    description: 'Rate limit exceeded',
                    headers: {
                        'X-RateLimit-Limit': {
                            $ref: '#/components/headers/X-RateLimit-Limit',
                        },
                        'X-RateLimit-Remaining': {
                            schema: {
                                type: 'integer',
                                example: 0,
                            },
                        },
                        'X-RateLimit-Reset': {
                            $ref: '#/components/headers/X-RateLimit-Reset',
                        },
                        'Retry-After': {
                            description: 'Seconds until rate limit resets',
                            schema: {
                                type: 'integer',
                                example: 60,
                            },
                        },
                    },
                    content: {
                        'application/json': {
                            schema: {
                                $ref: '#/components/schemas/ErrorResponse',
                            },
                            example: {
                                error: 'Rate Limit Exceeded',
                                message: 'Too many requests. Please try again later.',
                                code: 'RATE_LIMIT_EXCEEDED',
                            },
                        },
                    },
                },
                InternalError: {
                    description: 'Internal server error',
                    content: {
                        'application/json': {
                            schema: {
                                $ref: '#/components/schemas/ErrorResponse',
                            },
                            example: {
                                error: 'Internal Server Error',
                                message: 'An unexpected error occurred',
                                code: 'INTERNAL_ERROR',
                            },
                        },
                    },
                },
            },
        },
    };
}

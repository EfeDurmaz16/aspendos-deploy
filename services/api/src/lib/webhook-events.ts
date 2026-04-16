/**
 * Webhook Events Catalog
 * Documents all webhook events YULA can send to integrations.
 */

interface WebhookEventDef {
    event: string;
    description: string;
    category: string;
    payloadExample: Record<string, unknown>;
}

const WEBHOOK_EVENTS: WebhookEventDef[] = [
    {
        event: 'chat.created',
        description: 'A new chat conversation was created',
        category: 'chat',
        payloadExample: {
            chatId: 'chat_abc123',
            userId: 'user_123',
            title: 'New Chat',
            createdAt: '2026-02-12T00:00:00Z',
        },
    },
    {
        event: 'chat.message.sent',
        description: 'A message was sent in a conversation',
        category: 'chat',
        payloadExample: {
            chatId: 'chat_abc123',
            messageId: 'msg_456',
            role: 'user',
            tokensUsed: 150,
            modelId: 'gpt-4o',
        },
    },
    {
        event: 'chat.message.received',
        description: 'An AI response was generated',
        category: 'chat',
        payloadExample: {
            chatId: 'chat_abc123',
            messageId: 'msg_789',
            role: 'assistant',
            tokensIn: 150,
            tokensOut: 300,
            modelId: 'gpt-4o',
            costUsd: 0.005,
        },
    },
    {
        event: 'memory.created',
        description: 'A new memory was extracted and stored',
        category: 'memory',
        payloadExample: { memoryId: 'mem_123', userId: 'user_123', type: 'fact', importance: 0.8 },
    },
    {
        event: 'memory.decayed',
        description: 'A memory was deactivated due to low relevance',
        category: 'memory',
        payloadExample: {
            memoryId: 'mem_123',
            decayScore: 0.05,
            lastAccessedAt: '2025-08-01T00:00:00Z',
        },
    },
    {
        event: 'council.completed',
        description: 'A Council session completed with all model responses',
        category: 'council',
        payloadExample: {
            sessionId: 'council_123',
            userId: 'user_123',
            models: ['gpt-4o', 'claude-sonnet-4-5', 'gemini-2.0-flash'],
            totalCostUsd: 0.02,
        },
    },
    {
        event: 'pac.reminder.triggered',
        description: 'A proactive AI reminder was triggered',
        category: 'pac',
        payloadExample: {
            reminderId: 'pac_123',
            userId: 'user_123',
            message: 'Time to review your goals',
        },
    },
    {
        event: 'billing.subscription.created',
        description: 'A new subscription was created',
        category: 'billing',
        payloadExample: { userId: 'user_123', tier: 'PRO', polarSubscriptionId: 'sub_123' },
    },
    {
        event: 'billing.subscription.cancelled',
        description: 'A subscription was cancelled',
        category: 'billing',
        payloadExample: { userId: 'user_123', tier: 'PRO', cancelledAt: '2026-02-12T00:00:00Z' },
    },
    {
        event: 'billing.credits.low',
        description: 'User credits dropped below threshold',
        category: 'billing',
        payloadExample: { userId: 'user_123', remainingCredits: 0.5, threshold: 1.0 },
    },
    {
        event: 'user.import.completed',
        description: 'A conversation import completed',
        category: 'user',
        payloadExample: {
            userId: 'user_123',
            source: 'chatgpt',
            chatsImported: 42,
            memoriesExtracted: 15,
        },
    },
    {
        event: 'user.export.completed',
        description: 'A GDPR data export completed',
        category: 'user',
        payloadExample: { userId: 'user_123', exportSize: '2.4MB', format: 'json' },
    },
];

export function getWebhookEventsCatalog(category?: string) {
    if (category) {
        return WEBHOOK_EVENTS.filter((e) => e.category === category);
    }
    return WEBHOOK_EVENTS;
}

export function getWebhookCategories() {
    return [...new Set(WEBHOOK_EVENTS.map((e) => e.category))];
}

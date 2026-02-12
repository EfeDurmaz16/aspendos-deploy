/**
 * Product Changelog
 * Shows users what's new and builds confidence the product is actively developed.
 */

interface ChangelogEntry {
    version: string;
    date: string;
    title: string;
    description: string;
    type: 'feature' | 'improvement' | 'fix' | 'security';
    highlights: string[];
}

const CHANGELOG: ChangelogEntry[] = [
    {
        version: '1.6.0',
        date: '2026-02-12',
        title: 'Security & Infrastructure Hardening',
        description: 'Major security and infrastructure improvements across the platform.',
        type: 'security',
        highlights: [
            'Input sanitization and XSS protection across all endpoints',
            'Content moderation with PII detection and prompt injection defense',
            'API key management with SHA-256 hashing and scoped permissions',
            'Deep health checks with DB, Qdrant, and Redis monitoring',
            'GDPR Article 20 data portability (full data export)',
            'Centralized error codes catalog for better developer experience',
            'Structured JSON logging with request correlation',
        ],
    },
    {
        version: '1.5.0',
        date: '2026-02-12',
        title: 'Moat & Switching Cost Features',
        description: 'New features that make YULA irreplaceable in your workflow.',
        type: 'feature',
        highlights: [
            'Conversation forking - branch from any message point',
            'Prompt templates with variables and community discovery',
            'Chat export to Markdown and JSON formats',
            'Gemini and Perplexity conversation import support',
            'Shared chat links with expiry and view tracking',
            'Feature flags for gradual rollouts',
        ],
    },
    {
        version: '1.4.0',
        date: '2026-02-11',
        title: 'Economic Viability & Smart Routing',
        description: 'Cost optimization and intelligent model routing.',
        type: 'improvement',
        highlights: [
            'Smart model routing downgrades simple queries to cheaper models',
            'Per-request cost tracking with detailed usage analytics',
            'Provider health circuit breakers with automatic failover',
            'Free-tier abuse detection with progressive throttling',
            'Webhook retry queue with exponential backoff',
            'Tier-based feature gating for all premium features',
        ],
    },
    {
        version: '1.3.0',
        date: '2026-02-11',
        title: 'PMF & Retention',
        description: 'Features to improve product-market fit and user retention.',
        type: 'feature',
        highlights: [
            'NPS feedback collection system',
            'Churn re-engagement notifications',
            'Activation funnel tracking',
            'Memory decay and consolidation for smarter recall',
            'Switching cost metrics and data import analytics',
        ],
    },
    {
        version: '1.2.0',
        date: '2026-02-10',
        title: 'Clean Minimal UI Redesign',
        description:
            'Complete UI overhaul inspired by ChatGPT and Claude. Clean, minimal, no visual noise.',
        type: 'improvement',
        highlights: [
            'Neutral color palette (no more navy/terracotta)',
            'Sans-serif typography with Geist font',
            'Removed glassmorphism, gradients, and glow effects',
            'Two-panel layout: sidebar + chat',
            'Model picker moved to input footer (ChatGPT pattern)',
            'Marketing page moved to /landing, chat is now home for auth users',
        ],
    },
    {
        version: '1.1.0',
        date: '2026-02-09',
        title: 'Core Platform Launch',
        description: 'Initial release with core AI chat, memory, and billing.',
        type: 'feature',
        highlights: [
            'Multi-model AI chat with streaming responses',
            'Persistent memory via Qdrant vector store',
            'Council: query 4 AI models simultaneously',
            'PAC: proactive AI-initiated conversations',
            'ChatGPT and Claude conversation import',
            'Polar billing with Free/Starter/Pro/Ultra tiers',
            'Better Auth authentication',
        ],
    },
];

/**
 * Get changelog entries, optionally filtered by type
 */
export function getChangelog(type?: string, limit = 20): ChangelogEntry[] {
    let entries = CHANGELOG;
    if (type) {
        entries = entries.filter((e) => e.type === type);
    }
    return entries.slice(0, limit);
}

/**
 * Get the latest version info
 */
export function getLatestVersion() {
    const latest = CHANGELOG[0];
    return {
        version: latest.version,
        date: latest.date,
        title: latest.title,
    };
}

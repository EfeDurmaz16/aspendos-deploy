/**
 * Aspendos Tier Configuration
 * Defines pricing, limits, and features for each subscription tier.
 */

export const TIER_CONFIG = {
    STARTER: {
        // Pricing
        monthlyPrice: 19.99,
        weeklyPrice: 7.50,
        annualPrice: 191.88,  // ~$16/mo (20% discount)

        // Chat & Token Limits
        monthlyChats: 300,          // ~10/day
        monthlyTokens: 1_000_000,   // 1M tokens

        // Models
        supportedModels: ['gpt-4o-mini', 'claude-3-haiku', 'gemini-flash'],
        multiModel: false,
        multiModelLimit: 0,

        // Voice
        dailyVoiceMinutes: 10,

        // Media
        monthlyImageGenerations: 50,
        monthlyVideoMinutes: 0,

        // Memory
        memoryLevel: 'basic',       // basic auto-save
        memoryInspector: false,

        // Agents
        customAgents: false,
        agentTemplates: false,

        // Priority
        routingPriority: 'standard',

        // Support
        supportLevel: 'email',

        // Description
        tagline: 'Try the AI OS, risk-free',
        description: 'Get a powerful multi-model AI workspace for your personal workflows and experiments. Ideal for light daily use, quick research, and trying Aspendos without committing to heavy limits.',
    },

    PRO: {
        // Pricing
        monthlyPrice: 49.00,
        weeklyPrice: 15.00,
        annualPrice: 468.00,  // ~$39/mo (20% discount)

        // Chat & Token Limits
        monthlyChats: 1500,         // ~50/day
        monthlyTokens: 5_000_000,   // 5M tokens

        // Models
        supportedModels: 'all',     // All GPT-4o / Claude / Gemini
        multiModel: true,
        multiModelLimit: 2,         // 2 models side-by-side

        // Voice
        dailyVoiceMinutes: 60,

        // Media
        monthlyImageGenerations: 200,
        monthlyVideoMinutes: 10,

        // Memory
        memoryLevel: 'advanced',    // Advanced search & tagging
        memoryInspector: false,

        // Agents
        customAgents: true,
        agentTemplates: true,

        // Priority
        routingPriority: 'medium',

        // Support
        supportLevel: 'email_chat',

        // Description
        tagline: 'Your daily AI copilot',
        description: 'Built for founders, developers, and researchers who work with AI every day. Higher limits, faster routing, voice, memory, and multi-model comparison make Pro the default plan for serious work.',
    },

    ULTRA: {
        // Pricing
        monthlyPrice: 99.00,
        weeklyPrice: 30.00,
        annualPrice: 948.00,  // ~$79/mo (20% discount)

        // Chat & Token Limits
        monthlyChats: 5000,         // ~166/day (practically unlimited)
        monthlyTokens: 20_000_000,  // 20M tokens

        // Models
        supportedModels: 'all_plus', // All + experimental models
        multiModel: true,
        multiModelLimit: 4,          // 3-4 models parallel

        // Voice
        dailyVoiceMinutes: 180,      // 3 hours/day

        // Media
        monthlyImageGenerations: 1000,
        monthlyVideoMinutes: 60,
        priorityMediaQueue: true,

        // Memory
        memoryLevel: 'full',         // Full Memory Inspector
        memoryInspector: true,

        // Agents
        customAgents: true,
        agentTemplates: true,
        betaFeatures: true,

        // Priority
        routingPriority: 'highest',  // Lowest latency

        // Support
        supportLevel: 'priority_chat',

        // Description
        tagline: 'For power users and teams',
        description: 'Designed for heavy usage, production workloads, and small teams that live inside Aspendos. Unlock the highest limits, full multi-model streaming, advanced memory tools, and priority performance across the stack.',
    },
} as const;

export type TierName = keyof typeof TIER_CONFIG;
export type TierConfig = typeof TIER_CONFIG[TierName];

/**
 * Get tier configuration by name
 */
export function getTierConfig(tier: TierName): TierConfig {
    return TIER_CONFIG[tier];
}

/**
 * Check if a feature is available for a tier
 */
export function hasFeature(tier: TierName, feature: keyof TierConfig): boolean {
    const config = TIER_CONFIG[tier];
    const value = config[feature];
    return typeof value === 'boolean' ? value : !!value;
}

/**
 * Get the limit for a specific feature
 */
export function getLimit(tier: TierName, limit: keyof TierConfig): number {
    const config = TIER_CONFIG[tier];
    const value = config[limit];
    return typeof value === 'number' ? value : 0;
}

/**
 * Check if user can use multi-model with specified count
 */
export function canUseMultiModel(tier: TierName, modelCount: number): boolean {
    const config = TIER_CONFIG[tier];
    return config.multiModel && modelCount <= config.multiModelLimit;
}

/**
 * Get supported models for tier
 */
export function getSupportedModels(tier: TierName): readonly string[] | 'all' | 'all_plus' {
    return TIER_CONFIG[tier].supportedModels;
}

/**
 * Feature Flags System
 * Simple, in-code feature flags for gradual rollouts and A/B testing.
 * Supports tier-based gating and percentage-based rollouts.
 */

type UserTier = 'FREE' | 'STARTER' | 'PRO' | 'ULTRA';

interface FeatureFlag {
    name: string;
    description: string;
    enabled: boolean;
    /** Tiers that have access (empty = all tiers when enabled) */
    allowedTiers: UserTier[];
    /** Percentage rollout (0-100). 100 = all users in allowed tiers */
    rolloutPercentage: number;
}

const FLAGS: Record<string, FeatureFlag> = {
    council_multi_model: {
        name: 'Council Multi-Model',
        description: 'Query multiple AI models simultaneously',
        enabled: true,
        allowedTiers: ['PRO', 'ULTRA'],
        rolloutPercentage: 100,
    },
    pac_proactive_ai: {
        name: 'Proactive AI Callbacks',
        description: 'AI-initiated conversations and reminders',
        enabled: true,
        allowedTiers: ['STARTER', 'PRO', 'ULTRA'],
        rolloutPercentage: 100,
    },
    memory_import: {
        name: 'Memory Import',
        description: 'Import conversation history from other AI platforms',
        enabled: true,
        allowedTiers: [],
        rolloutPercentage: 100,
    },
    prompt_templates: {
        name: 'Prompt Templates',
        description: 'Save and reuse prompt templates',
        enabled: true,
        allowedTiers: [],
        rolloutPercentage: 100,
    },
    conversation_fork: {
        name: 'Conversation Forking',
        description: 'Fork conversations from any message point',
        enabled: true,
        allowedTiers: ['PRO', 'ULTRA'],
        rolloutPercentage: 100,
    },
    chat_export: {
        name: 'Chat Export',
        description: 'Export chats to Markdown and JSON',
        enabled: true,
        allowedTiers: [],
        rolloutPercentage: 100,
    },
    advanced_memory: {
        name: 'Advanced Memory',
        description: 'Enhanced memory with decay scoring and consolidation',
        enabled: true,
        allowedTiers: ['PRO', 'ULTRA'],
        rolloutPercentage: 100,
    },
    voice_input: {
        name: 'Voice Input',
        description: 'Speech-to-text input for chat',
        enabled: false,
        allowedTiers: ['PRO', 'ULTRA'],
        rolloutPercentage: 0,
    },
    shared_workspaces: {
        name: 'Shared Workspaces',
        description: 'Team collaboration on shared memory and chats',
        enabled: false,
        allowedTiers: ['ULTRA'],
        rolloutPercentage: 0,
    },
};

/**
 * Simple hash for deterministic percentage rollout per user
 */
function hashUserId(userId: string, featureName: string): number {
    let hash = 0;
    const str = `${userId}:${featureName}`;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash) % 100;
}

/**
 * Check if a feature is enabled for a specific user
 */
export function isFeatureEnabled(
    featureName: string,
    userId?: string,
    userTier: UserTier = 'FREE'
): boolean {
    const flag = FLAGS[featureName];
    if (!flag) return false;
    if (!flag.enabled) return false;

    // Check tier restriction
    if (flag.allowedTiers.length > 0 && !flag.allowedTiers.includes(userTier)) {
        return false;
    }

    // Check percentage rollout
    if (flag.rolloutPercentage < 100 && userId) {
        const userHash = hashUserId(userId, featureName);
        if (userHash >= flag.rolloutPercentage) {
            return false;
        }
    }

    return true;
}

/**
 * Get all feature flags with their status for a user
 */
export function getUserFeatures(userId?: string, userTier: UserTier = 'FREE') {
    return Object.entries(FLAGS).map(([key, flag]) => ({
        key,
        name: flag.name,
        description: flag.description,
        enabled: isFeatureEnabled(key, userId, userTier),
        tierRequired: flag.allowedTiers.length > 0 ? flag.allowedTiers[0] : null,
    }));
}

/**
 * Get raw flag definitions (for admin/docs)
 */
export function getAllFlags() {
    return Object.entries(FLAGS).map(([key, flag]) => ({
        key,
        ...flag,
    }));
}

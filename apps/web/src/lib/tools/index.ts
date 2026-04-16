/**
 * Tool Registry — Exports all agent tools with metadata
 *
 * Each tool group includes:
 * - AI SDK tool definitions (for use with streamText/generateText)
 * - Reversibility metadata (for AGIT commit classification)
 * - Tier gating info (for the tools API route)
 */

import { sandboxTools, SANDBOX_TOOL_META } from './sandbox';
import { browserTools, BROWSER_TOOL_META } from './browser';
import { computerUseTools, COMPUTER_USE_TOOL_META } from './computer-use';
import type { ReversibilityClass } from '@/lib/reversibility/types';

// ── Tier definitions ────────────────────────────────────────────
export type UserTier = 'free' | 'personal' | 'pro' | 'enterprise';

const TIER_ORDER: Record<UserTier, number> = {
    free: 0,
    personal: 1,
    pro: 2,
    enterprise: 3,
};

// ── Tool group metadata ─────────────────────────────────────────
export interface ToolGroupMeta {
    name: string;
    description: string;
    reversibility_class: ReversibilityClass;
    tier_minimum: UserTier;
    tools: string[];
}

export const TOOL_GROUPS: ToolGroupMeta[] = [
    {
        name: 'sandbox',
        description:
            'E2B cloud sandbox for isolated code execution, file operations, and package management',
        reversibility_class: SANDBOX_TOOL_META.reversibility_class,
        tier_minimum: SANDBOX_TOOL_META.tier_minimum as UserTier,
        tools: Object.keys(sandboxTools),
    },
    {
        name: 'browser',
        description:
            'Steel.dev cloud browser for web navigation, scraping, screenshots, and interaction',
        reversibility_class: BROWSER_TOOL_META.reversibility_class,
        tier_minimum: BROWSER_TOOL_META.tier_minimum as UserTier,
        tools: Object.keys(browserTools),
    },
    {
        name: 'computer_use',
        description:
            'Anthropic Computer Use for desktop interaction via mouse, keyboard, and screenshots',
        reversibility_class: COMPUTER_USE_TOOL_META.reversibility_class,
        tier_minimum: COMPUTER_USE_TOOL_META.tier_minimum as UserTier,
        tools: Object.keys(computerUseTools),
    },
];

// ── All tools (ungated) ─────────────────────────────────────────
export const allAgentTools = {
    ...sandboxTools,
    ...browserTools,
    ...computerUseTools,
} as const;

// ── Tier-gated tool resolver ────────────────────────────────────
export function getToolsForTier(tier: UserTier): Record<string, any> {
    const tierLevel = TIER_ORDER[tier];
    const tools: Record<string, any> = {};

    if (tierLevel >= TIER_ORDER[SANDBOX_TOOL_META.tier_minimum as UserTier]) {
        Object.assign(tools, sandboxTools);
    }

    if (tierLevel >= TIER_ORDER[BROWSER_TOOL_META.tier_minimum as UserTier]) {
        Object.assign(tools, browserTools);
    }

    if (tierLevel >= TIER_ORDER[COMPUTER_USE_TOOL_META.tier_minimum as UserTier]) {
        Object.assign(tools, computerUseTools);
    }

    return tools;
}

// ── Tool availability manifest (for UI) ─────────────────────────
export function getToolManifest(tier: UserTier) {
    const tierLevel = TIER_ORDER[tier];

    return TOOL_GROUPS.map((group) => ({
        ...group,
        available: tierLevel >= TIER_ORDER[group.tier_minimum],
        locked_reason:
            tierLevel < TIER_ORDER[group.tier_minimum]
                ? `Requires ${group.tier_minimum}+ tier`
                : null,
    }));
}

// ── Re-exports ──────────────────────────────────────────────────
export { sandboxTools, SANDBOX_TOOL_META } from './sandbox';
export { browserTools, BROWSER_TOOL_META } from './browser';
export { computerUseTools, COMPUTER_USE_TOOL_META } from './computer-use';

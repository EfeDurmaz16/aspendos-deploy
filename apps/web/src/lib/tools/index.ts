/**
 * Tool Registry — Exports all agent tools with metadata
 *
 * Each tool group includes:
 * - AI SDK tool definitions (for use with streamText/generateText)
 * - Reversibility metadata (for AGIT commit classification)
 * - Tier gating info (for the tools API route)
 */

import type { ReversibilityClass } from '@/lib/reversibility/types';
import { BROWSER_TOOL_META, browserTools } from './browser';
import { COMPUTER_USE_TOOL_META, computerUseTools } from './computer-use';
import { SANDBOX_TOOL_META, sandboxTools } from './sandbox';

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

function governedTool(toolName: string, rawTool: any, group: ToolGroupMeta) {
    if (typeof rawTool?.execute !== 'function') {
        return rawTool;
    }

    return {
        ...rawTool,
        execute: async (...args: unknown[]) => {
            if (group.reversibility_class === 'irreversible_blocked') {
                return {
                    success: false,
                    status: 'blocked',
                    toolName,
                    class: group.reversibility_class,
                    error: `Tool "${toolName}" is blocked by governance policy.`,
                };
            }

            if (group.reversibility_class === 'approval_only') {
                return {
                    success: false,
                    status: 'awaiting_approval',
                    toolName,
                    class: group.reversibility_class,
                    error: `Tool "${toolName}" requires approval before execution.`,
                };
            }

            return rawTool.execute(...args);
        },
    };
}

function addGovernedGroup(
    target: Record<string, any>,
    rawTools: Record<string, any>,
    group: ToolGroupMeta
) {
    for (const [toolName, rawTool] of Object.entries(rawTools)) {
        target[toolName] = governedTool(toolName, rawTool, group);
    }
}

// ── All tools (ungated) ─────────────────────────────────────────
export const allAgentTools = {
    ...(() => {
        const tools: Record<string, any> = {};
        addGovernedGroup(tools, sandboxTools, TOOL_GROUPS[0]!);
        addGovernedGroup(tools, browserTools, TOOL_GROUPS[1]!);
        addGovernedGroup(tools, computerUseTools, TOOL_GROUPS[2]!);
        return tools;
    })(),
};

// ── Tier-gated tool resolver ────────────────────────────────────
export function getToolsForTier(tier: UserTier): Record<string, any> {
    const tierLevel = TIER_ORDER[tier];
    const tools: Record<string, any> = {};

    if (tierLevel >= TIER_ORDER[SANDBOX_TOOL_META.tier_minimum as UserTier]) {
        addGovernedGroup(tools, sandboxTools, TOOL_GROUPS[0]!);
    }

    if (tierLevel >= TIER_ORDER[BROWSER_TOOL_META.tier_minimum as UserTier]) {
        addGovernedGroup(tools, browserTools, TOOL_GROUPS[1]!);
    }

    if (tierLevel >= TIER_ORDER[COMPUTER_USE_TOOL_META.tier_minimum as UserTier]) {
        addGovernedGroup(tools, computerUseTools, TOOL_GROUPS[2]!);
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

export { BROWSER_TOOL_META, browserTools } from './browser';
export { COMPUTER_USE_TOOL_META, computerUseTools } from './computer-use';
// ── Re-exports ──────────────────────────────────────────────────
export { SANDBOX_TOOL_META, sandboxTools } from './sandbox';

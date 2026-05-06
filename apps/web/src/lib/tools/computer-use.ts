/**
 * Anthropic Computer Use Tool — Desktop interaction via screenshots + mouse/keyboard
 *
 * Computer Use requires an Anthropic model loop plus a real desktop/sandbox
 * executor. This module exposes the governed tool surface, but refuses to
 * report success until that execution loop exists.
 *
 * Reversibility: approval_only (high-risk, arbitrary desktop actions)
 * Tier: Pro+ only
 */

import { tool } from 'ai';
import { z } from 'zod';
import type { ReversibilityClass, RollbackStrategy } from '@/lib/reversibility/types';

// ── Metadata ────────────────────────────────────────────────────
export const COMPUTER_USE_TOOL_META = {
    reversibility_class: 'approval_only' as ReversibilityClass,
    tier_minimum: 'pro',
    rollback_strategy: {
        kind: 'manual' as const,
        instructions:
            'Computer use actions cannot be automatically reversed. Review screenshots and undo manually.',
    } satisfies RollbackStrategy,
};

// Default display dimensions
const DEFAULT_DISPLAY_WIDTH = 1280;
const DEFAULT_DISPLAY_HEIGHT = 800;

const COMPUTER_USE_NOT_IMPLEMENTED =
    'Computer Use sandbox loop is not implemented. Refusing to report success without executing the desktop action.';

function requireAnthropicApiKey() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
        throw new Error('ANTHROPIC_API_KEY not configured');
    }
}

// ── Computer use action types ───────────────────────────────────
const ComputerActionSchema = z.discriminatedUnion('action', [
    z.object({
        action: z.literal('screenshot'),
    }),
    z.object({
        action: z.literal('left_click'),
        coordinate: z.tuple([z.number(), z.number()]).describe('[x, y] pixel coordinate'),
    }),
    z.object({
        action: z.literal('right_click'),
        coordinate: z.tuple([z.number(), z.number()]).describe('[x, y] pixel coordinate'),
    }),
    z.object({
        action: z.literal('double_click'),
        coordinate: z.tuple([z.number(), z.number()]).describe('[x, y] pixel coordinate'),
    }),
    z.object({
        action: z.literal('mouse_move'),
        coordinate: z.tuple([z.number(), z.number()]).describe('[x, y] pixel coordinate'),
    }),
    z.object({
        action: z.literal('type'),
        text: z.string().describe('Text to type'),
    }),
    z.object({
        action: z.literal('key'),
        text: z.string().describe('Key combo (e.g. "Return", "ctrl+c", "alt+tab")'),
    }),
    z.object({
        action: z.literal('scroll'),
        coordinate: z
            .tuple([z.number(), z.number()])
            .describe('[x, y] pixel coordinate to scroll at'),
        delta_x: z.number().describe('Horizontal scroll amount'),
        delta_y: z.number().describe('Vertical scroll amount'),
    }),
    z.object({
        action: z.literal('wait'),
    }),
    z.object({
        action: z.literal('triple_click'),
        coordinate: z.tuple([z.number(), z.number()]).describe('[x, y] pixel coordinate'),
    }),
]);

// ── Tool: computerAction ────────────────────────────────────────
export const computerAction = tool({
    description: `Computer use action surface for mouse clicks, keyboard input, screenshots, and scrolling. REQUIRES Pro+ tier. Currently fails closed until a real desktop execution loop is connected.`,
    inputSchema: z.object({
        action: ComputerActionSchema.describe('The computer action to perform'),
        displayWidth: z
            .number()
            .optional()
            .describe(`Display width in pixels. Default ${DEFAULT_DISPLAY_WIDTH}.`),
        displayHeight: z
            .number()
            .optional()
            .describe(`Display height in pixels. Default ${DEFAULT_DISPLAY_HEIGHT}.`),
        model: z
            .string()
            .optional()
            .describe('Anthropic model to use. Default "claude-sonnet-4-6".'),
    }),
    execute: async ({ action, displayWidth, displayHeight, model }) => {
        try {
            requireAnthropicApiKey();
            return {
                success: false,
                error: COMPUTER_USE_NOT_IMPLEMENTED,
                action: action.action,
                displayWidth: displayWidth ?? DEFAULT_DISPLAY_WIDTH,
                displayHeight: displayHeight ?? DEFAULT_DISPLAY_HEIGHT,
                model: model ?? 'claude-sonnet-4-6',
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Computer use action failed',
            };
        }
    },
});

// ── Tool: computerScreenshot ────────────────────────────────────
export const computerScreenshot = tool({
    description:
        'Computer screenshot surface. REQUIRES Pro+ tier. Currently fails closed until a real desktop execution loop is connected.',
    inputSchema: z.object({
        displayWidth: z
            .number()
            .optional()
            .describe(`Display width in pixels. Default ${DEFAULT_DISPLAY_WIDTH}.`),
        displayHeight: z
            .number()
            .optional()
            .describe(`Display height in pixels. Default ${DEFAULT_DISPLAY_HEIGHT}.`),
        prompt: z.string().optional().describe('What to look for or describe on the screen.'),
    }),
    execute: async ({ displayWidth, displayHeight, prompt }) => {
        try {
            requireAnthropicApiKey();
            return {
                success: false,
                error: COMPUTER_USE_NOT_IMPLEMENTED,
                displayWidth: displayWidth ?? DEFAULT_DISPLAY_WIDTH,
                displayHeight: displayHeight ?? DEFAULT_DISPLAY_HEIGHT,
                prompt: prompt ?? 'Take a screenshot and describe what you see on the screen.',
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Screenshot failed',
            };
        }
    },
});

// ── Convenience: all computer use tools as a record ─────────────
export const computerUseTools = {
    computer_action: computerAction,
    computer_screenshot: computerScreenshot,
} as const;

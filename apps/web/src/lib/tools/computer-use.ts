/**
 * Anthropic Computer Use Tool — Desktop interaction via screenshots + mouse/keyboard
 *
 * Wraps Anthropic's computer-use beta (computer_20251124) as Vercel AI SDK tools.
 * The actual computer use happens through Anthropic's API; these tools bridge
 * the AI SDK tool-calling interface to the Anthropic computer use protocol.
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

// ── Anthropic beta header for computer use ──────────────────────
const COMPUTER_USE_BETA = 'computer-use-2025-01-24';
const COMPUTER_USE_TOOL_TYPE = 'computer_20250124';

// Default display dimensions
const DEFAULT_DISPLAY_WIDTH = 1280;
const DEFAULT_DISPLAY_HEIGHT = 800;

// ── Internal: create Anthropic client ───────────────────────────
async function getAnthropicClient() {
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
        throw new Error('ANTHROPIC_API_KEY not configured');
    }
    return new Anthropic({ apiKey });
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
    description: `Execute a computer use action via Anthropic's Computer Use API. This enables mouse clicks, keyboard input, screenshots, and scrolling on a virtual desktop. REQUIRES Pro+ tier. Actions are sent to the Anthropic API which controls a virtual display.`,
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
            .describe('Anthropic model to use. Default "claude-sonnet-4-20250514".'),
    }),
    execute: async ({ action, displayWidth, displayHeight, model }) => {
        try {
            const client = await getAnthropicClient();

            const width = displayWidth ?? DEFAULT_DISPLAY_WIDTH;
            const height = displayHeight ?? DEFAULT_DISPLAY_HEIGHT;
            const modelId = model ?? 'claude-sonnet-4-20250514';

            // Build the computer use tool definition for the Anthropic API
            const computerTool = {
                type: COMPUTER_USE_TOOL_TYPE as any,
                name: 'computer',
                display_width_px: width,
                display_height_px: height,
            };

            // Build the tool_use content block representing the action result
            // For the initial call, we ask Claude to perform the action
            const actionDescription = formatActionDescription(action);

            const response = await client.messages.create({
                model: modelId,
                max_tokens: 1024,
                tools: [computerTool],
                messages: [
                    {
                        role: 'user',
                        content: `Perform this computer action: ${actionDescription}`,
                    },
                ],
                betas: [COMPUTER_USE_BETA],
            } as any);

            // Extract tool use blocks from the response
            const toolUseBlocks = response.content.filter(
                (block: any) => block.type === 'tool_use'
            );
            const textBlocks = response.content.filter((block: any) => block.type === 'text');

            return {
                success: true,
                action: action.action,
                toolCalls: toolUseBlocks.map((block: any) => ({
                    id: block.id,
                    name: block.name,
                    input: block.input,
                })),
                text: textBlocks.map((block: any) => block.text).join('\n'),
                stopReason: response.stop_reason,
                usage: {
                    inputTokens: response.usage.input_tokens,
                    outputTokens: response.usage.output_tokens,
                },
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
        'Take a screenshot of the virtual desktop via Anthropic Computer Use. Returns the model interpretation of the current screen state. REQUIRES Pro+ tier.',
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
            const client = await getAnthropicClient();

            const width = displayWidth ?? DEFAULT_DISPLAY_WIDTH;
            const height = displayHeight ?? DEFAULT_DISPLAY_HEIGHT;

            const computerTool = {
                type: COMPUTER_USE_TOOL_TYPE as any,
                name: 'computer',
                display_width_px: width,
                display_height_px: height,
            };

            const response = await client.messages.create({
                model: 'claude-sonnet-4-20250514',
                max_tokens: 1024,
                tools: [computerTool],
                messages: [
                    {
                        role: 'user',
                        content:
                            prompt ?? 'Take a screenshot and describe what you see on the screen.',
                    },
                ],
                betas: [COMPUTER_USE_BETA],
            } as any);

            const textBlocks = response.content.filter((block: any) => block.type === 'text');
            const toolUseBlocks = response.content.filter(
                (block: any) => block.type === 'tool_use'
            );

            return {
                success: true,
                description: textBlocks.map((block: any) => block.text).join('\n'),
                toolCalls: toolUseBlocks.map((block: any) => ({
                    id: block.id,
                    name: block.name,
                    input: block.input,
                })),
                usage: {
                    inputTokens: response.usage.input_tokens,
                    outputTokens: response.usage.output_tokens,
                },
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Screenshot failed',
            };
        }
    },
});

// ── Helper: format action for prompt ────────────────────────────
function formatActionDescription(action: z.infer<typeof ComputerActionSchema>): string {
    switch (action.action) {
        case 'screenshot':
            return 'Take a screenshot of the current screen';
        case 'left_click':
            return `Left click at coordinates (${action.coordinate[0]}, ${action.coordinate[1]})`;
        case 'right_click':
            return `Right click at coordinates (${action.coordinate[0]}, ${action.coordinate[1]})`;
        case 'double_click':
            return `Double click at coordinates (${action.coordinate[0]}, ${action.coordinate[1]})`;
        case 'triple_click':
            return `Triple click at coordinates (${action.coordinate[0]}, ${action.coordinate[1]})`;
        case 'mouse_move':
            return `Move mouse to coordinates (${action.coordinate[0]}, ${action.coordinate[1]})`;
        case 'type':
            return `Type the text: "${action.text}"`;
        case 'key':
            return `Press the key combination: ${action.text}`;
        case 'scroll':
            return `Scroll at (${action.coordinate[0]}, ${action.coordinate[1]}) by delta (${action.delta_x}, ${action.delta_y})`;
        case 'wait':
            return 'Wait for the screen to update';
    }
}

// ── Convenience: all computer use tools as a record ─────────────
export const computerUseTools = {
    computer_action: computerAction,
    computer_screenshot: computerScreenshot,
} as const;

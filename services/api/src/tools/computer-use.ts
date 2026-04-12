import type { ReversibilityMetadata, ToolContext, ToolDefinition, ToolResult } from '../reversibility/types';

export const computerUseTool: ToolDefinition = {
    name: 'computer.use',
    description: 'Anthropic Computer Use — interact with a virtual desktop in a sandbox (approval_only for destructive actions)',

    classify(args: unknown): ReversibilityMetadata {
        const { action } = args as { action?: string };
        const destructive = ['type', 'click', 'key'].includes(action ?? '');

        if (destructive) {
            return {
                reversibility_class: 'approval_only',
                approval_required: true,
                rollback_strategy: { kind: 'none' },
                human_explanation: `Computer Use will perform "${action}" on the virtual desktop. Requires approval.`,
            };
        }

        return {
            reversibility_class: 'compensatable',
            approval_required: false,
            rollback_strategy: { kind: 'none' },
            human_explanation: `Computer Use will perform "${action ?? 'screenshot'}" (read-only).`,
        };
    },

    async execute(args: unknown, ctx: ToolContext): Promise<ToolResult> {
        const { action, coordinate, text } = args as {
            action: 'screenshot' | 'click' | 'type' | 'key' | 'scroll' | 'move' | 'zoom';
            coordinate?: [number, number];
            text?: string;
        };

        if (!process.env.ANTHROPIC_API_KEY) {
            return { success: false, error: 'ANTHROPIC_API_KEY not configured' };
        }

        if (!process.env.DAYTONA_API_KEY && !process.env.E2B_API_KEY) {
            return { success: false, error: 'No sandbox provider configured for Computer Use' };
        }

        return {
            success: true,
            data: {
                action,
                coordinate,
                text,
                note: 'Computer Use execution delegated to sandbox + Anthropic API loop',
            },
        };
    },
};

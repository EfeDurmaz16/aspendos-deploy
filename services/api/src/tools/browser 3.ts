import type {
    ReversibilityMetadata,
    ToolContext,
    ToolDefinition,
    ToolResult,
} from '../reversibility/types';

export const browserTool: ToolDefinition = {
    name: 'browser.navigate',
    description: 'Navigate to a URL and extract content using Steel.dev (compensatable)',

    classify(_args: unknown): ReversibilityMetadata {
        return {
            reversibility_class: 'compensatable',
            approval_required: false,
            rollback_strategy: {
                kind: 'compensation',
                compensate_tool: 'browser.close_session',
                compensate_args: {},
            },
            human_explanation: 'Browser session will be created. Can be closed to compensate.',
        };
    },

    async execute(args: unknown, ctx: ToolContext): Promise<ToolResult> {
        const { url, action } = args as {
            url: string;
            action?: 'navigate' | 'screenshot' | 'extract';
        };

        if (!url) return { success: false, error: 'Missing url' };

        const apiKey = process.env.STEEL_API_KEY;
        if (!apiKey) {
            return { success: false, error: 'STEEL_API_KEY not configured' };
        }

        try {
            const Steel = await import('steel-sdk');
            const client = new Steel.default({ steelAPIKey: apiKey });
            const session = await client.sessions.create();

            return {
                success: true,
                data: {
                    sessionId: session.id,
                    url,
                    action: action ?? 'navigate',
                },
            };
        } catch (e: any) {
            return { success: false, error: e?.message ?? 'Steel.dev request failed' };
        }
    },
};

import { gateway, stepCountIs, ToolLoopAgent, tool } from 'ai';
import { z } from 'zod';
import type { ToolContext } from '../reversibility/types';
import { registerAllTools } from '../tools/register-all';
import { registry } from '../tools/registry';
import { runToolStep } from './step';

registerAllTools();

function createAgentTools(userId: string) {
    const toolDefs: Record<string, ReturnType<typeof tool>> = {};

    for (const t of registry.list()) {
        toolDefs[t.name] = tool({
            description: t.description,
            inputSchema: z.object({}).passthrough(),
            execute: async (args) => {
                const ctx: ToolContext = { userId };
                const result = await runToolStep(t.name, args, ctx);

                if (result.blocked) {
                    return {
                        status: 'blocked',
                        reason: result.metadata.human_explanation,
                        class: result.metadata.reversibility_class,
                    };
                }

                if (result.awaitingApproval) {
                    return {
                        status: 'awaiting_approval',
                        commitHash: result.commitHash,
                        class: result.metadata.reversibility_class,
                        explanation: result.metadata.human_explanation,
                    };
                }

                return {
                    status: 'executed',
                    commitHash: result.commitHash,
                    class: result.metadata.reversibility_class,
                    data: result.result.data,
                };
            },
        });
    }

    return toolDefs;
}

export function createYulaAgent(userId: string, model?: string) {
    const agentTools = createAgentTools(userId);

    return new ToolLoopAgent({
        model: gateway(model ?? 'anthropic/claude-sonnet-4.6'),
        instructions: `You are YULA, a deterministic AI agent. Every action you take is cryptographically signed and committed to an audit log. Users can undo, verify, and inspect everything you do.

When using tools:
- Check the reversibility class in the result
- If "blocked", explain why to the user
- If "awaiting_approval", tell the user their approval is needed
- If "executed", report what happened and note it can be undone/verified

Be transparent about what you're doing and why.`,
        tools: agentTools,
        stopWhen: stepCountIs(20),
        onStepFinish: async ({ stepNumber, usage }) => {
            console.log(`[YULA] Step ${stepNumber}: ${usage?.totalTokens ?? 0} tokens`);
        },
    });
}

export { createAgentTools };

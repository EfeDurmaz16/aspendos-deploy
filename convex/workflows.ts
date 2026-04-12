import { WorkflowManager } from '@convex-dev/workflow';
import { components, internal } from './_generated/api';
import { v } from 'convex/values';
import { internalMutation } from './_generated/server';

export const workflow = new WorkflowManager(components.workflow);

export const agentTask = workflow.define({
    args: {
        user_id: v.id('users'),
        tool_name: v.string(),
        tool_args: v.any(),
        commit_hash: v.string(),
        requires_approval: v.boolean(),
    },
    handler: async (step, args) => {
        await step.runMutation(internal.workflows.recordPreCommit, {
            user_id: args.user_id,
            tool_name: args.tool_name,
            commit_hash: args.commit_hash,
        });

        if (args.requires_approval) {
            await step.runMutation(internal.workflows.createApprovalRequest, {
                user_id: args.user_id,
                commit_hash: args.commit_hash,
            });

            const approval = await step.waitForEvent('approval_received', {
                timeoutMs: 5 * 60 * 1000,
            });

            if (!approval || (approval as any).status === 'rejected') {
                await step.runMutation(internal.workflows.recordPostCommit, {
                    commit_hash: args.commit_hash,
                    status: 'failed',
                    result: { error: 'Rejected by user' },
                });
                return { success: false, reason: 'rejected' };
            }
        }

        await step.runMutation(internal.workflows.recordPostCommit, {
            commit_hash: args.commit_hash,
            status: 'executed',
            result: { tool_name: args.tool_name },
        });

        return { success: true, commit_hash: args.commit_hash };
    },
});

export const recordPreCommit = internalMutation({
    args: {
        user_id: v.id('users'),
        tool_name: v.string(),
        commit_hash: v.string(),
    },
    handler: async (ctx, args) => {
        await ctx.db.insert('action_log', {
            user_id: args.user_id,
            event_type: 'agent_task_pre_commit',
            details: { tool_name: args.tool_name, commit_hash: args.commit_hash },
            timestamp: Date.now(),
        });
    },
});

export const createApprovalRequest = internalMutation({
    args: {
        user_id: v.id('users'),
        commit_hash: v.string(),
    },
    handler: async (ctx, args) => {
        await ctx.db.insert('approvals', {
            user_id: args.user_id,
            commit_hash: args.commit_hash,
            surface: 'workflow',
            expires_at: Date.now() + 5 * 60 * 1000,
            status: 'pending',
        });
    },
});

export const recordPostCommit = internalMutation({
    args: {
        commit_hash: v.string(),
        status: v.string(),
        result: v.any(),
    },
    handler: async (ctx, args) => {
        await ctx.db.insert('action_log', {
            event_type: 'agent_task_post_commit',
            details: {
                commit_hash: args.commit_hash,
                status: args.status,
                result: args.result,
            },
            timestamp: Date.now(),
        });
    },
});

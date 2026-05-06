import { WorkflowManager } from '@convex-dev/workflow';
import { v } from 'convex/values';
import { components } from './_generated/api';
import { internalMutation } from './_generated/server';

export const workflow = new WorkflowManager(components.workflow);

const RETIRED_WORKFLOW_ERROR =
    'Legacy workflow execution is retired: append execution outcomes through governance.signAndCommit with an external FIDES signature';

export const agentTask = workflow.define({
    args: {
        user_id: v.id('users'),
        tool_name: v.string(),
        tool_args: v.any(),
        commit_hash: v.string(),
        requires_approval: v.boolean(),
    },
    handler: async (_step, args) => {
        void args;
        throw new Error(RETIRED_WORKFLOW_ERROR);
    },
});

export const recordPreCommit = internalMutation({
    args: {
        user_id: v.id('users'),
        tool_name: v.string(),
        commit_hash: v.string(),
    },
    handler: async (ctx, args) => {
        void ctx;
        void args;
        throw new Error(RETIRED_WORKFLOW_ERROR);
    },
});

export const createApprovalRequest = internalMutation({
    args: {
        user_id: v.id('users'),
        commit_hash: v.string(),
    },
    handler: async (ctx, args) => {
        void ctx;
        void args;
        throw new Error(RETIRED_WORKFLOW_ERROR);
    },
});

export const recordPostCommit = internalMutation({
    args: {
        commit_hash: v.string(),
        status: v.string(),
        result: v.any(),
    },
    handler: async (ctx, args) => {
        void ctx;
        void args;
        throw new Error(RETIRED_WORKFLOW_ERROR);
    },
});

/**
 * Approval API Routes
 *
 * Handles human-in-the-loop approval workflow for agent operations.
 */

import { Hono } from 'hono';
import { requireAuth } from '../middleware/auth';
import { validateParams } from '../middleware/validate';
import * as approvalService from '../services/approval.service';
import { approvalIdParamSchema, toolAllowlistParamSchema } from '../validation/approvals.schema';

const approvalRoutes = new Hono();

type ApprovalView = {
    id?: string;
    _id?: string;
    userId?: string;
    user_id?: string;
    status?: string;
    toolName?: string;
    tool_name?: string;
};

function approvalOwnerId(approval: ApprovalView): string | undefined {
    return approval.userId ?? approval.user_id;
}

function approvalStatus(approval: ApprovalView): string | undefined {
    return approval.status?.toLowerCase();
}

function approvalDecisionId(approval: ApprovalView, fallbackId: string): string {
    return approval._id ?? approval.id ?? fallbackId;
}

function approvalToolName(approval: ApprovalView): string | undefined {
    return approval.toolName ?? approval.tool_name;
}

// All routes require auth
approvalRoutes.use('*', requireAuth);

// GET /approvals - List pending approvals
approvalRoutes.get('/', async (c) => {
    const userId = c.get('userId') as string;
    const approvals = await approvalService.getPendingApprovals(userId);
    return c.json({ approvals });
});

// POST /approvals/:id/approve - Approve a pending request
approvalRoutes.post('/:id/approve', validateParams(approvalIdParamSchema), async (c) => {
    const userId = c.get('userId') as string;
    const { id: approvalId } = c.get('validatedParams') as { id: string };

    const approval = await approvalService.getApproval(approvalId);
    if (!approval || approvalOwnerId(approval) !== userId) {
        return c.json({ error: 'Approval not found' }, 404);
    }
    if (approvalStatus(approval) !== 'pending') {
        return c.json({ error: `Approval is already ${approval.status}` }, 400);
    }

    const result = await approvalService.approveRequest(
        approvalDecisionId(approval, approvalId),
        userId
    );

    // Check if user wants to "always allow" this tool
    const alwaysAllow = c.req.query('always_allow') === 'true';
    const toolName = approvalToolName(approval);
    if (alwaysAllow && toolName) {
        await approvalService.addToAllowlist(userId, toolName, 'permanent');
    }

    return c.json({ approval: result });
});

// POST /approvals/:id/reject - Reject a pending request
approvalRoutes.post('/:id/reject', validateParams(approvalIdParamSchema), async (c) => {
    const userId = c.get('userId') as string;
    const { id: approvalId } = c.get('validatedParams') as { id: string };

    const approval = await approvalService.getApproval(approvalId);
    if (!approval || approvalOwnerId(approval) !== userId) {
        return c.json({ error: 'Approval not found' }, 404);
    }
    if (approvalStatus(approval) !== 'pending') {
        return c.json({ error: `Approval is already ${approval.status}` }, 400);
    }

    const result = await approvalService.rejectRequest(
        approvalDecisionId(approval, approvalId),
        userId
    );
    return c.json({ approval: result });
});

// GET /approvals/allowlist - Get tool allowlist
approvalRoutes.get('/allowlist', async (c) => {
    const userId = c.get('userId') as string;
    const allowlist = await approvalService.getAllowlist(userId);
    return c.json({ allowlist });
});

// DELETE /approvals/allowlist/:toolName - Remove tool from allowlist
approvalRoutes.delete(
    '/allowlist/:toolName',
    validateParams(toolAllowlistParamSchema),
    async (c) => {
        const userId = c.get('userId') as string;
        const { toolName } = c.get('validatedParams') as { toolName: string };
        await approvalService.removeFromAllowlist(userId, toolName);
        return c.json({ success: true });
    }
);

export default approvalRoutes;

/**
 * Approval API Routes
 *
 * Handles human-in-the-loop approval workflow for agent operations.
 */

import { Hono } from 'hono';
import { requireAuth } from '../middleware/auth';
import * as approvalService from '../services/approval.service';

const approvalRoutes = new Hono();

// All routes require auth
approvalRoutes.use('*', requireAuth);

// GET /approvals - List pending approvals
approvalRoutes.get('/', async (c) => {
    const userId = c.get('userId') as string;
    const approvals = await approvalService.getPendingApprovals(userId);
    return c.json({ approvals });
});

// POST /approvals/:id/approve - Approve a pending request
approvalRoutes.post('/:id/approve', async (c) => {
    const userId = c.get('userId') as string;
    const approvalId = c.req.param('id');

    const approval = await approvalService.getApproval(approvalId);
    if (!approval || approval.userId !== userId) {
        return c.json({ error: 'Approval not found' }, 404);
    }
    if (approval.status !== 'PENDING') {
        return c.json({ error: `Approval is already ${approval.status}` }, 400);
    }

    const result = await approvalService.approveRequest(approvalId, userId);

    // Check if user wants to "always allow" this tool
    const alwaysAllow = c.req.query('always_allow') === 'true';
    if (alwaysAllow) {
        await approvalService.addToAllowlist(userId, approval.toolName, 'permanent');
    }

    return c.json({ approval: result });
});

// POST /approvals/:id/reject - Reject a pending request
approvalRoutes.post('/:id/reject', async (c) => {
    const userId = c.get('userId') as string;
    const approvalId = c.req.param('id');

    const approval = await approvalService.getApproval(approvalId);
    if (!approval || approval.userId !== userId) {
        return c.json({ error: 'Approval not found' }, 404);
    }
    if (approval.status !== 'PENDING') {
        return c.json({ error: `Approval is already ${approval.status}` }, 400);
    }

    const result = await approvalService.rejectRequest(approvalId, userId);
    return c.json({ approval: result });
});

// GET /approvals/allowlist - Get tool allowlist
approvalRoutes.get('/allowlist', async (c) => {
    const userId = c.get('userId') as string;
    const allowlist = await approvalService.getAllowlist(userId);
    return c.json({ allowlist });
});

// DELETE /approvals/allowlist/:toolName - Remove tool from allowlist
approvalRoutes.delete('/allowlist/:toolName', async (c) => {
    const userId = c.get('userId') as string;
    const toolName = c.req.param('toolName');
    await approvalService.removeFromAllowlist(userId, toolName);
    return c.json({ success: true });
});

export default approvalRoutes;

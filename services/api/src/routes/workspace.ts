/**
 * Workspace API Routes
 * Handles workspace and team collaboration operations.
 */

import { Hono } from 'hono';
import { requireAuth } from '../middleware/auth';
import * as workspaceService from '../services/workspace.service';

type Variables = {
    userId: string | null;
};

const app = new Hono<{ Variables: Variables }>();

// Apply auth middleware to all routes
app.use('*', requireAuth);

// POST /api/workspace - Create workspace
app.post('/', async (c) => {
    const userId = c.get('userId')!;

    try {
        const body = await c.req.json();
        const { name } = body;

        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            return c.json({ error: 'Workspace name is required' }, 400);
        }

        if (name.length > 100) {
            return c.json({ error: 'Workspace name must be 100 characters or less' }, 400);
        }

        const workspace = await workspaceService.createWorkspace(name.trim(), userId);

        return c.json({ workspace }, 201);
    } catch (error) {
        console.error('[Workspace] Create failed:', error);
        return c.json({ error: 'Failed to create workspace' }, 500);
    }
});

// GET /api/workspace - List user's workspaces
app.get('/', async (c) => {
    const userId = c.get('userId')!;

    try {
        const workspaces = await workspaceService.getUserWorkspaces(userId);
        return c.json({ workspaces });
    } catch (error) {
        console.error('[Workspace] List failed:', error);
        return c.json({ error: 'Failed to fetch workspaces' }, 500);
    }
});

// GET /api/workspace/:id - Get workspace details
app.get('/:id', async (c) => {
    const userId = c.get('userId')!;
    const workspaceId = c.req.param('id');

    try {
        const result = await workspaceService.getWorkspace(workspaceId);

        if (!result) {
            return c.json({ error: 'Workspace not found' }, 404);
        }

        // Check if user has access to this workspace
        const isMember = result.members.some((m) => m.userId === userId);
        if (!isMember) {
            return c.json({ error: 'Access denied' }, 403);
        }

        return c.json(result);
    } catch (error) {
        console.error('[Workspace] Get failed:', error);
        return c.json({ error: 'Failed to fetch workspace' }, 500);
    }
});

// PATCH /api/workspace/:id - Update workspace name
app.patch('/:id', async (c) => {
    const userId = c.get('userId')!;
    const workspaceId = c.req.param('id');

    try {
        const body = await c.req.json();
        const { name } = body;

        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            return c.json({ error: 'Workspace name is required' }, 400);
        }

        if (name.length > 100) {
            return c.json({ error: 'Workspace name must be 100 characters or less' }, 400);
        }

        // Check if user has admin permission
        const hasPermission = await workspaceService.checkPermission(workspaceId, userId, 'admin');
        if (!hasPermission) {
            return c.json({ error: 'Access denied. Admin permission required.' }, 403);
        }

        const workspace = await workspaceService.updateWorkspace(workspaceId, name.trim());

        if (!workspace) {
            return c.json({ error: 'Workspace not found' }, 404);
        }

        return c.json({ workspace });
    } catch (error) {
        console.error('[Workspace] Update failed:', error);
        return c.json({ error: 'Failed to update workspace' }, 500);
    }
});

// DELETE /api/workspace/:id - Delete workspace (owner only)
app.delete('/:id', async (c) => {
    const userId = c.get('userId')!;
    const workspaceId = c.req.param('id');

    try {
        // Check if user is the owner
        const hasPermission = await workspaceService.checkPermission(workspaceId, userId, 'owner');
        if (!hasPermission) {
            return c.json({ error: 'Access denied. Only workspace owner can delete.' }, 403);
        }

        const success = await workspaceService.deleteWorkspace(workspaceId);

        if (!success) {
            return c.json({ error: 'Workspace not found' }, 404);
        }

        return c.json({ success: true });
    } catch (error) {
        console.error('[Workspace] Delete failed:', error);
        return c.json({ error: 'Failed to delete workspace' }, 500);
    }
});

// POST /api/workspace/:id/members - Add member to workspace
app.post('/:id/members', async (c) => {
    const userId = c.get('userId')!;
    const workspaceId = c.req.param('id');

    try {
        const body = await c.req.json();
        const { userId: newUserId, role } = body;

        if (!newUserId || typeof newUserId !== 'string') {
            return c.json({ error: 'User ID is required' }, 400);
        }

        if (!role || !['admin', 'member', 'viewer'].includes(role)) {
            return c.json({ error: 'Invalid role. Must be admin, member, or viewer.' }, 400);
        }

        // Check if user has admin permission
        const hasPermission = await workspaceService.checkPermission(workspaceId, userId, 'admin');
        if (!hasPermission) {
            return c.json({ error: 'Access denied. Admin permission required.' }, 403);
        }

        const member = await workspaceService.addMember(workspaceId, newUserId, role);

        if (!member) {
            return c.json({ error: 'Workspace not found' }, 404);
        }

        return c.json({ member }, 201);
    } catch (error) {
        if (
            error instanceof Error &&
            error.message === 'User is already a member of this workspace'
        ) {
            return c.json({ error: error.message }, 409);
        }
        console.error('[Workspace] Add member failed:', error);
        return c.json({ error: 'Failed to add member' }, 500);
    }
});

// DELETE /api/workspace/:id/members/:userId - Remove member from workspace
app.delete('/:id/members/:userId', async (c) => {
    const userId = c.get('userId')!;
    const workspaceId = c.req.param('id');
    const memberUserId = c.req.param('userId');

    try {
        // Check if user has admin permission
        const hasPermission = await workspaceService.checkPermission(workspaceId, userId, 'admin');
        if (!hasPermission) {
            return c.json({ error: 'Access denied. Admin permission required.' }, 403);
        }

        const success = await workspaceService.removeMember(workspaceId, memberUserId);

        if (!success) {
            return c.json({ error: 'Member not found' }, 404);
        }

        return c.json({ success: true });
    } catch (error) {
        if (error instanceof Error && error.message === 'Cannot remove workspace owner') {
            return c.json({ error: error.message }, 400);
        }
        console.error('[Workspace] Remove member failed:', error);
        return c.json({ error: 'Failed to remove member' }, 500);
    }
});

// PATCH /api/workspace/:id/members/:userId - Update member role
app.patch('/:id/members/:userId', async (c) => {
    const userId = c.get('userId')!;
    const workspaceId = c.req.param('id');
    const memberUserId = c.req.param('userId');

    try {
        const body = await c.req.json();
        const { role } = body;

        if (!role || !['admin', 'member', 'viewer'].includes(role)) {
            return c.json({ error: 'Invalid role. Must be admin, member, or viewer.' }, 400);
        }

        // Check if user has admin permission
        const hasPermission = await workspaceService.checkPermission(workspaceId, userId, 'admin');
        if (!hasPermission) {
            return c.json({ error: 'Access denied. Admin permission required.' }, 403);
        }

        const member = await workspaceService.updateMemberRole(workspaceId, memberUserId, role);

        if (!member) {
            return c.json({ error: 'Member not found' }, 404);
        }

        return c.json({ member });
    } catch (error) {
        if (
            error instanceof Error &&
            (error.message === 'Cannot change owner role' ||
                error.message === 'Cannot assign owner role. Transfer ownership instead.')
        ) {
            return c.json({ error: error.message }, 400);
        }
        console.error('[Workspace] Update member role failed:', error);
        return c.json({ error: 'Failed to update member role' }, 500);
    }
});

export default app;

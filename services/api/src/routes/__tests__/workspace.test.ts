/**
 * Workspace Routes Tests
 *
 * Tests for workspace CRUD, member management, and permission checks.
 */

import { Hono } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Hoist mock variables so they're available in vi.mock factories
const { mockGetSession } = vi.hoisted(() => ({
    mockGetSession: vi.fn(),
}));

// Mock auth library
vi.mock('../../lib/auth', () => ({
    auth: {
        api: {
            getSession: mockGetSession,
        },
    },
}));

// Mock service BEFORE importing the route
vi.mock('../../services/workspace.service', () => ({
    createWorkspace: vi.fn(),
    getUserWorkspaces: vi.fn(),
    getWorkspace: vi.fn(),
    updateWorkspace: vi.fn(),
    deleteWorkspace: vi.fn(),
    addMember: vi.fn(),
    removeMember: vi.fn(),
    updateMemberRole: vi.fn(),
    checkPermission: vi.fn(),
}));

// Now import after mocks are set up
import * as workspaceService from '../../services/workspace.service';
import workspaceRoutes from '../workspace';

const mockService = workspaceService as any;

function createTestApp() {
    const app = new Hono();
    app.route('/workspace', workspaceRoutes);
    return app;
}

describe('Workspace Routes', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Default: authenticated user
        mockGetSession.mockResolvedValue({
            user: { id: 'test-user-1', email: 'test@yula.dev', name: 'Test User' },
            session: { id: 'sess-1', expiresAt: new Date(Date.now() + 86400000) },
        });
    });

    describe('POST /workspace - Create workspace', () => {
        it('should return 401 when user is not authenticated', async () => {
            mockGetSession.mockResolvedValueOnce(null);
            const app = createTestApp();

            const res = await app.request('/workspace', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: 'My Workspace' }),
            });

            expect(res.status).toBe(401);
        });

        it('should return 400 when name is missing', async () => {
            const app = createTestApp();

            const res = await app.request('/workspace', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({}),
            });

            expect(res.status).toBe(400);
            const body = await res.json();
            expect(body.error).toBe('Workspace name is required');
        });

        it('should return 400 when name is empty string', async () => {
            const app = createTestApp();

            const res = await app.request('/workspace', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: '   ' }),
            });

            expect(res.status).toBe(400);
            const body = await res.json();
            expect(body.error).toBe('Workspace name is required');
        });

        it('should return 400 when name exceeds 100 characters', async () => {
            const app = createTestApp();
            const longName = 'a'.repeat(101);

            const res = await app.request('/workspace', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: longName }),
            });

            expect(res.status).toBe(400);
            const body = await res.json();
            expect(body.error).toContain('100 characters');
        });

        it('should create workspace successfully and return 201', async () => {
            const mockWorkspace = {
                id: 'ws-1',
                name: 'My Workspace',
                ownerId: 'test-user-1',
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            mockService.createWorkspace.mockResolvedValue(mockWorkspace);
            const app = createTestApp();

            const res = await app.request('/workspace', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: 'My Workspace' }),
            });

            expect(res.status).toBe(201);
            const body = await res.json();
            expect(body.workspace.name).toBe('My Workspace');
            expect(mockService.createWorkspace).toHaveBeenCalledWith('My Workspace', 'test-user-1');
        });

        it('should trim workspace name before creating', async () => {
            const mockWorkspace = {
                id: 'ws-1',
                name: 'Trimmed Name',
                ownerId: 'test-user-1',
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            mockService.createWorkspace.mockResolvedValue(mockWorkspace);
            const app = createTestApp();

            await app.request('/workspace', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: '  Trimmed Name  ' }),
            });

            expect(mockService.createWorkspace).toHaveBeenCalledWith('Trimmed Name', 'test-user-1');
        });

        it('should return 500 when service throws', async () => {
            mockService.createWorkspace.mockRejectedValue(new Error('DB error'));
            const app = createTestApp();

            const res = await app.request('/workspace', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: 'Test' }),
            });

            expect(res.status).toBe(500);
            const body = await res.json();
            expect(body.error).toBe('Failed to create workspace');
        });
    });

    describe('GET /workspace - List workspaces', () => {
        it('should return empty array when user has no workspaces', async () => {
            mockService.getUserWorkspaces.mockResolvedValue([]);
            const app = createTestApp();

            const res = await app.request('/workspace');

            expect(res.status).toBe(200);
            const body = await res.json();
            expect(body.workspaces).toEqual([]);
        });

        it('should return user workspaces successfully', async () => {
            mockService.getUserWorkspaces.mockResolvedValue([
                { id: 'ws-1', name: 'Workspace 1' },
                { id: 'ws-2', name: 'Workspace 2' },
            ]);
            const app = createTestApp();

            const res = await app.request('/workspace');

            expect(res.status).toBe(200);
            const body = await res.json();
            expect(body.workspaces).toHaveLength(2);
        });

        it('should return 500 when service throws', async () => {
            mockService.getUserWorkspaces.mockRejectedValue(new Error('DB error'));
            const app = createTestApp();

            const res = await app.request('/workspace');

            expect(res.status).toBe(500);
            const body = await res.json();
            expect(body.error).toBe('Failed to fetch workspaces');
        });
    });

    describe('GET /workspace/:id - Get workspace details', () => {
        it('should return 404 when workspace does not exist', async () => {
            mockService.getWorkspace.mockResolvedValue(null);
            const app = createTestApp();

            const res = await app.request('/workspace/ws-nonexistent');

            expect(res.status).toBe(404);
            const body = await res.json();
            expect(body.error).toBe('Workspace not found');
        });

        it('should return 403 when user is not a member', async () => {
            mockService.getWorkspace.mockResolvedValue({
                workspace: { id: 'ws-1', name: 'Private WS' },
                members: [{ userId: 'other-user', role: 'owner' }],
            });
            const app = createTestApp();

            const res = await app.request('/workspace/ws-1');

            expect(res.status).toBe(403);
            const body = await res.json();
            expect(body.error).toBe('Access denied');
        });

        it('should return workspace details when user is a member', async () => {
            const mockResult = {
                workspace: { id: 'ws-1', name: 'Team WS' },
                members: [
                    { userId: 'test-user-1', role: 'admin' },
                    { userId: 'other-user', role: 'member' },
                ],
            };
            mockService.getWorkspace.mockResolvedValue(mockResult);
            const app = createTestApp();

            const res = await app.request('/workspace/ws-1');

            expect(res.status).toBe(200);
            const body = await res.json();
            expect(body.workspace.name).toBe('Team WS');
        });
    });

    describe('PATCH /workspace/:id - Update workspace', () => {
        it('should return 403 when user lacks admin permission', async () => {
            mockService.checkPermission.mockResolvedValue(false);
            const app = createTestApp();

            const res = await app.request('/workspace/ws-1', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: 'New Name' }),
            });

            expect(res.status).toBe(403);
            const body = await res.json();
            expect(body.error).toContain('Admin permission required');
        });

        it('should return 400 when name is missing', async () => {
            const app = createTestApp();

            const res = await app.request('/workspace/ws-1', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({}),
            });

            expect(res.status).toBe(400);
        });

        it('should update workspace name successfully', async () => {
            mockService.checkPermission.mockResolvedValue(true);
            mockService.updateWorkspace.mockResolvedValue({
                id: 'ws-1',
                name: 'Updated Name',
            });
            const app = createTestApp();

            const res = await app.request('/workspace/ws-1', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: 'Updated Name' }),
            });

            expect(res.status).toBe(200);
            const body = await res.json();
            expect(body.workspace.name).toBe('Updated Name');
        });

        it('should return 404 when workspace not found during update', async () => {
            mockService.checkPermission.mockResolvedValue(true);
            mockService.updateWorkspace.mockResolvedValue(null);
            const app = createTestApp();

            const res = await app.request('/workspace/ws-1', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: 'New Name' }),
            });

            expect(res.status).toBe(404);
        });
    });

    describe('DELETE /workspace/:id - Delete workspace', () => {
        it('should return 403 when user is not the owner', async () => {
            mockService.checkPermission.mockResolvedValue(false);
            const app = createTestApp();

            const res = await app.request('/workspace/ws-1', { method: 'DELETE' });

            expect(res.status).toBe(403);
            const body = await res.json();
            expect(body.error).toContain('Only workspace owner');
        });

        it('should delete workspace successfully', async () => {
            mockService.checkPermission.mockResolvedValue(true);
            mockService.deleteWorkspace.mockResolvedValue(true);
            const app = createTestApp();

            const res = await app.request('/workspace/ws-1', { method: 'DELETE' });

            expect(res.status).toBe(200);
            const body = await res.json();
            expect(body.success).toBe(true);
        });

        it('should return 404 when workspace not found during delete', async () => {
            mockService.checkPermission.mockResolvedValue(true);
            mockService.deleteWorkspace.mockResolvedValue(false);
            const app = createTestApp();

            const res = await app.request('/workspace/ws-1', { method: 'DELETE' });

            expect(res.status).toBe(404);
        });
    });

    describe('POST /workspace/:id/members - Add member', () => {
        it('should return 400 when userId is missing', async () => {
            const app = createTestApp();

            const res = await app.request('/workspace/ws-1/members', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role: 'member' }),
            });

            expect(res.status).toBe(400);
            const body = await res.json();
            expect(body.error).toBe('User ID is required');
        });

        it('should return 400 when role is invalid', async () => {
            const app = createTestApp();

            const res = await app.request('/workspace/ws-1/members', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: 'user-2', role: 'superadmin' }),
            });

            expect(res.status).toBe(400);
            const body = await res.json();
            expect(body.error).toContain('Invalid role');
        });

        it('should return 403 when user lacks admin permission to add members', async () => {
            mockService.checkPermission.mockResolvedValue(false);
            const app = createTestApp();

            const res = await app.request('/workspace/ws-1/members', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: 'user-2', role: 'member' }),
            });

            expect(res.status).toBe(403);
        });

        it('should add member successfully and return 201', async () => {
            mockService.checkPermission.mockResolvedValue(true);
            mockService.addMember.mockResolvedValue({
                workspaceId: 'ws-1',
                userId: 'user-2',
                role: 'member',
                joinedAt: new Date(),
            });
            const app = createTestApp();

            const res = await app.request('/workspace/ws-1/members', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: 'user-2', role: 'member' }),
            });

            expect(res.status).toBe(201);
            const body = await res.json();
            expect(body.member.role).toBe('member');
        });

        it('should return 409 when user is already a member', async () => {
            mockService.checkPermission.mockResolvedValue(true);
            mockService.addMember.mockRejectedValue(
                new Error('User is already a member of this workspace')
            );
            const app = createTestApp();

            const res = await app.request('/workspace/ws-1/members', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: 'user-2', role: 'member' }),
            });

            expect(res.status).toBe(409);
        });
    });

    describe('DELETE /workspace/:id/members/:userId - Remove member', () => {
        it('should return 403 when user lacks admin permission', async () => {
            mockService.checkPermission.mockResolvedValue(false);
            const app = createTestApp();

            const res = await app.request('/workspace/ws-1/members/user-2', {
                method: 'DELETE',
            });

            expect(res.status).toBe(403);
        });

        it('should remove member successfully', async () => {
            mockService.checkPermission.mockResolvedValue(true);
            mockService.removeMember.mockResolvedValue(true);
            const app = createTestApp();

            const res = await app.request('/workspace/ws-1/members/user-2', {
                method: 'DELETE',
            });

            expect(res.status).toBe(200);
            const body = await res.json();
            expect(body.success).toBe(true);
        });

        it('should return 400 when trying to remove workspace owner', async () => {
            mockService.checkPermission.mockResolvedValue(true);
            mockService.removeMember.mockRejectedValue(
                new Error('Cannot remove workspace owner')
            );
            const app = createTestApp();

            const res = await app.request('/workspace/ws-1/members/owner-user', {
                method: 'DELETE',
            });

            expect(res.status).toBe(400);
            const body = await res.json();
            expect(body.error).toBe('Cannot remove workspace owner');
        });
    });

    describe('PATCH /workspace/:id/members/:userId - Update member role', () => {
        it('should return 400 when role is invalid', async () => {
            const app = createTestApp();

            const res = await app.request('/workspace/ws-1/members/user-2', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role: 'owner' }),
            });

            expect(res.status).toBe(400);
            const body = await res.json();
            expect(body.error).toContain('Invalid role');
        });

        it('should update member role successfully', async () => {
            mockService.checkPermission.mockResolvedValue(true);
            mockService.updateMemberRole.mockResolvedValue({
                workspaceId: 'ws-1',
                userId: 'user-2',
                role: 'admin',
            });
            const app = createTestApp();

            const res = await app.request('/workspace/ws-1/members/user-2', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role: 'admin' }),
            });

            expect(res.status).toBe(200);
            const body = await res.json();
            expect(body.member.role).toBe('admin');
        });

        it('should return 400 when trying to change owner role', async () => {
            mockService.checkPermission.mockResolvedValue(true);
            mockService.updateMemberRole.mockRejectedValue(
                new Error('Cannot change owner role')
            );
            const app = createTestApp();

            const res = await app.request('/workspace/ws-1/members/owner-user', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role: 'member' }),
            });

            expect(res.status).toBe(400);
            const body = await res.json();
            expect(body.error).toBe('Cannot change owner role');
        });
    });
});

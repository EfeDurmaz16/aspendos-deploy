/**
 * Workspace Service Tests
 * Tests workspace CRUD, member management, role hierarchy, and permissions
 */

import { beforeEach, describe, expect, it } from 'vitest';
import * as workspaceService from '../workspace.service';

describe('Workspace Service', () => {
    // Test data
    const userId1 = 'user_1';
    const userId2 = 'user_2';
    const userId3 = 'user_3';

    beforeEach(async () => {
        // Note: Since we're using in-memory storage, we need to clear state between tests
        // This would need to be implemented in the service for proper test isolation
        // For now, tests should be independent and use unique workspace names
    });

    describe('Workspace CRUD', () => {
        it('should create a workspace', async () => {
            const workspace = await workspaceService.createWorkspace('Test Workspace', userId1);

            expect(workspace).toBeDefined();
            expect(workspace.id).toBeDefined();
            expect(workspace.name).toBe('Test Workspace');
            expect(workspace.ownerId).toBe(userId1);
            expect(workspace.createdAt).toBeInstanceOf(Date);
            expect(workspace.updatedAt).toBeInstanceOf(Date);
        });

        it('should get workspace with members', async () => {
            const created = await workspaceService.createWorkspace('Get Test', userId1);
            const result = await workspaceService.getWorkspace(created.id);

            expect(result).not.toBeNull();
            expect(result!.workspace.id).toBe(created.id);
            expect(result!.members).toHaveLength(1);
            expect(result!.members[0].userId).toBe(userId1);
            expect(result!.members[0].role).toBe('owner');
        });

        it('should return null for non-existent workspace', async () => {
            const result = await workspaceService.getWorkspace('non_existent_id');
            expect(result).toBeNull();
        });

        it('should get user workspaces', async () => {
            const ws1 = await workspaceService.createWorkspace('User WS 1', userId1);
            const ws2 = await workspaceService.createWorkspace('User WS 2', userId1);

            const workspaces = await workspaceService.getUserWorkspaces(userId1);

            expect(workspaces.length).toBeGreaterThanOrEqual(2);
            const ids = workspaces.map((w) => w.id);
            expect(ids).toContain(ws1.id);
            expect(ids).toContain(ws2.id);
        });

        it('should return empty array for user with no workspaces', async () => {
            const workspaces = await workspaceService.getUserWorkspaces('user_no_workspaces');
            expect(workspaces).toEqual([]);
        });

        it('should update workspace name', async () => {
            const workspace = await workspaceService.createWorkspace('Original Name', userId1);
            const updated = await workspaceService.updateWorkspace(workspace.id, 'Updated Name');

            expect(updated).not.toBeNull();
            expect(updated!.name).toBe('Updated Name');
            expect(updated!.updatedAt.getTime()).toBeGreaterThanOrEqual(
                workspace.updatedAt.getTime()
            );
        });

        it('should return null when updating non-existent workspace', async () => {
            const result = await workspaceService.updateWorkspace('non_existent', 'New Name');
            expect(result).toBeNull();
        });

        it('should delete workspace', async () => {
            const workspace = await workspaceService.createWorkspace('To Delete', userId1);
            const deleted = await workspaceService.deleteWorkspace(workspace.id);

            expect(deleted).toBe(true);

            const result = await workspaceService.getWorkspace(workspace.id);
            expect(result).toBeNull();
        });

        it('should return false when deleting non-existent workspace', async () => {
            const result = await workspaceService.deleteWorkspace('non_existent');
            expect(result).toBe(false);
        });
    });

    describe('Member Management', () => {
        it('should add member to workspace', async () => {
            const workspace = await workspaceService.createWorkspace('Member Test', userId1);
            const member = await workspaceService.addMember(workspace.id, userId2, 'member');

            expect(member).not.toBeNull();
            expect(member!.userId).toBe(userId2);
            expect(member!.workspaceId).toBe(workspace.id);
            expect(member!.role).toBe('member');
            expect(member!.joinedAt).toBeInstanceOf(Date);
        });

        it('should add admin member to workspace', async () => {
            const workspace = await workspaceService.createWorkspace('Admin Test', userId1);
            const member = await workspaceService.addMember(workspace.id, userId2, 'admin');

            expect(member).not.toBeNull();
            expect(member!.role).toBe('admin');
        });

        it('should add viewer member to workspace', async () => {
            const workspace = await workspaceService.createWorkspace('Viewer Test', userId1);
            const member = await workspaceService.addMember(workspace.id, userId2, 'viewer');

            expect(member).not.toBeNull();
            expect(member!.role).toBe('viewer');
        });

        it('should not add duplicate member', async () => {
            const workspace = await workspaceService.createWorkspace('Duplicate Test', userId1);
            await workspaceService.addMember(workspace.id, userId2, 'member');

            await expect(
                workspaceService.addMember(workspace.id, userId2, 'admin')
            ).rejects.toThrow('User is already a member of this workspace');
        });

        it('should return null when adding member to non-existent workspace', async () => {
            const result = await workspaceService.addMember('non_existent', userId2, 'member');
            expect(result).toBeNull();
        });

        it('should remove member from workspace', async () => {
            const workspace = await workspaceService.createWorkspace('Remove Test', userId1);
            await workspaceService.addMember(workspace.id, userId2, 'member');

            const removed = await workspaceService.removeMember(workspace.id, userId2);
            expect(removed).toBe(true);

            const result = await workspaceService.getWorkspace(workspace.id);
            expect(result!.members).toHaveLength(1); // Only owner remains
        });

        it('should not remove workspace owner', async () => {
            const workspace = await workspaceService.createWorkspace('Owner Remove Test', userId1);

            await expect(workspaceService.removeMember(workspace.id, userId1)).rejects.toThrow(
                'Cannot remove workspace owner'
            );
        });

        it('should return false when removing non-existent member', async () => {
            const workspace = await workspaceService.createWorkspace(
                'Remove Non-existent',
                userId1
            );
            const result = await workspaceService.removeMember(workspace.id, 'non_existent_user');
            expect(result).toBe(false);
        });

        it('should update member role', async () => {
            const workspace = await workspaceService.createWorkspace('Role Update Test', userId1);
            await workspaceService.addMember(workspace.id, userId2, 'member');

            const updated = await workspaceService.updateMemberRole(workspace.id, userId2, 'admin');

            expect(updated).not.toBeNull();
            expect(updated!.role).toBe('admin');
        });

        it('should not change owner role', async () => {
            const workspace = await workspaceService.createWorkspace('Owner Role Test', userId1);

            await expect(
                workspaceService.updateMemberRole(workspace.id, userId1, 'admin')
            ).rejects.toThrow('Cannot change owner role');
        });

        it('should not assign owner role', async () => {
            const workspace = await workspaceService.createWorkspace('Assign Owner Test', userId1);
            await workspaceService.addMember(workspace.id, userId2, 'member');

            await expect(
                workspaceService.updateMemberRole(workspace.id, userId2, 'owner')
            ).rejects.toThrow('Cannot assign owner role. Transfer ownership instead.');
        });

        it('should return null when updating role in non-existent workspace', async () => {
            const result = await workspaceService.updateMemberRole(
                'non_existent',
                userId2,
                'admin'
            );
            expect(result).toBeNull();
        });

        it('should return null when updating non-existent member', async () => {
            const workspace = await workspaceService.createWorkspace('Update Non-member', userId1);
            const result = await workspaceService.updateMemberRole(workspace.id, userId2, 'admin');
            expect(result).toBeNull();
        });
    });

    describe('Role Hierarchy and Permissions', () => {
        it('should grant owner all permissions', async () => {
            const workspace = await workspaceService.createWorkspace('Owner Permission', userId1);

            expect(await workspaceService.checkPermission(workspace.id, userId1, 'owner')).toBe(
                true
            );
            expect(await workspaceService.checkPermission(workspace.id, userId1, 'admin')).toBe(
                true
            );
            expect(await workspaceService.checkPermission(workspace.id, userId1, 'member')).toBe(
                true
            );
            expect(await workspaceService.checkPermission(workspace.id, userId1, 'viewer')).toBe(
                true
            );
        });

        it('should enforce admin permissions', async () => {
            const workspace = await workspaceService.createWorkspace('Admin Permission', userId1);
            await workspaceService.addMember(workspace.id, userId2, 'admin');

            expect(await workspaceService.checkPermission(workspace.id, userId2, 'owner')).toBe(
                false
            );
            expect(await workspaceService.checkPermission(workspace.id, userId2, 'admin')).toBe(
                true
            );
            expect(await workspaceService.checkPermission(workspace.id, userId2, 'member')).toBe(
                true
            );
            expect(await workspaceService.checkPermission(workspace.id, userId2, 'viewer')).toBe(
                true
            );
        });

        it('should enforce member permissions', async () => {
            const workspace = await workspaceService.createWorkspace('Member Permission', userId1);
            await workspaceService.addMember(workspace.id, userId2, 'member');

            expect(await workspaceService.checkPermission(workspace.id, userId2, 'owner')).toBe(
                false
            );
            expect(await workspaceService.checkPermission(workspace.id, userId2, 'admin')).toBe(
                false
            );
            expect(await workspaceService.checkPermission(workspace.id, userId2, 'member')).toBe(
                true
            );
            expect(await workspaceService.checkPermission(workspace.id, userId2, 'viewer')).toBe(
                true
            );
        });

        it('should enforce viewer permissions', async () => {
            const workspace = await workspaceService.createWorkspace('Viewer Permission', userId1);
            await workspaceService.addMember(workspace.id, userId2, 'viewer');

            expect(await workspaceService.checkPermission(workspace.id, userId2, 'owner')).toBe(
                false
            );
            expect(await workspaceService.checkPermission(workspace.id, userId2, 'admin')).toBe(
                false
            );
            expect(await workspaceService.checkPermission(workspace.id, userId2, 'member')).toBe(
                false
            );
            expect(await workspaceService.checkPermission(workspace.id, userId2, 'viewer')).toBe(
                true
            );
        });

        it('should deny permission to non-members', async () => {
            const workspace = await workspaceService.createWorkspace('Non-member Check', userId1);

            expect(await workspaceService.checkPermission(workspace.id, userId3, 'viewer')).toBe(
                false
            );
        });

        it('should return false for non-existent workspace', async () => {
            const result = await workspaceService.checkPermission(
                'non_existent',
                userId1,
                'viewer'
            );
            expect(result).toBe(false);
        });

        it('should get member details', async () => {
            const workspace = await workspaceService.createWorkspace('Get Member', userId1);
            await workspaceService.addMember(workspace.id, userId2, 'admin');

            const member = await workspaceService.getMember(workspace.id, userId2);

            expect(member).not.toBeNull();
            expect(member!.userId).toBe(userId2);
            expect(member!.role).toBe('admin');
        });

        it('should return null for non-existent member', async () => {
            const workspace = await workspaceService.createWorkspace('Get Non-member', userId1);
            const member = await workspaceService.getMember(workspace.id, userId2);
            expect(member).toBeNull();
        });
    });

    describe('Edge Cases', () => {
        it('should handle workspace with multiple members', async () => {
            const workspace = await workspaceService.createWorkspace('Multi-member', userId1);
            await workspaceService.addMember(workspace.id, userId2, 'admin');
            await workspaceService.addMember(workspace.id, userId3, 'member');

            const result = await workspaceService.getWorkspace(workspace.id);
            expect(result!.members).toHaveLength(3); // owner + 2 members
        });

        it('should list workspaces where user is member but not owner', async () => {
            const workspace = await workspaceService.createWorkspace('Another User WS', userId1);
            await workspaceService.addMember(workspace.id, userId2, 'member');

            const workspaces = await workspaceService.getUserWorkspaces(userId2);
            const ids = workspaces.map((w) => w.id);
            expect(ids).toContain(workspace.id);
        });

        it('should delete workspace with multiple members', async () => {
            const workspace = await workspaceService.createWorkspace('Delete Multi', userId1);
            await workspaceService.addMember(workspace.id, userId2, 'admin');
            await workspaceService.addMember(workspace.id, userId3, 'member');

            const deleted = await workspaceService.deleteWorkspace(workspace.id);
            expect(deleted).toBe(true);

            // Verify members are also deleted
            const result = await workspaceService.getWorkspace(workspace.id);
            expect(result).toBeNull();
        });

        it('should handle empty workspace name gracefully in routes', async () => {
            // This test documents expected behavior - routes should validate
            // The service itself doesn't validate empty names
            const workspace = await workspaceService.createWorkspace('', userId1);
            expect(workspace.name).toBe('');
        });

        it('should track workspace update time', async () => {
            const workspace = await workspaceService.createWorkspace('Update Time', userId1);
            const originalTime = workspace.updatedAt;

            // Small delay to ensure timestamp difference
            await new Promise((resolve) => setTimeout(resolve, 10));

            const updated = await workspaceService.updateWorkspace(workspace.id, 'New Name');
            expect(updated!.updatedAt.getTime()).toBeGreaterThanOrEqual(originalTime.getTime());
        });
    });
});

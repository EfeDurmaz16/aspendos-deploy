/**
 * Workspace Service
 * Handles workspace and team collaboration operations.
 * Currently using in-memory storage as placeholder until Prisma schema is updated.
 */

type Role = 'owner' | 'admin' | 'member' | 'viewer';

interface Workspace {
    id: string;
    name: string;
    ownerId: string;
    createdAt: Date;
    updatedAt: Date;
}

interface WorkspaceMember {
    workspaceId: string;
    userId: string;
    role: Role;
    joinedAt: Date;
}

// In-memory storage (placeholder until schema is updated)
const workspaces = new Map<string, Workspace>();
const workspaceMembers = new Map<string, WorkspaceMember[]>();

/**
 * Generate a unique ID
 */
function generateId(): string {
    return `ws_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Create a new workspace
 */
export async function createWorkspace(name: string, ownerId: string): Promise<Workspace> {
    const id = generateId();
    const now = new Date();

    const workspace: Workspace = {
        id,
        name,
        ownerId,
        createdAt: now,
        updatedAt: now,
    };

    workspaces.set(id, workspace);

    // Add owner as member
    const ownerMember: WorkspaceMember = {
        workspaceId: id,
        userId: ownerId,
        role: 'owner',
        joinedAt: now,
    };

    workspaceMembers.set(id, [ownerMember]);

    return workspace;
}

/**
 * Get workspace by ID with members
 */
export async function getWorkspace(workspaceId: string): Promise<{
    workspace: Workspace;
    members: WorkspaceMember[];
} | null> {
    const workspace = workspaces.get(workspaceId);
    if (!workspace) return null;

    const members = workspaceMembers.get(workspaceId) || [];

    return { workspace, members };
}

/**
 * Get all workspaces user belongs to
 */
export async function getUserWorkspaces(userId: string): Promise<Workspace[]> {
    const userWorkspaceIds = new Set<string>();

    // Find all workspaces where user is a member
    for (const [workspaceId, members] of workspaceMembers.entries()) {
        if (members.some((m) => m.userId === userId)) {
            userWorkspaceIds.add(workspaceId);
        }
    }

    // Get workspace details
    const userWorkspaces: Workspace[] = [];
    for (const workspaceId of userWorkspaceIds) {
        const workspace = workspaces.get(workspaceId);
        if (workspace) {
            userWorkspaces.push(workspace);
        }
    }

    return userWorkspaces;
}

/**
 * Update workspace name
 */
export async function updateWorkspace(
    workspaceId: string,
    name: string
): Promise<Workspace | null> {
    const workspace = workspaces.get(workspaceId);
    if (!workspace) return null;

    workspace.name = name;
    workspace.updatedAt = new Date();

    workspaces.set(workspaceId, workspace);

    return workspace;
}

/**
 * Delete workspace
 */
export async function deleteWorkspace(workspaceId: string): Promise<boolean> {
    const deleted = workspaces.delete(workspaceId);
    workspaceMembers.delete(workspaceId);
    return deleted;
}

/**
 * Add member to workspace
 */
export async function addMember(
    workspaceId: string,
    userId: string,
    role: Role
): Promise<WorkspaceMember | null> {
    const workspace = workspaces.get(workspaceId);
    if (!workspace) return null;

    const members = workspaceMembers.get(workspaceId) || [];

    // Check if user is already a member
    const existingMember = members.find((m) => m.userId === userId);
    if (existingMember) {
        throw new Error('User is already a member of this workspace');
    }

    const member: WorkspaceMember = {
        workspaceId,
        userId,
        role,
        joinedAt: new Date(),
    };

    members.push(member);
    workspaceMembers.set(workspaceId, members);

    return member;
}

/**
 * Remove member from workspace
 */
export async function removeMember(workspaceId: string, userId: string): Promise<boolean> {
    const members = workspaceMembers.get(workspaceId);
    if (!members) return false;

    // Check if user is the owner
    const member = members.find((m) => m.userId === userId);
    if (member?.role === 'owner') {
        throw new Error('Cannot remove workspace owner');
    }

    const filtered = members.filter((m) => m.userId !== userId);

    if (filtered.length === members.length) {
        return false; // User was not a member
    }

    workspaceMembers.set(workspaceId, filtered);
    return true;
}

/**
 * Update member role
 */
export async function updateMemberRole(
    workspaceId: string,
    userId: string,
    role: Role
): Promise<WorkspaceMember | null> {
    const members = workspaceMembers.get(workspaceId);
    if (!members) return null;

    const member = members.find((m) => m.userId === userId);
    if (!member) return null;

    // Cannot change owner role
    if (member.role === 'owner') {
        throw new Error('Cannot change owner role');
    }

    // Cannot change to owner role
    if (role === 'owner') {
        throw new Error('Cannot assign owner role. Transfer ownership instead.');
    }

    member.role = role;
    workspaceMembers.set(workspaceId, members);

    return member;
}

/**
 * Check if user has required permission
 * Role hierarchy: owner > admin > member > viewer
 */
export async function checkPermission(
    workspaceId: string,
    userId: string,
    requiredRole: Role
): Promise<boolean> {
    const members = workspaceMembers.get(workspaceId);
    if (!members) return false;

    const member = members.find((m) => m.userId === userId);
    if (!member) return false;

    const roleHierarchy: Record<Role, number> = {
        owner: 4,
        admin: 3,
        member: 2,
        viewer: 1,
    };

    return roleHierarchy[member.role] >= roleHierarchy[requiredRole];
}

/**
 * Get member in workspace
 */
export async function getMember(
    workspaceId: string,
    userId: string
): Promise<WorkspaceMember | null> {
    const members = workspaceMembers.get(workspaceId);
    if (!members) return null;

    return members.find((m) => m.userId === userId) || null;
}

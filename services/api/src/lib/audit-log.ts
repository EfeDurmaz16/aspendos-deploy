/**
 * Audit Log Infrastructure
 *
 * Logs security-sensitive actions for compliance and incident response.
 * Persists to database and optionally to external logging services.
 */

import { prisma } from '@aspendos/db';

export interface AuditLogParams {
    userId: string;
    action: string;
    resource: string;
    resourceId?: string;
    metadata?: Record<string, unknown>;
    ip?: string;
}

/**
 * Log an audit event.
 *
 * Persists to database for compliance and audit trails.
 * Fails open to prevent breaking requests if audit logging fails.
 */
export async function auditLog(params: AuditLogParams): Promise<void> {
    try {
        await prisma.auditLog.create({
            data: {
                userId: params.userId,
                action: params.action,
                resource: params.resource,
                resourceId: params.resourceId,
                ip: params.ip,
                metadata: params.metadata ? JSON.parse(JSON.stringify(params.metadata)) : undefined,
            },
        });
    } catch (error) {
        // Fail-open: don't break the request if audit logging fails
        console.error('[AuditLog] Failed to persist:', error);
    }
}

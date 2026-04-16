/**
 * db-migrate — Approval Only tool
 *
 * Runs a database migration. The SQL is shown in an approval card
 * and requires explicit human approval before execution. The agent
 * will NOT execute this on its own.
 *
 * Reversibility: approval_only (red badge)
 * Rollback: manual — migration rollback must be handled by the user
 */

import type { ReversibleToolDef, AgitCommit } from '@/lib/reversibility/types';

export const dbMigrate: ReversibleToolDef = {
    name: 'db-migrate',
    description: 'Run a database migration. Requires human approval before execution.',
    reversibility_class: 'approval_only',

    classify(args: Record<string, unknown>) {
        const sql = (args.sql as string) ?? '';
        const isDDL = /\b(CREATE|ALTER|DROP|TRUNCATE)\b/i.test(sql);
        const isDestructive = /\b(DROP|TRUNCATE|DELETE\s+FROM)\b/i.test(sql);

        return {
            reversibility_class: 'approval_only' as const,
            rollback_strategy: {
                kind: 'manual' as const,
                instructions: isDestructive
                    ? 'DESTRUCTIVE migration. Restore from backup if reversal is needed.'
                    : 'Review the migration and apply a manual rollback migration if needed.',
            },
            human_explanation: isDestructive
                ? `DESTRUCTIVE migration: ${sql.slice(0, 120)}${sql.length > 120 ? '...' : ''}`
                : `Database migration: ${sql.slice(0, 120)}${sql.length > 120 ? '...' : ''}`,
        };
    },

    async execute(args: Record<string, unknown>) {
        const sql = args.sql as string;
        const migrationName = args.name as string | undefined;
        const approvalId = args.approval_id as string | undefined;

        if (!sql) {
            return { success: false, error: 'Missing required arg: sql' };
        }

        // Approval-only tools MUST have an approval_id from the approval flow
        if (!approvalId) {
            return {
                success: false,
                error: 'db-migrate requires human approval. Submit for approval first.',
            };
        }

        // Verify the approval is valid
        try {
            const approvalRes = await fetch(`/api/approvals/${approvalId}`);
            if (!approvalRes.ok) {
                return { success: false, error: 'Approval not found or expired.' };
            }

            const approval = await approvalRes.json();
            if (approval.status !== 'approved') {
                return {
                    success: false,
                    error: `Approval status is "${approval.status}" — must be "approved".`,
                };
            }
        } catch (err) {
            return {
                success: false,
                error: `Approval check failed: ${err instanceof Error ? err.message : String(err)}`,
            };
        }

        // Execute the migration
        try {
            const res = await fetch('/api/db/migrate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sql,
                    name: migrationName,
                    approval_id: approvalId,
                }),
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                return {
                    success: false,
                    error: `Migration failed: ${errData.message ?? res.statusText}`,
                };
            }

            const data = await res.json();
            return {
                success: true,
                data: {
                    migration_id: data.migration_id,
                    name: migrationName,
                    rows_affected: data.rows_affected,
                    executed_at: new Date().toISOString(),
                },
            };
        } catch (err) {
            return {
                success: false,
                error: `Migration error: ${err instanceof Error ? err.message : String(err)}`,
            };
        }
    },

    // No automated rollback — approval_only tools require manual intervention
    async rollback(_commit: AgitCommit) {
        return {
            success: false,
            message:
                'Database migrations cannot be automatically reversed. ' +
                'Create a new migration to undo the changes, or restore from a backup.',
        };
    },
};

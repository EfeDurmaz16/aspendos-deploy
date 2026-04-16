import type {
    ReversibilityMetadata,
    ToolContext,
    ToolDefinition,
    ToolResult,
} from '../reversibility/types';

export const dbMigrateTool: ToolDefinition = {
    name: 'db.migrate',
    description: 'Run a database migration (approval_only — requires human counter-sign)',

    classify(_args: unknown): ReversibilityMetadata {
        return {
            reversibility_class: 'approval_only',
            approval_required: true,
            rollback_strategy: { kind: 'none' },
            human_explanation:
                'Database migration requires human approval before execution. Provide a reverse migration manually.',
        };
    },

    async execute(args: unknown, _ctx: ToolContext): Promise<ToolResult> {
        const { migration_sql, description } = args as {
            migration_sql: string;
            description?: string;
        };

        if (!migration_sql) {
            return { success: false, error: 'Missing migration_sql' };
        }

        return {
            success: true,
            data: {
                description: description ?? 'Migration executed',
                sql: migration_sql,
                applied_at: new Date().toISOString(),
            },
        };
    },
};

import { api, getConvexClient, isConvexConfigured } from '../lib/convex';
import type { ReversibilityMetadata, ToolResult } from '../reversibility/types';
import { isProductionRuntime } from './canonical';

export interface ConvexGovernanceCommitInput {
    userId: string;
    toolName: string;
    args: unknown;
    metadata: ReversibilityMetadata;
    status?: 'pending' | 'executed' | 'failed';
    result?: ToolResult;
}

export interface ConvexGovernanceCommit {
    commitHash: string;
    source: 'convex';
}

export async function commitConvexGovernance(
    input: ConvexGovernanceCommitInput
): Promise<ConvexGovernanceCommit | null> {
    if (!isConvexConfigured()) {
        if (isProductionRuntime()) {
            throw new Error('Convex governance is required in production');
        }
        return null;
    }

    try {
        const client = getConvexClient();
        const user = await client.query(api.users.getByWorkOSId, { workos_id: input.userId });
        if (!user?._id) {
            if (isProductionRuntime()) {
                throw new Error('Convex user is required for governance commit');
            }
            return null;
        }

        const commit = await client.mutation(api.governance.signAndCommit, {
            user_id: user._id,
            tool_name: input.toolName,
            args: input.args,
            reversibility_class: input.metadata.reversibility_class,
            rollback_strategy: input.metadata.rollback_strategy,
            rollback_deadline: input.metadata.rollback_deadline
                ? new Date(input.metadata.rollback_deadline).getTime()
                : undefined,
            human_explanation: input.metadata.human_explanation,
            status: input.status ?? 'pending',
            result: input.result,
        });

        return {
            commitHash: commit.commitHash,
            source: 'convex',
        };
    } catch (error) {
        if (isProductionRuntime()) {
            throw error;
        }
        return null;
    }
}

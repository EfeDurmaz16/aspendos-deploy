import type {
    ReversibilityMetadata,
    ToolContext,
    ToolDefinition,
    ToolResult,
} from '../reversibility/types';

const BLOCK_THRESHOLD_CENTS = 5000;

export const stripeChargeTool: ToolDefinition = {
    name: 'stripe.charge',
    description: 'Create a Stripe charge — blocked above $50, compensatable via refund below',

    classify(args: unknown): ReversibilityMetadata {
        const { amount } = args as { amount?: number };
        const cents = amount ?? 0;

        if (cents > BLOCK_THRESHOLD_CENTS) {
            return {
                reversibility_class: 'irreversible_blocked',
                approval_required: true,
                rollback_strategy: { kind: 'none' },
                human_explanation: `Charge of $${(cents / 100).toFixed(2)} exceeds the $${(BLOCK_THRESHOLD_CENTS / 100).toFixed(2)} automated threshold. This action is blocked.`,
            };
        }

        return {
            reversibility_class: 'compensatable',
            approval_required: false,
            rollback_strategy: {
                kind: 'compensation',
                compensate_tool: 'stripe.refund',
                compensate_args: {},
            },
            human_explanation: `Charge of $${(cents / 100).toFixed(2)} can be refunded within Stripe's refund window.`,
        };
    },

    async execute(args: unknown, ctx: ToolContext): Promise<ToolResult> {
        const { amount, currency, customer_id, description } = args as {
            amount: number;
            currency?: string;
            customer_id: string;
            description?: string;
        };

        if (!amount || !customer_id) {
            return { success: false, error: 'Missing amount or customer_id' };
        }

        if (amount > BLOCK_THRESHOLD_CENTS) {
            return {
                success: false,
                error: `Blocked: $${(amount / 100).toFixed(2)} exceeds $${(BLOCK_THRESHOLD_CENTS / 100).toFixed(2)} threshold`,
            };
        }

        const chargeId = `ch_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        return {
            success: true,
            data: {
                chargeId,
                amount,
                currency: currency ?? 'usd',
                customer_id,
                description,
            },
        };
    },
};

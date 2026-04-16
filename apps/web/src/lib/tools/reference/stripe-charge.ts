/**
 * stripe-charge — Irreversible Blocked tool
 *
 * Charges a customer via Stripe. The agent REFUSES to execute charges
 * above the safety threshold ($50) without explicit human override.
 * Below the threshold, it downgrades to approval_only.
 *
 * Reversibility: irreversible_blocked (blocked badge)
 * Rollback: none — financial transactions cannot be automatically reversed
 */

import type { ReversibleToolDef, AgitCommit, ReversibilityClass } from '@/lib/reversibility/types';

const BLOCK_THRESHOLD_CENTS = 5_000; // $50.00

export const stripeCharge: ReversibleToolDef = {
    name: 'stripe-charge',
    description: 'Charge a customer via Stripe. Blocked above $50 without explicit approval.',
    reversibility_class: 'irreversible_blocked',

    classify(args: Record<string, unknown>) {
        const amountCents = (args.amount as number) ?? 0;
        const amountDollars = amountCents / 100;
        const isAboveThreshold = amountCents > BLOCK_THRESHOLD_CENTS;

        const reversibility_class: ReversibilityClass = isAboveThreshold
            ? 'irreversible_blocked'
            : 'approval_only';

        return {
            reversibility_class,
            rollback_strategy: { kind: 'none' as const },
            human_explanation: isAboveThreshold
                ? `BLOCKED: Stripe charge of $${amountDollars.toFixed(2)} exceeds the $${(BLOCK_THRESHOLD_CENTS / 100).toFixed(2)} safety limit. Agent refuses to execute.`
                : `Stripe charge of $${amountDollars.toFixed(2)} to ${args.customer_id ?? 'unknown customer'}. Requires approval.`,
        };
    },

    async execute(args: Record<string, unknown>) {
        const amountCents = (args.amount as number) ?? 0;
        const customerId = args.customer_id as string;
        const currency = (args.currency as string) ?? 'usd';
        const description = args.description as string | undefined;
        const approvalId = args.approval_id as string | undefined;

        // Hard block above threshold
        if (amountCents > BLOCK_THRESHOLD_CENTS) {
            return {
                success: false,
                error: `BLOCKED: $${(amountCents / 100).toFixed(2)} exceeds the $${(BLOCK_THRESHOLD_CENTS / 100).toFixed(2)} safety limit. The agent will not execute this charge. Use the Stripe dashboard directly.`,
            };
        }

        if (!customerId) {
            return { success: false, error: 'Missing required arg: customer_id' };
        }

        if (!amountCents || amountCents <= 0) {
            return { success: false, error: 'Amount must be a positive integer (in cents).' };
        }

        // Below threshold still requires approval
        if (!approvalId) {
            return {
                success: false,
                error: 'Stripe charges require human approval. Submit for approval first.',
            };
        }

        // Verify approval
        try {
            const approvalRes = await fetch(`/api/approvals/${approvalId}`);
            if (!approvalRes.ok) {
                return { success: false, error: 'Approval not found or expired.' };
            }
            const approval = await approvalRes.json();
            if (approval.status !== 'approved') {
                return { success: false, error: `Approval is "${approval.status}", not approved.` };
            }
        } catch (err) {
            return {
                success: false,
                error: `Approval check failed: ${err instanceof Error ? err.message : String(err)}`,
            };
        }

        // Create the charge
        try {
            const res = await fetch('/api/billing/charge', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    customer_id: customerId,
                    amount: amountCents,
                    currency,
                    description,
                    approval_id: approvalId,
                }),
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                return {
                    success: false,
                    error: `Charge failed: ${errData.message ?? res.statusText}`,
                };
            }

            const data = await res.json();
            return {
                success: true,
                data: {
                    charge_id: data.charge_id ?? data.id,
                    amount_cents: amountCents,
                    currency,
                    customer_id: customerId,
                    receipt_url: data.receipt_url,
                },
            };
        } catch (err) {
            return {
                success: false,
                error: `Charge error: ${err instanceof Error ? err.message : String(err)}`,
            };
        }
    },

    // Financial transactions cannot be auto-reversed
    async rollback(_commit: AgitCommit) {
        return {
            success: false,
            message:
                'Stripe charges cannot be automatically reversed by the agent. ' +
                'Use the Stripe dashboard to issue a refund if needed.',
        };
    },
};

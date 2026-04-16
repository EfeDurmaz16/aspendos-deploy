/**
 * email-send — Cancelable Window tool
 *
 * Queues an email with a 30-second hold before actual dispatch.
 * During the window the user can cancel. After the window, the email
 * is dispatched and cannot be recalled.
 *
 * Reversibility: cancelable_window (yellow badge)
 * Rollback: cancel_window — cancel the queued email before deadline
 */

import type { ReversibleToolDef, AgitCommit } from '@/lib/reversibility/types';

const DEFAULT_CANCEL_WINDOW_MS = 30_000; // 30 seconds

export const emailSend: ReversibleToolDef = {
    name: 'email-send',
    description: 'Send an email with a 30s cancel window before actual dispatch.',
    reversibility_class: 'cancelable_window',

    classify(args: Record<string, unknown>) {
        const deadline = Date.now() + DEFAULT_CANCEL_WINDOW_MS;
        return {
            reversibility_class: 'cancelable_window' as const,
            rollback_strategy: {
                kind: 'cancel_window' as const,
                deadline_ms: deadline,
                cancel_endpoint: '/api/email/cancel',
            },
            human_explanation: `Send email to ${args.to ?? 'unknown'}. Subject: "${args.subject ?? ''}". 30s cancel window.`,
        };
    },

    async execute(args: Record<string, unknown>) {
        const to = args.to as string;
        const subject = args.subject as string;
        const body = args.body as string;

        if (!to || !subject || !body) {
            return { success: false, error: 'Missing required args: to, subject, body' };
        }

        // Queue the email (not sent yet — held for cancel window)
        try {
            const res = await fetch('/api/email/queue', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    to,
                    subject,
                    body,
                    send_after: Date.now() + DEFAULT_CANCEL_WINDOW_MS,
                }),
            });

            if (!res.ok) {
                return { success: false, error: `Queue failed: ${res.statusText}` };
            }

            const data = await res.json();
            return {
                success: true,
                data: {
                    queue_id: data.queue_id,
                    to,
                    subject,
                    sends_at: new Date(Date.now() + DEFAULT_CANCEL_WINDOW_MS).toISOString(),
                },
            };
        } catch (err) {
            return {
                success: false,
                error: `Queue error: ${err instanceof Error ? err.message : String(err)}`,
            };
        }
    },

    async rollback(commit: AgitCommit) {
        const strategy = commit.rollback_strategy;
        if (!strategy || strategy.kind !== 'cancel_window') {
            return { success: false, message: 'No cancel window strategy found.' };
        }

        // Check if window has expired
        if (Date.now() > strategy.deadline_ms) {
            return {
                success: false,
                message: 'Cancel window has expired. The email has already been sent.',
            };
        }

        try {
            const result = commit.result as Record<string, unknown> | undefined;
            const queueId = result?.queue_id as string | undefined;

            const res = await fetch(strategy.cancel_endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    queue_id: queueId,
                    commit_hash: commit.hash,
                }),
            });

            if (!res.ok) {
                return { success: false, message: 'Cancellation request failed.' };
            }

            return {
                success: true,
                message: `Email cancelled before send deadline.`,
                reverted_commit_hash: commit.hash,
            };
        } catch (err) {
            return {
                success: false,
                message: `Cancel error: ${err instanceof Error ? err.message : String(err)}`,
            };
        }
    },
};

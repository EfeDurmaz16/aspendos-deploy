import type {
    ReverseResult,
    ReversibilityMetadata,
    ToolContext,
    ToolDefinition,
    ToolResult,
} from '../reversibility/types';

const CANCEL_WINDOW_MS = 30_000;
const pendingEmails = new Map<
    string,
    { to: string; subject: string; deadline: number; canceled: boolean }
>();

export const emailSendTool: ToolDefinition = {
    name: 'email.send',
    description: 'Send an email with a 30-second cancel window',

    classify(_args: unknown): ReversibilityMetadata {
        const deadline = new Date(Date.now() + CANCEL_WINDOW_MS).toISOString();
        return {
            reversibility_class: 'cancelable_window',
            approval_required: false,
            rollback_strategy: {
                kind: 'cancel_window',
                deadline,
                cancel_api: 'email.cancel',
            },
            rollback_deadline: deadline,
            human_explanation: `Email will be queued with a ${CANCEL_WINDOW_MS / 1000}s cancel window.`,
        };
    },

    async execute(args: unknown, ctx: ToolContext): Promise<ToolResult> {
        const { to, subject, body } = args as { to: string; subject: string; body: string };

        if (!to || !subject) {
            return { success: false, error: 'Missing to or subject' };
        }

        const emailId = `email_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        pendingEmails.set(emailId, {
            to,
            subject,
            deadline: Date.now() + CANCEL_WINDOW_MS,
            canceled: false,
        });

        return {
            success: true,
            data: {
                emailId,
                to,
                subject,
                cancelDeadline: new Date(Date.now() + CANCEL_WINDOW_MS).toISOString(),
            },
        };
    },

    async reverse(actionId: string, _ctx: ToolContext): Promise<ReverseResult> {
        const pending = pendingEmails.get(actionId);
        if (!pending) {
            return { success: false, message: 'Email not found in pending queue' };
        }

        if (Date.now() > pending.deadline) {
            return { success: false, message: 'Cancel window expired — email already sent' };
        }

        pending.canceled = true;
        pendingEmails.delete(actionId);
        return { success: true, message: `Email to ${pending.to} canceled before sending` };
    },
};

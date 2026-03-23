/**
 * Email Gateway
 *
 * Uses Resend for email delivery.
 * Wraps existing email infrastructure into the MessagingGateway interface.
 */

import type { DeliveryResult, InboundMessage, MessageContent, MessagingGateway } from './gateway';

export class EmailGateway implements MessagingGateway {
    platform = 'email';

    async sendMessage(emailAddress: string, content: MessageContent): Promise<DeliveryResult> {
        try {
            const apiKey = process.env.RESEND_API_KEY;
            const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@yula.dev';

            if (!apiKey) {
                return { success: false, error: 'Resend not configured', platform: this.platform };
            }

            const subject =
                content.type === 'approval_request'
                    ? 'YULA - Approval Required'
                    : content.type === 'proactive'
                      ? 'YULA - Reminder'
                      : 'YULA - Notification';

            // Build HTML email
            let html = `<div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">`;
            html += `<h2 style="color: #333; margin-bottom: 16px;">${subject}</h2>`;
            html += `<p style="color: #555; line-height: 1.6; white-space: pre-wrap;">${escapeHtml(content.text)}</p>`;

            if (content.actions && content.actions.length > 0) {
                html += `<div style="margin-top: 24px;">`;
                for (const action of content.actions) {
                    const color =
                        action.action === 'approve'
                            ? '#22c55e'
                            : action.action === 'reject'
                              ? '#ef4444'
                              : '#6b7280';
                    html += `<a href="https://yula.dev/api/approvals/${action.value}/${action.action}" style="display: inline-block; padding: 10px 20px; margin-right: 8px; background: ${color}; color: white; text-decoration: none; border-radius: 6px; font-size: 14px;">${escapeHtml(action.label)}</a>`;
                }
                html += `</div>`;
            }

            html += `<p style="color: #999; font-size: 12px; margin-top: 32px;">Sent by YULA AI - yula.dev</p>`;
            html += `</div>`;

            const response = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                    from: `YULA <${fromEmail}>`,
                    to: [emailAddress],
                    subject,
                    html,
                }),
            });

            if (!response.ok) {
                const error = await response.text();
                return { success: false, error, platform: this.platform };
            }

            const data = (await response.json()) as { id?: string };
            return { success: true, messageId: data.id, platform: this.platform };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                platform: this.platform,
            };
        }
    }

    async sendApprovalRequest(
        emailAddress: string,
        approvalId: string,
        reason: string,
        toolName: string
    ): Promise<DeliveryResult> {
        return this.sendMessage(emailAddress, {
            text: `Tool: ${toolName}\n\nReason: ${reason}\n\nPlease approve or reject this action.`,
            type: 'approval_request',
            actions: [
                { label: 'Approve', action: 'approve', value: approvalId },
                { label: 'Reject', action: 'reject', value: approvalId },
            ],
        });
    }

    parseInboundMessage(_rawEvent: unknown): InboundMessage | null {
        // Email doesn't support inbound messages via webhook
        return null;
    }
}

function escapeHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

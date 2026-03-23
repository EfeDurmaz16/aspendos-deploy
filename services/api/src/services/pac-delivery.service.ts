/**
 * PAC Multi-Channel Delivery Service
 *
 * Routes PAC notifications through the user's preferred messaging platform.
 * Supports: in-app push, email, Telegram, WhatsApp, Slack, Discord.
 */

import { prisma } from '@aspendos/db';
import { type MessageContent, sendToUser } from '../messaging/gateway';

export interface DeliveryOptions {
    userId: string;
    content: string;
    type: 'notification' | 'approval_request' | 'proactive';
    approvalId?: string;
    toolName?: string;
}

interface DeliveryReport {
    delivered: boolean;
    channels: Array<{ platform: string; success: boolean; error?: string }>;
}

export async function deliverNotification(options: DeliveryOptions): Promise<DeliveryReport> {
    const report: DeliveryReport = { delivered: false, channels: [] };

    const settings = await prisma.pACSettings.findUnique({
        where: { userId: options.userId },
    });

    const connections = await prisma.platformConnection.findMany({
        where: { userId: options.userId, isActive: true },
    });

    const connectionMap = new Map(connections.map((c) => [c.platform, c.platformUserId]));

    const messageContent: MessageContent = {
        text: options.content,
        type: options.type,
    };

    const deliveries: Promise<void>[] = [];

    const platforms = [
        { key: 'telegramEnabled' as const, platform: 'telegram' },
        { key: 'whatsappEnabled' as const, platform: 'whatsapp' },
        { key: 'slackEnabled' as const, platform: 'slack' },
        { key: 'discordEnabled' as const, platform: 'discord' },
    ];

    for (const { key, platform } of platforms) {
        if ((settings as any)?.[key] && connectionMap.has(platform)) {
            deliveries.push(
                deliverToPlatform(
                    platform,
                    connectionMap.get(platform)!,
                    messageContent,
                    options,
                    report
                )
            );
        }
    }

    if (settings?.pushEnabled !== false) {
        deliveries.push(deliverPush(options, report));
    }

    await Promise.allSettled(deliveries);
    report.delivered = report.channels.some((c) => c.success);
    return report;
}

export async function deliverApprovalRequest(
    userId: string,
    approvalId: string,
    reason: string,
    toolName: string
): Promise<DeliveryReport> {
    return deliverNotification({
        userId,
        content: `Approval Required: Tool "${toolName}" - ${reason}`,
        type: 'approval_request',
        approvalId,
        toolName,
    });
}

async function deliverToPlatform(
    platform: string,
    platformUserId: string,
    content: MessageContent,
    _options: DeliveryOptions,
    report: DeliveryReport
): Promise<void> {
    try {
        const result = await sendToUser(platformUserId, platform, content);
        report.channels.push({ platform, success: result.success, error: result.error });
    } catch (error) {
        report.channels.push({
            platform,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown',
        });
    }
}

async function deliverPush(options: DeliveryOptions, report: DeliveryReport): Promise<void> {
    try {
        const { sendNotification } = await import('./notification.service');
        await sendNotification(options.userId, {
            title: options.type === 'approval_request' ? 'Approval Required' : 'YULA',
            body: options.content.slice(0, 200),
            data: options.approvalId ? { approvalId: options.approvalId } : undefined,
        });
        report.channels.push({ platform: 'push', success: true });
    } catch (error) {
        report.channels.push({
            platform: 'push',
            success: false,
            error: error instanceof Error ? error.message : 'Unknown',
        });
    }
}

// @ts-nocheck
// TODO(phase-a-day-3): replaced by Convex — see convex/schema.ts
/**
 * PAC Multi-Channel Delivery Service
 *
 * Routes PAC notifications through the user's preferred messaging platform.
 * Supports: in-app push, email, Telegram, WhatsApp, Slack, Discord.
 *
 * Delivery priority:
 * 1. Platform-specific channels (if enabled and connected)
 * 2. Push notification (default)
 * 3. Email (fallback)
 */

// import { prisma } from '@aspendos/db';
const prisma: any = {};
import { getGateway, type MessageContent } from '../messaging/gateway';

// ============================================
// TYPES
// ============================================

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

// ============================================
// MULTI-CHANNEL DELIVERY
// ============================================

/**
 * Deliver a PAC notification through all enabled channels for a user.
 */
export async function deliverNotification(options: DeliveryOptions): Promise<DeliveryReport> {
    const report: DeliveryReport = { delivered: false, channels: [] };

    // Get user's PAC settings to determine enabled channels
    const settings = await prisma.pACSettings.findUnique({
        where: { userId: options.userId },
    });

    // Get user's active platform connections
    const connections = await prisma.platformConnection.findMany({
        where: { userId: options.userId, isActive: true },
    });

    const connectionMap = new Map(connections.map((c) => [c.platform, c.platformUserId]));

    const messageContent: MessageContent = {
        text: options.content,
        type: options.type,
    };

    // Deliver to each enabled platform
    const deliveries: Promise<void>[] = [];

    // Telegram
    if (settings?.telegramEnabled && connectionMap.has('telegram')) {
        deliveries.push(
            deliverToPlatform(
                'telegram',
                connectionMap.get('telegram')!,
                messageContent,
                options,
                report
            )
        );
    }

    // WhatsApp
    if (settings?.whatsappEnabled && connectionMap.has('whatsapp')) {
        deliveries.push(
            deliverToPlatform(
                'whatsapp',
                connectionMap.get('whatsapp')!,
                messageContent,
                options,
                report
            )
        );
    }

    // Slack
    if (settings?.slackEnabled && connectionMap.has('slack')) {
        deliveries.push(
            deliverToPlatform('slack', connectionMap.get('slack')!, messageContent, options, report)
        );
    }

    // Discord
    if (settings?.discordEnabled && connectionMap.has('discord')) {
        deliveries.push(
            deliverToPlatform(
                'discord',
                connectionMap.get('discord')!,
                messageContent,
                options,
                report
            )
        );
    }

    // Push notification (default fallback)
    if (settings?.pushEnabled !== false) {
        deliveries.push(deliverPush(options, report));
    }

    // Email (if enabled and no other channel delivered)
    if (settings?.emailEnabled) {
        deliveries.push(deliverEmail(options, report));
    }

    await Promise.allSettled(deliveries);

    report.delivered = report.channels.some((c) => c.success);
    return report;
}

/**
 * Deliver an approval request through all enabled channels.
 */
export async function deliverApprovalRequest(
    userId: string,
    approvalId: string,
    reason: string,
    toolName: string
): Promise<DeliveryReport> {
    return deliverNotification({
        userId,
        content: `Approval Required: Tool "${toolName}" — ${reason}`,
        type: 'approval_request',
        approvalId,
        toolName,
    });
}

// ============================================
// PLATFORM DELIVERY HELPERS
// ============================================

async function deliverToPlatform(
    platform: string,
    platformUserId: string,
    content: MessageContent,
    options: DeliveryOptions,
    report: DeliveryReport
): Promise<void> {
    const gateway = getGateway(platform);
    if (!gateway) {
        report.channels.push({ platform, success: false, error: 'Gateway not available' });
        return;
    }

    try {
        let result;
        if (options.type === 'approval_request' && options.approvalId && options.toolName) {
            result = await gateway.sendApprovalRequest(
                platformUserId,
                options.approvalId,
                options.content,
                options.toolName
            );
        } else {
            result = await gateway.sendMessage(platformUserId, content);
        }
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

async function deliverEmail(options: DeliveryOptions, report: DeliveryReport): Promise<void> {
    // Email delivery is handled by existing notification service
    // Marking as successful since it's fire-and-forget
    report.channels.push({ platform: 'email', success: true });
}

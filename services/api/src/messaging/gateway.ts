/**
 * Messaging Gateway - Abstract Interface
 *
 * Provides a unified interface for multi-platform messaging.
 * Each platform adapter implements this interface for
 * consistent send/receive behavior across Telegram, WhatsApp, Slack, etc.
 */

// ============================================
// TYPES
// ============================================

export interface MessageContent {
    text: string;
    type: 'notification' | 'approval_request' | 'proactive' | 'response';
    actions?: MessageAction[];
    metadata?: Record<string, unknown>;
}

export interface MessageAction {
    label: string;
    action: string; // "approve" | "reject" | "snooze" | "dismiss"
    value?: string; // Action payload (e.g., approval ID)
}

export interface DeliveryResult {
    success: boolean;
    messageId?: string;
    error?: string;
    platform: string;
}

export interface InboundMessage {
    platform: string;
    platformUserId: string;
    text: string;
    messageId: string;
    timestamp: Date;
    metadata?: Record<string, unknown>;
}

// ============================================
// ABSTRACT GATEWAY
// ============================================

export interface MessagingGateway {
    /** Platform identifier (e.g., "telegram", "whatsapp", "slack") */
    platform: string;

    /** Send a message to a user via their platform connection */
    sendMessage(platformUserId: string, content: MessageContent): Promise<DeliveryResult>;

    /** Send an approval request with action buttons */
    sendApprovalRequest(
        platformUserId: string,
        approvalId: string,
        reason: string,
        toolName: string
    ): Promise<DeliveryResult>;

    /** Parse a platform-specific webhook event into a normalized InboundMessage */
    parseInboundMessage(rawEvent: unknown): InboundMessage | null;
}

// ============================================
// GATEWAY REGISTRY
// ============================================

const gateways = new Map<string, MessagingGateway>();

export function registerGateway(gateway: MessagingGateway): void {
    gateways.set(gateway.platform, gateway);
}

export function getGateway(platform: string): MessagingGateway | undefined {
    return gateways.get(platform);
}

export function getAllGateways(): MessagingGateway[] {
    return Array.from(gateways.values());
}

/**
 * Send a message to a user on their preferred platform.
 * Tries the specified platform first, then falls back to others.
 */
export async function sendToUser(
    platformUserId: string,
    platform: string,
    content: MessageContent
): Promise<DeliveryResult> {
    const gateway = getGateway(platform);
    if (!gateway) {
        return { success: false, error: `No gateway for platform: ${platform}`, platform };
    }

    return gateway.sendMessage(platformUserId, content);
}

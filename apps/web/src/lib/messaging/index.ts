// Central bot instance
export { bot, postApprovalCard } from './bot';

// Types
export type {
    Platform,
    IncomingMessage,
    ApprovalPayload,
    ApprovalCallbackEvent,
    PlatformCardRenderer,
} from './types';

// Platform adapters
export * as slack from './platforms/slack';
export * as telegram from './platforms/telegram';
export * as discord from './platforms/discord';
export * as whatsapp from './platforms/whatsapp';
export * as teams from './platforms/teams';
export * as gchat from './platforms/gchat';

// Card renderers
export { renderSlackApprovalCard, renderSlackResolvedCard } from './cards/slack-card';
export { renderTelegramApprovalCard, renderTelegramResolvedCard } from './cards/telegram-card';
export { renderDiscordApprovalCard, renderDiscordResolvedCard } from './cards/discord-card';
export { renderWhatsAppApprovalCard, renderWhatsAppResolvedCard } from './cards/whatsapp-card';

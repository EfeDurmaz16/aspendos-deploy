// Central bot instance
export { getBot, postApprovalCard } from './bot';
export { renderDiscordApprovalCard, renderDiscordResolvedCard } from './cards/discord-card';
// Card renderers
export { renderSlackApprovalCard, renderSlackResolvedCard } from './cards/slack-card';
export { renderTelegramApprovalCard, renderTelegramResolvedCard } from './cards/telegram-card';
export { renderWhatsAppApprovalCard, renderWhatsAppResolvedCard } from './cards/whatsapp-card';
export * as discord from './platforms/discord';
export * as gchat from './platforms/gchat';
// Platform adapters
export * as slack from './platforms/slack';
export * as teams from './platforms/teams';
export * as telegram from './platforms/telegram';
export * as whatsapp from './platforms/whatsapp';
// Types
export type {
    ApprovalCallbackEvent,
    ApprovalPayload,
    IncomingMessage,
    Platform,
    PlatformCardRenderer,
} from './types';

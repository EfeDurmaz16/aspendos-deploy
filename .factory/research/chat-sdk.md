# Vercel Chat SDK — Worker-Facing Reference

> Sources: chat-sdk.dev, github.com/vercel/chat, vercel.com/changelog

## Overview

Chat SDK (`npm i chat`) is a unified TypeScript library for building chatbots that work across Slack, Microsoft Teams, Google Chat, Discord, GitHub, Linear, Telegram, WhatsApp, and more — from a single codebase. Open-source, public beta (Feb 2026).

---

## 1. Installation

```bash
npm i chat
# Platform adapters (install only what you need)
npm i @chat-adapter/slack
npm i @chat-adapter/discord
npm i @chat-adapter/telegram
npm i @chat-adapter/teams
npm i @chat-adapter/google-chat
npm i @chat-adapter/github
npm i @chat-adapter/linear
npm i @chat-adapter/whatsapp
# State adapters
npm i @chat-adapter/state-redis
npm i @chat-adapter/state-postgres
```

---

## 2. Core Pattern — Creating a Chat Instance

```ts
import { Chat } from 'chat';
import { createSlackAdapter } from '@chat-adapter/slack';
import { createDiscordAdapter } from '@chat-adapter/discord';
import { createTelegramAdapter } from '@chat-adapter/telegram';
import { createRedisState } from '@chat-adapter/state-redis';

export const bot = new Chat({
  userName: 'yula-bot',
  adapters: {
    slack: createSlackAdapter(),
    discord: createDiscordAdapter(),
    telegram: createTelegramAdapter(),
  },
  state: createRedisState(), // or createPostgresState()
});
```

---

## 3. Event Handlers

```ts
// Someone @mentions the bot in a new thread
bot.onNewMention(async (thread) => {
  await thread.subscribe();  // Subscribe to follow-up messages
  await thread.post('Hello! I\'m listening.');
});

// Follow-up in subscribed thread
bot.onSubscribedMessage(async (thread, message) => {
  await thread.post(`You said: ${message.text}`);
});

// DM from a user
bot.onDirectMessage(async (thread, message) => {
  await thread.post('Got your DM!');
});

// Reaction added
bot.onReaction(async (thread, reaction) => {
  await thread.post(`Thanks for the ${reaction.emoji}!`);
});

// Slash command
bot.onSlashCommand('help', async (thread) => {
  await thread.post('Here are the available commands...');
});
```

---

## 4. Available Adapters & Feature Matrix

### Official Platform Adapters

| Platform | Package | Streaming | Cards | DMs | File Uploads |
|----------|---------|-----------|-------|-----|-------------|
| **Slack** | `@chat-adapter/slack` | ✅ Native | Block Kit | ✅ | ✅ |
| **Discord** | `@chat-adapter/discord` | ⚠️ Post+Edit | Embeds | ✅ | ✅ |
| **Teams** | `@chat-adapter/teams` | ⚠️ Post+Edit | Adaptive Cards | ✅ | ✅ |
| **Google Chat** | `@chat-adapter/google-chat` | ⚠️ Post+Edit | Google Cards | ✅ | ❌ |
| **Telegram** | `@chat-adapter/telegram` | ⚠️ Post+Edit | Markdown + keyboards | ✅ | ⚠️ Single |
| **GitHub** | `@chat-adapter/github` | ❌ | GFM Markdown | ❌ | ❌ |
| **Linear** | `@chat-adapter/linear` | ❌ | Markdown | ❌ | ❌ |
| **WhatsApp** | `@chat-adapter/whatsapp` | ❌ | Templates | ✅ | ✅ Images/audio/docs |

### Community Adapters (from chat-sdk.dev/adapters)

- iMessage, Instagram, Facebook, X/Twitter, Matrix, Email, Webex

### State Adapters

| Adapter | Package |
|---------|---------|
| Redis | `@chat-adapter/state-redis` |
| PostgreSQL | `@chat-adapter/state-postgres` |
| Memory (dev only) | Built-in |

---

## 5. Webhooks

Each adapter exposes a webhook handler:

```ts
// Next.js App Router
// app/api/chat/slack/route.ts
import { bot } from '@/lib/bot';
export const POST = bot.webhooks.slack;

// app/api/chat/discord/route.ts
export const POST = bot.webhooks.discord;

// app/api/chat/telegram/route.ts
export const POST = bot.webhooks.telegram;
```

---

## 6. Posting Messages

```ts
// Plain text
await thread.post('Hello!');

// Markdown
await thread.post(md`**Bold** and _italic_`);

// Edit a previous message
const msg = await thread.post('Processing...');
await msg.edit('Done!');

// Delete
await msg.delete();
```

---

## 7. Cards (Rich Content)

JSX-based card builder that renders to each platform's native format:

```tsx
await thread.post(
  <Card title="Order Status">
    <Text>Your order has shipped! 🚀</Text>
    <Fields>
      <Field label="Order ID">#12345</Field>
      <Field label="Status">Shipped</Field>
    </Fields>
    <Actions>
      <Button id="track" label="Track Package" />
      <LinkButton url="https://example.com" label="View Details" />
    </Actions>
  </Card>
);
```

---

## 8. AI Streaming

First-class support for streaming LLM responses:

```ts
import { generateText, streamText } from 'ai';

bot.onNewMention(async (thread) => {
  await thread.subscribe();
  const result = await streamText({
    model: openai('gpt-4o'),
    prompt: thread.messages.map(m => m.text).join('\n'),
  });
  // Stream to platform (native on Slack, post+edit on others)
  await thread.streamPost(result.textStream);
});
```

---

## 9. Actions & Interactivity

```ts
bot.onAction('track', async (thread, action) => {
  await thread.post(`Tracking order for ${action.userId}...`);
});

bot.onAction('approve', async (thread, action) => {
  await thread.post('✅ Approved!');
});
```

---

## 10. Thread & Channel API

```ts
// Thread
const messages = await thread.fetchMessages();
const info = await thread.fetchInfo();

// Channel
const channel = await bot.getChannel('slack', 'C12345');
await channel.post('Announcement!');
const threads = await channel.listThreads();
```

---

## 11. Building Custom Adapters

```ts
// See: chat-sdk.dev/docs/contributing/building
import { Adapter, AdapterMessage } from 'chat';

export function createMyAdapter(): Adapter {
  return {
    name: 'my-platform',
    webhook: async (request) => { /* verify & parse */ },
    postMessage: async (channelId, threadId, message) => { /* send */ },
    editMessage: async (channelId, threadId, messageId, message) => { /* edit */ },
    deleteMessage: async (channelId, threadId, messageId) => { /* delete */ },
    // ... other methods
  };
}
```

---

## Common Gotchas

1. **Each adapter auto-detects credentials** from env vars (e.g., `SLACK_BOT_TOKEN`, `DISCORD_BOT_TOKEN`).
2. **Streaming** only native on Slack; other platforms use post+edit pattern.
3. **State adapter required** for `thread.subscribe()` to persist across requests.
4. **WhatsApp can't delete messages** — API limitation.
5. **GitHub/Linear have no streaming or DM support**.
6. **Webhook routes must match** the platform's configured callback URL.
7. **Cards render differently** per platform — test on each target.

---

## YULA Integration Patterns

- **Replace custom bot in `services/api/src/bot/`** with Chat SDK for unified multi-platform support
- **One codebase** for Slack, Telegram, Discord, WhatsApp — currently separate integrations
- **AI streaming** integrates directly with AI SDK v6 `streamText`
- **Cards** for rich PAC notification delivery across platforms
- **Actions** for human-in-the-loop approval buttons
- **Redis state** already in YULA stack — plug in `@chat-adapter/state-redis`
- **Webhook routes** in Next.js API routes or Hono

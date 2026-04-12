# Convex — Worker-Facing Reference

> Sources: docs.convex.dev, convex.dev/components, stack.convex.dev

## Overview

Convex is an all-in-one reactive backend: database, server functions (queries/mutations/actions), file storage, scheduling, and real-time subscriptions. It replaces Prisma + PostgreSQL + a custom API layer with a single TypeScript-native platform.

---

## 1. Schema Definition

File: `convex/schema.ts`

```ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  messages: defineTable({
    body: v.string(),
    user: v.id("users"),
    channel: v.optional(v.string()),
    metadata: v.optional(v.object({
      editedAt: v.optional(v.number()),
      reactions: v.optional(v.record(v.string(), v.number())),
    })),
  })
    .index("by_user", ["user"])
    .index("by_channel", ["channel"]),

  users: defineTable({
    name: v.string(),
    email: v.string(),
    tokenIdentifier: v.string(),
    plan: v.union(v.literal("free"), v.literal("pro"), v.literal("enterprise")),
  }).index("by_token", ["tokenIdentifier"]),
});
```

### Validator Reference (`v`)

| Validator | Description |
|-----------|-------------|
| `v.string()` | String value |
| `v.number()` | Number (int or float) |
| `v.boolean()` | Boolean |
| `v.id("tableName")` | Reference to another table's document |
| `v.object({...})` | Nested object with typed fields |
| `v.array(v.string())` | Array of typed values |
| `v.optional(v.X())` | Optional field |
| `v.union(v.X(), v.Y())` | Union type |
| `v.literal("value")` | String literal |
| `v.record(v.string(), v.X())` | Record/map type |
| `v.any()` | Any value (escape hatch) |
| `v.null()` | Null value |

### Schema Options

```ts
defineSchema({ ... }, {
  schemaValidation: true,      // runtime validation (default: true)
  strictTableNameTypes: true,  // TS only allows declared tables (default: true)
});
```

---

## 2. Queries (Read)

```ts
// convex/tasks.ts
import { query } from "./_generated/server";
import { v } from "convex/values";

export const get = query({
  args: { userId: v.optional(v.id("users")) },
  handler: async (ctx, args) => {
    if (args.userId) {
      return await ctx.db
        .query("tasks")
        .withIndex("by_user", (q) => q.eq("user", args.userId))
        .collect();
    }
    return await ctx.db.query("tasks").collect();
  },
});
```

### Key Query Methods
- `ctx.db.query("table")` — start a query
- `.withIndex("indexName", q => q.eq("field", val))` — use an index
- `.filter(q => q.eq(q.field("status"), "active"))` — filter without index
- `.order("asc" | "desc")` — ordering
- `.take(n)` — limit results
- `.first()` — get first result
- `.collect()` — get all results
- `ctx.db.get(id)` — get single doc by ID

---

## 3. Mutations (Write)

```ts
import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const create = mutation({
  args: { body: v.string(), user: v.id("users") },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("messages", {
      body: args.body,
      user: args.user,
    });
    return id;
  },
});

export const update = mutation({
  args: { id: v.id("messages"), body: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { body: args.body });
  },
});

export const remove = mutation({
  args: { id: v.id("messages") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
```

### Key Mutation Methods
- `ctx.db.insert("table", doc)` — insert, returns ID
- `ctx.db.patch(id, partial)` — partial update
- `ctx.db.replace(id, doc)` — full replace
- `ctx.db.delete(id)` — delete

---

## 4. Actions (Side Effects)

Actions can call external APIs, use `fetch`, etc. They cannot directly read/write the DB but can call mutations/queries.

```ts
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

export const sendEmail = action({
  args: { to: v.string(), body: v.string() },
  handler: async (ctx, args) => {
    // Call external API
    await fetch("https://api.email.com/send", { ... });
    // Call a mutation to record it
    await ctx.runMutation(internal.emails.recordSent, { to: args.to });
  },
});
```

---

## 5. Next.js App Router Integration

### ConvexClientProvider

```tsx
// app/ConvexClientProvider.tsx
"use client";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ReactNode } from "react";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}
```

### Layout

```tsx
// app/layout.tsx
import { ConvexClientProvider } from "./ConvexClientProvider";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html><body>
      <ConvexClientProvider>{children}</ConvexClientProvider>
    </body></html>
  );
}
```

### Client Component Usage

```tsx
"use client";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";

export default function Chat() {
  const messages = useQuery(api.messages.get);
  const send = useMutation(api.messages.create);

  return (
    <div>
      {messages?.map(m => <div key={m._id}>{m.body}</div>)}
      <button onClick={() => send({ body: "Hello", user: userId })}>Send</button>
    </div>
  );
}
```

### Environment Variables
```
NEXT_PUBLIC_CONVEX_URL=https://your-project.convex.cloud
```

---

## 6. Workflow Component (`@convex-dev/workflow`)

Durable, long-running workflows that survive restarts. Install:

```bash
npm install @convex-dev/workflow
```

### Setup

```ts
// convex/convex.config.ts
import workflow from "@convex-dev/workflow/convex.config.js";
import { defineApp } from "convex/server";
const app = defineApp();
app.use(workflow);
export default app;

// convex/index.ts
import { WorkflowManager } from "@convex-dev/workflow";
import { components } from "./_generated/api";
export const workflow = new WorkflowManager(components.workflow);
```

### Define a Workflow

```ts
export const onboardingWorkflow = workflow.define({
  args: { userId: v.id("users") },
  handler: async (step, args): Promise<void> => {
    const result = await step.runAction(internal.llm.generate, { userId: args.userId }, { retry: true });
    await step.runMutation(internal.emails.sendWelcome, { userId: args.userId });
    await step.sleep(3 * 24 * 60 * 60 * 1000); // 3 days
    await step.runMutation(internal.emails.sendFollowUp, { userId: args.userId });
  },
});
```

### Start a Workflow

```ts
const workflowId = await workflow.start(ctx, internal.onboardingWorkflow, { userId });
const status = await workflow.status(ctx, workflowId);
await workflow.cancel(ctx, workflowId);
```

### Key Features
- `step.runQuery()`, `step.runMutation()`, `step.runAction()` — orchestrate steps
- `step.sleep(ms)` — pause without consuming resources
- `step.awaitEvent({ name })` — wait for external events (HITL)
- `step.runWorkflow()` — nested workflows
- `Promise.all([...])` — parallel steps
- Automatic retries with exponential backoff
- `workflow.sendEvent(ctx, { name, workflowId, value })` — trigger events

---

## 7. Agent Component (`@convex-dev/agents`)

```ts
import { Agent } from "@convex-dev/agents";
import { openai } from "@ai-sdk/openai";
import { components } from "./_generated/api";

const supportAgent = new Agent(components.agent, {
  name: "Support Agent",
  chat: openai.chat("gpt-4o-mini"),
  instructions: "You are a helpful assistant.",
  tools: { accountLookup, fileTicket, sendEmail },
});

// Create thread
export const createThread = action({
  args: { prompt: v.string() },
  handler: async (ctx, { prompt }) => {
    const { threadId, thread } = await supportAgent.createThread(ctx);
    const result = await thread.generateText({ prompt });
    return { threadId, text: result.text };
  },
});

// Continue thread (includes history automatically)
export const continueThread = action({
  args: { prompt: v.string(), threadId: v.string() },
  handler: async (ctx, { prompt, threadId }) => {
    const { thread } = await supportAgent.continueThread(ctx, { threadId });
    const result = await thread.generateText({ prompt });
    return result.text;
  },
});
```

---

## 8. Durable Agents (`convex-durable-agents`)

Community component for agents that survive restarts, built on AI SDK v6:

```ts
import { streamHandlerAction, defineAgentApi, createActionTool } from "convex-durable-agents";

export const chatAgentHandler = streamHandlerAction(components.durableAgents, {
  model: "anthropic/claude-haiku-4.5",
  system: "You are a helpful AI assistant.",
  tools: {
    get_weather: createActionTool({
      description: "Get weather",
      args: z.object({ location: z.string() }),
      handler: internal.tools.weather.getWeather,
      retry: { enabled: true, maxAttempts: 5 },
    }),
  },
  saveStreamDeltas: true,
});

export const { createThread, sendMessage, listMessages, streamUpdates, ... } =
  defineAgentApi(components.durableAgents, internal.chat.chatAgentHandler);
```

React hook: `useAgentChat()` from `convex-durable-agents/react`.

---

## Common Gotchas

1. **Mutations are transactional** — they auto-retry on conflicts. Don't use side effects in mutations.
2. **Actions can't read/write DB directly** — use `ctx.runMutation()` / `ctx.runQuery()`.
3. **Schema validation is enforced on push** — existing data must match before deploy succeeds.
4. **`_id` and `_creationTime` are auto-added** — don't define them in schema.
5. **Circular references** — make one side `v.optional()` or `v.union(v.id("x"), v.null())`.
6. **Workflow handler must be deterministic** — no `fetch`, no `Date.now()` in handler body; use steps.
7. **`NEXT_PUBLIC_CONVEX_URL`** must be set for client-side usage.

---

## YULA Integration Patterns

- **Replace Prisma + PostgreSQL** with Convex schema + queries/mutations
- **Replace Hono API** with Convex actions (for external calls) + queries/mutations (for DB ops)
- **Real-time chat** using `useQuery` subscriptions — no WebSocket setup needed
- **Agent workflows** using `@convex-dev/workflow` for PAC notifications and onboarding
- **Memory** using Agent component's built-in vector search per thread
- **Billing webhooks** as Convex HTTP actions

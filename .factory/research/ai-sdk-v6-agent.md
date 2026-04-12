# Vercel AI SDK v6 Agent — Worker-Facing Reference

> Sources: ai-sdk.dev/docs/agents (v6), vercel.com/blog/ai-sdk-6

## Overview

AI SDK v6 introduces a first-class `ToolLoopAgent` abstraction for building agentic AI applications. It replaces the v5 `maxSteps` pattern with a dedicated Agent class that manages the LLM ↔ tool loop, context management, and stopping conditions.

---

## 1. ToolLoopAgent — Core Abstraction

```ts
import { ToolLoopAgent, tool } from 'ai';
import { z } from 'zod';

const agent = new ToolLoopAgent({
  model: "anthropic/claude-sonnet-4.5",  // Gateway format
  instructions: 'You are a helpful assistant.',
  tools: {
    search: tool({
      description: 'Search the web',
      inputSchema: z.object({ query: z.string() }),
      execute: async ({ query }) => {
        return { results: await searchWeb(query) };
      },
    }),
  },
});
```

### Configuration Options

| Option | Type | Description |
|--------|------|-------------|
| `model` | `string \| LanguageModel` | LLM model (gateway or provider format) |
| `instructions` | `string` | System prompt |
| `tools` | `Record<string, Tool>` | Available tools |
| `stopWhen` | `StopCondition \| StopCondition[]` | When to stop (default: `stepCountIs(20)`) |
| `prepareStep` | `(ctx) => Promise<StepConfig>` | Modify settings before each step |
| `toolChoice` | `'auto' \| 'required' \| 'none' \| { type: 'tool', toolName: string }` | Tool selection strategy |
| `output` | `Output.object({ schema })` | Structured output schema |
| `onStepFinish` | `(step) => Promise<void>` | Callback after each step |

---

## 2. Using an Agent

### Generate (one-shot)

```ts
const result = await agent.generate({
  prompt: 'What is the weather in SF?',
});
console.log(result.text);    // Final text response
console.log(result.steps);   // All steps taken
```

### Stream

```ts
const result = await agent.stream({
  prompt: 'Tell me a story',
});
for await (const chunk of result.textStream) {
  process.stdout.write(chunk);
}
```

### API Route (Next.js)

```ts
// app/api/chat/route.ts
import { createAgentUIStreamResponse } from 'ai';

export async function POST(request: Request) {
  const { messages } = await request.json();
  return createAgentUIStreamResponse({
    agent: myAgent,
    uiMessages: messages,
  });
}
```

---

## 3. Stop Conditions (`stopWhen`)

```ts
import { stepCountIs, hasToolCall, isLoopFinished } from 'ai';

// Built-in conditions
stopWhen: stepCountIs(50)              // Max 50 steps (default is 20)
stopWhen: hasToolCall('done')          // Stop when 'done' tool is called
stopWhen: isLoopFinished()             // Run until model naturally stops (⚠️ no limit)

// Combine (stops when ANY condition met)
stopWhen: [stepCountIs(20), hasToolCall('done')]

// Custom condition
const budgetExceeded: StopCondition<typeof tools> = ({ steps }) => {
  const totalTokens = steps.reduce((acc, s) => acc + (s.usage?.inputTokens ?? 0), 0);
  return totalTokens > 100_000;
};
```

### The Loop Continues Until:
1. Model generates text (finish reason ≠ tool-calls), OR
2. A tool without `execute` is called, OR
3. A tool call needs approval, OR
4. A stop condition is met

---

## 4. `prepareStep` — Per-Step Configuration

Runs before each step. Return partial config to override defaults.

```ts
const agent = new ToolLoopAgent({
  model: 'openai/gpt-4o-mini',
  tools: { search, analyze, summarize },
  prepareStep: async ({ stepNumber, messages, steps, model }) => {
    // Dynamic model selection
    if (stepNumber > 2 && messages.length > 10) {
      return { model: "anthropic/claude-sonnet-4.5" };
    }

    // Context window management
    if (messages.length > 20) {
      return {
        messages: [messages[0], ...messages.slice(-10)],
      };
    }

    // Tool phasing
    if (stepNumber <= 2) return { activeTools: ['search'], toolChoice: 'required' };
    if (stepNumber <= 5) return { activeTools: ['analyze'] };
    return { activeTools: ['summarize'] };
  },
});
```

### `prepareStep` receives:

| Param | Type | Description |
|-------|------|-------------|
| `model` | `LanguageModel` | Current model |
| `stepNumber` | `number` | 0-indexed step number |
| `steps` | `Step[]` | All previous steps |
| `messages` | `ModelMessage[]` | Messages to be sent |

### `prepareStep` can return:

| Field | Description |
|-------|-------------|
| `model` | Switch model for this step |
| `messages` | Modified messages array |
| `activeTools` | Subset of tools to enable |
| `toolChoice` | Force specific tool usage |

---

## 5. `onStepFinish` — Step Tracking

```ts
// In constructor (agent-wide)
const agent = new ToolLoopAgent({
  model: "anthropic/claude-sonnet-4.5",
  onStepFinish: async ({ stepNumber, usage, finishReason, toolCalls }) => {
    console.log(`Step ${stepNumber}: ${usage.totalTokens} tokens`);
  },
});

// Per-call (runs after constructor callback)
const result = await agent.generate({
  prompt: 'Hello',
  onStepFinish: async ({ stepNumber, usage }) => {
    await trackUsage(stepNumber, usage);
  },
});
```

---

## 6. Tool Definition

```ts
import { tool } from 'ai';
import { z } from 'zod';

const weatherTool = tool({
  description: 'Get weather for a location',
  inputSchema: z.object({
    location: z.string().describe('City name'),
    unit: z.enum(['celsius', 'fahrenheit']).optional(),
  }),
  execute: async ({ location, unit }) => {
    const data = await fetchWeather(location);
    return { temperature: data.temp, condition: data.condition };
  },
});

// Tool without execute = stops the loop
const doneTool = tool({
  description: 'Signal task completion',
  inputSchema: z.object({
    answer: z.string().describe('Final answer'),
  }),
  // No execute → agent stops when this tool is called
});
```

---

## 7. Forced Tool Calling Pattern

```ts
const agent = new ToolLoopAgent({
  model: "anthropic/claude-sonnet-4.5",
  tools: {
    search: searchTool,
    done: tool({
      description: 'Signal completion',
      inputSchema: z.object({ answer: z.string() }),
      // No execute — stops loop
    }),
  },
  toolChoice: 'required', // Force tool use every step
});

const result = await agent.generate({ prompt: '...' });
const finalCall = result.staticToolCalls[0];
if (finalCall?.toolName === 'done') {
  console.log(finalCall.input.answer);
}
```

---

## 8. Structured Output

```ts
import { Output } from 'ai';

const analysisAgent = new ToolLoopAgent({
  model: "anthropic/claude-sonnet-4.5",
  output: Output.object({
    schema: z.object({
      sentiment: z.enum(['positive', 'neutral', 'negative']),
      summary: z.string(),
      keyPoints: z.array(z.string()),
    }),
  }),
});

const { output } = await analysisAgent.generate({
  prompt: 'Analyze this feedback...',
});
// output is fully typed: { sentiment, summary, keyPoints }
```

---

## 9. Type Safety

```ts
import { ToolLoopAgent, InferAgentUIMessage } from 'ai';

const myAgent = new ToolLoopAgent({ ... });

// Infer message type for UI components
export type MyAgentUIMessage = InferAgentUIMessage<typeof myAgent>;

// Use in client
import { useChat } from '@ai-sdk/react';
const { messages } = useChat<MyAgentUIMessage>();
```

---

## 10. Manual Loop (Escape Hatch)

For full control without ToolLoopAgent:

```ts
import { generateText, ModelMessage } from 'ai';

const messages: ModelMessage[] = [{ role: 'user', content: '...' }];
let step = 0;

while (step < 10) {
  const result = await generateText({
    model: "anthropic/claude-sonnet-4.5",
    messages,
    tools: { ... },
  });
  messages.push(...result.response.messages);
  if (result.text) break;
  step++;
}
```

---

## Common Gotchas

1. **Default step limit is 20** — use `stopWhen: stepCountIs(N)` to increase.
2. **`isLoopFinished()` has no limit** — agent can run forever and incur huge costs.
3. **`prepareStep` defaults** — return `{}` to keep current settings; only return what you want to change.
4. **Both `onStepFinish` callbacks run** — constructor first, then per-call.
5. **`toolChoice: 'required'` needs a done tool** — otherwise the loop never stops.
6. **Gateway model format** — use `"provider/model"` string (e.g., `"anthropic/claude-sonnet-4.5"`).
7. **`staticToolCalls`** — tool calls without `execute` are in `result.staticToolCalls`, not `result.toolCalls`.

---

## YULA Integration Patterns

- **Replace `generateText` with `maxSteps`** → use `ToolLoopAgent` for cleaner agent code
- **Agentic RAG router** → use `prepareStep` for dynamic model/tool selection per step
- **Agent governance** → custom `StopCondition` for budget/rate limiting
- **PAC notifications** → `onStepFinish` to track costs and log agent actions
- **Multi-model routing** → `prepareStep` to switch between Groq (speed) and Anthropic (complex)
- **`createAgentUIStreamResponse`** in API routes for streaming chat

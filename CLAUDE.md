# YULA OS - AI Chat Platform

> Project configuration for Claude Code sessions
> **Live at**: https://yula.dev

## Project Overview

YULA OS (Your Universal Learning Assistant) is a consumer AI chat platform with intelligent memory, agentic RAG, proactive scheduling, and tiered billing. It provides a seamless conversational AI experience with persistent context across sessions.

## Architecture

### Monorepo Structure

```
aspendos/
├── apps/
│   ├── web/              # Next.js 15 web application
│   ├── mobile/           # React Native mobile app
│   └── yula-video/       # Remotion video generation
├── services/
│   ├── api/              # Hono API server (TypeScript)
│   ├── agents/           # LangGraph agents (Python)
│   ├── mcp-servers/      # MCP server integrations
│   └── model-router/     # AI model routing service
├── packages/
│   ├── db/               # Prisma database schema
│   └── shared-types/     # Shared TypeScript types
└── klaros/               # Additional services
```

### Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15, React 19, Tailwind CSS 4 |
| UI Components | shadcn/ui, Radix UI, BaseUI |
| AI Chat UI | Vercel AI Elements |
| AI SDK | Vercel AI SDK |
| Icons | Hugeicons, Bettericons |
| Fonts | Geist, Geist Mono |
| Backend API | Hono (Bun runtime) |
| Database | PostgreSQL + Prisma |
| Memory | SuperMemory (migrating from Qdrant) |
| AI Agents | LangGraph (Python) |
| Agent Governance | Guard chain, approvals, trust scoring (AGIT/SARDIS/FIDES) |
| Billing | Polar |
| Auth | Better Auth |
| Messaging | Vercel Chat SDK (Slack, Telegram, Discord, WhatsApp) |
| Deployment | Railway, Vercel |

### Key Patterns

- **Streaming**: All AI responses use streaming via Vercel AI SDK
- **Agentic RAG**: Intelligent router decides when to enable retrieval based on query analysis
  - Fast route: Pattern matching for greetings and obvious memory queries (no LLM call)
  - LLM route: Groq Llama for complex routing decisions (sub-100ms)
  - Routes to: `direct_reply`, `rag_search`, `tool_call`, or `proactive_schedule`
- **Memory**: SuperMemory API with `withSupermemory()` wrapper for automatic injection. Feature-flagged via `MEMORY_BACKEND` env var (openmemory/supermemory/dual/off). PostgreSQL always source of truth.
- **Agent Governance**: Guard chain (ToolLoop, DangerousCommand, BlastRadius, RateLimit, Policy) → Action log → Human-in-the-loop approvals → Tool trust scoring (FIDES). Adapted from AGIT/SARDIS/FIDES.
- **Skills**: 7 system skills + custom user skills with execution tracking and learning loop
- **PAC Notifications**: Proactive AI Callbacks for scheduled reminders
- **Messaging**: Vercel Chat SDK handles all platforms (Slack, Telegram, Discord, WhatsApp) with streaming, thread subscriptions, and cross-platform cards. Bot in `services/api/src/bot/`.
- **Tiered Access**: Free/Pro/Enterprise with rate limiting
- **Model Registry**: Multi-provider routing (Groq for speed, Anthropic for complex tasks)

## Development Guidelines

### Code Style

- **Formatter/Linter**: Biome (configured in `biome.json`)
- **TypeScript**: Strict mode enabled
- **Imports**: Absolute imports from `@/` (apps) or package names
- **Components**: Functional components with TypeScript interfaces
- **Naming**: PascalCase components, camelCase functions, kebab-case files

### UI Development Rules

**ALWAYS use these libraries:**
- `shadcn/ui` for base components
- `Radix UI` for accessible primitives
- `BaseUI` for advanced patterns
- `Vercel AI Elements` for chat interfaces
- `Hugeicons` or `Bettericons` for icons
- `Geist` and `Geist Mono` fonts

**ALWAYS use Vercel AI SDK for:**
- Streaming chat implementation
- AI tool definitions
- Provider integrations
- Response handling

### Testing

- **Framework**: Vitest
- **Location**: `__tests__/` directories or `.test.ts` suffix
- **Coverage**: Focus on services and critical paths

### Git Workflow

- **Main branch**: `main`
- **Feature branches**: `feature/<name>`
- **Commits**: Conventional commits (feat, fix, chore, docs)
- **Pre-commit**: Biome check runs automatically

## API Reference

### Chat API (`services/api`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/chat` | POST | Send message, get streaming response |
| `/chat/history` | GET | Get conversation history |
| `/memory` | GET/POST | Memory operations (routed via MEMORY_BACKEND) |
| `/memory/search` | POST | Semantic memory search |
| `/scheduler` | POST | Schedule PAC notifications |
| `/billing` | GET/POST | Subscription management |
| `/notifications` | GET | Get pending notifications |
| `/approvals` | GET/POST | Human-in-the-loop approval management |
| `/skills` | GET/POST | Skill CRUD and execution tracking |
| `/messaging` | GET/POST | Platform connections and webhooks |

### Web App Routes (`apps/web`)

| Route | Description |
|-------|-------------|
| `/` | Landing page |
| `/chat` | Main chat interface |
| `/chat/new` | New conversation |
| `/memory` | Memory management |
| `/agent-log` | Agent action log and approvals dashboard |
| `/skills` | Skills management |
| `/billing` | Subscription settings |
| `/pricing` | Pricing page |

## Environment Variables

### Required

```bash
# Database
DATABASE_URL=postgresql://...

# AI - Vercel AI Gateway (single key for all providers)
AI_GATEWAY_API_KEY=...         # Routes to OpenAI, Anthropic, Google, Groq

# Auth
BETTER_AUTH_SECRET=...
BETTER_AUTH_URL=...

# Billing
POLAR_ACCESS_TOKEN=...
POLAR_WEBHOOK_SECRET=...

# Memory (SuperMemory - replaces Qdrant)
SUPERMEMORY_API_KEY=...
MEMORY_BACKEND=supermemory     # openmemory | supermemory | dual | off

# Vector Store (legacy - being replaced by SuperMemory)
QDRANT_URL=...
QDRANT_API_KEY=...

# Messaging (optional)
TELEGRAM_BOT_TOKEN=...
```

## Common Commands

```bash
# Development
bun dev                    # Start all services
bun run dev --filter=web   # Start web only

# Database
bun db:generate            # Generate Prisma client
bun db:push               # Push schema changes

# Quality
bun lint                   # Run Biome linter
bun format                 # Format with Biome
bun check                  # Check all

# Testing
bun test                   # Run all tests
bun run test:router        # Run AI router tests

# Deployment
vercel --prod              # Deploy to production
```

## Troubleshooting

### Common Issues

**"Cannot find module '@aspendos/db'"**
```bash
bun install && bun db:generate
```

**Streaming not working**
- Ensure `OPENAI_API_KEY` is set
- Check that route returns `StreamingTextResponse`
- Verify client uses `useChat` from `@ai-sdk/react`

**Memory search returns empty**
- Verify Qdrant is running
- Check `QDRANT_URL` and `QDRANT_API_KEY`
- Ensure embeddings are being stored

**PAC notifications not triggering**
- Check scheduler service is running
- Verify cron jobs in Railway/deployment
- Check notification service logs

**Better Auth errors**
- Ensure `BETTER_AUTH_SECRET` is set
- Verify `BETTER_AUTH_URL` matches deployment

## Subagent Usage

Use these subagents for specific tasks:

| Task | Subagent |
|------|----------|
| React/Next.js components | `frontend/react-component` |
| Chat UI features | `frontend/chat-features` |
| API endpoints | `backend/api-developer` |
| AI/LLM integration | `backend/ai-integration` |
| Memory system | `backend/memory-system` |
| Billing/Polar | `backend/billing-expert` |
| Database changes | `database/prisma-expert` |
| Writing tests | `testing/test-writer` |
| Code review | `review/code-reviewer` |
| Architecture decisions | `review/architect` |

## Skills Reference

Invoke with `/skill-name`:

### Development Skills

| Skill | Purpose |
|-------|---------|
| `/streaming-chat` | Implement streaming chat features |
| `/memory-ops` | Memory store/retrieve/search |
| `/api-endpoint` | Create Hono API endpoints |
| `/prisma-migration` | Database migrations |
| `/component-scaffold` | New React components |
| `/billing-integration` | Polar billing setup |
| `/pac-notification` | PAC notification handling |
| `/mcp-server` | MCP server development |
| `/deploy-railway` | Railway deployment |
| `/deploy-vercel` | Vercel deployment |

### Marketing Skills

| Skill | Purpose |
|-------|---------|
| `/social-content` | Generate social media content for X, Reddit, LinkedIn |
| `/gtm-plan` | Create GTM campaign plans with $0 budget strategies |
| `/competitor-compare` | Generate competitor comparison content |
| `/viral-hook` | Create viral hooks for 3 core messages (IMPORT, PAC, COUNCIL) |
| `/launch-checklist` | Product Hunt launch preparation checklist |
| `/content-calendar` | Build content calendars with message rotation |
| `/tweet-optimizer` | Optimize tweets for X algorithm engagement |
| `/reddit-validator` | Validate Reddit posts to avoid spam detection |

### Marketing Core Messages

| Code | Message | Description |
|------|---------|-------------|
| 🔵 IMPORT | "Geçmişini getir" | ChatGPT/Claude history import & export |
| 🟢 PAC | "AI sana yazar" | Proactive AI that initiates conversations |
| 🟣 COUNCIL | "4 AI'a sor" | Multi-model parallel querying |

<!-- convex-ai-start -->
This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read `convex/_generated/ai/guidelines.md` first** for important guidelines on how to correctly use Convex APIs and patterns. The file contains rules that override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running `npx convex ai-files install`.
<!-- convex-ai-end -->

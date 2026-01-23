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
| Vector Store | Qdrant |
| AI Agents | LangGraph (Python) |
| Billing | Polar |
| Auth | Better Auth |
| Deployment | Railway, Vercel |

### Key Patterns

- **Streaming**: All AI responses use streaming via Vercel AI SDK
- **Agentic RAG**: Intelligent router decides when to enable retrieval based on query analysis
  - Fast route: Pattern matching for greetings and obvious memory queries (no LLM call)
  - LLM route: Groq Llama for complex routing decisions (sub-100ms)
  - Routes to: `direct_reply`, `rag_search`, `tool_call`, or `proactive_schedule`
- **Memory**: Persistent memory via Qdrant embeddings + semantic search
- **PAC Notifications**: Proactive AI Callbacks for scheduled reminders
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
| `/memory` | GET/POST | Memory operations |
| `/memory/search` | POST | Semantic memory search |
| `/scheduler` | POST | Schedule PAC notifications |
| `/billing` | GET/POST | Subscription management |
| `/notifications` | GET | Get pending notifications |

### Web App Routes (`apps/web`)

| Route | Description |
|-------|-------------|
| `/` | Landing page |
| `/chat` | Main chat interface |
| `/chat/new` | New conversation |
| `/memory` | Memory management |
| `/billing` | Subscription settings |
| `/pricing` | Pricing page |

## Environment Variables

### Required

```bash
# Database
DATABASE_URL=postgresql://...

# AI Providers (Vercel AI SDK)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GROQ_API_KEY=gsk_...           # Fast routing via Llama
GOOGLE_AI_API_KEY=...

# Auth
BETTER_AUTH_SECRET=...
BETTER_AUTH_URL=...

# Billing
POLAR_ACCESS_TOKEN=...
POLAR_WEBHOOK_SECRET=...

# Vector Store
QDRANT_URL=...
QDRANT_API_KEY=...
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

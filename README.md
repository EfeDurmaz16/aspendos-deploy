# YULA OS

<div align="center">

<img src="https://img.shields.io/badge/YULA-OS-F59E0B?style=for-the-badge&labelColor=000000" alt="YULA OS" />

**Your Universal Learning Assistant**

An AI-native operating system for thought — with persistent memory, agentic RAG, and proactive intelligence.

[![Live Demo](https://img.shields.io/badge/Live-yula.dev-F59E0B?style=flat-square&logo=vercel&logoColor=white)](https://yula.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15-000000?style=flat-square&logo=next.js&logoColor=white)](https://nextjs.org/)
[![Vercel AI SDK](https://img.shields.io/badge/Vercel_AI_SDK-6.0-000000?style=flat-square&logo=vercel&logoColor=white)](https://sdk.vercel.ai/)

</div>

---

## Overview

YULA isn't just another chatbot. It's an **AI operating system** that remembers everything, learns your patterns, and proactively helps you before you even ask.

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   "Remember that restaurant I mentioned last month?"        │
│                                                             │
│   YULA instantly retrieves the context, knows your          │
│   preferences, and suggests a reservation.                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Key Features

### Agentic RAG Router
Intelligent routing that decides **when** to search your memory — not just how.

```typescript
// Fast route: Pattern matching (no LLM call, <1ms)
"Hi" → direct_reply

// LLM route: Complex decisions via Groq Llama (<100ms)
"What did we discuss about React hooks?" → rag_search
```

### Persistent Memory
Every conversation becomes searchable knowledge. Vector embeddings via Qdrant enable semantic search across your entire history.

### PAC Notifications
**Proactive AI Callbacks** — YULA doesn't just respond, it reaches out when it matters.

```
┌────────────────────────────────────────┐
│  🔔 PAC Notification                   │
│                                        │
│  "You mentioned wanting to review      │
│   your project proposal today.         │
│   Ready when you are."                 │
│                                        │
└────────────────────────────────────────┘
```

### Multi-Provider AI
Unified interface to the best models, each chosen for their strengths:

| Provider | Model | Use Case |
|----------|-------|----------|
| Groq | Llama 3.1 | Fast routing decisions |
| Anthropic | Claude 3.5 | Complex reasoning & code |
| OpenAI | GPT-4o | General assistance |

---

## Architecture

```
yula/
├── apps/
│   ├── web/                 # Next.js 15 + React 19
│   └── mobile/              # React Native (Expo)
├── services/
│   └── api/                 # Hono API server
├── packages/
│   └── db/                  # Prisma + PostgreSQL
└── lib/
    └── ai/                  # Vercel AI SDK layer
        ├── router.ts        # Agentic RAG router
        ├── providers.ts     # Multi-provider registry
        └── generate.ts      # Unified generation
```

## Tech Stack

<table>
<tr>
<td width="50%">

**Frontend**
- Next.js 15 (App Router)
- React 19
- Tailwind CSS 4
- Framer Motion
- shadcn/ui + Radix

</td>
<td width="50%">

**Backend**
- Hono (Bun runtime)
- PostgreSQL + Prisma
- Qdrant (Vector DB)
- Better Auth

</td>
</tr>
<tr>
<td>

**AI Layer**
- Vercel AI SDK
- @ai-sdk/openai
- @ai-sdk/anthropic
- @ai-sdk/groq

</td>
<td>

**Infrastructure**
- Vercel (Web)
- Railway (API + DB)
- GitHub Actions CI/CD

</td>
</tr>
</table>

---

## Quick Start

```bash
# Clone
git clone https://github.com/EfeDurmaz16/aspendos-deploy.git
cd aspendos-deploy

# Install
bun install

# Setup database
bun db:generate
bun db:push

# Environment
cp .env.example .env.local
# Add your API keys

# Run
bun dev
```

## Environment Variables

```bash
# AI Providers
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GROQ_API_KEY=gsk_...

# Database
DATABASE_URL=postgresql://...

# Vector Store
QDRANT_URL=https://...
QDRANT_API_KEY=...

# Auth
BETTER_AUTH_SECRET=...
BETTER_AUTH_URL=https://yula.dev
```

---

## Design Philosophy

### The Monolith Aesthetic

YULA embraces a bold, minimal design language:

| Element | Value |
|---------|-------|
| Background | `#050505` / `#000000` |
| Accent | Electric Amber `#F59E0B` |
| Border | `#FFFFFF10` |
| Font | Geist / Geist Mono |

No purple-blue gradients. No visual noise. Just **signal**.

---

## API Reference

### Chat Stream
```bash
POST /api/chat/stream
Content-Type: application/json

{
  "messages": [{ "role": "user", "content": "Hello" }],
  "model": "gpt-4o"
}
```

### Memory Search
```bash
POST /api/memory/search
Content-Type: application/json

{
  "query": "React hooks discussion",
  "limit": 5
}
```

### Health Check
```bash
GET /api/health

→ { "status": "healthy", "uptime": 12345 }
```

---

## Contributing

We welcome contributions! Please see [DEPLOYMENT.md](./DEPLOYMENT.md) for setup instructions.

```bash
# Run tests
bun test

# Type check
bun run typecheck

# Lint
bun biome check .
```

---

## License

MIT © 2024 YULA OS

---

<div align="center">

**[yula.dev](https://yula.dev)** · Built with Vercel AI SDK

<sub>Your thoughts, amplified.</sub>

</div>

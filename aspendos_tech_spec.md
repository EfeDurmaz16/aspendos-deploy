# ASPENDOS: COMPREHENSIVE TECHNICAL IMPLEMENTATION DOCUMENT

**Version:** 1.0  
**Date:** January 14, 2026  
**Target Launch:** February 14, 2026 (30 days)  
**Team Size:** 5 core engineers + 1 DevOps/Infrastructure  

---

## EXECUTIVE SUMMARY

Aspendos is a memory-first, multi-model AI operating system. This document outlines the complete technical architecture, implementation strategy, and deployment plan to launch on February 14, 2026.

**Key Technical Decisions:**
- **Frontend:** Next.js 15 (App Router) + BaseUI + Phosphor Icons + Anime.js
- **Backend:** TypeScript (Express/Hono for API) + Go (Model Router microservice) + Python (Agentic workflows)
- **Database:** PostgreSQL (Cloud SQL) + Qdrant Cloud (Vector DB) + Google Cloud Storage (file storage)
- **Auth:** Clerk (better UX than Auth0, better DX for developers)
- **Payment:** Polar (Merchant of Record, TÃ¼rkiye-friendly, no business registration needed)
- **Deployment:** Google Cloud Run (backend) + Vercel (frontend) + Cloud SQL (database)
- **Monitoring:** Datadog (observability) + Sentry (error tracking) + OpenTelemetry
- **Secrets Management:** Google Secret Manager (built-in, secure)
- **Voice/Realtime:** OpenAI Realtime API (primary) + Google Gemini 2.0 (fallback)
- **Model Access:** Direct APIs (OpenAI, Anthropic, Google) + Fallback (OpenRouter, FAL.ai)
- **Embedding:** Gemini 1.5 Embedding (768-dim, cost-optimized) + Qdrant (managed vector storage)
- **Code Execution:** Judge0 API (managed, no self-hosting)
- **Task Queue:** Google Cloud Tasks (simple, scalable, no Kafka/RabbitMQ needed)
- **Entity/Legal:** Estonia OÃœ (e-residency) with US C-Corp flip roadmap

---

## 1. INFRASTRUCTURE & ARCHITECTURE OVERVIEW

### 1.1 High-Level System Diagram

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚                      USER LAYER                                  â”‚
â”‚  Web: Vercel (Next.js) | Mobile: Web (responsive) | Voice: WS   â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                  â”‚
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â–¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚                    API GATEWAY / LB                              â”‚
â”‚              Cloud Run (Load Balancer)                           â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                  â”‚
        â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
        â”‚         â”‚                         â”‚
   â”Œâ”€â”€â”€â”€â–¼â”€â”€â” â”Œâ”€â”€â”€â–¼â”€â”€â”€â”€â”€â”€â”           â”Œâ”€â”€â”€â”€â”€â”€â–¼â”€â”€â”€â”€â”
   â”‚ Auth  â”‚ â”‚ API      â”‚           â”‚  Model    â”‚
   â”‚Serviceâ”‚ â”‚Service   â”‚           â”‚  Router   â”‚
   â”‚(Clerk)â”‚ â”‚(TS, GCR) â”‚           â”‚  (Go, GCR)â”‚
   â””â”€â”€â”€â”€â”€â”€â”€â”˜ â””â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”˜           â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                  â”‚
        â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
        â”‚         â”‚                      â”‚
   â”Œâ”€â”€â”€â”€â–¼â”€â”€â”€â”€â”  â”Œâ–¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”      â”Œâ”€â”€â”€â”€â–¼â”€â”€â”€â”€â”€â”€â”€â”€â”
   â”‚PostgreSQLâ”‚  â”‚Qdrant     â”‚      â”‚Cloud Storageâ”‚
   â”‚(Cloud SQL)â”‚ â”‚(Vector DB)â”‚      â”‚(S3 alt)     â”‚
   â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜      â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
        â”‚
   â”Œâ”€â”€â”€â”€â–¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
   â”‚  External Services                   â”‚
   â”‚ â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â” â”‚
   â”‚ â”‚Model APIs:                       â”‚ â”‚
   â”‚ â”‚ - OpenAI (GPT-4o, GPT-5, o1)    â”‚ â”‚
   â”‚ â”‚ - Anthropic (Claude 4.5)         â”‚ â”‚
   â”‚ â”‚ - Google (Gemini Ultra 2.0)      â”‚ â”‚
   â”‚ â”‚ - Fallback: OpenRouter, FAL      â”‚ â”‚
   â”‚ â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤ â”‚
   â”‚ â”‚ Voice/Realtime:                  â”‚ â”‚
   â”‚ â”‚ - OpenAI Realtime (primary)      â”‚ â”‚
   â”‚ â”‚ - Google Gemini 2.0 (fallback)   â”‚ â”‚
   â”‚ â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤ â”‚
   â”‚ â”‚ Media Generation:                â”‚ â”‚
   â”‚ â”‚ - FAL.ai (Flux, Kling, etc)      â”‚ â”‚
   â”‚ â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤ â”‚
   â”‚ â”‚ Task Execution:                  â”‚ â”‚
   â”‚ â”‚ - Judge0 (code execution)        â”‚ â”‚
   â”‚ â”‚ - Cloud Tasks (job scheduling)   â”‚ â”‚
   â”‚ â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜ â”‚
   â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

### 1.2 Service Breakdown

| Service | Language | Responsibility | Deployment |
|---------|----------|---|---|
| **API Gateway** | TypeScript | HTTP routing, rate limiting, auth validation | Cloud Run |
| **Auth Service** | Clerk (SaaS) | User authentication, session, JWT | Managed |
| **Chat API** | TypeScript | Conversation CRUD, message handling, memory context building | Cloud Run |
| **Model Router** | Go | Model selection, fallback logic, cost tracking, latency optimization | Cloud Run |
| **Memory Service** | TypeScript | Embedding, vector search, memory CRUD, RAG pipeline | Cloud Run |
| **Payment Service** | TypeScript | Subscription management, credit ledger, webhook handling | Cloud Run |
| **Agent Service** | Python | Agentic workflows, tool calling, long-running tasks | Cloud Run |
| **Voice Service** | TypeScript | WebSocket server for real-time voice, streaming | Cloud Run |

---

## 2. FRONTEND ARCHITECTURE (Next.js + BaseUI)

### 2.1 Tech Stack

```json
{
  "framework": "Next.js 15 (App Router)",
  "ui_library": "BaseUI (Uber's design system)",
  "icons": "Phosphor Icons",
  "animations": "Anime.js",
  "state_management": "Zustand (lightweight, no Redux overhead)",
  "data_fetching": "TanStack React Query",
  "real_time": "WebSocket (native browser API)",
  "styling": "CSS Modules + Tailwind (utility fallback)",
  "testing": "Vitest + React Testing Library",
  "deployment": "Vercel (zero-config Next.js)"
}
```

### 2.2 Project Structure

```
/frontend
â”œâ”€â”€ /app                          # Next.js App Router
â”‚   â”œâ”€â”€ /layout.tsx              # Root layout
â”‚   â”œâ”€â”€ /page.tsx                # Landing page
â”‚   â”œâ”€â”€ /(auth)
â”‚   â”‚   â”œâ”€â”€ /signin/page.tsx
â”‚   â”‚   â”œâ”€â”€ /signup/page.tsx
â”‚   â”‚   â””â”€â”€ /callback/page.tsx    # Clerk webhook callback
â”‚   â”œâ”€â”€ /(dashboard)              # Protected routes (middleware protected)
â”‚   â”‚   â”œâ”€â”€ /layout.tsx           # Sidebar, top nav
â”‚   â”‚   â”œâ”€â”€ /chat/[chatId]/page.tsx
â”‚   â”‚   â”œâ”€â”€ /memory/page.tsx
â”‚   â”‚   â”œâ”€â”€ /agents/page.tsx
â”‚   â”‚   â”œâ”€â”€ /settings/page.tsx
â”‚   â”‚   â””â”€â”€ /billing/page.tsx
â”‚   â”œâ”€â”€ /api                      # Route handlers (backend agnostic)
â”‚   â”‚   â”œâ”€â”€ /auth/[...auth0].ts   # Clerk auth routes
â”‚   â”‚   â”œâ”€â”€ /webhooks
â”‚   â”‚   â”‚   â”œâ”€â”€ /stripe.ts        # Payment webhooks
â”‚   â”‚   â”‚   â””â”€â”€ /polar.ts         # Polar webhooks
â”‚   â”‚   â””â”€â”€ /proxy/[...path].ts   # API route forwarding
â”‚   â””â”€â”€ /status.tsx               # Status page
â”œâ”€â”€ /components
â”‚   â”œâ”€â”€ /chat
â”‚   â”‚   â”œâ”€â”€ ChatWindow.tsx        # Main conversation UI
â”‚   â”‚   â”œâ”€â”€ MessageBubble.tsx     # Single message
â”‚   â”‚   â”œâ”€â”€ ModelSelector.tsx     # Model dropdown
â”‚   â”‚   â”œâ”€â”€ InputArea.tsx         # Message input + voice
â”‚   â”‚   â”œâ”€â”€ ResponseActions.tsx   # Share, regenerate, etc.
â”‚   â”‚   â””â”€â”€ VoiceChat.tsx         # Voice mode toggle
â”‚   â”œâ”€â”€ /memory
â”‚   â”‚   â”œâ”€â”€ MemoryInspector.tsx   # Visual memory timeline
â”‚   â”‚   â”œâ”€â”€ MemoryCluster.tsx     # Grouped memory items
â”‚   â”‚   â”œâ”€â”€ MemorySearch.tsx      # Semantic search box
â”‚   â”‚   â””â”€â”€ MemoryPolicy.tsx      # Policy editor
â”‚   â”œâ”€â”€ /agents
â”‚   â”‚   â”œâ”€â”€ AgentBuilder.tsx      # No-code agent creation
â”‚   â”‚   â”œâ”€â”€ AgentList.tsx         # Agent directory
â”‚   â”‚   â”œâ”€â”€ AgentRunner.tsx       # Live agent execution
â”‚   â”‚   â””â”€â”€ MCPToolSelector.tsx   # MCP tool picker
â”‚   â”œâ”€â”€ /shared
â”‚   â”‚   â”œâ”€â”€ Sidebar.tsx
â”‚   â”‚   â”œâ”€â”€ TopNav.tsx
â”‚   â”‚   â”œâ”€â”€ Breadcrumbs.tsx
â”‚   â”‚   â”œâ”€â”€ LoadingSpinner.tsx
â”‚   â”‚   â””â”€â”€ Toast.tsx             # Notifications
â”‚   â””â”€â”€ /premium
â”‚       â”œâ”€â”€ PricingCards.tsx
â”‚       â”œâ”€â”€ UpgradeModal.tsx
â”‚       â””â”€â”€ FeatureComparison.tsx
â”œâ”€â”€ /hooks
â”‚   â”œâ”€â”€ useAuth.ts                # Clerk auth hook
â”‚   â”œâ”€â”€ useChat.ts                # Chat logic + mutations
â”‚   â”œâ”€â”€ useMemory.ts              # Memory search + management
â”‚   â”œâ”€â”€ useModels.ts              # Model selection
â”‚   â”œâ”€â”€ useVoice.ts               # Voice recording + playback
â”‚   â”œâ”€â”€ useWebSocket.ts           # Real-time connection
â”‚   â””â”€â”€ useUpgrade.ts             # Payment flow
â”œâ”€â”€ /stores                        # Zustand stores
â”‚   â”œâ”€â”€ chatStore.ts              # Active chat, messages
â”‚   â”œâ”€â”€ uiStore.ts                # Sidebar open, theme
â”‚   â”œâ”€â”€ userStore.ts              # User profile, tier
â”‚   â””â”€â”€ settingsStore.ts          # Preferences
â”œâ”€â”€ /lib
â”‚   â”œâ”€â”€ api.ts                    # API client (with interceptors)
â”‚   â”œâ”€â”€ auth.ts                   # Clerk integration
â”‚   â”œâ”€â”€ streaming.ts              # SSE/WebSocket handling
â”‚   â”œâ”€â”€ voice.ts                  # Web Audio API + Blob â†’ File
â”‚   â”œâ”€â”€ analytics.ts              # Event tracking (PostHog)
â”‚   â””â”€â”€ utils.ts                  # Helpers
â”œâ”€â”€ /styles
â”‚   â”œâ”€â”€ globals.css               # Tailwind + BaseUI overrides
â”‚   â”œâ”€â”€ theme.css                 # CSS variables for theming
â”‚   â””â”€â”€ animations.css            # Anime.js animations
â”œâ”€â”€ /public
â”‚   â”œâ”€â”€ /icons                    # Custom SVG icons
â”‚   â”œâ”€â”€ /logos                    # Aspendos logo variants
â”‚   â””â”€â”€ /images                   # Hero, feature images
â”œâ”€â”€ middleware.ts                 # Auth middleware (Clerk)
â”œâ”€â”€ next.config.ts                # Build config
â”œâ”€â”€ tailwind.config.ts
â”œâ”€â”€ tsconfig.json
â””â”€â”€ package.json
```

### 2.3 Key Frontend Pages

#### A. Landing Page (`/page.tsx`)

**Sections:**
1. Hero (headline, CTA, video demo)
2. Problem (fragmented AI, memory loss)
3. Solution (50+ models, memory, multi-model)
4. Features Grid (6 feature cards with Phosphor icons)
5. Pricing Cards (PRO $49, ULTRA $129)
6. Testimonials (carousel with Anime.js)
7. FAQ (accordion)
8. Final CTA ("Start now")

**Key interactions:**
- Smooth scroll animations (Anime.js)
- Pricing toggle (monthly/yearly)
- Video plays on scroll into view
- "Get Started" button â†’ Clerk sign-up

#### B. Chat Interface (`/(dashboard)/chat/[chatId]/page.tsx`)

**Layout:**
```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚          Top Nav (Aspendos logo)     â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚Sidebarâ”‚       Chat Window             â”‚
â”‚       â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  â”‚
â”‚ â€¢ Chatsâ”‚  â”‚ Message 1 (User)       â”‚  â”‚
â”‚ â€¢ Memoryâ”‚  â”‚                        â”‚  â”‚
â”‚ â€¢ Agentsâ”‚  â”‚ Message 2 (Model)      â”‚  â”‚
â”‚ â€¢ Settingsâ”‚ â”‚ [Share] [Regenerate] â”‚  â”‚
â”‚ â€¢ Billingâ”‚  â”‚                        â”‚  â”‚
â”‚       â”‚  â”‚ Message 3 (User)       â”‚  â”‚
â”‚       â”‚  â”‚                        â”‚  â”‚
â”‚       â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜  â”‚
â”‚       â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  â”‚
â”‚       â”‚  â”‚ Model: [GPT-5 â–¼]       â”‚  â”‚
â”‚       â”‚  â”‚ Input area...          â”‚  â”‚
â”‚       â”‚  â”‚ [Voice] [Send]         â”‚  â”‚
â”‚       â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜  â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

**Features:**
- Model selector (dropdown, shows current + memory cost)
- Message input with voice button (WebSocket real-time)
- Share response â†’ select chat to send to
- Re-generate with different model (dropdown of alternatives)
- Memory context indicator (green dot if memory used)
- Streaming responses (token-by-token with Anime.js effect)

**Real-time behavior:**
- WebSocket connection on mount
- Voice input â†’ send â†’ stream response â†’ voice output (if enabled)
- Auto-scroll to latest message
- Typing indicator when model thinking

#### C. Memory Inspector (`/(dashboard)/memory/page.tsx`)

**Features:**
- Timeline view of all memory items (ordered by date)
- Search bar (semantic + full-text)
- Filter by: type (context, preference, project), model, date range
- Cluster view (group by topic, using AI)
- Edit memory item (modal)
- Delete memory item (with confirmation)
- Memory policies (time-based expiration, model-based retention)

**Data visualization:**
- Timeline with Phosphor icons (bulb = insight, folder = project, user = preference)
- Anime.js animations on cluster open/close
- Memory usage meter (PRO: X items, ULTRA: 10x capacity)

#### D. Agent Builder (`/(dashboard)/agents/page.tsx`)

**No-code agent creation:**
1. Agent name + description
2. Select model (which model should execute)
3. Select tools (MCP tools, web search, code execution)
4. Test run (input â†’ live execution)
5. Save + deploy

**UI:**
- Card-based flow (Anime.js page transitions)
- Tool selector (search, grid view)
- Test console (input/output)
- Deployment status (live, inactive)

#### E. Billing Page (`/(dashboard)/billing/page.tsx`)

**Sections:**
1. Current plan (PRO $49/mo) + cancel option
2. Usage breakdown:
   - Models: X of 50 credit used
   - Memory: X items (Y% of quota)
   - Media: X generations remaining
3. Upgrade to ULTRA button
4. Billing history (table of charges)
5. Refund policy reminder

---

### 2.4 Component Library (BaseUI Integration)

**Key BaseUI components used:**

```typescript
// Button
<Button kind="primary" onClick={handleClick}>Send</Button>
<Button kind="secondary" size="compact">Cancel</Button>

// Select / Dropdown
<Select value={selectedModel} onChange={setSelectedModel}>
  <SelectOption value="gpt-5">GPT-5</SelectOption>
  <SelectOption value="claude-4.5">Claude 4.5</SelectOption>
</Select>

// Modal
<Modal isOpen={showMemory} onClose={handleClose}>
  <ModalHeader>Edit Memory Item</ModalHeader>
  <ModalBody>...</ModalBody>
  <ModalFooter>
    <Button onClick={handleClose}>Cancel</Button>
    <Button kind="primary" onClick={handleSave}>Save</Button>
  </ModalFooter>
</Modal>

// Toast
<Toast kind="positive">Memory saved!</Toast>
<Toast kind="negative">Error: Could not upload</Toast>

// Spinner / Skeleton
<Spinner />
<Skeleton width="100%" height="40px" />

// Accordion
<Accordion>
  <Panel title="FAQ Item 1">Content...</Panel>
  <Panel title="FAQ Item 2">Content...</Panel>
</Accordion>
```

### 2.5 Real-Time Features (WebSocket)

**Voice Chat Implementation:**

```typescript
// /components/chat/VoiceChat.tsx

const VoiceChat = ({ chatId, selectedModel }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [ws, setWs] = useState<WebSocket | null>(null);

  useEffect(() => {
    // Connect to voice WS server
    const socket = new WebSocket('wss://api.aspendos.com/voice');
    
    socket.onopen = () => {
      socket.send(JSON.stringify({
        type: 'init',
        chatId,
        model: selectedModel,
        userId: currentUser.id
      }));
    };

    socket.onmessage = async (event) => {
      const message = JSON.parse(event.data);
      
      if (message.type === 'audio_chunk') {
        // Play audio chunk (streaming response)
        const audio = new Audio(message.audioData);
        await audio.play();
      }
    };

    setWs(socket);
    return () => socket.close();
  }, [chatId, selectedModel]);

  const handleStartRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new MediaRecorder(stream);
    
    mediaRecorder.ondataavailable = (event) => {
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(event.data);
      }
    };

    mediaRecorder.start(100); // Send chunks every 100ms
    setIsRecording(true);
  };

  const handleStopRecording = () => {
    // mediaRecorder.stop() handled in ondataavailable
    setIsRecording(false);
  };

  return (
    <button 
      onClick={isRecording ? handleStopRecording : handleStartRecording}
      className={isRecording ? 'recording' : ''}
    >
      {isRecording ? <PhosphorIcon name="microphone-fill" /> : <PhosphorIcon name="microphone" />}
    </button>
  );
};
```

### 2.6 Streaming Responses (Token-by-Token)

```typescript
// /lib/streaming.ts

export const streamChatResponse = async (
  messages: Message[],
  model: string,
  onToken: (token: string) => void,
  onError: (error: string) => void
) => {
  const response = await fetch('/api/chat/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, model })
  });

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader?.read() || {};
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split('\n');

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = JSON.parse(line.slice(6));
        
        if (data.type === 'token') {
          onToken(data.token); // Update UI with each token
        } else if (data.type === 'error') {
          onError(data.message);
        }
      }
    }
  }
};
```

### 2.7 State Management (Zustand)

```typescript
// /stores/chatStore.ts

create<ChatStore>((set) => ({
  chats: [],
  activeChat: null,
  messages: [],
  isLoading: false,

  loadChat: async (chatId: string) => {
    const response = await api.get(`/chats/${chatId}`);
    set({ activeChat: response.chat, messages: response.messages });
  },

  addMessage: (message: Message) => {
    set((state) => ({
      messages: [...state.messages, message]
    }));
  },

  streamMessage: (token: string) => {
    set((state) => ({
      messages: state.messages.map((m, i) =>
        i === state.messages.length - 1
          ? { ...m, content: m.content + token }
          : m
      )
    }));
  },

  // ... other actions
}));
```

---

## 3. BACKEND ARCHITECTURE (TypeScript + Go + Python)

### 3.1 Service Architecture

#### **Main API Service (TypeScript, Express/Hono)**

```
/backend/api
â”œâ”€â”€ src/
â”‚   â”œâ”€â”€ main.ts                    # Server entry point
â”‚   â”œâ”€â”€ middleware/
â”‚   â”‚   â”œâ”€â”€ auth.ts               # Clerk JWT validation
â”‚   â”‚   â”œâ”€â”€ errorHandler.ts       # Global error handler
â”‚   â”‚   â”œâ”€â”€ rateLimiter.ts        # Token bucket (memory tier-aware)
â”‚   â”‚   â”œâ”€â”€ requestLogger.ts      # Structured logging (Datadog)
â”‚   â”‚   â””â”€â”€ corsHandler.ts
â”‚   â”œâ”€â”€ routes/
â”‚   â”‚   â”œâ”€â”€ /auth.ts              # User profile, logout (Clerk handles sign-up)
â”‚   â”‚   â”œâ”€â”€ /chat.ts              # GET /chats, POST /chats, GET /chats/:id
â”‚   â”‚   â”œâ”€â”€ /chat/:id/messages.ts # Stream messages, post message
â”‚   â”‚   â”œâ”€â”€ /memory.ts            # Search, CRUD memory items
â”‚   â”‚   â”œâ”€â”€ /models.ts            # List available models, usage
â”‚   â”‚   â”œâ”€â”€ /agents.ts            # Agent CRUD, test execution
â”‚   â”‚   â”œâ”€â”€ /billing.ts           # Current plan, usage, upgrade
â”‚   â”‚   â””â”€â”€ /webhooks.ts          # Polar, Stripe webhooks
â”‚   â”œâ”€â”€ controllers/
â”‚   â”‚   â”œâ”€â”€ chatController.ts
â”‚   â”‚   â”œâ”€â”€ memoryController.ts
â”‚   â”‚   â”œâ”€â”€ agentController.ts
â”‚   â”‚   â””â”€â”€ billingController.ts
â”‚   â”œâ”€â”€ services/
â”‚   â”‚   â”œâ”€â”€ ChatService.ts        # Business logic for chats
â”‚   â”‚   â”œâ”€â”€ MemoryService.ts      # Memory + RAG pipeline
â”‚   â”‚   â”œâ”€â”€ ModelService.ts       # Model selection, cost tracking
â”‚   â”‚   â”œâ”€â”€ BillingService.ts     # Credit tracking, pricing
â”‚   â”‚   â”œâ”€â”€ AgentService.ts       # Agent orchestration
â”‚   â”‚   â””â”€â”€ VoiceService.ts       # Voice streaming
â”‚   â”œâ”€â”€ db/
â”‚   â”‚   â”œâ”€â”€ schema.ts             # Prisma schema (ORM)
â”‚   â”‚   â”œâ”€â”€ migrations/           # DB migrations
â”‚   â”‚   â””â”€â”€ seed.ts               # Data seeding
â”‚   â”œâ”€â”€ lib/
â”‚   â”‚   â”œâ”€â”€ modelRouter.ts        # gRPC client to Go router
â”‚   â”‚   â”œâ”€â”€ embedding.ts          # Gemini embedding client
â”‚   â”‚   â”œâ”€â”€ qdrant.ts             # Vector DB client
â”‚   â”‚   â”œâ”€â”€ streaming.ts          # SSE/stream helpers
â”‚   â”‚   â”œâ”€â”€ voice.ts              # WebSocket handler
â”‚   â”‚   â””â”€â”€ logger.ts             # Datadog + console logs
â”‚   â”œâ”€â”€ types/
â”‚   â”‚   â”œâ”€â”€ models.ts             # TypeScript interfaces
â”‚   â”‚   â””â”€â”€ api.ts                # API request/response types
â”‚   â””â”€â”€ config/
â”‚       â””â”€â”€ env.ts                # Environment variables
â”œâ”€â”€ Dockerfile                     # Container image
â”œâ”€â”€ package.json
â”œâ”€â”€ tsconfig.json
â””â”€â”€ .env.example

```

#### **Model Router Service (Go)**

```
/backend/model-router
â”œâ”€â”€ main.go                        # Entry point
â”œâ”€â”€ router/
â”‚   â”œâ”€â”€ selector.go               # Model selection logic
â”‚   â”œâ”€â”€ fallback.go               # Fallback chain management
â”‚   â”œâ”€â”€ costCalculator.go         # Token cost estimation
â”‚   â””â”€â”€ cache.go                  # Model state caching
â”œâ”€â”€ providers/
â”‚   â”œâ”€â”€ openai.go                 # OpenAI client + fallback
â”‚   â”œâ”€â”€ anthropic.go              # Anthropic client
â”‚   â”œâ”€â”€ google.go                 # Google Gemini client
â”‚   â”œâ”€â”€ openrouter.go             # OpenRouter fallback
â”‚   â”œâ”€â”€ fal.go                    # FAL.ai (media generation)
â”‚   â””â”€â”€ judge0.go                 # Code execution
â”œâ”€â”€ models/
â”‚   â”œâ”€â”€ request.go                # Request structures
â”‚   â”œâ”€â”€ response.go               # Response structures
â”‚   â””â”€â”€ config.go                 # Model metadata
â”œâ”€â”€ server/
â”‚   â”œâ”€â”€ grpc.go                   # gRPC server definition
â”‚   â”œâ”€â”€ health.go                 # Health check endpoint
â”‚   â””â”€â”€ metrics.go                # Prometheus metrics
â”œâ”€â”€ proto/
â”‚   â””â”€â”€ router.proto              # gRPC service definition
â”œâ”€â”€ Dockerfile
â”œâ”€â”€ go.mod
â”œâ”€â”€ go.sum
â””â”€â”€ Makefile

```

**Model Router Proto Definition:**

```protobuf
// router.proto

service ModelRouter {
  rpc Route(RouteRequest) returns (RouteResponse);
  rpc StreamRoute(RouteRequest) returns (stream StreamToken);
  rpc GetModelStatus(GetModelStatusRequest) returns (ModelStatus);
}

message RouteRequest {
  string user_id = 1;
  string chat_id = 2;
  string preferred_model = 3;          // User's choice or auto-select
  repeated Message messages = 4;
  RouteStrategy strategy = 5;           // LOWEST_COST, LOWEST_LATENCY, BALANCED
  bool allow_fallback = 6;
}

message RouteResponse {
  string selected_model = 1;
  string provider = 2;                  // openai, anthropic, google
  string response = 3;
  int32 input_tokens = 4;
  int32 output_tokens = 5;
  float cost_usd = 6;
  int64 latency_ms = 7;
}

message StreamToken {
  string token = 1;
  int32 input_tokens = 2;
  int32 output_tokens = 3;
  float partial_cost = 4;
  int64 elapsed_ms = 5;
}

enum RouteStrategy {
  LOWEST_COST = 0;
  LOWEST_LATENCY = 1;
  BALANCED = 2;
  USER_PREFERENCE = 3;
}
```

#### **Agent Service (Python)**

```
/backend/agents
â”œâ”€â”€ main.py                        # FastAPI entry point
â”œâ”€â”€ routes/
â”‚   â”œâ”€â”€ agent.py                  # Agent CRUD endpoints
â”‚   â”œâ”€â”€ execute.py                # Agent execution + streaming
â”‚   â””â”€â”€ mcp.py                    # MCP tool management
â”œâ”€â”€ services/
â”‚   â”œâ”€â”€ agent_orchestrator.py    # Multi-agent coordination
â”‚   â”œâ”€â”€ tool_executor.py         # Tool calling logic
â”‚   â”œâ”€â”€ mcp_handler.py           # MCP server client
â”‚   â””â”€â”€ memory_rag.py            # RAG for agents
â”œâ”€â”€ models/
â”‚   â”œâ”€â”€ agent.py                 # Agent schema
â”‚   â””â”€â”€ tool.py                  # Tool schema
â”œâ”€â”€ mcp_servers/
â”‚   â”œâ”€â”€ __init__.py
â”‚   â””â”€â”€ builtin.py               # Builtin tools (web search, code exec)
â”œâ”€â”€ requirements.txt
â”œâ”€â”€ Dockerfile
â””â”€â”€ .env.example

```

---

### 3.2 Database Schema (Prisma)

```prisma
// schema.prisma

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

// Users (from Clerk, synced via webhook)
model User {
  id                String    @id @default(cuid())
  clerkId           String    @unique
  email             String    @unique
  name              String?
  avatar            String?
  tier              Tier      @default(PRO)        // PRO, ULTRA, ENTERPRISE
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  // Relations
  chats             Chat[]
  messages          Message[]
  memories          Memory[]
  agents            Agent[]
  billingAccount    BillingAccount?
  apiKeys           ApiKey[]

  @@index([clerkId])
  @@index([email])
}

enum Tier {
  PRO
  ULTRA
  ENTERPRISE
}

// Billing
model BillingAccount {
  id                String    @id @default(cuid())
  userId            String    @unique
  polarCustomerId   String?
  stripeCustomerId  String?
  subscriptionId    String?
  plan              String    @default("pro")     // pro, ultra
  status            String    @default("active")  // active, past_due, canceled
  monthlyCredit     Int       @default(50)        // $50 for PRO, $120 for ULTRA
  creditUsed        Int       @default(0)
  resetDate         DateTime  @default(now())     // When credit resets (monthly)
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  user              User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  creditHistory     CreditLog[]

  @@index([userId])
}

model CreditLog {
  id                String    @id @default(cuid())
  billingAccountId  String
  amount            Int       // Negative for usage, positive for refund
  reason            String    // "model_inference", "memory_embedding", "media_generation", "refund"
  metadata          Json?     // { modelUsed, tokens, etc }
  createdAt         DateTime  @default(now())

  account           BillingAccount @relation(fields: [billingAccountId], references: [id], onDelete: Cascade)

  @@index([billingAccountId])
}

// Conversations
model Chat {
  id                String    @id @default(cuid())
  userId            String
  title             String    @default("New Chat")
  description       String?
  modelPreference   String?   // null = auto-select
  memoryScope       String    @default("global")  // global, project, chat
  projectId         String?   // For project-scoped memory
  isArchived        Boolean   @default(false)
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  user              User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  messages          Message[]
  memories          Memory[]

  @@index([userId])
  @@index([createdAt])
}

model Message {
  id                String    @id @default(cuid())
  chatId            String
  userId            String
  role              String    // "user", "assistant"
  content           String    @db.Text
  modelUsed         String?   // Which model generated this (for assistant messages)
  tokensIn          Int       @default(0)
  tokensOut         Int       @default(0)
  costUsd           Float     @default(0)
  memoryItems       String[]  // IDs of memories used/created
  metadata          Json?     // { voice: true, modelFallback: "claude", etc }
  createdAt         DateTime  @default(now())

  chat              Chat      @relation(fields: [chatId], references: [id], onDelete: Cascade)
  user              User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([chatId])
  @@index([userId])
  @@index([createdAt])
}

// Memory System
model Memory {
  id                String    @id @default(cuid())
  userId            String
  chatId            String?   // null = global memory
  content           String    @db.Text
  type              String    // "context", "preference", "insight", "project"
  source            String?   // "user_input", "extracted", "ai_generated"
  embedding         Vector    // 768-dim Gemini embedding
  importance        Int       @default(50)        // 1-100 scale
  tags              String[]
  expiresAt         DateTime? // null = never expires
  lastAccessedAt    DateTime  @default(now())
  accessCount       Int       @default(0)
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  user              User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  chat              Chat?     @relation(fields: [chatId], references: [id], onDelete: SetNull)

  @@index([userId])
  @@index([chatId])
  @@index([type])
  @@fulltext([content])  // PostgreSQL full-text search
}

// Agents
model Agent {
  id                String    @id @default(cuid())
  userId            String
  name              String
  description       String?
  instructions      String    @db.Text
  modelPreference   String    @default("auto")
  tools             String[]  // Tool IDs (MCP tools, web search, code exec)
  isActive          Boolean   @default(true)
  executionHistory  String[]  // Last 10 execution IDs
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  user              User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  executions        AgentExecution[]

  @@index([userId])
}

model AgentExecution {
  id                String    @id @default(cuid())
  agentId           String
  input             String    @db.Text
  output            String    @db.Text
  status            String    // "running", "completed", "failed"
  duration          Int       // milliseconds
  costUsd           Float     @default(0)
  metadata          Json?     // Tool calls, errors, etc
  createdAt         DateTime  @default(now())

  agent             Agent     @relation(fields: [agentId], references: [id], onDelete: Cascade)

  @@index([agentId])
  @@index([createdAt])
}

// API Keys (for developers)
model ApiKey {
  id                String    @id @default(cuid())
  userId            String
  name              String
  keyHash           String    @unique // SHA-256 hash
  lastUsedAt        DateTime?
  createdAt         DateTime  @default(now())
  expiresAt         DateTime?

  user              User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}
```

---

### 3.3 API Endpoints (Full List)

#### **Authentication (Clerk handles sign-up/login)**

```
POST   /api/auth/logout
GET    /api/auth/me                    # Current user profile + tier
PATCH  /api/auth/me                    # Update profile
```

#### **Chats**

```
GET    /api/chats                      # List all chats (paginated)
POST   /api/chats                      # Create new chat
GET    /api/chats/:id                  # Get chat + last N messages
PATCH  /api/chats/:id                  # Update chat (title, model pref)
DELETE /api/chats/:id                  # Archive chat
```

#### **Messages (with streaming)**

```
POST   /api/chats/:id/messages         # Send message â†’ stream response
  Request: {
    content: string,
    model?: string,  // override preference
    memoryContext?: boolean
  }
  Response: Server-Sent Events (SSE)
    data: { type: "token", token: "hello" }
    data: { type: "complete", tokensOut: 5, costUsd: 0.001 }

GET    /api/chats/:id/messages         # Get all messages in chat
DELETE /api/chats/:id/messages/:msgId  # Delete message
```

#### **Memory**

```
GET    /api/memory                     # List user's memory (paginated)
POST   /api/memory/search              # Semantic + full-text search
  Request: { query: string, limit?: 10, offset?: 0 }
  Response: [{ id, content, relevance, type, createdAt }, ...]

POST   /api/memory                     # Create memory item
PATCH  /api/memory/:id                 # Update memory
DELETE /api/memory/:id                 # Delete memory
GET    /api/memory/:id                 # Get single memory
```

#### **Models**

```
GET    /api/models                     # List available models + usage
POST   /api/models/test                # Test model selection (for route debugging)
GET    /api/models/cost                # Cost per model
```

#### **Agents**

```
GET    /api/agents                     # List agents
POST   /api/agents                     # Create agent
GET    /api/agents/:id                 # Get agent
PATCH  /api/agents/:id                 # Update agent
DELETE /api/agents/:id                 # Delete agent

POST   /api/agents/:id/execute         # Execute agent â†’ stream output
POST   /api/agents/:id/test            # Test run agent
```

#### **Billing**

```
GET    /api/billing/account            # Current plan + credit usage
POST   /api/billing/upgrade            # Upgrade to ULTRA (redirect to Polar)
POST   /api/billing/manage             # Manage subscription (redirect to Polar)
GET    /api/billing/usage              # Detailed credit breakdown
POST   /api/billing/refund             # Request refund (manual approval)
```

#### **Webhooks**

```
POST   /api/webhooks/polar             # Polar subscription events
POST   /api/webhooks/clerk             # Clerk user sync
```

---

### 3.4 Authentication (Clerk Integration)

**Setup:**
1. Create Clerk project on `clerk.com`
2. Environment variables:
   ```
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
   CLERK_SECRET_KEY=sk_...
   CLERK_WEBHOOK_SECRET=whsec_...
   ```
3. Middleware in Next.js:

```typescript
// middleware.ts
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isProtectedRoute = createRouteMatcher(['/(dashboard)/(.*)']);

export default clerkMiddleware((auth, req) => {
  if (isProtectedRoute(req)) {
    auth().protect();
  }
});

export const config = {
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
};
```

4. User sync webhook â†’ Prisma:

```typescript
// /api/webhooks/clerk
import { Webhook } from 'svix';

export async function POST(req: Request) {
  const payload = await req.json();
  const headers = {
    'svix-id': req.headers.get('svix-id')!,
    'svix-timestamp': req.headers.get('svix-timestamp')!,
    'svix-signature': req.headers.get('svix-signature')!,
  };

  const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET!);
  let evt = wh.verify(JSON.stringify(payload), headers) as ClerkEvent;

  if (evt.type === 'user.created') {
    await prisma.user.create({
      data: {
        clerkId: evt.data.id,
        email: evt.data.email_addresses[0].email_address,
        name: `${evt.data.first_name} ${evt.data.last_name}`,
        tier: 'PRO',
      },
    });

    // Create billing account
    await prisma.billingAccount.create({
      data: {
        userId: user.id,
        plan: 'pro',
        monthlyCredit: 50,
      },
    });
  }

  return new Response('OK');
}
```

---

### 3.5 Memory & RAG Pipeline

**Embedding Flow:**

```
User Input
   â†“
[1] Extract + clean text
   â†“
[2] Generate embedding (Gemini 1.5 Embedding API)
   â†“
[3] Store in Qdrant (vector DB)
   â†“
[4] Index in Postgres (full-text search)
```

**Retrieval (RAG) Flow:**

```
User asks: "What was that Python code I wrote last week?"
   â†“
[1] Embed question (Gemini)
   â†“
[2] Search Qdrant (hybrid: semantic + tag filter)
   â†“
[3] Re-rank results (optional: Cohere reranker)
   â†“
[4] Inject top-3 into system prompt
   â†“
[5] Send to model router
```

**Implementation:**

```typescript
// /backend/src/services/MemoryService.ts

export class MemoryService {
  constructor(
    private prisma: PrismaClient,
    private qdrant: QdrantClient,
    private gemini: GoogleGenerativeAI
  ) {}

  async createMemory(
    userId: string,
    chatId: string,
    content: string,
    type: 'context' | 'preference' | 'insight' | 'project'
  ) {
    // 1. Generate embedding
    const embedding = await this.gemini.embedContent({
      model: 'models/gemini-1.5-embedding-001',
      content,
    });

    // 2. Store in Postgres
    const memory = await this.prisma.memory.create({
      data: {
        userId,
        chatId,
        content,
        type,
        embedding: embedding.embedding.values,
      },
    });

    // 3. Index in Qdrant
    await this.qdrant.upsert('memories', {
      points: [
        {
          id: memory.id,
          vector: embedding.embedding.values,
          payload: {
            userId,
            chatId,
            type,
            createdAt: memory.createdAt,
          },
        },
      ],
    });

    return memory;
  }

  async searchMemory(
    userId: string,
    query: string,
    limit: number = 5,
    chatId?: string
  ) {
    // 1. Embed query
    const queryEmbedding = await this.gemini.embedContent({
      model: 'models/gemini-1.5-embedding-001',
      content: query,
    });

    // 2. Vector search
    const results = await this.qdrant.search('memories', {
      vector: queryEmbedding.embedding.values,
      limit,
      filter: {
        must: [
          {
            key: 'userId',
            match: { value: userId },
          },
          ...(chatId ? [{ key: 'chatId', match: { value: chatId } }] : []),
        ],
      },
    });

    // 3. Get full records from Postgres
    const memoryIds = results.map((r) => r.id);
    const memories = await this.prisma.memory.findMany({
      where: { id: { in: memoryIds } },
    });

    // 4. Re-rank (optional, for now just return)
    return memories;
  }

  async buildMemoryContext(
    userId: string,
    chatId: string,
    currentQuery: string,
    maxTokens: number = 2000
  ): Promise<string> {
    const memories = await this.searchMemory(
      userId,
      currentQuery,
      5,
      chatId
    );

    let context = '';
    let tokens = 0;

    for (const mem of memories) {
      const addition = `[${mem.type.toUpperCase()}] ${mem.content}\n`;
      tokens += addition.split(' ').length;

      if (tokens > maxTokens) break;
      context += addition;
    }

    return context ? `## Relevant Context:\n${context}` : '';
  }
}
```

**Qdrant Cloud Setup:**

```bash
# Create cluster on qdrant.io
# 1. Create collection "memories"
# 2. Set vector size: 768 (Gemini embedding dimension)
# 3. Set distance metric: Cosine

# Environment variables:
QDRANT_URL=https://xxxxx.qdrant.io
QDRANT_API_KEY=xxxxx
```

---

### 3.6 Model Router Logic (Go)

**Routing Strategy:**

```go
// /backend/model-router/router/selector.go

type SelectionStrategy string

const (
  LOWEST_COST   SelectionStrategy = "lowest_cost"
  LOWEST_LATENCY                   = "lowest_latency"
  BALANCED                         = "balanced"
  USER_PREFERENCE                  = "user_preference"
)

type ModelSelector struct {
  models     map[string]*ModelConfig
  cache      *Cache
  logger     Logger
}

func (s *ModelSelector) SelectModel(
  userPreference string,
  strategy SelectionStrategy,
  userTier string,
) (string, string, error) { // model, provider, error
  
  // 1. If user preferred model is available â†’ use it
  if userPreference != "" && s.isAvailable(userPreference) {
    return userPreference, s.models[userPreference].Provider, nil
  }

  // 2. Apply strategy
  switch strategy {
  case LOWEST_COST:
    return s.selectByCost(userTier)
  case LOWEST_LATENCY:
    return s.selectByLatency()
  case BALANCED:
    return s.selectBalanced()
  default:
    return "gpt-5", "openai", nil
  }
}

// Fallback chain if selected model fails
func (s *ModelSelector) GetFallbackChain(model string) []string {
  chains := map[string][]string{
    "gpt-5": {"gpt-4o", "claude-4.5", "gemini-ultra-2"},
    "claude-4.5": {"claude-sonnet", "gpt-5", "gemini-ultra-2"},
    "gemini-ultra-2": {"gpt-5", "claude-4.5", "claude-sonnet"},
  }
  return chains[model]
}
```

**Cost Calculation:**

```go
type CostCalculator struct {
  pricing map[string]PricingInfo
}

type PricingInfo struct {
  InputPerMTok    float32  // Cost per 1M input tokens
  OutputPerMTok   float32  // Cost per 1M output tokens
}

// Pricing (as of Jan 2026)
var pricing = map[string]PricingInfo{
  "gpt-5": {
    InputPerMTok:  15.0,   // $15 per 1M input tokens
    OutputPerMTok: 60.0,   // $60 per 1M output tokens
  },
  "gpt-4o": {
    InputPerMTok:  2.50,
    OutputPerMTok: 10.0,
  },
  "claude-4.5": {
    InputPerMTok:  3.0,
    OutputPerMTok: 15.0,
  },
  "deepseek-v3": {
    InputPerMTok:  0.27,   // Very cheap
    OutputPerMTok: 1.10,
  },
}

func (c *CostCalculator) CalculateCost(
  model string,
  inputTokens int,
  outputTokens int,
) float32 {
  pricing := pricing[model]
  
  inputCost := (float32(inputTokens) / 1_000_000) * pricing.InputPerMTok
  outputCost := (float32(outputTokens) / 1_000_000) * pricing.OutputPerMTok
  
  return inputCost + outputCost
}
```

---

### 3.7 Payment System (Polar Integration)

**Polar Setup:**

1. Sign up on `polar.sh` (no business registration needed, they're Merchant of Record)
2. Create products:
   - PRO: $49/month
   - ULTRA: $129/month
3. Get API keys:
   ```
   POLAR_ACCESS_TOKEN=xxx
   POLAR_ORGANIZATION_ID=xxx
   ```

**Implementation:**

```typescript
// /backend/src/services/BillingService.ts

import Polar from '@polar-sh/sdk';

export class BillingService {
  private polar: Polar;

  constructor() {
    this.polar = new Polar({
      accessToken: process.env.POLAR_ACCESS_TOKEN,
    });
  }

  async createSubscription(
    userId: string,
    productId: string,  // "pro" or "ultra"
    userEmail: string
  ) {
    // 1. Create customer in Polar
    const customer = await this.polar.customers.create({
      organizationId: process.env.POLAR_ORGANIZATION_ID,
      email: userEmail,
      name: `Customer ${userId}`,
    });

    // 2. Create subscription
    const subscription = await this.polar.subscriptions.create({
      customerId: customer.id,
      productId,
      // Polar handles checkout + payment automatically
    });

    // 3. Get checkout URL
    const checkout = subscription.checkoutUrl;

    // 4. Store in DB
    await prisma.billingAccount.update({
      where: { userId },
      data: {
        polarCustomerId: customer.id,
        subscriptionId: subscription.id,
        plan: productId,
      },
    });

    return { checkoutUrl: checkout };
  }

  async handlePolarWebhook(event: any) {
    if (event.type === 'subscription.created') {
      const { customerId, productId } = event.data;
      
      // Get user by Polar customer ID
      const billingAccount = await prisma.billingAccount.findUnique({
        where: { polarCustomerId: customerId },
      });

      // Update subscription
      await prisma.billingAccount.update({
        where: { id: billingAccount.id },
        data: {
          plan: productId,
          status: 'active',
          resetDate: new Date(),
          creditUsed: 0,
        },
      });
    }

    if (event.type === 'subscription.updated') {
      // Handle plan changes, cancellations, etc
    }
  }
}
```

**Webhook handler:**

```typescript
// /api/webhooks/polar

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get('X-Polar-Signature')!;

  // Verify signature
  const isValid = verifyPolarSignature(body, signature);
  if (!isValid) {
    return new Response('Unauthorized', { status: 401 });
  }

  const event = JSON.parse(body);
  await billingService.handlePolarWebhook(event);

  return new Response('OK');
}
```

---

### 3.8 Rate Limiting (Tier-Aware)

```typescript
// /backend/src/middleware/rateLimiter.ts

import { RateLimiterRedis } from 'rate-limiter-flexible';
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

const rateLimiters = {
  pro: {
    points: 100,    // 100 requests per minute
    duration: 60,
  },
  ultra: {
    points: 500,
    duration: 60,
  },
  enterprise: {
    points: 5000,
    duration: 60,
  },
};

export const rateLimiterMiddleware = async (req, res, next) => {
  const user = req.user;
  const tier = user.tier.toLowerCase();
  const config = rateLimiters[tier];

  const limiter = new RateLimiterRedis({
    client: redis,
    points: config.points,
    duration: config.duration,
    blockDurationSecs: 10,
    keyPrefix: `rl_${tier}`,
  });

  try {
    await limiter.consume(user.id);
    next();
  } catch (err) {
    res.status(429).json({ error: 'Too many requests' });
  }
};
```

---

## 4. REAL-TIME & VOICE ARCHITECTURE

### 4.1 Voice Chat Flow (OpenAI Realtime API)

```typescript
// /backend/src/services/VoiceService.ts

export class VoiceService {
  private openaiClient: OpenAI;

  constructor() {
    this.openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async createRealtimeConnection(
    sessionId: string,
    userId: string
  ): Promise<WebSocket> {
    // OpenAI Realtime API uses WebSocket
    const ws = new WebSocket(
      'wss://api.openai.com/v1/realtime?model=gpt-4-realtime-preview'
    );

    ws.onopen = () => {
      // Authenticate + initialize session
      ws.send(JSON.stringify({
        type: 'session.update',
        session: {
          modalities: ['text', 'audio'],
          instructions: 'You are a helpful AI assistant.',
          voice: 'alloy', // or shimmer, echo, fable, onyx, nova, sage
          input_audio_format: 'pcm16',
          output_audio_format: 'pcm16',
        },
      }));
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      
      if (message.type === 'response.audio.delta') {
        // Stream audio chunk to client
        this.broadcastToClient(sessionId, {
          type: 'audio_chunk',
          data: message.delta,
        });
      }

      if (message.type === 'response.done') {
        // Store message in DB
        const { text, audio } = message.response;
        this.storeMessage(userId, text, 'gpt-4-realtime');
      }
    };

    return ws;
  }

  async handleClientAudio(
    sessionId: string,
    audioPCM16: Buffer
  ) {
    // Send audio chunk to OpenAI
    const ws = this.sessions.get(sessionId);
    
    ws.send(JSON.stringify({
      type: 'input_audio_buffer.append',
      audio: audioPCM16.toString('base64'),
    }));
  }
}
```

**Frontend WebSocket handler:**

```typescript
// /frontend/hooks/useVoice.ts

const VoiceConnection = () => {
  const [ws, setWs] = useState<WebSocket | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    // Connect to voice WS server (our backend)
    const socket = new WebSocket('wss://api.aspendos.com/voice');

    socket.onopen = () => {
      console.log('Voice connected');
    };

    socket.onmessage = (event) => {
      const msg = JSON.parse(event.data);

      if (msg.type === 'audio_chunk') {
        // Decode base64 audio chunk + play
        const audioData = atob(msg.data);
        const arrayBuffer = new ArrayBuffer(audioData.length);
        const view = new Uint8Array(arrayBuffer);

        for (let i = 0; i < audioData.length; i++) {
          view[i] = audioData.charCodeAt(i);
        }

        const audioBlob = new Blob([arrayBuffer], { type: 'audio/pcm' });
        const audioUrl = URL.createObjectURL(audioBlob);

        if (audioRef.current) {
          audioRef.current.src = audioUrl;
          audioRef.current.play();
        }
      }
    };

    setWs(socket);

    return () => socket.close();
  }, []);

  const sendAudio = (audioPCM16: Uint8Array) => {
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'audio_data',
        data: btoa(String.fromCharCode(...audioPCM16)),
      }));
    }
  };

  return { sendAudio };
};
```

### 4.2 Fallback to Text (if voice unavailable)

```typescript
// If voice fails, fallback to text chat with streaming

const handleTextMessage = async (
  chatId: string,
  content: string,
  model: string
) => {
  const response = await fetch(`/api/chats/${chatId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ content, model }),
  });

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader?.read() || {};
    if (done) break;

    const chunk = decoder.decode(value);
    // Process SSE events
    // Token-by-token update UI
  }
};
```

---

## 5. AUTHENTICATION & SECURITY

### 5.1 Clerk Configuration

**Environment Variables (Next.js):**

```bash
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_xxxxx
CLERK_SECRET_KEY=sk_live_xxxxx
CLERK_WEBHOOK_SECRET=whsec_xxxxx

# JWT
CLERK_JWT_KEY=xxxxx
```

**OAuth Providers (configure in Clerk dashboard):**
- Google
- GitHub
- Apple

---

### 5.2 JWT Token Validation

```typescript
// /backend/src/middleware/auth.ts

import { jwtDecode } from 'jwt-decode';

export const verifyJWT = (token: string): DecodedJWT | null => {
  try {
    const decoded = jwtDecode(token) as DecodedJWT;

    // Check expiration
    if (decoded.exp && decoded.exp * 1000 < Date.now()) {
      return null;
    }

    return decoded;
  } catch {
    return null;
  }
};

export const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing auth token' });
  }

  const token = authHeader.slice(7);
  const decoded = verifyJWT(token);

  if (!decoded) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  // Fetch user from DB
  const user = await prisma.user.findUnique({
    where: { clerkId: decoded.sub },
  });

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  req.user = user;
  next();
};
```

### 5.3 Encryption at Rest

**Database Encryption:**
- PostgreSQL: Enable SSL/TLS for connections
- Sensitive fields: Encrypt using `@prisma/field-level-encryption`

```typescript
// Encrypt API keys, user preferences
import { encrypt, decrypt } from '@prisma/field-level-encryption';

model ApiKey {
  id          String  @id @default(cuid())
  userId      String
  keyHash     String  @unique
  key         String  @encrypted  // Auto-encrypted at rest
  createdAt   DateTime @default(now())
}
```

---

## 6. MONITORING & OBSERVABILITY

### 6.1 Datadog Setup

**Environment variables:**

```bash
DD_SITE=datadoghq.com
DD_API_KEY=xxxxx
DD_APP_KEY=xxxxx
```

**Instrumentation:**

```typescript
// /backend/src/lib/logger.ts

import { datadog } from 'datadog-api-client-typescript';

export const logger = {
  info: (message: string, metadata?: Record<string, any>) => {
    console.log(message, metadata);
    // Send to Datadog
    datadog.send({
      level: 'info',
      message,
      metadata,
      timestamp: Date.now(),
    });
  },

  error: (message: string, error?: Error, context?: any) => {
    console.error(message, error);
    datadog.send({
      level: 'error',
      message,
      error: error?.message,
      stack: error?.stack,
      context,
      timestamp: Date.now(),
    });
  },
};
```

### 6.2 Prometheus Metrics

```go
// /backend/model-router/server/metrics.go

import "github.com/prometheus/client_golang/prometheus"

var (
  routingLatency = prometheus.NewHistogramVec(
    prometheus.HistogramOpts{
      Name: "aspendos_routing_latency_ms",
    },
    []string{"model", "provider"},
  )

  modelErrors = prometheus.NewCounterVec(
    prometheus.CounterOpts{
      Name: "aspendos_model_errors_total",
    },
    []string{"model", "error_type"},
  )

  creditUsage = prometheus.NewCounterVec(
    prometheus.CounterOpts{
      Name: "aspendos_credit_usage_total",
    },
    []string{"user_tier", "operation"},
  )
)

func init() {
  prometheus.MustRegister(routingLatency)
  prometheus.MustRegister(modelErrors)
  prometheus.MustRegister(creditUsage)
}
```

### 6.3 Error Tracking (Sentry)

```typescript
// /frontend/sentry.client.config.ts

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  integrations: [
    new Sentry.Replay({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});
```

---

## 7. DEPLOYMENT & INFRASTRUCTURE

### 7.1 Deployment Architecture

```
Developer Push
    â†“
GitHub â†’ GitHub Actions (CI/CD)
    â†“
  [Test + Build]
    â†“
 [Push to Artifact Registry]
    â†“
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚  Google Cloud               â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”   â”‚
â”‚  â”‚ Cloud Run            â”‚   â”‚
â”‚  â”‚ - API Service        â”‚   â”‚
â”‚  â”‚ - Model Router       â”‚   â”‚
â”‚  â”‚ - Agent Service      â”‚   â”‚
â”‚  â”‚ - Voice Service      â”‚   â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜   â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”   â”‚
â”‚  â”‚ Cloud SQL            â”‚   â”‚
â”‚  â”‚ (PostgreSQL)         â”‚   â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜   â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”   â”‚
â”‚  â”‚ Cloud Storage        â”‚   â”‚
â”‚  â”‚ (Files + backups)    â”‚   â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜   â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
    â†‘
    â””â”€â”€ Vercel (Frontend)
        - Next.js auto-deploy
        - Edge functions
        - CDN
```

### 7.2 Docker Images

**Backend API (TypeScript):**

```dockerfile
# /backend/api/Dockerfile

FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./
EXPOSE 3000
CMD ["node", "dist/main.js"]
```

**Model Router (Go):**

```dockerfile
# /backend/model-router/Dockerfile

FROM golang:1.22-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o router .

FROM alpine:3.19
WORKDIR /app
COPY --from=builder /app/router .
EXPOSE 3001
CMD ["./router"]
```

### 7.3 Cloud Run Deployment

```yaml
# cloudbuild.yaml

steps:
  # 1. Build API service
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'build'
      - '-t'
      - 'gcr.io/$PROJECT_ID/aspendos-api:$SHORT_SHA'
      - '-f'
      - 'backend/api/Dockerfile'
      - 'backend/api'

  # 2. Push to Artifact Registry
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'push'
      - 'gcr.io/$PROJECT_ID/aspendos-api:$SHORT_SHA'

  # 3. Deploy to Cloud Run
  - name: 'gcr.io/cloud-builders/gke-deploy'
    args:
      - 'run'
      - '--filename=gke/api-service.yaml'
      - '--image=gcr.io/$PROJECT_ID/aspendos-api:$SHORT_SHA'
      - '--location=us-central1'

  # 4. Build & deploy Model Router
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'build'
      - '-t'
      - 'gcr.io/$PROJECT_ID/aspendos-router:$SHORT_SHA'
      - '-f'
      - 'backend/model-router/Dockerfile'
      - 'backend/model-router'

  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'push'
      - 'gcr.io/$PROJECT_ID/aspendos-router:$SHORT_SHA'

options:
  machineType: 'N1_HIGHCPU_8'
  logging: CLOUD_LOGGING_ONLY
  
substitutions:
  _SERVICE_NAME: 'aspendos-api'
  _REGION: 'us-central1'
```

**Cloud Run Service Configuration:**

```yaml
# gke/api-service.yaml

apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: aspendos-api
  namespace: default
spec:
  template:
    spec:
      containers:
      - image: gcr.io/PROJECT_ID/aspendos-api:latest
        resources:
          limits:
            memory: '512Mi'
            cpu: '1000m'
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: aspendos-secrets
              key: database-url
        - name: OPENAI_API_KEY
          valueFrom:
            secretKeyRef:
              name: aspendos-secrets
              key: openai-key
        ports:
        - containerPort: 3000
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 10
      serviceAccountName: aspendos
      
  traffic:
  - percent: 100
    latestRevision: true
```

### 7.4 Database Migration

```bash
# Deploy PostgreSQL (Cloud SQL)

# 1. Create instance
gcloud sql instances create aspendos-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=us-central1 \
  --backup

# 2. Create database
gcloud sql databases create aspendos \
  --instance=aspendos-db

# 3. Create user
gcloud sql users create aspendos \
  --instance=aspendos-db \
  --password

# 4. Run migrations
npx prisma migrate deploy
```

---

## 8. PAYMENT & BILLING (Detailed)

### 8.1 Polar Webhook Handling

```typescript
// /api/webhooks/polar

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get('X-Polar-Signature');

  // Verify signature
  const isValid = verifySig(body, signature, POLAR_WEBHOOK_SECRET);
  if (!isValid) return res(401);

  const event = JSON.parse(body);

  switch (event.type) {
    case 'subscription.created':
    case 'subscription.updated':
      await handleSubscriptionChange(event.data);
      break;

    case 'subscription.canceled':
      await handleCancellation(event.data);
      break;

    case 'subscription.revoked':
      await handleRevocation(event.data);
      break;
  }

  return res(200);
}

async function handleSubscriptionChange(data) {
  const { customerId, productId, status } = data;

  const billingAccount = await prisma.billingAccount.findFirst({
    where: { polarCustomerId: customerId },
    include: { user: true },
  });

  if (!billingAccount) return;

  // Determine monthly credit based on product
  const creditMap = {
    'pro': 50,
    'ultra': 120,
  };

  await prisma.billingAccount.update({
    where: { id: billingAccount.id },
    data: {
      plan: productId,
      status: status === 'active' ? 'active' : 'inactive',
      monthlyCredit: creditMap[productId],
      creditUsed: 0,
      resetDate: new Date(),
    },
  });

  // Send confirmation email
  await sendEmail({
    to: billingAccount.user.email,
    subject: `Welcome to Aspendos ${productId.toUpperCase()}!`,
    template: 'subscription-confirmation',
  });
}
```

### 8.2 Credit System Implementation

**Credit Deduction Logic:**

```typescript
// /backend/src/services/BillingService.ts

async deductCredit(
  userId: string,
  operation: 'model_inference' | 'media_generation' | 'memory_embedding',
  amount: number,
  metadata: any
) {
  const billingAccount = await prisma.billingAccount.findUnique({
    where: { userId },
  });

  if (!billingAccount) throw new Error('No billing account');

  // Check if over quota
  const available = billingAccount.monthlyCredit - billingAccount.creditUsed;
  if (amount > available) {
    throw new Error('Insufficient credits');
  }

  // Deduct credit
  await prisma.billingAccount.update({
    where: { id: billingAccount.id },
    data: {
      creditUsed: { increment: amount },
    },
  });

  // Log transaction
  await prisma.creditLog.create({
    data: {
      billingAccountId: billingAccount.id,
      amount: -amount, // Negative for usage
      reason: operation,
      metadata,
    },
  });

  // Send warning if >80%
  if ((billingAccount.creditUsed + amount) / billingAccount.monthlyCredit > 0.8) {
    await sendEmail({
      to: user.email,
      subject: '80% of your monthly credits used',
      template: 'credit-warning',
    });
  }
}
```

**Monthly Credit Reset (Cron Job):**

```typescript
// /backend/src/cron/creditReset.ts

import cron from 'node-cron';

export const startCreditResetCron = () => {
  // Every day at 12:00 AM UTC, check for monthly resets
  cron.schedule('0 0 * * *', async () => {
    const now = new Date();

    const accounts = await prisma.billingAccount.findMany({
      where: {
        resetDate: { lte: now },
      },
    });

    for (const account of accounts) {
      await prisma.billingAccount.update({
        where: { id: account.id },
        data: {
          creditUsed: 0,
          resetDate: new Date(
            now.getFullYear(),
            now.getMonth() + 1,
            now.getDate()
          ),
        },
      });
    }

    console.log(`Reset credits for ${accounts.length} accounts`);
  });
};
```

---

## 9. DEVELOPER SDK & API

### 9.1 TypeScript SDK

**Package:** `@aspendos/sdk`

```typescript
// /sdk/src/index.ts

import { Aspendos, ChatMessage, Memory } from './types';

export class AspendosSDK {
  private baseURL = 'https://api.aspendos.com';
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  // Chats
  async createChat(title: string) {
    return this.fetch('/chats', {
      method: 'POST',
      body: { title },
    });
  }

  async sendMessage(
    chatId: string,
    content: string,
    options?: { model?: string; memoryContext?: boolean }
  ): Promise<AsyncIterable<string>> {
    // Returns async iterator for streaming tokens
    return this.fetchStream(`/chats/${chatId}/messages`, {
      method: 'POST',
      body: { content, ...options },
    });
  }

  // Memory
  async searchMemory(
    query: string,
    options?: { limit?: number; chatId?: string }
  ): Promise<Memory[]> {
    return this.fetch('/memory/search', {
      method: 'POST',
      body: { query, ...options },
    });
  }

  async addMemory(
    content: string,
    type: 'context' | 'preference' | 'insight'
  ): Promise<Memory> {
    return this.fetch('/memory', {
      method: 'POST',
      body: { content, type },
    });
  }

  // Agents
  async createAgent(config: AgentConfig) {
    return this.fetch('/agents', {
      method: 'POST',
      body: config,
    });
  }

  async executeAgent(agentId: string, input: string) {
    return this.fetchStream(`/agents/${agentId}/execute`, {
      method: 'POST',
      body: { input },
    });
  }

  // Utility
  private async fetch(endpoint: string, options: any) {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return response.json();
  }

  private async *fetchStream(endpoint: string, options: any) {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader?.read() || {};
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = JSON.parse(line.slice(6));
          if (data.type === 'token') {
            yield data.token;
          }
        }
      }
    }
  }
}

export default AspendosSDK;
```

### 9.2 SDK Usage Examples

**Example 1: Simple Chat**

```typescript
import AspendosSDK from '@aspendos/sdk';

const aspendos = new AspendosSDK('sk_live_xxxxx');

const chat = await aspendos.createChat('Project Alpha');

// Stream response token-by-token
const response = aspendos.sendMessage(
  chat.id,
  'Write a TypeScript function to fetch data'
);

for await (const token of response) {
  process.stdout.write(token);
}
```

**Example 2: Memory-Augmented Chat**

```typescript
// Add context to memory
await aspendos.addMemory(
  'User prefers TypeScript over JavaScript',
  'preference'
);

// Query uses memory automatically
const response = await aspendos.sendMessage(
  chatId,
  'How should I structure a project?',
  { memoryContext: true }
);
```

**Example 3: Agent Execution**

```typescript
// Create agent for research
const agent = await aspendos.createAgent({
  name: 'Research Assistant',
  instructions: 'Search for information and summarize findings',
  tools: ['web_search', 'memory_search'],
});

// Execute agent
const result = aspendos.executeAgent(
  agent.id,
  'What are the latest trends in AI safety?'
);

for await (const token of result) {
  console.log(token);
}
```

### 9.3 OpenAPI Specification (Swagger)

```yaml
openapi: 3.1.0
info:
  title: Aspendos API
  version: 1.0.0
  description: AI Operating System API

servers:
  - url: https://api.aspendos.com
    description: Production

components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

paths:
  /chats:
    post:
      summary: Create a new chat
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                title:
                  type: string
                  example: "Project Alpha"
      responses:
        '201':
          description: Chat created
          content:
            application/json:
              schema:
                type: object
                properties:
                  id:
                    type: string
                  title:
                    type: string
                  createdAt:
                    type: string
                    format: date-time

  /chats/{chatId}/messages:
    post:
      summary: Send message (streaming)
      parameters:
        - in: path
          name: chatId
          required: true
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                content:
                  type: string
                model:
                  type: string
                  enum: [gpt-5, claude-4.5, gemini-ultra-2]
      responses:
        '200':
          description: Stream of tokens
          content:
            text/event-stream:
              schema:
                type: object

  /memory/search:
    post:
      summary: Search user memory
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                query:
                  type: string
                limit:
                  type: integer
                  default: 5
      responses:
        '200':
          description: Memory results
          content:
            application/json:
              schema:
                type: array
                items:
                  type: object
```

---

## 10. DEVELOPMENT ROADMAP (12 Weeks)

### **Week 1â€“2 (Foundation)**

**Sprint Goals:** Set up infrastructure, CI/CD, basic auth

**Tasks:**
- [ ] GCP project setup (Cloud Run, Cloud SQL, Cloud Storage)
- [ ] PostgreSQL database + Cloud SQL instance
- [ ] GitHub Actions CI/CD pipeline
- [ ] Clerk integration (auth)
- [ ] Vercel deployment (frontend)
- [ ] Environment variables + Secret Manager
- [ ] Basic health check endpoints
- [ ] Datadog + Sentry integration

**Deliverables:**
- Infrastructure as code (Terraform or Cloud Deployment Manager)
- CI/CD pipeline (build â†’ test â†’ deploy)
- Deployed landing page (Vercel)
- User auth working (Clerk sign-up/login)

---

### **Week 3â€“4 (Core Chat Features)**

**Sprint Goals:** Multi-model chat, basic memory, streaming responses

**Tasks:**
- [ ] Chat CRUD endpoints (API)
- [ ] Model Router (Go microservice)
  - [ ] OpenAI integration (GPT-5, GPT-4o)
  - [ ] Anthropic integration (Claude)
  - [ ] Google integration (Gemini)
  - [ ] Basic fallback logic
- [ ] Message streaming (SSE)
- [ ] Memory storage (PostgreSQL)
- [ ] Gemini embedding integration
- [ ] Qdrant setup + basic search
- [ ] Frontend: Chat UI (Next.js + BaseUI)
- [ ] Frontend: Model selector
- [ ] Frontend: Message streaming animation (Anime.js)

**Deliverables:**
- Users can chat with 3+ models
- Messages stream token-by-token
- Memory created + searched
- Working chat UI

---

### **Week 5â€“6 (Memory Intelligence)**

**Sprint Goals:** Memory Inspector, policies, RAG pipeline

**Tasks:**
- [ ] Memory Inspector UI (timeline, visualization)
- [ ] Memory search improvements (semantic + full-text)
- [ ] Memory policies (time-based, rule-based)
- [ ] RAG pipeline (inject memory into prompts)
- [ ] Memory clustering (auto-organize by topic)
- [ ] Memory sharing between chats
- [ ] Qdrant vector search optimization

**Deliverables:**
- Memory Inspector page live
- Memory policies working
- Memory context automatically used in responses

---

### **Week 7â€“8 (Multi-Model & Advanced Features)**

**Sprint Goals:** Parallel broadcast, agents, voice

**Tasks:**
- [ ] Parallel multi-model broadcast
- [ ] Response comparison UI (side-by-side)
- [ ] Agent Builder (no-code UI)
- [ ] MCP tool integration
- [ ] Voice input (Web Audio API)
- [ ] OpenAI Realtime API integration
- [ ] WebSocket voice streaming
- [ ] Voice output (TTS)

**Deliverables:**
- Query 5+ models in parallel
- Agent builder functional
- Voice chat working (OpenAI Realtime)

---

### **Week 9â€“10 (Billing & Tier System)**

**Sprint Goals:** Polar integration, credit system, tier enforcement

**Tasks:**
- [ ] Polar integration
  - [ ] Create products (PRO, ULTRA)
  - [ ] Checkout flow
  - [ ] Webhook handling
- [ ] Credit tracking
  - [ ] Deduction per operation (model, memory, media)
  - [ ] Monthly reset
  - [ ] Overage alerts
- [ ] Tier enforcement (rate limiting, feature gating)
- [ ] Billing page (UI)
- [ ] Upgrade flow

**Deliverables:**
- Users can subscribe (Polar)
- Credits track usage
- Rate limits enforce tier
- Billing page shows usage

---

### **Week 11â€“12 (Polish & Launch Prep)**

**Sprint Goals:** Testing, documentation, launch readiness

**Tasks:**
- [ ] Load testing (k6, Apache Bench)
- [ ] Security review
- [ ] Database backups + recovery testing
- [ ] Error handling + edge cases
- [ ] Documentation (API, SDK, architecture)
- [ ] Developer SDK published (npm)
- [ ] Landing page finalization
- [ ] Launch checklist validation
- [ ] Monitoring dashboards (Datadog)
- [ ] On-call runbook

**Deliverables:**
- Production-ready system
- 99.9% uptime SLA achievable
- Developer documentation
- SDK available on npm

---

## 11. COST ANALYSIS & OPTIMIZATION

### 11.1 Monthly Infrastructure Costs (Estimated)

| Service | Cost | Notes |
|---------|------|-------|
| Cloud Run (backend) | $40-100 | Auto-scales, pay-per-request |
| Cloud SQL (PostgreSQL) | $30-50 | db-f1-micro tier initially |
| Cloud Storage | $10-20 | File storage for users |
| Qdrant Cloud | $25-75 | Vector DB (managed) |
| Google Cloud Compute (optional) | $0-50 | For caching, optional |
| **Total Infrastructure** | **$105-295** | Scales with usage |

### 11.2 API Provider Costs (per $1,000 revenue)

| Provider | % of Revenue | Notes |
|----------|---|---|
| OpenAI (GPT) | ~15% | Streaming cheaper than batch |
| Anthropic (Claude) | ~12% | Higher cost than GPT but quality |
| Google (Gemini) | ~8% | Most cost-efficient |
| ElevenLabs (TTS) | ~3% | Voice output |
| FAL.ai (media) | ~20% | Image + video generation |
| Qdrant (vector DB) | ~2% | Managed vector storage |
| **Total API Costs** | **~60%** | Leaves 40% for operations |

### 11.3 Cost Optimization Strategies

1. **Model Routing:** Route to cheapest adequate model (DeepSeek for routine, GPT-5 for complex)
2. **Caching:** Cache embeddings + search results
3. **Batch Processing:** Batch media generation (off-peak)
4. **Regional Services:** Use closest region for latency + cost
5. **Reserved Instances:** Long-term Google Cloud discounts (post-MVP)

---

## 12. SECURITY CHECKLIST

- [ ] End-to-end encryption for sensitive data
- [ ] Rate limiting (tier-aware)
- [ ] JWT validation on every request
- [ ] SQL injection prevention (Prisma ORM)
- [ ] CORS configured correctly
- [ ] API key rotation strategy
- [ ] Secrets in Google Secret Manager
- [ ] HTTPS enforced
- [ ] Database encryption at rest
- [ ] Audit logging (Datadog)
- [ ] Regular security scans (Snyk, Dependabot)
- [ ] Incident response plan

---

## 13. TESTING STRATEGY

### 13.1 Unit Tests

```bash
# Frontend
npm run test:unit    # Vitest + React Testing Library

# Backend (TS)
npm run test:api     # Jest

# Backend (Go)
go test ./...        # Standard Go testing
```

### 13.2 Integration Tests

```bash
# Test API endpoints
npm run test:integration

# Test Database migrations
npm run test:migrations

# Test Payment flow
npm run test:payment
```

### 13.3 End-to-End Tests

```bash
# Playwright E2E tests
npm run test:e2e

# Coverage: Sign-up â†’ Chat â†’ Memory â†’ Payment flow
```

### 13.4 Load Testing

```bash
# k6 load test (1,000 concurrent users)
k6 run load-test.js

# Apache Bench (simple)
ab -n 1000 -c 100 https://api.aspendos.com/health
```

---

## 14. DEPLOYMENT CHECKLIST (T-24 Hours)

- [ ] All tests passing
- [ ] Database migrations tested
- [ ] Environment variables set (production)
- [ ] Backups configured + tested
- [ ] Monitoring dashboards live
- [ ] Error tracking configured (Sentry)
- [ ] Load balancer health checks
- [ ] CDN cache invalidated (if needed)
- [ ] DNS validated
- [ ] SSL certificates valid
- [ ] Team trained on runbooks
- [ ] On-call schedule set

---

## 15. POST-LAUNCH MONITORING (Week 1)

**Metrics to Watch:**
- API latency (p50, p95, p99)
- Error rate (< 0.5%)
- Uptime (target: >99.9%)
- User sign-ups (target: 100+)
- Chat creation rate
- Memory engagement (>60%)
- Credit consumption rate

**Daily Reviews:**
- Datadog dashboards
- Error logs (Sentry)
- Customer feedback (Discord, email)
- Performance trends

---

## SUMMARY

This technical architecture is production-ready for **February 14, 2026 launch**:

- **Frontend:** Next.js + BaseUI (Vercel)
- **Backend:** TypeScript + Go + Python (Google Cloud Run)
- **Database:** PostgreSQL + Qdrant
- **Auth:** Clerk
- **Payment:** Polar
- **Monitoring:** Datadog + Sentry
- **Deployment:** Google Cloud (IaC) + GitHub Actions

**Team Estimate:** 5 engineers, 12 weeks

**Cost:** ~$200-400/month infrastructure + 60% API costs

**Key Success Factors:**
1. Model Router stability (fallback chains critical)
2. Memory RAG performance (latency-sensitive)
3. Voice streaming optimization (must be <500ms)
4. Credit system accuracy (billing critical)
5. Uptime + error tracking (user trust)

---

**Next Steps:**
1. Confirm technical team + roles
2. Set up GCP project + initial infrastructure
3. Begin Sprint 1 (Week of Jan 20)
4. Weekly progress reviews

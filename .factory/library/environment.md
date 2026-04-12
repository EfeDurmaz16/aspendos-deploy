# Environment

Environment variables, external dependencies, and setup notes.

**What belongs here:** Required env vars, external API keys/services, dependency quirks, platform-specific notes.
**What does NOT belong here:** Service ports/commands (use `.factory/services.yaml`).

---

## Required Environment Variables

### Phase A (Foundation)
- `NEXT_PUBLIC_CONVEX_URL` — Convex deployment URL
- `CONVEX_DEPLOY_KEY` — Convex deploy key (for CI/deploy only)
- `WORKOS_CLIENT_ID` — WorkOS AuthKit client ID
- `WORKOS_API_KEY` — WorkOS API key
- `WORKOS_REDIRECT_URI` — OAuth callback URL (e.g., `http://localhost:3000/api/auth/callback`)

### Phase B (Product)
- `STRIPE_SECRET_KEY` — Stripe secret key (test mode)
- `STRIPE_PUBLISHABLE_KEY` — Stripe publishable key
- `STRIPE_WEBHOOK_SECRET` — Stripe webhook signing secret
- `DAYTONA_API_KEY` — Daytona sandbox API key
- `E2B_API_KEY` — E2B fallback sandbox API key
- `STEEL_API_KEY` — Steel.dev browser automation API key
- `NEXT_PUBLIC_POSTHOG_KEY` — PostHog project API key
- `POSTHOG_API_KEY` — PostHog server-side API key

### Existing (Pre-Phase A)
- `AI_GATEWAY_API_KEY` — Vercel AI Gateway (routes to OpenAI, Anthropic, Google, Groq)
- `SUPERMEMORY_API_KEY` — SuperMemory Pro API key
- `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` — Rate limiting
- Messaging tokens: `SLACK_BOT_TOKEN`, `TELEGRAM_BOT_TOKEN`, `DISCORD_BOT_TOKEN`, `WHATSAPP_TOKEN`

## Credential Status

All credentials are DEFERRED until end of sprint. Workers should:
- Use environment variable placeholders (never hardcode)
- Write code that gracefully handles missing env vars
- Write tests with mocks/stubs for external services
- Structure code so real credentials can be dropped in via .env

## Local Dependencies

- `@fides/sdk` — linked from `~/fides/packages/sdk` (local file: protocol)
- `@agit/sdk` — linked from `~/agit/ts-sdk` (local file: protocol)

## External Dependencies

- **Redis** — Running locally on port 6379 (system service, do NOT restart)
- **Convex** — Hosted service (no local server needed)
- **SuperMemory** — Hosted API, already integrated
- **Vercel AI Gateway** — Routes LLM calls to multiple providers

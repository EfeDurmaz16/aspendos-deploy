---
name: launch-worker
description: Handles Stripe billing, BYOK vault, GAIA eval, analytics, landing page, and deploy prep
---

# Launch Worker

NOTE: Startup and cleanup are handled by `worker-base`. This skill defines the WORK PROCEDURE.

## When to Use This Skill

Features involving: Stripe billing integration, BYOK credential vault, GAIA evaluation harness, PostHog analytics, landing page updates, .env.example refresh, load test updates, launch copy, FIDES verifier endpoint.

## Required Skills

None.

## Work Procedure

1. **Read context:** Read `mission.md`, `.factory/library/architecture.md`, `.factory/library/environment.md`. For Stripe features, check existing billing routes at `services/api/src/routes/billing.ts` and billing service at `services/api/src/services/billing.service.ts`.

2. **Write tests first (TDD):** Mock external APIs (Stripe, PostHog). Test business logic thoroughly.

3. **Stripe billing:** Replace the 503 stubs in billing routes with real Stripe service calls:
   - Create `services/api/src/services/stripe.service.ts` using the `stripe` npm package
   - Wire checkout, portal, cancel, and webhook endpoints
   - Webhook must verify signature via `stripe.webhooks.constructEvent()`
   - Sync subscription state to Convex `subscriptions` table
   - Define 5 products with placeholder prices in a constants file
   - `getUserTier()` function reads from Convex

4. **BYOK vault:** Create `services/api/src/services/byok.service.ts`:
   - Use `crypto.subtle` for AES-GCM encryption/decryption
   - Store encrypted keys in Convex `byok_credentials` table
   - NEVER log raw key values
   - Export: `storeCredential`, `getCredential`, `deleteCredential`

5. **Landing page:** Update the existing landing page at `apps/web/src/app/(marketing)/landing/page.tsx`:
   - Replace headline with v5 positioning ("Deterministic AI agents that prove what they did. And why.")
   - Update pricing section to match placeholder prices
   - Preserve existing SEO metadata

6. **Analytics:** Install `posthog-js` in web, `posthog-node` in API:
   - Wire PostHogProvider in app layout with `NEXT_PUBLIC_POSTHOG_KEY`
   - Add `posthog.capture()` calls for 8 key events

7. **Verify:**
   - All tests pass
   - `bun run build` passes
   - `biome check .` passes
   - Landing page renders correctly (check for broken imports)

## Example Handoff

```json
{
  "salientSummary": "Built Stripe service with checkout/portal/webhook handling, BYOK vault with AES-GCM encryption, updated landing page with v5 copy, installed PostHog with 8 event tracks. 30 tests passing, build clean.",
  "whatWasImplemented": "services/api/src/services/stripe.service.ts (full Stripe integration), services/api/src/services/byok.service.ts (AES-GCM vault), apps/web/src/app/(marketing)/landing/page.tsx (v5 copy update), PostHog provider in layout, 8 capture() calls across codebase.",
  "whatWasLeftUndone": "",
  "verification": {
    "commandsRun": [
      { "command": "cd services/api && bunx vitest run", "exitCode": 0, "observation": "30 new tests + existing all passing" },
      { "command": "bun run build", "exitCode": 0, "observation": "Clean build" },
      { "command": "biome check .", "exitCode": 0, "observation": "No errors" }
    ],
    "interactiveChecks": []
  },
  "tests": {
    "added": [
      { "file": "services/api/src/services/__tests__/stripe.test.ts", "cases": [
        { "name": "createCheckoutSession returns URL", "verifies": "Checkout flow" },
        { "name": "webhook verifies signature", "verifies": "Signature verification" }
      ]}
    ]
  },
  "discoveredIssues": []
}
```

## When to Return to Orchestrator

- Pricing decision needed (which prices to use for placeholder products)
- Stripe webhook events require schema decisions (what to store in Convex)
- Landing page has complex layout that breaks with copy changes
- PostHog event naming convention needs alignment with existing analytics

# YULA v0 — Stack Migration Plan (Phase A, 5 days)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **🚨 REORDER NOTE (discovered 2026-04-08 during Day A1 execution)**: The original day ordering (Day 1 = Next 16 + UI, Day 2 = Convex, Day 3 = WorkOS, Day 4 = LangGraph removal, Day 5 = OpenMemory removal) was **wrong**. Attempting Next 16 upgrade first blew up on `@sentry/nextjs@10.38.0` incompatibility (`TypeError: api.createContextKey is not a function` from @opentelemetry/api version mismatch). Polar + Better Auth + Qdrant + OpenMemory + Prisma packages may have similar Next 16 compatibility issues, and we're **deleting all of them anyway**.
>
> **New ordering (revised Day sequence)**:
> - **Day 1 — Package Purge**: Delete Better Auth, @polar-sh/* (all), OpenMemory + Qdrant, Prisma + `packages/db`, LangGraph Python service + `services/agents/`. Remove all imports of these packages from code (compile errors expected — that's the point). Result: smaller codebase, fewer Next 16 incompatibility surfaces. This corresponds to the OLD Days A3.2 (delete Better Auth) + A4.1 (delete services/agents) + A5.1 (delete OpenMemory) compressed into one intensive day.
> - **Day 2 — Next.js 16 upgrade + UI polish**: Now runs cleanly because the problematic packages are gone. Original Day A1 content.
> - **Day 3 — Convex setup + schema**: Original Day A2.
> - **Day 4 — WorkOS Auth integration**: Original Day A3 but without the "delete Better Auth" part (already done Day 1). Just install + wire WorkOS.
> - **Day 5 — AI SDK v6 Agent orchestrator + Convex Workflow wiring**: Original Day A4 but without "delete services/agents" (already done Day 1). Just wire the new orchestrator. Also includes the E2E smoke test from old Day A5.
>
> **Why this works**: By Day 2, the codebase has NO Sentry-incompatible packages, NO Better Auth, NO Polar, NO Prisma, NO Qdrant, NO OpenMemory, NO LangGraph. The Next.js 16 upgrade then succeeds because the only remaining dependencies are ones Next 16 supports cleanly (React 19, shadcn/ui, Radix, Tailwind 4, SuperMemory HTTP client, Vercel AI SDK, Vercel Chat SDK, Phosphor, Stripe).
>
> **Execution evidence for the reorder**: On 2026-04-08 17:30, running `bun add next@latest react@latest react-dom@latest` succeeded but `bun run --cwd apps/web build` failed with the OpenTelemetry + Sentry error. Rolled back to clean state (`apps/web/package.json` and `bun.lock` reverted). Branch `stack-migration/phase-a` still active, zero commits lost.
>
> **Sprint impact**: Still 5 days Phase A. Just reordered. No time lost.
>
> **TODO for next session**: Rewrite the day-by-day task blocks below to match the new ordering. The task content itself is mostly valid; it just needs to be moved to different days. Task A1.1 (Next 16 codemod) is the single most impacted task — it moves from Day 1 to Day 2 and can only run AFTER Day 1 package purge.

**Goal:** Pivot YULA's tech stack from Postgres+Better Auth+LangGraph+OpenMemory to Convex+WorkOS+AI SDK v6+SuperMemory-only, plus upgrade Next.js 15 → 16.2 and add Phosphor icons + Manrope font. **5 working days. Phase A blocks Phase B (the v1 build sprint).**

**Architecture target:** All-TypeScript stack. Convex as the single primary database. WorkOS AuthKit for auth. Vercel AI SDK v6 `Agent` for tool loops with `prepareStep`/`onStepFinish` hooks for FIDES sign + Convex commit middleware. Convex Workflow + Durable Agents components for durability and HITL pauses. SuperMemory hosted Pro $19 for memory layer (with `MEMORY_BACKEND=supermemory` as the only backend; OpenMemory legacy dropped). Multi-provider LLM routing through Vercel AI Gateway: Groq Llama 4 router + Haiku 4.5 routine + Sonnet 4.6 tool use + Opus/GPT-5/Gemini for council mode + Anthropic Computer Use for desktop driver. Next.js 16.2 with Turbopack default, Cache Components opt-in, Phosphor icons, Manrope font.

**Tech Stack:** Next.js 16.2, React 19, Tailwind CSS 4, shadcn/ui, Radix UI, Phosphor icons, Manrope font, Convex (TS-first DB + Workflow + Durable Agents components), WorkOS AuthKit, Vercel AI SDK v6, Vercel AI Gateway, Vercel Chat SDK, FIDES (`@fides/sdk`), SuperMemory (`@supermemory/tools/ai-sdk`), E2B, Steel.dev, Anthropic Computer Use API, Stripe.

**Spec reference:** `docs/superpowers/specs/2026-04-07-yula-manus-alternative-design.md`
**ADR reference:** `docs/adr/0001-tech-stack-pivot-2026-04-07.md`

---

## Day A1 — Next.js 16 upgrade + UI polish

### Task A1.1: Run Next.js 16 codemod

**Files:**
- Modify: `apps/web/package.json`, `apps/web/next.config.ts`, all files affected by codemods

- [ ] **Step 1: Backup current state**

```bash
git checkout -b stack-migration/phase-a
git status  # confirm clean
```

- [ ] **Step 2: Run the upgrade codemod**

```bash
cd apps/web
npx @next/codemod@canary upgrade latest
```

Expected: codemod prompts for the version, select latest stable (16.2.x). Auto-applies: `next-async-request-api`, `middleware-to-proxy`, `next-lint-to-eslint-cli`.

- [ ] **Step 3: Update package.json manually if any peers fail**

```bash
bun install
bun run build
```

If build fails on `images.domains` deprecation, edit `next.config.ts`:

```ts
// next.config.ts
import type { NextConfig } from 'next';

const config: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      // migrate any existing images.domains entries here
    ],
  },
};

export default config;
```

- [ ] **Step 4: Verify dev server works**

```bash
bun run dev
```

Expected: server starts on http://localhost:3000, no errors in console. Visit homepage, navigate to /chat.

- [ ] **Step 5: Commit**

```bash
git add apps/web/
git commit -m "chore(web): upgrade Next.js 15 → 16.2 via codemod"
```

### Task A1.2: Migrate middleware.ts → proxy.ts

**Files:**
- Modify: `apps/web/middleware.ts` → rename to `apps/web/proxy.ts`

- [ ] **Step 1: If codemod did not catch this, rename manually**

```bash
git mv apps/web/middleware.ts apps/web/proxy.ts
```

- [ ] **Step 2: Update the exported function name**

In `apps/web/proxy.ts`, change:

```ts
// Before
export function middleware(req: NextRequest) { ... }

// After
export function proxy(req: NextRequest) { ... }
```

Also update any `next.config.ts` references: `experimental.middlewareClientMaxBodySize` → `experimental.proxyClientMaxBodySize`.

- [ ] **Step 3: Verify build**

```bash
bun run build
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/proxy.ts apps/web/next.config.ts
git commit -m "chore(web): migrate middleware.ts → proxy.ts for Next 16"
```

### Task A1.3: Design the YULA design system on shadcn/create

**Files:**
- None (out-of-repo: https://ui.shadcn.com/create — web tool live preview)

**Context**: The shadcn CLI v4 (March 2026) introduced `shadcn apply` and the `shadcn/create` web tool — a single alphanumeric preset code now packs **fonts + icons + colors + CSS variables + border radius + component base** and can be applied to an existing project with one command. We use this to collapse the three tasks "add Manrope font / install Phosphor icons / verify shadcn+Tailwind 4" into one preset generation + one apply command. This is an internal workflow tool, not a product feature we ship.

- [ ] **Step 1: Open shadcn/create in the browser**

Visit: https://ui.shadcn.com/create
You will land on a live-preview design system editor.

- [ ] **Step 2: Configure the YULA preset**

Set these values (match the existing monochrome theme from recent commits):

| Field | Value |
|---|---|
| Style base | New York (or whatever existing `components.json` uses) |
| Base color | Neutral / slate (pick whatever matches the current web dark monochrome vibe) |
| Primary | #0a0a0a (near-black) |
| Accent | #e5e5e5 (near-white) |
| Border radius | 0.5rem (medium — per existing shadcn components) |
| Font — sans | **Manrope** |
| Font — mono | Geist Mono (current) or JetBrains Mono |
| Icon library | **Phosphor** (the CLI lists this as a built-in option) |
| Dark mode | enabled (CSS variables) |

Use the live preview to check: buttons, inputs, cards, dialogs all render cleanly with Manrope + Phosphor + the chosen monochrome palette.

- [ ] **Step 3: Grab the preset code**

shadcn/create emits a short alphanumeric code (e.g. `YuLADS1` or similar). Copy it. Record it in `apps/web/.yula-preset-code` (gitignored or committed as operational metadata):

```bash
echo "YuLADS1" > apps/web/.yula-preset-code
```

- [ ] **Step 4: Commit the preset code reference**

```bash
git add apps/web/.yula-preset-code
git commit -m "chore(web): record YULA design preset code (shadcn/create)"
```

### Task A1.4: Apply the YULA preset to apps/web

**Files:**
- Auto-modified by `shadcn apply`: `apps/web/components.json`, `apps/web/app/globals.css` (or wherever Tailwind 4 theme lives), `apps/web/app/layout.tsx` (font import), `apps/web/components/ui/*` (if components need re-install), `apps/web/package.json` (dep changes for Phosphor)

- [ ] **Step 1: Run shadcn apply**

```bash
cd apps/web
npx shadcn@latest apply --preset $(cat .yula-preset-code) --yes
```

Expected: CLI downloads the preset config, updates CSS variables, installs Manrope font + Phosphor icon package, updates `components.json`, and updates relevant component imports.

If the CLI prompts "merge, reinstall, or skip" for existing components, choose **merge** (keep user-customized components, only update tokens/theme/CSS vars).

- [ ] **Step 2: Verify dev build still works**

```bash
bun install  # pick up any new deps Phosphor added
bun run build
bun run dev
```

Expected: clean build, dev server runs, `/` and `/chat` render in Manrope with the monochrome palette.

- [ ] **Step 3: Commit the auto-applied changes**

```bash
git add apps/web/
git commit -m "chore(web): apply YULA design preset (Manrope + Phosphor + monochrome theme)"
```

### Task A1.5: Replace remaining Hugeicons imports with Phosphor

**Files:**
- Modify: anywhere in `apps/web/src/` that imports from `hugeicons-react`, `@hugeicons/react`, or `@hugeicons/core-free-icons`

**Note**: `shadcn apply` installs Phosphor as a dep but does NOT rewrite your existing `import X from 'hugeicons-react'` lines — those are application code, not design-system config. You do the sweep manually.

- [ ] **Step 1: Find existing Hugeicons imports**

```bash
grep -r "from 'hugeicons-react'" apps/web/src/ 2>/dev/null
grep -r "from '@hugeicons" apps/web/src/ 2>/dev/null
```

- [ ] **Step 2: Rewrite each import to Phosphor equivalents**

Phosphor naming: PascalCase, no `Icon` suffix. Six weights available via `weight="thin|light|regular|bold|fill|duotone"`.

Common mapping:

| Hugeicons | Phosphor |
|---|---|
| `ArrowLeftIcon` | `ArrowLeft` |
| `CheckIcon` | `Check` |
| `CrossIcon` | `X` |
| `Loading03Icon` | `CircleNotch` (with `className="animate-spin"`) |
| `Settings01Icon` | `Gear` |
| `UserIcon` | `User` |
| `ChatIcon` | `ChatCircle` |
| `PlusIcon` | `Plus` |
| `TrashIcon` | `Trash` |
| `EyeIcon` | `Eye` |
| `EyeOffIcon` | `EyeSlash` |

For unknown icons, browse https://phosphoricons.com/ and pick the closest match.

```tsx
// Before
import { ArrowLeftIcon, CheckIcon } from 'hugeicons-react';

// After
import { ArrowLeft, Check } from '@phosphor-icons/react';
```

- [ ] **Step 3: Remove old Hugeicons package**

```bash
bun remove hugeicons-react @hugeicons/react @hugeicons/core-free-icons 2>/dev/null || true
```

- [ ] **Step 4: Build verify + visual smoke test**

```bash
bun run build
bun run dev
```

Expected: clean build, navigate all main pages (`/`, `/chat`, `/timeline`, `/billing`, `/settings`, `/agent-log`), verify no missing icons, no broken layouts.

- [ ] **Step 5: Commit**

```bash
git add -A apps/web/
git commit -m "chore(web): replace Hugeicons imports with Phosphor across all pages"
```

### Task A1.6: Final Day A1 sanity check

- [ ] **Step 1: Verify everything Day A1 was supposed to ship is in place**

```bash
# Next 16 installed
cat apps/web/package.json | grep '"next":'  # expect 16.x

# proxy.ts exists (no middleware.ts)
ls apps/web/proxy.ts 2>/dev/null && echo "proxy.ts OK"
! ls apps/web/middleware.ts 2>/dev/null && echo "middleware.ts removed OK"

# Manrope font is imported in layout.tsx
grep -l "Manrope" apps/web/app/layout.tsx

# Phosphor is a dep
cat apps/web/package.json | grep '@phosphor-icons/react'

# Hugeicons is gone
! cat apps/web/package.json | grep hugeicons && echo "Hugeicons removed OK"

# shadcn preset code recorded
cat apps/web/.yula-preset-code
```

- [ ] **Step 2: Tag Day A1 as complete**

```bash
git tag phase-a-day-1-complete
```

---

## Day A2 — Convex setup + schema

### Task A2.1: Bootstrap Convex in the monorepo

**Files:**
- Create: `convex/` directory at repo root
- Create: `convex/schema.ts`
- Modify: root `package.json`

- [ ] **Step 1: Install Convex**

```bash
cd /Users/efebarandurmaz/Desktop/aspendos-deploy
bun add convex
bunx convex dev --once  # initial setup, prompts for project linking
```

Expected: prompts to log in, create new project, generates `.env.local` with `CONVEX_DEPLOYMENT` and `NEXT_PUBLIC_CONVEX_URL`.

- [ ] **Step 2: Define core schema**

Create `convex/schema.ts`:

```ts
import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  // User accounts (mirrored from WorkOS via webhook)
  users: defineTable({
    workos_id: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    avatar_url: v.optional(v.string()),
    tier: v.union(v.literal('personal'), v.literal('pro'), v.literal('team')),
    stripe_customer_id: v.optional(v.string()),
    fides_did: v.optional(v.string()),
    created_at: v.number(),
  }).index('by_workos_id', ['workos_id']).index('by_email', ['email']),

  // Agent action commit log (AGIT-on-Convex)
  commits: defineTable({
    user_id: v.id('users'),
    parent_hash: v.optional(v.string()),
    hash: v.string(),
    ancestor_chain: v.array(v.string()),  // denormalized for fast linear walks
    tool_name: v.string(),
    args: v.any(),
    status: v.union(v.literal('pending'), v.literal('ok'), v.literal('failed'), v.literal('refused')),
    result: v.optional(v.any()),
    reversibility_class: v.union(
      v.literal('undoable'),
      v.literal('cancelable_window'),
      v.literal('compensatable'),
      v.literal('approval_only'),
      v.literal('irreversible_blocked'),
    ),
    rollback_strategy: v.any(),
    rollback_deadline: v.optional(v.number()),
    human_explanation: v.string(),
    fides_signature: v.optional(v.string()),
    fides_signer_did: v.optional(v.string()),
    counter_signature: v.optional(v.string()),
    counter_signer_did: v.optional(v.string()),
    timestamp: v.number(),
  })
    .index('by_user_timestamp', ['user_id', 'timestamp'])
    .index('by_hash', ['hash'])
    .index('by_user_status', ['user_id', 'status']),

  // Pending approval cards
  approvals: defineTable({
    user_id: v.id('users'),
    commit_hash: v.string(),
    surface: v.union(v.literal('slack'), v.literal('telegram'), v.literal('discord'), v.literal('whatsapp'), v.literal('teams'), v.literal('gchat'), v.literal('imessage'), v.literal('signal'), v.literal('web')),
    surface_message_id: v.string(),
    expires_at: v.number(),
    status: v.union(v.literal('pending'), v.literal('approved'), v.literal('rejected'), v.literal('expired')),
  }).index('by_user_status', ['user_id', 'status']).index('by_expires', ['expires_at']),

  // File snapshots for undoable file.write tool
  snapshots: defineTable({
    user_id: v.id('users'),
    snapshot_id: v.string(),
    target_path: v.string(),
    prior_content: v.union(v.string(), v.null()),
    created_at: v.number(),
  }).index('by_snapshot_id', ['snapshot_id']),

  // Stripe subscription state
  subscriptions: defineTable({
    user_id: v.id('users'),
    stripe_subscription_id: v.string(),
    tier: v.union(v.literal('personal'), v.literal('pro'), v.literal('team')),
    status: v.string(),
    current_period_end: v.number(),
    seats: v.optional(v.number()),
    byok: v.boolean(),
  }).index('by_user', ['user_id']).index('by_stripe_id', ['stripe_subscription_id']),
});
```

- [ ] **Step 3: Push schema to Convex deployment**

```bash
bunx convex dev
```

Expected: schema validates and pushes; generates `convex/_generated/api.d.ts`.

- [ ] **Step 4: Commit**

```bash
git add convex/ package.json bun.lock .env.local.example
git commit -m "feat(convex): bootstrap Convex with users/commits/approvals/snapshots/subscriptions schema"
```

### Task A2.2: Install Convex Workflow + Durable Agents components

**Files:**
- Modify: `convex/convex.config.ts`

- [ ] **Step 1: Install components**

```bash
bun add @convex-dev/workflow @convex-dev/durable-agents
```

- [ ] **Step 2: Register components**

Create or modify `convex/convex.config.ts`:

```ts
import { defineApp } from 'convex/server';
import workflow from '@convex-dev/workflow/convex.config';
import durableAgents from '@convex-dev/durable-agents/convex.config';

const app = defineApp();
app.use(workflow);
app.use(durableAgents);

export default app;
```

- [ ] **Step 3: Push**

```bash
bunx convex dev
```

- [ ] **Step 4: Commit**

```bash
git add convex/convex.config.ts package.json bun.lock
git commit -m "feat(convex): install Workflow + Durable Agents components"
```

### Task A2.3: Migrate AGIT-on-Postgres to AGIT-on-Convex

**Files:**
- Create: `convex/commits.ts`
- Delete: `services/api/src/audit/agit.ts` (Postgres version)
- Create: new `services/api/src/audit/agit-convex.ts` (thin client wrapper)

- [ ] **Step 1: Create Convex mutation for committing actions**

Create `convex/commits.ts`:

```ts
import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { createHash } from 'crypto';

export const commitAction = mutation({
  args: {
    user_id: v.id('users'),
    tool_name: v.string(),
    args: v.any(),
    status: v.union(v.literal('pending'), v.literal('ok'), v.literal('failed'), v.literal('refused')),
    result: v.optional(v.any()),
    reversibility_class: v.union(v.literal('undoable'), v.literal('cancelable_window'), v.literal('compensatable'), v.literal('approval_only'), v.literal('irreversible_blocked')),
    rollback_strategy: v.any(),
    rollback_deadline: v.optional(v.number()),
    human_explanation: v.string(),
    fides_signature: v.optional(v.string()),
    fides_signer_did: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Find latest commit for this user to get parent + chain
    const latest = await ctx.db
      .query('commits')
      .withIndex('by_user_timestamp', (q) => q.eq('user_id', args.user_id))
      .order('desc')
      .first();

    const parent_hash = latest?.hash;
    const ancestor_chain = latest ? [...latest.ancestor_chain, latest.hash].slice(-50) : [];

    const canonical = JSON.stringify({ parent: parent_hash, ...args, ts: Date.now() });
    const hash = createHash('sha256').update(canonical).digest('hex');

    const id = await ctx.db.insert('commits', {
      ...args,
      parent_hash,
      hash,
      ancestor_chain,
      timestamp: Date.now(),
    });
    return { id, hash };
  },
});

export const historyForUser = query({
  args: { user_id: v.id('users'), limit: v.number() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('commits')
      .withIndex('by_user_timestamp', (q) => q.eq('user_id', args.user_id))
      .order('desc')
      .take(args.limit);
  },
});

export const getByHash = query({
  args: { hash: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('commits')
      .withIndex('by_hash', (q) => q.eq('hash', args.hash))
      .first();
  },
});

export const counterSign = mutation({
  args: { commit_id: v.id('commits'), signature: v.string(), signer_did: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.commit_id, {
      counter_signature: args.signature,
      counter_signer_did: args.signer_did,
      status: 'ok',
    });
  },
});
```

- [ ] **Step 2: Create thin TypeScript client wrapper for the API service**

Create `services/api/src/audit/agit-convex.ts`:

```typescript
import { ConvexClient } from 'convex/browser';
import { api } from '../../../convex/_generated/api';
import type { ReversibilityMetadata } from '../reversibility/types';

const client = new ConvexClient(process.env.CONVEX_URL!);

export interface ActionCommit {
  toolName: string;
  args: unknown;
  status: 'pending' | 'ok' | 'failed' | 'refused';
  result?: unknown;
  reversibility: ReversibilityMetadata;
  signature?: string;
  signerDid?: string;
}

export async function commitAction(userId: string, action: ActionCommit): Promise<{ hash: string }> {
  const result = await client.mutation(api.commits.commitAction, {
    user_id: userId as any,
    tool_name: action.toolName,
    args: action.args,
    status: action.status,
    result: action.result,
    reversibility_class: action.reversibility.reversibility_class,
    rollback_strategy: action.reversibility.rollback_strategy,
    rollback_deadline: action.reversibility.rollback_deadline ? Date.parse(action.reversibility.rollback_deadline) : undefined,
    human_explanation: action.reversibility.human_explanation,
    fides_signature: action.signature,
    fides_signer_did: action.signerDid,
  });
  return { hash: result.hash };
}

export async function historyForUser(userId: string, limit = 50) {
  return await client.query(api.commits.historyForUser, { user_id: userId as any, limit });
}

export async function getCommitByHash(hash: string) {
  return await client.query(api.commits.getByHash, { hash });
}
```

- [ ] **Step 3: Delete the old Postgres-based AGIT module**

```bash
rm services/api/src/audit/agit.ts
```

- [ ] **Step 4: Update imports in step middleware and undo handler**

Find all `import { ... } from './audit/agit'` and change to `'./audit/agit-convex'`. Same export names match, so call sites should not change.

- [ ] **Step 5: Commit**

```bash
git add convex/commits.ts services/api/src/audit/agit-convex.ts services/api/src/audit/agit.ts services/api/src/orchestrator/ services/api/src/bot/
git commit -m "feat(audit): migrate AGIT from Postgres adapter to Convex commits table"
```

### Task A2.4: Drop Prisma + Postgres entirely

**Files:**
- Delete: `packages/db/`
- Modify: every import of `@aspendos/db`, `prisma`, etc.

- [ ] **Step 1: Find all Prisma references**

```bash
grep -r "from '@aspendos/db'" services/ apps/ 2>/dev/null
grep -r "PrismaClient" services/ apps/ 2>/dev/null
```

- [ ] **Step 2: Replace each import with Convex equivalents**

For user lookups: replace `prisma.user.findUnique({ where: { id } })` with `client.query(api.users.getById, { id })` (write the corresponding Convex query in `convex/users.ts`).

This is mechanical work — each Prisma model becomes a Convex table + queries.

- [ ] **Step 3: Delete the packages/db directory**

```bash
rm -rf packages/db
```

- [ ] **Step 4: Remove from workspaces**

Edit `package.json` workspace list and `pnpm-workspace.yaml` to remove `packages/db`.

- [ ] **Step 5: Verify build**

```bash
bun install
bun run build
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: drop Prisma + Postgres, migrate all queries to Convex"
```

---

## Day A3 — WorkOS Auth migration

### Task A3.1: Install WorkOS AuthKit

**Files:**
- Modify: `apps/web/package.json`
- Create: `apps/web/proxy.ts` (replace if codemod already created)

- [ ] **Step 1: Install package**

```bash
cd apps/web
bun add @workos-inc/authkit-nextjs
```

- [ ] **Step 2: Set environment variables**

Add to `.env.local` (and document in `.env.example`):

```
WORKOS_API_KEY=sk_test_...
WORKOS_CLIENT_ID=client_...
WORKOS_COOKIE_PASSWORD=<32+ random chars>
NEXT_PUBLIC_WORKOS_REDIRECT_URI=http://localhost:3000/callback
```

Get these from https://workos.com/dashboard.

- [ ] **Step 3: Wire authkit middleware in proxy.ts**

```ts
// apps/web/proxy.ts
import { authkitMiddleware } from '@workos-inc/authkit-nextjs';

export default authkitMiddleware({
  middlewareAuth: {
    enabled: true,
    unauthenticatedPaths: ['/', '/pricing', '/about', '/login', '/signup', '/callback'],
  },
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

- [ ] **Step 4: Add AuthKit provider to layout**

In `apps/web/app/layout.tsx`:

```tsx
import { AuthKitProvider } from '@workos-inc/authkit-nextjs/components';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthKitProvider>{children}</AuthKitProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 5: Add callback route**

Create `apps/web/app/callback/route.ts`:

```ts
import { handleAuth } from '@workos-inc/authkit-nextjs';

export const GET = handleAuth();
```

- [ ] **Step 6: Verify**

Run dev server. Visit `/login` (placeholder), trigger sign-in, complete WorkOS hosted flow, get redirected back to `/callback` and on to the app.

- [ ] **Step 7: Commit**

```bash
git add apps/web/proxy.ts apps/web/app/layout.tsx apps/web/app/callback/ apps/web/.env.example apps/web/package.json apps/web/bun.lock
git commit -m "feat(auth): wire WorkOS AuthKit (middleware, provider, callback)"
```

### Task A3.2: Delete Better Auth code

**Files:**
- Delete: `services/api/src/auth/` (entire directory)
- Delete: `apps/web/lib/auth.ts` (Better Auth client)

- [ ] **Step 1: Find all Better Auth references**

```bash
grep -rn "better-auth" services/ apps/ 2>/dev/null
grep -rn "from '@/lib/auth'" apps/web/ 2>/dev/null
```

- [ ] **Step 2: Replace each with WorkOS getUser**

For server components/route handlers, replace `auth.api.getSession({ headers })` with:

```ts
import { withAuth } from '@workos-inc/authkit-nextjs';

const { user } = await withAuth();
if (!user) redirect('/login');
```

For client components, replace with `useAuth()` from `@workos-inc/authkit-nextjs/components`.

- [ ] **Step 3: Delete Better Auth files**

```bash
rm -rf services/api/src/auth
rm apps/web/lib/auth.ts
bun remove better-auth
```

- [ ] **Step 4: Build verify**

```bash
bun run build
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(auth): drop Better Auth, replace all session calls with WorkOS withAuth"
```

### Task A3.3: WorkOS user → Convex user mirror

**Files:**
- Create: `convex/users.ts`
- Create: `apps/web/app/api/auth/webhook/route.ts`

- [ ] **Step 1: Convex mutation to upsert user**

Create `convex/users.ts`:

```ts
import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

export const upsertFromWorkOS = mutation({
  args: {
    workos_id: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    avatar_url: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('users')
      .withIndex('by_workos_id', (q) => q.eq('workos_id', args.workos_id))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        email: args.email,
        name: args.name,
        avatar_url: args.avatar_url,
      });
      return existing._id;
    }

    return await ctx.db.insert('users', {
      ...args,
      tier: 'personal',
      created_at: Date.now(),
    });
  },
});

export const getByWorkOSId = query({
  args: { workos_id: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('users')
      .withIndex('by_workos_id', (q) => q.eq('workos_id', args.workos_id))
      .first();
  },
});
```

- [ ] **Step 2: WorkOS webhook handler**

Create `apps/web/app/api/auth/webhook/route.ts`:

```ts
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../../convex/_generated/api';
import { NextResponse } from 'next/server';

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(req: Request) {
  const body = await req.json();
  // Verify WorkOS webhook signature here in production
  if (body.event === 'user.created' || body.event === 'user.updated') {
    await client.mutation(api.users.upsertFromWorkOS, {
      workos_id: body.data.id,
      email: body.data.email,
      name: `${body.data.first_name ?? ''} ${body.data.last_name ?? ''}`.trim(),
      avatar_url: body.data.profile_picture_url,
    });
  }
  return NextResponse.json({ ok: true });
}
```

Configure the webhook URL in WorkOS dashboard: `https://yula.dev/api/auth/webhook`.

- [ ] **Step 3: Commit**

```bash
git add convex/users.ts apps/web/app/api/auth/webhook/
git commit -m "feat(auth): mirror WorkOS users into Convex via webhook"
```

---

## Day A4 — Drop LangGraph + wire AI SDK v6 Agent + Convex Workflow

### Task A4.1: Delete services/agents (Python LangGraph)

- [ ] **Step 1: Verify nothing else depends on services/agents**

```bash
grep -r "services/agents" services/ apps/ 2>/dev/null
```

- [ ] **Step 2: Delete the directory**

```bash
rm -rf services/agents
```

- [ ] **Step 3: Remove from workspaces and Turbo config**

Edit `package.json`, `pnpm-workspace.yaml`, `turbo.json` to remove references.

- [ ] **Step 4: Build verify**

```bash
bun install
bun run build
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: drop services/agents (Python LangGraph) — replaced by AI SDK v6 Agent in TS"
```

### Task A4.2: Install Vercel AI SDK v6 + wire Agent

**Files:**
- Modify: `services/api/package.json`
- Create: `services/api/src/orchestrator/agent.ts`

- [ ] **Step 1: Install AI SDK v6**

```bash
cd services/api
bun add ai@latest @ai-sdk/anthropic @ai-sdk/openai @ai-sdk/google @ai-sdk/groq
```

- [ ] **Step 2: Create the YULA Agent factory**

Create `services/api/src/orchestrator/agent.ts`:

```typescript
import { Agent, streamText, type ModelMessage } from 'ai';
import { gateway } from 'ai';
import { listTools } from '../tools/registry';
import { runToolStep } from './step';
import type { StepContext } from './step';

export interface YulaAgentInput {
  userId: string;
  prompt: string;
  history?: ModelMessage[];
  model?: string;  // e.g. 'anthropic/claude-haiku-4.5'
}

export async function createYulaAgentRun(input: YulaAgentInput) {
  const tools = Object.fromEntries(
    listTools().map((t) => [t.name, {
      description: t.description,
      inputSchema: t.inputSchema,
      execute: async (args: unknown) => {
        const ctx: StepContext = { userId: input.userId, correlationId: crypto.randomUUID() };
        return await runToolStep(t.name, args, ctx);
      },
    }])
  );

  const result = await streamText({
    model: gateway(input.model ?? 'anthropic/claude-haiku-4.5'),
    messages: [
      ...(input.history ?? []),
      { role: 'user', content: input.prompt },
    ],
    tools,
    stopWhen: ({ stepNumber }) => stepNumber >= 20,
    prepareStep: async ({ stepNumber, messages }) => {
      // Hook point for FIDES sign + Convex commit happens inside runToolStep
      return { messages };
    },
    onStepFinish: async ({ stepNumber, toolCalls }) => {
      // Already committed to AGIT/Convex inside runToolStep
    },
  });

  return result;
}
```

- [ ] **Step 3: Wire to /api/chat route**

In `services/api/src/routes/chat.ts`, replace the LangGraph call with:

```typescript
import { createYulaAgentRun } from '../orchestrator/agent';

// Inside the chat route handler:
const result = await createYulaAgentRun({
  userId: user.id,
  prompt: message,
  history: previousMessages,
});

return result.toUIMessageStreamResponse();
```

- [ ] **Step 4: Commit**

```bash
git add services/api/src/orchestrator/agent.ts services/api/src/routes/chat.ts services/api/package.json bun.lock
git commit -m "feat(orchestrator): wire Vercel AI SDK v6 Agent with multi-provider gateway routing"
```

### Task A4.3: Wire Convex Workflow for durable execution

**Files:**
- Create: `convex/workflows/agentTask.ts`

- [ ] **Step 1: Define a workflow that wraps an Agent run**

Create `convex/workflows/agentTask.ts`:

```ts
import { workflow } from '@convex-dev/workflow';
import { internal } from '../_generated/api';
import { v } from 'convex/values';

export const agentTaskWorkflow = workflow({
  args: {
    user_id: v.id('users'),
    prompt: v.string(),
    surface: v.string(),
    surface_thread_id: v.string(),
  },
  handler: async (step, args) => {
    // Step 1: Initial planning + first tool call
    const plan = await step.runMutation(internal.agentSteps.startAgentRun, args);

    // Step 2: Tool loop (up to 20 steps)
    for (let i = 0; i < 20; i++) {
      const stepResult = await step.runAction(internal.agentSteps.runOneStep, {
        run_id: plan.run_id,
        step_number: i,
      });
      if (stepResult.done) break;
      if (stepResult.needs_approval) {
        // Pause until user approves via approval card click
        const approval = await step.waitForEvent('approval_received', {
          run_id: plan.run_id,
          step_number: i,
        }, '24 hours');
        if (approval.status !== 'approved') break;
      }
    }

    // Step 3: Final response post to surface
    await step.runAction(internal.agentSteps.postFinalResponse, { run_id: plan.run_id });
  },
});
```

- [ ] **Step 2: Stub the internal action handlers** (full implementation in Phase B)

Create stub `convex/agentSteps.ts` with `startAgentRun`, `runOneStep`, `postFinalResponse` as `internalAction` definitions.

- [ ] **Step 3: Commit**

```bash
git add convex/workflows/agentTask.ts convex/agentSteps.ts
git commit -m "feat(workflow): wire Convex Workflow for durable agent task execution with HITL pause"
```

---

## Day A5 — Drop OpenMemory + simplify memory layer

### Task A5.1: Delete OpenMemory wiring

**Files:**
- Delete: `services/api/src/services/openmemory.service.ts`
- Delete: `services/api/src/types/openmemory-js.d.ts`
- Modify: `services/api/src/services/memory-router.service.ts`

- [ ] **Step 1: Delete OpenMemory files**

```bash
rm services/api/src/services/openmemory.service.ts
rm services/api/src/types/openmemory-js.d.ts
```

- [ ] **Step 2: Simplify memory-router.service.ts to SuperMemory-only**

Replace the entire `memory-router.service.ts` with a thin facade that always uses SuperMemory:

```typescript
import { SuperMemoryService } from './supermemory.service';

const sm = new SuperMemoryService();

export const memoryRouter = {
  add: sm.add.bind(sm),
  search: sm.search.bind(sm),
  list: sm.list.bind(sm),
  update: sm.update.bind(sm),
  delete: sm.delete.bind(sm),
  reinforce: sm.reinforce.bind(sm),
  stats: sm.stats.bind(sm),
  getUserProfile: sm.getUserProfile.bind(sm),
  processConversation: sm.processConversation.bind(sm),
  forget: sm.forget.bind(sm),
};
```

- [ ] **Step 3: Update all 9 files that read MEMORY_BACKEND**

```bash
grep -rn "MEMORY_BACKEND" services/api/src/ apps/web/
```

For each match, remove the conditional and use the SuperMemory path directly.

- [ ] **Step 4: Remove openmemory-js + qdrant deps**

```bash
cd services/api
bun remove openmemory-js qdrant-client @qdrant/js-client-rest
```

- [ ] **Step 5: Remove Qdrant ENV vars from .env.example**

Delete `QDRANT_URL`, `QDRANT_API_KEY`, `MEMORY_BACKEND` lines from any `.env.example` files.

- [ ] **Step 6: Update CLAUDE.md and README to reflect the simplification**

Edit CLAUDE.md to remove `MEMORY_BACKEND=openmemory|supermemory|dual|off` and replace with `SUPERMEMORY_API_KEY=...` only.

- [ ] **Step 7: Build verify**

```bash
bun run build
```

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(memory): drop OpenMemory + Qdrant legacy, SuperMemory-only path"
```

### Task A5.2: End-to-end smoke test

- [ ] **Step 1: Start all services locally**

```bash
# In separate terminals:
bunx convex dev
bun run --cwd services/api dev
bun run --cwd apps/web dev
```

- [ ] **Step 2: Test the chat flow end-to-end**

1. Open http://localhost:3000
2. Click "Sign in" → WorkOS hosted flow → return
3. Verify your user appears in Convex dashboard `users` table
4. Send a chat message via `/chat`
5. Verify a `commits` row appears in Convex with the tool call
6. Verify SuperMemory wrote a memory (check SuperMemory dashboard)
7. Verify the response streams back to the UI

- [ ] **Step 3: Test the bot flow**

1. Send a Slack DM to YULA in your dev workspace
2. Verify a `commits` row appears
3. Verify the response posts back to Slack

- [ ] **Step 4: Document any issues for Phase B**

Add any rough edges discovered to `docs/superpowers/specs/2026-04-07-yula-manus-alternative-design.md` §14 Open Questions.

- [ ] **Step 5: Tag the milestone**

```bash
git tag phase-a-complete
git commit --allow-empty -m "chore: Phase A stack migration complete — proceed to Phase B v1 sprint"
```

---

## Definition of Done — Phase A (5 days)

- [ ] Next.js 16.2 builds and runs in `apps/web`
- [ ] middleware.ts → proxy.ts migrated
- [ ] Manrope font renders site-wide
- [ ] Phosphor icons replace Hugeicons
- [ ] shadcn/ui Tailwind 4 verified
- [ ] Convex schema deployed (`users`, `commits`, `approvals`, `snapshots`, `subscriptions`)
- [ ] Convex Workflow + Durable Agents components installed
- [ ] AGIT-on-Convex commit/history/counterSign mutations working
- [ ] Postgres + Prisma + `packages/db` deleted
- [ ] WorkOS AuthKit middleware + provider + callback wired
- [ ] WorkOS webhook mirrors users to Convex
- [ ] Better Auth code deleted
- [ ] `services/agents/` (Python LangGraph) deleted
- [ ] Vercel AI SDK v6 `Agent` factory in `services/api/src/orchestrator/agent.ts`
- [ ] `/api/chat` route streams via AI SDK v6 Agent
- [ ] Convex Workflow `agentTaskWorkflow` defined with HITL pause
- [ ] OpenMemory + Qdrant + `openmemory-js` deleted
- [ ] `memory-router.service.ts` simplified to SuperMemory-only
- [ ] CLAUDE.md updated to reflect new stack
- [ ] End-to-end smoke test passes (chat + Slack bot + commit log + memory write)
- [ ] All commits atomic, branch ready to merge

## Next step

Once Phase A is complete and merged, begin Phase B: `docs/superpowers/plans/2026-04-07-yula-v1-manus-alternative.md`. Phase B's task code examples need adaptation to the new stack — the v2 plan revision will be done after this Phase A plan is committed.

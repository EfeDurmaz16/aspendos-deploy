# YULA OS — Production Readiness Plan
> Generated: 2026-04-17 from 5 parallel audit agents (landing+brand, chat+dock, outdated-refs, brandfetch, design-polish)
> Target: pixel-perfect, functionally sound rollout to real users
> Status: AWAITING APPROVAL on open questions (§10) before execution waves kick off

---

## 0. Executive Summary

The audit surfaced **two root causes** that explain ~80% of the user's complaints, and **~400 distinct defects** across the codebase. The root causes are one-line fixes with massive blast radius:

| # | Root cause | Blast radius | Fix LOC |
|---|---|---|---|
| RC1 | `ThemeProvider` sets `attribute="data-theme"` but `globals.css` declares `@custom-variant dark (&:is(.dark *))` — so **every `dark:*` Tailwind utility is dead**. ~445 occurrences across ~80 files rendering in the wrong mode. | Entire app's light/dark mode | 1 |
| RC2 | Manifest + JSON-LD + OG metadata reference **assets that don't exist**: `/logo.png`, `/og/home.png`, 6 PNG icon sizes, `chat-desktop.png`, `chat-mobile.png`. Installable PWA + social shares + search results all 404. Favicon is literally the letter "A" (Aspendos leftover). | PWA install, social shares, SEO | N/A (asset gen) |

Fix these two and the app jumps 2 tiers in quality perception without touching any component code.

**Hard launch blockers** (ship-stopping):
- `apps/web/src/app/timeline/page.tsx:187` — hardcoded user_id, auth leak
- `apps/web/src/app/billing/page.tsx:260` — "Manage subscription" button is a dead TODO, Stripe portal not wired
- ~20 live duplicate route folders (`api/webhooks/slack 2/`, `api/verify/[hash] 2/` etc.) — Next.js treats as reachable URLs with URL-encoded spaces, forming a public attack surface
- Landing "Works Everywhere" section uses Phosphor generic glyphs for 5/8 platforms (Google Chat = `ChatTeardropDots`, iMessage = `Envelope`, Signal = `Lock`) — visibly amateur
- 3 GitHub URLs point to wrong org (`github.com/aspendos`, `github.com/yula-ai`)
- ~235 model references outdated (GPT-4o, Claude 3.5, Gemini 1.5/2.0, Llama 3.x)

---

## 1. Phase Map (prioritized, wave-executable)

```
 Wave A (blocking, serial)      Wave B (parallel, post-RC-fixes)       Wave C (polish, parallel)
 ┌──────────────────────┐      ┌──────────────────────────────┐      ┌────────────────────────┐
 │ P0  Root-cause fixes │ ──▶  │ P2  Brand assets             │      │ P5  Model-name sweep    │
 │      - Theme variant │      │ P3  Landing polish           │      │ P6  App-shell nav       │
 │ P1  Security &       │      │ P4  Chat UI polish           │      │ P7  A11y sweep          │
 │     duplicate kill   │      │ P8  Outdated refs (backend)  │      │                         │
 └──────────────────────┘      └──────────────────────────────┘      └────────────────────────┘
```

Wave A must land + deploy + smoke-test before Wave B. Wave B phases can run in parallel (different surface owners). Wave C is parallel with B.

---

## 2. P0 — Root-Cause Fixes (Wave A, serial, 1 dev, ~30 min)

### P0.1 · Theme variant fix (1 line)
- **File**: `apps/web/src/app/globals.css:10`
- **Change**: `@custom-variant dark (&:is(.dark *));` → `@custom-variant dark (&:is([data-theme="dark"] *, .dark *));`
- **Acceptance**: toggle light ↔ dark on `/billing`, `/settings`, `/memory` — cards and text flip correctly. Run `bun run typecheck`.

### P0.2 · Asset pipeline generator
- Create `scripts/generate-brand-assets.ts` (Node + sharp) that consumes one authoritative SVG (YULA mark) and emits:
  - `public/logo.png` (512×512)
  - `public/logo.svg`
  - `public/favicon.ico` (multi-res 16/32/48)
  - `public/favicon.svg`
  - `public/apple-touch-icon.png` (180×180)
  - `public/icons/icon-{72,96,128,144,152,192,384,512}.png`
  - `public/og/home.png` (1200×630 template w/ tagline)
  - `public/screenshots/chat-{desktop,mobile}.png` (captured from `/chat` via Playwright)
- **Blocker**: YULA logo SVG does not exist — see §10 Q1

---

## 3. P1 — Safety & Cleanup (Wave A, serial, 1 dev, ~1h)

### P1.1 · Delete duplicate file cruft (~80 files)
- Script: `find apps/web/src services/api/src packages docs infra -regex '.* [0-9]\.\(tsx\|ts\|css\|json\|md\|toml\|yaml\)$' -delete`
- Also delete spaced directories: `apps/web/src/app/api/verify/[hash] 2..6/`, `apps/web/src/app/api/webhooks/{slack,telegram,discord,whatsapp} 2..4/`
- Grep pass for imports referencing these paths (should return 0).
- **Acceptance**: `git status` clean of ` 2.tsx`/` 3.ts` files. `bun run typecheck` passes. App builds.

### P1.2 · Fix auth leak in `timeline/page.tsx:187`
- Replace hardcoded `user_id` with `useAuth()` from `@/hooks/use-auth`
- Add server-side redirect if unauthenticated.

### P1.3 · Wire Stripe Customer Portal
- `apps/web/src/app/billing/page.tsx:260`: replace TODO button with `<a href={portalUrl}>` where `portalUrl` is returned from a new route handler `app/api/billing/portal/route.ts` that calls `stripe.billingPortal.sessions.create({ customer, return_url })`
- Add env: `STRIPE_PORTAL_RETURN_URL` (defaults to `NEXT_PUBLIC_APP_URL/billing`)

### P1.4 · Remove `/pricing2` duplicate
- Delete `apps/web/src/app/pricing2/` entirely (also has outdated GPT-4 refs). `/pricing` is canonical.

---

## 4. P2 — Brand Assets (Wave B, 1 dev, ~2-4h)

### P2.1 · YULA logo design
- Scope: wordmark + monogram (Y mark), one accent color (decision: solid `hsl(var(--accent))` or single accent ink), SVG-first
- Deliverable: `brand/yula-wordmark.svg`, `brand/yula-mark.svg`, `brand/yula-mark-mono.svg` (for OG/favicon contexts)
- **See §10 Q1** for design direction approval

### P2.2 · Run asset generator (P0.2 pipeline) with new SVG

### P2.3 · Update `layout.tsx` metadata, `manifest.json`, `structured-data.tsx`
- Rewrite description to match **new positioning**: "Deterministic AI agents that prove what they did. Every action signed, logged, reversible."
- Fix `site`/`creator` Twitter handle (unify `@yaboruAI` vs `YulaOS` — **§10 Q2**)
- Remove stale "GPT-5, Claude, Gemini & 12+ AI models" copy

---

## 5. P3 — Landing Polish (Wave B, 1 dev, ~3-5h)

### P3.1 · Hero visual — **§10 Q3 for direction**
Options:
- (a) Autoplay `AgentDemo` on load (remove `useInView` gate), enlarge to `max-w-5xl`, add a looping idle state
- (b) Composed hero screenshot: split-panel showing Slack message + web timeline + signed receipt, exported from Figma
- (c) Hero video: embed the 90s HyperFrames demo we just rendered (`yula-launch-video/renders/yula-demo-90s.mp4`) as a muted autoplay behind a play-CTA

### P3.2 · "Works Everywhere" real brand icons
Implementation is pre-written by the Brandfetch research agent:
- `bun add @iconify/json` (dev) and download 8 SVGs from `api.iconify.design/logos/<slug>.svg` into `apps/web/public/logos/`
- Create `apps/web/src/components/platform-icon.tsx` (code in agent report; Brandfetch CDN primary, local SVG fallback)
- Register at https://developers.brandfetch.com/register, add `NEXT_PUBLIC_BRANDFETCH_CLIENT_ID` to Vercel env
- Add `cdn.brandfetch.io` to `next.config.ts` `images.remotePatterns`
- Replace Phosphor imports in `landing/page.tsx:19-26` and surfaces grid `:780-790`

### P3.3 · Fix GitHub URLs on landing
- `landing/page.tsx:1173, 1217` — both `github.com/aspendos` → `github.com/EfeDurmaz16/aspendos-deploy`
- `structured-data.tsx:86` — `github.com/yula-ai` → same

### P3.4 · Align SEO copy with positioning (§2.3)

### P3.5 · Remove inline hex reversibility colors
- `landing/page.tsx:42-110` — the `REVERSIBILITY_CLASSES` inline `#22c55e`, `#eab308`, `#f97316`, `#ef4444`, `#991b1b` violates the monochrome design philosophy stated in `globals.css`. Decide: (i) move to CSS vars (`--semantic-green`, `--semantic-amber`...), or (ii) collapse to a single accent + monochrome intensity. Recommend (i) since reversibility badges need semantic color.

---

## 6. P4 — Chat UI Polish (Wave B, 1 dev, ~2-3h)

### P4.1 · Dock removal (global kill)
- Delete: `components/layout/site-dock.tsx`, `components/ui/dock.tsx`, `components/chat/shortcuts-dock.tsx`
- Edit: `apps/web/src/app/(marketing)/layout.tsx` — remove `<SiteDock />` import and render
- **Open question §10 Q4**: user said "dock kaldır tamamen" — SiteDock is currently rendered ONLY on marketing routes. Chat routes don't have it. Is the user (a) asking for global kill including marketing (my interpretation), or (b) seeing it somewhere else I haven't identified? Screenshot would help.

### P4.2 · Composer height reduction
- `apps/web/src/components/ai-elements/prompt-input.tsx:851`: `min-h-16` → `min-h-10`
- `apps/web/src/app/chat/page.tsx:271`: wrapper `p-3 sm:p-4` → `px-3 py-2 sm:px-4 sm:py-2`
- Conditionally render `PromptInputHeader` only when attachments exist
- Caption `mt-2` → `mt-1`
- Expected: ~180-200px → ~110-120px resting height

### P4.3 · Search ↔ Council button spacing
- `prompt-input.tsx:887`: `<PromptInputTools>` class `gap-1` → `gap-2`
- Optional: subtle `w-px h-4 bg-border` divider between attachment tools and search/council toggles

### P4.4 · Sweep hardcoded colors in chat surfaces
- `components/ui/ai-prompt-box.tsx` — 9 hardcoded hex → tokens (`bg-card`, `bg-muted`, `text-muted-foreground`)
- `components/chat/chat-input.tsx` vs `ChatInput.tsx` — case-collision on case-sensitive FS; pick one
- `components/memory-graph/memory-graph.tsx` + `memory-node.tsx` — remove `white/10`, `text-white` absolutes → `bg-foreground/5`, `text-foreground`
- `app/yula/page.tsx` — delete (looks like prototype) OR fully tokenize. **Confirm**.

---

## 7. P5 — Model Name Sweep (Wave C, parallel across surfaces, ~4-6h)

Canonical mapping (from agent 3 report):

| Old | → | New |
|---|---|---|
| `gpt-4*`, `gpt-4o*`, `GPT-4*` | → | `gpt-5` / `GPT-5` (or `gpt-5.4` for point) |
| `gpt-4o-mini` | → | `gpt-5-mini` |
| `claude-3*`, `claude-3-5-*`, `Claude 3*` | → | `claude-haiku-4-5` / `claude-sonnet-4-6` / `claude-opus-4-7` |
| `claude-sonnet-4-20250514`, `claude-sonnet-4-5`, `Claude Sonnet 4.5` | → | `claude-sonnet-4-6` / `Claude Sonnet 4.6` |
| `claude-opus-4-20250514`, `Claude Opus 4.5`, `Opus 4.1`, `Opus 4.0` | → | `claude-opus-4-7` / `Claude Opus 4.7` |
| `GPT-5.2*`, `GPT-5.1*` | → | `GPT-5.4` |
| `gemini-1.5-*`, `gemini-2.0-*`, `Gemini 3 Pro` (aspirational) | → | `gemini-2.5-pro` / `gemini-2.5-flash` |
| `llama-3.*`, `llama3-8b-8192`, `mixtral-8x7b-32768` | → | `llama-4-maverick` (70B class) / `llama-4-scout` (8B class) |
| `github.com/aspendos*`, `github.com/yula-ai*` | → | `github.com/EfeDurmaz16/aspendos-deploy` |

Hot-spot files (wholesale rewrite):
1. `apps/web/src/lib/ai/providers.ts` — full model registry
2. `apps/web/src/lib/services/hybrid-router.ts` — provider + fallback maps
3. `apps/web/src/hooks/useAutoRouting.ts` — routing heuristics
4. `services/api/src/lib/ai-providers.ts` + `model-fallback.ts` — backend registry
5. `apps/web/src/components/chat/add-models-modal.tsx` — user-facing picker
6. `services/api/src/lib/openapi-spec.ts` — public OpenAPI examples
7. `cost-tracker.ts`, `usage-ledger.ts`, `billing.service.ts` — pricing tables (prices!, not just IDs)

Marketing copy files (user-facing):
- `landing/page.tsx:691`, `terms/page.tsx:52`, `privacy/page.tsx:106`, `compare/{poe,chatgpt,gemini}/page.tsx`, `settings/page.tsx:62-79`, `components/chat/chat-input.tsx:61`, `components/seo/geo-content.tsx:91-92`, `structured-data.tsx:207`

Tests: ~12 test files (agent report §Tests/fixtures lists all).

**Note**: Internal npm scope `@aspendos/*` baked into ~20 `package.json` files — **§10 Q5**: keep or rename to `@yula/*`?

---

## 8. P6 — App-Shell Navigation (Wave C, parallel, ~2h)

Secondary pages with **no persistent nav** (user hits browser-back to jump back to chat): `/memory`, `/billing`, `/settings`, `/skills`, `/agent-log`, `/onboarding`, `/import`, `/timeline`, `/analytics`.

Fix: promote `IconRail` to a root-level layout concern — either:
- (a) mount it in `(app)` route group layout, which wraps all authenticated routes, or
- (b) add a minimal top-bar with Logo + menu that navigates between primary surfaces on non-chat pages.

Option (a) is cleaner — requires route-group refactor: move chat/memory/billing/settings/skills/agent-log/import/timeline/analytics/onboarding under `app/(app)/` and add `(app)/layout.tsx` that renders `<IconRail>{children}</IconRail>`.

---

## 9. P7 — Accessibility & Final Polish (Wave C, ~2h)

- Sweep icon-only buttons for `aria-label` (memory-graph, pac-actions, memory-node)
- Replace arbitrary `rounded-[12px]`, `rounded-[6px]`, `rounded-[8px]` → `rounded-lg`, `rounded-md` (pac-notification, pac-settings)
- Verify `bg-black/50` backdrop modals use `bg-background/80 backdrop-blur` tokens
- Hardcoded mobile status bar `<meta apple-mobile-web-app-status-bar-style="black-translucent">` — change to `default` to respect system theme
- Fix `w-[500-700px]` decorative blobs on memory/billing — cap at `w-full` or wrap in `hidden md:block`
- Clean remaining TODO comments in `lib/ai/hybrid.ts`, `lib/memory/ingest.ts`, `api/cron/pac/route.ts`, `api/account/route.ts`, `api/memory/route.ts`

---

## 10. Open Questions — NEED DECISION BEFORE WAVE B

### Q1 · Logo design direction
Three concepts I'll generate as SVGs (pick one, I iterate):
- **A · Geometric Y mark** — bold lowercase `y` in a rounded square, one accent color. Feels like Linear / Vercel modern ergonomic.
- **B · Seal/signet mark** — "Y" inside a monoline circle suggesting a wax seal / receipt stamp. Visual rhyme with "prove what they did" / signed actions.
- **C · Wordmark only** — type-first, custom `yula` lowercase with a custom ligature. No mark. Feels serious and founder-forward.

(I'll generate all three for comparison if you prefer.)

### Q2 · Canonical Twitter handle
- `@yaboruAI` (used in metadata.ts, structured-data.tsx, geo-content.tsx)
- `YulaOS` (used in ai.txt)
- Other? Confirm which one is real, I'll unify everywhere.

### Q3 · Hero visual approach
- (a) **Autoplay `AgentDemo` above the fold** — cheap, ships this afternoon, demonstrates the product directly
- (b) **Composed screenshot** — dense, beautiful, takes design work
- (c) **Embed the 90s demo video we just made** — reuses work, motion-heavy, but video above the fold is heavier and less accessible

### Q4 · "Dock kaldır" kapsamı
SiteDock currently renders ONLY on marketing routes (landing, pricing, features etc.), NOT on chat/memory/council. I suspect you mean kill it globally on marketing too. Confirm, or send a screenshot of where you see a dock you don't want.

### Q5 · npm package scope rename
Keep `@aspendos/*` (20+ package.json files) or rename to `@yula/*`? Rename is a big refactor across all imports; keep is a mild brand inconsistency. Recommend **keep** for now, address post-launch.

### Q6 · `/app/yula/page.tsx` — what is this?
Looks like a prototype, hardcoded dark, `text-white` everywhere. Delete? Rename? Tokenize?

---

## 11. Execution Plan

**Wave A** (today, serial, 1.5h total):
1. P0.1 theme variant fix + smoke test
2. P1.1 duplicate file purge + typecheck
3. P1.2 auth leak fix
4. P1.3 Stripe portal wire
5. P1.4 delete /pricing2
6. Commit atomically, deploy preview, verify

**Wave B** (after Q1-Q4 answered, **4 parallel agents**, 3-5h):
- Agent `brand-assets`: P2 full
- Agent `landing-polish`: P3 full
- Agent `chat-polish`: P4 full
- Agent `models-backend`: P5 backend hot-spots (providers.ts, hybrid-router.ts, ai-providers.ts, openapi-spec.ts, pricing tables)

**Wave C** (parallel with B tail, 2 parallel agents, 2-3h):
- Agent `models-frontend`: P5 marketing copy + settings + modal
- Agent `shell-nav`: P6 + P7 + residual TODOs

Total effort estimate: **10-14h of agent work, 4 waves, ~6-8h wall-clock with parallelism.**

---

## 12. Risk & Rollback

- All changes on feature branch `feat/production-readiness-2026-04-17`
- Atomic commits per phase/subtask
- Preview deploy + manual smoke test after Wave A before proceeding to B
- Rollback: `git revert <sha>` per commit
- Heavy-hit files (providers.ts, globals.css) get dedicated PRs with their own reviews

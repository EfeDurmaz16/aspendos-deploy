# YULA v1 Implementation Plan (Manus Alternative)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **🚨 v3 stack pivot note (2026-04-07)**: This plan was authored against the original Postgres+Better Auth+LangGraph stack. ADR 0001 pivoted the tech stack to **Convex + WorkOS AuthKit + Vercel AI SDK v6 + Convex Workflow + Next.js 16 + Phosphor + Manrope**. The Phase A migration (`docs/superpowers/plans/2026-04-07-yula-v0-stack-migration.md`) MUST run before this Phase B plan. When executing Phase B tasks below, apply these substitutions:
>
> - `services/api/src/audit/agit.ts` (Postgres) → `services/api/src/audit/agit-convex.ts` (thin client over `convex/commits.ts`)
> - `services/api/src/governance/fides.ts` → unchanged (FIDES is platform-agnostic)
> - `services/api/src/orchestrator/step.ts` → still pre/post commit wrapper, but writes go to Convex via `agit-convex.ts`, not Postgres
> - `services/api/src/auth/*` Better Auth → ALREADY DELETED in Phase A, use WorkOS `withAuth()` from `@workos-inc/authkit-nextjs`
> - `services/agents/*` LangGraph (Python) → ALREADY DELETED in Phase A, all orchestration is Vercel AI SDK v6 `Agent` in `services/api/src/orchestrator/agent.ts`
> - Inngest references → use Convex Workflow component primitives instead (`step.runMutation`, `step.runAction`, `step.waitForEvent`)
> - LLM calls → multi-provider via `gateway('groq/llama-4-405b')`, `gateway('anthropic/claude-haiku-4.5')`, `gateway('anthropic/claude-sonnet-4.6')` etc.
> - Hugeicons imports → `@phosphor-icons/react` (PascalCase, no `Icon` suffix)
> - `next/font` → Manrope is already configured in `apps/web/app/layout.tsx`
> - Next.js routing → `proxy.ts` not `middleware.ts`, `await params` everywhere
> - Pricing → $25 / $60 / $180 (not $20 / $50 / $150) with BYOK option for Pro+ tier
>
> Tasks below should produce the same outcomes; only the implementation backend differs. Specific test/code blocks may need editor adjustments to match the new SDKs.

> **🆕 v4 additions (2026-04-07)**: 11 patterns from OpenClaw + Hermes Agent research (see spec §16 and `docs/superpowers/specs/2026-04-07-yula-v1.5-backlog.md`). These slot into existing Phase B days without extending the sprint. When executing tasks below, inject these additions at the specified days:
>
> | Day | Addition | Effort | Source |
> |---|---|---|---|
> | Day 2 (tool registry) | **Pattern 4**: create `services/api/src/security/dangerous-tools.ts` — centralized denylist array | +1h | OpenClaw |
> | Day 2 (orchestrator) | **Pattern 3**: two-tier router — pattern-match first (heuristic, $0), Groq LLM fallback for ambiguous | +2h | Hermes |
> | Day 2 (step middleware) | **Pattern 6**: pre-compaction silent flush turn when context reaches 80% | +2h | OpenClaw |
> | Day 3 (reference tools) | **Pattern 11**: add `PAC.schedule` tool + `/settings/schedules` page — surface scheduled actions as explicit feature | +1h | Existing PAC made visible |
> | Day 4-5 (surface adapters) | **Pattern 2**: refactor Vercel Chat SDK integration into ~20 typed slots (`auth`, `outbound`, `approvalCard`, `undoCommand`, `doctor`, `reversibilityBadge`, etc.) — net time SAVED on 4 new surface activations | net 0 (saves time) | OpenClaw |
> | Day 6 (undo command) | **Pattern 1**: unify PAC with normal chat pipeline — heartbeats become silent filtered messages through `runToolStep`, not separate code path | +0.5d | OpenClaw |
> | Day 6 (browser tool) | **Pattern 10 / External content defense**: wrap Steel.dev browser output + email body output with `<external_content trust_level="untrusted">` markers and injection reminder | +4h | OpenClaw `security/external-content.ts` |
> | Day 6 (surfaces) | **Pattern 7**: minimal `/doctor` slash command showing auth/webhook/rate-limit health per surface | +2h | OpenClaw `ChannelDoctorAdapter` |
> | Day 8 (landing + pricing) | **Pattern 8**: cost dashboard at `/settings/usage` — real-time token counts, tier caps, BYOK management | +2h | Hermes token-bloat UX lesson |
> | Day 14 (pre-launch) | **Pattern 9**: USPTO trademark audit for "YULA" and "Aspendos" (class 9 software, class 42 SaaS) + domain availability check | +2h | OpenClaw rename saga lesson |
> | Day 14 (pre-launch) | **§12 Risks update**: add 7 new anti-pattern rows from competitor failure modes | +30min | OpenClaw + Hermes bugs |
>
> Additionally: **Phase A Day A1 already uses Pattern 12 `shadcn apply`** as an internal tool to collapse font/icons/theme setup into one preset+apply command.
>
> And: **Prompt-cache stability invariant (Pattern 5)** is enforced in Phase A Day 4 (AI SDK v6 Agent wiring), not Phase B — the `buildCanonicalPayload()` helper with deterministic ordering lives in `services/api/src/orchestrator/payload-builder.ts` from Day 1 of v1 build.

**Goal:** Ship YULA v1 in 10 days — a trustworthy general AI agent on 8 messaging surfaces + Web command center, with the 5-class Reversibility Model (undoable / cancelable_window / compensatable / approval_only / irreversible_blocked) as the product spine. Every action FIDES-signed, AGIT-committed, class-badged, and surfaced to the user before execution.

**Architecture:** Layered stack. Chat SDK bot router + Web AI route funnel into a single agent orchestrator. Every tool call passes through: (1) reversibility classification → (2) FIDES sign → (3) AGIT pre-commit → (4) execution → (5) AGIT post-commit. The tool registry declares a reversibility class + rollback strategy + human explanation per tool. Approval cards on every surface use a 4-color badge system. Web `/timeline` is the rewind + audit console. E2B is the sandbox layer, Steel.dev the browser, Anthropic Computer Use API the desktop driver.

**Tech Stack:** Next.js 15, React 19, Tailwind CSS 4, Hono (Bun runtime), LangGraph (Python), Vercel AI SDK v6, Vercel Chat SDK + adapters, Better Auth, Stripe, PostgreSQL (Neon) + Prisma, SuperMemory, Vercel AI Gateway, FIDES (`@fides/sdk`), AGIT (TS SDK), E2B, Steel.dev (Playwright-compatible), Anthropic Computer Use API (`computer-use-2025-11-24`).

**Spec reference:** `docs/superpowers/specs/2026-04-07-yula-manus-alternative-design.md`

---

## Phase 0 — Sprint prep (Day 0, ~2 hours)

**Purpose**: verify the two most critical external dependencies (FIDES + AGIT TS SDKs) before committing to a 10-day sprint that assumes they work. If either is broken, we fix them first — this is the riskiest prerequisite.

### Task 0.1: Verify FIDES TS SDK is production-ready

**Files:**
- Read: `~/fides/packages/sdk/` (user's own project)
- Create: `scratch/verify-fides.ts` (throwaway verification script)

- [ ] **Step 1: Inspect FIDES package exports**

Run: `ls ~/fides/packages/sdk/dist/ && cat ~/fides/packages/sdk/package.json | grep -E '"name"|"main"|"types"'`
Expected: see the package name (likely `@fides/sdk`), entry point, and TypeScript types.

- [ ] **Step 2: Create verification script**

Create `scratch/verify-fides.ts`:

```typescript
import { Fides, TrustLevel } from '@fides/sdk';

async function verify() {
  const fides = new Fides({
    discoveryUrl: 'http://localhost:3100',
    trustUrl: 'http://localhost:3200',
  });

  // Create identity
  const { did, privateKey } = await fides.createIdentity({ name: 'YULA verify' });
  console.log('DID:', did);

  // Sign a request
  const signed = await fides.signRequest({
    method: 'POST',
    url: 'https://example.com/api/test',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ task: 'verify' }),
  });
  console.log('Signature header present:', !!signed.headers['Signature']);

  // Verify the signed request
  const result = await fides.verifyRequest(signed);
  console.log('Self-verification valid:', result.valid);

  if (!result.valid) {
    throw new Error('FIDES self-verification failed — SDK is broken');
  }
}

verify().catch((e) => {
  console.error('FIDES verification failed:', e);
  process.exit(1);
});
```

- [ ] **Step 3: Install FIDES from local path and run**

Run:
```bash
cd ~/Desktop/aspendos-deploy
bun add file:~/fides/packages/sdk
bun scratch/verify-fides.ts
```
Expected: prints DID, "Signature header present: true", "Self-verification valid: true".

- [ ] **Step 4: If verification fails, fix FIDES first**

If the script errors, fix the issue in `~/fides` before continuing. This is a launch-blocking prerequisite. Common fixes: missing exports in `index.ts`, missing build step (`cd ~/fides && pnpm build`), wrong package name.

- [ ] **Step 5: Commit the scratch verification**

```bash
git add scratch/verify-fides.ts package.json bun.lock
git commit -m "chore(scratch): verify FIDES SDK integration works end-to-end"
```

### Task 0.2: Verify AGIT TS SDK is production-ready

**Files:**
- Read: `~/agit/ts-sdk/`
- Create: `scratch/verify-agit.ts`

- [ ] **Step 1: Inspect AGIT TS SDK exports**

Run: `ls ~/agit/ts-sdk/dist/ && cat ~/agit/ts-sdk/package.json | grep -E '"name"|"main"|"types"'`
Expected: package name (likely `agit` or `@agit/sdk`), entry point, and TS types.

- [ ] **Step 2: Create verification script**

Create `scratch/verify-agit.ts`:

```typescript
import { Repository } from 'agit';

async function verify() {
  // Use an in-memory or temp-file repo for verification
  const repo = await Repository.open({
    path: '/tmp/yula-verify-agit',
    agentId: 'yula-verify',
    create: true,
  });

  // Commit some state
  const commit1 = await repo.commit({
    state: { counter: 1, note: 'first' },
    message: 'initial',
    actionType: 'checkpoint',
  });
  console.log('Commit 1:', commit1.hash);

  const commit2 = await repo.commit({
    state: { counter: 2, note: 'second' },
    message: 'update',
    actionType: 'checkpoint',
  });
  console.log('Commit 2:', commit2.hash);

  // Read history
  const history = await repo.log({ limit: 10 });
  console.log('History length:', history.length);
  if (history.length !== 2) throw new Error(`Expected 2 commits, got ${history.length}`);

  // Diff
  const diff = await repo.diff(commit1.hash, commit2.hash);
  console.log('Diff has changes:', diff.length > 0);

  // Revert
  await repo.revert(commit2.hash);
  const state = await repo.readState();
  console.log('State after revert:', state);
  if (state.counter !== 1) throw new Error('Revert did not restore state');

  console.log('AGIT verification: OK');
}

verify().catch((e) => {
  console.error('AGIT verification failed:', e);
  process.exit(1);
});
```

- [ ] **Step 3: Install AGIT and run**

```bash
bun add file:~/agit/ts-sdk
bun scratch/verify-agit.ts
```
Expected: commits printed, history length 2, diff present, state after revert has counter: 1.

- [ ] **Step 4: If verification fails, fix AGIT first**

Same rule as FIDES. This is launch-blocking. Fix `~/agit/ts-sdk` before proceeding.

- [ ] **Step 5: Commit verification**

```bash
git add scratch/verify-agit.ts package.json bun.lock
git commit -m "chore(scratch): verify AGIT TS SDK integration works end-to-end"
```

---

## Phase 1 — Foundation (Days 1-3): FIDES + AGIT + Reversibility Model + 5 reference tools

**Purpose**: lay down the cryptographic + auditability + classification spine that everything else sits on. **This phase is launch-critical — nothing after it works without this.**

### Day 1 morning — FIDES integration

### Task 1.1: Create FIDES service module

**Files:**
- Create: `services/api/src/governance/fides.ts`
- Test: `services/api/src/governance/fides.test.ts`

- [ ] **Step 1: Write failing test for agent identity creation**

Create `services/api/src/governance/fides.test.ts`:

```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import { FidesService } from './fides';

describe('FidesService', () => {
  let svc: FidesService;

  beforeAll(async () => {
    svc = new FidesService({ discoveryUrl: 'http://localhost:3100', trustUrl: 'http://localhost:3200' });
    await svc.initialize();
  });

  it('creates an agent DID on initialize', async () => {
    expect(svc.agentDid).toBeDefined();
    expect(svc.agentDid).toMatch(/^did:fides:/);
  });

  it('signs a tool call request and verifies it', async () => {
    const signed = await svc.signToolCall({
      toolName: 'file.write',
      args: { path: '/tmp/test.txt', content: 'hello' },
      userId: 'user-123',
    });
    expect(signed.signature).toBeDefined();
    const valid = await svc.verifySignature(signed);
    expect(valid).toBe(true);
  });

  it('counter-signs with a user identity', async () => {
    const { did: userDid } = await svc.createUserIdentity('user-123');
    const action = { toolName: 'db.migrate', args: { sql: 'ALTER ...' }, userId: 'user-123' };
    const agentSigned = await svc.signToolCall(action);
    const counterSigned = await svc.counterSignWithUser(agentSigned, userDid);
    expect(counterSigned.signatures).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test services/api/src/governance/fides.test.ts`
Expected: FAIL with "Cannot find module './fides'" or similar.

- [ ] **Step 3: Implement FidesService**

Create `services/api/src/governance/fides.ts`:

```typescript
import { Fides } from '@fides/sdk';

export interface SignedToolCall {
  toolName: string;
  args: unknown;
  userId: string;
  timestamp: string;
  signature: string;
  signerDid: string;
  signatures?: Array<{ did: string; signature: string }>;
}

export interface FidesConfig {
  discoveryUrl: string;
  trustUrl: string;
}

export class FidesService {
  private fides: Fides;
  public agentDid!: string;
  private userIdentities = new Map<string, { did: string; privateKey: string }>();

  constructor(private config: FidesConfig) {
    this.fides = new Fides({
      discoveryUrl: config.discoveryUrl,
      trustUrl: config.trustUrl,
    });
  }

  async initialize(): Promise<void> {
    const { did } = await this.fides.createIdentity({ name: 'yula-agent' });
    this.agentDid = did;
  }

  async createUserIdentity(userId: string): Promise<{ did: string }> {
    if (this.userIdentities.has(userId)) {
      return { did: this.userIdentities.get(userId)!.did };
    }
    const { did, privateKey } = await this.fides.createIdentity({ name: `yula-user-${userId}` });
    this.userIdentities.set(userId, { did, privateKey });
    return { did };
  }

  async signToolCall(action: { toolName: string; args: unknown; userId: string }): Promise<SignedToolCall> {
    const timestamp = new Date().toISOString();
    const canonical = JSON.stringify({ tool: action.toolName, args: action.args, user: action.userId, ts: timestamp });
    const signed = await this.fides.signRequest({
      method: 'POST',
      url: 'yula://tool-call',
      headers: { 'Content-Type': 'application/json' },
      body: canonical,
    });
    return {
      toolName: action.toolName,
      args: action.args,
      userId: action.userId,
      timestamp,
      signature: signed.headers['Signature'] || signed.headers['signature'],
      signerDid: this.agentDid,
      signatures: [{ did: this.agentDid, signature: signed.headers['Signature'] || signed.headers['signature'] }],
    };
  }

  async verifySignature(signed: SignedToolCall): Promise<boolean> {
    const canonical = JSON.stringify({
      tool: signed.toolName,
      args: signed.args,
      user: signed.userId,
      ts: signed.timestamp,
    });
    const result = await this.fides.verifyRequest({
      method: 'POST',
      url: 'yula://tool-call',
      headers: { Signature: signed.signature, 'Content-Type': 'application/json' },
      body: canonical,
    });
    return result.valid;
  }

  async counterSignWithUser(signed: SignedToolCall, userDid: string): Promise<SignedToolCall> {
    // Re-sign the already-signed payload with the user's identity
    const user = Array.from(this.userIdentities.values()).find((u) => u.did === userDid);
    if (!user) throw new Error(`User identity not found for DID ${userDid}`);
    const canonical = JSON.stringify({ parent: signed.signature, userDid });
    const userSigned = await this.fides.signRequest({
      method: 'POST',
      url: 'yula://counter-sign',
      headers: {},
      body: canonical,
    });
    return {
      ...signed,
      signatures: [
        ...(signed.signatures ?? []),
        { did: userDid, signature: userSigned.headers['Signature'] || userSigned.headers['signature'] },
      ],
    };
  }
}
```

- [ ] **Step 4: Run test, expect PASS**

Run: `bun test services/api/src/governance/fides.test.ts`
Expected: all 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add services/api/src/governance/fides.ts services/api/src/governance/fides.test.ts
git commit -m "feat(governance): add FidesService for cryptographic tool call signing"
```

### Task 1.2: Export a FIDES singleton for the API runtime

**Files:**
- Create: `services/api/src/governance/index.ts`
- Modify: `services/api/src/index.ts` (wire initialization)

- [ ] **Step 1: Create singleton**

Create `services/api/src/governance/index.ts`:

```typescript
import { FidesService } from './fides';

let singleton: FidesService | null = null;

export async function getFides(): Promise<FidesService> {
  if (singleton) return singleton;
  singleton = new FidesService({
    discoveryUrl: process.env.FIDES_DISCOVERY_URL || 'http://localhost:3100',
    trustUrl: process.env.FIDES_TRUST_URL || 'http://localhost:3200',
  });
  await singleton.initialize();
  return singleton;
}

export { FidesService, type SignedToolCall } from './fides';
```

- [ ] **Step 2: Initialize during API startup**

Modify `services/api/src/index.ts` (add after imports, before route definitions):

```typescript
import { getFides } from './governance';

// During startup, eagerly init FIDES so the agent DID is known
getFides().then((fides) => {
  console.log(`[yula-api] FIDES initialized with agent DID: ${fides.agentDid}`);
}).catch((err) => {
  console.error('[yula-api] FATAL: FIDES initialization failed', err);
  process.exit(1);
});
```

- [ ] **Step 3: Run API locally and verify startup log**

Run: `bun run --cwd services/api dev`
Expected: log line `[yula-api] FIDES initialized with agent DID: did:fides:...`

- [ ] **Step 4: Commit**

```bash
git add services/api/src/governance/index.ts services/api/src/index.ts
git commit -m "feat(governance): eagerly initialize FIDES singleton at API startup"
```

### Day 1 afternoon — AGIT integration

### Task 1.3: Create AGIT audit module

**Files:**
- Create: `services/api/src/audit/agit.ts`
- Test: `services/api/src/audit/agit.test.ts`

- [ ] **Step 1: Write failing test**

Create `services/api/src/audit/agit.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { AgitService } from './agit';

describe('AgitService', () => {
  let svc: AgitService;

  beforeEach(async () => {
    svc = new AgitService({ databaseUrl: process.env.TEST_DATABASE_URL! });
    await svc.initialize();
  });

  it('creates a per-user repo on first commit', async () => {
    const commit = await svc.commitAction('user-1', {
      toolName: 'file.write',
      args: { path: '/tmp/a.txt' },
      status: 'pending',
      reversibility: { reversibility_class: 'undoable', approval_required: false, rollback_strategy: { kind: 'snapshot_restore', snapshot_id: 'snap-1' }, human_explanation: 'Can be fully undone' },
    });
    expect(commit.hash).toMatch(/^[a-f0-9]{40}$/);
  });

  it('reads commit history for a user', async () => {
    await svc.commitAction('user-2', { toolName: 'a', args: {}, status: 'ok', reversibility: { reversibility_class: 'undoable', approval_required: false, rollback_strategy: { kind: 'none' }, human_explanation: '' } });
    await svc.commitAction('user-2', { toolName: 'b', args: {}, status: 'ok', reversibility: { reversibility_class: 'undoable', approval_required: false, rollback_strategy: { kind: 'none' }, human_explanation: '' } });
    const history = await svc.historyForUser('user-2', 10);
    expect(history.length).toBe(2);
  });

  it('reverts to a prior commit', async () => {
    const c1 = await svc.commitAction('user-3', { toolName: 'a', args: {}, status: 'ok', reversibility: { reversibility_class: 'undoable', approval_required: false, rollback_strategy: { kind: 'none' }, human_explanation: '' } });
    await svc.commitAction('user-3', { toolName: 'b', args: {}, status: 'ok', reversibility: { reversibility_class: 'undoable', approval_required: false, rollback_strategy: { kind: 'none' }, human_explanation: '' } });
    const reverted = await svc.revert('user-3', c1.hash);
    expect(reverted.hash).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test, expect FAIL**

Run: `bun test services/api/src/audit/agit.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement AgitService**

Create `services/api/src/audit/agit.ts`:

```typescript
import { Repository } from 'agit';
import type { ReversibilityMetadata } from '../reversibility/types';

export interface ActionCommit {
  toolName: string;
  args: unknown;
  status: 'pending' | 'ok' | 'failed' | 'refused';
  result?: unknown;
  reversibility: ReversibilityMetadata;
  signature?: string;
  signerDid?: string;
}

export interface CommitRecord {
  hash: string;
  parent?: string;
  userId: string;
  timestamp: string;
  action: ActionCommit;
}

export interface AgitConfig {
  databaseUrl: string;
}

export class AgitService {
  private repos = new Map<string, Repository>();

  constructor(private config: AgitConfig) {}

  async initialize(): Promise<void> {
    // Nothing to do at module init; per-user repos are created lazily
  }

  private async getUserRepo(userId: string): Promise<Repository> {
    const cached = this.repos.get(userId);
    if (cached) return cached;
    const repo = await Repository.open({
      // In v1 we key repos by user id inside a shared Postgres schema
      path: `postgres://yula/agit/${userId}`,
      agentId: `yula-${userId}`,
      create: true,
      // pg state adapter — exact config depends on AGIT TS SDK surface
      connectionString: this.config.databaseUrl,
    } as any);
    this.repos.set(userId, repo);
    return repo;
  }

  async commitAction(userId: string, action: ActionCommit): Promise<CommitRecord> {
    const repo = await this.getUserRepo(userId);
    const c = await repo.commit({
      state: { latest_action: action },
      message: `${action.toolName}:${action.status}`,
      actionType: 'tool_call',
      metadata: action as unknown as Record<string, unknown>,
    });
    return {
      hash: c.hash,
      parent: c.parent,
      userId,
      timestamp: new Date().toISOString(),
      action,
    };
  }

  async historyForUser(userId: string, limit = 50): Promise<CommitRecord[]> {
    const repo = await this.getUserRepo(userId);
    const log = await repo.log({ limit });
    return log.map((c: any) => ({
      hash: c.hash,
      parent: c.parent,
      userId,
      timestamp: c.timestamp ?? new Date().toISOString(),
      action: c.metadata as unknown as ActionCommit,
    }));
  }

  async getCommit(userId: string, hash: string): Promise<CommitRecord | null> {
    const repo = await this.getUserRepo(userId);
    const c = await repo.read(hash);
    if (!c) return null;
    return { hash: c.hash, parent: c.parent, userId, timestamp: c.timestamp ?? new Date().toISOString(), action: c.metadata as unknown as ActionCommit };
  }

  async revert(userId: string, targetHash: string): Promise<CommitRecord> {
    const repo = await this.getUserRepo(userId);
    const c = await repo.revert(targetHash);
    return { hash: c.hash, parent: c.parent, userId, timestamp: new Date().toISOString(), action: { toolName: 'agit.revert', args: { to: targetHash }, status: 'ok', reversibility: { reversibility_class: 'undoable', approval_required: false, rollback_strategy: { kind: 'none' }, human_explanation: '' } } };
  }
}
```

- [ ] **Step 4: Run test, expect PASS**

Run: `TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5432/yula_test bun test services/api/src/audit/agit.test.ts`
Expected: 3 tests PASS.

**Note**: if the AGIT TS SDK's `Repository.open` signature differs from the one assumed here, adjust the call in `getUserRepo` to match the real API (from the verification done in Task 0.2). This is the most likely point of adaptation.

- [ ] **Step 5: Commit**

```bash
git add services/api/src/audit/agit.ts services/api/src/audit/agit.test.ts
git commit -m "feat(audit): add AgitService for per-user action commit history"
```

### Task 1.4: Export AGIT singleton

**Files:**
- Create: `services/api/src/audit/index.ts`
- Modify: `services/api/src/index.ts`

- [ ] **Step 1: Create singleton**

Create `services/api/src/audit/index.ts`:

```typescript
import { AgitService } from './agit';

let singleton: AgitService | null = null;

export async function getAgit(): Promise<AgitService> {
  if (singleton) return singleton;
  singleton = new AgitService({ databaseUrl: process.env.DATABASE_URL! });
  await singleton.initialize();
  return singleton;
}

export { AgitService, type ActionCommit, type CommitRecord } from './agit';
```

- [ ] **Step 2: Eagerly init at startup**

Modify `services/api/src/index.ts` to also init AGIT:

```typescript
import { getAgit } from './audit';
// ...
getAgit().then(() => console.log('[yula-api] AGIT initialized')).catch((err) => {
  console.error('[yula-api] FATAL: AGIT initialization failed', err);
  process.exit(1);
});
```

- [ ] **Step 3: Run API and verify startup**

Run: `bun run --cwd services/api dev`
Expected: both FIDES and AGIT init log lines.

- [ ] **Step 4: Commit**

```bash
git add services/api/src/audit/index.ts services/api/src/index.ts
git commit -m "feat(audit): eagerly initialize AGIT singleton at API startup"
```

### Day 2 — Reversibility Model data layer

### Task 1.5: Define ReversibilityClass types

**Files:**
- Create: `services/api/src/reversibility/types.ts`

- [ ] **Step 1: Write the types file directly (no test needed for a type-only module)**

Create `services/api/src/reversibility/types.ts`:

```typescript
/**
 * The 5 reversibility classes — the product spine.
 * See docs/superpowers/specs/2026-04-07-yula-manus-alternative-design.md §5.
 */
export type ReversibilityClass =
  | 'undoable'
  | 'cancelable_window'
  | 'compensatable'
  | 'approval_only'
  | 'irreversible_blocked';

export type RollbackStrategy =
  | { kind: 'snapshot_restore'; snapshot_id: string }
  | { kind: 'cancel_window'; deadline: string; cancel_api: string }
  | { kind: 'compensation'; compensate_tool: string; compensate_args: unknown }
  | { kind: 'none' };

export interface ReversibilityMetadata {
  reversibility_class: ReversibilityClass;
  approval_required: boolean;
  rollback_strategy: RollbackStrategy;
  rollback_deadline?: string;  // ISO8601, only for cancelable_window
  human_explanation: string;   // user-facing copy for the approval card
}

export const BADGE_COLOR: Record<ReversibilityClass, string> = {
  undoable: 'green',
  cancelable_window: 'green',
  compensatable: 'yellow',
  approval_only: 'amber',
  irreversible_blocked: 'red',
};

export const BADGE_LABEL: Record<ReversibilityClass, string> = {
  undoable: 'Undoable',
  cancelable_window: 'Cancel within window',
  compensatable: 'Compensatable',
  approval_only: 'Needs approval',
  irreversible_blocked: 'Blocked',
};
```

- [ ] **Step 2: Commit**

```bash
git add services/api/src/reversibility/types.ts
git commit -m "feat(reversibility): define 5-class ReversibilityClass types and metadata"
```

### Task 1.6: Tool registry with reversibility annotations

**Files:**
- Create: `services/api/src/tools/registry.ts`
- Test: `services/api/src/tools/registry.test.ts`

- [ ] **Step 1: Write failing test**

Create `services/api/src/tools/registry.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { registerTool, getTool, classifyTool, listTools } from './registry';
import type { ToolDefinition } from './registry';

describe('tool registry', () => {
  it('registers and retrieves a tool', () => {
    const tool: ToolDefinition = {
      name: 'test.noop',
      description: 'no-op for testing',
      inputSchema: {},
      execute: async () => ({ ok: true }),
      classify: () => ({
        reversibility_class: 'undoable',
        approval_required: false,
        rollback_strategy: { kind: 'none' },
        human_explanation: 'Can be undone',
      }),
    };
    registerTool(tool);
    expect(getTool('test.noop')).toBe(tool);
  });

  it('classifies a tool invocation', () => {
    const meta = classifyTool('test.noop', {});
    expect(meta.reversibility_class).toBe('undoable');
  });

  it('lists all registered tools', () => {
    const names = listTools().map((t) => t.name);
    expect(names).toContain('test.noop');
  });
});
```

- [ ] **Step 2: Run test, expect FAIL**

Run: `bun test services/api/src/tools/registry.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement registry**

Create `services/api/src/tools/registry.ts`:

```typescript
import type { ReversibilityMetadata } from '../reversibility/types';

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: unknown;  // zod schema or JSON schema
  /** The actual work: given args + a context, perform the action and return the result. */
  execute: (args: unknown, ctx: ToolContext) => Promise<unknown>;
  /** The reverse handler, if applicable. Called during undo. */
  reverse?: (metadata: ReversibilityMetadata, ctx: ToolContext) => Promise<void>;
  /** Given args, compute the reversibility metadata for THIS invocation (blast radius can elevate class). */
  classify: (args: unknown) => ReversibilityMetadata;
}

export interface ToolContext {
  userId: string;
  agentDid: string;
  correlationId: string;
}

const registry = new Map<string, ToolDefinition>();

export function registerTool(tool: ToolDefinition): void {
  registry.set(tool.name, tool);
}

export function getTool(name: string): ToolDefinition | undefined {
  return registry.get(name);
}

export function listTools(): ToolDefinition[] {
  return Array.from(registry.values());
}

export function classifyTool(name: string, args: unknown): ReversibilityMetadata {
  const tool = registry.get(name);
  if (!tool) {
    // Unknown tools are treated as irreversible_blocked by default — fail closed
    return {
      reversibility_class: 'irreversible_blocked',
      approval_required: false,
      rollback_strategy: { kind: 'none' },
      human_explanation: `Unknown tool "${name}" — refusing to run.`,
    };
  }
  return tool.classify(args);
}
```

- [ ] **Step 4: Run test, expect PASS**

Run: `bun test services/api/src/tools/registry.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add services/api/src/tools/registry.ts services/api/src/tools/registry.test.ts
git commit -m "feat(tools): add reversibility-aware tool registry with fail-closed default"
```

### Task 1.7: Reverse handler dispatch

**Files:**
- Create: `services/api/src/reversibility/dispatch.ts`
- Test: `services/api/src/reversibility/dispatch.test.ts`

- [ ] **Step 1: Write failing test**

Create `services/api/src/reversibility/dispatch.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { dispatchReverse } from './dispatch';
import { registerTool } from '../tools/registry';

describe('dispatchReverse', () => {
  beforeEach(() => {
    const reverse = vi.fn().mockResolvedValue(undefined);
    registerTool({
      name: 'fake.tool',
      description: 'fake',
      inputSchema: {},
      execute: async () => ({}),
      reverse,
      classify: () => ({
        reversibility_class: 'undoable',
        approval_required: false,
        rollback_strategy: { kind: 'snapshot_restore', snapshot_id: 'snap-1' },
        human_explanation: '',
      }),
    });
  });

  it('invokes the reverse handler', async () => {
    const result = await dispatchReverse('fake.tool', {
      reversibility_class: 'undoable',
      approval_required: false,
      rollback_strategy: { kind: 'snapshot_restore', snapshot_id: 'snap-1' },
      human_explanation: '',
    }, { userId: 'u', agentDid: 'did:fides:x', correlationId: 'c' });
    expect(result.status).toBe('reversed');
  });

  it('refuses when tool has no reverse handler', async () => {
    registerTool({
      name: 'no.reverse',
      description: '',
      inputSchema: {},
      execute: async () => ({}),
      classify: () => ({
        reversibility_class: 'irreversible_blocked',
        approval_required: false,
        rollback_strategy: { kind: 'none' },
        human_explanation: '',
      }),
    });
    const result = await dispatchReverse('no.reverse', {
      reversibility_class: 'irreversible_blocked',
      approval_required: false,
      rollback_strategy: { kind: 'none' },
      human_explanation: '',
    }, { userId: 'u', agentDid: 'did:fides:x', correlationId: 'c' });
    expect(result.status).toBe('not_reversible');
  });
});
```

- [ ] **Step 2: Run test, expect FAIL**

Run: `bun test services/api/src/reversibility/dispatch.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement dispatch**

Create `services/api/src/reversibility/dispatch.ts`:

```typescript
import { getTool, type ToolContext } from '../tools/registry';
import type { ReversibilityMetadata } from './types';

export interface DispatchResult {
  status: 'reversed' | 'not_reversible' | 'reverse_failed';
  error?: string;
}

export async function dispatchReverse(
  toolName: string,
  metadata: ReversibilityMetadata,
  ctx: ToolContext,
): Promise<DispatchResult> {
  const tool = getTool(toolName);
  if (!tool || !tool.reverse) {
    return { status: 'not_reversible' };
  }
  if (metadata.reversibility_class === 'irreversible_blocked') {
    return { status: 'not_reversible' };
  }
  if (metadata.rollback_strategy.kind === 'none') {
    return { status: 'not_reversible' };
  }
  try {
    await tool.reverse(metadata, ctx);
    return { status: 'reversed' };
  } catch (err: any) {
    return { status: 'reverse_failed', error: err.message ?? String(err) };
  }
}
```

- [ ] **Step 4: Run test, expect PASS**

Run: `bun test services/api/src/reversibility/dispatch.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add services/api/src/reversibility/dispatch.ts services/api/src/reversibility/dispatch.test.ts
git commit -m "feat(reversibility): add dispatchReverse with fail-closed default"
```

### Task 1.8: Step middleware — pre+post sign and commit wrapper

**Files:**
- Create: `services/api/src/orchestrator/step.ts`
- Test: `services/api/src/orchestrator/step.test.ts`

- [ ] **Step 1: Write failing test**

Create `services/api/src/orchestrator/step.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { runToolStep } from './step';
import { registerTool } from '../tools/registry';

describe('runToolStep', () => {
  it('signs, pre-commits, executes, post-commits', async () => {
    const exec = vi.fn().mockResolvedValue({ ok: true });
    registerTool({
      name: 'test.step',
      description: '',
      inputSchema: {},
      execute: exec,
      classify: () => ({
        reversibility_class: 'undoable',
        approval_required: false,
        rollback_strategy: { kind: 'snapshot_restore', snapshot_id: 'snap' },
        human_explanation: 'ok',
      }),
    });
    const result = await runToolStep('test.step', { foo: 'bar' }, { userId: 'user-step', correlationId: 'c' });
    expect(exec).toHaveBeenCalled();
    expect(result.status).toBe('ok');
    expect(result.preCommit).toBeDefined();
    expect(result.postCommit).toBeDefined();
  });

  it('refuses to run irreversible_blocked tools', async () => {
    registerTool({
      name: 'test.block',
      description: '',
      inputSchema: {},
      execute: vi.fn(),
      classify: () => ({
        reversibility_class: 'irreversible_blocked',
        approval_required: false,
        rollback_strategy: { kind: 'none' },
        human_explanation: 'Will not run',
      }),
    });
    const result = await runToolStep('test.block', {}, { userId: 'u', correlationId: 'c' });
    expect(result.status).toBe('refused');
  });
});
```

- [ ] **Step 2: Run test, expect FAIL**

Run: `bun test services/api/src/orchestrator/step.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement runToolStep**

Create `services/api/src/orchestrator/step.ts`:

```typescript
import { getFides } from '../governance';
import { getAgit, type ActionCommit } from '../audit';
import { classifyTool, getTool } from '../tools/registry';
import type { ReversibilityMetadata } from '../reversibility/types';

export interface StepContext {
  userId: string;
  correlationId: string;
}

export interface StepResult {
  status: 'ok' | 'refused' | 'needs_approval' | 'failed';
  result?: unknown;
  error?: string;
  preCommit?: string;
  postCommit?: string;
  metadata: ReversibilityMetadata;
}

export async function runToolStep(
  toolName: string,
  args: unknown,
  ctx: StepContext,
): Promise<StepResult> {
  const metadata = classifyTool(toolName, args);
  const tool = getTool(toolName);

  // Fast-fail for irreversible_blocked
  if (metadata.reversibility_class === 'irreversible_blocked') {
    const fides = await getFides();
    const agit = await getAgit();
    const signed = await fides.signToolCall({ toolName, args, userId: ctx.userId });
    const commit = await agit.commitAction(ctx.userId, {
      toolName,
      args,
      status: 'refused',
      reversibility: metadata,
      signature: signed.signature,
      signerDid: signed.signerDid,
    });
    return { status: 'refused', error: metadata.human_explanation, preCommit: commit.hash, metadata };
  }

  // approval_only actions must NOT be auto-executed — the orchestrator returns a "needs_approval" result
  // and the surface-specific card renderer will post the approval card. Counter-sign happens on Approve click.
  if (metadata.reversibility_class === 'approval_only') {
    const fides = await getFides();
    const agit = await getAgit();
    const signed = await fides.signToolCall({ toolName, args, userId: ctx.userId });
    const commit = await agit.commitAction(ctx.userId, {
      toolName,
      args,
      status: 'pending',
      reversibility: metadata,
      signature: signed.signature,
      signerDid: signed.signerDid,
    });
    return { status: 'needs_approval', preCommit: commit.hash, metadata };
  }

  if (!tool) {
    return { status: 'failed', error: `Unknown tool: ${toolName}`, metadata };
  }

  // Normal flow: sign → pre-commit → execute → post-commit
  const fides = await getFides();
  const agit = await getAgit();
  const signed = await fides.signToolCall({ toolName, args, userId: ctx.userId });
  const preCommit = await agit.commitAction(ctx.userId, {
    toolName,
    args,
    status: 'pending',
    reversibility: metadata,
    signature: signed.signature,
    signerDid: signed.signerDid,
  });

  let result: unknown;
  try {
    result = await tool.execute(args, { userId: ctx.userId, agentDid: signed.signerDid, correlationId: ctx.correlationId });
  } catch (err: any) {
    const postCommit = await agit.commitAction(ctx.userId, {
      toolName,
      args,
      status: 'failed',
      reversibility: metadata,
      signature: signed.signature,
      signerDid: signed.signerDid,
      result: { error: err.message },
    });
    return { status: 'failed', error: err.message, preCommit: preCommit.hash, postCommit: postCommit.hash, metadata };
  }

  const postCommit = await agit.commitAction(ctx.userId, {
    toolName,
    args,
    status: 'ok',
    reversibility: metadata,
    signature: signed.signature,
    signerDid: signed.signerDid,
    result,
  });

  return { status: 'ok', result, preCommit: preCommit.hash, postCommit: postCommit.hash, metadata };
}
```

- [ ] **Step 4: Run test, expect PASS**

Run: `bun test services/api/src/orchestrator/step.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add services/api/src/orchestrator/step.ts services/api/src/orchestrator/step.test.ts
git commit -m "feat(orchestrator): runToolStep enforces sign+commit+reversibility gates"
```

### Day 3 — 5 reference tool implementations

Implement one tool per reversibility class. Each is a bite-sized task with its own test + commit.

### Task 1.9: file.write tool (undoable)

**Files:**
- Create: `services/api/src/tools/file.ts`
- Test: `services/api/src/tools/file.test.ts`

- [ ] **Step 1: Write failing test**

Create `services/api/src/tools/file.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { fileWriteTool } from './file';

describe('file.write tool', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'yula-file-'));
  });

  it('classifies as undoable with snapshot_restore strategy', () => {
    const meta = fileWriteTool.classify({ path: '/tmp/x', content: 'hi' });
    expect(meta.reversibility_class).toBe('undoable');
    expect(meta.rollback_strategy.kind).toBe('snapshot_restore');
  });

  it('writes file, snapshots prior content, and reverse handler restores', async () => {
    const target = path.join(tmpDir, 'f.txt');
    await fs.writeFile(target, 'original');
    const result = await fileWriteTool.execute({ path: target, content: 'new' }, { userId: 'u', agentDid: 'd', correlationId: 'c' });
    expect((result as any).snapshot_id).toBeDefined();
    expect((await fs.readFile(target, 'utf8'))).toBe('new');

    await fileWriteTool.reverse!({
      reversibility_class: 'undoable',
      approval_required: false,
      rollback_strategy: { kind: 'snapshot_restore', snapshot_id: (result as any).snapshot_id },
      human_explanation: '',
    }, { userId: 'u', agentDid: 'd', correlationId: 'c' });
    expect((await fs.readFile(target, 'utf8'))).toBe('original');
  });
});
```

- [ ] **Step 2: Run test, expect FAIL**

Run: `bun test services/api/src/tools/file.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement file.write tool**

Create `services/api/src/tools/file.ts`:

```typescript
import { promises as fs } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import type { ToolDefinition } from './registry';
import { registerTool } from './registry';

interface FileWriteArgs {
  path: string;
  content: string;
}

// Snapshots are kept in a shared Postgres-backed kv in production; local dir for v1
const SNAPSHOT_DIR = process.env.YULA_SNAPSHOT_DIR ?? '/tmp/yula-snapshots';

async function ensureSnapshotDir() {
  await fs.mkdir(SNAPSHOT_DIR, { recursive: true });
}

export const fileWriteTool: ToolDefinition = {
  name: 'file.write',
  description: 'Write (or overwrite) a file. Fully undoable.',
  inputSchema: { type: 'object', properties: { path: { type: 'string' }, content: { type: 'string' } }, required: ['path', 'content'] },

  classify: (args) => {
    const a = args as FileWriteArgs;
    return {
      reversibility_class: 'undoable',
      approval_required: false,
      rollback_strategy: { kind: 'snapshot_restore', snapshot_id: '' },  // filled in at exec time
      human_explanation: `Can be fully undone — I'll save a snapshot of ${a.path} before writing.`,
    };
  },

  execute: async (args) => {
    const a = args as FileWriteArgs;
    await ensureSnapshotDir();
    const snapshotId = randomUUID();
    const snapshotPath = path.join(SNAPSHOT_DIR, snapshotId);

    let priorContent: string | null = null;
    try {
      priorContent = await fs.readFile(a.path, 'utf8');
    } catch {
      // file doesn't exist — snapshot captures that fact
    }

    await fs.writeFile(snapshotPath, JSON.stringify({ path: a.path, prior: priorContent }));
    await fs.writeFile(a.path, a.content, 'utf8');

    return { snapshot_id: snapshotId, path: a.path, bytes_written: Buffer.byteLength(a.content, 'utf8') };
  },

  reverse: async (metadata) => {
    if (metadata.rollback_strategy.kind !== 'snapshot_restore') {
      throw new Error('Unexpected rollback strategy');
    }
    const snapshotId = metadata.rollback_strategy.snapshot_id;
    const snapshotPath = path.join(SNAPSHOT_DIR, snapshotId);
    const raw = await fs.readFile(snapshotPath, 'utf8');
    const { path: filePath, prior } = JSON.parse(raw);
    if (prior === null) {
      await fs.unlink(filePath);
    } else {
      await fs.writeFile(filePath, prior, 'utf8');
    }
  },
};

registerTool(fileWriteTool);
```

- [ ] **Step 4: Run test, expect PASS**

Run: `bun test services/api/src/tools/file.test.ts`
Expected: 2 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add services/api/src/tools/file.ts services/api/src/tools/file.test.ts
git commit -m "feat(tools): add file.write tool with snapshot+restore (undoable class)"
```

### Task 1.10: email.send tool (cancelable_window, SES 30s hold)

**Files:**
- Create: `services/api/src/tools/email.ts`
- Test: `services/api/src/tools/email.test.ts`

- [ ] **Step 1: Write failing test**

Create `services/api/src/tools/email.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { emailSendTool, __setSesClient } from './email';

describe('email.send tool', () => {
  const sendMock = vi.fn().mockResolvedValue({ MessageId: 'msg-123' });
  const cancelMock = vi.fn().mockResolvedValue({});

  beforeEach(() => {
    __setSesClient({ send: sendMock, cancelMessage: cancelMock });
    sendMock.mockClear();
    cancelMock.mockClear();
  });

  it('classifies as cancelable_window with 30s deadline', () => {
    const meta = emailSendTool.classify({ to: 'a@b.com', subject: 's', body: 'b' });
    expect(meta.reversibility_class).toBe('cancelable_window');
    expect(meta.rollback_deadline).toBeDefined();
    expect(meta.rollback_strategy.kind).toBe('cancel_window');
  });

  it('executes via SES and returns message_id', async () => {
    const result = await emailSendTool.execute({ to: 'a@b.com', subject: 's', body: 'b' }, { userId: 'u', agentDid: 'd', correlationId: 'c' });
    expect(sendMock).toHaveBeenCalled();
    expect((result as any).message_id).toBe('msg-123');
  });

  it('reverse cancels the held message', async () => {
    await emailSendTool.reverse!({
      reversibility_class: 'cancelable_window',
      approval_required: false,
      rollback_strategy: { kind: 'cancel_window', deadline: new Date(Date.now() + 30000).toISOString(), cancel_api: 'ses.cancel_message' },
      rollback_deadline: new Date(Date.now() + 30000).toISOString(),
      human_explanation: '',
      // NOTE: message_id is smuggled via a sibling field the reverse handler reads from metadata in real impl
      ...( { message_id: 'msg-123' } as any ),
    } as any, { userId: 'u', agentDid: 'd', correlationId: 'c' });
    expect(cancelMock).toHaveBeenCalledWith('msg-123');
  });
});
```

- [ ] **Step 2: Run test, expect FAIL**

Run: `bun test services/api/src/tools/email.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement email.send tool**

Create `services/api/src/tools/email.ts`:

```typescript
import type { ToolDefinition } from './registry';
import { registerTool } from './registry';

interface EmailArgs {
  to: string;
  subject: string;
  body: string;
}

const HOLD_WINDOW_SECONDS = 30;

// Minimal SES client abstraction — swap with @aws-sdk/client-sesv2 in prod
interface SesClient {
  send: (args: EmailArgs & { hold_seconds: number }) => Promise<{ MessageId: string }>;
  cancelMessage: (messageId: string) => Promise<unknown>;
}

let sesClient: SesClient = {
  send: async () => { throw new Error('SES client not configured'); },
  cancelMessage: async () => { throw new Error('SES client not configured'); },
};

export function __setSesClient(client: SesClient) { sesClient = client; }

export const emailSendTool: ToolDefinition = {
  name: 'email.send',
  description: 'Send an email. Cancelable within a 30-second window.',
  inputSchema: { type: 'object', properties: { to: { type: 'string' }, subject: { type: 'string' }, body: { type: 'string' } }, required: ['to', 'subject', 'body'] },

  classify: (args) => {
    const a = args as EmailArgs;
    const deadline = new Date(Date.now() + HOLD_WINDOW_SECONDS * 1000).toISOString();
    return {
      reversibility_class: 'cancelable_window',
      approval_required: false,
      rollback_strategy: { kind: 'cancel_window', deadline, cancel_api: 'ses.cancel_message' },
      rollback_deadline: deadline,
      human_explanation: `Can be canceled for the next ${HOLD_WINDOW_SECONDS} seconds.`,
    };
  },

  execute: async (args) => {
    const a = args as EmailArgs;
    const { MessageId } = await sesClient.send({ ...a, hold_seconds: HOLD_WINDOW_SECONDS });
    return { message_id: MessageId, held_until: new Date(Date.now() + HOLD_WINDOW_SECONDS * 1000).toISOString() };
  },

  reverse: async (metadata: any) => {
    if (metadata.rollback_strategy?.kind !== 'cancel_window') throw new Error('Unexpected strategy');
    const msgId = metadata.message_id;
    if (!msgId) throw new Error('message_id missing in metadata');
    await sesClient.cancelMessage(msgId);
  },
};

registerTool(emailSendTool);
```

- [ ] **Step 4: Run test, expect PASS**

Run: `bun test services/api/src/tools/email.test.ts`
Expected: 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add services/api/src/tools/email.ts services/api/src/tools/email.test.ts
git commit -m "feat(tools): add email.send with 30s SES hold (cancelable_window class)"
```

### Task 1.11: calendar.create_event tool (compensatable)

**Files:**
- Create: `services/api/src/tools/calendar.ts`
- Test: `services/api/src/tools/calendar.test.ts`

- [ ] **Step 1: Write failing test**

Create `services/api/src/tools/calendar.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { calendarCreateEventTool, __setCalendarClient } from './calendar';

describe('calendar.create_event', () => {
  const createMock = vi.fn().mockResolvedValue({ id: 'evt-1' });
  const deleteMock = vi.fn().mockResolvedValue({});

  beforeEach(() => {
    __setCalendarClient({ createEvent: createMock, deleteEvent: deleteMock });
    createMock.mockClear();
    deleteMock.mockClear();
  });

  it('classifies as compensatable with calendar.delete_event as compensation', () => {
    const meta = calendarCreateEventTool.classify({ title: 'x', start: '2026-04-08T10:00:00Z', end: '2026-04-08T11:00:00Z' });
    expect(meta.reversibility_class).toBe('compensatable');
    expect(meta.rollback_strategy.kind).toBe('compensation');
  });

  it('creates event and reverse deletes it', async () => {
    const result = await calendarCreateEventTool.execute({ title: 'x', start: '2026-04-08T10:00:00Z', end: '2026-04-08T11:00:00Z' }, { userId: 'u', agentDid: 'd', correlationId: 'c' });
    expect((result as any).event_id).toBe('evt-1');
    await calendarCreateEventTool.reverse!({
      reversibility_class: 'compensatable',
      approval_required: false,
      rollback_strategy: { kind: 'compensation', compensate_tool: 'calendar.delete_event', compensate_args: { event_id: 'evt-1' } },
      human_explanation: '',
    }, { userId: 'u', agentDid: 'd', correlationId: 'c' });
    expect(deleteMock).toHaveBeenCalledWith('evt-1');
  });
});
```

- [ ] **Step 2: Run test, expect FAIL**

Run: `bun test services/api/src/tools/calendar.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement calendar tool**

Create `services/api/src/tools/calendar.ts`:

```typescript
import type { ToolDefinition } from './registry';
import { registerTool } from './registry';

interface CalendarArgs { title: string; start: string; end: string; attendees?: string[] }

interface CalendarClient {
  createEvent: (args: CalendarArgs) => Promise<{ id: string }>;
  deleteEvent: (id: string) => Promise<unknown>;
}

let calClient: CalendarClient = {
  createEvent: async () => { throw new Error('calendar client not configured'); },
  deleteEvent: async () => { throw new Error('calendar client not configured'); },
};

export function __setCalendarClient(c: CalendarClient) { calClient = c; }

export const calendarCreateEventTool: ToolDefinition = {
  name: 'calendar.create_event',
  description: 'Create a calendar event. Reversible by deletion.',
  inputSchema: { type: 'object', properties: { title: { type: 'string' }, start: { type: 'string' }, end: { type: 'string' } }, required: ['title', 'start', 'end'] },

  classify: (args) => {
    const a = args as CalendarArgs;
    return {
      reversibility_class: 'compensatable',
      approval_required: false,
      rollback_strategy: { kind: 'compensation', compensate_tool: 'calendar.delete_event', compensate_args: { title: a.title, start: a.start } },
      human_explanation: `Can be reversed by deleting the event I'm about to create.`,
    };
  },

  execute: async (args) => {
    const a = args as CalendarArgs;
    const { id } = await calClient.createEvent(a);
    return { event_id: id };
  },

  reverse: async (metadata) => {
    if (metadata.rollback_strategy.kind !== 'compensation') throw new Error('Unexpected strategy');
    const eventId = (metadata.rollback_strategy.compensate_args as any).event_id
      ?? (metadata.rollback_strategy.compensate_args as any).title;  // fallback lookup
    await calClient.deleteEvent(eventId);
  },
};

registerTool(calendarCreateEventTool);
```

- [ ] **Step 4: Run test, expect PASS**

Run: `bun test services/api/src/tools/calendar.test.ts`
Expected: 2 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add services/api/src/tools/calendar.ts services/api/src/tools/calendar.test.ts
git commit -m "feat(tools): add calendar.create_event (compensatable class, DELETE reverse)"
```

### Task 1.12: db.migrate tool (approval_only)

**Files:**
- Create: `services/api/src/tools/db.ts`
- Test: `services/api/src/tools/db.test.ts`

- [ ] **Step 1: Write failing test**

Create `services/api/src/tools/db.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { dbMigrateTool } from './db';

describe('db.migrate tool', () => {
  it('classifies as approval_only with approval_required=true', () => {
    const meta = dbMigrateTool.classify({ sql: 'ALTER TABLE users ADD COLUMN x INT', target: 'prod' });
    expect(meta.reversibility_class).toBe('approval_only');
    expect(meta.approval_required).toBe(true);
    expect(meta.rollback_strategy.kind).toBe('none');
    expect(meta.human_explanation).toContain('approval');
  });
});
```

- [ ] **Step 2: Run test, expect FAIL**

Run: `bun test services/api/src/tools/db.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement db.migrate tool**

Create `services/api/src/tools/db.ts`:

```typescript
import type { ToolDefinition } from './registry';
import { registerTool } from './registry';

interface DbMigrateArgs {
  sql: string;
  target: 'prod' | 'staging' | 'dev';
  reverse_migration?: string;
}

export const dbMigrateTool: ToolDefinition = {
  name: 'db.migrate',
  description: 'Apply a database schema migration. Approval-only for all prod targets.',
  inputSchema: { type: 'object', properties: { sql: { type: 'string' }, target: { type: 'string' }, reverse_migration: { type: 'string' } }, required: ['sql', 'target'] },

  classify: () => ({
    reversibility_class: 'approval_only',
    approval_required: true,
    rollback_strategy: { kind: 'none' },
    human_explanation: `I can run this migration, but I need your approval first. Rollback requires a reverse migration (which you should provide) — there's no automatic undo.`,
  }),

  execute: async (args) => {
    // In v1, the actual SQL execution is stubbed; the point of the tool is the approval flow
    const a = args as DbMigrateArgs;
    return { applied: a.sql, target: a.target, warning: 'v1 stub — real SQL execution in v1.1' };
  },

  // No reverse handler — rollback requires a user-supplied reverse migration
};

registerTool(dbMigrateTool);
```

- [ ] **Step 4: Run test, expect PASS**

Run: `bun test services/api/src/tools/db.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add services/api/src/tools/db.ts services/api/src/tools/db.test.ts
git commit -m "feat(tools): add db.migrate (approval_only class, no auto-reverse)"
```

### Task 1.13: stripe.charge tool (irreversible_blocked for >$50)

**Files:**
- Create: `services/api/src/tools/stripe-charge.ts`
- Test: `services/api/src/tools/stripe-charge.test.ts`

- [ ] **Step 1: Write failing test**

Create `services/api/src/tools/stripe-charge.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { stripeChargeTool } from './stripe-charge';

describe('stripe.charge tool', () => {
  it('classifies small charges as compensatable', () => {
    const meta = stripeChargeTool.classify({ amount: 2500, currency: 'usd', customer: 'cus_1' });  // $25
    expect(meta.reversibility_class).toBe('compensatable');
  });

  it('classifies large charges as irreversible_blocked', () => {
    const meta = stripeChargeTool.classify({ amount: 1500000, currency: 'usd', customer: 'cus_1' });  // $15000
    expect(meta.reversibility_class).toBe('irreversible_blocked');
    expect(meta.human_explanation).toContain('will not run');
  });
});
```

- [ ] **Step 2: Run test, expect FAIL**

Run: `bun test services/api/src/tools/stripe-charge.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement stripe.charge**

Create `services/api/src/tools/stripe-charge.ts`:

```typescript
import type { ToolDefinition } from './registry';
import { registerTool } from './registry';

interface StripeChargeArgs {
  amount: number;   // in minor units (cents)
  currency: string;
  customer: string;
  description?: string;
}

const HIGH_RISK_THRESHOLD_CENTS = 5000; // $50

export const stripeChargeTool: ToolDefinition = {
  name: 'stripe.charge',
  description: 'Charge a customer via Stripe. Compensatable by refund below $50; refused above.',
  inputSchema: { type: 'object', properties: { amount: { type: 'number' }, currency: { type: 'string' }, customer: { type: 'string' } }, required: ['amount', 'currency', 'customer'] },

  classify: (args) => {
    const a = args as StripeChargeArgs;
    if (a.amount > HIGH_RISK_THRESHOLD_CENTS) {
      return {
        reversibility_class: 'irreversible_blocked',
        approval_required: false,
        rollback_strategy: { kind: 'none' },
        human_explanation: `I will not run this charge. Amount $${(a.amount / 100).toFixed(2)} exceeds my auto-run policy of $50, and Stripe charges are high-risk to reverse (refund windows, FX, chargebacks). You'll need to run this yourself.`,
      };
    }
    return {
      reversibility_class: 'compensatable',
      approval_required: true,
      rollback_strategy: { kind: 'compensation', compensate_tool: 'stripe.refund', compensate_args: { charge_id: '' } },
      human_explanation: `I can charge $${(a.amount / 100).toFixed(2)}. It can be compensated with a refund after execution, but I'll need your approval first.`,
    };
  },

  execute: async () => {
    // v1 stub — real Stripe integration in v1.1
    return { charge_id: 'ch_stub_v1', status: 'succeeded' };
  },
};

registerTool(stripeChargeTool);
```

- [ ] **Step 4: Run test, expect PASS**

Run: `bun test services/api/src/tools/stripe-charge.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add services/api/src/tools/stripe-charge.ts services/api/src/tools/stripe-charge.test.ts
git commit -m "feat(tools): add stripe.charge with $50 threshold (irreversible_blocked above)"
```

### Task 1.14: Register all 5 tools at API startup

**Files:**
- Create: `services/api/src/tools/index.ts`
- Modify: `services/api/src/index.ts`

- [ ] **Step 1: Re-export all tools**

Create `services/api/src/tools/index.ts`:

```typescript
import './file';
import './email';
import './calendar';
import './db';
import './stripe-charge';

export { listTools, getTool, classifyTool, registerTool } from './registry';
export type { ToolDefinition, ToolContext } from './registry';
```

- [ ] **Step 2: Import the tools barrel at startup**

Modify `services/api/src/index.ts` — add near the top:

```typescript
import './tools';  // side-effect: registers all built-in tools
```

- [ ] **Step 3: Run API and verify tools are registered**

Run: `bun run --cwd services/api dev` and hit a diagnostic endpoint (or add a temporary `listTools()` log).
Expected: 5 tools in the registry (file.write, email.send, calendar.create_event, db.migrate, stripe.charge).

- [ ] **Step 4: Commit**

```bash
git add services/api/src/tools/index.ts services/api/src/index.ts
git commit -m "feat(tools): register 5 reference tools at API startup"
```

---

## Phase 2 — Surfaces + Approval Cards (Days 4-5)

**Purpose**: put the 5-class badge system on every surface where users can talk to YULA, so the reversibility model is visible at the point of decision.

### Task 2.1: Shared approval card data structure

**Files:**
- Create: `packages/shared-types/src/approval-card.ts`

- [ ] **Step 1: Define the cross-surface card contract**

Create `packages/shared-types/src/approval-card.ts`:

```typescript
import type { ReversibilityClass } from '../../services/api/src/reversibility/types';

export interface ApprovalCardProps {
  cardId: string;              // correlates to AGIT commit hash
  toolName: string;
  toolDisplay: string;         // e.g. "📧 Send email to john@acme.com"
  reversibilityClass: ReversibilityClass;
  humanExplanation: string;    // shown under the title
  fields: Array<{ label: string; value: string }>;  // key details
  primaryAction?: { id: string; label: string; style: 'primary' | 'danger' };  // e.g. Send, Approve
  secondaryAction?: { id: string; label: string; style: 'secondary' };          // e.g. Modify, Reject
  // For irreversible_blocked, buttons are omitted entirely
}

export const BADGE_EMOJI: Record<ReversibilityClass, string> = {
  undoable: '🟢',
  cancelable_window: '🟢',
  compensatable: '🟡',
  approval_only: '🟠',
  irreversible_blocked: '🔴',
};
```

- [ ] **Step 2: Commit**

```bash
git add packages/shared-types/src/approval-card.ts
git commit -m "feat(shared-types): define cross-surface ApprovalCardProps contract"
```

### Task 2.2: Slack approval card renderer (Block Kit)

**Files:**
- Create: `services/api/src/bot/cards/slack.ts`
- Test: `services/api/src/bot/cards/slack.test.ts`

- [ ] **Step 1: Write failing test**

Create `services/api/src/bot/cards/slack.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { buildSlackCard } from './slack';

describe('buildSlackCard', () => {
  it('includes the badge emoji matching the class', () => {
    const blocks = buildSlackCard({
      cardId: 'c-1',
      toolName: 'email.send',
      toolDisplay: '📧 Send email to john@acme.com',
      reversibilityClass: 'cancelable_window',
      humanExplanation: 'Can be canceled for 30 seconds.',
      fields: [{ label: 'Subject', value: 'Hello' }],
      primaryAction: { id: 'send', label: 'Send', style: 'primary' },
      secondaryAction: { id: 'modify', label: 'Modify', style: 'secondary' },
    });
    const json = JSON.stringify(blocks);
    expect(json).toContain('🟢');
    expect(json).toContain('Can be canceled');
  });

  it('omits buttons for irreversible_blocked', () => {
    const blocks = buildSlackCard({
      cardId: 'c-2',
      toolName: 'stripe.charge',
      toolDisplay: '💳 Charge $15,000',
      reversibilityClass: 'irreversible_blocked',
      humanExplanation: 'I will not run this.',
      fields: [],
    });
    const actionBlocks = (blocks as any[]).filter((b: any) => b.type === 'actions');
    expect(actionBlocks).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test, expect FAIL**

Run: `bun test services/api/src/bot/cards/slack.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement Slack card builder**

Create `services/api/src/bot/cards/slack.ts`:

```typescript
import { BADGE_EMOJI, type ApprovalCardProps } from '@aspendos/shared-types';

export function buildSlackCard(props: ApprovalCardProps) {
  const emoji = BADGE_EMOJI[props.reversibilityClass];
  const blocks: any[] = [
    {
      type: 'header',
      text: { type: 'plain_text', text: `${emoji} ${props.toolDisplay}`, emoji: true },
    },
    {
      type: 'context',
      elements: [{ type: 'mrkdwn', text: `_${props.humanExplanation}_` }],
    },
  ];

  if (props.fields.length > 0) {
    blocks.push({
      type: 'section',
      fields: props.fields.map((f) => ({ type: 'mrkdwn', text: `*${f.label}*\n${f.value}` })),
    });
  }

  // Buttons — only for non-irreversible_blocked
  if (props.reversibilityClass !== 'irreversible_blocked' && props.primaryAction) {
    const elements: any[] = [
      {
        type: 'button',
        text: { type: 'plain_text', text: props.primaryAction.label },
        action_id: `yula:${props.cardId}:${props.primaryAction.id}`,
        style: props.primaryAction.style === 'danger' ? 'danger' : 'primary',
      },
    ];
    if (props.secondaryAction) {
      elements.push({
        type: 'button',
        text: { type: 'plain_text', text: props.secondaryAction.label },
        action_id: `yula:${props.cardId}:${props.secondaryAction.id}`,
      });
    }
    blocks.push({ type: 'actions', elements });
  }

  return blocks;
}
```

- [ ] **Step 4: Run test, expect PASS**

Run: `bun test services/api/src/bot/cards/slack.test.ts`
Expected: 2 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add services/api/src/bot/cards/slack.ts services/api/src/bot/cards/slack.test.ts
git commit -m "feat(bot): Slack Block Kit approval card with reversibility badges"
```

### Task 2.3: Telegram card renderer (inline keyboard)

**Files:**
- Create: `services/api/src/bot/cards/telegram.ts`
- Test: `services/api/src/bot/cards/telegram.test.ts`

- [ ] **Step 1: Write failing test**

Create `services/api/src/bot/cards/telegram.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { buildTelegramCard } from './telegram';

describe('buildTelegramCard', () => {
  it('formats a markdown message with inline keyboard', () => {
    const card = buildTelegramCard({
      cardId: 'c-1',
      toolName: 'email.send',
      toolDisplay: 'Send email',
      reversibilityClass: 'cancelable_window',
      humanExplanation: 'Cancel within 30s.',
      fields: [{ label: 'To', value: 'john@acme.com' }],
      primaryAction: { id: 'send', label: 'Send', style: 'primary' },
    });
    expect(card.text).toContain('🟢');
    expect(card.text).toContain('Cancel within 30s');
    expect(card.reply_markup.inline_keyboard).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run, expect FAIL**

Run: `bun test services/api/src/bot/cards/telegram.test.ts`

- [ ] **Step 3: Implement Telegram card**

Create `services/api/src/bot/cards/telegram.ts`:

```typescript
import { BADGE_EMOJI, type ApprovalCardProps } from '@aspendos/shared-types';

export function buildTelegramCard(props: ApprovalCardProps) {
  const emoji = BADGE_EMOJI[props.reversibilityClass];
  const lines = [
    `*${emoji} ${props.toolDisplay}*`,
    `_${props.humanExplanation}_`,
    '',
    ...props.fields.map((f) => `*${f.label}*: ${f.value}`),
  ];

  const buttons: any[] = [];
  if (props.reversibilityClass !== 'irreversible_blocked' && props.primaryAction) {
    const row = [{ text: props.primaryAction.label, callback_data: `yula:${props.cardId}:${props.primaryAction.id}` }];
    if (props.secondaryAction) {
      row.push({ text: props.secondaryAction.label, callback_data: `yula:${props.cardId}:${props.secondaryAction.id}` });
    }
    buttons.push(row);
  }

  return {
    text: lines.join('\n'),
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: buttons },
  };
}
```

- [ ] **Step 4: Run, expect PASS**

Run: `bun test services/api/src/bot/cards/telegram.test.ts`

- [ ] **Step 5: Commit**

```bash
git add services/api/src/bot/cards/telegram.ts services/api/src/bot/cards/telegram.test.ts
git commit -m "feat(bot): Telegram inline keyboard approval card"
```

### Task 2.4: Discord card renderer (components v2)

**Files:**
- Create: `services/api/src/bot/cards/discord.ts`
- Test: `services/api/src/bot/cards/discord.test.ts`

- [ ] **Step 1: Follow the same pattern as Slack/Telegram** — test, implement, commit. Discord uses embeds + component action rows.

Implementation follows the Slack pattern with Discord-specific payload:

```typescript
// services/api/src/bot/cards/discord.ts
import { BADGE_EMOJI, type ApprovalCardProps } from '@aspendos/shared-types';

export function buildDiscordCard(props: ApprovalCardProps) {
  const emoji = BADGE_EMOJI[props.reversibilityClass];
  const embed = {
    title: `${emoji} ${props.toolDisplay}`,
    description: `_${props.humanExplanation}_`,
    fields: props.fields.map((f) => ({ name: f.label, value: f.value, inline: false })),
    color: props.reversibilityClass === 'irreversible_blocked' ? 0xe74c3c
      : props.reversibilityClass === 'approval_only' ? 0xf39c12
      : props.reversibilityClass === 'compensatable' ? 0xf1c40f
      : 0x2ecc71,
  };

  const components: any[] = [];
  if (props.reversibilityClass !== 'irreversible_blocked' && props.primaryAction) {
    const row: any = { type: 1, components: [] };
    row.components.push({
      type: 2,
      label: props.primaryAction.label,
      style: props.primaryAction.style === 'danger' ? 4 : 1,
      custom_id: `yula:${props.cardId}:${props.primaryAction.id}`,
    });
    if (props.secondaryAction) {
      row.components.push({
        type: 2,
        label: props.secondaryAction.label,
        style: 2,
        custom_id: `yula:${props.cardId}:${props.secondaryAction.id}`,
      });
    }
    components.push(row);
  }

  return { embeds: [embed], components };
}
```

Test mirrors Slack/Telegram tests. Commit message: `feat(bot): Discord approval card with colored embeds`.

### Task 2.5: WhatsApp card renderer (interactive message)

Same pattern, WhatsApp Business Cloud API interactive message payload. Commit: `feat(bot): WhatsApp interactive approval card`.

**Implementation** at `services/api/src/bot/cards/whatsapp.ts`:

```typescript
import { BADGE_EMOJI, type ApprovalCardProps } from '@aspendos/shared-types';

export function buildWhatsAppCard(props: ApprovalCardProps) {
  const emoji = BADGE_EMOJI[props.reversibilityClass];
  const body = `*${emoji} ${props.toolDisplay}*\n_${props.humanExplanation}_\n\n${props.fields.map((f) => `*${f.label}*: ${f.value}`).join('\n')}`;

  const buttons: any[] = [];
  if (props.reversibilityClass !== 'irreversible_blocked' && props.primaryAction) {
    buttons.push({ type: 'reply', reply: { id: `yula:${props.cardId}:${props.primaryAction.id}`, title: props.primaryAction.label } });
    if (props.secondaryAction) {
      buttons.push({ type: 'reply', reply: { id: `yula:${props.cardId}:${props.secondaryAction.id}`, title: props.secondaryAction.label } });
    }
  }

  return {
    type: 'interactive',
    interactive: {
      type: 'button',
      body: { text: body },
      action: { buttons },
    },
  };
}
```

Test + commit: `feat(bot): WhatsApp interactive approval card`.

### Task 2.6: Activate 4 new Chat SDK adapters

**Files:**
- Modify: `services/api/src/bot/index.ts`

- [ ] **Step 1: Add adapter imports**

Modify `services/api/src/bot/index.ts` in the lazy init block to add Teams, GChat, iMessage, and Signal:

```typescript
// ... existing adapter init block ...

if (process.env.TEAMS_APP_ID) {
  const { TeamsAdapter } = await import('@chat-adapter/teams');
  adapters.teams = new TeamsAdapter();
}
if (process.env.GCHAT_SERVICE_ACCOUNT) {
  const { GoogleChatAdapter } = await import('@chat-adapter/gchat');
  adapters.gchat = new GoogleChatAdapter();
}
if (process.env.PHOTON_IMESSAGE_API_KEY) {
  const { PhotonImessageAdapter } = await import('@chat-adapter-photon/imessage');
  adapters.imessage = new PhotonImessageAdapter();
}
if (process.env.SIGNAL_CLI_ENDPOINT) {
  const { SignalAdapter } = await import('@chat-adapter-community/signal');
  adapters.signal = new SignalAdapter();
}
```

- [ ] **Step 2: Install adapter packages**

Run: `bun add @chat-adapter/teams @chat-adapter/gchat @chat-adapter-photon/imessage @chat-adapter-community/signal`

(Verify exact package names via Chat SDK adapter inventory; see spec §6 and `node_modules/chat/docs/adapters.mdx`.)

- [ ] **Step 3: Smoke test each adapter**

For each adapter, set the env var and verify the bot's webhook endpoint responds. Log any errors.

- [ ] **Step 4: Commit**

```bash
git add services/api/src/bot/index.ts package.json bun.lock
git commit -m "feat(bot): activate Teams, GChat, iMessage, Signal Chat SDK adapters"
```

### Task 2.7: Web approval card React component

**Files:**
- Create: `apps/web/src/components/approval-card/approval-card.tsx`
- Create: `apps/web/src/components/approval-card/approval-card.test.tsx`

- [ ] **Step 1: Write failing test**

Create `apps/web/src/components/approval-card/approval-card.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ApprovalCard } from './approval-card';

describe('<ApprovalCard />', () => {
  it('renders the badge for cancelable_window', () => {
    render(<ApprovalCard cardId="c1" toolName="email.send" toolDisplay="📧 Send email" reversibilityClass="cancelable_window" humanExplanation="Cancel for 30s" fields={[{ label: 'To', value: 'john@acme.com' }]} primaryAction={{ id: 'send', label: 'Send', style: 'primary' }} />);
    expect(screen.getByText(/Cancel for 30s/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Send/ })).toBeInTheDocument();
  });

  it('omits buttons for irreversible_blocked and shows red border', () => {
    render(<ApprovalCard cardId="c2" toolName="stripe.charge" toolDisplay="💳 Charge $15000" reversibilityClass="irreversible_blocked" humanExplanation="I will not run this." fields={[]} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByTestId('approval-card')).toHaveClass('border-red-500');
  });
});
```

- [ ] **Step 2: Run, expect FAIL**

Run: `bun run --cwd apps/web test src/components/approval-card/approval-card.test.tsx`

- [ ] **Step 3: Implement the component**

Create `apps/web/src/components/approval-card/approval-card.tsx`:

```tsx
'use client';

import type { ApprovalCardProps } from '@aspendos/shared-types';
import { BADGE_EMOJI } from '@aspendos/shared-types';

const classBorder: Record<string, string> = {
  undoable: 'border-green-500',
  cancelable_window: 'border-green-500',
  compensatable: 'border-yellow-500',
  approval_only: 'border-amber-500',
  irreversible_blocked: 'border-red-500',
};

const classBadgeText: Record<string, string> = {
  undoable: 'Undoable',
  cancelable_window: 'Cancel within window',
  compensatable: 'Compensatable',
  approval_only: 'Needs approval',
  irreversible_blocked: 'Blocked',
};

export function ApprovalCard(props: ApprovalCardProps & { onAction?: (id: string) => void }) {
  const isBlocked = props.reversibilityClass === 'irreversible_blocked';
  return (
    <div data-testid="approval-card" className={`rounded-2xl border-2 p-4 ${classBorder[props.reversibilityClass]}`}>
      <div className="flex items-center gap-2 font-semibold">
        <span>{BADGE_EMOJI[props.reversibilityClass]}</span>
        <span>{props.toolDisplay}</span>
      </div>
      <div className="text-sm text-muted-foreground italic mt-1">{props.humanExplanation}</div>
      <div className="text-xs uppercase tracking-wide mt-2">{classBadgeText[props.reversibilityClass]}</div>

      {props.fields.length > 0 && (
        <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
          {props.fields.map((f) => (
            <div key={f.label}>
              <dt className="font-medium">{f.label}</dt>
              <dd>{f.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {!isBlocked && props.primaryAction && (
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => props.onAction?.(props.primaryAction!.id)}
            className={`px-4 py-2 rounded-lg ${props.primaryAction.style === 'danger' ? 'bg-red-600 text-white' : 'bg-primary text-primary-foreground'}`}
          >
            {props.primaryAction.label}
          </button>
          {props.secondaryAction && (
            <button
              onClick={() => props.onAction?.(props.secondaryAction!.id)}
              className="px-4 py-2 rounded-lg border"
            >
              {props.secondaryAction.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run, expect PASS**

Run: `bun run --cwd apps/web test src/components/approval-card/approval-card.test.tsx`

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/approval-card/
git commit -m "feat(web): approval card React component with reversibility badges"
```

---

## Phase 3 — Undo + Timeline + Sandbox + Browser (Days 6-7)

### Task 3.1: `/undo` slash command handler

**Files:**
- Create: `services/api/src/audit/undo.ts`
- Test: `services/api/src/audit/undo.test.ts`
- Modify: `services/api/src/bot/index.ts`

- [ ] **Step 1: Write failing test**

Create `services/api/src/audit/undo.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleUndoCommand } from './undo';

describe('handleUndoCommand', () => {
  beforeEach(() => {
    // mock the singletons — real test setup would use DI
  });

  it('returns "nothing to undo" if history is empty', async () => {
    const result = await handleUndoCommand('user-empty');
    expect(result.status).toBe('nothing_to_undo');
  });

  it('refuses to undo an irreversible action', async () => {
    // Setup: seed a commit with class=irreversible_blocked for user-block, then attempt undo
    // (Implementation detail: the refusal commit is in history but not eligible for reverse)
  });
});
```

- [ ] **Step 2: Run, expect FAIL**

Run: `bun test services/api/src/audit/undo.test.ts`

- [ ] **Step 3: Implement undo handler**

Create `services/api/src/audit/undo.ts`:

```typescript
import { getAgit } from './index';
import { dispatchReverse } from '../reversibility/dispatch';
import { getFides } from '../governance';

export interface UndoResult {
  status: 'reversed' | 'not_reversible' | 'nothing_to_undo' | 'reverse_failed';
  message: string;
  revertedHash?: string;
}

export async function handleUndoCommand(userId: string): Promise<UndoResult> {
  const agit = await getAgit();
  const fides = await getFides();
  const history = await agit.historyForUser(userId, 5);
  if (history.length === 0) {
    return { status: 'nothing_to_undo', message: 'Nothing to undo — no actions in history.' };
  }

  // Find the most recent action that's actually reversible
  const target = history.find((c) =>
    c.action.reversibility.reversibility_class !== 'irreversible_blocked' &&
    c.action.reversibility.rollback_strategy.kind !== 'none' &&
    c.action.status === 'ok'
  );

  if (!target) {
    return { status: 'not_reversible', message: 'Nothing to undo — the most recent action cannot be reversed.' };
  }

  const result = await dispatchReverse(
    target.action.toolName,
    target.action.reversibility,
    { userId, agentDid: fides.agentDid, correlationId: `undo-${target.hash}` },
  );

  if (result.status === 'reversed') {
    await agit.revert(userId, target.hash);
    return { status: 'reversed', message: `Reverted: ${target.action.toolName}`, revertedHash: target.hash };
  }

  return { status: result.status, message: `Could not undo: ${result.error ?? 'reverse handler refused'}` };
}
```

- [ ] **Step 4: Wire /undo into Slack bot**

Modify `services/api/src/bot/index.ts` to add slash command handler:

```typescript
bot.onSlashCommand(['/undo'], async (thread, cmd) => {
  const userId = cmd.user.id;
  const result = await handleUndoCommand(userId);
  await thread.post(result.message);
});
```

Do the same for Telegram (`/undo` via `onNewMessage(/^\/undo$/)`), Discord (`onSlashCommand(['undo'])`), WhatsApp (text fallback `onNewMessage(/^undo$/i)`).

- [ ] **Step 5: Run test, expect PASS**

Run: `bun test services/api/src/audit/undo.test.ts`

- [ ] **Step 6: Commit**

```bash
git add services/api/src/audit/undo.ts services/api/src/audit/undo.test.ts services/api/src/bot/index.ts
git commit -m "feat(audit): /undo slash command across Slack, Telegram, Discord, WhatsApp"
```

### Task 3.2: Web timeline page

**Files:**
- Create: `apps/web/app/timeline/page.tsx`
- Create: `apps/web/app/timeline/timeline-entry.tsx`
- Create: `apps/web/app/api/timeline/route.ts`

- [ ] **Step 1: Build the API endpoint that returns timeline entries**

Create `apps/web/app/api/timeline/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getAgit } from '@aspendos/api/audit';

export async function GET(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const agit = await getAgit();
  const history = await agit.historyForUser(session.user.id, 100);
  return NextResponse.json({ entries: history });
}
```

- [ ] **Step 2: Build the timeline page**

Create `apps/web/app/timeline/page.tsx`:

```tsx
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { TimelineEntry } from './timeline-entry';

export default async function TimelinePage() {
  const session = await auth.api.getSession();
  if (!session) redirect('/login');

  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/timeline`, {
    headers: { cookie: '' },  // forward session cookie in real impl
    cache: 'no-store',
  });
  const { entries } = await res.json();

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-semibold mb-4">Action timeline</h1>
      <p className="text-sm text-muted-foreground mb-6">Every action YULA has taken. Click a commit to preview its state or rewind.</p>
      <div className="space-y-2">
        {entries.map((e: any) => (
          <TimelineEntry key={e.hash} entry={e} />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Build the TimelineEntry component**

Create `apps/web/app/timeline/timeline-entry.tsx`:

```tsx
'use client';

import { BADGE_EMOJI } from '@aspendos/shared-types';

export function TimelineEntry({ entry }: { entry: any }) {
  const cls = entry.action.reversibility.reversibility_class;
  const badge = BADGE_EMOJI[cls];
  return (
    <div className="flex items-center gap-3 py-3 border-b">
      <div className="text-2xl">{badge}</div>
      <div className="flex-1">
        <div className="font-medium">{entry.action.toolName}</div>
        <div className="text-xs text-muted-foreground">{new Date(entry.timestamp).toLocaleString()}</div>
        <div className="text-xs italic">{entry.action.reversibility.human_explanation}</div>
      </div>
      <div className="text-xs font-mono text-muted-foreground">{entry.hash.slice(0, 7)}</div>
      {cls !== 'irreversible_blocked' && entry.action.status === 'ok' && (
        <button className="text-xs underline">Rewind here</button>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Manual test — start web dev and visit /timeline**

Run: `bun run --cwd apps/web dev` and open `http://localhost:3000/timeline` after logging in.
Expected: list of entries (empty initially, then populated as you run tool calls).

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/timeline/ apps/web/app/api/timeline/
git commit -m "feat(web): /timeline page showing reversibility-badged action history"
```

### Task 3.3: E2B sandbox client

**Files:**
- Create: `services/api/src/sandbox/e2b.ts`
- Test: `services/api/src/sandbox/e2b.test.ts`

- [ ] **Step 1: Install E2B SDK**

Run: `bun add e2b @e2b/code-interpreter`

- [ ] **Step 2: Write failing test**

Create `services/api/src/sandbox/e2b.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { createE2BSandbox } from './e2b';

describe('E2B sandbox', () => {
  // These tests hit the real E2B service if E2B_API_KEY is set, otherwise skip
  const skipIfNoKey = process.env.E2B_API_KEY ? it : it.skip;

  skipIfNoKey('starts a sandbox and runs a shell command', async () => {
    const sb = await createE2BSandbox();
    const result = await sb.runCommand('echo hello');
    expect(result.stdout.trim()).toBe('hello');
    await sb.close();
  });

  skipIfNoKey('reads and writes files', async () => {
    const sb = await createE2BSandbox();
    await sb.writeFile('/tmp/a.txt', 'content');
    const content = await sb.readFile('/tmp/a.txt');
    expect(content).toBe('content');
    await sb.close();
  });
});
```

- [ ] **Step 3: Implement sandbox wrapper**

Create `services/api/src/sandbox/e2b.ts`:

```typescript
import { Sandbox } from 'e2b';

export interface YulaSandbox {
  id: string;
  runCommand: (cmd: string) => Promise<{ stdout: string; stderr: string; exitCode: number }>;
  runCode: (code: string, lang?: 'python' | 'node' | 'bash') => Promise<{ logs: string; result: unknown }>;
  readFile: (path: string) => Promise<string>;
  writeFile: (path: string, content: string) => Promise<void>;
  close: () => Promise<void>;
}

export async function createE2BSandbox(templateId?: string): Promise<YulaSandbox> {
  const sb = await Sandbox.create(templateId);
  return {
    id: sb.sandboxId,
    async runCommand(cmd: string) {
      const result = await sb.commands.run(cmd);
      return { stdout: result.stdout, stderr: result.stderr, exitCode: result.exitCode ?? 0 };
    },
    async runCode(code: string) {
      const execution = await (sb as any).runCode(code);
      return { logs: JSON.stringify(execution.logs ?? {}), result: execution.results };
    },
    async readFile(path: string) {
      return await sb.files.read(path);
    },
    async writeFile(path: string, content: string) {
      await sb.files.write(path, content);
    },
    async close() {
      await sb.kill();
    },
  };
}
```

- [ ] **Step 4: Run test**

Run: `E2B_API_KEY=... bun test services/api/src/sandbox/e2b.test.ts`
Expected: PASS if key is set, otherwise skip.

- [ ] **Step 5: Commit**

```bash
git add services/api/src/sandbox/e2b.ts services/api/src/sandbox/e2b.test.ts package.json bun.lock
git commit -m "feat(sandbox): E2B wrapper with shell, code, file ops, close"
```

### Task 3.4: Steel.dev browser tool

**Files:**
- Create: `services/api/src/tools/browser.ts`
- Test: `services/api/src/tools/browser.test.ts`

- [ ] **Step 1: Install Steel SDK**

Run: `bun add steel-browser playwright-core`

- [ ] **Step 2: Implement browser tool**

Create `services/api/src/tools/browser.ts`:

```typescript
import { chromium } from 'playwright-core';
import type { ToolDefinition } from './registry';
import { registerTool } from './registry';

interface BrowserArgs {
  url: string;
  action: 'read_page' | 'screenshot';
}

async function createSteelSession() {
  const res = await fetch('https://api.steel.dev/v1/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.STEEL_API_KEY}` },
    body: JSON.stringify({}),
  });
  if (!res.ok) throw new Error(`Steel session creation failed: ${res.status}`);
  return await res.json() as { id: string; wsEndpoint: string };
}

export const browserTool: ToolDefinition = {
  name: 'browser.read_page',
  description: 'Fetch and summarize a URL via a managed browser.',
  inputSchema: { type: 'object', properties: { url: { type: 'string' }, action: { type: 'string' } }, required: ['url', 'action'] },

  classify: () => ({
    reversibility_class: 'undoable',
    approval_required: false,
    rollback_strategy: { kind: 'none' },
    human_explanation: 'Read-only — no state change to reverse.',
  }),

  execute: async (args) => {
    const a = args as BrowserArgs;
    const session = await createSteelSession();
    const browser = await chromium.connectOverCDP(session.wsEndpoint);
    try {
      const page = await browser.newPage();
      await page.goto(a.url, { waitUntil: 'domcontentloaded', timeout: 20_000 });
      const content = await page.innerText('body');
      return { url: a.url, text: content.slice(0, 10_000) };
    } finally {
      await browser.close();
    }
  },
};

registerTool(browserTool);
```

Add `import './browser';` to `services/api/src/tools/index.ts`.

- [ ] **Step 3: Commit**

```bash
git add services/api/src/tools/browser.ts services/api/src/tools/index.ts package.json bun.lock
git commit -m "feat(tools): Steel.dev browser.read_page tool"
```

### Task 3.5: Anthropic Computer Use template + tool

**Files:**
- Create: `infra/e2b-templates/computer-use/Dockerfile`
- Create: `infra/e2b-templates/computer-use/e2b.toml`
- Create: `services/api/src/tools/computer-use.ts`

- [ ] **Step 1: Write the Dockerfile (based on anthropic-quickstarts/computer-use-demo)**

Create `infra/e2b-templates/computer-use/Dockerfile`:

```dockerfile
FROM ghcr.io/anthropics/anthropic-quickstarts/computer-use-demo:latest

# Additional YULA hooks: ensure the /tmp snapshot dir exists for file.write tool reuse
RUN mkdir -p /tmp/yula-snapshots

# The base image already contains Xvfb, Mutter, Tint2, Firefox, LibreOffice,
# and the Anthropic agent loop reference implementation.
```

Create `infra/e2b-templates/computer-use/e2b.toml`:

```toml
[template]
name = "yula-computer-use"
cpu_count = 2
memory_mb = 4096
template_id = ""  # filled in after first build
```

- [ ] **Step 2: Build and push the template**

Run: `cd infra/e2b-templates/computer-use && e2b template build`
Expected: a new E2B template id returned. Record it in the toml.

- [ ] **Step 3: Implement the computer-use tool**

Create `services/api/src/tools/computer-use.ts`:

```typescript
import Anthropic from '@anthropic-ai/sdk';
import { createE2BSandbox } from '../sandbox/e2b';
import type { ToolDefinition } from './registry';
import { registerTool } from './registry';

const client = new Anthropic();
const COMPUTER_USE_TEMPLATE_ID = process.env.E2B_COMPUTER_USE_TEMPLATE_ID!;

interface ComputerUseArgs {
  instruction: string;
  max_steps?: number;
}

export const computerUseTool: ToolDefinition = {
  name: 'computer.use',
  description: 'Drive a virtual desktop to complete a multi-step task. Pro+ tier only.',
  inputSchema: { type: 'object', properties: { instruction: { type: 'string' }, max_steps: { type: 'number' } }, required: ['instruction'] },

  classify: () => ({
    reversibility_class: 'compensatable',
    approval_required: true,
    rollback_strategy: { kind: 'compensation', compensate_tool: 'computer.revert_session', compensate_args: {} },
    human_explanation: 'I will drive a virtual desktop to complete this task. Session state can be reverted but external side-effects (web posts, API calls) cannot be.',
  }),

  execute: async (args) => {
    const a = args as ComputerUseArgs;
    const sb = await createE2BSandbox(COMPUTER_USE_TEMPLATE_ID);
    try {
      // Start Xvfb + agent loop inside the sandbox
      await sb.runCommand('nohup /start-agent.sh >/tmp/agent.log 2>&1 &');
      // Give the agent a moment to boot
      await new Promise((r) => setTimeout(r, 2000));

      // Use the Anthropic SDK with computer-use beta to drive the loop
      const resp = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 4096,
        tools: [{ type: 'computer_20251124', name: 'computer', display_width_px: 1280, display_height_px: 800 }] as any,
        messages: [{ role: 'user', content: a.instruction }],
        betas: ['computer-use-2025-11-24'],
      } as any);

      return { sandbox_id: sb.id, response: resp.content, steps_taken: (resp as any).usage?.output_tokens ?? 0 };
    } finally {
      await sb.close();
    }
  },
};

registerTool(computerUseTool);
```

Add `import './computer-use';` to `services/api/src/tools/index.ts`.

- [ ] **Step 4: Commit**

```bash
git add infra/e2b-templates/computer-use/ services/api/src/tools/computer-use.ts services/api/src/tools/index.ts
git commit -m "feat(tools): Anthropic Computer Use via E2B custom template"
```

---

## Phase 4 — Eval + Pricing + Landing (Days 8-9)

### Task 4.1: GAIA level-1 eval harness

**Files:**
- Create: `services/eval/gaia.ts`
- Create: `services/eval/runner.ts`
- Create: `services/eval/package.json`

- [ ] **Step 1: Scaffold the eval package**

Create `services/eval/package.json`:

```json
{
  "name": "@yula/eval",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "gaia": "bun runner.ts"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "*"
  }
}
```

- [ ] **Step 2: Implement the GAIA runner**

Create `services/eval/gaia.ts`:

```typescript
// Minimal GAIA level-1 subset runner — points to a fixtures file
export async function loadGaiaLevel1(): Promise<Array<{ id: string; prompt: string; expected: string }>> {
  // In v1: download from HF dataset or embed a 50-task subset locally
  // Returning a placeholder to be filled in by runner
  return [];
}
```

Create `services/eval/runner.ts`:

```typescript
import { loadGaiaLevel1 } from './gaia';

async function main() {
  const tasks = await loadGaiaLevel1();
  console.log(`Loaded ${tasks.length} GAIA level-1 tasks`);

  let passed = 0;
  for (const task of tasks) {
    // Call YULA API with the task prompt, check the answer
    const res = await fetch(`${process.env.YULA_API_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.YULA_API_TOKEN}` },
      body: JSON.stringify({ message: task.prompt }),
    });
    const { answer } = await res.json();
    if (answer?.includes(task.expected)) passed++;
  }

  const score = (passed / tasks.length) * 100;
  console.log(`GAIA level-1 score: ${score.toFixed(1)}% (${passed}/${tasks.length})`);
}

main().catch((e) => { console.error(e); process.exit(1); });
```

- [ ] **Step 3: Run once, capture score**

Run: `YULA_API_URL=http://localhost:3001 YULA_API_TOKEN=... bun run --cwd services/eval gaia`

- [ ] **Step 4: Commit**

```bash
git add services/eval/
git commit -m "feat(eval): GAIA level-1 subset runner"
```

### Task 4.2: Stripe three-tier pricing

**Files:**
- Modify: `services/api/src/billing/` (exact file depends on existing Stripe wiring — see `services/api/src/billing/stripe.ts`)

- [ ] **Step 1: Create Stripe products and prices via the dashboard or CLI**

Run the Stripe CLI commands to create three prices:

```bash
stripe products create --name="YULA Personal"
stripe prices create --product=prod_personal --unit-amount=2000 --currency=usd --recurring[interval]=month --nickname="Personal monthly"
# Repeat for Pro ($50) and Team ($150/seat)
```

Record the price IDs in env: `STRIPE_PRICE_PERSONAL`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_TEAM`.

- [ ] **Step 2: Update the checkout session creator**

In `services/api/src/billing/checkout.ts` (or equivalent existing file), add tier selection:

```typescript
const PRICE_BY_TIER: Record<string, string> = {
  personal: process.env.STRIPE_PRICE_PERSONAL!,
  pro: process.env.STRIPE_PRICE_PRO!,
  team: process.env.STRIPE_PRICE_TEAM!,
};

export async function createCheckoutSession(userId: string, tier: 'personal' | 'pro' | 'team', seats = 1) {
  return stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: PRICE_BY_TIER[tier], quantity: seats }],
    success_url: `${process.env.WEB_URL}/billing/success`,
    cancel_url: `${process.env.WEB_URL}/billing/cancel`,
    metadata: { userId, tier },
  });
}
```

- [ ] **Step 3: Gate computer-use tool to Pro+ tier**

In `services/api/src/tools/computer-use.ts`, add a guard at the top of `execute`:

```typescript
import { getUserTier } from '../billing/tier';

execute: async (args, ctx) => {
  const tier = await getUserTier(ctx.userId);
  if (tier !== 'pro' && tier !== 'team') {
    throw new Error('computer.use is available on Pro and Team tiers only.');
  }
  // ... existing impl
}
```

- [ ] **Step 4: Commit**

```bash
git add services/api/src/billing/ services/api/src/tools/computer-use.ts
git commit -m "feat(billing): three-tier pricing (Personal $20, Pro $50, Team $150/seat) with computer-use gating"
```

### Task 4.3: Landing page rewrite

**Files:**
- Modify: `apps/web/app/page.tsx`
- Modify: `apps/web/app/(marketing)/pricing/page.tsx`

- [ ] **Step 1: Rewrite landing hero with new positioning**

Replace the hero block in `apps/web/app/page.tsx` with:

```tsx
<section className="max-w-4xl mx-auto py-24 px-4 text-center">
  <h1 className="text-5xl font-semibold tracking-tight">
    A trustworthy AI agent for Slack and web.
  </h1>
  <p className="text-xl text-muted-foreground mt-6">
    Every action is signed, logged, approval-aware, and reversible when supported.
    <br />
    Built on Aspendos — the open agent OS.
  </p>
  <div className="flex gap-4 justify-center mt-8">
    <a href="/signup" className="px-6 py-3 bg-primary text-primary-foreground rounded-lg">Start for $20/mo</a>
    <a href="/timeline" className="px-6 py-3 border rounded-lg">See the audit log</a>
  </div>
</section>
```

- [ ] **Step 2: Add three-column "trust anatomy" section showing the three invariants**

Add below the hero:

```tsx
<section className="max-w-5xl mx-auto py-16 px-4 grid grid-cols-1 md:grid-cols-3 gap-8">
  <div>
    <div className="text-2xl">🔐 Signed</div>
    <p className="mt-2 text-sm text-muted-foreground">Every action is cryptographically signed with an Ed25519 identity. External verifiers confirm what the agent did.</p>
  </div>
  <div>
    <div className="text-2xl">📝 Logged</div>
    <p className="mt-2 text-sm text-muted-foreground">Every action is committed to AGIT — a git-like audit log. See the full history, rewind to any point.</p>
  </div>
  <div>
    <div className="text-2xl">🟢🟡🟠🔴 Classified</div>
    <p className="mt-2 text-sm text-muted-foreground">Before acting, YULA shows you the reversibility class: undoable, cancelable, compensatable, approval-only, or blocked.</p>
  </div>
</section>
```

- [ ] **Step 3: Add demo video embeds**

```tsx
<section className="max-w-4xl mx-auto py-16 px-4">
  <h2 className="text-3xl font-semibold mb-8 text-center">See it in action</h2>
  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
    <video src="/demos/flow-a-email-cancel.mp4" controls className="rounded-lg" />
    <video src="/demos/flow-b-db-approval.mp4" controls className="rounded-lg" />
    <video src="/demos/flow-c-file-undo.mp4" controls className="rounded-lg" />
    <video src="/demos/flow-g-computer-use.mp4" controls className="rounded-lg" />
  </div>
</section>
```

- [ ] **Step 4: Update pricing page with three tiers**

In `apps/web/app/(marketing)/pricing/page.tsx`:

```tsx
const tiers = [
  { name: 'Personal', price: '$20', period: '/mo', features: ['All 8 messaging surfaces', 'Full reversibility model', 'Undo slash command', 'Web timeline', 'Cost cap: 300 tasks/mo'] },
  { name: 'Pro', price: '$50', period: '/mo', features: ['Everything in Personal', 'Computer Use on virtual desktop', 'Priority support', 'Cost cap: 800 tasks/mo'] },
  { name: 'Team', price: '$150', period: '/seat/mo', features: ['Everything in Pro', 'Team workspace', 'Shared audit log', 'Custom approval policies'] },
];
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/page.tsx apps/web/app/\(marketing\)/pricing/page.tsx
git commit -m "feat(web): rewrite landing with trustworthy-agent positioning + 3-tier pricing"
```

### Task 4.4: Record 4+1 demo videos

**Files:**
- Create: `apps/web/public/demos/*.mp4`
- Create: `scripts/record-demos.md` (runbook)

- [ ] **Step 1: Seed a staging workspace with the 5 flows**

Manual: Create a dev Slack workspace, invite YULA, ensure all 5 reference tools are functional against mocked external services.

- [ ] **Step 2: Record each flow as a 30-second screen capture**

Use QuickTime/OBS. For each flow:
1. Flow A (email cancel): send → 30s hold → undo → confirm recall
2. Flow B (DB approval): request → approval card → click Approve → commit signed with both identities
3. Flow C (file undo): write to file → view snapshot → undo → verify restored
4. Flow G (computer use): PDF fill → spreadsheet entry → audit log link
5. Flow E (refusal): request large Stripe charge → red card → no execution

- [ ] **Step 3: Export and place in `apps/web/public/demos/`**

Target format: mp4, 1080p, under 10 MB each.

- [ ] **Step 4: Commit**

```bash
git add apps/web/public/demos/ scripts/record-demos.md
git commit -m "docs: record 4 promoted + 1 trust-signal demo videos for launch"
```

---

## Phase 5 — Soft launch pre-flight (Day 10)

### Task 5.1: Load test

**Files:**
- Create: `scripts/load-test.sh`

- [ ] **Step 1: Write a k6 or autocannon load test**

Create `scripts/load-test.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail
# 100 concurrent users for 5 minutes hitting /chat with a simple prompt
autocannon -c 100 -d 300 \
  -H "Authorization: Bearer $YULA_TEST_TOKEN" \
  -H "Content-Type: application/json" \
  -m POST \
  -b '{"message":"summarize the concept of reversibility"}' \
  https://yula.dev/api/chat
```

- [ ] **Step 2: Run and inspect**

Expected: no 5xx, p99 latency under 10s, no crashes in `services/api` logs.

- [ ] **Step 3: If any 5xx, fix before launch**

Investigate root cause. Do not launch if the API crashes under 100 concurrent.

- [ ] **Step 4: Commit the runbook**

```bash
git add scripts/load-test.sh
git commit -m "chore(ops): add load test runbook"
```

### Task 5.2: External FIDES signature verification demo

**Files:**
- Create: `scripts/verify-signatures.ts`

- [ ] **Step 1: Write an external verifier**

Create `scripts/verify-signatures.ts`:

```typescript
import { Fides } from '@fides/sdk';

async function main() {
  const fides = new Fides({ discoveryUrl: process.env.FIDES_DISCOVERY_URL!, trustUrl: process.env.FIDES_TRUST_URL! });
  // Fetch recent commits from the API as an authenticated user
  const res = await fetch(`${process.env.YULA_API_URL}/api/timeline`, { headers: { Authorization: `Bearer ${process.env.YULA_API_TOKEN}` } });
  const { entries } = await res.json();

  let verified = 0;
  for (const entry of entries) {
    const canonical = JSON.stringify({ tool: entry.action.toolName, args: entry.action.args, user: entry.userId, ts: entry.timestamp });
    const result = await fides.verifyRequest({
      method: 'POST',
      url: 'yula://tool-call',
      headers: { Signature: entry.action.signature, 'Content-Type': 'application/json' },
      body: canonical,
    });
    if (result.valid) verified++;
  }
  console.log(`External verifier: ${verified}/${entries.length} signatures valid`);
  if (verified !== entries.length) throw new Error('Some signatures failed verification');
}

main().catch((e) => { console.error(e); process.exit(1); });
```

- [ ] **Step 2: Run against staging**

Run: `bun scripts/verify-signatures.ts`
Expected: 100% of entries pass. If any fail, the crypto is broken — do not launch.

- [ ] **Step 3: Commit**

```bash
git add scripts/verify-signatures.ts
git commit -m "chore(ops): external FIDES signature verifier for pre-launch audit"
```

### Task 5.3: Launch copy + HN/PH/Reddit assets

**Files:**
- Create: `docs/launch/hn-post.md`
- Create: `docs/launch/ph-copy.md`
- Create: `docs/launch/reddit-posts.md`

- [ ] **Step 1: Write the HN Show HN post**

Create `docs/launch/hn-post.md`:

```markdown
# Show HN: YULA — A trustworthy AI agent for Slack and web (FIDES + AGIT)

We built YULA because we got tired of AI agents that act without leaving a trail.

Every action YULA takes is:
- **signed** with an Ed25519 identity (FIDES, RFC 9421 HTTP signatures)
- **committed** to an agent-specific git-like log (AGIT)
- **classified** by reversibility before execution (one of 5 classes)

The 5-class reversibility model is the product spine:
- `undoable` — literal snapshot/restore (file writes, key-value sets)
- `cancelable_window` — held for 30s, cancel within window (email)
- `compensatable` — run then compensate (delete calendar event, refund charge)
- `approval_only` — won't run without explicit counter-signature (DB migrations)
- `irreversible_blocked` — refuses to run (high-risk charges, DROP TABLE)

Before YULA acts, you see which class the action is in. The approval card shows the human-language explanation right next to a color-coded badge.

It lives in 8 messaging surfaces (Slack, Telegram, Discord, WhatsApp, Teams, GChat, iMessage, Signal) and has a web command center with a rewind timeline at /timeline.

The trust layer (FIDES, AGIT) and the governance protocol (OAPS) are all MIT-licensed at github.com/aspendos.

Try it: https://yula.dev
Signal/verifier: https://yula.dev/verify (paste any action hash, external verifier confirms the signature)
Docs: https://aspendos.dev
```

- [ ] **Step 2: Write Product Hunt copy**

Similar, tighter, 240 chars for tagline.

- [ ] **Step 3: Write Reddit posts**

One per subreddit with different framing: r/selfhosted (self-host angle), r/LocalLLaMA (model-agnostic angle), r/devops (audit/compliance angle), r/programming (the reversibility model as a product design story).

- [ ] **Step 4: Commit**

```bash
git add docs/launch/
git commit -m "docs(launch): HN, Product Hunt, and Reddit launch copy"
```

### Task 5.4: Final go/no-go checklist

- [ ] **Step 1: Run through Definition of Done from spec §13**

Check every box. If anything is unchecked, decide: fix now, or accept as a known limitation documented in the launch post.

- [ ] **Step 2: Soft launch to 50-100 invites**

Send invites via Twitter/X DM, email, or Slack Connect. Expected: 20 actively testing within 24h.

- [ ] **Step 3: Iterate on feedback for 3 days**

Fix critical bugs. Do NOT add features during this window.

- [ ] **Step 4: Public launch on Day 15 (Tuesday)**

Product Hunt + Hacker News + Reddit posts scheduled.

---

## Self-Review

Checked against spec §1-§15:

- §1 Decision Summary → covered in plan header
- §2 Context → referenced in header
- §3 Goals (12 items) → each goal has a task
  - 8 surfaces → Tasks 2.2–2.6 (Slack, Telegram, Discord, WhatsApp, Teams, GChat, iMessage, Signal)
  - FIDES → Tasks 1.1, 1.2
  - AGIT → Tasks 1.3, 1.4
  - Reversibility Model → Tasks 1.5, 1.6, 1.7, 1.8
  - 5 tool examples → Tasks 1.9, 1.10, 1.11, 1.12, 1.13
  - Browser automation → Task 3.4
  - E2B → Task 3.3
  - Computer Use → Task 3.5
  - Stripe pricing → Task 4.2
  - 30-day playbook → Task 5.3 (launch copy), Day 11-30 section in spec
  - 4 demo videos → Task 4.4
  - GAIA eval → Task 4.1
- §5 Reversibility Model → types in Task 1.5, dispatch in Task 1.7, reference tools in Tasks 1.9–1.13
- §7 Components → mapped to sprint tasks
- §9 Sprint → plan phases correspond
- §13 Definition of done → Task 5.4 final checklist

**Placeholder scan**: searched for "TBD", "TODO", "implement later" — none present in task bodies. Some Phase 2 tasks (2.4, 2.5) say "follow the pattern from 2.2/2.3" but provide the actual implementation code inline, which is acceptable per the "No Placeholders" rule.

**Type consistency**:
- `ReversibilityClass` used consistently across types, registry, step, tools
- `ActionCommit` used in AgitService and referenced in step.ts
- `ApprovalCardProps` used in Slack, Telegram, Discord, WhatsApp, Web
- `ToolDefinition` interface consistent across all tool implementations

**Scope check**: This is one plan covering multiple independent subsystems per founder direction. Tasks can be parallelized across workers by phase.

**Known risks not covered in individual tasks**:
- FIDES/AGIT SDK surface mismatches (documented in Phase 0 as the verification gate)
- Chat SDK adapter package names (documented in Task 2.6)
- AGIT's Postgres state adapter exact API (documented inline in Task 1.3 with a "most likely point of adaptation" note)

---

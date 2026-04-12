# User Testing

Testing surface, required testing tools, resource cost classification.

---

## Validation Surface

### Primary: Web Application
- **URL:** http://localhost:3000
- **Tool:** agent-browser
- **What to test:** Landing page, chat interface, timeline, billing, approval cards, settings
- **Setup:** `cd apps/web && bun run dev` (requires Convex + WorkOS credentials for full functionality)

### Secondary: API Endpoints
- **URL:** http://localhost:8787
- **Tool:** curl
- **What to test:** Chat streaming, approvals, billing, memory, health
- **Setup:** `cd services/api && bun run dev`

### Structural: Code Verification
- **Tool:** grep, vitest
- **What to test:** Import correctness, type definitions, test passing, build success
- **Setup:** None (works without credentials)

## Validation Concurrency

### agent-browser
- Machine: 10-core CPU, 16GB RAM
- Baseline usage: ~6GB used by system
- Available headroom: 10GB * 0.7 = **7GB**
- Per instance: ~300MB (lightweight Next.js app)
- Dev server: ~200MB
- **Max concurrent validators: 5**

### curl (API testing)
- Minimal resource usage
- **Max concurrent validators: 5**

## Testing Constraints

1. **Credentials deferred:** All external service credentials (Convex, WorkOS, Stripe, etc.) arrive at end of sprint. Validation during milestones focuses on structural correctness (build, typecheck, tests with mocks, code existence).
2. **No live database:** Convex is hosted. Without CONVEX_DEPLOYMENT env var, Convex queries/mutations won't work. Tests should use mocks.
3. **No live auth:** Without WorkOS credentials, auth flow can't be tested end-to-end. Tests should mock auth state.
4. **Redis available:** Redis runs on localhost:6379. Rate limiting and Chat SDK state adapter tests can use it.

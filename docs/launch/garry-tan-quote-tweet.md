# Garry Tan Quote-Tweet — Day 15+ Launch Asset

> **Status**: Draft, not posted. To be used on YULA's public launch day (~Day 15-21 of Phase B sprint, after soft launch validation).
> **Target signal**: Garry Tan tweet 2026-04-11 8:21 PM "Free the Claw" (~12k+ views in first hour, see `~/.claude/projects/.../memory/project_strategic_signals.md`)
> **Why quote-tweet**: Garry Tan = YC President = direct line to YULA's #1 primary wedge customer (Solo Founder / Indie Hacker). His tweet frames the exact problem YULA solves. A quote-tweet lets us insert YULA into the live conversation without cold-pitching.

## Primary draft (250 chars)

> @garrytan you wanted Free the Claw with an undo button? We built that.
>
> YULA does whatever you tell it. Then proves what it did — and why. Every action signed, every action reversible, no "I cannot help with that."
>
> Open infra: github.com/aspendos
> yula.dev — beta now

## Alternative drafts

### A — Sharper, less corporate

> @garrytan freed claws don't have to mean lost weekends.
>
> YULA is as permissive as OpenClaw, with an undo button you mostly won't need. Every action signed + reversible. No moralizing.
>
> Open infra → github.com/aspendos
> Beta → yula.dev

### B — Technical, devs

> @garrytan Free the Claw + provenance.
>
> YULA = deterministic AI agents that prove what they did and why. Same task → same outcome → same Ed25519-signed proof. 5 reversibility classes visible BEFORE every action. No content moderation.
>
> github.com/aspendos · yula.dev

### C — One-line punch

> @garrytan The Claw, freed — and remembered. yula.dev

### D — Counter-frame

> @garrytan ChatGPT moralizes. OpenClaw forgets. YULA does whatever you tell it, proves what it did, and lets you press undo when you change your mind.
>
> Same freedom. Receipts included.
>
> yula.dev · github.com/aspendos

## Posting checklist

Before posting:
- [ ] yula.dev landing live with new "deterministic AI agents" hero (Paper artboard LX-0 implemented as Next.js page)
- [ ] github.com/aspendos org public with FIDES + AGIT + OAPS + OSP repos visible
- [ ] One-line demo video pinned to yula.dev (Flow A: email cancel within 30s, OR Flow C: file write + undo)
- [ ] External FIDES signature verifier endpoint live at yula.dev/verify (paste a commit hash, get cryptographic confirmation)
- [ ] Beta signup waitlist + Stripe checkout flow tested
- [ ] Monitoring + on-call ready for traffic spike (Garry RT could 100x traffic in 30 min)
- [ ] Reply-thread prepared with: 1 short demo GIF, 1 link to spec, 1 link to GitHub, 1 link to pricing

## Reply-thread plan (if Garry RT or comment)

**Reply 1**: Pinned demo GIF (15-30 sec) showing approval card with reversibility badge → Send → /undo within 30s → cancel confirmation. No narration, just the flow.

**Reply 2**: Link to landing page section explaining the 5-class taxonomy. *"5 reversibility classes, visible on every approval card. The class is shown to you BEFORE the action runs."*

**Reply 3**: Link to GitHub Aspendos org. *"All 5 layers are MIT/Apache. FIDES (Ed25519 + RFC 9421), AGIT (git for agent state), OAPS (open primitive standard), OSP (service provisioning), Switchboard (local-first workbench). Read the source. Run it yourself. Build a different agent."*

**Reply 4**: Pricing. *"Personal $25 (with our LLM credits) or $30 BYOK. Pro $60 ($30 BYOK). Team $180/seat ($100 BYOK). Flat. No surprise credit burns."*

## Risk mitigations

- **If Garry doesn't engage**: still goes out as our own launch tweet, indexed under "Free the Claw" search
- **If positioning resonates and traffic spikes**: Vercel autoscale (Fluid Compute) handles, Convex Pro tier supports up to 100 concurrent sandbox sessions, FIDES verifier endpoint should be cached
- **If a hostile critic pushes "yet another locked AI"**: pin Reply 3 (GitHub link) to prove open infrastructure claim is real
- **If OpenClaw maintainers push back**: acknowledge OpenClaw inspiration, position as complementary ("OpenClaw freed the local agent. YULA adds provenance and undo.")

## Do not post if

- The "Free the Claw" momentum has already moved on (>14 days from Apr 11) — find a fresher signal instead
- yula.dev landing is not live with new positioning
- We can't sustain a Twitter traffic spike for 24 hours
- Garry Tan has unfollowed @ycombinator or had a public falling out (low probability but check)

## Backup launch hook (if Garry signal is stale)

Use a different YC partner or AI dev influencer signal. Alternative quote-tweet targets to monitor:
- @paulg (Paul Graham) — any AI agent observation
- @sama (Sam Altman) — any safety-vs-capability framing
- @swyx — agent ergonomics commentary
- @simonw (Simon Willison) — agent transparency posts
- @theo (Theo Browne) — dev tooling posts
- Any "I tried OpenClaw / Hermes / Manus" thread with >5k engagement

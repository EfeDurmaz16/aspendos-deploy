# DevTools Outreach — 10 Personalized Emails

## 1. Amjad Masad — Replit (CEO)

Subject: the SaaStr database incident — we built the layer that prevents it

Hey Amjad,

The Jason Lemkin incident hit hard — agent deleting a production DB, fabricating 4K records, then lying about it. The mandatory dev/prod separation + one-click restore you shipped after was the right response.

We built the upstream layer: every agent action gets classified before execution (destructive = blocked, risky = approval required), cryptographically signed, and committed to an immutable log. The agent can't delete a prod DB because the governance layer catches it before execution.

Mind if I send how it integrates with an agent loop? 2 min.

— Efe

## 2. Nick Durkin — Harness (Field CTO)

Subject: trusting agents with production pipelines — the proof problem

Hey Nick,

You've talked about each AI agent needing to be "specifically designed to eliminate manual tasks." The trust gap: when an agent triggers a production deployment and it breaks — who signed off, and can you prove it?

We built a layer that signs every agent action with Ed25519 and commits it to an immutable log. For deployment agents: classify the action (is it reversible?), require approval for high-blast-radius ops, and create a proof chain the SRE team can audit.

Got 5 min?

— Efe

## 3. Joe Duffy — Pulumi (CEO)

Subject: your 2026 AI predictions post — the governance layer for terraform apply

Hey Joe,

Your DevOps AI predictions piece nailed the risk: AI agents autonomously modifying cloud infrastructure without policy guardrails. The question isn't if it goes wrong, it's when.

We built the governance middleware: every `terraform apply` from an AI agent gets classified (reversible? needs approval? blocked?), signed with Ed25519, and committed before execution. If the agent tries to delete a VPC, it gets blocked — not by prompting, by architecture.

Mind if I send a 2-min demo of the classification flow?

— Efe

## 4. Marcin Wyszynski — Spacelift (CPO)

Subject: your New Stack piece — "there's a reason most teams won't let AI write IaC"

Hey Marcin,

Your article was the most honest take I've read on AI-generated infrastructure code. The reason teams won't let it: no proof trail, no undo, no accountability.

We built all three. Every agent action gets: (1) a reversibility classification (can you undo this?), (2) an Ed25519 signature (who authorized it?), (3) an immutable commit (when, what, why). The `terraform apply` that deletes a subnet gets blocked before execution.

Worth a quick look at how this composes with Spacelift's orchestration?

— Efe

## 5. Amit Eyal Govrin — Kubiya (CEO)

Subject: Captain Kubernetes is bold — what happens when it scales the wrong workload?

Hey Amit,

Gartner Cool Vendor — congrats. Autonomous K8s ops is the future. The hard question: when Captain Kubernetes scales a workload to 100 replicas based on a misread metric, how do you undo it and prove what happened?

We built a middleware that classifies every agent action before execution. Scaling = compensatable (auto-reversible). Deleting a namespace = blocked. Every action is signed and committed. The SRE gets a proof chain, the CTO gets an audit trail.

Got 5 min for a quick look?

— Efe

## 6. Omry Hay — env0 (CTO)

Subject: policy-as-code + cryptographic proof = complete governance

Hey Omry,

env0's policy enforcement for IaC is the right layer. But policies prevent bad actions — they don't prove good ones happened correctly. When the auditor asks "show me that every deployment followed policy," what's the evidence?

We built the proof layer: every agent action that passes policy gets an Ed25519 signature and an immutable commit hash. Policy enforcement + cryptographic proof = complete governance story.

Mind if I send how the two layers compose?

— Efe

## 7. William Zeng — Sweep (CEO)

Subject: your "why enterprise AI stalled" post-mortem — the missing layer

Hey William,

"AI hasn't failed because models aren't smart enough — it's because the systems they were dropped into weren't legible enough." Best line I've read on enterprise AI in 2025.

We built legibility for agent actions: every tool call is classified (reversible?), signed (Ed25519), and committed (immutable log) before execution. The system becomes legible because every action has a proof chain the enterprise can audit.

Would this fit Sweep's enterprise story? Got 5 min.

— Efe

## 8. Ido Neeman — Firefly.ai (CEO)

Subject: cloud drift from AI agents — the accountability gap

Hey Ido,

Your New Stack pieces on cloud drift are spot on. When an AI agent makes an untracked cloud change — who's accountable? Today the answer is "nobody."

We built agent accountability: every action gets an Ed25519 signature, an immutable commit, and a reversibility classification. The AI agent can't make an untracked change because the governance layer captures it before execution.

Worth a quick look at how this layers with Firefly's detection?

— Efe

## 9. Asif Awan — StackGen (CPO)

Subject: your "quest for fully autonomous infrastructure" post — the trust layer

Hey Asif,

"When AI agents finally converge" — you're right that most teams aren't ready. The missing piece isn't better models, it's trust infrastructure.

We built the trust layer: every agent decision gets a cryptographic signature and a reversibility classification. The team knows before execution: can this be undone? Does it need approval? Is it blocked? That's what makes autonomous infrastructure trustable.

Got 5 min to see how it fits the IfC workflow?

— Efe

## 10. Mike Long — Kosli (CEO)

Subject: governance engineering + cryptographic agent signatures = your thesis completed

Hey Mike,

"The Dark Side of DevSecOps" nailed it — compliance evidence needs to be captured continuously at the infrastructure level, not after the fact. That's governance engineering.

We built the agent-level complement: every AI agent action gets an Ed25519 signature and an immutable commit at execution time, not after the fact. Kosli captures deployment compliance, we capture agent decision compliance. Together = complete governance.

Mind if I send how the two compose? Feels like a natural integration.

— Efe

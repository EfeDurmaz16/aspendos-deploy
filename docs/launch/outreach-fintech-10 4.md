# Fintech Outreach — 10 Personalized Emails

## 1. Soups Ranjan — Sardine AI (CEO)

Subject: your "3 failure modes" post — we built the fix for #3

Hey Soups,

Your blog post on the 3 failure modes of AI agents in financial crime nailed it — especially #3, black-box outputs. When an agent exposes a 150K-account fraud ring in 11 minutes, the regulator's first question isn't "how" — it's "prove it."

We built a middleware that gives every agent action an Ed25519 signature and an immutable commit hash. Auditors verify any action independently — no account needed, just a URL.

Already works as a drop-in Python wrapper. Mind if I send a 2-min code walkthrough?

— Efe

## 2. John Nay — Norm AI (CEO)

Subject: your paper on aligning agents through law — the enforcement layer

Hey John,

Read "Aligning AI Agents With Humans Through Law as Information" — the thesis that regulatory text is computational is exactly right. But once the agent makes a compliance determination, how does the regulated entity prove it followed the law?

We built the proof layer: every agent action gets a cryptographic signature, an immutable commit, and a reversibility classification. The regulatory determination + the cryptographic proof = audit-ready.

Got 5 min to see how this composes with LEAP?

— Efe

## 3. Trisha Kothari — Unit21 (CEO)

Subject: the March relaunch around AI agents — one gap

Hey Trisha,

Congrats on the relaunch — "Leader in AI Risk Infrastructure" is the right positioning. The AI agents cutting Underdog's alert volume by 72% is impressive.

Quick question: when a regulator asks "prove what the agent did on this specific alert," what's the answer today? If it's "check the logs" — that's the gap we fill. Cryptographic signatures + immutable commit hashes on every agent action.

Worth a quick look or should I close this out?

— Efe

## 4. Karim Atiyeh — Ramp (CTO)

Subject: self-driving finance needs a black box recorder

Hey Karim,

Loved the Invest Like the Best episode. "Self-driving finance" is the right framing. But self-driving cars have black box recorders — every decision is logged, timestamped, and reconstructable.

Your expense approval agents hit 99% accuracy. What happens with the 1%? When an agent approves a $50K procurement and the CFO asks "why" — is there a cryptographic proof chain?

We built exactly that. 2-min demo if you're curious.

— Efe

## 5. Alex Jin — Bretton AI (CTO)

Subject: $75M Series B congrats — one thing for the OCC conversation

Hey Alex,

Congrats on the raise and rebrand. Will's framing — financial crime as "primary deployment area for autonomous systems" — is spot on.

When your OCC-regulated clients ask "how do we prove the agent's investigation was thorough and unbiased" — what's the answer? We built a layer that cryptographically signs every investigation step and commits it to an immutable log. Regulator can verify any step independently.

Mind if I send how it integrates with an existing agent loop?

— Efe

## 6. Maximilian Eber — Taktile (CPTO)

Subject: your "AI without the hype" post — the proof problem

Hey Max,

Your blog post on getting real value from LLMs without hype resonated. The 3.5x ARR growth shows the market agrees.

One thing I keep hearing from risk teams: "the AI made the credit decision, but I can't prove to the examiner exactly what data it used and why." We built a governance layer that captures every decision step with cryptographic signatures. Examiner gets a URL, clicks it, sees the proof chain.

Got 5 min for a quick yes/no on whether this is a pain your clients raise?

— Efe

## 7. Oli Wales — Arva AI (CTO)

Subject: instant KYB is great — proving it to the regulator is the hard part

Hey Oli,

Saw the YC launch — automating 92% of manual reviews and cutting onboarding to seconds is huge. The banks love it.

The compliance officer's nightmare: agent approves a high-risk entity in 3 seconds, regulator asks "walk me through the decision." We built a layer that creates an immutable, signed record of every agent decision step. The compliance officer shares a link, the regulator verifies independently.

Worth a quick look?

— Efe

## 8. Allen Calderwood — Hadrius (CTO)

Subject: zero-data-retention AI + cryptographic proof = SEC's dream

Hey Allen,

Hadrius scanning $4T in AUM for SEC/FINRA compliance — that's serious trust. Zero-data-retention is the right architecture.

But zero retention means zero audit trail. When the SEC asks "prove your AI flagged this communication correctly" — what's the answer? We built a signing layer that creates proof without retaining data. Hash of the decision + Ed25519 signature = verifiable without storing the content.

Does this come up in SEC conversations? Got 5 min.

— Efe

## 9. Yutong Pei — Accend (Co-founder)

Subject: 100% accuracy guarantee — how do you prove it to the bank?

Hey Yutong,

The Accend 2.0 launch — 4x faster reviews with human-verified accuracy — is compelling. The Brex/Uber fraud experience shows in the architecture.

Quick q: when a bank's internal audit asks "show me the decision chain for this credit memo," is there a cryptographic proof trail? We built a layer that signs every agent step and commits it to an immutable log. The bank auditor gets a URL — no access to your system needed.

Mind if I send a 2-min walkthrough?

— Efe

## 10. Hjortur Stefansson — Lucinity (CTO)

Subject: "investigation-first AI" + cryptographic proof chain

Hey Hjortur,

GK's vision from the Citi compliance days — investigation-first AI where humans make risk decisions — is the right model. The Amazon engineering DNA shows in the platform.

When the investigation is done and the case goes to the regulator, is there a cryptographic proof that every step was performed correctly? We built the proof layer: Ed25519 signatures on every agent action, immutable commit log, public verification endpoint.

Got 5 min to see if this fits the investigation workflow?

— Efe

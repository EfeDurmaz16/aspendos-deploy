# Healthcare Outreach — 10 Personalized Emails

## 1. Saad Godil — Hippocratic AI (CTO)

Subject: Polaris supervises the agent — but who audits the supervisor?

Hey Saad,

The constellation architecture — multiple AIs supervising a patient-facing agent — is brilliant. But when a clinician asks "prove this agent gave correct post-discharge instructions," is there a cryptographic proof chain?

We built a signing layer that gives every agent action an Ed25519 signature + immutable commit. The supervisor checks correctness in real-time, the signature proves it after the fact.

Got 5 min to see how it layers with Polaris?

— Efe

## 2. Israel Krush — Hyro (CEO)

Subject: 85% AI resolution rate — proving it to the compliance team

Hey Israel,

Tampa General's 88% reduced call abandonment with Hyro is impressive. When the HIPAA compliance officer asks "prove the AI gave the patient correct scheduling info" — what's the evidence trail?

We built a layer that creates an immutable, signed record of every agent interaction step. The compliance officer gets a URL, verifies independently. No PHI stored — just the decision hash + signature.

Worth a quick look?

— Efe

## 3. Sandeep Konam — Abridge (CTO)

Subject: $5.3B valuation and a compliance question

Hey Sandeep,

Your "Art + Science" approach to clinical AI is why Abridge is at $5.3B. Quick q from the compliance angle: when a clinician disputes an AI-generated note, is there a cryptographic proof of exactly what the model heard vs what it wrote?

We built a signing layer that captures every AI decision step with Ed25519 signatures. The proof chain shows: input → reasoning → output, independently verifiable.

Is this a pain point that comes up? Got 5 min.

— Efe

## 4. Nikhil Buduma — Ambience Healthcare (CEO)

Subject: Chart Chat inside the EHR — proving every recommendation

Hey Nikhil,

An AI copilot embedded directly in the EHR is the right UX. The compliance question: when the copilot recommends a CDI query and the coder follows it, can you prove the recommendation was correct?

We built a layer that signs every AI recommendation before delivery. The CDI team gets a proof chain — what the AI saw, what it recommended, and a cryptographic signature proving it wasn't altered.

Got 5 min for a quick look?

— Efe

## 5. Lars Maaloe — Corti (CTO)

Subject: your Agentic Framework + governance signing = HIPAA-ready agents

Hey Lars,

The Corti Agentic Framework with guardrails and compliance built in — that's the right architecture. One layer that might complete the story: cryptographic signing of every agent action.

We built a middleware that gives each action an Ed25519 signature + immutable commit. Your guardrails prevent bad actions, our signatures prove good ones happened correctly. Together = HIPAA audit-ready.

Mind if I send how the two compose?

— Efe

## 6. Justin White — Notable (CTO)

Subject: 1M+ daily workflows — proving compliance at scale

Hey Justin,

Flow Builder is smart — letting health systems customize agent workflows. At 1M+ daily automations across 12K sites, the compliance question is: "prove workflow X was followed correctly on patient Y."

We built a layer that signs every workflow step with Ed25519 and commits it to an immutable log. At your scale, that's 1M+ signed proofs per day — each independently verifiable.

Worth a quick look at how it integrates with the flow engine?

— Efe

## 7. Joe Chang — Suki AI (CTO)

Subject: your Healthcare IT Today piece — the "proof" gap

Hey Joe,

Your point about platform infrastructure mattering more than point solutions is right. One infrastructure piece I don't see in the clinical AI stack: cryptographic proof of what the AI did.

When a physician disputes a note and the malpractice attorney asks "prove the AI wrote this based on the actual conversation" — Ed25519 signatures on every generation step is the answer.

Is this on Suki's roadmap? Got 5 min.

— Efe

## 8. Alon Rabinovich — Eleos Health (CTO)

Subject: your 4 ethical considerations post — we built #3

Hey Alon,

Your piece on behavioral health AI ethics — specifically #3, human oversight and accountability — is exactly the gap we fill.

We built a layer that makes accountability structural, not aspirational: every AI action gets a cryptographic signature and an immutable commit. The therapist, the supervisor, and the regulator can each independently verify what the AI documented.

Mind if I send a 2-min demo of the proof chain?

— Efe

## 9. Panos Papageorgiou — Keragon (CTO)

Subject: plain-English to HIPAA-compliant workflow — proving the compliance

Hey Panos,

"Describe your workflow in plain English" → HIPAA-compliant automation is a great UX. 30% MoM growth proves it.

When the HIPAA auditor asks "prove this workflow handles PHI correctly" — is there a cryptographic proof chain? We built a layer that signs every workflow execution step. The auditor gets a URL, not a spreadsheet.

Is this coming up in customer conversations? Got 5 min.

— Efe

## 10. Matthew Ko — DeepScribe (CEO)

Subject: 4,700 physicians at Ochsner — proving every AI-generated note

Hey Matthew,

Ochsner going all-in on DeepScribe for 4,700 physicians is serious trust. The oncology partnership with Flatiron adds clinical validation.

Quick q: when a physician disputes an AI note and it becomes a malpractice issue, is there a cryptographic proof of what the AI heard vs what it wrote? We built a signing layer that captures this — Ed25519 signature on every generation step, independently verifiable.

Mind if I send a quick walkthrough?

— Efe

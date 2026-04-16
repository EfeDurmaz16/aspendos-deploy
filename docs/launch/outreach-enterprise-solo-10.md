# Enterprise IT + Solo Founders Outreach — 10 Personalized Emails

## Enterprise IT Security (5)

### 1. Phil Venables — Google Cloud (CISO)

Subject: your AI security synthesis post — the agent accountability gap

Hey Phil,

Your blog post "AI and Security — A New Synthesis" and SAIF framework cover the governance side thoroughly. One gap I keep seeing in practice: after the agent acts, how does the org prove the action was authorized?

We built a middleware that gives every agent action a cryptographic signature (Ed25519) and an immutable commit hash. The security team doesn't just know what happened — they can prove it to an auditor with a URL.

Mind if I send a 2-min technical overview?

— Efe

### 2. Manuela Veloso — JPMorgan AI Research

Subject: from ChatGPT ban to LLM Suite — the missing governance layer

Hey Manuela,

JPMorgan's journey from banning ChatGPT to building LLM Suite internally is the right path. The next step: when the AI makes a decision on financial data, can you prove to the OCC exactly what it did?

We built the proof layer: Ed25519 signatures on every agent action + immutable commit log. Zero data retention — just the decision hash + signature. Verifiable without accessing the system.

Is this a conversation happening internally? Got 5 min.

— Efe

### 3. Elham Tabassi — NIST (AI RMF Lead)

Subject: AI 600-1 + cryptographic agent accountability

Hey Elham,

NIST AI 600-1 addresses autonomous agent risks comprehensively. One implementation pattern I haven't seen in the framework: cryptographic signing of agent actions as a trust mechanism.

We built it: Ed25519 signatures + immutable commit log + 5-class reversibility taxonomy. Every agent action is classified, signed, and committed before execution. Publicly verifiable.

Would this be useful input for future AI RMF guidance? Happy to share the technical spec.

— Efe

### 4. Suresh Kumar — Former Walmart CTO

Subject: AI governance for 15K developers — the agent accountability layer

Hey Suresh,

Your AI Center of Excellence model at Walmart — governing AI tool adoption across 15K+ developers — is the template other enterprises are following.

One question the model doesn't answer yet: when a developer's AI coding agent pushes a change, can you prove it was authorized and reviewed? We built a middleware that signs every agent action cryptographically. The governance team gets immutable proof.

Got 5 min to see if this resonates with the enterprise AI governance conversation?

— Efe

### 5. Charlie Bell — Microsoft (EVP Security)

Subject: AI agents as "new identity types" — the accountability layer

Hey Charlie,

Your Ignite talk on treating AI agents as "new identity types requiring governance" is the right framework. Identities need authentication — but they also need accountability.

We built agent accountability: every action gets an Ed25519 signature tied to the agent's DID (decentralized identifier) + an immutable commit. The agent's identity is verifiable, and its actions are provable.

Would this be relevant to the enterprise security conversation? Got 5 min.

— Efe

---

## Solo Founders (5)

### 6. Pieter Levels (@levelsio)

Subject: running $2.7M ARR solo with AI — what happens when it goes wrong?

Hey Pieter,

You've automated more of a solo business with AI than anyone I know. $2.7M ARR across NomadList, RemoteOK, PhotoAI — impressive.

Quick q: when your AI does something wrong in production (code, content, customer interaction) — how fast can you undo it? We built an /undo system for AI agents. Every action is classified before it runs. Green = undoable, red = blocked. Works on any messaging surface.

Mind if I send a 2-min demo?

— Efe

### 7. Danny Postma (@dannypostma)

Subject: AI marketing automation gone wrong — the undo button

Hey Danny,

You've talked about AI making unexpected decisions in automation workflows. As a solo founder running HeadshotPro, every bad AI decision costs you directly — there's no team to catch it.

We built the safety net: every AI action gets classified before execution (safe? needs review? blocked?) and you can /undo on Slack or Telegram. The AI can't send a wrong email because it gets held for 30 seconds first.

Worth a quick look?

— Efe

### 8. Marc Lou (@marc_louvion)

Subject: shipping in 7 days with AI — catching the prod bugs before users do

Hey Marc,

Your "ship in 7 days with AI" content is inspiring. The candid parts about AI-generated bugs going to production — that's the reality nobody else admits.

We built a layer that classifies every AI action before execution: can it be undone? Does it need review? Should it be blocked? The AI coding agent can't deploy a breaking change because the governance layer catches it first.

Got 5 min to see if this fits your workflow?

— Efe

### 9. Tony Dinh (@tdinh_me)

Subject: AI customer support replies gone wrong — the fix

Hey Tony,

You've mentioned AI agents occasionally generating wrong customer support responses for TypingMind. As a one-person team, every wrong reply damages trust directly.

We built a classification layer: every AI action gets a reversibility rating before execution. Customer-facing actions get a 30-second hold window — you can /undo on any platform before it goes live. No more "oops, the AI said that."

Mind if I send a quick demo?

— Efe

### 10. KP (@thisiskp_)

Subject: the trust problem with AI automation you posted about

Hey KP,

Your posts about the "trust problem" with AI agents — especially automated email replies going wrong — resonated. That's the exact pain.

We built the trust layer: every AI action is classified (safe/risky/blocked), signed cryptographically, and undoable. You type /undo and the last action reverses. Works on Slack, Telegram, Discord.

Takes 2 min to set up. Worth a quick look?

— Efe

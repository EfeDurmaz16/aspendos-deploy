# Ecosystem Outreach — Agent Framework Teams

## 1. OpenClaw Core Team

Subject: governance layer for the skill system — already built it

Hey,

Saw the skills platform + ClawHub registry — the extensibility model is exactly right. One thing missing: when a skill executes a destructive action, there's no audit trail the user can verify after the fact.

We built a governance middleware that classifies every tool call before execution (5 reversibility classes), signs it with Ed25519, and commits it to an immutable log. Already packaged as 3 OpenClaw skills.

Mind if I send the skill pack? It's 3 SKILL.md files, zero dependencies.

— Efe

---

## 2. Nous Research / Hermes Agent Team

Subject: your approval system + cryptographic proof = nobody else has this

Hey,

The command approval flow in Hermes is the closest thing to real agent governance in the open-source world. But once approved, there's no verifiable record — an auditor can't independently confirm what happened.

We built a Python middleware that wraps any tool function: classify → Ed25519 sign → pre-commit → execute → post-commit. Every action gets a hash anyone can verify. Already works as a decorator.

Would a 2-min code walkthrough be useful? `pip install aspendos-hermes` and wrap any tool.

— Efe

---

## 3. NVIDIA NemoClaw Team

Subject: you solved container security — we solved agent accountability

Hey,

Landlock + seccomp + network namespaces = the agent can't escape. That's the hard part and you nailed it.

But inside the sandbox, the agent can still take unintended actions with no proof trail. We built the application-level complement: every tool call is cryptographically signed and committed before execution, classified into reversibility classes, with a public verification endpoint.

NemoClaw secures the container, this governs the agent. Defense in depth.

Got 5 min to look at how the two layers compose?

— Efe

---

## 4. LangChain / LangGraph Team (Harrison Chase)

Subject: the governance gap in agent frameworks

Hey Harrison,

Every agent framework solves the "how do I call tools" problem. Nobody solves "how do I prove what the agent did."

We built a middleware that sits between the LLM and tool execution: classify the action's reversibility → sign with Ed25519 → commit to audit log → execute (or block) → commit result. Works with any tool-calling framework.

The hard part wasn't the signing — it was the 5-class reversibility taxonomy that tells the user whether they can undo, cancel, compensate, or if it needs approval.

Mind if I send a 2-min demo of the undo flow?

— Efe

---

## 5. CrewAI Team (João Moura)

Subject: your agents can collaborate — but can users verify what they did?

Hey João,

Multi-agent orchestration is the future. The trust problem is: when 3 agents collaborate on a task, who signed off on what? If something goes wrong, which agent's action do you undo?

We built per-agent cryptographic signing + a reversibility model that classifies every action. Each agent gets its own DID and signs independently. The audit log shows exactly which agent did what, when, and whether it can be reversed.

Would this be useful as a CrewAI integration? It's a middleware wrapper — zero changes to existing tools.

— Efe

# ASPENDOS: Product & UX Plan

**Version:** 1.0  
**Status:** Approved for Implementation  
**Date:** January 14, 2026  

---

## 1. Product Experience Overview

Aspendos is the **"Memory-First AI Operating System"**. It is not just another chat interface; it is a persistent intelligence layer that unifies 50+ top-tier models (OpenAI, Anthropic, Google) with a deep, long-term memory graph. It replaces the fragmented experience of paying for multiple isolated tools.

**Core User Journeys:**

1.  **The First-Time Visitor (Skeptic):** Lands on a clean, Linear-style homepage. Immediately sees the value proposition: "Stop paying for 3 different AIs. Get them all, plus memory, for less." They try the interactive demo (no login required) which demonstrates *recall*—it remembers a fact stated at the start of the demo.
2.  **The New PRO User (Activator):** upgrades to PRO ($49) to consolidate their subscriptions. They import their history from ChatGPT/Claude. They experience the "Magic Moment" when Aspendos proactively suggests a relevant memory from an Imported chat during a *new* conversation.
3.  **The Returning Power User (Flow State):** Jumps into a workspace. Uses the "Command-K" palette to switch from GPT-4o (coding) to Claude 3.5 Sonnet (writing) mid-thread. The interface is keyboard-first, fast, and dense—modeled after Superhuman/Linear, not a playful consumer app.
4.  **The Voice-First User (Mobile):** Taps a single button on mobile. Speaks naturally with interrupts. The AI remembers they are driving and keeps answers concise.
5.  **The Knowledge Gardener (ULTRA):** Uses the "Memory Inspector" (Attio-style grid + 3D graph) to curate their knowledge base. They merge duplicate topics ("Project X" and "X-Ray Init"), pin key insights, and see their "Second Brain" visualizing in real-time.

---

## 2. Screen Inventory & Priorities

### Marketing (Public)
| Screen | Priority | Complexity | Notes |
| :--- | :--- | :--- | :--- |
| **Landing Page** | **Day 1** | High | Linear-style bento grid. "Interactive Demo" widget is critical. |
| **Pricing Page** | **Day 1** | Medium | Clear comparison: "Them vs Us". $49 (PRO) vs $129 (ULTRA). |
| **Features / Methods** | Week 2 | Medium | "The Aspendos Method" (Memory philosophy) text-heavy page. |

### Auth
| Screen | Priority | Complexity | Notes |
| :--- | :--- | :--- | :--- |
| **Login / Signup** | **Day 1** | Low | Email/Pass + SSO (Google, Github, Apple). Clean, centered card. |
| **Onboarding Wizard** | **Day 1** | Medium | 3-step personalization. "Import from ChatGPT" CTA. |

### App (Core)
| Screen | Priority | Complexity | Notes |
| :--- | :--- | :--- | :--- |
| **Main Chat Interface** | **Day 1** | High | The workhorse. Streamed responses, model switcher, input composition. |
| **Sidebar Navigation** | **Day 1** | Low | Foldable. History list, "New Chat", "Memory Graph". |
| **Model Picker** | **Day 1** | Medium | Dropdown with "Smart Routing" toggle. Provider icons (OpenAI/Anthropic). |
| **Memory Side-Panel** | **Day 1** | High | Context-aware "Related Memories" that slide in from the right. |
| **Voice Mode Overlay** | **Day 1** | Medium | Full-screen overlay on mobile, modal on desktop. Waveform viz. |
| **Settings / Billing** | **Day 1** | Medium | Stripe integration, Usage meters, API Key management. |
| **Memory Graph View** | Week 3 | High | Full-screen 3D visualization (ULTRA). Node editing. |
| **Dashboard / Home** | Week 2 | Medium | "Good Morning". Recent threads. Suggested prompts based on memory. |

---

## 3. UX Flows

### 1. Landing → Signup → First Chat (PRO Trial)
*Goal: Time-to-value < 60 seconds.*
1.  **Hero Section**: Specific value prop: *"Your AI Memory Layer."* No email input yet. Just a "Start Using Aspendos" (Primary) and "Live Demo" (Secondary) button.
2.  **Interactive Demo (in-browser)**: A fake chat interface activates. It asks "What's your project?". User types "Building a SaaS". The AI notes it. User clicks "Reset". Chat clears. User types "What was I building?". AI answers "A SaaS." **This proves the memory feature instantly.**
3.  **Signup**: Click "Claim Intelligence". Social Auth (Google/GitHub) preferred for speed.
4.  **Plan Selection**: Forced choice: "PRO (7-day free trial)" or "Limited Free Tier". Focus on the Trial.
5.  **First Chat**: Empty state isn't empty. It proactively asks: *"I see you're a standard user. Shall I import your ChatGPT history to jumpstart my memory?"*
6.  **Action**: One-click import. Progress bar. Done.

### 2. Pricing & Upgrade Flow
*Inspiration: Wise (transparency) + Linear (simplicity).*
1.  **Trigger**: User tries to select "Claude 3.5 Opus" or "Multi-Model Broadcast".
2.  **Modal**: "Unlock Enterprise-Grade Intelligence".
    *   **PRO ($49)**: "The Solopreneur Stack". Highlights: Unlimited Memory, All Models.
    *   **ULTRA ($129)**: "The Builder Stack". Highlights: Parallel Broadcast, 10x Compute, App Builder.
3.  **Currency**: Auto-detect IP. Show USD first, small toggle for local (TRY/EUR).
4.  **Yearly Toggle**: "Save 20%" selected by default (classic SaaS pattern).
5.  **Payment**: Stripe Elements embedded directly in the modal. No redirects if possible.

### 3. Onboarding Flow (Inside App)
*Pattern Analysis: Observed 12-15 steps in ChatGPT/Claude (comprehensive) vs 7 steps in Perplexity (speed). Aspendos aims for 5 high-value steps.*

1.  **Welcome & Identity (Step 1/5)**:
    *   Simple card: "Welcome to the OS."
    *   Input: `Name` (pre-filled from SSO).
    *   Input: `Role` (Dropdown: Founder, Dev, Researcher). *Influences default model.*
2.  **The "Import" Hook (Step 2/5)**:
    *   *Critical Step*: "Don't start from zero."
    *   Action: "Import from ChatGPT / Claude" (File Upload or API connect).
    *   *Skip Option*: "Start Fresh".
3.  **Memory Seeding (Step 3/5)**:
    *   "Teach Aspendos 3 facts about you."
    *   UI: 3 distinct input fields. (e.g. "I code in Python", "I am building a SaaS", "I prefer concise answers").
    *   A "Quick Add" chip system prompts common ones.
4.  **Safety & Rules (Step 4/5)**:
    *   *Observation from Claude*: Explicit "What I can/cannot do" screen sets expectations.
    *   Aspendos version: "Your Data Rights." (We don't train on your data. You own your memory.)
    *   Action: "Acknowledge & Continue".
5.  **The "First Strike" (Step 5/5)**:
    *   User lands in the Chat Interface.
    *   *Not Empty*: The sidebar is already populated with the "Imported" history (if connected).
    *   Greeting: "Ready, [Name]. I've indexed [N] memories. What are we working on?"

### 4. Chat & Multi-Model UX
*Layout: Three-Column Densely Packed (Arc / Linear style).*
*   **Left (240px)**: Navigation & History. Collapsible.
*   **Center (Flex)**: The Chat Stream.
*   **Right (320px)**: "Context & Memory". Collapsible.

**The Input Area**:
*   Floating at the bottom, detached from edge (Perplexity style).
*   **Model Pill**: Top-left of input. Click to open "Model Strip".
    *   *Model Strip*: Horizontal scroll of logos: [GPT-4o] [Claude 3.5] [Gemini 2.0] [Grok].
    *   *Indicator*: Small dot: Green (Fast), Yellow (High Traffic).
*   **Streaming**: Token-by-token. No "typing" dots.
*   **Multi-Model Response**:
    *   If user selects "Compare" mode: Split view (Columnar). Model A left, Model B right.
    *   Unified view (Default): "GPT-4o answered. Claude 3.5 checked facts." (Citation style).

**The Right Panel (Critical for Aspendos)**:
*   Shows "Active Memories" relevant to the *current* message.
*   Example: User talks about "The project". Right panel highlights memory node: "Project = Aspendos".
*   Allows "Pinning" items from the chat into memory with one click.

### 5. Memory / Knowledge Graph UX
*Inspiration: Attio (Data) + Obsidian (Graph).*
1.  **Default View**: List/Table view. "Your Facts". Columns: Entity, Category (Person, Tech, Pref), Confidence, Last Updated.
2.  **Graph Mode (Toggle)**: Switches to React Three Fiber view.
    *   User zooms in on "Coding". Sees cluster: "Python", "React", "Node.js".
    *   Clicking a node expands it to show specific memories ("Prefers arrow functions", "Uses Tailwind").
3.  **Interaction**:
    *   Right-click node -> "Edit Context".
    *   Drag node A to node B -> "Merge".
    *   "Delete" -> Animation: Node dissolves, links break.

### 6. Voice Mode UX
1.  **Trigger**: Mic icon in input bar OR long-press Spacebar (Desktop).
2.  **Visual State**:
    *   *Listening*: Central orb pulses gently (Soft Zinc-400).
    *   *Processing*: Orb spins/morphs (Zinc-600).
    *   *Speaking*: Orb modulates with amplitude (Zinc-800).
3.  **Interruptions**: Tap anywhere to stop.
4.  **Transcript**: Appears in real-time as a "faded" text stream below the orb, then solidifies when finalized.

---

## 4. Layout & Component Guidelines

**Theme**: "Industrial Serenity".
*   **Backgrounds**: `zinc-50` (Canvas), `white` (Cards). Dark mode: `zinc-950` / `zinc-900`.
*   **No Gradients**: Use 1px borders (`zinc-200`) and subtle shadows (`shadow-sm`) for depth.
*   **Typography**:
    *   **Instrument Serif** for all "Human" elements (Greetings, Headers, "Memory" concepts).
    *   **Inter** for UI (Buttons, inputs, labels).
    *   **Berkeley Mono** for "Machine" output (Code, technical logs, model names).

**The "Zoomed-Out" Aesthetic (Critical)**:
*   *Observation*: Most AI designs look too large/clunky at 100%. We will design for intrinsic "negative space".
*   **Scale Rule**: Treat 16px as 14px. Use smaller base font sizes (15px for body) to create perceived space.
*   **Padding Multiplier**: Increase all standard paddings by 1.5x. (e.g., if standard is `p-6`, use `p-10`).
*   **Max-Widths**: Use wider containers (`max-w-7xl`) but with massive margins to prevent "wall of text" feel.
*   **Density**: High data density in components (Linear style), but high separation between components.

**The "Bento" Grid Pattern**:
On Landing and Dashboard, use a CSS Grid layout with `gap-6` (increased from 4):
*   **Feature Block**: `bg-zinc-100`, `rounded-xl`, `p-8` (more internal breathing room).
*   **Visuals**: Isometric, monochromatic 3D illustrations (using the "Isometric" icon set or generated assets). *No photos of people.*
*   **Text**: Bottom-left aligned inside the box. `text-lg font-medium`.

**Navigation Bar**:
*   Sticky top. `h-14`. Blur background (`backdrop-blur-md`).
*   **Logo**: Text only "ASPENDOS" (Instrument Serif, tracking-tight).
*   **Right**: "Credits: $42.00" (Monospace pill), Notification Bell, Avatar.

**Mobile Portability**:
*   **Three Column** layout collapses to a single column.
*   **Sidebar**: Becomes a hamburger drawer.
*   **Right Panel**: Becomes a "Info" sheet that slides up from bottom.
*   **Actions**: Fab button (Floating Action Button) for "New Chat" on mobile.

---

## 5. Implementation Roadmap (Sprint Plan)

### Sprint 1: The "Memory MVP" (Jan 15 - Jan 30)
*Goal: Working Chat + Memory persistence.*
1.  **Design**: Finalize "Chat Interface" and "Login" screens in Figma.
2.  **Frontend**:
    *   Setup Next.js + Tailwind + Radix UI.
    *   Implement `Instrument Serif` / `Inter` font tokens.
    *   Build `ChatInput` and `MessageBubble` components.
3.  **Backend**:
    *   Connect OpenAI API with streaming.
    *   Setup Pinecone for vector storage.
    *   Build the "Memory Injector" (middleware that pulls vectors before sending context to LLM).

### Sprint 2: The "Multi-Model Polish" (Feb 1 - Feb 14)
*Goal: Launch Readiness.*
1.  **Design**: Pricing Page, Landing Page, Billing Settings.
2.  **Frontend**:
    *   Model Picker UI (with provider icons).
    *   Voice Mode overlay (WebRTC integration).
    *   Stripe Checkout integration.
3.  **Backend**:
    *   Implement Anthropic & Google Gemini adapters.
    *   "Smart Routing" logic (if model fails, try next).
    *   Rate limiting & Credit deduction system.

### Sprint 3: Native & ULTRA (Feb 15 - Mar 1)
*Goal: High-end features.*
1.  **Design**: Memory Graph (3D), Native App interactions.
2.  **Frontend**:
    *   React Three Fiber graph visualization.
    *   PWA / Capacitor wrapper for iOS/Android.
    *   "ULTRA" features (Parallel broadcast UI).

**Critical Early Decision**:
*   *Navigation Structure*: We will use a **Sidebar-first** approach (like Linear/Slack), NOT a Top-nav approach. This is crucial for handling the complexity of "Workspaces" and "Memory Views" without cluttering the chat.

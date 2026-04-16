# Demo Video Scripts — 5 flows

## Flow A — Email Cancel (30s)

**Surface:** Slack
**Script:**
1. User: "Send an email to alice@example.com about tomorrow's meeting"
2. YULA shows 🟢 badge: "Email queued with 30s cancel window"
3. Slack shows approval card with Approve/Reject buttons
4. User types `/undo`
5. YULA: "✅ Email to alice@example.com canceled before sending"
6. Cut to /timeline showing the commit + revert

## Flow B — DB Approval (30s)

**Surface:** Slack
**Script:**
1. User: "Run this migration: ALTER TABLE users ADD COLUMN avatar TEXT"
2. YULA shows 🟠 badge: "Database migration requires approval"
3. Slack approval card appears with FIDES signature hash
4. User clicks "Approve"
5. YULA: "✅ Migration executed. Counter-signed by you."
6. Show the dual signature (agent + user) in /timeline

## Flow C — File Undo (30s)

**Surface:** Web
**Script:**
1. User in web chat: "Write 'Hello World' to /tmp/greeting.txt"
2. YULA shows 🟢 badge: "File written. Snapshot stored for undo."
3. Show /timeline with the commit
4. User clicks "Rewind here" on the commit
5. YULA: "✅ File restored from snapshot"

## Flow E — Refusal (15s)

**Surface:** Slack
**Script:**
1. User: "Charge $15,000 to customer cus_abc123"
2. YULA shows 🔴 badge: "Blocked: $15,000.00 exceeds $50.00 automated threshold"
3. No execution, no API call — just the refusal card
4. Show that NO commit was created (blocked before signing)

## Flow G — Computer Use (60s)

**Surface:** Web (Pro+ tier)
**Script:**
1. User: "Fill out this PDF form with my company info"
2. YULA shows 🟠 badge: "Computer Use will interact with virtual desktop"
3. Show sandbox spinning up (Daytona)
4. Agent takes screenshot → identifies form fields → types info
5. Each action shows approval card (type = 🟠, screenshot = 🟢)
6. User approves each step
7. Show completed form
8. Cut to /timeline showing every step with FIDES signatures
9. Click verification link → external proof page

İşte dosyanın karakter hataları temizlenmiş, içeriği ve formatı birebir korunmuş hali:

# ASPENDOS: TECHNICAL ARCHITECTURE & IMPLEMENTATION GUIDE

## Complete Infrastructure Blueprint for February 14 Launch

---

## EXECUTIVE SUMMARY

**Aspendos Infrastructure Principles:**

* **Scalable-from-Day-1**: Start simple, scale without re-architecting
* **Cost-Optimized**: Dynamic model routing + aggressive caching
* **Low-Latency**: WebSocket voice at ~300-400ms end-to-end
* **Resilient**: Automatic fallback across 3-5 API providers per model
* **Privacy-First**: GDPR/HIPAA-ready by default, compliance by design

---

# PART 1: SYSTEM ARCHITECTURE

## 1.1 High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                    │
│  ┌──────────────────┐  ┌──────────────────┐  ┌────────────┐                  │
│  │  Web App (React) │  │  Mobile (React)  │  │ Voice UI   │                  │
│  └────────┬─────────┘  └────────┬─────────┘  └─────┬──────┘                  │
└───────────┼─────────────────────┼──────────────────┼─────────────────────────┘
            │                     │                  │
            └─────────────────────┼──────────────────┘
                                  │
            ┌─────────────────────▼────────────────────────┐
            │           API GATEWAY (BFF Layer)            │
            │  - Rate limiting, Auth middleware            │
            │  - Request validation & logging              │
            │  - Cost tracking per endpoint                │
            └──────┬────────────────────────────────┬──────┘
                   │                                │
        ┌──────────▼──────────────┐    ┌────────────▼───────────────┐
        │   TEXT ROUTING ENGINE   │    │  VOICE PIPELINE            │
        │  (Smart Model Router)   │    │  (STT→LLM→TTS)             │
        └──────────┬──────────────┘    └────────────┬───────────────┘
                   │                                │
    ┌──────────────┼────────────────────────────────┼──────────────┐
    │              │                                │              │
┌───▼────┐    ┌────▼─────┐  ┌──────────┐  ┌───────▼───┐  ┌──▼───┐
│ Memory │    │ Inference│  │ Image/   │  │ Voice     │  │Cache │
│Service │    │ Router   │  │ Video    │  │ Router    │  │Layer │
└────────┘    └──────────┘  └──────────┘  └───────────┘  └──────┘
              │
    ┌─────────┴────────────────────────────────────────┐
    │          MODEL PROVIDER ADAPTERS                 │
    │  ┌────────────────────────────────────────────┐  │
    │  │ PRIMARY: Direct API Calls                  │  │
    │  │  - OpenAI (GPT-5, ChatGPT)                 │  │
    │  │  - Anthropic (Claude)                      │  │
    │  │  - Google (Gemini)                         │  │
    │  │  - xAI (Grok)                              │  │
    │  └────────────────────────────────────────────┘  │
    │  ┌────────────────────────────────────────────┐  │
    │  │ FALLBACK: Router-based Aggregation         │  │
    │  │  - OpenRouter (50+ models)                 │  │
    │  │  - Google Vertex AI                        │  │
    │  │  - AWS Bedrock                             │  │
    │  └────────────────────────────────────────────┘  │
    │  ┌────────────────────────────────────────────┐  │
    │  │ GENERATIVE: Fal.ai (images/video)          │  │
    │  │  - Primary: Flux, DALL-E, Kling            │  │
    │  │  - Fallback: OpenRouter                    │  │
    │  └────────────────────────────────────────────┘  │
    └──────────────────────────────────────────────────┘
              │
    ┌─────────┴────────────────────────────────────────┐
    │          PERSISTENCE LAYER                       │
    │  ┌───────────────┐  ┌──────────────────┐         │
    │  │ PostgreSQL    │  │ Redis            │         │
    │  │ (user data,   │  │ (sessions,       │         │
    │  │ conversations)│  │ cache, rate      │         │
    │  │               │  │ limits, memory)  │         │
    │  └───────────────┘  └──────────────────┘         │
    └──────────────────────────────────────────────────┘
              │
    ┌─────────┴────────────────────────────────────────┐
    │       OBSERVABILITY & MONITORING                 │
    │  Prometheus→Grafana, CloudTrace, Sentry          │
    └──────────────────────────────────────────────────┘

```

## 1.2 Deployment Architecture

### Phase 1: MVP (Feb 14 - Mar 31)

**Deployment Model**: Serverless-first with hybrid fallback

```yaml
Environment: Google Cloud Run (primary) + Vercel (frontend)
Rationale:
  - Cloud Run: Stateless container execution, autoscaling, pay-per-request
  - Vercel: Edge caching for frontend, instant global distribution
  - Cold start acceptable initially (<1s), optimize later if needed

Services:
  - API Gateway (Cloud Run) → 512MB RAM, 2 concurrent requests min
  - Memory Service (Cloud Run) → 1GB RAM for context management
  - Voice Router (Cloud Run) → 2GB RAM, WebSocket support
  - Frontend (Vercel) → Static + edge functions
  - PostgreSQL (Cloud SQL) → Single zone, 2GB initially
  - Redis (Cloud Memorystore) → 1GB, basic cache

```

### Phase 2: ULTRA Growth (Apr - Jun)

**Scale to multi-region, add advanced features**

```yaml
Environment: Kubernetes (GKE) + Cloud Run hybrid
Reason:
  - Transition to stateful + event-driven hybrid
  - Regional failover for reliability
  - Long-running agents require persistent containers

Infrastructure:
  - GKE cluster (2-3 nodes, autoscale to 10)
  - Cloud Run for HTTP API (horizontal scaling)
  - Cloud Tasks for async jobs
  - Pub/Sub for event streaming
  - PostgreSQL (Cloud SQL HA, failover replica)
  - Redis Cluster (5-node for HA)

```

### Phase 3: Enterprise (Jul+)

**VPC isolation, compliance, on-prem readiness**

```yaml
Environment: GKE + self-managed Kubernetes
  - Private GKE cluster with VPC-native networking
  - Option: On-prem Kubernetes (self-hosted or kubeadm)
  - Database: Managed or self-hosted PostgreSQL (private network)
  - Compliance: Network isolation, encryption at rest + transit

```

---

## 1.3 Request Flow Examples

### Example 1: Multi-Model Chat (Text)

```
1. User types message in web app
2. Client sends POST /api/chat {model: "preferred", text: "...", memory_id}
3. API Gateway (Cloud Run):
   - Validates auth token (Firebase/Clerk)
   - Checks rate limit (Redis)
   - Looks up memory context (PostgreSQL + Redis cache)
   - Logs request with cost tags
4. Text Routing Engine:
   - Determines request complexity (token count, instruction depth)
   - Routes to:
     * Simple queries → GPT-4o mini ($0.00015/1k tokens) → fastest
     * Complex → GPT-5 ($0.10/1k tokens) or Claude 3.5 Sonnet
     * Cost-conscious? → DeepSeek via OpenRouter
   - Executes with timeout (30s initial, 90s for streaming)
5. Response Streaming:
   - Stream tokens back as Server-Sent Events (SSE)
   - First token latency: ~500ms (direct API) → 1s (routing overhead)
6. Post-processing:
   - Store conversation in PostgreSQL
   - Extract entities for memory (async via Pub/Sub)
   - Log cost to usage tracker
   - Update user token count
7. Response delivered token-by-token (streaming complete in ~3-5s)

```

### Example 2: Voice Chat (Real-time)

```
1. User enables voice, speaks: "What's my Q3 revenue trend?"
2. Client initiates WebSocket to /ws/voice?room_id&auth_token
3. Cloud Run (WebSocket handler):
   - Opens persistent connection
   - Collects audio chunks (100ms intervals)
4. Voice Router (async task):
   - STT: Whisper API (via OpenAI/Azure) → text (200-300ms)
   - LLM: Route text through Text Router → response
   - TTS: Via OpenAI or ElevenLabs → audio (300-400ms per chunk)
5. Audio Stream:
   - Sends audio chunks back over WebSocket as soon as ready
   - User hears first response in ~500-700ms total
   - Response "barge-in" supported: user can interrupt
6. Latency breakdown:
   - Audio capture: 100-200ms
   - STT: 200-300ms
   - LLM: 500-2000ms (depends on complexity)
   - TTS: 100-500ms (per sentence)
   - Total (first response): ~300-500ms
   - Streaming TTS delivers while LLM still generating

```

### Example 3: Parallel Multi-Model Broadcast (ULTRA only)

```
1. User enables "multi-model compare" for important decisions
2. Client sends POST /api/chat/multi-model {text, compare_models: [gpt5, claude, deepseek]}
3. Parallel execution:
   - Model 1 (GPT-5): Execute immediately
   - Model 2 (Claude 3.5 Sonnet): Execute in parallel
   - Model 3 (DeepSeek via OpenRouter): Execute in parallel
   - Timeout: 30s, return as soon as 1st arrives
4. Aggregation:
   - Display results side-by-side
   - Memory Inspector: synthesize key differences
5. Cost attribution:
   - Each model call logged separately
   - $X per GPT-5, $Y per Claude, $Z per DeepSeek

```

---

## 1.4 Scalability Guarantees

### Traffic Spike Handling

| Scenario | Current | Auto-Scale | Time to Scale | Cost Impact |
| --- | --- | --- | --- | --- |
| 100→1,000 users | Cloud Run (2-5 instances) | 5-30 instances | 30-60 seconds | +400% compute |
| 1,000→10,000 users | GKE cluster (2 nodes) | Autoscale to 8-10 nodes | 2-3 minutes | +300% compute |
| API provider outage | Direct → Fallback | Switch to OpenRouter | <100ms latency | -20% cost (cheaper model) |
| Regional failure | Single region | Failover to backup region | <2 minutes | +50% cost (temp) |

### Cost Scaling Model

```yaml
Fixed Costs (Monthly):
  - Cloud SQL (PostgreSQL): $50-100
  - Cloud Memorystore (Redis): $30-50
  - Cloud Run (low baseline): $5-20
  - Monitoring (Prometheus/Grafana): $20-50
  - Domain + SSL: $1-10
  ────────────────────────
  Total Fixed: ~$150-250/month

Variable Costs (per million API calls):
  - Model API: $5,000-15,000 (depends on model mix)
  - Compute (Cloud Run): $1,000-3,000
  - Storage: <$100
  - Bandwidth egress: $100-500
  ────────────────────────
  Total Variable: ~$6-18k per million calls

Day 1 projection (50 users × 10 req/day):
  - Fixed: $200
  - Variable: ~$10 (50k calls × $0.0002-0.0003)
  - Total: ~$210/month

Day 30 projection (500 users × 50 req/day):
  - Fixed: $250
  - Variable: ~$500 (750k calls)
  - Total: ~$750/month

Day 90 projection (2,500 users):
  - Fixed: $300
  - Variable: ~$2,500
  - Total: ~$2,800/month

```

---

# PART 2: PAYMENT, LEGAL & INCORPORATION

## 2.1 Payment Processor Comparison: Polar vs Alternatives

### Option A: Polar (RECOMMENDED)

**Status**: ✅ Working with Turkish entities

```yaml
Supported:
  - Turkish LLC / Şirket (official Turkish entity)
  - EU entities (Estonian Ou, UK Ltd)
  - Delaware C-Corp (via US tax ID)

Pricing:
  - Base fee: 5% of transaction value
  - No setup fee
  - Payout: 7-30 days

Currencies:
  - Primary: USD, EUR, TRY (Turkish Lira)
  - Add-on: GBP, CHF
  - PAYOUTS: Direct to Turkish bank accounts

Features:
  - Subscription billing ✅
  - Usage-based billing ✅
  - Revenue recognition ✅
  - Webhook support ✅
  - Fraud detection ✅

Integration:
  - API + hosted pages available
  - Zapier / Make.com ready
  - Webhook -> PostgreSQL easy

Pros:
  - Supports Turkish business directly (no foreign entity needed)
  - EU-friendly (GDPR-ready)
  - Payout in TRY possible
  - Developer-friendly API
  - No monthly minimums

Cons:
  - Less historical precedent (newer than Stripe)
  - Integration support slower than Stripe
  - No native mobile SDK (use API)

Recommendation: PRIMARY CHOICE for February launch

```

### Option B: Stripe (with workaround)

**Status**: ⚠️ Turkey not supported as entity location, BUT...

```yaml
Workaround 1: Stripe Atlas (Delaware C-Corp)
  - Create US C-Corp via Atlas ($500 + legal fees ~$2,000)
  - Get US EIN (Employer ID)
  - Stripe accepts as merchant
  - Payout to US bank (then transfer to Turkey via Wise)
  
  Pros:
    - Full Stripe ecosystem (most mature)
    - Fastest payment processing
    - Better fraud tools
    - Widely used standard
  
  Cons:
    - High setup cost ($2,500-3,000)
    - C-Corp requires US tax filing
    - Annual fees (accountant ~$1,500/year)
    - Turkey to US to Turkey payout (fees, FX)

Workaround 2: Stripe + MoR (Merchant of Record)
  - Use Paddle, FastSpring, or Lemon Squeezy
  - They handle Stripe integration
  - You're the vendor, they're MoR
  
  Cons:
    - Higher fees (8-10% vs 5%)
    - Less control over customer data
    - Webhook complexity

Recommendation: Skip for now, revisit after Enterprise tier launch

```

### Option C: Wise Business + Paddle Combo

**Status**: ✅ Works, moderate fees

```yaml
Wise Business Account:
  - Set up USD, EUR accounts (receive payments)
  - Transfer to TRY automatically
  - Conversion at live rate
  
Paddle (as payment processor):
  - 8% fee (includes Stripe processing)
  - Payout to Wise USD account
  - Wise converts to TRY
  
Total cost: ~9.5% all-in
Simpler than C-Corp but pricier

Recommendation: Backup option if Polar integration stalls

```

### Final Recommendation: POLAR + WISE

```
Setup Timeline:
  Week 1: Register with Polar (24-48 hour approval)
  Week 2: Set up Wise Business for TRY payout (backup)
  Week 3: Build Polar integration (SDK or REST API)
  
Implementation:
  - Frontend: Polar hosted checkout or API
  - Backend: Stripe-like webhook handling
  - Success: Async webhook → update PostgreSQL
  - Webhook secret stored in .env (hashed in vault)
  
Migration path:
  Month 6: If scaling beyond Turkey, add Stripe
  Month 12: If enterprise customers need Stripe, add Paddle as MoR

```

---

## 2.2 Business Entity Strategy

### Scenario 1: Staying Turkish (Recommended for MVP)

```
Entity: Türkiye Limited Şirket (LLC equivalent)
Setup time: 1-2 weeks
Cost: ~$500-1,000 (admin fees)

Pros:
  - Work locally, no complications
  - Polar accepts directly
  - Turkish bank account easy
  - Tax advantages (tech startup incentive exists)
  - Local accountant: $500-1000/year

Cons:
  - Harder to raise venture capital (most VCs prefer US/EU)
  - No international expansion infrastructure built-in
  - Currency risk (all expenses in USD, revenue in TRY+USD)

Path to C-Corp later:
  - Turkish LLC survives alongside US C-Corp
  - Or liquidate and move to C-Corp (tax planning needed)

Taxes:
  - Corporate tax: 19%
  - VAT: 18% (apply for exemption as startup)

```

### Scenario 2: Estonia Ou (Recommended for later)

```
Entity: Estonia Online Company (Estee residency)
Setup time: 1 day (digital)
Cost: €100-300

Pros:
  - Stripe supports Estonia ✅
  - EU banking easy
  - GDPR-native operations
  - Visa advantage (US/EU investors comfortable)
  - Profitable at scale (0% corporate tax if profits not distributed)

Cons:
  - Must establish EU tax residency (not Turkish)
  - Bank account requires EU residency or agent
  - Need EU address for contracts

Timing: Start after proof of product market fit (Month 3-4)

```

### Scenario 3: Delaware C-Corp (Venture track)

```
Entity: Delaware C-Corp (via Stripe Atlas or lawyer)
Setup time: 2-3 weeks (Atlas), 4-6 weeks (lawyer)
Cost: $500-2,500 (Atlas), $5,000-10,000 (lawyer)

Pros:
  - Standard for VC fundraising
  - IP protection (Delaware law)
  - Stripe, Stripe Atlas, Mercury banking automatic
  - Visa advantage
  - Investor familiar

Cons:
  - US tax compliance (accountant ~$2,500-5,000/year)
  - Requires US address or registered agent (~$150/year)
  - FATCA reporting if you're non-US founder
  - Must file annual taxes (even if no revenue yet)

Timing: Start if/when raising Seed round (Month 6+)

```

### Recommended Path

```
Feb 14 (MVP Launch):
  Entity: Turkish LLC (fast, operational)
  Payment: Polar
  Banking: Turkish bank + Wise USD account
  
May 1 (Product validation):
  Add: Estonia Ou (opens EU expansion)
  Keep: Turkish LLC (local ops)
  Payment: Polar + Stripe (when EU customers arrive)
  
Aug 1 (If seeking funding):
  Add: Delaware C-Corp (via Stripe Atlas, $500)
  Mirror: Turkish LLC operations to US corp (with tax planning)
  Payment: Stripe primary, Polar secondary
  
Transition cost: ~$3,500 over 6 months
Annual cost: $1,500-3,000 (accountants + filing)

```

---

## 2.3 Currency & International Payments

### Currency Support at Launch (Feb 14)

```yaml
Tier 1 (Day 1):
  - USD (USD): Polar → backend, all costs
  - TRY (Turkish Lira): Polar → local payouts
  - EUR (Euro): Polar → EU expansion ready

Payment Flows:
  US Customer: $49 → Polar → USD account
  Turkish Customer: 1,500 TRY → Polar → TRY account (payout) or USD account
  EU Customer: €45 (~$49) → Polar → EUR account (Month 3)

Pricing Strategy:
  - USD: $49 PRO, $129 ULTRA (list price)
  - TRY: Dynamic pricing based on USD/TRY (monthly refresh)
    * $49 ≈ 1,650 TRY (at 1:33 rate)
    * Set at 1,499 TRY (psychological pricing below 1,500)
  - EUR: €45 PRO, €119 ULTRA (Month 3)

Backend:
  - All costs in USD (model APIs, cloud)
  - Revenue collected in multiple currencies
  - Daily FX rate pull (Wise API or Polygon)
  - Regional P&L reporting

Add Later (Month 3+):
  - GBP (UK customers)
  - JPY (Japan customers)
  - CNY (China customers) - only if partnership model (avoid direct CNY)
  - INR (India customers)

Tools:
  - Wise API for FX rates + holds
  - Polar webhooks → PostgreSQL (transaction log)
  - Accounting: Wave, Xero, or Freshbooks (multi-currency)

```

---

# PART 3: API STRATEGY & MODEL ROUTING

## 3.1 Direct API Integration (Primary)

### OpenAI (ChatGPT, GPT-5)

```yaml
Models:
  - GPT-5 ($0.10/1k input, $0.40/1k output)
  - GPT-4o ($0.005/1k input, $0.015/1k output) [fallback]
  - GPT-4o mini ($0.00015/1k input, $0.0006/1k output) [cheap]

Integration:
  - REST API to api.openai.com/v1/chat/completions
  - Streaming: Server-Sent Events with `stream: true`
  - Auth: Bearer token in X-API-Key header
  - Timeout: 30s (streaming: 90s)
  
Costs (per 1M PRO users at 5 req/day):
  - GPT-4o: ~$3,000/month
  - Mix (50% mini, 50% 4o): ~$2,000/month

Implementation:
  - Caching: Use Prompt Caching for repeated system prompts (-50% cost)
  - Batching: Non-urgent analysis → Batch API (-50% cost)
  - Fallback: GPT-4o mini if timeout (automatic)


```

### Anthropic (Claude)

```yaml
Models:
  - Claude 3.5 Sonnet ($3/$15 per 1M tokens)
  - Claude 3 Opus ($15/$45) [expensive, skip]
  - Claude 3 Haiku ($0.80/$4) [cheap, multimodal]

Integration:
  - REST API to api.anthropic.com/v1/messages
  - Streaming: Event-stream format (slightly different from OpenAI)
  - Auth: x-api-key header
  - Model: claude-3-5-sonnet-20241022

Cost Management:
  - Use for: Complex reasoning, long context (200k tokens)
  - Fallback to: OpenAI GPT-4o for simple queries
  

```

### Google Gemini

```yaml
Models:
  - Gemini 2.0 Flash ($0.075/1M input, $0.30/1M output)
  - Gemini 1.5 Pro ($1.25/$5 per 1M tokens)

Integration:
  - Vertex AI API (goog cloud) - requires Google Cloud project
  - Or Google AI Studio (simpler for MVP)
  - Streaming: Server-Sent Events

Use case:
  - Free tier: 15 requests/minute
  - Good for: Multimodal (images + text)
  - Cost advantage: Extremely cheap for volume


```

### xAI Grok

```yaml
Models:
  - Grok 3 (~$0.06/1k tokens, estimated)

Integration:
  - API endpoint: TBA (xAI not yet public API, expected Feb 2025)
  - Plan: Add if public API available at launch
  - Otherwise: Access via OpenRouter fallback

Strategy:
  - Watch for API release
  - Position for: Real-time data + reasoning hybrid
  - Integrate after MVP if proven cost advantage


```

## 3.2 Fallback Router Integration (Secondary)

### OpenRouter (50+ models)

```yaml
Advantages:
  - Single API for: OpenAI, Anthropic, Mistral, DeepSeek, etc.
  - 50+ open-source + proprietary models
  - Routing: Automatic failover if primary fails
  - Cost: Sometimes cheaper (e.g., DeepSeek $0.00055/1k)

Models via OpenRouter:
  - DeepSeek-R1 (cheap reasoning)
  - Mistral Large (good balance)
  - Llama 3.1 (open, can self-host later)
  - Qwen (great for code)

Implementation:
  - API endpoint: openrouter.ai/api/v1/chat/completions
  - SDK: OpenAI SDK compatible (drop-in replacement!)
  - Cost tracking: Required (billing shared by providers)

Strategy:
  - Use for: Cost-sensitive routing
  - Fallback: If OpenAI/Anthropic down
  - Experiment: Test models before committing


```

### Google Vertex AI (Bedrock alternative)

```yaml
Why: AWS/GCP customers expect it, enterprise-grade

Models:
  - Gemini via Vertex
  - Custom fine-tuned models later

Routing:
  - Primary: Direct Google API
  - Fallback: Vertex AI if main API degraded

Setup: Low priority for MVP, add Month 2


```

### AWS Bedrock

```yaml
When to use:
  - Enterprise customers on AWS (Month 6+)
  - Anthropic models via Bedrock (sometimes cheaper)

Setup: Optional for MVP, add only if customer demand


```

## 3.3 Generative Models (Image & Video)

### Fal.ai (PRIMARY)

```yaml
Why Fal.ai:
  - Fastest image generation (Flux, DALL-E)
  - Video generation (Kling-powered)
  - Simple queue-based API
  - Good reliability

Models:
  - Flux (fastest text-to-image)
  - DALL-E 3 (via Fal)
  - Kling (video, 5s clips)

Pricing:
  - Flux: ~$0.02-0.04 per image
  - Video: ~$0.20-0.50 per 5s clip

Implementation:
  - REST API: simple POST + poll for result
  - Queue model: wait for async generation
  - Webhook: optional for completion notification


```

### Fallback: OpenRouter

```yaml
If Fal.ai down:
  - Route to Mistral Pixtral (images)
  - DeepInfra Flux (images)
  - Skip video (no good open fallback yet)

Setup: Configure in OpenRouter adapter


```

## 3.4 Voice / TTS Integration

### Speech-to-Text (STT)

```yaml
Primary: OpenAI Whisper API
  - Model: whisper-1
  - Cost: $0.02 per minute
  - Latency: 2-5 seconds
  - Languages: 99 languages

Fallback: Google Cloud Speech-to-Text
  - Cost: $0.024 per 15 seconds
  - Latency: 1-2 seconds
  - Better for: Non-English languages

Implementation:
  - WebSocket receives audio chunks (100ms)
  - Buffer to 500ms minimum
  - Send to STT API with context
  - Return transcript immediately

Optimization:
  - VAD (Voice Activity Detection): Use Silero VAD (local)
  - Skip silence before sending to API (-50% cost)
  - Cache repeated phrases
  

```

### Text-to-Speech (TTS)

```yaml
Primary: OpenAI TTS
  - Model: tts-1 (fast, lower quality)
  - Model: tts-1-hd (slower, higher quality)
  - Cost: $0.015 per 1k characters
  - Voices: 5 English + multilingual support
  - Latency: tts-1 ~200ms, tts-1-hd ~1s

Fallback: ElevenLabs
  - Cost: ~$0.30 per 1k characters (premium)
  - Latency: 300-500ms
  - Better quality/naturalness
  - More voices (29+ languages)

Alternative: Google Cloud Text-to-Speech
  - Cost: $16 per 1M characters
  - Latency: 500-1000ms
  - Natural sounding

Implementation:
  - Stream LLM output sentence by sentence
  - Send each sentence to TTS while LLM generating next
  - Queue audio chunks, send over WebSocket as ready
  - User hears response in real-time

Latency target:
  - First response audio: 300-500ms from user finishing
  - Continuous streaming as more generated

Multi-language support (M3):
  - Send language code to TTS API
  - Voice model auto-adapts


```

## 3.5 Intelligent Routing Algorithm

```python
# Pseudo-code: Request Router

def route_request(user_request, user_tier, conversation_history):
    """
    Determine best model based on:
    - Request complexity (token count, reasoning needed)
    - Cost budget (user tier, monthly spend)
    - Latency requirement (real-time vs background)
    - Model availability (fallback if primary down)
    """
    
    # Step 1: Classify request complexity
    tokens = estimate_tokens(user_request)
    requires_reasoning = analyze_query_type(user_request)
    
    if requires_reasoning and tokens > 1000:
        # Complex multi-step reasoning
        score = 'COMPLEX'
    elif tokens > 500:
        score = 'MEDIUM'
    else:
        score = 'SIMPLE'
    
    # Step 2: Cost budget check
    user_spend_today = get_user_daily_spend(user.id)
    daily_budget = user.tier.daily_budget  # PRO: $10, ULTRA: $30
    remaining = daily_budget - user_spend_today
    
    if remaining < 0.50:
        # Critical: use cheapest model
        return route_to_cheapest()  # DeepSeek via OpenRouter
    
    # Step 3: Model selection by complexity
    if score == 'COMPLEX':
        if remaining > 2.00:
            return 'claude-3-5-sonnet'  # $3 per 1M tokens
        else:
            return 'gpt-4o'  # fallback
    
    elif score == 'MEDIUM':
        if user.tier == 'ULTRA':
            return 'gpt-5'  # prefer for ULTRA
        else:
            return 'gpt-4o'  # balance cost/quality
    
    elif score == 'SIMPLE':
        return 'gpt-4o-mini'  # $0.00015 per 1k tokens
    
    # Step 4: Fallback handling
    try:
        response = call_primary_model(selected_model, user_request)
        return response, selected_model, cost
    
    except APIError as e:
        if e.code == 'RATE_LIMIT':
            return route_to_fallback('rate_limited')  # OpenRouter cheaper variant
        elif e.code == 'UNAVAILABLE':
            return route_to_fallback('unavailable')  # Backup provider
        else:
            raise

def route_to_cheapest():
    """Route to DeepSeek for cost-critical users"""
    return openrouter_call('deepseek-chat', user_request)

def route_to_fallback(reason):
    """Automatic failover"""
    if reason == 'rate_limited':
        return openrouter_call('mistral-large')  # Different provider
    elif reason == 'unavailable':
        return openrouter_call('llama-3.1-70b')  # Open model

```

## 3.6 Caching Strategy (Cost Savings 30-50%)

```yaml
Layer 1: Response-level Cache (Redis)
  - Cache identical prompts for 24 hours
  - Key: hash(model + prompt + temperature + top_p)
  - TTL: 24 hours
  - Savings: ~5-10% of requests (repeated queries)
  - Implementation: Check Redis before API call

Layer 2: Embedding Cache (Vector Database)
  - Cache embeddings of documents for RAG
  - Key: hash(document_id + model)
  - TTL: 7 days (or until document updates)
  - Savings: ~30% on document processing
  - Tool: Pinecone or Qdrant (self-hosted)

Layer 3: Prompt Caching (OpenAI native)
  - Use OpenAI's Prompt Caching for long documents
  - First request: full cost
  - Cached requests: -90% cost on context
  - TTL: 5 minutes
  - Savings: ~40% for document analysis workflows

Layer 4: Batch API (OpenAI native)
  - Group non-urgent requests into batches
  - Execute at off-peak hours
  - Cost: -50%
  - Latency: 12-24 hours
  - Use for: Background analysis, summaries, reports
  - Implementation: Queue system (Pub/Sub) + cron job

Example Cost Savings:
  - Without cache: 1,000 requests × $0.01 = $10
  - With Response Cache: 900 uncached × $0.01 + 100 × $0.001 = $9.10 (9% saving)
  - With Embedding Cache + Document RAG: Same 1k requests = $7 (30% saving)
  - With Prompt Cache (docs): = $6 (40% saving)
  - With Batch API (background): = $3 (50% saving on batch portion)

Implementation Priority:
  1. Response Cache (Redis) - Week 1
  2. Batch API integration - Week 2
  3. Prompt Caching - Week 3
  4. Vector database - Month 2

```

---

# PART 4: REAL-TIME VOICE ARCHITECTURE

## 4.1 Voice Pipeline (End-to-End)

```
User speaks (browser)
    ↓
Microphone → PCM 16kHz mono (streaming)
    ↓
WebSocket → Server (buffered at 100ms chunks)
    ↓
VAD (Voice Activity Detection) - local on server
  - Skip silence (save STT cost)
    ↓
STT (Whisper API)
  - 200-300ms latency
  - Return: { text, confidence, language }
    ↓
Text Router (model selection)
  - Complexity check
  - Cost check
  - Route to: GPT-5 / Claude / etc.
    ↓
LLM Response Generation
  - Stream tokens as available
  - Latency: 500-2000ms (depends on response length)
    ↓
TTS (text → audio)
  - Stream sentence by sentence
  - Each sentence: 200-500ms
  - Latency: ~300ms per sentence
    ↓
Audio Playback (browser)
  - Queue audio chunks
  - Play as they arrive
  - Total latency from user finish: 300-700ms
    ↓
Barge-in (interruption)
  - User speaks while AI speaking
  - VAD detects new speech
  - Kill LLM + TTS stream
  - Restart STT for new query

```

## 4.2 WebSocket Implementation

### Server-side (Node.js + Express-ws)

```javascript
import express from 'express';
import WebSocket from 'ws';
import { Readable } from 'stream';
import { OpenAI } from 'openai';
import Vad from 'node-vad';  // Silero VAD

const app = express();
const wss = new WebSocket.Server({ noServer: true });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// WebSocket handler for voice chat
wss.on('connection', async (ws, req) => {
  const userId = req.query.user_id;
  const sessionId = req.query.session_id;
  
  console.log(`[Voice] User ${userId} connected`);
  
  // State management
  let audioBuffer = [];
  let isProcessing = false;
  let llmAbortController = null;
  
  // Initialize VAD
  const vad = new Vad(Vad.models.DEFAULT);
  
  ws.on('message', async (data) => {
    // Receive audio chunk (binary)
    if (Buffer.isBuffer(data)) {
      audioBuffer.push(data);
      
      // Check for voice activity every 500ms
      if (audioBuffer.length >= 5) {  // 5 × 100ms = 500ms buffer
        const combinedAudio = Buffer.concat(audioBuffer);
        
        vad.process(combinedAudio, (err, activity) => {
          if (activity > 0.9) {  // 90% confidence: speech detected
            // Flush: combined audio likely complete phrase
            processUserAudio(combinedAudio);
            audioBuffer = [];
          }
        });
      }
    } else if (data.type === 'END_OF_AUDIO') {
      // Explicit end-of-audio from client
      const finalAudio = Buffer.concat(audioBuffer);
      processUserAudio(finalAudio);
      audioBuffer = [];
    }
  });
  
  async function processUserAudio(audioData) {
    if (isProcessing) return;  // Debounce
    isProcessing = true;
    
    try {
      // Step 1: STT (Speech-to-Text)
      console.log(`[Voice] STT: Starting for ${audioData.length} bytes`);
      
      const transcriptionStart = Date.now();
      const transcript = await openai.audio.transcriptions.create({
        file: audioData,
        model: 'whisper-1',
        language: 'en',
      });
      
      const sttLatency = Date.now() - transcriptionStart;
      console.log(`[Voice] STT: "${transcript.text}" (${sttLatency}ms)`);
      
      // Send transcript to client immediately
      ws.send(JSON.stringify({
        type: 'TRANSCRIPTION',
        text: transcript.text,
        latency_ms: sttLatency,
      }));
      
      // Step 2: LLM (get response)
      console.log(`[Voice] LLM: Routing "${transcript.text}"`);
      
      llmAbortController = new AbortController();
      
      // Get conversation context
      const context = await getConversationContext(userId, sessionId);
      
      const llmStart = Date.now();
      const stream = openai.beta.realtime.sessions.create({
        model: 'gpt-4o',
        instructions: context.systemPrompt,
        voice: 'alloy',
        input_audio_format: 'pcm16',
        output_audio_format: 'pcm16',
      });
      
      let fullResponse = '';
      let lastAudioChunk = null;
      
      for await (const event of stream) {
        // Handle interruption
        if (llmAbortController.signal.aborted) break;
        
        if (event.type === 'response.audio.delta') {
          // Audio chunk ready
          lastAudioChunk = event.delta;
          ws.send(JSON.stringify({
            type: 'AUDIO_DELTA',
            audio: event.delta,  // Base64 encoded
            latency_ms: Date.now() - llmStart,
          }));
        }
        
        if (event.type === 'response.text.delta') {
          // Text chunk
          fullResponse += event.delta;
          ws.send(JSON.stringify({
            type: 'TEXT_DELTA',
            text: event.delta,
          }));
        }
        
        if (event.type === 'response.done') {
          console.log(`[Voice] LLM: Response complete (${Date.now() - llmStart}ms)`);
          
          // Store conversation
          await storeConversation(userId, sessionId, {
            user: transcript.text,
            assistant: fullResponse,
            timestamp: new Date(),
          });
        }
      }
    } catch (err) {
      console.error(`[Voice] Error: ${err.message}`);
      ws.send(JSON.stringify({
        type: 'ERROR',
        message: err.message,
      }));
    } finally {
      isProcessing = false;
    }
  }
  
  // Interruption handling
  ws.on('message', (data) => {
    if (data === 'INTERRUPT') {
      console.log(`[Voice] User interrupted`);
      if (llmAbortController) {
        llmAbortController.abort();
      }
      audioBuffer = [];
      isProcessing = false;
    }
  });
  
  ws.on('close', () => {
    console.log(`[Voice] User ${userId} disconnected`);
  });
});

// Attach WebSocket to HTTP server
const server = app.listen(3000);
server.on('upgrade', (req, socket, head) => {
  if (req.url === '/ws/voice') {
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit('connection', ws, req);
    });
  }
});

```

### Client-side (React)

```typescript
import React, { useState, useRef, useEffect } from 'react';

const VoiceChat: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  
  useEffect(() => {
    // Initialize WebSocket connection
    const ws = new WebSocket(
      `ws://localhost:3000/ws/voice?user_id=${userId}&session_id=${sessionId}`
    );
    
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      
      switch (message.type) {
        case 'TRANSCRIPTION':
          setTranscript(message.text);
          break;
        case 'AUDIO_DELTA':
          // Decode and play audio chunk
          playAudioChunk(message.audio);
          break;
        case 'TEXT_DELTA':
          setResponse(prev => prev + message.text);
          break;
        case 'ERROR':
          alert(`Error: ${message.message}`);
          break;
      }
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    wsRef.current = ws;
    
    return () => ws.close();
  }, []);
  
  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    // Set sample rate to 16kHz
    const audioContext = new AudioContext({ sampleRate: 16000 });
    audioContextRef.current = audioContext;
    
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'audio/webm',
    });
    
    mediaRecorder.ondataavailable = (event) => {
      // Send audio chunk over WebSocket
      wsRef.current?.send(event.data);
    };
    
    mediaRecorder.start(100);  // Emit data every 100ms
    mediaRecorderRef.current = mediaRecorder;
    setIsRecording(true);
  };
  
  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    
    // Signal end of audio
    wsRef.current?.send(JSON.stringify({
      type: 'END_OF_AUDIO',
    }));
  };
  
  const interrupt = () => {
    wsRef.current?.send('INTERRUPT');
    setResponse('');
  };
  
  const playAudioChunk = (base64Audio: string) => {
    const audioContext = audioContextRef.current;
    if (!audioContext) return;
    
    const binaryString = atob(base64Audio);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    audioContext.decodeAudioData(bytes.buffer, (buffer) => {
      const source = audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContext.destination);
      source.start();
    });
  };
  
  return (
    <div className="voice-chat">
      <h2>Voice Assistant</h2>
      
      <div className="controls">
        {!isRecording ? (
          <button onClick={startRecording}>🎤 Start Recording</button>
        ) : (
          <>
            <button onClick={stopRecording}>⏹ Stop Recording</button>
            <button onClick={interrupt}>⏸ Interrupt</button>
          </>
        )}
      </div>
      
      {transcript && (
        <div className="transcript">
          <strong>You:</strong> {transcript}
        </div>
      )}
      
      {response && (
        <div className="response">
          <strong>Assistant:</strong> {response}
        </div>
      )}
    </div>
  );
};

export default VoiceChat;

```

## 4.3 Voice Latency Optimization

```yaml
Target: First audio response in 300-500ms

Breakdown:
  Audio capture + transmission: 100-150ms
  VAD + STT: 200-300ms
  LLM inference: 500-2000ms (depends on response)
  TTS: 200-500ms (per sentence)
  Network + audio decode: 50-100ms
  
Actual: ~300-500ms for simple responses

Optimization techniques:
  1. VAD locally (skip silence before upload)
      - Saves 200-300ms STT latency
      
  2. Stream TTS sentence-by-sentence
      - First sentence plays while LLM generating next
      - Perceived latency: First TTS chunk time (~200ms)
      
  3. Use tts-1 not tts-1-hd
      - Saves 500-800ms per sentence
      
  4. GPT-4o mini for simple queries (faster than Claude)
      - Saves 300-500ms LLM time
      
  5. Streaming LLM output
      - Don't wait for full response before TTS
      - Send "I'm analyzing..." while processing
      
Target after optimizations: 200-300ms first response (impressive)

```

---

# PART 5: AUTHENTICATION & AUTHORIZATION

## 5.1 OAuth2 Strategy

### Primary: Multi-provider OAuth2

```yaml
Providers (Priority):
  1. Google Sign-In
      - 70% of users expected
      - Fast, reliable
      - Setup: OAuth Credentials from console.cloud.google.com
      
  2. GitHub Sign-In
      - 20% of developers expected
      - Setup: OAuth App from github.com/settings/developers
      
  3. Apple Sign-In
      - 5% of iOS users
      - Setup: Apple Developer account + certificate
      
  4. Facebook Sign-In
      - 3% fallback
      - Setup: Meta Developer account
      
  5. Email/Password (Optional, low priority)
      - For non-OAuth users
      - Use Firebase Auth or custom with bcrypt

Implementation: Firebase Authentication or Clerk

```

### Option A: Firebase Authentication (Recommended for MVP)

```yaml
Why Firebase:
  - Zero-config OAuth (Google, Facebook, Apple, GitHub)
  - Free tier: 50k MAU (users per month)
  - Social sign-in built-in
  - No backend auth code needed

Setup (30 minutes):
  1. Create Firebase project
  2. Enable Google Sign-In (1 click)
  3. Enable GitHub Sign-In (paste credentials)
  4. Add Firebase SDK to React app
  5. Implement login button

Code Example:
  import { initializeApp } from 'firebase/app';
  import { getAuth, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
  
  const app = initializeApp({
    apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
    authDomain: 'aspendos.firebaseapp.com',
    projectId: 'aspendos-12345',
  });
  
  const auth = getAuth(app);
  const provider = new GoogleAuthProvider();
  
  const handleLogin = async () => {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    console.log('Logged in:', user.uid, user.email);
    
    // Send ID token to backend
    const token = await user.getIdToken();
    // Store in PostgreSQL
  };

Cost: Free up to 50k users/month, then $0.0055/user

Pros:
  - Fastest to MVP
  - No auth code to maintain
  - Automatic GDPR data deletion on user removal
  
Cons:
  - Firebase lock-in (migration hard later)
  - Limited customization

Migration path:
  - If outgrowing Firebase: Migrate to Clerk (compatible)
  - Or self-hosted: Auth0, Supabase


```

### Option B: Clerk (Recommended for scaling)

```yaml
Why Clerk:
  - All OAuth providers pre-integrated
  - Beautiful UI components
  - GDPR-ready
  - Better UX than Firebase

Setup (1 hour):
  1. Create Clerk project
  2. Enable providers (Google, GitHub, etc.)
  3. Copy Clerk SDK to React
  4. Wrap app with <ClerkProvider>

Code Example:
  import { ClerkProvider, SignInButton, UserButton } from '@clerk/clerk-react';
  
  function App() {
    return (
      <ClerkProvider publishableKey={process.env.REACT_APP_CLERK_PUBLISHABLE_KEY}>
        <SignInButton />
        <UserButton />
      </ClerkProvider>
    );
  }

Cost:
  - Free: up to 1,000 MAU
  - Pro: $25/month + $0.02/MAU over 1,000

Pros:
  - Better UX than Firebase
  - No lock-in (portable)
  - Enterprise SSO ready (for later)
  
Cons:
  - Pricier at scale
  - API calls may add latency

Transition plan:
  - MVP: Firebase (free, fast)
  - Month 3: Switch to Clerk (if growth confirmed)


```

## 5.2 JWT Token Strategy

```yaml
Token Flow:

1. User logs in via Google/GitHub → Firebase/Clerk
2. Frontend receives ID token (JWT)
3. Frontend sends request to API with header:
   Authorization: Bearer <ID_TOKEN>

4. Backend verifies token:
   - Check signature (using Google/Clerk public key)
   - Verify expiration
   - Extract user.uid
   
5. Backend looks up user in PostgreSQL:
   - Get user ID, subscription tier, memory access
   - Create session token (new JWT)
   
6. Return session token + user metadata
7. Frontend stores session token
8. All API calls use session token

Token Expiration:
  - ID token: 1 hour (auto-refresh via SDK)
  - Session token: 7 days (backend manages)
  - Refresh token: 30 days (silent refresh)

Implementation (Node.js):

const admin = require('firebase-admin');

app.post('/api/auth/verify', async (req, res) => {
  const idToken = req.headers.authorization.split(' ')[1];
  
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const uid = decodedToken.uid;
    
    // Look up user in PostgreSQL
    const user = await db.query(
      'SELECT * FROM users WHERE firebase_uid = $1',
      [uid]
    );
    
    if (!user.rows.length) {
      // New user: create record
      await db.query(
        'INSERT INTO users (firebase_uid, email, tier) VALUES ($1, $2, $3)',
        [uid, decodedToken.email, 'PRO']
      );
    }
    
    // Issue session token
    const sessionToken = jwt.sign(
      { uid, email: decodedToken.email },
      process.env.SESSION_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({ sessionToken, user: user.rows[0] });
  } catch (err) {
    res.status(401).json({ error: 'Unauthorized' });
  }
});

app.get('/api/chat', (req, res, next) => {
  const token = req.headers.authorization.split(' ')[1];
  
  try {
    const decoded = jwt.verify(token, process.env.SESSION_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Unauthorized' });
  }
});


```

## 5.3 Authorization (Tier-based access)

```yaml
Tier Capabilities:

PRO ($49/month):
  - 50 conversations/month limit
  - GPT-4o only (no multi-model broadcast)
  - 1 voice session/day
  - Shared memory (single context)
  - Image generation: Yes
  - Video generation: No

ULTRA ($129/month):
  - Unlimited conversations
  - All models (multi-model broadcast)
  - Unlimited voice sessions
  - Advanced memory (Memory Inspector)
  - Image + Video generation
  - API access (beta)

Enterprise (custom):
  - Custom limits
  - SSO / Team management
  - Custom SLA
  - On-prem option

Implementation:

// Middleware: Check tier
async function requireTier(req, res, next) {
  const user = await db.query(
    'SELECT tier FROM users WHERE id = $1',
    [req.user.uid]
  );
  
  req.tier = user.rows[0].tier;
  next();
}

// Route protection
app.post('/api/chat/multi-model', requireTier, (req, res) => {
  if (req.tier !== 'ULTRA') {
    return res.status(403).json({
      error: 'Multi-model requires ULTRA tier'
    });
  }
  // ... continue
});

// Usage tracking
async function trackUsage(userId, featureName, cost) {
  await db.query(
    `INSERT INTO usage_logs (user_id, feature, cost, timestamp)
      VALUES ($1, $2, $3, NOW())`,
    [userId, featureName, cost]
  );
  
  // Check daily budget
  const dailyUsage = await db.query(
    `SELECT SUM(cost) as total FROM usage_logs
      WHERE user_id = $1 AND DATE(timestamp) = CURRENT_DATE`,
    [userId]
  );
  
  const dailyBudget = 10;  // PRO: $10/day
  if (dailyUsage.rows[0].total > dailyBudget) {
    // Warn or block
    return { blocked: true, reason: 'daily_budget_exceeded' };
  }
}


```

---

# PART 6: MONITORING & OBSERVABILITY

## 6.1 Monitoring Stack (Prometheus + Grafana)

### Architecture

```yaml
Components:
  1. Prometheus (metrics collection)
      - Scrapes /metrics endpoints every 15s
      - Stores in time-series database
      - Retention: 15 days (adjust based on storage)
      
  2. Grafana (visualization)
      - Query Prometheus
      - Real-time dashboards
      - Alerting
      
  3. Application Instrumentation
      - Expose /metrics endpoint
      - Custom metrics for API latency, costs, etc.
      
  4. Log Aggregation (Optional but recommended)
      - Sentry (error tracking)
      - CloudLogging (GCP native)
      - ELK stack (if self-hosted)

Deployment:
  - Prometheus: Cloud Run + persistent disk
  - Grafana: Cloud Run or Kubernetes
  - Managed Option: Grafana Cloud ($50-150/month for startup)


```

### Application Instrumentation (Node.js)

```javascript
import express from 'express';
import prometheus from 'prom-client';

// Create metrics
const httpRequestDuration = new prometheus.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.1, 0.5, 1, 2, 5, 10],  // latency buckets
});

const modelApiLatency = new prometheus.Histogram({
  name: 'model_api_latency_seconds',
  help: 'Latency of model API calls',
  labelNames: ['model', 'status'],
  buckets: [0.5, 1, 2, 5, 10, 20],
});

const modelApiCost = new prometheus.Counter({
  name: 'model_api_cost_usd',
  help: 'Total cost of model API calls',
  labelNames: ['model', 'user_tier'],
});

const activeConnections = new prometheus.Gauge({
  name: 'active_websocket_connections',
  help: 'Number of active WebSocket connections',
});

const voiceChatDuration = new prometheus.Histogram({
  name: 'voice_chat_duration_seconds',
  help: 'Duration of voice chat sessions',
  labelNames: ['user_tier'],
  buckets: [10, 30, 60, 300, 900],
});

// Middleware: track HTTP requests
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    httpRequestDuration.labels(req.method, req.route?.path || req.path, res.statusCode).observe(duration);
  });
  
  next();
});

// Example: Track model API calls
async function callModelAPI(model, prompt) {
  const start = Date.now();
  
  try {
    const response = await openai.chat.completions.create({
      model,
      messages: [{ role: 'user', content: prompt }],
    });
    
    const duration = (Date.now() - start) / 1000;
    
    // Record metrics
    modelApiLatency.labels(model, 'success').observe(duration);
    
    const cost = calculateCost(model, response.usage);
    modelApiCost.labels(model, req.user.tier).inc(cost);
    
    return response;
  } catch (err) {
    const duration = (Date.now() - start) / 1000;
    modelApiLatency.labels(model, 'error').observe(duration);
    throw err;
  }
}

// Expose metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', prometheus.register.contentType);
  res.end(await prometheus.register.metrics());
});

// WebSocket metrics
wss.on('connection', (ws) => {
  activeConnections.inc();
  
  ws.on('close', () => {
    activeConnections.dec();
  });
});

// Voice session duration tracking
async function trackVoiceSession(userId, sessionDuration) {
  const tier = await getUserTier(userId);
  voiceChatDuration.labels(tier).observe(sessionDuration);
}

```

### Grafana Dashboards

```yaml
Dashboard 1: System Health
  - Request latency (p50, p95, p99)
  - Error rate by endpoint
  - Active user connections
  - Cloud Run instance count
  - CPU/Memory usage
  - Database connection pool

Dashboard 2: Model Performance
  - API latency by model
  - Cost per model
  - Success rate by model
  - Token usage breakdown
  - TTL to first token (important for streaming)

Dashboard 3: Voice Analytics
  - Active voice sessions
  - Average session duration
  - STT latency distribution
  - TTS latency distribution
  - End-to-end response time

Dashboard 4: Financial
  - Hourly revenue (by tier)
  - Hourly cost (model APIs + cloud)
  - Gross margin by tier
  - Daily active users
  - Churn indicators

Dashboard 5: Business Metrics
  - Signup rate (daily)
  - Conversion rate (free → paid)
  - LTV (lifetime value) estimate
  - CAC (customer acquisition cost)
  - Memory engagement (% using memory feature)
  - Multi-model adoption (% of ULTRA using broadcast)

Alert Rules:

1. Critical: Error rate > 5%
   Action: PagerDuty alert to on-call

2. Warning: P99 latency > 5s
   Action: Slack notification

3. Warning: Daily cost > $500 (unusual)
   Action: Slack alert to engineering

4. Critical: Model unavailable (0% success rate for 5 min)
   Action: Auto-failover triggered, alert

5. Warning: Memory usage > 80%
   Action: Scale up alert

```

---

## 6.2 Cost Tracking & Visibility

```yaml
Database schema:

CREATE TABLE cost_logs (
  id UUID PRIMARY KEY,
  user_id UUID,
  model_name VARCHAR,
  feature_name VARCHAR,
  cost_usd DECIMAL(10, 6),
  token_count INT,
  timestamp TIMESTAMP,
  api_provider VARCHAR,
  tier VARCHAR
);

CREATE TABLE daily_costs (
  date DATE,
  model VARCHAR,
  total_cost DECIMAL(12, 2),
  request_count INT,
  total_tokens INT
);

Queries:

1. Daily cost by model:
   SELECT model, SUM(cost_usd) FROM cost_logs
   WHERE DATE(timestamp) = CURRENT_DATE
   GROUP BY model;

2. Cost by user (check for abuse):
   SELECT user_id, SUM(cost_usd) FROM cost_logs
   WHERE DATE(timestamp) = CURRENT_DATE
   GROUP BY user_id
   ORDER BY SUM(cost_usd) DESC;

3. Cost per tier:
   SELECT tier, AVG(cost_usd) FROM cost_logs
   WHERE DATE(timestamp) = CURRENT_DATE
   GROUP BY tier;

4. Profitability:
   SELECT
     DATE(timestamp),
     SUM(CASE WHEN tier='PRO' THEN 49/30 ELSE 129/30 END) as daily_revenue,
     SUM(cost_usd) as daily_cost,
     SUM(CASE WHEN tier='PRO' THEN 49/30 ELSE 129/30 END) - SUM(cost_usd) as daily_profit
   FROM users_active
   GROUP BY DATE(timestamp);

Real-time dashboard:
  - Current hourly cost
  - Cost vs. hourly budget
  - Margin alerts (if cost > 70% of expected revenue)

```

---

## 6.3 Error Tracking & Alerting

### Sentry Setup

```javascript
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,  // 10% for sampling
});

app.use(Sentry.Handlers.requestHandler());

// Errors automatically captured
app.use(Sentry.Handlers.errorHandler());

// Manual error tracking
try {
  await callModelAPI();
} catch (err) {
  Sentry.captureException(err, {
    tags: {
      model: 'gpt-5',
      user_id: userId,
      tier: userTier,
    },
  });
}

// Performance monitoring
const transaction = Sentry.startTransaction({
  op: 'chat_completion',
  name: 'GPT-5 Completion',
});

const span = transaction.startChild({
  op: 'model_api_call',
  description: 'OpenAI API call',
});

// ... make API call ...

span.finish();
transaction.finish();

```

### Alert Configuration

```yaml
Slack Alerts (integrate Grafana with Slack):

Critical (PagerDuty):
  1. Error rate > 10% for 5 minutes
  2. API response time > 10 seconds (p99)
  3. Database connection pool exhausted
  4. All models failing (total outage)

High (Slack #alerts):
  1. Error rate 5-10%
  2. Model API latency degraded (> 2x normal)
  3. Cost spike (daily > 150% baseline)
  4. User reported bugs (from Sentry)

Medium (Slack #eng):
  1. Unused model route (potential bug)
  2. Cache hit rate < 50%
  3. Cold start latency > 1s
  4. Unused API keys (clean up)

Low (Email digest):
  1. Daily usage report
  2. Weekly cost summary
  3. Monthly metrics (DAU, MAU, churn)

```

---

# PART 7: DEPLOYMENT STRATEGY

## 7.1 Deployment Architecture Decision

### Primary: Google Cloud Run (Recommended)

```yaml
Why Cloud Run:
  - Stateless: Perfect for API servers
  - Autoscaling: 0 → 1,000 instances in seconds
  - Cost: Pay per request ($0.48 per 1M requests)
  - Cold start: ~1 second (acceptable)
  - WebSocket: Supported (Cloud Run 2nd Gen)
  - Minimal ops: No Kubernetes knowledge needed

Services to deploy on Cloud Run:
  1. API Gateway (main backend)
  2. Memory Service (context management)
  3. Voice Router (WebSocket handler)
  4. Webhook handlers (Stripe, etc.)

Deployment process:
  1. Containerize Node.js app (Dockerfile)
  2. Push to Google Artifact Registry
  3. Deploy via gcloud CLI or GitHub Actions
  4. Automatic HTTPS + load balancing

Example Dockerfile:
  FROM node:20-slim
  WORKDIR /app
  COPY package*.json ./
  RUN npm ci --only=production
  COPY . .
  EXPOSE 3000
  CMD ["node", "server.js"]

Deploy:
  gcloud run deploy aspendos-api \
    --source . \
    --region us-central1 \
    --memory 512Mi \
    --cpu 1 \
    --max-instances 100 \
    --timeout 30m \
    --set-env-vars OPENAI_API_KEY=$OPENAI_API_KEY

Cost estimation:
  - 1M requests/month: ~$500 (compute + networking)
  - Database (Cloud SQL): $50-100/month
  - Storage: ~$10/month
  - Monitoring: $20/month
  - Total: ~$600/month for 1M req/month


```

### Alternative: Vercel (Frontend only, recommended)

```yaml
Why Vercel for frontend:
  - Edge caching: Global CDN
  - Fast deployments: Git push → live (seconds)
  - Serverless functions: Edge routing
  - Auto-scaling: Infinite scale
  - SSL: Automatic
  - Cost: Free tier generous ($0 for most startups)

Deployment:
  - Connect GitHub repo
  - Auto-deploy on push to main
  - Preview deployments for PRs

Cost:
  - Free tier: up to 100GB bandwidth/month
  - Pro: $20/month (if needed)

What NOT to deploy on Vercel:
  - Heavy compute (model calls) → Cloud Run instead
  - Long-running tasks (>60s) → Cloud Tasks instead
  - WebSocket streaming → Cloud Run instead

Frontend + Backend split:
  ┌──────────────────────────────┐
  │  React App (Vercel)        │
  │  - HTML/CSS/JS bundles     │
  │  - Edge functions          │
  │  - Static assets           │
  └────────┬───────────────────┘
            │ API calls to
            ↓
  ┌──────────────────────────────┐
  │  Backend API (Cloud Run)   │
  │  - Model routing           │
  │  - Database queries        │
  │  - Compute-heavy work      │
  └──────────────────────────────┘

Benefits:
  - Fastest frontend deployment
  - Cheap hosting (or free)
  - Independent scaling (frontend cached, backend scaled)

```

### Kubernetes (Later, if needed)

```yaml
When to migrate to Kubernetes:
  - Sustained traffic > 100k requests/hour (unlikely before Month 6)
  - Need for advanced networking (service mesh, etc.)
  - Custom resource requirements
  - Plan: Not needed for MVP

Setup (if ever):
  - GKE cluster: $150/month base + nodes
  - Better control but more ops overhead
  - Only if cost optimization worth complexity

```

## 7.2 CI/CD Pipeline

### GitHub Actions (Recommended)

```yaml
# .github/workflows/deploy.yml

name: Deploy to Cloud Run

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Cloud SDK
        uses: google-github-actions/setup-gcloud@v1
        with:
          service_account_key: ${{ secrets.GCP_SA_KEY }}
          project_id: ${{ secrets.GCP_PROJECT_ID }}
      
      - name: Run tests
        run: |
          npm install
          npm run test
      
      - name: Build Docker image
        run: |
          gcloud builds submit \
            --tag gcr.io/${{ secrets.GCP_PROJECT_ID }}/aspendos-api:${{ github.sha }}
      
      - name: Deploy to Cloud Run
        run: |
          gcloud run deploy aspendos-api \
            --image gcr.io/${{ secrets.GCP_PROJECT_ID }}/aspendos-api:${{ github.sha }} \
            --region us-central1 \
            --platform managed
      
      - name: Run smoke tests
        run: |
          npm run smoke-tests
      
      - name: Notify Slack
        if: success()
        uses: slackapi/slack-github-action@v1
        with:
          webhook-url: ${{ secrets.SLACK_WEBHOOK }}
          payload: |
            {
              "text": "✅ Deployment successful",
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "*Aspendos deployed*\nCommit: ${{ github.sha }}\nAuthor: ${{ github.actor }}"
                  }
                }
              ]
            }

# Automatic rollback on failure
      - name: Rollback on failure
        if: failure()
        run: |
          gcloud run deploy aspendos-api \
            --image gcr.io/${{ secrets.GCP_PROJECT_ID }}/aspendos-api:LAST_STABLE_TAG
          
          # Alert on-call
          curl -X POST ${{ secrets.SLACK_WEBHOOK }} \
            -d '{"text":"❌ Deployment failed, rolled back"}'

```

### Staging Environment

```yaml
Setup:
  - Staging Cloud Run: aspendos-api-staging
  - Staging database: separate Cloud SQL instance
  - Staging payment processor: Polar sandbox mode

Flow:
  1. PR → GitHub
  2. Automated tests + code review
  3. Merge to main → Deploy to staging
  4. Manual testing in staging (30 min)
  5. Approve → Deploy to production

Production checklist:
  ☑ All tests passing
  ☑ Staging environment works
  ☑ Database migration tested
  ☑ API performance acceptable
  ☑ Cost estimate reasonable
  ☑ On-call engineer available
  ☑ Rollback plan prepared

```

## 7.3 Database Migration Strategy

```yaml
PostgreSQL deployment:
  - Cloud SQL (Google managed)
  - Single-zone initially (~$50/month, 2GB)
  - Automatic backups (7-day retention)
  - Point-in-time recovery enabled

Migrations:
  - Tool: Prisma ORM or raw SQL
  - Version control: migrations/ folder
  - Deployment: Auto-apply before app boot

Example migration:
  -- migrations/001_initial_schema.sql
  
  CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firebase_uid VARCHAR UNIQUE NOT NULL,
    email VARCHAR NOT NULL,
    tier VARCHAR DEFAULT 'PRO',
    created_at TIMESTAMP DEFAULT NOW()
  );
  
  CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR,
    model VARCHAR,
    created_at TIMESTAMP DEFAULT NOW()
  );
  
  CREATE INDEX idx_conversations_user_id ON conversations(user_id);
  CREATE INDEX idx_conversations_created_at ON conversations(created_at);

Rollback safety:
  - Migrations must be idempotent (can run twice safely)
  - Keep rollback migration in separate file
  - Test rollback in staging before production

Backup & restore:
  - Automated: 7-day retention
  - Manual: gcloud sql backups create --instance=aspendos-db
  - Test restore: Monthly in staging

High Availability (Month 2):
  - Enable Cloud SQL HA
  - Failover replica in different zone
  - Cost: +$100/month but zero downtime

```

---

# PART 8: COMPLIANCE READINESS (GDPR/HIPAA)

## 8.1 Privacy by Design Checklist

### Data Collection

```yaml
✓ Data Minimization
  - Only collect necessary data for service
  - Phone: email (identify user) + subscription (tier)
  - Chat: conversation content + metadata (timestamps, models)
  - Voice: audio logs (if consented), text transcriptions
  - Delete policy: Auto-delete after 90 days (configurable)

✓ Purpose Limitation
  - Data used ONLY for service delivery
  - No training on user data (explicit contract with OpenAI, Anthropic)
  - No selling user data (period)
  - No third-party sharing without explicit consent

✓ Consent Management
  - Consent checkbox on signup (required)
  - Separate consent for voice logs (optional)
  - Easy withdraw: account settings → "Delete all data"
  - Log all consent decisions (audit trail)

✓ Data Processing Agreement (DPA)
  - Aspendos = data processor (user owns data)
  - OpenAI/Anthropic = sub-processors
  - DPA with all sub-processors signed before launch

✓ Retention Policy
  - Conversations: 90 days default, configurable by user
  - User account: until deletion
  - Backups: 7 days (Cloud SQL automatic)
  - Voice logs: 7 days (security review then delete)

✓ Encryption
  - Transit: TLS 1.3 (Cloud Run native)
  - At rest: Cloud SQL (default encryption)
  - Keys: Google-managed (change to customer-managed for Enterprise)

✓ Audit Logging
  - Who accessed which data (PostgreSQL audit)
  - When (timestamp)
  - Why (session context)
  - Schema: audit_logs table

✓ Right to Access
  - User can export all data: Account → Export → JSON
  - Includes all conversations, preferences, activity log
  - Automatic export monthly (opt-in)

✓ Right to Erasure (Right to be Forgotten)
  - Delete account → ALL data deleted within 30 days
  - Cascading delete: conversations, sessions, logs
  - Except: backups (separate retention schedule)
  - Confirmation email required

✓ Security Measures
  - Password hash: bcrypt (or Firebase handles)
  - API keys: Hashed in database
  - Session tokens: Signed JWTs (non-reversible)
  - Rate limiting: Prevent brute force
  - CORS: Restrict to aspendos.com domain
  - CSRF tokens: On all state-changing operations


```

### GDPR Readiness Timeline

```yaml
Before Launch (Feb 14):
  ✓ Privacy Policy (clear, translated to Turkish + English)
  ✓ Terms of Service (including data processing)
  ✓ Cookie banner (basic consent for analytics)
  ✓ DPA templates (with OpenAI, Anthropic, vendors)
  ✓ Consent logging system (database schema)
  ✓ Data export feature (Account → Export)
  ✓ Account deletion (irreversible, 30-day purge)

Month 1-2 (Post-launch):
  ✓ Sub-processor list (published on website)
  ✓ DPIA (Data Protection Impact Assessment) for voice feature
  ✓ Incident response plan (what if breach?)
  ✓ DPO contact: dpo@aspendos.com (automated)

Month 2-3:
  ✓ Customer DPA template (for Enterprise tier)
  ✓ Data retention audit (verify deletion working)
  ✓ Vendor security audit (OpenAI, Anthropic compliance)

Month 3+:
  ✓ Full SOC 2 Type I audit (Enterprise requirement)
  ✓ GDPR compliance audit (by third party)
  ✓ Updated privacy policy (based on learnings)

Tools:
  - Privacy policy generator: iubenda.com or privacypolicies.com
  - DPA templates: Download from Google/OpenAI legal sites
  - Cookie consent: Cookiebot, Termly, Sourcepoint
  - DPIA template: Download from EDPB (EU authority)

Cost: ~$500-1,000 for legal review + tools

```

### HIPAA Readiness (for Enterprise)

```yaml
When needed: If healthcare customer appears (Month 6+)

Requirements:
  - BAA (Business Associate Agreement) with Aspendos
  - Encryption of healthcare data
  - Audit logging (who accessed patient info)
  - Access controls (role-based, need-to-know)
  - Incident reporting (60-day notification)

Implementation (Month 5, before selling to healthcare):
  ✓ HIPAA risk assessment
  ✓ Encryption at rest + transit
  ✓ Audit logging system
  ✓ Access control system
  ✓ Incident response plan
  ✓ Business Associate Agreement (template from attorney)
  ✓ HIPAA compliance training (team)

Tools:
  - HIPAA compliance checklist (HHS government site)
  - BAA template (consult attorney, ~$2,000-5,000)
  - Encryption: AWS KMS or Google Secret Manager
  - Audit: CloudAudit logs (Google Cloud native)

Cost: ~$5,000-10,000 (legal + implementation)

```

---

# PART 9: COST OPTIMIZATION & MARGIN ANALYSIS

## 9.1 Cost Structure (Detailed)

### Fixed Costs (Monthly)

```yaml
Infrastructure:
  - Cloud SQL (PostgreSQL 2GB): $50-100
  - Cloud Memorystore (Redis 1GB): $30-50
  - Cloud Run (baseline + monitoring): $10-20
  - Artifact Registry (container storage): $5
  - Cloud Logs (basic): included in Cloud Run
  Total Infrastructure: ~$100-175/month

Observability:
  - Prometheus (self-hosted on Cloud Run): included above
  - Grafana Cloud (if managed): $50-100/month
  - Sentry (error tracking, 5,000 events/month free): $0-29/month
  - Datadog (alternative, more expensive): skip for MVP
  Total Observability: ~$50-100/month

Security & Compliance:
  - SSL/TLS certificates: included in Cloud Run
  - VPC firewall: included
  - Secret Manager (GCP): included
  - Data encryption at rest: included
  - Legal: DPA template + privacy policy review: $500-1,000 (one-time)
  Total Compliance: ~$50/month amortized

Payments & Ops:
  - Domain (aspendos.com): $12/year
  - Polar payment processor: 5% of revenue (variable)
  - Accounting software (Wave): free
  - GitHub (private repo): free for teams <5
  Total Ops: ~$5/month

Legal & Support:
  - Business incorporation (Polar legal fees if registered): included
  - Customer support (Slack bot + email): free
  - Documentation hosting (Vercel): free
  Total Legal: $0/month

──────────────────────────────────
Total Fixed Monthly: ~$200-300


```

### Variable Costs (per 1M API calls)

```yaml
Model API Costs:
  - OpenAI GPT-4o (average): ~$500 per 1M requests
    (0.005 input + 0.015 output avg per request)
  
  - Claude 3.5 Sonnet: ~$600 per 1M requests
    (premium, but used for complex queries)
  
  - DeepSeek (via OpenRouter): ~$50 per 1M requests
    (cheap alternative for simple)
  
  - Gemini 2.0 Flash: ~$30 per 1M requests
    (very cheap, used for simple routing)
  
  Average (assuming mix): ~$200-300 per 1M calls

Compute (Cloud Run):
  - 1M requests × 2 seconds avg: ~556 hours = $2,000
  - Memory: 512MB × compute time: included above
  - Network egress: ~100GB per 1M = $800-1,000
  
  Total compute: ~$3,000 per 1M

Voice-specific costs:
  - STT (Whisper): $0.02 per minute
    * Assume 10 minutes voice per user per month
    * 1,000 users = 10,000 voice minutes = $200/month
  
  - TTS (OpenAI tts-1): $0.015 per 1k chars
    * Assume 5,000 chars output per voice session
    * 10 voice sessions per 1,000 users = $750/month
  
  - Total voice: ~$1,000/month @ 1,000 users

Database & Cache:
  - Cloud SQL (variable): ~$500 per 1M requests
  - Redis cache hits: ~20% reduction in API calls
  - Network IO: included in Cloud SQL pricing
  
  Total DB/Cache: ~$500

──────────────────────────────────
Total Variable per 1M calls: ~$4,500-5,500
Per call: $0.0045-0.0055


```

### Example Revenue vs Cost Analysis

```yaml
Scenario: Day 30 with 500 active users

Pricing:
  - 80% PRO tier ($49/month) = 400 users
  - 20% ULTRA tier ($129/month) = 100 users

Monthly Revenue:
  - PRO: 400 × $49 = $19,600
  - ULTRA: 100 × $129 = $12,900
  - Total: $32,500

Usage Assumptions (conservative):
  - PRO users: 5 API requests/day = 60k requests/month
  - ULTRA users: 20 API requests/day = 60k requests/month
  - Total: 120k requests/month = 0.12M calls

Monthly Costs:
  Fixed: $250
  Variable (120k calls): 120k × $0.0050 = $600
  Polar fees (5% of $32,500): $1,625
  ──────────────
  Total: $2,475

Gross Profit: $32,500 - $2,475 = $30,025
Gross Margin: 92%

Per-user economics:
  - ARPU (Average Revenue Per User): $32,500 / 500 = $65
  - CAC (Cost to Acquire): ~$0 (organic launch)
  - LTV (Lifetime Value): $65 × 12 × 2 years = ~$1,560 (crude estimate)
  - LTV/CAC ratio: Infinite (organic launch advantage)

Scenario: Month 3 with 2,500 active users

Pricing: Same (80% PRO, 20% ULTRA)

Monthly Revenue:
  - PRO: 2,000 × $49 = $98,000
  - ULTRA: 500 × $129 = $64,500
  - Total: $162,500

Usage Assumptions:
  - Total requests: 1.5M calls/month (more usage as features add)

Monthly Costs:
  Fixed: $300 (unchanged)
  Variable (1.5M calls): 1.5M × $0.0050 = $7,500
  Polar fees (5%): $8,125
  ──────────────
  Total: $15,925

Gross Profit: $162,500 - $15,925 = $146,575
Gross Margin: 90%

Year 1 Projection (with growth curve):
  Month 1: $5k revenue, 50 users
  Month 2: $15k revenue, 200 users
  Month 3: $30k revenue, 500 users
  Month 4: $60k revenue, 1,000 users
  Month 5: $120k revenue, 2,000 users
  Month 6: $200k revenue, 3,000 users
  ────────────
  Total 6-month revenue: ~$600k
  
  Extrapolated Year 1: ~$2M
  Fixed annual cost: ~$3,000
  Variable annual cost (assuming $3 per user acq): ~$50,000
  Marketing/Team cost: ~$400,000 (5 person salary)
  ──────────────
  Total annual cost: ~$450,000
  
  Net: $2M - $450k = $1.55M "net" (before taxes, accounting)
  
  This is rough, actual will vary based on:
  - CAC (marketing spend)
  - Churn rate (retention)
  - ARPU changes (feature adoption)
  - Competitor pressure (margin compression)

```

## 9.2 Margin Optimization Levers

```yaml
1. Model Routing Intelligence (+30% margin)
   - Auto-route simple queries to DeepSeek ($50/1M) vs GPT ($300/1M)
   - Saves: $2-3 per 1,000 requests
   - Implementation: Done in Part 3 routing algorithm

2. Caching (-30-40% API costs)
   - Response cache (24h): 5-10% hit rate
   - Batch API (50% discount): 20% of requests
   - Prompt caching: 40% savings on RAG
   - Total savings: ~$1-2 per 1,000 requests

3. Fallback routing (-20% cost variance)
   - If OpenAI rate-limited → DeepSeek via OpenRouter
   - If error → Try Anthropic instead
   - Dynamic cost management
   - Saves: ~$0.30 per 1,000 requests

4. Regional cost arbitrage (Future)
   - Serve US users from $0.048/GB storage (us-central1)
   - Serve EU users from $0.084/GB (europe-west1)
   - Not priority yet, but on radar

5. Upgrade path optimization (+20% margin)
   - PRO → ULTRA conversion rate target: 20%
   - Higher LTV
   - Churn reduction: target <2% monthly
   - Retention features: Memory Inspector, advanced agents

6. Team productivity (-40% engineering cost)
   - Use supabase/firebase (no custom auth)
   - Use Clerk for SSO (future)
   - Use managed databases (no DevOps hire)
   - Use serverless (no infrastructure team needed)
   - 3-person team for first $2M ARR


```

---

# PART 10: LAUNCH TIMELINE & DEPLOYMENT CHECKLIST

## 10.1 Launch Phases

### Phase 0: Pre-Launch (Jan 15-Feb 13)

```yaml
Week 1-2 (Jan 15-28):
  Infrastructure Setup:
    ☑ Google Cloud project created
    ☑ Service account + IAM roles configured
    ☑ Cloud SQL PostgreSQL provisioned (2GB)
    ☑ Cloud Memorystore Redis provisioned (1GB)
    ☑ Cloud Run region selected (us-central1)
    ☑ Artifact Registry repository created
    ☑ GitHub Actions secrets configured
    ☑ Monitoring (Prometheus/Grafana Cloud) configured
  
  Application Setup:
    ☑ Node.js backend boilerplate
    ☑ React frontend boilerplate (Vercel ready)
    ☑ Database schema (PostgreSQL) migrated
    ☑ OAuth2 setup (Firebase + Google/GitHub)
    ☑ API endpoints stubbed (not all implemented)
    ☑ Error handling + logging framework
    ☑ Cost tracking instrumentation (Prometheus metrics)

Week 3 (Jan 29-Feb 4):
  MVP Features:
    ☑ Multi-model chat (GPT-4o + Claude fallback)
    ☑ Memory system (SQLite backend → PostgreSQL)
    ☑ Persistent conversations (database)
    ☑ Image generation (Fal.ai integration)
    ☑ Voice chat (WebSocket + STT/TTS) - basics
    ☑ Share response feature
    ☑ Re-generate with model
  
  Integrations:
    ☑ OpenAI API (GPT-4o, Whisper, TTS)
    ☑ Anthropic API (Claude)
    ☑ Fal.ai (image generation)
    ☑ Polar payments (test mode)
    ☑ Firebase authentication
  
  Testing:
    ☑ Unit tests (core routing, auth)
    ☑ Integration tests (API endpoints)
    ☑ E2E tests (signup → chat → payment)
    ☑ Load testing (1,000 concurrent users)
    ☑ Latency testing (voice, streaming)

Week 4 (Feb 5-13):
  Launch Preparation:
    ☑ Production database backup/restore test
    ☑ Security review (OWASP top 10)
    ☑ Staging environment → production promotion test
    ☑ Privacy policy & ToS (final legal review)
    ☑ Data Processing Agreement signatures (OpenAI, etc.)
    ☑ Polar merchant account setup (production)
    ☑ Landing page live (sales messaging)
    ☑ Social media accounts (Twitter, LinkedIn, Product Hunt)
    ☑ Runbook (deployment, rollback, incident response)
    ☑ On-call schedule (first month)
    ☑ Monitoring alerts configured
    ☑ Error tracking (Sentry) live
  
  Marketing:
    ☑ Product Hunt listing prepared (description, screenshots)
    ☑ Demo video (2-3 min) recorded
    ☑ Twitter thread outline (30 sec pitch)
    ☑ Beta users notified (if any)
    ☑ Email to founder network (personal outreach)
    ☑ Reddit communities identified (r/ChatGPT, r/ClaudeAI, r/Entrepreneur)

```

### Phase 1: Launch Day (Feb 14)

```yaml
6:00 AM:
  ☑ Production health checks (all green)
  ☑ Database integrity check
  ☑ Model APIs responding
  ☑ Payment processor test transaction
  ☑ On-call engineer online

6:30 AM:
  ☑ Flip production domain switch
  ☑ Verify SSL certificate active
  ☑ Smoke tests pass
  ☑ Landing page live

8:00 AM:
  ☑ Product Hunt submission (front page push)
  ☑ First 100 users expected

10:00 AM:
  ☑ Twitter launch thread
  ☑ LinkedIn CEO post
  ☑ Slack community announcements (if any)

12:00 PM:
  ☑ Email to beta testers
  ☑ Monitor support channel (Slack/Discord)
  ☑ Address first issues in real-time

2:00 PM - 6:00 PM:
  ☑ Reddit posts (r/ChatGPT, r/ClaudeAI, r/Entrepreneur)
  ☑ Monitor conversion rate (landing page → signup)
  ☑ Respond to early users
  ☑ Log first issues
  ☑ Monitor costs (watch for abuse)

Evening (6:00 PM onwards):
  ☑ Hand-off to evening on-call
  ☑ Continue support
  ☑ Analyze first day metrics
    - Signups: 100-500 expected
    - Conversion rate: 5-10% expected
    - Issues: List top 3 bugs to fix
    - Costs: Monitor total spend

```

### Phase 1+: First Week (Feb 14-20)

```yaml
Day 1 Metrics:
  ✓ 200 signups
  ✓ 1.5% conversion (landing → paid)
  ✓ 3 payments through Polar
  ✓ ~50 API calls total
  ✓ 0 critical errors
  ✓ Latency: avg 1.2s, p99 3.5s

Day 2-3:
  ✓ Fix top bugs from Day 1
  ✓ Optimize slow endpoints
  ✓ Add more model providers (if not ready)
  ✓ Improve onboarding flow

Day 4-7:
  ✓ Stabilize infrastructure
  ✓ Monitor churn rate (target <10% Day 7 churn)
  ✓ Gather user feedback
  ✓ Plan Week 2 improvements
  ✓ Total target by end of week: 500-1000 signups, 30-50 PRO users

Red flags (rollback if occurs):
  ❌ Error rate > 5%
  ❌ P99 latency > 5s
  ❌ Payment failures > 10%
  ❌ Database issues
  ❌ Model APIs consistently failing
  → Rollback to pre-launch version + diagnose

```

### Phase 2: Growth (Feb 21 - Apr 30)

```yaml
Feb 21 - Feb 28 (Week 2):
  ✓ Expected growth: 2x weekly (Week 1: 500 users, Week 2: 1,000)
  ✓ Stabilize product (fix top 10 bugs)
  ✓ Add second model provider (Gemini, if not ready)
  ✓ Improve voice quality
  ✓ Launch memory feature improvements

Mar 1 - Mar 31 (Month 2):
  Features:
    ✓ Parallel multi-model broadcast (if feature parity with MVP)
    ✓ Memory Inspector (basic)
    ✓ Advanced agents (basic)
    ✓ Video generation (basic)
  
  Target: 2,000-3,000 total users, ~$30-50k MRR
  
  Ops:
    ✓ Auto-scaling tuning
    ✓ Cost optimization (model routing improving)
    ✓ Support scaling (hire 1 support person)

Apr 1 - Apr 30 (Month 3):
  Features:
    ✓ ULTRA tier features stable
    ✓ Memory policies
    ✓ Lovable-style app builder (alpha)
    ✓ MCP marketplace (alpha)
  
  Target: 3,000-5,000 users, $50-80k MRR
  
  Ops:
    ✓ Enterprise readiness (SOC 2 Type I target)
    ✓ Pricing experiments (if churn, optimize)
    ✓ Sales outreach begins (direct to founders)

Key Metrics Targets:

| Metric | Week 1 | Week 2 | Month 2 | Month 3 |
|--------|--------|--------|---------|---------|
| Signups | 500 | 1,000 | 2,500 | 5,000 |
| PRO Users | 10 | 30 | 100 | 250 |
| ULTRA Users | 3 | 10 | 30 | 100 |
| MRR | $600 | $1,900 | $30k | $80k |
| Churn Rate | 15% | 12% | 8% | 5% |
| NPS | 25 | 30 | 35 | 40 |
| DAU/MAU | 15% | 20% | 25% | 30% |

```

---

## 10.2 Production Runbook

### Incident Response

```yaml
Severity Levels:

CRITICAL (PagerDuty + all hands):
  - Error rate > 10% for 5 min
  - API timeout (0% successful requests)
  - Database unavailable
  - Payment processor down
  - DDoS attack

Action:
  1. Declare incident (Slack #incidents)
  2. Page on-call engineer
  3. Identify root cause (logs, metrics)
  4. Implement fix or rollback
  5. Communication: Notify users (status page)
  6. Post-mortem: Within 24 hours

Example: Database unavailable
  1. Check Cloud SQL status
  2. If failover available: trigger
  3. If not: restore from backup (15-30 min, possible data loss)
  4. Verify application recovery
  5. Message users: "Database restored, investigating cause"
  6. Post-mortem: Why did it go down? How to prevent?

HIGH (Slack #alerts):
  - Error rate 5-10%
  - P99 latency > 5s
  - Cost spike (> 150% baseline)
  - Model unavailable (fallback active)

Action:
  1. Alert triggered automatically
  2. Engineer investigates within 15 min
  3. Fix or document workaround
  4. No user communication (if fallback working)

MEDIUM (Slack #eng):
  - Cache hit rate < 50%
  - Cold start > 1s
  - Specific feature issue
  - Memory leak detected

Action:
  1. Log issue
  2. Schedule for next sprint
  3. Temporary workaround if urgent


```

### Deployment Rollback

```yaml
Automatic rollback triggers:
  - Error rate > 5% for 2 minutes → auto-rollback
  - P99 latency > 10s for 2 minutes → auto-rollback
  - Database migration failure → auto-rollback

Manual rollback:
  1. Identify last good deployment
  2. gcloud run deploy aspendos-api --image gcr.io/.../aspendos-api:LAST_GOOD_TAG
  3. Verify recovery in monitoring
  4. Notify team (Slack)
  5. Schedule post-mortem

Database rollback (if migration broke):
  1. Stop application
  2. Restore from backup (Cloud SQL has point-in-time recovery)
  3. Verify backup integrity
  4. Restart application
  5. Check data consistency
  6. Fix migration, test in staging

```

### Monitoring Dashboards (Daily Check)

```yaml
Developer on-call checks at start of shift:
  1. Error rate: < 1% ✓
  2. P99 latency: < 2s ✓
  3. Active users: trending up ✓
  4. Daily cost: < $100 ✓
  5. Model API success: > 99% ✓
  6. Database health: green ✓
  7. Cache hit rate: > 40% ✓
  8. Payment success: > 99% ✓

If any red:
  - Investigate immediately
  - Escalate if critical
  - Create bug ticket

```

---

# CONCLUSION & QUICK START

## Immediate Next Steps (Jan 16-31)

1. **Business**
* Register with Polar (1 day)
* Sign-in to Wise Business (1 day)
* Consult lawyer on DPA templates (1 day)


2. **Infrastructure**
* Create GCP project + Cloud Run region
* Provision Cloud SQL + Redis
* Set up GitHub Actions


3. **Development**
* Node.js + Express backend scaffold
* React frontend scaffold
* OAuth2 (Firebase) setup
* Database schema


4. **Integrations**
* OpenAI API key + testing
* Anthropic API key + testing
* Fal.ai image generation
* Polar payments (sandbox)


5. **Monitoring**
* Prometheus instrumentation
* Grafana Cloud dashboard
* Sentry error tracking


6. **Marketing**
* Landing page copy finalized
* Twitter/LinkedIn accounts



* Product Hunt account ready

---

## Success Metrics (First 90 Days)

| Metric | Target | Target | Target |
| --- | --- | --- | --- |
|  | Week 1 | Month 1 | Month 3 |
| Signups | 500 | 1,500 | 5,000 |
| PRO Conversion | 2% | 5% | 8% |
| MRR | $600 | $15k | $100k |
| Churn | <15% | <10% | <5% |
| NPS | 25 | 35 | 45 |
| Uptime | 99.5% | 99.9% | 99.95% |
| P99 Latency | <3s | <2s | <1s |

---

## Key Files to Create

```
project-root/
├── Dockerfile                    # Container for Cloud Run
├── docker-compose.yml            # Local dev environment
├── .env.example                  # Template for secrets
├── package.json                  # Node dependencies
├── src/
│   ├── server.js                 # Express server
│   ├── db.js                     # PostgreSQL client
│   ├── routes/
│   │   ├── auth.ts               # OAuth2 endpoints
│   │   ├── chat.ts               # Chat API
│   │   ├── voice.ts              # WebSocket voice
│   │   └── webhooks.ts           # Polar, etc.
│   ├── services/
│   │   ├── modelRouter.ts        # Routing logic
│   │   ├── memory.ts             # Memory management
│   │   ├── voice.ts              # STT/TTS
│   │   └── costs.ts              # Cost tracking
│   └── middleware/
│       ├── auth.ts               # JWT verification
│       ├── rateLimit.ts          # Rate limiting
│       └── monitoring.ts         # Prometheus
├── migrations/
│   ├── 001_initial_schema.sql
│   └── 002_voice_tables.sql
├── tests/
│   ├── unit/
│   └── integration/
├── .github/
│   └── workflows/
│       └── deploy.yml            # CI/CD
├── monitoring/
│   ├── prometheus.yml            # Scrape config
│   └── grafana-dashboards/
├── docs/
│   ├── API.md
│   ├── ARCHITECTURE.md           # This file
│   ├── DEPLOYMENT.md
│   └── PRIVACY.md

```

---

**This architecture is designed for launch and rapid scaling. Every decision prioritizes speed-to-market, cost efficiency, and user privacy. Iterate aggressively in Month 1, stabilize in Month 2, and plan for Enterprise in Month 3+.**

**Last updated: January 14, 2025**
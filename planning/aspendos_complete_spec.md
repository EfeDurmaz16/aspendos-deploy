# ASPENDOS: TECHNICAL ARCHITECTURE & IMPLEMENTATION GUIDE

*Complete specification for building, scaling, and launching the AI Operating System*

***

## TABLE OF CONTENTS

1. [System Architecture Overview](#1-system-architecture-overview)
2. [Memory System: Knowledge Graph & Advanced Storage](#2-memory-system-knowledge-graph--advanced-storage)
3. [API Architecture & Model Routing](#3-api-architecture--model-routing)
4. [Real-time Voice Implementation](#4-real-time-voice-implementation)
5. [Database Schema & Prisma Models](#5-database-schema--prisma-models)
6. [Backend Implementation (Node.js/Express)](#6-backend-implementation-nodejs-express)
7. [Frontend & Streaming Architecture](#7-frontend--streaming-architecture)
8. [Deployment & Infrastructure](#8-deployment--infrastructure)
9. [Monitoring, Logging & Observability](#9-monitoring-logging--observability)
10. [CI/CD Pipeline & GitHub Actions](#10-cicd-pipeline--github-actions)
11. [Security & Environment Management](#11-security--environment-management)
12. [Cost Calculator & Financial Projections](#12-cost-calculator--financial-projections)
13. [Testing Strategy](#13-testing-strategy)
14. [Production Checklist & Launch Plan](#14-production-checklist--launch-plan)

***

***

# 1. SYSTEM ARCHITECTURE OVERVIEW

## High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          CLIENT LAYER (Web/Mobile)                          │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  WebSocket Client (Real-time Voice, Streaming Text)               │   │
│  │  ├─ Voice Input (WebRTC/getUserMedia)                             │   │
│  │  ├─ Streaming Output (EventSource/WebSocket)                      │   │
│  │  └─ Memory Visualization (React Three Fiber - 3D Graph)           │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                              ↓ (HTTPS/WSS)
┌─────────────────────────────────────────────────────────────────────────────┐
│                    API GATEWAY & RATE LIMITING LAYER                        │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─ Cloudflare / AWS WAF ─────────────────────────────────────────────┐   │
│  │  ├─ DDoS Protection                                               │   │
│  │  ├─ Rate Limiting (Redis-backed)                                  │   │
│  │  └─ Request Validation & Auth                                     │   │
│  └────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                              ↓ (Internal)
┌─────────────────────────────────────────────────────────────────────────────┐
│                   BACKEND SERVICES (Node.js/Express)                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────┐     │
│  │  AUTH SERVICE                                                   │     │
│  │  ├─ OAuth2 (Google, Apple, GitHub, Facebook)                   │     │
│  │  ├─ JWT Token Management                                       │     │
│  │  ├─ Session Handling (Redis)                                   │     │
│  │  └─ RBAC (Role-Based Access Control)                           │     │
│  └─────────────────────────────────────────────────────────────────┘     │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────┐     │
│  │  CHAT SERVICE                                                   │     │
│  │  ├─ Message Processing & Queue (Bull/Redis)                    │     │
│  │  ├─ Model Routing & Fallback Logic                             │     │
│  │  ├─ Streaming Response Handler                                 │     │
│  │  ├─ Multi-model Orchestration                                  │     │
│  │  └─ Response Caching (Redis)                                   │     │
│  └─────────────────────────────────────────────────────────────────┘     │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────┐     │
│  │  MEMORY SERVICE                                                 │     │
│  │  ├─ Knowledge Graph Store (Neo4j / TigerGraph)                  │     │
│  │  ├─ Vector Embedding (Pinecone / Weaviate)                      │     │
│  │  ├─ Memory Synthesis & Clustering                               │     │
│  │  ├─ Memory Policies (GDPR, HIPAA compliance)                    │     │
│  │  └─ Graph Visualization API                                    │     │
│  └─────────────────────────────────────────────────────────────────┘     │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────┐     │
│  │  VOICE SERVICE                                                  │     │
│  │  ├─ Speech-to-Text (OpenAI Whisper API / Google Cloud Speech)   │     │
│  │  ├─ Text-to-Speech (OpenAI TTS / ElevenLabs)                    │     │
│  │  ├─ Real-time Streaming (WebSocket)                             │     │
│  │  ├─ Audio Processing (noise reduction, compression)             │     │
│  │  └─ Latency Optimization                                        │     │
│  └─────────────────────────────────────────────────────────────────┘     │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────┐     │
│  │  BILLING & SUBSCRIPTION SERVICE                                 │     │
│  │  ├─ Stripe / Polar Integration                                  │     │
│  │  ├─ Usage Metering (compute credits)                            │     │
│  │  ├─ Invoice Generation                                          │     │
│  │  ├─ Multi-currency Support (USD, TRY, EUR, CNY)                 │     │
│  │  └─ Refund Processing                                           │     │
│  └─────────────────────────────────────────────────────────────────┘     │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────┐     │
│  │  MONITORING & LOGGING SERVICE                                   │     │
│  │  ├─ Prometheus Metrics Export                                   │     │
│  │  ├─ Structured Logging (Winston/Pino)                           │     │
│  │  ├─ Error Tracking (Sentry)                                     │     │
│  │  ├─ Tracing (Jaeger / DataDog)                                  │     │
│  │  └─ Health Checks                                               │     │
│  └─────────────────────────────────────────────────────────────────┘     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                              ↓ (HTTP/gRPC)
┌─────────────────────────────────────────────────────────────────────────────┐
│                        EXTERNAL SERVICES & APIs                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  PRIMARY PROVIDERS (Direct Integration):                                   │
│  ├─ OpenAI (GPT-4, GPT-4o, o1) — lowest latency, highest quality          │
│  ├─ Anthropic (Claude 3.5 Sonnet/Opus) — cache + batch processing         │
│  ├─ Google (Gemini 2.0 Flash) — multimodal, very fast                     │
│  └─ xAI (Grok 3) — real-time web search capability                        │
│                                                                             │
│  FALLBACK PROVIDERS (via OpenRouter):                                      │
│  ├─ Meta (Llama 3.3 70B) — cost-effective                                  │
│  ├─ Mistral (Large, Medium) — fast, EU-friendly                           │
│  ├─ DeepSeek (V3) — extremely cheap (~$0.5/1M tokens)                    │
│  └─ Other open-source models                                              │
│                                                                             │
│  VISION MODELS (Generative):                                               │
│  ├─ Flux Pro (via fal.ai) — fastest, highest quality                       │
│  ├─ DALL-E 3 (via OpenAI) — reliable                                       │
│  └─ Fallback: Stability AI (via fal.ai)                                    │
│                                                                             │
│  VIDEO GENERATION:                                                         │
│  ├─ Kling AI (via fal.ai) — highest quality                                │
│  ├─ Runway Gen-3 (via fal.ai) — alternative                                │
│  └─ Fallback: HeyGen (via API)                                             │
│                                                                             │
│  SPEECH SERVICES:                                                          │
│  ├─ OpenAI Whisper (STT) — baseline                                        │
│  ├─ ElevenLabs TTS (TTS) — premium voice quality                           │
│  ├─ Google Cloud TTS (TTS) — fallback                                      │
│  └─ Deepgram (STT) — fallback for voice                                    │
│                                                                             │
│  PAYMENT PROCESSORS:                                                       │
│  ├─ Polar (Türkiye + Global support)                                       │
│  └─ Stripe (Global) — for certain regions                                  │
│                                                                             │
│  AUTH PROVIDERS:                                                           │
│  ├─ Google OAuth                                                           │
│  ├─ Apple OAuth                                                            │
│  ├─ GitHub OAuth                                                           │
│  └─ Facebook OAuth                                                         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                              ↓ (Async Queue)
┌─────────────────────────────────────────────────────────────────────────────┐
│                    BACKGROUND JOBS & ASYNC PROCESSING                       │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─ Bull Queue (Redis-backed) ────────────────────────────────────────┐   │
│  │  ├─ Memory synthesis & clustering (once per day)                  │   │
│  │  ├─ Invoice generation & sending                                  │   │
│  │  ├─ User data export (GDPR)                                       │   │
│  │  ├─ Webhook delivery (for agents, integrations)                   │   │
│  │  └─ Cleanup jobs (expired sessions, old files)                    │   │
│  └────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                      DATA LAYER & PERSISTENCE                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────┐     │
│  │  PostgreSQL (Primary OLTP Database)                             │     │
│  │  ├─ Users, Sessions, API Keys                                   │     │
│  │  ├─ Conversations, Messages (hierarchical)                      │     │
│  │  ├─ Billing, Subscriptions, Invoices                            │     │
│  │  ├─ Memory metadata & policies                                  │     │
│  │  └─ Audit logs (for compliance)                                 │     │
│  │                                                                  │     │
│  │  Scaling:                                                        │     │
│  │  ├─ Connection pooling (PgBouncer)                              │     │
│  │  ├─ Read replicas (for reporting)                               │     │
│  │  ├─ Logical replication (for disaster recovery)                 │     │
│  │  └─ Automated backups (hourly + daily)                          │     │
│  └─────────────────────────────────────────────────────────────────┘     │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────┐     │
│  │  Neo4j or TigerGraph (Knowledge Graph)                          │     │
│  │  ├─ Relationship mapping (concept → concept)                    │     │
│  │  ├─ Entity extraction & linking                                 │     │
│  │  ├─ Graph traversal for memory synthesis                        │     │
│  │  └─ Pattern detection (recurring themes)                        │     │
│  └─────────────────────────────────────────────────────────────────┘     │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────┐     │
│  │  Vector Database (Pinecone / Weaviate / Milvus)                 │     │
│  │  ├─ Embedding storage (semantic search)                         │     │
│  │  ├─ Fast similarity lookup for memory retrieval                 │     │
│  │  ├─ Multi-namespace support (per user)                          │     │
│  │  └─ Hybrid search (vector + keyword)                            │     │
│  └─────────────────────────────────────────────────────────────────┘     │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────┐     │
│  │  Redis (Cache & Session Store)                                  │     │
│  │  ├─ User sessions (TTL: 30 days)                                │     │
│  │  ├─ Chat history cache (TTL: 1 hour)                            │     │
│  │  ├─ Rate limiting buckets                                       │     │
│  │  ├─ Message queues (Bull)                                       │     │
│  │  ├─ Real-time connections (PubSub)                              │     │
│  │  └─ Temperature/sampling configs (model state)                  │     │
│  └─────────────────────────────────────────────────────────────────┘     │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────┐     │
│  │  S3-Compatible Storage (Object Storage)                         │     │
│  │  ├─ User file uploads (images, documents)                       │     │
│  │  ├─ Generated images & videos                                   │     │
│  │  ├─ Chat export (JSON, PDF)                                     │     │
│  │  ├─ Backup files                                                │     │
│  │  └─ CDN integration (CloudFront / Cloudflare)                   │     │
│  └─────────────────────────────────────────────────────────────────┘     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

***

## Scaling Architecture (Day 1 → Peak)

### Day 1: MVP (Minimal Production)

```
┌──────────────────┐
│  Single Node.js  │ ← API Server (Vercel / Cloud Run)
│  (Serverless)    │
└────────┬─────────┘
         │
    ┌────┴────────┬──────────────┬──────────────┐
    │             │              │              │
┌───▼──┐   ┌─────▼────┐  ┌──────▼────┐  ┌─────▼─────┐
│  PG  │   │ Redis    │  │ Pinecone  │  │  S3       │
│ RDS  │   │ (Upstash)│  │ (Cloud)   │  │ (Cloud)   │
└──────┘   └──────────┘  └───────────┘  └───────────┘
```

**Characteristics:**
- Single Node.js instance (serverless)
- Shared PostgreSQL (AWS RDS Single-AZ)
- Redis cluster (Upstash or AWS ElastiCache)
- Pinecone managed vector DB
- S3 for object storage
- **Cost:** ~$500-800/month

***

### Week 2-4: Early Scale (1K → 5K users)

```
┌───────────────────────────────┐
│   Load Balancer (Cloudflare)  │
└────────────────────┬──────────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
   ┌────▼───┐  ┌─────▼───┐  ┌────▼───┐
   │ Node.js │  │ Node.js │  │ Node.js │
   │  API-1  │  │  API-2  │  │  API-3  │
   └────────┘  └─────────┘  └────────┘
        │            │            │
        └────────────┼────────────┘
                     │
    ┌────────────────┼────────────────┐
    │                │                │
 ┌──▼────┐    ┌─────▼────┐    ┌──────▼────┐
 │ PG-HA │    │ Redis    │    │ Pinecone  │
 │Master │    │Cluster   │    │           │
 └───────┘    │(Upstash) │    └───────────┘
              └──────────┘
```

**Characteristics:**
- 3 Node.js instances (Docker containers)
- PostgreSQL HA (Primary + 1 Replica, auto-failover)
- Redis cluster (Upstash Professional)
- Pinecone (grows with data)
- **Cost:** ~$1,500-2,000/month

***

### Month 2-3: Production Scale (5K → 20K users)

```
┌──────────────────────────────────────┐
│   Global Load Balancer (Cloudflare)  │
│   + WAF + Rate Limiting               │
└────────────────┬─────────────────────┘
                 │
    ┌────────────┼────────────┬────────────┐
    │            │            │            │
┌───▼──┐    ┌────▼───┐   ┌────▼───┐  ┌───▼──┐
│K8s   │    │ K8s    │   │ K8s    │  │K8s   │
│Pod-1 │    │ Pod-2  │   │ Pod-3  │  │Pod-N │
└───┬──┘    └────┬───┘   └────┬───┘  └───┬──┘
    │            │            │          │
    └────────────┼────────────┴──────────┘
                 │
    ┌────────────┼────────────────┬──────────────┐
    │            │                │              │
┌───▼──────┐ ┌──▼───────┐  ┌─────▼────────┐  ┌─▼───────┐
│PostgreSQL│ │Redis     │  │Neo4j Cluster │  │Pinecone │
│Primary   │ │Cluster   │  │(Knowledge    │  │         │
│+ Standbys│ │(Upstash) │  │Graph)        │  │         │
└──────────┘ └──────────┘  └──────────────┘  └─────────┘
                │
          ┌─────▼──────────┐
          │ Message Queue  │
          │ (Bull/Redis)   │
          └────────────────┘
```

**Characteristics:**
- Kubernetes cluster (GCP GKE / AWS EKS / DigitalOcean)
- 5-10 Node.js pods (auto-scaling based on CPU/memory)
- PostgreSQL Primary + 2+ Replicas (HA)
- Redis cluster (Upstash Enterprise or self-hosted)
- Neo4j cluster (for knowledge graph)
- Pinecone (scaled to handle embeddings)
- **Cost:** ~$3,000-4,500/month

***

### Month 4-6: Enterprise Scale (20K → 100K+ users)

```
┌─────────────────────────────────────────────┐
│          Cloudflare CDN + DDoS Protection   │
│              + Global Anycast               │
└────────┬──────────────────────┬─────────────┘
         │                      │
    ┌────▼────┐            ┌────▼────┐
    │ US East │            │ EU West │
    │ Region  │            │ Region  │
    │         │            │         │
  ┌─┴──────┐ ┌┴──┐    ┌─────┴──┐ ┌──┴─────┐
  │K8s     │ │... │    │K8s     │ │  ...   │
  │Cluster │ │    │    │Cluster │ │        │
  │        │ │    │    │        │ │        │
  └─┬──────┘ └────┘    └────┬───┘ └────────┘
    │                       │
    │   ┌───────────────────┤
    │   │                   │
 ┌──▼─────────┐    ┌────────▼────────┐
 │PostgreSQL  │    │PostgreSQL       │
 │Primary+    │    │Replica+         │
 │Replicas    │    │Replicas         │
 │(us-east)   │    │(eu-west)        │
 └────┬───────┘    └────┬────────────┘
      │                 │
      │ (Cross-region replication)
      │                 │
      └─────────┬───────┘
                │
    ┌───────────┼─────────────┐
    │           │             │
┌───▼──┐   ┌───▼────┐  ┌─────▼────┐
│Redis │   │Neo4j   │  │Pinecone  │
│Global│   │Cluster │  │(Global)  │
│Cluster   │        │  │          │
└────────┘ └────────┘  └──────────┘
```

**Characteristics:**
- Multi-region deployment (US-East, EU-West, etc.)
- Kubernetes clusters per region (auto-scaling)
- PostgreSQL with cross-region replication
- Global Redis cluster (Upstash Enterprise or AWS MemoryDB)
- Neo4j distributed cluster
- Pinecone global indexes
- **Cost:** ~$8,000-12,000/month

***

## Peak Load Handling (Global)

**Estimated Peak Hours Load Profile:**

Based on global SaaS applications (e.g., ChatGPT, Slack):

```
PEAK LOAD SCENARIOS:

Scenario 1: US Peak (2-8 PM EST)
├─ Expected concurrent users: 500-1,000
├─ Messages per second: 50-100 (text) + 20-30 (voice)
├─ API RPS: 200-400 (including memory, billing checks)
└─ Database connections: 150-300

Scenario 2: EU Peak (10 AM - 6 PM CET)
├─ Expected concurrent users: 400-800
├─ Messages per second: 40-80
├─ API RPS: 150-300
└─ Database connections: 100-200

Scenario 3: APAC Peak (6 PM - 2 AM JST/SGT)
├─ Expected concurrent users: 300-600
├─ Messages per second: 30-60
├─ API RPS: 120-240
└─ Database connections: 80-160

Scenario 4: Global Spike (Viral moment, Product Hunt #1)
├─ 3-5x normal peak traffic
├─ Expected concurrent users: 3,000-5,000
├─ Messages per second: 300-500
├─ API RPS: 1,000-2,000
└─ Database connections: 500-1,000
```

***

## Auto-Scaling Rules

```yaml
# Kubernetes Horizontal Pod Autoscaler (HPA)

API Pods:
  min_replicas: 3
  max_replicas: 50
  target_cpu_utilization: 60%
  target_memory_utilization: 70%
  scale_up_window: 15 seconds
  scale_down_window: 300 seconds

Voice Service Pods:
  min_replicas: 2
  max_replicas: 30
  target_cpu_utilization: 50%
  target_memory_utilization: 65%

Memory Service Pods:
  min_replicas: 1
  max_replicas: 10
  target_cpu_utilization: 70%

Background Job Workers:
  min_replicas: 2
  max_replicas: 20
  queue_depth_per_worker: 100
  scale_metric: bull_queue_length
```

***

***

# 2. MEMORY SYSTEM: KNOWLEDGE GRAPH & ADVANCED STORAGE

## Overview: Three-Layer Memory Architecture

The Aspendos memory system is **not just conversation history**. It's a sophisticated **knowledge intelligence layer** that understands relationships, patterns, and evolving insights across all user interactions.

```
┌─────────────────────────────────────────────────────────────────────┐
│                     LAYER 1: SEMANTIC MEMORY                        │
│         (What the user said, learned, created, discovered)          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Vector Embeddings (Pinecone / Weaviate)                           │
│  ├─ Every message, memory item, document embedding (384-1536 dim)  │
│  ├─ Enables semantic search ("things I talked about ML")           │
│  └─ Enables clustering (auto-group similar topics)                 │
│                                                                     │
│  Structured Data (PostgreSQL)                                       │
│  ├─ Conversations, messages, timestamps                            │
│  ├─ User context (preferences, settings)                           │
│  ├─ Memory tags (created manually or auto-extracted)               │
│  └─ Models used, compute credits burned                            │
│                                                                     │
│  File Storage (S3)                                                  │
│  ├─ Uploaded documents, images, PDFs                               │
│  ├─ Generated outputs (images, videos, code)                       │
│  └─ Conversation exports (JSON, PDF)                               │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│                     LAYER 2: KNOWLEDGE GRAPH                        │
│       (How concepts, entities, ideas relate to each other)          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Neo4j or TigerGraph                                                │
│                                                                     │
│  Node Types:                                                        │
│  ├─ CONCEPT (AI, Python, Marketing, etc.)                          │
│  ├─ ENTITY (Person, Company, Product)                              │
│  ├─ MEMORY_ITEM (User-created note or insight)                     │
│  ├─ CONVERSATION (Chat session)                                    │
│  ├─ QUESTION (User asked, resolved, or ongoing)                    │
│  ├─ INSIGHT (System-derived pattern or learning)                   │
│  └─ PROJECT (User's work or goal)                                  │
│                                                                     │
│  Relationship Types:                                                │
│  ├─ MENTIONED_IN (concept mentioned in conversation)               │
│  ├─ RELATED_TO (two concepts have semantic proximity)              │
│  ├─ ANSWERED_BY (insight answers a question)                       │
│  ├─ PART_OF (concept is sub-category of another)                   │
│  ├─ USED_BY (tool/framework used in a project)                     │
│  ├─ LEARNED (user learned something)                               │
│  ├─ CONTRIBUTED_TO (entity contributed to result)                  │
│  ├─ SIMILAR_TO (other conversations with similar themes)           │
│  └─ CONFLICTS_WITH (contradictory ideas or approaches)             │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│                  LAYER 3: SYNTHESIS & INTELLIGENCE                  │
│      (Patterns, trends, actionable insights, cross-learning)       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Memory Clustering (Daily, via background job)                      │
│  ├─ Group related conversations into "projects" or "threads"       │
│  ├─ Detect recurring questions/topics                              │
│  ├─ Find knowledge gaps (what user keeps asking about)             │
│  └─ Suggest new explorations (based on gaps)                       │
│                                                                     │
│  Memory Synthesis (Weekly, on-demand for ULTRA)                     │
│  ├─ Generate "weekly digest" of learnings                          │
│  ├─ Cross-project patterns (X methodology applies to Y too)        │
│  ├─ Progress tracking (in skills, goals, understanding)            │
│  ├─ Contradiction resolution (user believed X, now knows Y)        │
│  └─ Actionable summaries                                           │
│                                                                     │
│  Memory Inspector (ULTRA feature)                                   │
│  ├─ Interactive 3D visualization of knowledge graph                │
│  ├─ Cluster detection & exploration                                │
│  ├─ Manual editing (re-tag, merge, delete)                         │
│  ├─ Custom memory policies (what to remember/forget)               │
│  └─ Time-based replay (how memory evolved)                         │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

***

## Memory System: Complete Database Schema

### Neo4j Knowledge Graph Structure

```cypher
// Node Definitions

// CONCEPT: Universal ideas, technologies, frameworks
CREATE CONSTRAINT concept_unique IF NOT EXISTS
FOR (n:CONCEPT) REQUIRE n.id IS UNIQUE;

// Example: CONCEPT nodes
:param concepts => [
  {id: "ai", label: "Artificial Intelligence", category: "Technology"},
  {id: "python", label: "Python", category: "Programming Language"},
  {id: "marketing", label: "Marketing", category: "Business"},
  {id: "semantic_search", label: "Semantic Search", category: "AI"},
  {id: "multi_model", label: "Multi-Model LLMs", category: "AI"}
]

// ENTITY: Real-world things (people, companies, products)
CREATE CONSTRAINT entity_unique IF NOT EXISTS
FOR (n:ENTITY) REQUIRE n.id IS UNIQUE;

// Example: ENTITY nodes
:param entities => [
  {id: "openai", name: "OpenAI", type: "Company"},
  {id: "anthropic", name: "Anthropic", type: "Company"},
  {id: "gemini", name: "Google Gemini", type: "Product"},
  {id: "claude", name: "Claude", type: "Product"}
]

// CONVERSATION: A chat session
CREATE CONSTRAINT conversation_unique IF NOT EXISTS
FOR (n:CONVERSATION) REQUIRE n.id IS UNIQUE;

// MEMORY_ITEM: Manually created notes/insights
CREATE CONSTRAINT memory_item_unique IF NOT EXISTS
FOR (n:MEMORY_ITEM) REQUIRE n.id IS UNIQUE;

// INSIGHT: System-derived patterns
CREATE CONSTRAINT insight_unique IF NOT EXISTS
FOR (n:INSIGHT) REQUIRE n.id IS UNIQUE;

// Relationship Definitions

// Conversation mentions a concept
MATCH (c:CONVERSATION), (concept:CONCEPT)
CREATE (c)-[r:MENTIONED_IN {count: 5, last_mentioned: datetime()}]->(concept)

// Two concepts are related
MATCH (c1:CONCEPT), (c2:CONCEPT)
CREATE (c1)-[r:RELATED_TO {similarity: 0.85, reason: "semantic proximity"}]->(c2)

// Concept is sub-category of another
MATCH (child:CONCEPT {id: "semantic_search"}), 
      (parent:CONCEPT {id: "ai"})
CREATE (child)-[r:PART_OF]->(parent)

// User learned something from conversation
MATCH (conv:CONVERSATION), (concept:CONCEPT)
CREATE (conv)-[r:LEARNED {timestamp: datetime(), confidence: 0.9}]->(concept)

// Memory item answers a question
MATCH (item:MEMORY_ITEM), (insight:INSIGHT)
CREATE (insight)-[r:ANSWERED_BY]->(item)

// Two conversations are similar
MATCH (c1:CONVERSATION), (c2:CONVERSATION)
WHERE c1.id <> c2.id
CREATE (c1)-[r:SIMILAR_TO {similarity_score: 0.78}]->(c2)
```

***

### Neo4j Queries for Memory Intelligence

```cypher
// Query 1: Get all topics user is interested in (by conversation volume)
MATCH (u:USER {id: $userId})-[:HAS_CONVERSATION]->(c:CONVERSATION)-[:MENTIONED_IN]->(concept:CONCEPT)
RETURN concept.label, COUNT(c) as mention_count, AVG(concept.relevance_score) as avg_relevance
ORDER BY mention_count DESC
LIMIT 10

// Query 2: Find knowledge gaps (concepts user asks about but never masters)
MATCH (u:USER {id: $userId})-[:HAS_CONVERSATION]->(c:CONVERSATION)-[:MENTIONED_IN]->(concept:CONCEPT)
WHERE (c)-[:RESOLVED_QUESTION]->() 
  AND NOT (c)-[:LEARNED]->(concept)
RETURN concept.label, COUNT(c) as question_count, 
       DURATION.BETWEEN(MIN(c.created_at), MAX(c.created_at)) as time_span
ORDER BY question_count DESC

// Query 3: Find cross-domain opportunities (concept X applies to domain Y)
MATCH (source_concept:CONCEPT)<-[:MENTIONED_IN]-(c1:CONVERSATION)-[:SIMILAR_TO]->(c2:CONVERSATION)-[:MENTIONED_IN]->(target_concept:CONCEPT)
WHERE source_concept.domain <> target_concept.domain
  AND NOT (source_concept)-[:APPLIES_TO]->(target_concept)
RETURN source_concept.label + " → " + target_concept.label as opportunity,
       COUNT(DISTINCT c1) as supporting_evidence
ORDER BY supporting_evidence DESC

// Query 4: Memory synthesis - weekly digest
MATCH (u:USER {id: $userId})-[:HAS_CONVERSATION]->(c:CONVERSATION)
WHERE c.created_at > datetime() - DURATION('P7D')
WITH c, [(c)-[:MENTIONED_IN]->(concept:CONCEPT) | concept] as concepts,
         [(c)-[:LEARNED]->(skill) | skill] as learned_skills,
         [(c)-[:CREATED]->(output) | output] as outputs
RETURN {
  conversations_this_week: COUNT(DISTINCT c),
  topics_explored: COUNT(DISTINCT concepts),
  new_skills: learned_skills,
  outputs_created: COUNT(DISTINCT outputs),
  key_insights: concepts
}

// Query 5: Find contradictions (user believed X, now learned Y)
MATCH (c1:CONVERSATION)-[:BELIEVED_THAT]->(old_belief),
      (c2:CONVERSATION)-[:NOW_KNOWS]->(new_belief)
WHERE old_belief.content <> new_belief.content
  AND c1.created_at < c2.created_at
  AND apoc.text.levenshteinSimilarity(old_belief.content, new_belief.content) > 0.6
RETURN old_belief.content, new_belief.content, 
       DURATION.BETWEEN(c1.created_at, c2.created_at) as learning_duration

// Query 6: Project clustering (auto-group related conversations)
MATCH (u:USER {id: $userId})-[:HAS_CONVERSATION]->(c:CONVERSATION)
WHERE c.created_at > datetime() - DURATION('P90D')
WITH c, [(c)-[:MENTIONED_IN]->(concept:CONCEPT) | concept.id] as concept_ids
MATCH (c)-[sim:SIMILAR_TO]->()
WHERE sim.similarity_score > 0.7
WITH c, concept_ids, COUNT(DISTINCT sim) as connection_strength
CALL apoc.create.clusterize(concept_ids, 0.6)
YIELD clusters
RETURN clusters as project_clusters

// Query 7: Expertise score (what is user an expert in)
MATCH (u:USER {id: $userId})-[:HAS_CONVERSATION]->(c:CONVERSATION)-[:MENTIONED_IN]->(concept:CONCEPT)
WITH concept, COUNT(c) as mention_count, 
     AVG(c.model_quality) as avg_response_quality,
     MAX(c.created_at) as last_mentioned
WHERE mention_count > 5 AND last_mentioned > datetime() - DURATION('P60D')
RETURN concept.label as expertise,
       mention_count as depth,
       avg_response_quality as confidence,
       CASE 
         WHEN mention_count > 50 THEN 'Expert'
         WHEN mention_count > 20 THEN 'Advanced'
         WHEN mention_count > 10 THEN 'Intermediate'
         ELSE 'Beginner'
       END as level
ORDER BY mention_count DESC
```

***

### Vector Database Schema (Pinecone/Weaviate)

```json
{
  "vectorstore_config": {
    "provider": "pinecone",
    "index_name": "aspendos-memories",
    "dimension": 1536,
    "metric": "cosine",
    "cloud": "aws",
    "region": "us-east-1"
  },
  "namespace_structure": {
    "user_id": {
      "embeddings": [
        {
          "id": "conv_abc123_msg_1",
          "values": [0.123, -0.456, ...],
          "metadata": {
            "type": "message",
            "conversation_id": "conv_abc123",
            "user_id": "user_123",
            "timestamp": "2026-01-14T20:30:00Z",
            "model_used": "gpt-4",
            "text": "How do I optimize semantic search?",
            "tags": ["semantic_search", "ml", "optimization"],
            "importance": 0.8,
            "response_quality": 0.92
          }
        },
        {
          "id": "memory_item_xyz789",
          "values": [0.234, -0.567, ...],
          "metadata": {
            "type": "memory_item",
            "title": "Semantic Search Best Practices",
            "created_at": "2026-01-14T20:35:00Z",
            "content": "Use embedding dimensions between 384-1536 for balance between accuracy and cost",
            "references": ["conv_abc123_msg_1", "conv_abc123_msg_5"],
            "edited_at": "2026-01-15T10:00:00Z",
            "pinned": true
          }
        }
      ]
    }
  },
  "vector_operations": {
    "upsert": {
      "description": "Add or update embeddings",
      "batch_size": 100,
      "deduplicate": true
    },
    "query": {
      "description": "Semantic search",
      "top_k": 5,
      "include_metadata": true,
      "filter": {
        "type": "message",
        "timestamp": {"$gte": "2026-01-01T00:00:00Z"}
      }
    },
    "hybrid_search": {
      "description": "Combine vector + keyword search",
      "alpha": 0.7,
      "keyword_weights": {
        "exact_match": 1.0,
        "partial_match": 0.7,
        "tag_match": 0.6
      }
    }
  }
}
```

***

## Memory Intelligence Algorithms

### 1. Automatic Topic Clustering

```python
# algorithm: daily clustering of new conversations

def cluster_user_memories(user_id: str, days: int = 1):
    """
    Automatically cluster conversations from last N days
    into coherent "projects" or "topics"
    """
    
    # Step 1: Fetch recent conversations + embeddings
    recent_convs = db.query(f"""
        SELECT c.id, c.created_at, c.summary
        FROM conversations c
        WHERE c.user_id = '{user_id}' 
          AND c.created_at > NOW() - INTERVAL '{days} days'
        ORDER BY c.created_at
    """)
    
    # Step 2: Get embeddings from vector store
    embeddings = pinecone_client.fetch(
        ids=[f"conv_{c['id']}" for c in recent_convs]
    )
    
    # Step 3: Perform clustering (DBSCAN or hierarchical)
    from sklearn.cluster import DBSCAN
    
    vectors = np.array([e['values'] for e in embeddings['vectors']])
    clustering = DBSCAN(eps=0.3, min_samples=2).fit(vectors)
    
    labels = clustering.labels_
    
    # Step 4: Create or merge clusters
    for cluster_id, conversations in groupby_cluster(labels, recent_convs):
        # Find existing cluster with similar centroid
        cluster_centroid = np.mean([vectors[i] for i in conversations], axis=0)
        
        existing_cluster = neo4j_db.query(f"""
            MATCH (cluster:CLUSTER)-[:CONTAINS]->(c:CONVERSATION)
            WHERE cluster.user_id = '{user_id}'
            WITH cluster, AVG(apoc.vectorSimilarity(cluster.centroid, $centroid)) as similarity
            WHERE similarity > 0.8
            RETURN cluster LIMIT 1
        """, {"centroid": cluster_centroid.tolist()})
        
        if existing_cluster:
            # Merge with existing
            for conv in conversations:
                neo4j_db.query(f"""
                    MATCH (cluster:CLUSTER {{id: '{existing_cluster['id']}'}})
                    MATCH (c:CONVERSATION {{id: '{conv['id']}'}})
                    CREATE (cluster)-[:CONTAINS]->(c)
                """)
        else:
            # Create new cluster
            cluster_name = generate_cluster_name(conversations, model="gpt-4")
            neo4j_db.create_node("CLUSTER", {
                "id": uuid.uuid4(),
                "user_id": user_id,
                "name": cluster_name,
                "centroid": cluster_centroid.tolist(),
                "created_at": datetime.now(),
                "conversation_count": len(conversations)
            })
    
    # Step 5: Update user's memory summary
    update_memory_summary(user_id)


def generate_cluster_name(conversations: list, model: str = "gpt-4") -> str:
    """
    Use LLM to generate name for cluster based on conversation titles
    """
    titles = [c['summary'] for c in conversations]
    
    prompt = f"""
    Given these conversation titles:
    {chr(10).join(titles)}
    
    Generate a single, concise project/theme name (max 5 words) that captures the common thread.
    Respond with ONLY the name, nothing else.
    """
    
    response = openai_client.ChatCompletion.create(
        model=model,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.7,
        max_tokens=20
    )
    
    return response.choices[0].message.content.strip()
```

***

### 2. Knowledge Gap Detection

```python
def detect_knowledge_gaps(user_id: str) -> list[dict]:
    """
    Find concepts/topics user repeatedly asks about
    but shows low mastery/understanding
    """
    
    gaps = neo4j_db.query(f"""
        MATCH (u:USER {{id: '{user_id}'}})-[:HAS_CONVERSATION]->(c:CONVERSATION)-[:MENTIONED_IN]->(concept:CONCEPT)
        WITH concept, COUNT(c) as mention_count, 
             AVG(c.user_satisfaction) as avg_satisfaction,
             MAX(c.created_at) as last_mentioned,
             COLLECT(c.id) as conversation_ids
        WHERE mention_count >= 3  // Asked at least 3 times
          AND avg_satisfaction < 0.6  // User not satisfied with answers
          AND last_mentioned > datetime() - DURATION('P30D')  // Within last month
        RETURN {{
          concept: concept.label,
          mentions: mention_count,
          satisfaction: avg_satisfaction,
          last_asked: last_mentioned,
          conversation_ids: conversation_ids
        }} as gap
        ORDER BY mention_count DESC
        LIMIT 10
    """)
    
    # For each gap, suggest learning resources
    enriched_gaps = []
    for gap in gaps:
        # Find related advanced topics user should explore
        advanced_topics = neo4j_db.query(f"""
            MATCH (concept:CONCEPT {{label: '{gap['concept']}'}})-[:PART_OF*1..2]->(parent:CONCEPT)
            RETURN DISTINCT parent.label as topic
        """)
        
        # Find if user has explored these related topics
        explored = neo4j_db.query(f"""
            MATCH (u:USER {{id: '{user_id}'}})-[:HAS_CONVERSATION]->(c:CONVERSATION)-[:MENTIONED_IN]->(concept:CONCEPT {{label: '{gap['concept']}'}})
            RETURN COUNT(DISTINCT c) as explored_count
        """)
        
        enriched_gaps.append({
            **gap,
            "suggested_topics": [t['topic'] for t in advanced_topics],
            "recommendation": f"Consider exploring {', '.join([t['topic'] for t in advanced_topics])} to build deeper understanding",
            "priority": "high" if gap['mentions'] > 5 else "medium"
        })
    
    return enriched_gaps
```

***

### 3. Memory Synthesis (Weekly Digest)

```python
def generate_memory_synthesis(user_id: str, period_days: int = 7) -> dict:
    """
    Generate intelligent summary of learnings, patterns, and insights
    from last N days of conversations
    """
    
    # Fetch all conversations and concepts from period
    period_data = neo4j_db.query(f"""
        MATCH (u:USER {{id: '{user_id}'}})-[:HAS_CONVERSATION]->(c:CONVERSATION)
        WHERE c.created_at > datetime() - DURATION('P{period_days}D')
        WITH c, [(c)-[:MENTIONED_IN]->(concept:CONCEPT) | {{
          id: concept.id,
          label: concept.label,
          first_mentioned: concept.created_at
        }}] as concepts,
             [(c)-[:GENERATED]->(output) | output.type] as output_types
        RETURN {{
          conversation_id: c.id,
          created_at: c.created_at,
          concepts: concepts,
          output_types: output_types,
          model_used: c.model_used,
          user_satisfaction: c.user_satisfaction
        }} as conv_data
    """)
    
    # Analyze patterns
    synthesis_data = {
        "period": f"Last {period_days} days",
        "total_conversations": len(period_data),
        "total_tokens_used": sum([c['tokens_used'] for c in period_data]),
        "average_satisfaction": np.mean([c['user_satisfaction'] for c in period_data]),
        "concepts_explored": list(set([concept['label'] for c in period_data for concept in c['concepts']])),
        "top_models_used": Counter([c['model_used'] for c in period_data]).most_common(3),
        "outputs_generated": Counter([output for c in period_data for output in c['output_types']]).most_common(5)
    }
    
    # Use Claude to generate narrative synthesis
    synthesis_prompt = f"""
    User activity from last {period_days} days:
    
    - Total conversations: {synthesis_data['total_conversations']}
    - Topics explored: {', '.join(synthesis_data['concepts_explored'][:10])}
    - Average satisfaction with answers: {synthesis_data['average_satisfaction']:.0%}
    - Most used models: {', '.join([f"{model[0]} ({model[1]}x)" for model in synthesis_data['top_models_used']])}
    - Outputs created: {dict(synthesis_data['outputs_generated'])}
    
    Generate a personalized, insightful 3-4 paragraph digest of:
    1. What they learned this week
    2. Patterns and themes
    3. Progress in their goals/projects
    4. Suggested next steps or areas to explore
    
    Be conversational, encouraging, and specific.
    """
    
    narrative = anthropic_client.messages.create(
        model="claude-3-5-sonnet-20241022",
        max_tokens=800,
        messages=[
            {"role": "user", "content": synthesis_prompt}
        ]
    ).content[0].text
    
    return {
        **synthesis_data,
        "narrative_synthesis": narrative,
        "generated_at": datetime.now().isoformat()
    }
```

***

### 4. Cross-Domain Pattern Detection

```python
def detect_cross_domain_patterns(user_id: str) -> list[dict]:
    """
    Find concepts/methodologies that appear in multiple domains
    and could be applied elsewhere
    """
    
    # Get all concepts and their domains
    concepts_by_domain = neo4j_db.query(f"""
        MATCH (u:USER {{id: '{user_id}'}})-[:HAS_CONVERSATION]->(c:CONVERSATION)-[:MENTIONED_IN]->(concept:CONCEPT)
        WITH concept.label as concept_label, concept.domain as domain
        RETURN concept_label, COLLECT(DISTINCT domain) as domains, COUNT(*) as mention_count
        ORDER BY mention_count DESC
    """)
    
    # Find concepts mentioned in multiple domains
    cross_domain = [
        c for c in concepts_by_domain 
        if len(c['domains']) > 1
    ]
    
    # Generate insights for each cross-domain concept
    insights = []
    for concept in cross_domain:
        # Query where this concept was applied
        applications = neo4j_db.query(f"""
            MATCH (c:CONVERSATION)-[:MENTIONED_IN]->(concept:CONCEPT {{label: '{concept['concept_label']}'}})
            WITH DISTINCT concept.domain as domain, COUNT(c) as count
            RETURN domain, count
            ORDER BY count DESC
        """)
        
        # Generate insight using Claude
        insight_prompt = f"""
        A user has been exploring '{concept['concept_label']}' across these domains:
        {chr(10).join([f"- {app['domain']} ({app['count']} mentions)" for app in applications])}
        
        Generate a 1-2 sentence insight about how they might leverage this concept across domains.
        Focus on practical applications.
        """
        
        insight_text = anthropic_client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=150,
            messages=[{"role": "user", "content": insight_prompt}]
        ).content[0].text
        
        insights.append({
            "concept": concept['concept_label'],
            "domains": concept['domains'],
            "mention_count": concept['mention_count'],
            "insight": insight_text
        })
    
    return insights
```

***

### 5. Memory Inspector (3D Graph Visualization)

The Memory Inspector is a ULTRA feature that visualizes the knowledge graph as an interactive 3D network.

```typescript
// Frontend: React Three Fiber 3D Graph Visualization

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';

interface GraphNode {
  id: string;
  label: string;
  type: 'CONCEPT' | 'ENTITY' | 'CONVERSATION' | 'INSIGHT' | 'MEMORY_ITEM';
  connections: number;
  importance: number;
  cluster?: string;
}

interface GraphEdge {
  source: string;
  target: string;
  type: string;
  strength: number;
}

const MemoryGraph: React.FC<{ nodes: GraphNode[], edges: GraphEdge[] }> = ({ nodes, edges }) => {
  // Compute 3D layout using force-directed algorithm
  const layout = useForceDirectedLayout(nodes, edges, 100);
  
  return (
    <Canvas camera={{ position: [50, 50, 50], fov: 75 }}>
      <ambientLight intensity={0.6} />
      <pointLight position={[100, 100, 100]} intensity={1} />
      
      <MemoryGraphContent nodes={nodes} edges={edges} layout={layout} />
      
      <OrbitControls autoRotate autoRotateSpeed={2} />
    </Canvas>
  );
};

const MemoryGraphContent: React.FC<{
  nodes: GraphNode[];
  edges: GraphEdge[];
  layout: Map<string, THREE.Vector3>;
}> = ({ nodes, edges, layout }) => {
  const group = useRef<THREE.Group>(null);
  
  // Draw edges
  const edgeLines = edges.map(edge => {
    const start = layout.get(edge.source);
    const end = layout.get(edge.target);
    return (
      <line key={`${edge.source}-${edge.target}`}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={2}
            array={new Float32Array([start.x, start.y, start.z, end.x, end.y, end.z])}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial
          color={getEdgeColor(edge.type)}
          opacity={0.3 + 0.7 * edge.strength}
          transparent
          linewidth={1}
        />
      </line>
    );
  });
  
  // Draw nodes
  const nodeObjects = nodes.map(node => {
    const pos = layout.get(node.id);
    const size = 1 + node.importance * 2;
    const color = getNodeColor(node.type);
    
    return (
      <group key={node.id} position={[pos.x, pos.y, pos.z]}>
        <mesh
          onClick={() => handleNodeClick(node)}
          onPointerOver={() => handleNodeHover(node.id, true)}
          onPointerOut={() => handleNodeHover(node.id, false)}
        >
          <sphereGeometry args={[size, 32, 32]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.3} />
        </mesh>
        
        <Text position={[0, size + 1, 0]} fontSize={3} color="white" anchorX="center">
          {node.label}
        </Text>
      </group>
    );
  });
  
  return (
    <group ref={group}>
      {edgeLines}
      {nodeObjects}
    </group>
  );
};

function useForceDirectedLayout(
  nodes: GraphNode[],
  edges: GraphEdge[],
  iterations: number
): Map<string, THREE.Vector3> {
  const layout = new Map<string, THREE.Vector3>();
  
  // Initialize positions randomly
  nodes.forEach(node => {
    layout.set(
      node.id,
      new THREE.Vector3(
        (Math.random() - 0.5) * 100,
        (Math.random() - 0.5) * 100,
        (Math.random() - 0.5) * 100
      )
    );
  });
  
  // Force-directed simulation (Fruchterman-Reingold algorithm)
  const K = Math.sqrt(5000 / nodes.length);
  const dt = 0.1;
  const maxForceMag = 50;
  
  for (let iter = 0; iter < iterations; iter++) {
    const forces = new Map<string, THREE.Vector3>();
    nodes.forEach(node => forces.set(node.id, new THREE.Vector3()));
    
    // Repulsive forces (all pairs)
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const n1 = nodes[i];
        const n2 = nodes[j];
        const p1 = layout.get(n1.id);
        const p2 = layout.get(n2.id);
        
        const delta = new THREE.Vector3().subVectors(p1, p2);
        const dist = Math.max(delta.length(), 0.1);
        const forceMag = K * K / (dist * dist);
        
        const force = delta.normalize().multiplyScalar(forceMag);
        forces.get(n1.id).add(force);
        forces.get(n2.id).sub(force);
      }
    }
    
    // Attractive forces (connected edges)
    edges.forEach(edge => {
      const p1 = layout.get(edge.source);
      const p2 = layout.get(edge.target);
      
      const delta = new THREE.Vector3().subVectors(p2, p1);
      const dist = delta.length();
      const forceMag = (dist * dist) / K * edge.strength;
      
      const force = delta.normalize().multiplyScalar(forceMag);
      forces.get(edge.source).add(force);
      forces.get(edge.target).sub(force);
    });
    
    // Update positions
    nodes.forEach(node => {
      const force = forces.get(node.id);
      const forceMag = Math.min(force.length(), maxForceMag);
      force.normalize().multiplyScalar(forceMag);
      
      const pos = layout.get(node.id);
      pos.add(force.multiplyScalar(dt));
    });
  }
  
  return layout;
}

function getNodeColor(type: string): string {
  const colors = {
    CONCEPT: 0x3b82f6,
    ENTITY: 0x8b5cf6,
    CONVERSATION: 0x10b981,
    INSIGHT: 0xf59e0b,
    MEMORY_ITEM: 0xef4444
  };
  return colors[type] || 0x64748b;
}

function getEdgeColor(type: string): string {
  const colors = {
    MENTIONED_IN: 0x3b82f6,
    RELATED_TO: 0x8b5cf6,
    LEARNED: 0x10b981,
    ANSWERED_BY: 0xf59e0b,
    PART_OF: 0x64748b
  };
  return colors[type] || 0xa0aec0;
}
```

***

## Memory Policies & GDPR/HIPAA Compliance

```typescript
// Memory Policy Management

interface MemoryPolicy {
  id: string;
  user_id: string;
  name: string;
  rules: MemoryRule[];
  created_at: Date;
  updated_at: Date;
}

interface MemoryRule {
  type: 'RETENTION' | 'ENCRYPTION' | 'ANONYMIZATION' | 'DELETION' | 'ACCESS_CONTROL';
  condition: string;
  action: string;
  applies_to: string[]; // What types of memory (conversations, documents, etc.)
  metadata?: Record<string, any>;
}

const defaultMemoryPolicies = {
  GDPR_COMPLIANT: {
    name: "GDPR Compliant",
    rules: [
      {
        type: 'RETENTION',
        condition: 'all',
        action: 'KEEP_FOR_YEARS',
        applies_to: ['conversation', 'memory_item'],
        metadata: { years: 3 }
      },
      {
        type: 'ANONYMIZATION',
        condition: 'contains_pii',
        action: 'ANONYMIZE_ON_ACCESS',
        applies_to: ['conversation', 'memory_item']
      },
      {
        type: 'ACCESS_CONTROL',
        condition: 'all',
        action: 'REQUIRE_USER_CONSENT',
        applies_to: ['all'],
        metadata: { require_explicit_consent: true }
      }
    ]
  },
  
  HIPAA_COMPLIANT: {
    name: "HIPAA Compliant",
    rules: [
      {
        type: 'ENCRYPTION',
        condition: 'all',
        action: 'ENCRYPT_AT_REST_AND_IN_TRANSIT',
        applies_to: ['all'],
        metadata: { algorithm: 'AES-256' }
      },
      {
        type: 'RETENTION',
        condition: 'all',
        action: 'KEEP_FOR_YEARS',
        applies_to: ['conversation', 'memory_item'],
        metadata: { years: 6 }
      },
      {
        type: 'DELETION',
        condition: 'user_requested',
        action: 'SECURE_DELETE_IMMEDIATELY',
        applies_to: ['all'],
        metadata: { method: 'secure_wipe' }
      },
      {
        type: 'ACCESS_CONTROL',
        condition: 'all',
        action: 'AUDIT_LOG_ALL_ACCESS',
        applies_to: ['all']
      }
    ]
  },
  
  PRIVACY_FOCUSED: {
    name: "Privacy Focused",
    rules: [
      {
        type: 'DELETION',
        condition: 'older_than_days',
        action: 'AUTO_DELETE',
        applies_to: ['conversation'],
        metadata: { days: 90 }
      },
      {
        type: 'ENCRYPTION',
        condition: 'all',
        action: 'CLIENT_SIDE_ENCRYPTION',
        applies_to: ['all'],
        metadata: { key_management: 'user_controlled' }
      },
      {
        type: 'ANONYMIZATION',
        condition: 'all',
        action: 'REMOVE_IDENTIFIERS',
        applies_to: ['memory_item']
      }
    ]
  }
};

// API Endpoint: Apply Memory Policy
async function applyMemoryPolicy(
  userId: string,
  policyId: string
): Promise<{ status: string; affected_records: number }> {
  const policy = await db.query(
    `SELECT * FROM memory_policies WHERE id = $1 AND user_id = $2`,
    [policyId, userId]
  );
  
  if (!policy) throw new Error('Policy not found');
  
  let affectedCount = 0;
  
  for (const rule of policy.rules) {
    switch (rule.type) {
      case 'RETENTION':
        // Delete old records
        const yearsToKeep = rule.metadata.years;
        const result = await db.query(
          `DELETE FROM conversations 
           WHERE user_id = $1 
           AND created_at < NOW() - INTERVAL '${yearsToKeep} years'`,
          [userId]
        );
        affectedCount += result.rowCount;
        break;
        
      case 'ANONYMIZATION':
        // Remove PII from conversations
        await anonymizeConversations(userId, rule);
        break;
        
      case 'ENCRYPTION':
        // Re-encrypt all data
        await reencryptUserData(userId, rule.metadata.algorithm);
        break;
        
      case 'DELETION':
        if (rule.condition === 'user_requested') {
          const deleteResult = await securelyDeleteUserData(userId, rule.metadata.method);
          affectedCount += deleteResult;
        }
        break;
    }
  }
  
  return {
    status: 'success',
    affected_records: affectedCount
  };
}

async function anonymizeConversations(
  userId: string,
  rule: MemoryRule
): Promise<void> {
  // Use Claude to identify PII in conversations
  const conversations = await db.query(
    `SELECT id, content FROM conversations WHERE user_id = $1`,
    [userId]
  );
  
  for (const conv of conversations) {
    const piiResponse = await anthropic_client.messages.create({
      model: "claude-3-5-sonnet-20241022",
      messages: [
        {
          role: "user",
          content: `Identify all PII (names, emails, phone numbers, addresses, credit cards, etc.) in this text and respond with JSON mapping original -> anonymized. Original text: ${conv.content}`
        }
      ]
    });
    
    // Apply replacements
    let anonymizedContent = conv.content;
    const replacements = JSON.parse(piiResponse.content[0].text);
    
    for (const [original, anonymized] of Object.entries(replacements)) {
      anonymizedContent = anonymizedContent.replaceAll(original, anonymized);
    }
    
    await db.query(
      `UPDATE conversations SET content = $1 WHERE id = $2`,
      [anonymizedContent, conv.id]
    );
  }
}
```

***

***

# 3. API ARCHITECTURE & MODEL ROUTING

## Complete Model Routing Logic

### Model Availability Matrix

```typescript
interface ModelConfig {
  id: string;
  provider: string;
  name: string;
  category: 'TEXT' | 'VISION' | 'VOICE' | 'VIDEO';
  costPer1kTokens: {
    input: number;
    output: number;
  };
  latency: {
    min: number; // ms
    p50: number;
    p99: number;
  };
  capabilities: string[];
  rateLimit: number; // requests per minute
  contextWindow: number; // tokens
  supportedRegions: string[];
  fallbackModels: string[];
  maxParallelRequests: number;
}

const modelRegistry: Record<string, ModelConfig> = {
  // Primary TEXT models (direct API)
  'gpt-4o': {
    id: 'gpt-4o',
    provider: 'openai',
    name: 'GPT-4o',
    category: 'TEXT',
    costPer1kTokens: { input: 0.005, output: 0.015 },
    latency: { min: 100, p50: 250, p99: 500 },
    capabilities: ['chat', 'analysis', 'coding', 'creative', 'multimodal'],
    rateLimit: 500,
    contextWindow: 128000,
    supportedRegions: ['us', 'eu', 'apac'],
    fallbackModels: ['gpt-4-turbo', 'gpt-3.5-turbo'],
    maxParallelRequests: 100
  },

  'gpt-4-turbo': {
    id: 'gpt-4-turbo',
    provider: 'openai',
    name: 'GPT-4 Turbo',
    category: 'TEXT',
    costPer1kTokens: { input: 0.01, output: 0.03 },
    latency: { min: 150, p50: 300, p99: 600 },
    capabilities: ['chat', 'analysis', 'coding', 'vision'],
    rateLimit: 300,
    contextWindow: 128000,
    supportedRegions: ['us', 'eu', 'apac'],
    fallbackModels: ['gpt-4'],
    maxParallelRequests: 50
  },

  'gpt-3.5-turbo': {
    id: 'gpt-3.5-turbo',
    provider: 'openai',
    name: 'GPT-3.5 Turbo',
    category: 'TEXT',
    costPer1kTokens: { input: 0.0005, output: 0.0015 },
    latency: { min: 80, p50: 150, p99: 300 },
    capabilities: ['chat', 'analysis'],
    rateLimit: 1000,
    contextWindow: 16000,
    supportedRegions: ['us', 'eu', 'apac'],
    fallbackModels: ['text-davinci-003'],
    maxParallelRequests: 200
  },

  'claude-3.5-sonnet': {
    id: 'claude-3.5-sonnet',
    provider: 'anthropic',
    name: 'Claude 3.5 Sonnet',
    category: 'TEXT',
    costPer1kTokens: { input: 0.003, output: 0.015 },
    latency: { min: 200, p50: 400, p99: 800 },
    capabilities: ['chat', 'analysis', 'coding', 'creative', 'reasoning'],
    rateLimit: 300,
    contextWindow: 200000,
    supportedRegions: ['us', 'eu'],
    fallbackModels: ['claude-3-opus'],
    maxParallelRequests: 100,
    special: { cacheTokenSupport: true } // Prompt caching
  },

  'claude-3-opus': {
    id: 'claude-3-opus',
    provider: 'anthropic',
    name: 'Claude 3 Opus',
    category: 'TEXT',
    costPer1kTokens: { input: 0.015, output: 0.075 },
    latency: { min: 250, p50: 500, p99: 1000 },
    capabilities: ['chat', 'analysis', 'coding', 'creative', 'reasoning'],
    rateLimit: 300,
    contextWindow: 200000,
    supportedRegions: ['us', 'eu'],
    fallbackModels: ['claude-3-sonnet'],
    maxParallelRequests: 50
  },

  'gemini-2.0-flash': {
    id: 'gemini-2.0-flash',
    provider: 'google',
    name: 'Gemini 2.0 Flash',
    category: 'TEXT',
    costPer1kTokens: { input: 0.075, output: 0.3 },
    latency: { min: 100, p50: 200, p99: 400 },
    capabilities: ['chat', 'analysis', 'coding', 'creative', 'multimodal', 'web_search'],
    rateLimit: 600,
    contextWindow: 1000000,
    supportedRegions: ['us', 'eu', 'apac'],
    fallbackModels: ['gemini-pro'],
    maxParallelRequests: 150,
    special: { webSearch: true }
  },

  'grok-3': {
    id: 'grok-3',
    provider: 'xai',
    name: 'Grok 3',
    category: 'TEXT',
    costPer1kTokens: { input: 0.002, output: 0.006 },
    latency: { min: 150, p50: 350, p99: 700 },
    capabilities: ['chat', 'analysis', 'coding', 'web_search', 'real_time'],
    rateLimit: 500,
    contextWindow: 131072,
    supportedRegions: ['us', 'eu'],
    fallbackModels: ['grok-2'],
    maxParallelRequests: 100,
    special: { realtimeWeb: true }
  },

  // Open-source models via OpenRouter (fallback)
  'meta-llama-3.3-70b': {
    id: 'meta-llama-3.3-70b',
    provider: 'openrouter',
    name: 'Llama 3.3 70B',
    category: 'TEXT',
    costPer1kTokens: { input: 0.00054, output: 0.0008 },
    latency: { min: 200, p50: 400, p99: 1000 },
    capabilities: ['chat', 'analysis', 'coding'],
    rateLimit: 200,
    contextWindow: 8000,
    supportedRegions: ['us', 'eu'],
    fallbackModels: ['meta-llama-2-70b'],
    maxParallelRequests: 100
  },

  'mistral-large': {
    id: 'mistral-large',
    provider: 'openrouter',
    name: 'Mistral Large',
    category: 'TEXT',
    costPer1kTokens: { input: 0.0008, output: 0.0024 },
    latency: { min: 100, p50: 250, p99: 500 },
    capabilities: ['chat', 'analysis', 'coding'],
    rateLimit: 400,
    contextWindow: 32000,
    supportedRegions: ['us', 'eu'],
    fallbackModels: ['mistral-medium'],
    maxParallelRequests: 150
  },

  'deepseek-v3': {
    id: 'deepseek-v3',
    provider: 'openrouter',
    name: 'DeepSeek V3',
    category: 'TEXT',
    costPer1kTokens: { input: 0.00027, output: 0.00036 },
    latency: { min: 200, p50: 400, p99: 1200 },
    capabilities: ['chat', 'analysis', 'coding'],
    rateLimit: 100,
    contextWindow: 128000,
    supportedRegions: ['us', 'eu', 'apac'],
    fallbackModels: ['deepseek-v2.5'],
    maxParallelRequests: 50,
    special: { cheapest: true }
  },

  // Vision models
  'flux-pro': {
    id: 'flux-pro',
    provider: 'fal.ai',
    name: 'Flux Pro',
    category: 'VISION',
    costPer1kTokens: { input: 0.025, output: 0.025 }, // Per image
    latency: { min: 3000, p50: 5000, p99: 8000 },
    capabilities: ['image_generation', 'high_quality'],
    rateLimit: 60,
    contextWindow: 0,
    supportedRegions: ['us', 'eu'],
    fallbackModels: ['dall-e-3', 'stability-xl'],
    maxParallelRequests: 20
  },

  'dall-e-3': {
    id: 'dall-e-3',
    provider: 'openai',
    name: 'DALL-E 3',
    category: 'VISION',
    costPer1kTokens: { input: 0.02, output: 0.02 },
    latency: { min: 5000, p50: 8000, p99: 15000 },
    capabilities: ['image_generation'],
    rateLimit: 50,
    contextWindow: 0,
    supportedRegions: ['us', 'eu'],
    fallbackModels: ['dall-e-2'],
    maxParallelRequests: 10
  },

  // Video models
  'kling-ai': {
    id: 'kling-ai',
    provider: 'fal.ai',
    name: 'Kling AI',
    category: 'VIDEO',
    costPer1kTokens: { input: 0.1, output: 0.1 }, // Per video
    latency: { min: 30000, p50: 60000, p99: 120000 },
    capabilities: ['video_generation', 'highest_quality'],
    rateLimit: 30,
    contextWindow: 0,
    supportedRegions: ['us', 'eu'],
    fallbackModels: ['runway-gen-3', 'heygen'],
    maxParallelRequests: 5
  },

  // Voice/TTS
  'openai-tts-hd': {
    id: 'openai-tts-hd',
    provider: 'openai',
    name: 'OpenAI TTS HD',
    category: 'VOICE',
    costPer1kTokens: { input: 0.03, output: 0 }, // Per 1k chars
    latency: { min: 500, p50: 1000, p99: 2000 },
    capabilities: ['text_to_speech', 'high_quality'],
    rateLimit: 300,
    contextWindow: 0,
    supportedRegions: ['us', 'eu'],
    fallbackModels: ['openai-tts-1', 'elevenlabs'],
    maxParallelRequests: 100
  },

  'elevenlabs-turbo': {
    id: 'elevenlabs-turbo',
    provider: 'elevenlabs',
    name: 'ElevenLabs Turbo',
    category: 'VOICE',
    costPer1kTokens: { input: 0.015, output: 0 },
    latency: { min: 200, p50: 500, p99: 1000 },
    capabilities: ['text_to_speech', 'natural_voice'],
    rateLimit: 500,
    contextWindow: 0,
    supportedRegions: ['us', 'eu'],
    fallbackModels: ['elevenlabs-premium', 'google-tts'],
    maxParallelRequests: 200
  }
};
```

***

### Model Routing Algorithm

```typescript
interface RoutingDecision {
  primaryModel: string;
  fallbacks: string[];
  estimatedLatency: number;
  estimatedCost: number;
  reason: string;
}

interface RoutingContext {
  userTier: 'FREE' | 'PRO' | 'ULTRA' | 'ENTERPRISE';
  modelPreferences: string[];
  costConstraint?: number; // max cost in cents
  latencyConstraint?: number; // max latency in ms
  region: string;
  concurrentRequests: number;
  queueLength: number;
  userHistory: {
    modelUsageCount: Record<string, number>;
    satisfactionScores: Record<string, number>;
  };
}

async function routeRequest(
  userRequest: {
    type: 'TEXT' | 'IMAGE' | 'VIDEO' | 'VOICE_INPUT' | 'VOICE_OUTPUT';
    content: string;
    context: string;
    metadata?: Record<string, any>;
  },
  routingContext: RoutingContext
): Promise<RoutingDecision> {
  
  // Step 1: Filter models by capability and availability
  const compatibleModels = getCompatibleModels(userRequest.type, routingContext.region);
  
  if (compatibleModels.length === 0) {
    throw new Error(`No compatible models available for ${userRequest.type}`);
  }

  // Step 2: Score each model based on multiple factors
  const scoredModels = compatibleModels.map(modelId => {
    const model = modelRegistry[modelId];
    const score = calculateModelScore(
      model,
      userRequest,
      routingContext
    );
    return { modelId, model, score };
  }).sort((a, b) => b.score - a.score);

  // Step 3: Check rate limits and availability
  const availableModels = await filterByAvailability(scoredModels, routingContext);
  
  if (availableModels.length === 0) {
    // All models are rate-limited, queue the request
    const queuedResponse = await queueRequest(userRequest, routingContext);
    return queuedResponse;
  }

  // Step 4: Select primary model and fallbacks
  const primaryModel = availableModels[0];
  const fallbacks = availableModels.slice(1, 3).map(m => m.modelId);

  return {
    primaryModel: primaryModel.modelId,
    fallbacks,
    estimatedLatency: primaryModel.model.latency.p50,
    estimatedCost: calculateRequestCost(userRequest, primaryModel.model),
    reason: `Selected ${primaryModel.modelId} (score: ${primaryModel.score.toFixed(2)}) based on cost, latency, and user preferences`
  };
}

function calculateModelScore(
  model: ModelConfig,
  userRequest: any,
  routingContext: RoutingContext
): number {
  let score = 0;

  // Weight 1: Cost efficiency (30%)
  const costScore = calculateCostScore(model, userRequest, routingContext);
  score += costScore * 0.3;

  // Weight 2: Latency (25%)
  const latencyScore = calculateLatencyScore(model, routingContext);
  score += latencyScore * 0.25;

  // Weight 3: User tier match (20%)
  const tierScore = calculateTierScore(model, routingContext.userTier);
  score += tierScore * 0.2;

  // Weight 4: User history & satisfaction (15%)
  const historyScore = calculateHistoryScore(model, routingContext);
  score += historyScore * 0.15;

  // Weight 5: User preferences (10%)
  const preferenceScore = calculatePreferenceScore(model, routingContext);
  score += preferenceScore * 0.1;

  // Penalty: High queue length
  if (routingContext.queueLength > model.maxParallelRequests) {
    score *= 0.7;
  }

  return score;
}

function calculateCostScore(
  model: ModelConfig,
  userRequest: any,
  routingContext: RoutingContext
): number {
  const estimatedInputTokens = userRequest.content.length / 4; // rough estimate
  const estimatedOutputTokens = estimatedInputTokens * 0.5; // conservative estimate

  const costInCents = (
    (estimatedInputTokens / 1000) * model.costPer1kTokens.input +
    (estimatedOutputTokens / 1000) * model.costPer1kTokens.output
  ) * 100;

  // Score between 0-100
  if (routingContext.costConstraint && costInCents > routingContext.costConstraint) {
    return 0; // Model exceeds cost constraint
  }

  // Cheaper models score higher
  const baseCost = 0.001; // baseline cost in dollars
  return Math.max(0, 100 - (costInCents * 100)); // inverse relationship
}

function calculateLatencyScore(
  model: ModelConfig,
  routingContext: RoutingContext
): number {
  const userLatencyConstraint = routingContext.latencyConstraint || 3000; // default 3s

  // Model exceeds constraint
  if (model.latency.p99 > userLatencyConstraint) {
    return model.latency.p99 > 10000 ? 0 : 20; // Penalty, but not total disqualification
  }

  // Score based on p50 latency (lower is better)
  const basedLatency = 500; // baseline latency in ms
  return Math.max(0, 100 - (model.latency.p50 / basedLatency) * 50);
}

function calculateTierScore(
  model: ModelConfig,
  userTier: string
): number {
  // Map tier to model "level"
  const tierPriority = {
    'FREE': { lowCost: 1.0, capability: 0.3 },
    'PRO': { lowCost: 0.6, capability: 0.8 },
    'ULTRA': { lowCost: 0.4, capability: 1.0 },
    'ENTERPRISE': { lowCost: 0.2, capability: 1.0 }
  };

  const priority = tierPriority[userTier];
  
  // Advanced models should score higher for ULTRA/ENTERPRISE
  if (model.id.includes('4') || model.id.includes('opus')) {
    return priority.capability * 100;
  }

  // Cheaper models should score higher for FREE/PRO
  if (model.costPer1kTokens.input < 0.001) {
    return priority.lowCost * 100;
  }

  return 50;
}

function calculateHistoryScore(
  model: ModelConfig,
  routingContext: RoutingContext
): number {
  const usageCount = routingContext.userHistory.modelUsageCount[model.id] || 0;
  const satisfactionScore = routingContext.userHistory.satisfactionScores[model.id] || 0.5;

  // Users who have had good experiences with a model should use it again
  // But not if usage is extremely high (avoid lock-in)
  const usageBonus = Math.min(usageCount / 100, 1) * 30; // Max 30 points
  const satisfactionBonus = satisfactionScore * 70; // Max 70 points

  return usageBonus + satisfactionBonus;
}

function calculatePreferenceScore(
  model: ModelConfig,
  routingContext: RoutingContext
): number {
  if (routingContext.modelPreferences.includes(model.id)) {
    return 100; // User explicitly requested this model
  }

  // Check if preferred provider
  const preferredProviders = {
    'openai': 30,
    'anthropic': 25,
    'google': 20
  };

  return preferredProviders[model.provider] || 10;
}

async function filterByAvailability(
  scoredModels: any[],
  routingContext: RoutingContext
): Promise<any[]> {
  const available = [];

  for (const scored of scoredModels) {
    const model = scored.model;
    
    // Check current request count
    const currentRequests = await redis.get(`model_requests:${model.id}`);
    const requestCount = parseInt(currentRequests || '0');

    if (requestCount < model.maxParallelRequests) {
      // Check rate limits
      const rateLimitKey = `rate_limit:${model.id}:${routingContext.region}`;
      const currentRate = await redis.incr(rateLimitKey);
      
      if (currentRate <= model.rateLimit) {
        available.push(scored);
        redis.expire(rateLimitKey, 60); // Reset every minute
      }
    }
  }

  return available;
}

function calculateRequestCost(userRequest: any, model: ModelConfig): number {
  const estimatedInputTokens = userRequest.content.length / 4;
  const estimatedOutputTokens = estimatedInputTokens * 0.5;

  return (
    (estimatedInputTokens / 1000) * model.costPer1kTokens.input +
    (estimatedOutputTokens / 1000) * model.costPer1kTokens.output
  );
}

async function queueRequest(
  userRequest: any,
  routingContext: RoutingContext
): Promise<RoutingDecision> {
  const jobId = uuid.v4();
  
  // Add to Bull queue
  await requestQueue.add(
    {
      userRequest,
      routingContext,
      createdAt: new Date(),
      retries: 0,
      maxRetries: 3
    },
    {
      jobId,
      priority: routingContext.userTier === 'ENTERPRISE' ? 1 : 5,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      }
    }
  );

  return {
    primaryModel: 'QUEUED',
    fallbacks: [],
    estimatedLatency: 10000, // 10 seconds estimated
    estimatedCost: 0,
    reason: `Request queued (${routingContext.queueLength} ahead). Job ID: ${jobId}`
  };
}
```

***

### Fallback Handling & Retry Logic

```typescript
async function executeWithFallback(
  request: ChatRequest,
  routingDecision: RoutingDecision,
  userId: string
): Promise<ChatResponse> {
  
  const allModels = [routingDecision.primaryModel, ...routingDecision.fallbacks];
  const errors: { model: string; error: string; timestamp: Date }[] = [];

  for (let i = 0; i < allModels.length; i++) {
    const modelId = allModels[i];
    const model = modelRegistry[modelId];

    try {
      // Increment request counter
      await redis.incr(`model_requests:${modelId}`);

      // Execute request based on model provider
      let response: ChatResponse;

      switch (model.provider) {
        case 'openai':
          response = await executeOpenAIRequest(modelId, request);
          break;

        case 'anthropic':
          response = await executeAnthropicRequest(modelId, request);
          break;

        case 'google':
          response = await executeGoogleRequest(modelId, request);
          break;

        case 'xai':
          response = await executeXAIRequest(modelId, request);
          break;

        case 'openrouter':
          response = await executeOpenRouterRequest(modelId, request);
          break;

        case 'fal.ai':
          response = await executeFalAIRequest(modelId, request);
          break;

        case 'elevenlabs':
          response = await executeElevenLabsRequest(modelId, request);
          break;

        default:
          throw new Error(`Unknown provider: ${model.provider}`);
      }

      // Success! Return response
      response.usedModel = modelId;
      response.fallbacksUsed = i;
      response.executedAt = new Date();

      // Log successful execution
      await logModelUsage(userId, modelId, {
        success: true,
        latency: response.latency,
        tokensUsed: response.tokensUsed,
        cost: response.estimatedCost
      });

      return response;

    } catch (error) {
      errors.push({
        model: modelId,
        error: error.message,
        timestamp: new Date()
      });

      // Log failed attempt
      await logModelUsage(userId, modelId, {
        success: false,
        error: error.message,
        attemptNumber: i + 1
      });

      console.error(`Model ${modelId} failed:`, error.message);

      // Check if we should try fallback
      if (i < allModels.length - 1) {
        console.log(`Attempting fallback: ${allModels[i + 1]}`);
        continue; // Try next fallback
      }
    } finally {
      // Decrement request counter
      await redis.decr(`model_requests:${modelId}`);
    }
  }

  // All models failed
  throw new Error(`All models failed: ${JSON.stringify(errors)}`);
}

async function executeOpenAIRequest(
  modelId: string,
  request: ChatRequest
): Promise<ChatResponse> {
  const model = modelRegistry[modelId];
  const startTime = Date.now();

  try {
    const systemPrompt = buildSystemPrompt(request.userTier, request.conversationHistory);

    const response = await openai.chat.completions.create({
      model: modelId,
      messages: [
        { role: 'system', content: systemPrompt },
        ...request.conversationHistory.map(msg => ({
          role: msg.role,
          content: msg.content
        }))
      ],
      max_tokens: request.maxTokens || 2000,
      temperature: request.temperature || 0.7,
      top_p: request.topP || 1.0,
      stream: request.stream !== false
    });

    const latency = Date.now() - startTime;
    const completionTokens = response.usage?.completion_tokens || 0;
    const promptTokens = response.usage?.prompt_tokens || 0;

    const costEstimate = (
      (promptTokens / 1000) * model.costPer1kTokens.input +
      (completionTokens / 1000) * model.costPer1kTokens.output
    );

    return {
      content: response.choices[0].message.content,
      model: modelId,
      tokensUsed: {
        prompt: promptTokens,
        completion: completionTokens,
        total: promptTokens + completionTokens
      },
      estimatedCost: costEstimate,
      latency,
      finished: true
    };

  } catch (error) {
    // Check error type for smarter fallback decisions
    if (error.status === 429) {
      throw new Error('Rate limited - model will recover in next window');
    } else if (error.status === 503) {
      throw new Error('Model overloaded - try fallback');
    } else if (error.message.includes('context_length')) {
      throw new Error('Context length exceeded');
    }
    throw error;
  }
}

async function executeAnthropicRequest(
  modelId: string,
  request: ChatRequest
): Promise<ChatResponse> {
  const model = modelRegistry[modelId];
  const startTime = Date.now();

  try {
    // Check if we can use prompt caching (reduces costs significantly)
    const cacheKey = hashConversationHistory(request.conversationHistory);
    const cachedResponse = await redis.get(`prompt_cache:${cacheKey}`);

    if (cachedResponse && request.useCaching !== false) {
      return JSON.parse(cachedResponse);
    }

    const systemPrompt = buildSystemPrompt(request.userTier, request.conversationHistory);

    const response = await anthropic.messages.create({
      model: modelId,
      max_tokens: request.maxTokens || 2000,
      system: systemPrompt,
      messages: request.conversationHistory.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      temperature: request.temperature || 0.7,
      top_p: request.topP || 1.0
    });

    const latency = Date.now() - startTime;
    const completionTokens = response.usage?.output_tokens || 0;
    const promptTokens = response.usage?.input_tokens || 0;
    const cacheCreationTokens = response.usage?.cache_creation_input_tokens || 0;
    const cacheReadTokens = response.usage?.cache_read_input_tokens || 0;

    // Cost with cache
    const promptCost = (
      (promptTokens / 1000) * model.costPer1kTokens.input +
      (cacheCreationTokens / 1000) * model.costPer1kTokens.input * 1.25 + // 25% more for cache write
      (cacheReadTokens / 1000) * model.costPer1kTokens.input * 0.1 // 90% cheaper for cache read
    );

    const costEstimate = promptCost + (completionTokens / 1000) * model.costPer1kTokens.output;

    const result = {
      content: response.content[0].text,
      model: modelId,
      tokensUsed: {
        prompt: promptTokens + cacheCreationTokens + cacheReadTokens,
        completion: completionTokens,
        total: promptTokens + cacheCreationTokens + cacheReadTokens + completionTokens
      },
      estimatedCost: costEstimate,
      latency,
      cached: cacheReadTokens > 0,
      finished: true
    };

    // Cache result for future identical requests
    if (cacheCreationTokens > 0) {
      await redis.setex(`prompt_cache:${cacheKey}`, 3600, JSON.stringify(result));
    }

    return result;

  } catch (error) {
    if (error.status === 429) {
      throw new Error('Rate limited');
    }
    throw error;
  }
}

async function executeOpenRouterRequest(
  modelId: string,
  request: ChatRequest
): Promise<ChatResponse> {
  const model = modelRegistry[modelId];
  const startTime = Date.now();

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://aspendos.ai',
        'X-Title': 'Aspendos'
      },
      body: JSON.stringify({
        model: modelId,
        messages: request.conversationHistory,
        max_tokens: request.maxTokens || 2000,
        temperature: request.temperature || 0.7
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(`OpenRouter error: ${data.error?.message}`);
    }

    const latency = Date.now() - startTime;

    return {
      content: data.choices[0].message.content,
      model: modelId,
      tokensUsed: {
        prompt: data.usage.prompt_tokens,
        completion: data.usage.completion_tokens,
        total: data.usage.total_tokens
      },
      estimatedCost: data.usage.total_tokens / 1000 * 0.001, // Conservative estimate
      latency,
      finished: true
    };

  } catch (error) {
    throw error;
  }
}
```

***

***

# 4. REAL-TIME VOICE IMPLEMENTATION

## Voice Pipeline Architecture

```
USER SPEAKS
   ↓
WebRTC Audio Capture
   ├─ getUserMedia()
   ├─ AudioContext processing
   ├─ Noise reduction (Krisp / WebRTC library)
   └─ Encoding (PCM 16-bit, 16kHz)
   ↓
┌─────────────────────────────────┐
│  WebSocket Stream to Server     │
│  (binary frames, ~200ms chunks) │
└─────────────────────────────────┘
   ↓
SERVER: Speech-to-Text (STT)
   ├─ OpenAI Whisper (primary)
   ├─ Google Cloud Speech (fallback)
   └─ Deepgram (fallback)
   ↓
STREAMING TRANSCRIPTION
   └─ Return chunks as they're available
   ↓
LANGUAGE MODEL (Text → Text)
   ├─ Route text to appropriate model
   ├─ Stream tokens as they're generated
   └─ Collect full response
   ↓
SERVER: Text-to-Speech (TTS)
   ├─ OpenAI TTS HD (primary, fastest)
   ├─ ElevenLabs Turbo (fallback, best quality)
   └─ Google Cloud TTS (fallback)
   ↓
STREAMING AUDIO GENERATION
   └─ Return audio chunks as they're generated
   ↓
CLIENT: Audio Playback
   ├─ WebAudio API playback
   ├─ Lip sync (optional)
   └─ Visualization
   ↓
USER HEARS RESPONSE (end-to-end ~2-3 seconds)
```

***

## Voice Implementation Code

### Frontend: Audio Capture & Streaming

```typescript
// Frontend: Voice Input Capture & Streaming

import { useRef, useState } from 'react';

interface VoiceStreamConfig {
  sampleRate?: number;
  channels?: number;
  echoCancellation?: boolean;
  noiseSuppression?: boolean;
  autoGainControl?: boolean;
}

export const useVoiceInput = (config: VoiceStreamConfig = {}) => {
  const mediaStreamRef = useRef<MediaStream>(null);
  const audioContextRef = useRef<AudioContext>(null);
  const processorRef = useRef<ScriptProcessorNode>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startRecording = async (onAudioChunk: (chunk: Float32Array) => void) => {
    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: config.echoCancellation ?? true,
          noiseSuppression: config.noiseSuppression ?? true,
          autoGainControl: config.autoGainControl ?? true,
          sampleRate: config.sampleRate ?? 16000
        },
        video: false
      });

      mediaStreamRef.current = stream;

      // Create audio context
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: config.sampleRate || 16000
      });
      audioContextRef.current = audioContext;

      // Create microphone source
      const source = audioContext.createMediaStreamSource(stream);

      // Create ScriptProcessor for real-time audio processing
      const processor = audioContext.createScriptProcessor(
        4096, // buffer size
        1, // input channels
        1 // output channels
      );
      processorRef.current = processor;

      processor.onaudioprocess = (e: AudioProcessingEvent) => {
        const inputData = e.inputBuffer.getChannelData(0);
        const audioChunk = new Float32Array(inputData);
        onAudioChunk(audioChunk);
      };

      source.connect(processor);
      processor.connect(audioContext.destination);

      setIsRecording(true);
      setError(null);

    } catch (err) {
      setError(err.message);
      console.error('Error starting voice input:', err);
    }
  };

  const stopRecording = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
    }
    setIsRecording(false);
  };

  return {
    startRecording,
    stopRecording,
    isRecording,
    error
  };
};

// Frontend: WebSocket Connection for Streaming

class VoiceStreamClient {
  private ws: WebSocket | null = null;
  private audioContext: AudioContext | null = null;
  private sourceNode: AudioBufferSourceNode | null = null;
  private isConnected = false;

  async connect(userId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(
        `${process.env.REACT_APP_WS_URL}/voice?userId=${userId}`
      );

      this.ws.binaryType = 'arraybuffer';

      this.ws.onopen = () => {
        this.isConnected = true;
        resolve();
      };

      this.ws.onerror = (error) => {
        reject(new Error(`WebSocket error: ${error}`));
      };

      this.ws.onmessage = (event: MessageEvent) => {
        if (typeof event.data === 'string') {
          // Text message (e.g., transcription, metadata)
          const message = JSON.parse(event.data);
          this.handleTextMessage(message);
        } else if (event.data instanceof ArrayBuffer) {
          // Binary audio data
          this.playAudio(event.data);
        }
      };

      this.ws.onclose = () => {
        this.isConnected = false;
      };
    });
  }

  sendAudioChunk(audioChunk: Float32Array): void {
    if (!this.isConnected) {
      console.error('WebSocket not connected');
      return;
    }

    // Convert Float32Array to Int16Array (16-bit PCM)
    const int16Chunk = this.floatToInt16(audioChunk);
    this.ws!.send(int16Chunk.buffer);
  }

  sendTextMessage(message: any): void {
    if (!this.isConnected) {
      console.error('WebSocket not connected');
      return;
    }
    this.ws!.send(JSON.stringify(message));
  }

  private handleTextMessage(message: any): void {
    switch (message.type) {
      case 'TRANSCRIPTION':
        console.log('Transcription:', message.text);
        break;
      case 'MODEL_RESPONSE_START':
        console.log('Model thinking...');
        break;
      case 'METADATA':
        console.log('Latency:', message.latency, 'ms');
        break;
    }
  }

  private async playAudio(audioBuffer: ArrayBuffer): Promise<void> {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    try {
      const audioData = await this.audioContext.decodeAudioData(audioBuffer);
      const source = this.audioContext.createBufferSource();
      source.buffer = audioData;
      source.connect(this.audioContext.destination);
      source.start(0);
    } catch (error) {
      console.error('Error playing audio:', error);
    }
  }

  private floatToInt16(floatArray: Float32Array): Int16Array {
    const int16Array = new Int16Array(floatArray.length);
    for (let i = 0; i < floatArray.length; i++) {
      int16Array[i] = Math.max(-1, Math.min(1, floatArray[i])) * 0x7FFF;
    }
    return int16Array;
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
    }
    if (this.audioContext) {
      this.audioContext.close();
    }
  }
}

// React Component: Voice Chat UI

import React, { useEffect, useState } from 'react';

export const VoiceChatComponent: React.FC = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [latency, setLatency] = useState<number | null>(null);

  const { startRecording, stopRecording, isRecording } = useVoiceInput({
    sampleRate: 16000,
    echoCancellation: true,
    noiseSuppression: true
  });

  const voiceClientRef = React.useRef<VoiceStreamClient>(new VoiceStreamClient());

  useEffect(() => {
    const voiceClient = voiceClientRef.current;
    voiceClient.connect(userId).catch(err => console.error(err));

    return () => {
      voiceClient.disconnect();
    };
  }, []);

  const handleStartListening = async () => {
    setIsListening(true);
    setTranscript('');
    setResponse('');

    // Tell server to start listening
    voiceClientRef.current.sendTextMessage({
      type: 'START_LISTENING',
      timestamp: Date.now()
    });

    startRecording((audioChunk: Float32Array) => {
      voiceClientRef.current.sendAudioChunk(audioChunk);
    });
  };

  const handleStopListening = () => {
    stopRecording();
    setIsListening(false);

    // Tell server to process
    voiceClientRef.current.sendTextMessage({
      type: 'STOP_LISTENING',
      timestamp: Date.now()
    });
  };

  return (
    <div className="voice-chat-container">
      <button
        onClick={isListening ? handleStopListening : handleStartListening}
        className={`mic-button ${isListening ? 'active' : ''}`}
      >
        {isListening ? '🎙️ Listening...' : '🎙️ Click to speak'}
      </button>

      {transcript && (
        <div className="transcript">
          <h3>You said:</h3>
          <p>{transcript}</p>
        </div>
      )}

      {response && (
        <div className="response">
          <h3>Response:</h3>
          <p>{response}</p>
          {latency && <small>Latency: {latency}ms</small>}
        </div>
      )}
    </div>
  );
};
```

***

### Backend: Voice Processing Service

```typescript
// Backend: WebSocket Handler for Voice Streaming

import { WebSocketServer, WebSocket } from 'ws';
import { createReadStream } from 'fs';
import { exec } from 'child_process';

const wss = new WebSocketServer({ port: 8080 });

interface VoiceSession {
  userId: string;
  ws: WebSocket;
  audioBuffer: Buffer;
  transcription: string;
  startTime: number;
  sessionId: string;
}

const activeSessions = new Map<string, VoiceSession>();

wss.on('connection', (ws: WebSocket, req) => {
  const url = new URL(`http://localhost${req.url}`);
  const userId = url.searchParams.get('userId');
  const sessionId = uuid.v4();

  console.log(`User ${userId} connected (Session: ${sessionId})`);

  const session: VoiceSession = {
    userId,
    ws,
    audioBuffer: Buffer.alloc(0),
    transcription: '',
    startTime: Date.now(),
    sessionId
  };

  activeSessions.set(sessionId, session);

  ws.on('message', async (data: Buffer | string) => {
    try {
      if (typeof data === 'string') {
        // Text message (command)
        const message = JSON.parse(data);
        await handleVoiceCommand(session, message);
      } else {
        // Binary audio data
        session.audioBuffer = Buffer.concat([session.audioBuffer, data]);
      }
    } catch (error) {
      console.error('Error processing voice message:', error);
      ws.send(JSON.stringify({ type: 'ERROR', error: error.message }));
    }
  });

  ws.on('close', () => {
    console.log(`User ${userId} disconnected`);
    activeSessions.delete(sessionId);
  });

  ws.on('error', (error) => {
    console.error(`WebSocket error for user ${userId}:`, error);
  });
});

async function handleVoiceCommand(
  session: VoiceSession,
  message: any
): Promise<void> {
  switch (message.type) {
    case 'START_LISTENING':
      // Initialize session
      session.audioBuffer = Buffer.alloc(0);
      session.transcription = '';
      console.log(`[${session.sessionId}] User started speaking`);
      break;

    case 'STOP_LISTENING':
      // Process full audio
      await processVoiceInput(session);
      break;

    case 'CANCEL':
      // Clear buffer
      session.audioBuffer = Buffer.alloc(0);
      console.log(`[${session.sessionId}] Recording cancelled`);
      break;
  }
}

async function processVoiceInput(session: VoiceSession): Promise<void> {
  console.log(`[${session.sessionId}] Processing ${session.audioBuffer.length} bytes of audio`);

  const stpStartTime = Date.now();

  // Step 1: Speech-to-Text
  const transcription = await performSpeechToText(session.audioBuffer, session.userId);
  session.transcription = transcription;

  const sttLatency = Date.now() - stpStartTime;
  console.log(`[${session.sessionId}] STT latency: ${sttLatency}ms`);

  // Send transcription to client
  session.ws.send(JSON.stringify({
    type: 'TRANSCRIPTION',
    text: transcription,
    latency: sttLatency
  }));

  // Step 2: LLM Processing
  const llmStartTime = Date.now();
  const modelResponse = await routeAndExecuteModel({
    type: 'TEXT',
    content: transcription,
    conversationHistory: await getConversationHistory(session.userId),
    userId: session.userId,
    userTier: await getUserTier(session.userId)
  });

  const llmLatency = Date.now() - llmStartTime;
  console.log(`[${session.sessionId}] LLM latency: ${llmLatency}ms`);

  // Send LLM response chunks to client (streaming)
  session.ws.send(JSON.stringify({
    type: 'MODEL_RESPONSE',
    content: modelResponse.content,
    latency: llmLatency,
    model: modelResponse.usedModel
  }));

  // Step 3: Text-to-Speech
  const ttsStartTime = Date.now();
  const audioStream = await performTextToSpeech(modelResponse.content, session.userId);

  // Stream audio back to client
  audioStream.on('data', (chunk: Buffer) => {
    if (session.ws.readyState === WebSocket.OPEN) {
      session.ws.send(chunk); // Binary frame
    }
  });

  audioStream.on('end', () => {
    const ttsLatency = Date.now() - ttsStartTime;
    console.log(`[${session.sessionId}] TTS latency: ${ttsLatency}ms`);

    // Send completion message
    const totalLatency = Date.now() - session.startTime;
    session.ws.send(JSON.stringify({
      type: 'COMPLETE',
      totalLatency,
      breakdown: {
        stt: sttLatency,
        llm: llmLatency,
        tts: ttsLatency
      }
    }));
  });

  // Save interaction
  await saveVoiceInteraction(session.userId, {
    transcription,
    response: modelResponse.content,
    model: modelResponse.usedModel,
    latencies: { stt: sttLatency, llm: llmLatency, tts: Date.now() - ttsStartTime },
    timestamp: new Date()
  });
}

async function performSpeechToText(
  audioBuffer: Buffer,
  userId: string
): Promise<string> {
  // Save audio temporarily
  const audioPath = `/tmp/audio_${uuid.v4()}.wav`;
  await fs.promises.writeFile(audioPath, audioBuffer);

  try {
    // Try OpenAI Whisper first
    const transcriptionResponse = await openai.audio.transcriptions.create({
      file: createReadStream(audioPath),
      model: 'whisper-1',
      language: 'en'
    });

    return transcriptionResponse.text;

  } catch (error) {
    console.error('OpenAI Whisper failed, trying fallback:', error);

    // Fallback: Google Cloud Speech
    try {
      const audioContent = fs.readFileSync(audioPath).toString('base64');
      const googleResponse = await googleSpeechClient.recognize({
        config: {
          encoding: 'LINEAR16',
          sampleRateHertz: 16000,
          languageCode: 'en-US'
        },
        audio: {
          content: audioContent
        }
      });

      return googleResponse[0].results
        .map(result => result.alternatives[0].transcript)
        .join(' ');

    } catch (googleError) {
      console.error('Google Cloud Speech failed:', googleError);
      throw new Error('All STT providers failed');
    }

  } finally {
    // Clean up temp file
    await fs.promises.unlink(audioPath).catch(() => {});
  }
}

async function performTextToSpeech(
  text: string,
  userId: string
): Promise<NodeJS.ReadableStream> {
  try {
    // Try OpenAI TTS HD first (fastest)
    const audioResponse = await openai.audio.speech.create({
      model: 'tts-1-hd', // Higher quality
      voice: 'alloy',
      input: text,
      response_format: 'mp3'
    });

    return audioResponse.toStream();

  } catch (error) {
    console.error('OpenAI TTS failed, trying fallback:', error);

    // Fallback: ElevenLabs
    try {
      const voiceId = await getUserVoicePreference(userId);
      const elevenLabsResponse = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
        {
          method: 'POST',
          headers: {
            'xi-api-key': process.env.ELEVENLABS_API_KEY,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            text,
            model_id: 'eleven_turbo_v2',
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.75
            }
          })
        }
      );

      if (!elevenLabsResponse.ok) {
        throw new Error(`ElevenLabs error: ${elevenLabsResponse.statusText}`);
      }

      return Readable.from(elevenLabsResponse.body);

    } catch (elevenLabsError) {
      console.error('ElevenLabs failed:', elevenLabsError);
      throw new Error('All TTS providers failed');
    }
  }
}

async function saveVoiceInteraction(
  userId: string,
  interaction: any
): Promise<void> {
  await db.query(
    `INSERT INTO voice_interactions (user_id, transcription, response, model, latencies, created_at)
     VALUES ($1, $2, $3, $4, $5, NOW())`,
    [
      userId,
      interaction.transcription,
      interaction.response,
      interaction.model,
      JSON.stringify(interaction.latencies)
    ]
  );

  // Update memory system
  await memoryService.addConversationToMemory({
    userId,
    messages: [
      { role: 'user', content: interaction.transcription },
      { role: 'assistant', content: interaction.response }
    ],
    source: 'voice',
    metadata: {
      model: interaction.model,
      latencies: interaction.latencies
    }
  });
}
```

***

## Latency Optimization Strategies

```typescript
// Latency Optimization Techniques

// 1. Token-by-Token Streaming (Send first token ASAP)
async function streamModelResponse(
  messages: Message[],
  modelId: string,
  onToken: (token: string, time: number) => void
): Promise<void> {
  
  const startTime = Date.now();
  let tokenCount = 0;

  const stream = await openai.chat.completions.create({
    model: modelId,
    messages,
    stream: true,
    temperature: 0.7
  });

  for await (const chunk of stream) {
    const token = chunk.choices[0]?.delta?.content || '';
    if (token) {
      tokenCount++;
      const elapsedTime = Date.now() - startTime;
      
      // Callback for each token (allows TTS to start before response is complete)
      onToken(token, elapsedTime);

      // Log time-to-first-token
      if (tokenCount === 1) {
        console.log(`Time to first token: ${elapsedTime}ms`);
      }
    }
  }
}

// 2. Parallel STT + TTS while LLM is thinking
async function parallelVoiceProcessing(audioBuffer: Buffer): Promise<{
  transcription: string;
  response: string;
  audioStream: NodeJS.ReadableStream;
}> {
  
  // Step 1: Start STT immediately
  const sttPromise = performSpeechToText(audioBuffer);

  // Step 2: Wait for STT result
  const transcription = await sttPromise;

  // Step 3: Start LLM in parallel with TTS setup
  const llmPromise = routeAndExecuteModel({ content: transcription });
  const ttsSetupPromise = prepareTTSPipeline();

  const [llmResponse, ttsSetup] = await Promise.all([llmPromise, ttsSetupPromise]);

  // Step 4: Start TTS streaming as soon as LLM produces tokens
  const audioStream = await ttsSetup.stream(llmResponse.content);

  return {
    transcription,
    response: llmResponse.content,
    audioStream
  };
}

// 3. Connection Pooling & Warm Connections
class ModelConnectionPool {
  private pools: Map<string, WebSocket[]> = new Map();

  async getConnection(modelId: string): Promise<WebSocket> {
    const pool = this.pools.get(modelId) || [];

    if (pool.length > 0) {
      return pool.pop()!; // Reuse warm connection
    }

    // Create new connection
    return await this.createConnection(modelId);
  }

  private async createConnection(modelId: string): Promise<WebSocket> {
    const ws = new WebSocket(`wss://model-api.example.com/${modelId}`);
    
    return new Promise((resolve, reject) => {
      ws.onopen = () => resolve(ws);
      ws.onerror = reject;
      setTimeout(() => reject(new Error('Connection timeout')), 5000);
    });
  }

  releaseConnection(modelId: string, ws: WebSocket): void {
    let pool = this.pools.get(modelId);
    if (!pool) {
      pool = [];
      this.pools.set(modelId, pool);
    }
    pool.push(ws);

    // Keep max 5 connections per model
    if (pool.length > 5) {
      pool.shift()?.close();
    }
  }
}

// 4. Speculative Execution (Guess next response before user finishes speaking)
async function speculativeExecution(
  userMessageSoFar: string,
  previousContext: Message[]
): Promise<string[]> {
  
  // Generate probable continuations
  const continuations = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [
      ...previousContext,
      { role: 'user', content: userMessageSoFar }
    ],
    max_tokens: 100,
    n: 3, // Generate 3 alternatives
    temperature: 0.8,
    stop: ['\n'] // Stop at line break
  });

  return continuations.choices.map(c => c.message.content);
}

// 5. Client-Side Caching
const voiceCache = new LRUCache({
  max: 100,
  ttl: 1000 * 60 * 60 * 24 // 24 hours
});

async function cachedVoiceInteraction(
  transcription: string,
  userId: string
): Promise<{ response: string; cached: boolean }> {
  
  const cacheKey = `voice:${userId}:${hash(transcription)}`;
  
  // Check cache first
  const cached = voiceCache.get(cacheKey);
  if (cached) {
    return { response: cached, cached: true };
  }

  // If not cached, fetch
  const response = await routeAndExecuteModel({
    content: transcription,
    userId
  });

  // Cache result
  voiceCache.set(cacheKey, response.content);

  return { response: response.content, cached: false };
}
```

***

***

# 5. DATABASE SCHEMA & PRISMA MODELS

## Complete Prisma Schema

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
  previewFeatures = ["fullTextSearch", "jsonProtocol"]
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================
// USER MANAGEMENT
// ============================================

model User {
  id                String              @id @default(cuid())
  email             String              @unique
  name              String?
  emailVerified     DateTime?
  image             String?
  
  // Auth providers (OAuth)
  googleId          String?             @unique
  appleId           String?             @unique
  githubId          String?             @unique
  facebookId        String?             @unique
  
  // Subscription
  tier              SubscriptionTier    @default(PRO)
  subscriptionId    String?             @unique
  stripeCustomerId  String?             @unique
  polarCustomerId   String?             @unique
  
  // Billing
  computeCredits    Int                 @default(5000) // $50 for PRO
  billingCycle      DateTime?
  nextBillingDate   DateTime?
  
  // Settings
  settings          UserSettings?
  timezone          String              @default("UTC")
  language          String              @default("en")
  
  // Memory policies
  memoryPolicy      MemoryPolicy?
  
  // Relationships
  conversations     Conversation[]
  memoryItems       MemoryItem[]
  voiceInteractions VoiceInteraction[]
  invoices          Invoice[]
  apiKeys           APIKey[]
  sessions          Session[]
  auditLogs         AuditLog[]
  
  createdAt         DateTime            @default(now())
  updatedAt         DateTime            @updatedAt
  lastLogin         DateTime?
  
  @@index([email])
  @@index([googleId])
  @@index([tier])
  @@fulltext([email, name])
}

enum SubscriptionTier {
  FREE
  PRO
  ULTRA
  ENTERPRISE
}

model UserSettings {
  id                    String          @id @default(cuid())
  userId                String          @unique
  user                  User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  // Model preferences
  preferredModels       String[]        @default(["gpt-4o", "claude-3.5-sonnet", "gemini-2.0-flash"])
  voiceEnabled          Boolean         @default(true)
  voiceModel            String          @default("openai-tts-hd")
  voiceSpeed            Float           @default(1.0) @db.Real
  voiceVolumeNorm       Float           @default(1.0) @db.Real
  
  // Privacy
  memoryRetention       Int             @default(365) // days
  autoDeleteAfter       Int?            // null = never auto-delete
  encryptionEnabled     Boolean         @default(true)
  anonymizeOnExport     Boolean         @default(false)
  
  // Notifications
  emailNotifications    Boolean         @default(true)
  notifyOnNewFeatures   Boolean         @default(true)
  digestFrequency       String          @default("weekly")
  
  createdAt             DateTime        @default(now())
  updatedAt             DateTime        @updatedAt
}

model Session {
  id                String            @id @default(cuid())
  userId            String
  user              User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  token             String            @unique
  expiresAt         DateTime
  userAgent         String?
  ipAddress         String?
  
  createdAt         DateTime          @default(now())
  
  @@index([userId])
  @@index([token])
}

// ============================================
// CONVERSATIONS & MESSAGES
// ============================================

model Conversation {
  id                String            @id @default(cuid())
  userId            String
  user              User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  title             String            @default("Untitled")
  summary           String?           // LLM-generated summary
  description       String?           // User-provided description
  
  // Metadata
  isArchived        Boolean           @default(false)
  isPinned          Boolean           @default(false)
  isPublic          Boolean           @default(false)
  publicToken       String?           @unique // For public sharing
  
  // Model & Memory integration
  primaryModel      String            @default("gpt-4o")
  modelsUsed        String[]          // History of models used
  memoryItems       MemoryItem[]      // Related memory items
  
  // Clustering (auto-grouped topics)
  clusterId         String?
  cluster           Cluster?          @relation(fields: [clusterId], references: [id])
  
  // Voice interaction
  isVoiceChat       Boolean           @default(false)
  voiceTranscriptions VoiceInteraction[]
  
  // Feedback
  userSatisfaction  Float?            @db.Real // 0-1 scale
  likeCount         Int               @default(0)
  dislikeCount      Int               @default(0)
  
  messages          Message[]
  responses         Response[]
  createdAt         DateTime          @default(now())
  updatedAt         DateTime          @updatedAt
  
  @@index([userId])
  @@index([isArchived])
  @@index([isPinned])
  @@index([clusterId])
  @@fulltext([title, summary])
}

model Message {
  id                String            @id @default(cuid())
  conversationId    String
  conversation      Conversation      @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  
  role              String            // "user", "assistant"
  content           String            @db.Text
  
  // Message metadata
  embedding         Vector            @db.Vector(1536) // OpenAI embeddings
  tokens            Int               // Token count
  
  // Multi-model
  generatedBy       String?           // Model ID if assistant message
  
  // Media
  images            String[]          // S3 URLs
  attachments       Attachment[]
  
  // Feedback
  thumbsUp          Boolean?
  feedback          String?           @db.Text
  
  createdAt         DateTime          @default(now())
  
  @@index([conversationId])
  @@index([role])
}

model Response {
  id                String            @id @default(cuid())
  conversationId    String
  conversation      Conversation      @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  
  // Response variants (for A/B testing or alternatives)
  messageId         String?
  content           String            @db.Text
  
  model             String            // Which model generated this
  temperature       Float             @db.Real
  topP              Float             @db.Real
  
  // Cost tracking
  tokensUsed        Int
  costInCents       Int
  
  // Quality metrics
  userSatisfaction  Float?            @db.Real
  latencyMs         Int
  
  selected          Boolean           @default(false) // User selected this response
  
  createdAt         DateTime          @default(now())
  
  @@index([conversationId])
  @@index([model])
}

// ============================================
// MEMORY SYSTEM
// ============================================

model MemoryItem {
  id                String            @id @default(cuid())
  userId            String
  user              User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  title             String
  content           String            @db.Text
  description       String?
  
  // Categorization
  type              String            // "insight", "note", "learning", "reference"
  tags              String[]
  
  // Embedding for semantic search
  embedding         Vector            @db.Vector(1536)
  
  // Graph relationships
  relatedConversations Conversation[]
  relatedMemoryItems String[]         // IDs of related memory items
  
  // Meta
  importance        Float             @db.Real @default(0.5) // 0-1 scale
  isPinned          Boolean           @default(false)
  lastReferencedAt  DateTime?
  
  // GDPR / Privacy
  isAnonymized      Boolean           @default(false)
  expiresAt         DateTime?
  
  createdAt         DateTime          @default(now())
  updatedAt         DateTime          @updatedAt
  
  @@index([userId])
  @@index([type])
  @@fulltext([title, content, description])
}

model Cluster {
  id                String            @id @default(cuid())
  userId            String
  
  name              String            // Auto-generated cluster name
  description       String?           @db.Text
  centroid          Vector            @db.Vector(1536) // Average embedding
  
  conversations     Conversation[]
  topConcepts       String[]          // Top 5 concepts in this cluster
  
  size              Int               // Number of conversations
  lastUpdated       DateTime          @default(now()) @updatedAt
  
  @@index([userId])
}

model MemoryPolicy {
  id                String            @id @default(cuid())
  userId            String            @unique
  user              User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  // Policy template
  template          String            // "DEFAULT", "GDPR_COMPLIANT", "HIPAA_COMPLIANT", "PRIVACY_FOCUSED"
  customRules       Json              // Custom rules as JSON
  
  // Retention
  retentionDays     Int?              // NULL = infinite retention
  autoDelete        Boolean           @default(false)
  
  // Encryption
  encryptionEnabled Boolean           @default(true)
  encryptionKey     String?           // Stored securely (encrypted)
  
  // Privacy
  anonymizePII      Boolean           @default(false)
  auditLog          Boolean           @default(false)
  
  createdAt         DateTime          @default(now())
  updatedAt         DateTime          @updatedAt
}

// ============================================
// VOICE INTERACTIONS
// ============================================

model VoiceInteraction {
  id                String            @id @default(cuid())
  userId            String
  user              User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  conversationId    String?
  conversation      Conversation?     @relation(fields: [conversationId], references: [id], onDelete: SetNull)
  
  // Transcription
  transcription     String            @db.Text
  transcriptionModel String          @default("whisper-1")
  
  // Response
  response          String?           @db.Text
  responseModel     String?
  
  // Latencies (ms)
  sttLatency        Int
  llmLatency        Int?
  ttsLatency        Int?
  totalLatency      Int
  
  // Quality
  transcriptionAccuracy Float?        @db.Real
  userSatisfaction  Float?           @db.Real
  
  createdAt         DateTime          @default(now())
  
  @@index([userId])
  @@index([conversationId])
}

// ============================================
// BILLING & SUBSCRIPTIONS
// ============================================

model Subscription {
  id                String            @id @default(cuid())
  stripeId          String?           @unique
  polarId           String?           @unique
  
  userId            String
  tier              SubscriptionTier
  
  status            String            // "active", "past_due", "cancelled"
  currentPeriodStart DateTime
  currentPeriodEnd  DateTime
  cancelledAt       DateTime?
  
  currency          String            @default("USD") // "USD", "TRY", "EUR", "CNY"
  priceInCents      Int               // Billing amount
  
  createdAt         DateTime          @default(now())
  updatedAt         DateTime          @updatedAt
  
  @@index([userId])
}

model Invoice {
  id                String            @id @default(cuid())
  userId            String
  user              User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  stripeInvoiceId   String?           @unique
  polarInvoiceId    String?           @unique
  
  amount            Int               // in cents
  currency          String            @default("USD")
  status            String            // "paid", "pending", "failed"
  
  description       String?
  lineItems         Json              // Invoice line items
  
  dueDate           DateTime
  paidAt            DateTime?
  
  createdAt         DateTime          @default(now())
  updatedAt         DateTime          @updatedAt
  
  @@index([userId])
  @@index([status])
}

model CreditTransaction {
  id                String            @id @default(cuid())
  userId            String
  
  amount            Int               // +/- credits
  reason            String            // "model_usage", "subscription", "refund", "bonus", "admin_adjustment"
  
  balanceBefore     Int
  balanceAfter      Int
  
  metadata          Json?             // Additional data (model used, cost, etc.)
  
  createdAt         DateTime          @default(now())
  
  @@index([userId])
  @@index([reason])
}

// ============================================
// API KEYS & INTEGRATIONS
// ============================================

model APIKey {
  id                String            @id @default(cuid())
  userId            String
  user              User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  name              String
  key               String            @unique // hashed
  keyPrefix         String            // for display (first 8 chars)
  
  permissions       String[]          // ["read:conversations", "write:messages", etc.]
  
  rateLimit         Int               @default(100) // requests per minute
  lastUsedAt        DateTime?
  
  expiresAt         DateTime?         // NULL = never expires
  isActive          Boolean           @default(true)
  
  createdAt         DateTime          @default(now())
  updatedAt         DateTime          @updatedAt
  
  @@index([userId])
}

// ============================================
// MEDIA & FILES
// ============================================

model Attachment {
  id                String            @id @default(cuid())
  messageId         String
  message           Message           @relation(fields: [messageId], references: [id], onDelete: Cascade)
  
  fileName          String
  fileType          String            // MIME type
  fileSize          Int               // bytes
  s3Key             String            // S3 object key
  s3Url             String            // Public URL
  
  thumbnail         String?           // For images
  
  uploadedAt        DateTime          @default(now())
  
  @@index([messageId])
}

// ============================================
// AUDITING & COMPLIANCE
// ============================================

model AuditLog {
  id                String            @id @default(cuid())
  userId            String
  user              User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  action            String            // "login", "create_conversation", "delete_memory", etc.
  resource          String            // "user", "conversation", "memory_item"
  resourceId        String?
  
  changes           Json?             // Before/after for updates
  
  ipAddress         String?
  userAgent         String?
  
  createdAt         DateTime          @default(now())
  
  @@index([userId])
  @@index([action])
  @@index([resourceId])
}

model DataExport {
  id                String            @id @default(cuid())
  userId            String
  
  status            String            // "pending", "completed", "failed"
  s3Url             String?           // Download URL
  expiresAt         DateTime?         // When export URL expires
  
  format            String            // "json", "csv"
  size              Int?              // bytes
  
  requestedAt       DateTime          @default(now())
  completedAt       DateTime?
  
  @@index([userId])
}

// ============================================
// CUSTOM INDEXES & CONSTRAINTS
// ============================================

// Vector similarity search index (PostgreSQL pgvector extension)
// Create manually: CREATE INDEX ON messages USING ivfflat (embedding vector_cosine_ops);
// Create manually: CREATE INDEX ON memory_items USING ivfflat (embedding vector_cosine_ops);

// Full-text search indexes
// Already defined in @@fulltext() above

// Composite indexes for common queries
// CREATE INDEX idx_user_conversation_created ON conversations(user_id, created_at DESC);
// CREATE INDEX idx_user_memory_importance ON memory_items(user_id, importance DESC);
```

***

## Database Migrations

```bash
# Initial setup
npx prisma migrate dev --name init

# Add memory system tables
npx prisma migrate dev --name add_memory_system

# Add voice interactions
npx prisma migrate dev --name add_voice_interactions

# Add billing
npx prisma migrate dev --name add_billing

# Generate Prisma client
npx prisma generate

# Seed initial data (optional)
npx prisma db seed
```

### prisma/seed.ts

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Seed memory policies
  const policies = [
    {
      template: 'DEFAULT',
      description: 'Standard memory retention (1 year)'
    },
    {
      template: 'GDPR_COMPLIANT',
      description: 'GDPR-compliant (3-year retention, anonymization)'
    },
    {
      template: 'HIPAA_COMPLIANT',
      description: 'HIPAA-compliant (6-year retention, encryption)'
    },
    {
      template: 'PRIVACY_FOCUSED',
      description: 'Privacy-focused (90-day auto-delete)'
    }
  ];

  for (const policy of policies) {
    await prisma.memoryPolicy.upsert({
      where: { template: policy.template },
      update: policy,
      create: policy
    });
  }

  console.log('Seeding completed');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

***

***

# 6. BACKEND IMPLEMENTATION (NODE.JS/EXPRESS)

Due to length constraints, I'll provide the critical sections. Full implementation available in GitHub.

## Project Structure

```
aspendos-backend/
├── src/
│   ├── index.ts                 # Express app setup
│   ├── config/
│   │   ├── database.ts          # Prisma client
│   │   ├── redis.ts            # Redis connection
│   │   ├── models.ts           # Model registry
│   │   └── env.ts              # Environment variables
│   │
│   ├── api/
│   │   ├── auth.ts             # OAuth routes
│   │   ├── conversations.ts     # Chat endpoints
│   │   ├── memory.ts           # Memory system endpoints
│   │   ├── voice.ts            # Voice chat WebSocket handler
│   │   ├── billing.ts          # Stripe/Polar integration
│   │   └── admin.ts            # Admin endpoints
│   │
│   ├── services/
│   │   ├── modelRouter.ts       # Model routing logic
│   │   ├── memoryService.ts     # Neo4j + Pinecone integration
│   │   ├── voiceService.ts      # STT + TTS
│   │   ├── billingService.ts    # Subscription management
│   │   └── emailService.ts      # Email notifications
│   │
│   ├── middleware/
│   │   ├── auth.ts             # JWT verification
│   │   ├── rateLimit.ts        # Rate limiting
│   │   └── errorHandler.ts     # Error handling
│   │
│   ├── jobs/
│   │   ├── memoryClustering.ts  # Daily memory clustering
│   │   ├── memorySynthesis.ts   # Weekly digest generation
│   │   └── cleanup.ts           # Cleanup expired data
│   │
│   └── utils/
│       ├── logger.ts            # Winston logging
│       ├── metrics.ts           # Prometheus metrics
│       └── helpers.ts           # Utility functions
│
├── websocket/
│   ├── voiceHandler.ts          # WebSocket handler
│   └── realtimeSync.ts          # Real-time updates
│
├── .env.example
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── docker-compose.yml           # Local development
└── package.json
```

***

## Main Express Server Setup

```typescript
// src/index.ts

import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { createClient } from 'redis';
import { PrismaClient } from '@prisma/client';

import authRouter from './api/auth';
import conversationsRouter from './api/conversations';
import memoryRouter from './api/memory';
import billingRouter from './api/billing';
import voiceRouter from './api/voice';
import adminRouter from './api/admin';

import { authMiddleware, rateLimitMiddleware } from './middleware';
import { voiceWebSocketHandler } from './websocket/voiceHandler';
import { setupJobQueue } from './jobs';
import { initializeMetrics } from './utils/metrics';
import { logger } from './utils/logger';

const app = express();
const server = createHttpServer(app);
const wss = new WebSocketServer({ server });

// Database
export const prisma = new PrismaClient({
  log: ['warn', 'error'],
});

// Redis
export const redis = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
});

redis.on('error', (err) => logger.error('Redis error:', err));
redis.connect();

// ============================================
// MIDDLEWARE
// ============================================

app.use(helmet()); // Security headers
app.use(compression()); // Gzip compression
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));

// Prometheus metrics middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    recordHttpDuration(req.method, req.path, res.statusCode, duration);
  });
  next();
});

// Rate limiting
app.use('/api/', rateLimitMiddleware);

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
  next();
});

// ============================================
// ROUTES
// ============================================

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API v1
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/conversations', authMiddleware, conversationsRouter);
app.use('/api/v1/memory', authMiddleware, memoryRouter);
app.use('/api/v1/billing', authMiddleware, billingRouter);
app.use('/api/v1/admin', authMiddleware, adminRouter);

// WebSocket (no HTTP auth, uses token in URL)
wss.on('connection', voiceWebSocketHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
});

// ============================================
// INITIALIZATION
// ============================================

async function start() {
  // Initialize Prometheus metrics
  initializeMetrics();

  // Setup background jobs
  await setupJobQueue();

  // Start server
  const PORT = process.env.PORT || 3001;
  server.listen(PORT, '0.0.0.0', () => {
    logger.info(`🚀 Aspendos server running on port ${PORT}`);
  });

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, shutting down gracefully...');
    server.close(async () => {
      await prisma.$disconnect();
      await redis.disconnect();
      process.exit(0);
    });
  });
}

start().catch(err => {
  logger.error('Failed to start server:', err);
  process.exit(1);
});

export { app, server, wss };
```

***

## Chat API Endpoint (Streaming)

```typescript
// src/api/conversations.ts

import express from 'express';
import { routeRequest } from '../services/modelRouter';
import { prisma } from '../index';

const router = express.Router();

// POST /api/v1/conversations/:conversationId/messages
router.post('/:conversationId/messages', async (req, res) => {
  const { conversationId } = req.params;
  const { content, stream = true } = req.body;
  const userId = (req as any).userId; // From auth middleware

  try {
    // Validate conversation belongs to user
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { messages: { take: 10, orderBy: { createdAt: 'desc' } } }
    });

    if (!conversation || conversation.userId !== userId) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Get user & tier info
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const userTier = user?.tier || 'PRO';

    // Build message history
    const conversationHistory = conversation.messages
      .reverse()
      .map(m => ({ role: m.role, content: m.content }));

    // Route request to appropriate model
    const routingDecision = await routeRequest(
      {
        type: 'TEXT',
        content,
        context: conversation.title,
        metadata: { conversationId }
      },
      {
        userTier,
        modelPreferences: [],
        region: 'us',
        concurrentRequests: 1,
        queueLength: 0,
        userHistory: {
          modelUsageCount: {},
          satisfactionScores: {}
        }
      }
    );

    // Save user message to DB
    const userMessage = await prisma.message.create({
      data: {
        conversationId,
        role: 'user',
        content,
        tokens: Math.ceil(content.length / 4),
        embedding: await getEmbedding(content) // Vector DB
      }
    });

    if (!stream) {
      // Non-streaming response
      const modelResponse = await executeWithFallback(
        {
          type: 'TEXT',
          content,
          conversationHistory,
          userTier,
          maxTokens: 2000,
          stream: false
        },
        routingDecision,
        userId
      );

      // Save assistant message
      const assistantMessage = await prisma.message.create({
        data: {
          conversationId,
          role: 'assistant',
          content: modelResponse.content,
          tokens: modelResponse.tokensUsed.total,
          generatedBy: modelResponse.usedModel,
          embedding: await getEmbedding(modelResponse.content)
        }
      });

      // Update compute credits
      const cost = Math.ceil(modelResponse.estimatedCost);
      await prisma.user.update({
        where: { id: userId },
        data: { computeCredits: { decrement: cost } }
      });

      return res.json({
        id: assistantMessage.id,
        conversationId,
        content: modelResponse.content,
        model: modelResponse.usedModel,
        tokensUsed: modelResponse.tokensUsed,
        cost: modelResponse.estimatedCost
      });
    }

    // Streaming response
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    let fullContent = '';
    let totalTokens = 0;
    let totalCost = 0;

    try {
      const streamResponse = await executeStreamingRequest(
        {
          type: 'TEXT',
          content,
          conversationHistory,
          userTier,
          stream: true
        },
        routingDecision,
        userId
      );

      // Stream tokens to client
      for await (const chunk of streamResponse) {
        if (chunk.type === 'token') {
          fullContent += chunk.token;
          totalTokens += 1; // Approximate

          // Send SSE
          res.write(`data: ${JSON.stringify({
            type: 'token',
            token: chunk.token,
            index: chunk.index
          })}\n\n`);
        }

        if (chunk.type === 'metadata') {
          totalCost = chunk.estimatedCost;
          res.write(`data: ${JSON.stringify({


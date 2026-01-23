# YULA OS Deployment Guide

> Production deployment guide for yula.dev

## Overview

YULA OS is deployed as a monorepo with the following services:

| Service | Platform | URL |
|---------|----------|-----|
| Web App | Vercel | https://yula.dev |
| API | Railway | https://api.yula.dev |
| Database | Railway (PostgreSQL) | Internal |
| Vector Store | Qdrant Cloud | Internal |

## Prerequisites

- Node.js 20+
- Bun 1.1.0+
- Vercel CLI (`npm i -g vercel`)
- Access to required secrets

## Environment Variables

### Web App (Vercel)

```bash
# AI Providers (Required)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GROQ_API_KEY=gsk_...

# API Connection
NEXT_PUBLIC_API_URL=https://api.yula.dev

# Auth
BETTER_AUTH_SECRET=<32+ character secret>
BETTER_AUTH_URL=https://yula.dev

# Billing (Polar)
POLAR_ACCESS_TOKEN=...
POLAR_WEBHOOK_SECRET=...
NEXT_PUBLIC_POLAR_ENV=production

# Sentry (Optional)
SENTRY_AUTH_TOKEN=...
NEXT_PUBLIC_SENTRY_DSN=...
```

### API Service (Railway)

```bash
# Database
DATABASE_URL=postgresql://...

# Auth
JWT_SECRET=<32+ character secret>
BETTER_AUTH_SECRET=<same as web>

# Vector Store
QDRANT_URL=https://...qdrant.io:6333
QDRANT_API_KEY=...

# AI Providers
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
```

## Deployment Steps

### 1. Initial Setup

```bash
# Clone repository
git clone https://github.com/your-org/aspendos.git
cd aspendos

# Install dependencies
bun install

# Generate Prisma client
bun db:generate
```

### 2. Vercel Setup

```bash
# Login to Vercel
vercel login

# Link project (first time only)
vercel link

# Set environment variables
vercel env add OPENAI_API_KEY
vercel env add ANTHROPIC_API_KEY
vercel env add GROQ_API_KEY
# ... add all required env vars
```

### 3. Deploy to Production

```bash
# Deploy web app
cd apps/web
vercel --prod

# Or use GitHub integration (recommended)
# Push to main branch triggers automatic deployment
```

### 4. Verify Deployment

```bash
# Check health endpoint
curl https://yula.dev/api/health

# Expected response:
# {"status":"healthy","timestamp":"...","uptime":...,"environment":"production"}
```

## CI/CD Pipeline

The GitHub Actions workflow (`.github/workflows/ci.yml`) handles:

1. **Lint & Type Check** - Runs on all PRs and pushes
2. **Test** - Runs API and Web tests with PostgreSQL
3. **Build** - Verifies production builds
4. **Deploy Preview** - Deploys PR previews to Vercel
5. **Deploy Production** - Deploys main branch to production

### Required GitHub Secrets

```
VERCEL_TOKEN          # Vercel API token
VERCEL_ORG_ID         # Vercel organization ID
VERCEL_PROJECT_ID     # Vercel project ID
OPENAI_API_KEY        # For AI SDK tests
ANTHROPIC_API_KEY     # For AI SDK tests
GROQ_API_KEY          # For AI SDK tests
```

## Monitoring

### Health Checks

- **Endpoint**: `GET /api/health`
- **Expected Status**: 200
- **Response**: JSON with status, timestamp, uptime

### Vercel Analytics

Vercel provides built-in analytics for:
- Core Web Vitals
- Request volume
- Error rates
- Edge function performance

### Sentry Integration

Error tracking and performance monitoring via Sentry:
- Automatic error capture
- Performance tracing
- Release tracking

## Rollback Procedure

### Via Vercel Dashboard

1. Go to Vercel Dashboard → Project → Deployments
2. Find the previous working deployment
3. Click "..." → "Promote to Production"

### Via CLI

```bash
# List deployments
vercel ls

# Promote specific deployment
vercel promote <deployment-url>
```

## Database Migrations

```bash
# Generate migration
cd packages/db
bunx prisma migrate dev --name <migration-name>

# Apply to production (be careful!)
bunx prisma migrate deploy
```

## Troubleshooting

### Build Failures

1. Check environment variables are set in Vercel
2. Run `bun run build` locally to reproduce
3. Check for TypeScript errors: `bun run typecheck`

### AI SDK Errors

1. Verify API keys are valid and have credits
2. Check rate limits on provider dashboards
3. Review Vercel function logs

### Memory/Qdrant Issues

1. Verify Qdrant cluster is healthy
2. Check QDRANT_URL and QDRANT_API_KEY
3. Test connection: `curl $QDRANT_URL/health`

### Auth Issues

1. Ensure BETTER_AUTH_SECRET matches across services
2. Verify BETTER_AUTH_URL is correct for environment
3. Check session cookie domain settings

## Security Checklist

- [ ] All secrets stored in Vercel/Railway env vars
- [ ] No secrets committed to repository
- [ ] HTTPS enforced on all endpoints
- [ ] CSP headers configured
- [ ] Rate limiting enabled
- [ ] Auth tokens have appropriate expiry
- [ ] Database has connection limits

## Support

- **Documentation**: This file + CLAUDE.md
- **Issues**: GitHub Issues
- **Logs**: Vercel Dashboard → Functions → Logs

---

*YULA OS - Your Universal Learning Assistant*

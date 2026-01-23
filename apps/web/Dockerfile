# ============================================
# ASPENDOS WEB APP - PRODUCTION DOCKERFILE
# ============================================
# Multi-stage build for optimized production image
# Supports Next.js 16 with standalone output
# Final image size: ~150MB

# ============================================
# BASE STAGE - Common base for all stages
# ============================================
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat curl

# ============================================
# DEPENDENCIES STAGE
# ============================================
FROM base AS deps

WORKDIR /app

# Install bun for faster package installation
RUN npm install -g bun

# Copy package files for monorepo
COPY package.json bun.lock* ./
COPY apps/web/package.json ./apps/web/
COPY packages/db/package.json ./packages/db/ 2>/dev/null || true
COPY packages/shared-types/package.json ./packages/shared-types/ 2>/dev/null || true

# Install dependencies
RUN bun install --frozen-lockfile

# ============================================
# BUILD STAGE
# ============================================
FROM base AS builder

WORKDIR /app

# Install bun
RUN npm install -g bun

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules 2>/dev/null || true

# Copy source code
COPY . .

# Set build-time environment variables (NEXT_PUBLIC_* are embedded at build time)
ARG NEXT_PUBLIC_APP_URL=https://aspendos.app
ARG NEXT_PUBLIC_API_URL=https://api.aspendos.app
ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_ONESIGNAL_APP_ID
ARG NEXT_PUBLIC_SENTRY_DSN
ARG NEXT_PUBLIC_GEMINI_API_KEY
ARG SENTRY_AUTH_TOKEN
ARG SENTRY_ORG
ARG SENTRY_PROJECT

ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_ONESIGNAL_APP_ID=$NEXT_PUBLIC_ONESIGNAL_APP_ID
ENV NEXT_PUBLIC_SENTRY_DSN=$NEXT_PUBLIC_SENTRY_DSN
ENV NEXT_PUBLIC_GEMINI_API_KEY=$NEXT_PUBLIC_GEMINI_API_KEY
ENV SENTRY_AUTH_TOKEN=$SENTRY_AUTH_TOKEN
ENV SENTRY_ORG=$SENTRY_ORG
ENV SENTRY_PROJECT=$SENTRY_PROJECT
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Build the application
WORKDIR /app/apps/web
RUN bun run build

# ============================================
# PRODUCTION STAGE
# ============================================
FROM base AS runner

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy only the necessary files for production
# Using standalone output to minimize image size
COPY --from=builder /app/apps/web/public ./public

# Set correct permissions for prerender cache
RUN mkdir -p .next && chown nextjs:nodejs .next

# Copy standalone server and static files
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./.next/static

# Switch to non-root user
USER nextjs

# Expose the port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Start the application
CMD ["node", "server.js"]

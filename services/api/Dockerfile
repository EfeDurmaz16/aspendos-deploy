# Yula OS API Service Dockerfile
# Monorepo-aware multi-stage build for GCP Cloud Run

# ============================================
# BUILD STAGE
# ============================================
FROM oven/bun:1 AS builder

WORKDIR /app

# Copy monorepo root files
COPY package.json bun.lock ./
COPY packages/db/package.json ./packages/db/
COPY packages/shared-types/package.json ./packages/shared-types/
COPY services/api/package.json ./services/api/

# Install dependencies
RUN bun install --frozen-lockfile

# Copy workspace source code
COPY packages/ ./packages/
COPY services/api/ ./services/api/

# Generate Prisma client
RUN cd packages/db && bunx prisma generate || true

# Build API
RUN cd services/api && bun run build

# ============================================
# PRODUCTION STAGE
# ============================================
FROM oven/bun:1-slim AS runner

WORKDIR /app

ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 api

# Copy built application and dependencies
COPY --from=builder --chown=api:nodejs /app/services/api/package.json ./
COPY --from=builder --chown=api:nodejs /app/services/api/node_modules ./node_modules
COPY --from=builder --chown=api:nodejs /app/services/api/dist ./dist
COPY --from=builder --chown=api:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=api:nodejs /app/packages/db/node_modules/.prisma ./node_modules/.prisma

USER api

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD bun -e "fetch('http://localhost:8080/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

CMD ["bun", "run", "start"]

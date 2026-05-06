# Yula OS API Service Dockerfile
# Railway/root production image for the API service.

FROM oven/bun:1.3.4 AS builder
WORKDIR /app

RUN apt-get update && \
    apt-get install -y --no-install-recommends python3 make g++ && \
    rm -rf /var/lib/apt/lists/*

# Copy the monorepo workspace exactly as CI sees it. Railway selects this
# root Dockerfile, so it must fail on dependency, workspace, or Prisma drift.
COPY package.json bun.lock ./
COPY apps/web/ ./apps/web/
COPY convex/ ./convex/
COPY packages/ ./packages/
COPY services/api/ ./services/api/
COPY services/eval/ ./services/eval/

# Install deps with the committed lockfile.
RUN bun install --frozen-lockfile

# Generate Prisma client. This must fail loudly; the API uses @aspendos/db on
# production paths and cannot safely run with the fallback client.
RUN cd packages/db && bun run db:generate

# Build the API through the package script used by CI.
RUN cd services/api && bun run build

# ============================================
FROM oven/bun:1.3.4-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 --gid nodejs api

COPY --from=builder --chown=api:nodejs /app/services/api/package.json ./
COPY --from=builder --chown=api:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=api:nodejs /app/packages ./packages
COPY --from=builder --chown=api:nodejs /app/services/api/dist ./dist

USER api
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD bun -e "fetch('http://localhost:8080/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

CMD ["bun", "run", "start"]

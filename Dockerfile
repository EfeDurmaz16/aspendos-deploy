# Yula OS API Service Dockerfile
# Standalone API build for GCP Cloud Run

FROM oven/bun:1 AS builder
WORKDIR /app

# Copy API package.json and fix workspace refs to local paths
COPY services/api/package.json ./package.json.orig
RUN sed 's|"workspace:\*"|"file:./packages/db"|; s|"@aspendos/shared-types": "file:./packages/db"|"@aspendos/shared-types": "file:./packages/shared-types"|' \
    package.json.orig > package.json.tmp && \
    cat package.json.orig | sed 's/"@aspendos\/db": "workspace:\*"/"@aspendos\/db": "file:\.\/packages\/db"/' | \
    sed 's/"@aspendos\/shared-types": "workspace:\*"/"@aspendos\/shared-types": "file:\.\/packages\/shared-types"/' > package.json

# Copy workspace packages
COPY packages/db/ ./packages/db/
COPY packages/shared-types/ ./packages/shared-types/

# Install deps
RUN bun install --no-frozen-lockfile

# Generate Prisma client
RUN cd packages/db && bunx prisma generate 2>/dev/null || true

# Copy API source
COPY services/api/src ./src
COPY services/api/tsconfig.json ./

# Build
RUN bun build src/index.ts --outdir dist --target bun

# ============================================
FROM oven/bun:1-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 --gid nodejs api

COPY --from=builder --chown=api:nodejs /app/package.json ./
COPY --from=builder --chown=api:nodejs /app/dist ./dist
COPY --from=builder --chown=api:nodejs /app/node_modules ./node_modules

USER api
EXPOSE 8080

CMD ["bun", "run", "dist/index.js"]

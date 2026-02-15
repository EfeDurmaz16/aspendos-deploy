# Yula OS API Service Dockerfile
# Multi-stage build for optimized production image

# ============================================
# BUILD STAGE
# ============================================
FROM oven/bun:1 AS builder

WORKDIR /app

# Copy package files
COPY package.json bun.lock ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Build TypeScript
RUN bun run build

# ============================================
# PRODUCTION STAGE
# ============================================
FROM oven/bun:1-slim AS runner

WORKDIR /app

# Set production environment
ENV NODE_ENV=production

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 api

# Copy built application
COPY --from=builder --chown=api:nodejs /app/package.json ./
COPY --from=builder --chown=api:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=api:nodejs /app/dist ./dist

# Switch to non-root user
USER api

# Expose port
EXPOSE 8080

# Health check (bun:1-slim has no curl, use bun's fetch)
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD bun -e "fetch('http://localhost:8080/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

# Start the application
CMD ["bun", "run", "start"]

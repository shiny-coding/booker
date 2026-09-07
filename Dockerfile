# Multi-stage build for Next.js
FROM node:20-slim AS base

WORKDIR /app

# Dependencies stage
FROM base AS deps

COPY package*.json ./
RUN npm ci

# Builder stage
FROM base AS builder

WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN npm run build

# Production runner stage
FROM base AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Copy built application
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/public ./public

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Exec form (JSON array): no /bin/sh is spawned for each check. The shell form made Falco fire
# "Shell Spawned in Container" every 30s on the prod host (2026-09-07).
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD ["node", "-e", "require('http').get('http://localhost:3000/', (r) => {process.exit(r.statusCode < 400 ? 0 : 1)})"]

CMD ["npm", "start"]

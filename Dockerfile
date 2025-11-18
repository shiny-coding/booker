# Multi-stage build for Next.js with Calibre
FROM node:20-slim AS base

# Install system dependencies and Calibre
RUN apt-get update && apt-get install -y \
    wget \
    xz-utils \
    python3 \
    python3-pip \
    libegl1 \
    libopengl0 \
    libxcb-cursor0 \
    libxkbcommon0 \
    libxcb-icccm4 \
    libxcb-image0 \
    libxcb-keysyms1 \
    libxcb-randr0 \
    libxcb-render-util0 \
    libxcb-shape0 \
    libxcb-xfixes0 \
    libxcb-xinerama0 \
    libdbus-1-3 \
    libfontconfig1 \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install Calibre
RUN wget -nv -O- https://download.calibre-ebook.com/linux-installer.sh | sh /dev/stdin install_dir=/opt/calibre

# Add Calibre to PATH
ENV PATH="/opt/calibre:${PATH}"

# Verify Calibre installation
RUN ebook-convert --version

WORKDIR /app

# Dependencies stage
FROM base AS deps

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Builder stage
FROM base AS builder

WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set environment variables for build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Build Next.js application
RUN npm run build

# Production runner stage
FROM base AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Create necessary directories with correct permissions
RUN mkdir -p /app/library/books /app/public/covers && \
    chown -R nextjs:nodejs /app

# Copy built application
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/package*.json ./
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Copy application code (needed for API routes and server components)
COPY --from=builder --chown=nextjs:nodejs /app/app ./app
COPY --from=builder --chown=nextjs:nodejs /app/lib ./lib
COPY --from=builder --chown=nextjs:nodejs /app/components ./components
COPY --from=builder --chown=nextjs:nodejs /app/auth.ts ./auth.ts
COPY --from=builder --chown=nextjs:nodejs /app/middleware.ts ./middleware.ts
COPY --from=builder --chown=nextjs:nodejs /app/next.config.* ./

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["npm", "start"]

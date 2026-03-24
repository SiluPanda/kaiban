# Stage 1: Install all dependencies (including dev for tsx)
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json tsconfig.json ./
COPY packages/core/package.json packages/core/tsconfig.json ./packages/core/
COPY packages/db/package.json packages/db/tsconfig.json ./packages/db/
COPY packages/server/package.json packages/server/tsconfig.json ./packages/server/
COPY packages/mcp-server/package.json packages/mcp-server/tsconfig.json ./packages/mcp-server/
COPY packages/cli/package.json packages/cli/tsconfig.json ./packages/cli/
RUN npm ci

# Stage 2: Production image with source (tsx handles TypeScript at runtime)
FROM node:20-alpine AS production
WORKDIR /app

RUN addgroup -g 1001 -S pith && \
    adduser -S pith -u 1001 -G pith

COPY --from=deps /app/node_modules ./node_modules
COPY package.json tsconfig.json ./
COPY packages/core/ ./packages/core/
COPY packages/db/ ./packages/db/
COPY packages/server/ ./packages/server/

USER pith

EXPOSE 3456

ENV NODE_ENV=production
ENV PORT=3456
ENV HOST=0.0.0.0

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3456/health || exit 1

CMD ["npx", "tsx", "packages/server/src/index.ts"]

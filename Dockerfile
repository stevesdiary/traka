# --- Builder stage ---
FROM node:22-slim AS builder

RUN corepack enable && corepack prepare pnpm@10.18.3 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY tsconfig.json ./
COPY src/ ./src/
COPY migrations/ ./migrations/
COPY scripts/ ./scripts/

RUN pnpm build

# --- Runner stage ---
FROM node:22-slim AS runner

RUN corepack enable && corepack prepare pnpm@10.18.3 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

COPY --from=builder /app/dist ./dist
COPY swagger.yaml ./swagger.yaml

ENV NODE_ENV=production

EXPOSE 8080

CMD ["node", "dist/src/index.js"]

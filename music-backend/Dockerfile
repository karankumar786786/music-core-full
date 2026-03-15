# Build stage
FROM node:20-slim AS builder

RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@10.26.2 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma/

RUN echo '{"esbuild":true,"sharp":true,"protobufjs":true,"@scarf/scarf":true,"prisma":true,"@prisma/engines":true}' > .pnpm-approved-builds.json
RUN pnpm install --frozen-lockfile

COPY . .

RUN npx prisma generate
RUN pnpm run build
RUN ls -la /app/dist/

# Production stage
FROM node:20-slim

RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@10.26.2 --activate

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma
COPY .env* ./
COPY postgress_ssl.pem ./

EXPOSE 3000

CMD ["pnpm", "run", "start:prod"]
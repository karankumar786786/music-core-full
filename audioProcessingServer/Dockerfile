FROM node:20-slim

RUN apt-get update && apt-get install -y openssl ffmpeg && rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@10.26.2 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma/

RUN echo '{"esbuild":true,"sharp":true,"protobufjs":true,"@scarf/scarf":true,"prisma":true,"@prisma/engines":true}' > .pnpm-approved-builds.json
RUN pnpm install --frozen-lockfile

COPY . .

RUN npx prisma generate

COPY .env* ./
COPY postgress_ssl.pem ./

EXPOSE 3000

CMD ["pnpm", "run", "start"]
# Combining NestJS, Prisma v7, and PostgreSQL in `music-backend`

This document serves as a comprehensive guide on how NestJS, Prisma (version 7+), and PostgreSQL (specifically Aiven Cloud) were integrated into this project. Prisma v7 introduces significant changes, notably requiring driver adapters and altering how the client is generated, making this setup slightly different from older boilerplate templates.

## 1. Core Architecture

- **Framework**: NestJS v11 (CommonJS compilation target via `tsc`)
- **Database**: PostgreSQL (hosted on Aiven Cloud)
- **ORM / Query Builder**: Prisma v7
- **Database Driver**: `pg` (Node.js PostgreSQL client) + `@prisma/adapter-pg`
- **Authentication**: Passport + JWT

This setup leverages Prisma's "adapter-first" architecture for v7, meaning Prisma delegates the actual database connection pooling and TCP communication to the native Node.js `pg` driver, rather than using its own Rust-based query engine for connections.

---

## 2. Dependencies

The following packages are essential for this integration:

```bash
# Prisma Core
pnpm add prisma @prisma/client

# PostgreSQL Driver & Prisma Adapter
pnpm add pg @prisma/adapter-pg
pnpm add -D @types/pg

# Environment Variables (Required for Prisma config logic)
pnpm add dotenv
```

---

## 3. Prisma Schema & Configuration

### A. The Schema File (`prisma/schema.prisma`)

The generated client needs special configuration so it can play nicely with NestJS's build output.

```prisma
generator client {
  provider     = "prisma-client"
  // Output into the accessible src structure
  output       = "../src/generated/prisma"
  // CRITICAL: Forces Prisma to output CommonJS modules (not ESM)
  // so `tsc` can compile without `import.meta.url` conflicts.
  moduleFormat = "cjs"
}

datasource db {
  provider = "postgresql"
  // Notice there's no `url` property defined here. In v7, this is
  // managed by `prisma.config.ts` or passed directly to the client.
}

model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  password  String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### B. The Prisma Config (`prisma.config.ts`)

In Prisma v7, the schema's `datasource` URL was removed. Instead, Prisma uses a configuration file in the project root to locate the schema and inject the `DATABASE_URL` during operations like migrations.

```typescript
import { defineConfig } from '@prisma/config';
import 'dotenv/config'; // Loads .env

export default defineConfig({
  schema: {
    path: './prisma/schema.prisma',
  },
  earlyAccess: true,
});
```

---

## 4. The NestJS Prisma Service

NestJS handles dependency injection via an `@Injectable()` service. Because we generate the client to a custom path (`src/generated/prisma`), we import it directly from there.

Because Aiven PostgreSQL requires strict SSL configurations, we manually construct the initial Node.js `pg.Pool`, ensuring we bypass `self-signed certificate` errors.

File: `src/prisma/prisma.service.ts`

```typescript
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as fs from 'fs';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    // 1. Strip Prisma-specific query parameters (like ?sslmode=require)
    // from the DATABASE_URL so they don't confuse the `pg` driver.
    const connectionString = process.env.DATABASE_URL?.split('?')[0];

    // 2. Initialize the native PostgreSQL connection pool
    const pool = new Pool({
      connectionString,
      ssl: {
        // Required for Aiven PostgreSQL if supplying custom CA fails validation.
        rejectUnauthorized: false,
      },
    });

    // 3. Wrap the pool in Prisma's PostgreSQL adapter
    const adapter = new PrismaPg(pool);

    // 4. Pass the adapter to the underlying PrismaClient instance
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

This `PrismaService` is then exported via a `@Global()` `PrismaModule` (`src/prisma/prisma.module.ts`) so it can be injected into any other service (like `UsersService`) without repetitive imports.

---

## 5. Early Environment Loading

NestJS modules (like `JwtModule` and `PrismaModule`) initialize very early during bootstrap. To ensure `process.env.DATABASE_URL` and `process.env.JWT_SECRET` are ready before module instantiation, we modify `src/main.ts`:

```typescript
// src/main.ts
import 'dotenv/config'; // <-- MUST be the first line
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
```

---

## 6. Daily Workflows / Recipes

### Generating the Client

Whenever you update `schema.prisma`, you must regenerate the TypeScript types and Node.js client definitions.

```bash
npx prisma generate
```

_(This outputs to `src/generated/prisma`, immediately giving your IDE intelligent autocomplete for newly added models)._

### Migrating the Database

When adding new models or fields (like we did with the `User` model), you push those changes to the Aiven instance:

```bash
npx prisma migrate dev --name describe_your_change
```

_Note: If Prisma detects schema drift (e.g., existing tables not tracked by Prisma's migration history), it may ask to reset the database. You can also use `npx prisma db push` for prototyping._

### Building the Project

Because we told Prisma to generate its client _inside_ the `src/` directory, NestJS's `tsc` compiler automatically includes it in the `./dist/` folder when compiling.

```bash
pnpm run build
```

The resulting build is pure CommonJS, completely resolving the ESM/CJS compatibility issues notorious in modern full-stack setups.

import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy {
  constructor() {
    // Use core connection string without query parameters to avoid pg driver confusion
    const connectionString = process.env.DATABASE_URL?.split('?')[0];

    // SSL configuration for Aiven managed database
    const sslConfig: any = {
      rejectUnauthorized: false,
    };

    // Load SSL certificate if path is provided
    const certPath = process.env.DATABASE_CERT_PATH;
    if (certPath) {
      try {
        const fullCertPath = path.resolve(certPath);
        if (fs.existsSync(fullCertPath)) {
          sslConfig.ca = fs.readFileSync(fullCertPath, 'utf-8');
        }
      } catch (error) {
        console.warn('Warning: Could not load SSL certificate:', error.message);
      }
    }

    const pool = new Pool({
      connectionString,
      ssl: sslConfig,
    });

    const adapter = new PrismaPg(pool);
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
    console.log('Database connected successfully');
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}

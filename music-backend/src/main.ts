import './telementry';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import { Logger as PinoLogger } from 'nestjs-pino';
import { ZodValidationPipe } from 'nestjs-zod';
import * as express from 'express';
import { serve } from "inngest/express";
import { client, functions } from "./lib/helpers/inngest/index";
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { cleanupOpenApiDoc } from 'nestjs-zod';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const logger = new Logger('Bootstrap');

  app.useLogger(app.get(PinoLogger));
  app.use(express.json());
  app.use("/api/inngest", serve({ client, functions }));
  app.useGlobalPipes(new ZodValidationPipe());
  app.enableCors(); // Enable if calling from a frontend

  // Swagger setup
  const config = new DocumentBuilder()
    .setTitle('Music Core API')
    .setDescription('The Music Core API description')
    .setVersion('1.0')
    .addTag('music')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);

  // Clean up the document for nestjs-zod
  cleanupOpenApiDoc(document);

  SwaggerModule.setup('api', app, document);

  await app.listen(process.env.PORT ?? 3000);
  logger.log(
    `Server running on http://localhost:${process.env.PORT ?? 3000}`,
    'Bootstrap',
  );
  logger.log(
    `Swagger documentation available at http://localhost:${process.env.PORT ?? 3000}/api`,
    'Bootstrap',
  );
}
bootstrap();

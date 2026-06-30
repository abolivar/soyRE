import './env.js';
import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = Number(process.env.API_PORT ?? 4000);
  const appUrl = process.env.APP_URL ?? 'http://localhost:3000';

  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      forbidNonWhitelisted: true,
      transform: true,
      whitelist: true,
    }),
  );
  app.enableCors({
    origin: appUrl,
    credentials: true,
  });
  app.enableShutdownHooks();

  await app.listen(port);
}

void bootstrap();

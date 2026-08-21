import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/all-exceptions.filter';

const bootstrapLogger = new Logger('Bootstrap');

/**
 * Application entry point. Everything that applies to the whole server -
 * routing prefix, CORS, validation - is configured here in one place.
 */
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.useGlobalFilters(new AllExceptionsFilter());

  // Every route is served under /api, so controllers declare bare paths.
  app.setGlobalPrefix('api');

  // A browser will refuse to read our responses unless we name the origins
  // allowed to call us. CORS_ORIGINS covers the deployed frontend, so
  // production never needs a code change.
  const allowedOrigins = (process.env.CORS_ORIGINS ?? 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  const isProduction = process.env.NODE_ENV === 'production';

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (error: Error | null, allow?: boolean) => void,
    ) => {
      // No Origin header at all: curl, Postman, health checks. Not a browser,
      // so there is no cross-site risk to protect against.
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) return callback(null, true);

      // In development only, accept any localhost port. Vite picks the next
      // free port (5174, 5175...) when 5173 is taken, and hard-coding one port
      // means the app silently breaks with a confusing CORS error.
      // Production never takes this branch - only the explicit list applies.
      if (
        !isProduction &&
        /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)
      ) {
        return callback(null, true);
      }

      bootstrapLogger.warn(`Rejected CORS origin: ${origin}`);
      return callback(new Error(`Origin ${origin} is not allowed by CORS`));
    },
  });

  app.useGlobalPipes(
    new ValidationPipe({
      // Run @Type/@Transform so `amount` arrives as a real number, and hand
      // the controller an actual ConvertQueryDto instance.
      transform: true,
      // Silently drop any query parameter the DTO does not declare.
      whitelist: true,
      // ...and reject the request outright if one is present, so typos like
      // ?ammount=100 fail loudly instead of defaulting to undefined.
      forbidNonWhitelisted: true,
    }),
  );

  // PORT is injected by the hosting platform in production.
  // '0.0.0.0' binds to all network interfaces - hosts like Render route
  // traffic from outside the container, so binding only to localhost would
  // make the service unreachable and fail their health check.
  const port = process.env.PORT ?? 3000;
  await app.listen(port, '0.0.0.0');

  console.log(`Backend listening on http://localhost:${port}/api`);
  console.log(`CORS allowed origins: ${allowedOrigins.join(', ')}`);
}

bootstrap().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  bootstrapLogger.error(`Application failed to start: ${message}`);
  process.exitCode = 1;
});

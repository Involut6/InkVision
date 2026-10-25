import 'reflect-metadata';

import { Logger as NestLogger, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import express, { type Request, type Response } from 'express';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';

import { AppModule } from './app.module.js';
import { createValidationPipe } from './common/pipes/validation.pipe.js';
import { AppConfigService } from './config/configuration.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
    // The body parsers are registered manually below so the webhook route can
    // keep the raw bytes it needs for signature verification.
    bodyParser: false,
  });

  const config = app.get(AppConfigService);
  app.useLogger(app.get(Logger));
  app.flushLogs();

  const logger = new NestLogger('Bootstrap');

  app.use(
    express.json({
      limit: '1mb',
      // Signature verification must run over the exact bytes received, so the
      // raw body is stashed before parsing. Re-serialising parsed JSON changes
      // the digest and would make every legitimate webhook fail.
      verify: (req: Request & { rawBody?: Buffer }, _res: Response, buffer: Buffer) => {
        if (req.originalUrl.includes('/payments/webhook')) {
          req.rawBody = Buffer.from(buffer);
        }
      },
    }),
  );
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(cookieParser());
  app.use(compression());

  app.use(
    helmet({
      // The API serves JSON and media, never HTML, so a restrictive CSP here
      // costs nothing. The website sets its own policy in middleware.
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'none'"],
          imgSrc: ["'self'", 'data:'],
          frameAncestors: ["'none'"],
          baseUri: ["'none'"],
          formAction: ["'none'"],
        },
      },
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      hsts: config.isProduction ? { maxAge: 63_072_000, includeSubDomains: true } : false,
    }),
  );

  // Behind a reverse proxy or CDN, trust its forwarding headers so client IPs
  // (used for rate limiting) are the real ones.
  app.set('trust proxy', 1);

  /**
   * Explicit CORS allowlist. Credentials are enabled because the admin portal
   * authenticates with cookies, and `credentials: true` with a wildcard origin
   * is both invalid and unsafe — so an unlisted origin is simply refused.
   */
  const allowedOrigins = new Set(config.corsOrigins);
  app.enableCors({
    origin: (origin, callback) => {
      // No Origin header: same-origin, curl, or a server-side fetch.
      if (!origin) return callback(null, true);
      if (allowedOrigins.has(origin)) return callback(null, true);
      return callback(new Error(`Origin ${origin} is not permitted by CORS_ORIGINS`), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-Request-Id'],
    exposedHeaders: ['X-Request-Id'],
    maxAge: 86_400,
  });

  app.setGlobalPrefix(config.globalPrefix, {
    exclude: [{ path: '', method: 0 }],
  });
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
  app.useGlobalPipes(createValidationPipe());
  app.enableShutdownHooks();

  if (config.swagger.enabled) {
    setUpSwagger(app, config);
  }

  await app.listen(config.port, config.host);

  logger.log(`InkVision API listening on http://${config.host}:${config.port}`);
  logger.log(`Base path: /${config.globalPrefix}/v1`);
  if (config.swagger.enabled) logger.log(`API documentation: /${config.globalPrefix}/docs`);
  logger.log(
    `Commerce: ${config.commerce.enabled ? `enabled via ${config.commerce.provider}` : 'disabled'} · ` +
      `Email: ${config.mail.provider} · Storage: ${config.storage.driver}`,
  );
}

function setUpSwagger(app: NestExpressApplication, config: AppConfigService): void {
  // In production the docs are only served behind basic auth; env validation
  // already refuses SWAGGER_ENABLED=true in production without credentials.
  if (config.isProduction && config.swagger.user && config.swagger.password) {
    const expected = `Basic ${Buffer.from(`${config.swagger.user}:${config.swagger.password}`).toString('base64')}`;

    app.use(`/${config.globalPrefix}/docs`, (req: Request, res: Response, next: () => void) => {
      if (req.headers.authorization === expected) return next();
      res.setHeader('WWW-Authenticate', 'Basic realm="InkVision API docs"');
      res.status(401).send('Authentication required');
    });
  }

  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('InkVision Creatives API')
      .setDescription(
        [
          'REST API behind the InkVision Creatives website and administration portal.',
          '',
          '**Public endpoints** serve only published content. Drafts, scheduled items and',
          'archived entries are excluded by the read layer itself, not by a filter each',
          'endpoint has to remember.',
          '',
          '**Admin endpoints** require a bearer access token (or the session cookie) and',
          'the permissions named on each operation. Authorisation is enforced server-side.',
          '',
          '**Errors** all share one shape: `{ statusCode, error, code, message, details?,',
          'requestId?, timestamp, path? }`. `details` is keyed by field path for validation',
          'failures.',
        ].join('\n'),
      )
      .setVersion('1.0')
      .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'access-token')
      .addCookieAuth('inkvision_access')
      .addServer(`${config.publicApiUrl}/${config.globalPrefix}/v1`)
      .build(),
  );

  SwaggerModule.setup(`${config.globalPrefix}/docs`, app, document, {
    swaggerOptions: { persistAuthorization: true, tagsSorter: 'alpha' },
    customSiteTitle: 'InkVision Creatives API',
  });
}

void bootstrap().catch((error: unknown) => {
  // Configuration errors land here. They are printed in full because the
  // operator needs the detail, and the process exits non-zero so a supervisor
  // does not treat a misconfigured start as success.
  console.error('\nFailed to start the InkVision API:\n');
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

import { randomUUID } from 'node:crypto';

import type { Params as PinoParams } from 'nestjs-pino';

/**
 * Structured logging configuration.
 *
 * Redaction is the important part: request headers and bodies pass through the
 * logger, so anything that could carry a credential or personal data is
 * replaced before it reaches a log sink.
 */
const REDACTED_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers["x-csrf-token"]',
  'res.headers["set-cookie"]',
  'req.body.password',
  'req.body.currentPassword',
  'req.body.newPassword',
  'req.body.passwordConfirmation',
  'req.body.workEmail',
  'req.body.email',
  'req.body.message',
  'req.body.fullName',
  'req.body.customerEmail',
  'req.body.customerName',
  '*.passwordHash',
  '*.tokenHash',
  '*.accessToken',
  '*.refreshToken',
];

/**
 * Pino types its serializer arguments as `any`. These two shapes describe the
 * fields actually read, so the serializers below stay type-checked.
 */
interface LoggedRequest {
  id?: unknown;
  method?: string;
  url?: string;
  headers?: Record<string, string | string[] | undefined>;
}

interface LoggedResponse {
  statusCode: number;
}

export function createLoggerOptions(options: {
  level: string;
  pretty: boolean;
  isTest: boolean;
}): PinoParams {
  return {
    pinoHttp: {
      level: options.isTest ? 'silent' : options.level,
      // The request id is echoed to the client in error bodies, so a support
      // conversation can be tied to a specific log line.
      genReqId: (req, res) => {
        const existing = req.headers['x-request-id'];
        const id = typeof existing === 'string' && existing.length <= 100 ? existing : randomUUID();
        res.setHeader('X-Request-Id', id);
        return id;
      },
      redact: { paths: REDACTED_PATHS, censor: '[redacted]' },
      autoLogging: {
        ignore: (req) => req.url === '/api/v1/health' || req.url === '/api/v1/ready',
      },
      customLogLevel: (_req, res, err) => {
        if (err || res.statusCode >= 500) return 'error';
        if (res.statusCode >= 400) return 'warn';
        return 'info';
      },
      serializers: {
        req: (req: LoggedRequest) => ({
          id: req.id,
          method: req.method,
          url: req.url,
          // Full user agents are noise; a prefix is enough to spot bots.
          userAgent:
            typeof req.headers?.['user-agent'] === 'string'
              ? req.headers['user-agent'].slice(0, 120)
              : undefined,
        }),
        res: (res: LoggedResponse) => ({ statusCode: res.statusCode }),
      },
      transport: options.pretty
        ? {
            target: 'pino-pretty',
            options: { colorize: true, singleLine: true, translateTime: 'HH:MM:ss.l' },
          }
        : undefined,
    },
  };
}

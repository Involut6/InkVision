import {
  ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { ThrottlerException } from '@nestjs/throttler';
import type { Request, Response } from 'express';

import type { ApiErrorBody, ApiErrorCode } from '@inkvision/shared-types';

import { AppException } from '../errors/app.errors.js';
import { isPrismaKnownError, mapPrismaError } from './prisma-error.mapper.js';

/**
 * The only place an error becomes an HTTP response.
 *
 * Guarantees three things:
 *   1. Every error body has the same shape (`ApiErrorBody`).
 *   2. Nothing internal leaks — no stack traces, no driver text, no SQL.
 *   3. Unexpected errors are logged in full, server-side, with a request id the
 *      client is also given so the two can be correlated.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request & { id?: string }>();
    const response = ctx.getResponse<Response>();

    const resolved = this.resolve(exception);
    const requestId = typeof request?.id === 'string' ? request.id : undefined;

    const body: ApiErrorBody = {
      statusCode: resolved.status,
      error: HttpStatus[resolved.status] ?? 'ERROR',
      code: resolved.code,
      message: resolved.message,
      ...(resolved.details ? { details: resolved.details } : {}),
      ...(requestId ? { requestId } : {}),
      timestamp: new Date().toISOString(),
      ...(request?.url ? { path: request.url } : {}),
    };

    if (resolved.status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        {
          requestId,
          method: request?.method,
          path: request?.url,
          err:
            exception instanceof Error
              ? { name: exception.name, message: exception.message }
              : exception,
        },
        exception instanceof Error ? exception.stack : 'Non-error thrown',
      );
    } else if (resolved.status === HttpStatus.TOO_MANY_REQUESTS) {
      this.logger.warn({ requestId, path: request?.url }, 'Request rate limited');
    }

    httpAdapter.reply(response, body, resolved.status);
  }

  private resolve(exception: unknown): {
    status: HttpStatus;
    code: ApiErrorCode;
    message: string;
    details?: Readonly<Record<string, readonly string[]>>;
  } {
    if (exception instanceof AppException) {
      const payload = exception.getResponse() as {
        message?: string;
        details?: Readonly<Record<string, readonly string[]>>;
      };
      return {
        status: exception.getStatus(),
        code: exception.code,
        message: payload.message ?? exception.message,
        ...(payload.details ? { details: payload.details } : {}),
      };
    }

    if (exception instanceof ThrottlerException) {
      return {
        status: HttpStatus.TOO_MANY_REQUESTS,
        code: 'RATE_LIMITED',
        message: 'Too many requests. Please wait a moment and try again.',
      };
    }

    if (isPrismaKnownError(exception)) {
      return mapPrismaError(exception);
    }

    if (exception instanceof HttpException) {
      return this.fromHttpException(exception);
    }

    // Anything unrecognised is a bug. The client learns only that it failed.
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      code: 'INTERNAL_ERROR',
      message: 'Something went wrong on our side. Please try again shortly.',
    };
  }

  private fromHttpException(exception: HttpException): {
    status: HttpStatus;
    code: ApiErrorCode;
    message: string;
    details?: Readonly<Record<string, readonly string[]>>;
  } {
    const status = exception.getStatus();
    const response = exception.getResponse();

    // The global ValidationPipe is configured to throw with this shape.
    if (typeof response === 'object' && response !== null && 'details' in response) {
      const typed = response as { message?: string; details: Record<string, string[]> };
      return {
        status,
        code: 'VALIDATION_FAILED',
        message: typed.message ?? 'The submitted data is invalid.',
        details: typed.details,
      };
    }

    const message =
      typeof response === 'string'
        ? response
        : typeof response === 'object' && response !== null && 'message' in response
          ? Array.isArray(response.message)
            ? (response as { message: string[] }).message.join(' ')
            : String(response.message)
          : exception.message;

    return { status, code: statusToCode(status), message };
  }
}

function statusToCode(status: HttpStatus): ApiErrorCode {
  switch (status) {
    case HttpStatus.BAD_REQUEST:
      return 'VALIDATION_FAILED';
    case HttpStatus.UNAUTHORIZED:
      return 'UNAUTHENTICATED';
    case HttpStatus.FORBIDDEN:
      return 'FORBIDDEN';
    case HttpStatus.NOT_FOUND:
      return 'NOT_FOUND';
    case HttpStatus.CONFLICT:
      return 'CONFLICT';
    case HttpStatus.PAYLOAD_TOO_LARGE:
      return 'PAYLOAD_TOO_LARGE';
    case HttpStatus.UNSUPPORTED_MEDIA_TYPE:
      return 'UNSUPPORTED_MEDIA_TYPE';
    case HttpStatus.TOO_MANY_REQUESTS:
      return 'RATE_LIMITED';
    case HttpStatus.SERVICE_UNAVAILABLE:
      return 'SERVICE_UNAVAILABLE';
    default:
      // Anything 5xx that is not named above is a server fault; the rest are
      // treated as a malformed request.
      return status >= HttpStatus.INTERNAL_SERVER_ERROR ? 'INTERNAL_ERROR' : 'VALIDATION_FAILED';
  }
}

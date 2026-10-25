import { HttpStatus } from '@nestjs/common';

import type { ApiErrorCode } from '@inkvision/shared-types';

interface PrismaKnownError {
  code: string;
  meta?: Record<string, unknown>;
}

/**
 * Duck-types Prisma's known-request errors. Checking the shape rather than
 * `instanceof` keeps this file free of a runtime import of the generated client,
 * which matters because the mapper is also exercised in unit tests.
 */
export function isPrismaKnownError(error: unknown): error is PrismaKnownError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof error.code === 'string' &&
    /^P\d{4}$/.test((error as { code: string }).code)
  );
}

/**
 * Translates database errors into safe client responses. Crucially, the mapped
 * message never includes the driver's text, which can contain column values.
 */
export function mapPrismaError(error: PrismaKnownError): {
  status: HttpStatus;
  code: ApiErrorCode;
  message: string;
  details?: Readonly<Record<string, readonly string[]>>;
} {
  switch (error.code) {
    case 'P2002': {
      // Unique constraint violation. `meta.target` names the column(s).
      const target = normaliseTarget(error.meta?.target);
      return {
        status: HttpStatus.CONFLICT,
        code: 'CONFLICT',
        message: target.length
          ? `A record with that ${target.join(' and ')} already exists.`
          : 'A record with those details already exists.',
        ...(target.length
          ? { details: Object.fromEntries(target.map((field) => [field, ['Already in use.']])) }
          : {}),
      };
    }

    case 'P2003':
    case 'P2014':
      return {
        status: HttpStatus.CONFLICT,
        code: 'CONFLICT',
        message: 'That change would break a relationship with existing records.',
      };

    case 'P2025':
      return {
        status: HttpStatus.NOT_FOUND,
        code: 'NOT_FOUND',
        message: 'The requested record no longer exists.',
      };

    case 'P2000':
      return {
        status: HttpStatus.BAD_REQUEST,
        code: 'VALIDATION_FAILED',
        message: 'One of the submitted values is too long.',
      };

    case 'P1001':
    case 'P1002':
    case 'P1017':
      return {
        status: HttpStatus.SERVICE_UNAVAILABLE,
        code: 'SERVICE_UNAVAILABLE',
        message: 'The service is temporarily unavailable. Please try again shortly.',
      };

    default:
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        code: 'INTERNAL_ERROR',
        message: 'Something went wrong on our side. Please try again shortly.',
      };
  }
}

function normaliseTarget(target: unknown): string[] {
  if (Array.isArray(target))
    return target.filter((entry): entry is string => typeof entry === 'string');
  if (typeof target === 'string') {
    // Prisma sometimes reports `table_column_key`; keep only the column part.
    return [target.replace(/_key$/, '').split('_').slice(-1)[0] ?? target];
  }
  return [];
}

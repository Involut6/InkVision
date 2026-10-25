import type { ApiErrorBody, ApiErrorCode } from '@inkvision/shared-types';

/**
 * A failed API call, carrying the server's structured body.
 *
 * Keeping the code and field-level details on the error means a form can
 * attach server-side validation messages to the right inputs instead of
 * showing one generic banner.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode | string;
  readonly details: Readonly<Record<string, readonly string[]>> | undefined;
  readonly requestId: string | undefined;

  constructor(status: number, body: Partial<ApiErrorBody> | null, fallbackMessage: string) {
    super(body?.message ?? fallbackMessage);
    this.name = 'ApiError';
    this.status = status;
    this.code = body?.code ?? 'INTERNAL_ERROR';
    this.details = body?.details;
    this.requestId = body?.requestId;
  }

  get isNotFound(): boolean {
    return this.status === 404;
  }

  get isValidationError(): boolean {
    return this.status === 400 && this.details !== undefined;
  }

  get isUnauthenticated(): boolean {
    return this.status === 401;
  }

  get isForbidden(): boolean {
    return this.status === 403;
  }

  get isRateLimited(): boolean {
    return this.status === 429;
  }

  /** Phrasing suitable for a visitor rather than a developer. */
  get userMessage(): string {
    if (this.isRateLimited) {
      return 'That was a lot of requests in a short time. Please wait a moment and try again.';
    }
    if (this.status >= 500) {
      return 'Something went wrong on our side. Please try again shortly.';
    }
    return this.message;
  }
}

/** Raised when the API cannot be reached at all. */
export class ApiUnreachableError extends Error {
  constructor(cause?: unknown) {
    super('The service could not be reached. Please check your connection and try again.');
    this.name = 'ApiUnreachableError';
    this.cause = cause;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/** Maps an error into `{ field: message }` for React Hook Form. */
export function toFieldErrors(error: unknown): Record<string, string> {
  if (!isApiError(error) || !error.details) return {};

  return Object.fromEntries(
    Object.entries(error.details)
      .map(([field, messages]) => [field, messages[0]] as const)
      .filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
  );
}

import { HttpException, HttpStatus } from '@nestjs/common';

import type { ApiErrorCode } from '@inkvision/shared-types';

/**
 * Base class for every error this API raises deliberately.
 *
 * Carrying the machine-readable `code` on the exception means the HTTP filter
 * never has to infer it from a message string, and clients can branch on a
 * stable value instead of parsing prose.
 */
export class AppException extends HttpException {
  constructor(
    readonly code: ApiErrorCode,
    status: HttpStatus,
    message: string,
    readonly details?: Readonly<Record<string, readonly string[]>>,
  ) {
    super({ code, message, details }, status);
  }
}

export class ResourceNotFoundException extends AppException {
  constructor(resource: string, identifier?: string) {
    super(
      'NOT_FOUND',
      HttpStatus.NOT_FOUND,
      identifier ? `${resource} '${identifier}' was not found.` : `${resource} was not found.`,
    );
  }
}

export class ValidationFailedException extends AppException {
  constructor(
    details: Readonly<Record<string, readonly string[]>>,
    message = 'The submitted data is invalid.',
  ) {
    super('VALIDATION_FAILED', HttpStatus.BAD_REQUEST, message, details);
  }
}

export class ResourceConflictException extends AppException {
  constructor(message: string, details?: Readonly<Record<string, readonly string[]>>) {
    super('CONFLICT', HttpStatus.CONFLICT, message, details);
  }
}

export class UnauthenticatedException extends AppException {
  constructor(message = 'Authentication is required.') {
    super('UNAUTHENTICATED', HttpStatus.UNAUTHORIZED, message);
  }
}

export class InvalidCredentialsException extends AppException {
  constructor() {
    // Deliberately identical whether the account exists or the password is
    // wrong, so the endpoint cannot be used to enumerate accounts.
    super('UNAUTHENTICATED', HttpStatus.UNAUTHORIZED, 'Email or password is incorrect.');
  }
}

export class AccessDeniedException extends AppException {
  constructor(message = 'You do not have permission to perform this action.') {
    super('FORBIDDEN', HttpStatus.FORBIDDEN, message);
  }
}

export class CommerceDisabledException extends AppException {
  constructor() {
    super(
      'COMMERCE_DISABLED',
      HttpStatus.SERVICE_UNAVAILABLE,
      'Purchasing is not available yet. Please get in touch and we will let you know when it opens.',
    );
  }
}

export class ProductUnavailableException extends AppException {
  constructor(reason: string) {
    super('PRODUCT_UNAVAILABLE', HttpStatus.CONFLICT, reason);
  }
}

export class PaymentVerificationFailedException extends AppException {
  constructor(message = 'The payment could not be verified.') {
    super('PAYMENT_VERIFICATION_FAILED', HttpStatus.BAD_REQUEST, message);
  }
}

export class DownloadLinkInvalidException extends AppException {
  constructor(message = 'This download link is no longer valid. Please request a new one.') {
    super('DOWNLOAD_LINK_INVALID', HttpStatus.FORBIDDEN, message);
  }
}

export class DownloadLimitReachedException extends AppException {
  constructor() {
    super(
      'DOWNLOAD_LIMIT_REACHED',
      HttpStatus.FORBIDDEN,
      'The download limit for this purchase has been reached. Please contact support.',
    );
  }
}

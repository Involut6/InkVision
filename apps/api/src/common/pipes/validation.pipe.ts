import { BadRequestException, ValidationPipe, type ValidationError } from '@nestjs/common';

/**
 * The global validation pipe.
 *
 * Two deliberate choices:
 *   * `whitelist` + `forbidNonWhitelisted` — unknown properties are rejected
 *     rather than silently dropped, so a renamed field fails loudly.
 *   * errors are flattened into `{ field: [messages] }` keyed by the full path,
 *     which is exactly what React Hook Form needs to attach field errors.
 */
export function createValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    stopAtFirstError: false,
    validateCustomDecorators: true,
    transformOptions: { enableImplicitConversion: false },
    exceptionFactory: (errors: ValidationError[]) =>
      new BadRequestException({
        code: 'VALIDATION_FAILED',
        message: 'The submitted data is invalid.',
        details: flattenValidationErrors(errors),
      }),
  });
}

/** Walks nested validation errors into `parent.child` keys. */
export function flattenValidationErrors(
  errors: readonly ValidationError[],
  parentPath = '',
): Record<string, string[]> {
  const result: Record<string, string[]> = {};

  for (const error of errors) {
    const path = parentPath ? `${parentPath}.${error.property}` : error.property;

    if (error.constraints) {
      result[path] = Object.values(error.constraints);
    }

    if (error.children?.length) {
      Object.assign(result, flattenValidationErrors(error.children, path));
    }
  }

  return result;
}

import { Transform } from 'class-transformer';

/**
 * Typed `class-transformer` helpers.
 *
 * `@Transform` hands the callback an `any`, so every inline transform in a DTO
 * leaked an untyped value into the validation layer — the one place where
 * precision matters most. These wrappers narrow the value once, here, so the
 * DTOs stay free of `any` and the intent of each transform is named.
 */

/** Trims surrounding whitespace, leaving non-strings untouched. */
export const TrimString = (): PropertyDecorator =>
  Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value));

/** Trims and lowercases. Used for every email address the API accepts. */
export const NormaliseEmail = (): PropertyDecorator =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  );

/** Trims and uppercases. Used for ISO-4217 currency codes. */
export const UppercaseCode = (): PropertyDecorator =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  );

/**
 * Parses the `"true"` / `"false"` strings a query string or multipart form
 * carries, leaving a genuine boolean alone and an absent value undefined so
 * `@IsOptional()` still applies.
 */
export const ToOptionalBoolean = (): PropertyDecorator =>
  Transform(({ value }: { value: unknown }) => {
    if (value === undefined || value === null || value === '') return undefined;
    if (typeof value === 'boolean') return value;
    if (value === 'true' || value === '1') return true;
    if (value === 'false' || value === '0') return false;
    return value;
  });

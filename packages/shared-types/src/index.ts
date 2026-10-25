/**
 * `@inkvision/shared-types` — the API contract shared by `apps/api` and
 * `apps/web`. Type declarations and small `const` lookup tables only: nothing
 * here may import framework code, so either side can depend on it freely.
 */
export * from './api.js';
export * from './enums.js';
export * from './content.js';
export * from './enquiry.js';
export * from './commerce.js';

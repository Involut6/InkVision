import { SetMetadata } from '@nestjs/common';

import type { Permission } from '@inkvision/shared-types';

export const PERMISSIONS_KEY = 'inkvision:permissions';

/**
 * Declares the permissions a route requires. Routes name permissions, never
 * roles, so the role→permission map can change in one place.
 */
export const RequirePermissions = (...permissions: Permission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

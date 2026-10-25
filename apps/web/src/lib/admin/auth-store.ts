'use client';

import { create } from 'zustand';

import type { AdminUserDto, Permission } from '@inkvision/shared-types';

/**
 * Admin session state.
 *
 * This is the one place Zustand is used, and it earns its place: the access
 * token and the signed-in user are genuinely shared client state that several
 * unrelated components need, and they are not server state that TanStack Query
 * should own.
 *
 * The access token lives in memory only. It is deliberately NOT written to
 * `localStorage` or `sessionStorage`: anything stored there is readable by any
 * script that manages to run on the page, which turns a single XSS into a
 * stolen session. Persistence across reloads comes from the HttpOnly refresh
 * cookie instead, exchanged on mount.
 */
interface AuthState {
  user: AdminUserDto | null;
  accessToken: string | null;
  csrfToken: string | null;
  /** True until the first refresh attempt settles, so guards do not flash. */
  isInitialising: boolean;

  setSession: (session: { user: AdminUserDto; accessToken: string; csrfToken: string }) => void;
  clearSession: () => void;
  setInitialised: () => void;
  can: (permission: Permission) => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  csrfToken: null,
  isInitialising: true,

  setSession: ({ user, accessToken, csrfToken }) =>
    set({ user, accessToken, csrfToken, isInitialising: false }),

  clearSession: () =>
    set({ user: null, accessToken: null, csrfToken: null, isInitialising: false }),

  setInitialised: () => set({ isInitialising: false }),

  /**
   * Convenience for hiding controls a user cannot use.
   *
   * This is presentation only. Every one of these permissions is enforced
   * server-side by `PermissionsGuard`; hiding a button is a courtesy, not a
   * control.
   */
  can: (permission) => get().user?.permissions.includes(permission) ?? false,
}));

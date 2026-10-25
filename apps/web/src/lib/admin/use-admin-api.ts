'use client';

import { useCallback } from 'react';

import { browserApi } from '@/lib/api.browser';
import type { ApiRequestInit } from '@/lib/api-client';
import { isApiError } from '@/lib/api-error';

import { useAuthStore } from './auth-store';

/**
 * An API caller bound to the current admin session.
 *
 * It attaches the in-memory access token and the CSRF token, and transparently
 * retries once after a silent refresh when the access token has expired —
 * short-lived tokens are the point of the design, so the UI should not make a
 * user sign in again every fifteen minutes.
 */
export function useAdminApi() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const csrfToken = useAuthStore((state) => state.csrfToken);
  const setSession = useAuthStore((state) => state.setSession);
  const clearSession = useAuthStore((state) => state.clearSession);

  return useCallback(
    async <T>(path: string, init: ApiRequestInit = {}): Promise<T> => {
      const call = (token: string | null, csrf: string | null) =>
        browserApi.request<T>(path, {
          ...init,
          accessToken: token ?? undefined,
          csrfToken: csrf ?? undefined,
        });

      try {
        return await call(accessToken, csrfToken);
      } catch (error) {
        if (!isApiError(error) || !error.isUnauthenticated) throw error;

        // One refresh attempt, then the original call again. A second failure
        // means the session is genuinely over.
        try {
          const refreshed = await browserApi.post<{
            accessToken: string;
            expiresIn: number;
            csrfToken: string;
            user: Parameters<typeof setSession>[0]['user'];
          }>('/admin/auth/refresh');

          setSession({
            user: refreshed.user,
            accessToken: refreshed.accessToken,
            csrfToken: refreshed.csrfToken,
          });

          return await call(refreshed.accessToken, refreshed.csrfToken);
        } catch {
          clearSession();
          throw error;
        }
      }
    },
    [accessToken, csrfToken, setSession, clearSession],
  );
}

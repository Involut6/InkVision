'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { ErrorState, LoadingState } from '@/components/ui/states';
import { browserApi } from '@/lib/api.browser';
import { isApiError } from '@/lib/api-error';
import { useAuthStore } from '@/lib/admin/auth-store';
import type { LoginResponse } from '@inkvision/shared-types';

/**
 * Restores the session on mount and gates the admin UI.
 *
 * On a page load the in-memory access token is gone, so this exchanges the
 * HttpOnly refresh cookie for a fresh one. That is what makes "token in memory
 * only" survive a reload without putting a credential in browser storage.
 *
 * This is a convenience, not a security control: every admin endpoint enforces
 * authentication and permissions server-side, so bypassing this component in
 * the browser gets an attacker a UI shell with no data in it.
 */
export function AdminGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const isInitialising = useAuthStore((state) => state.isInitialising);
  const setSession = useAuthStore((state) => state.setSession);
  const setInitialised = useAuthStore((state) => state.setInitialised);

  // React 18+ mounts effects twice in development; one refresh is enough and
  // a second would rotate the token out from under the first.
  const attempted = useRef(false);

  /**
   * A rate-limited refresh is NOT the same as an expired session. Treating it
   * as one would sign an operator out — and lose their unsaved work — because
   * they happened to open several tabs at once.
   */
  const [rateLimited, setRateLimited] = useState(false);

  const restore = useCallback(() => {
    setRateLimited(false);

    void browserApi
      .post<LoginResponse>('/admin/auth/refresh')
      .then((response) =>
        setSession({
          user: response.user,
          accessToken: response.accessToken,
          csrfToken: response.csrfToken,
        }),
      )
      .catch((error: unknown) => {
        if (isApiError(error) && error.isRateLimited) setRateLimited(true);
        setInitialised();
      });
  }, [setSession, setInitialised]);

  useEffect(() => {
    if (attempted.current || user) return;
    attempted.current = true;
    restore();
  }, [user, restore]);

  useEffect(() => {
    if (!isInitialising && !user && !rateLimited) router.replace('/admin/login');
  }, [isInitialising, user, rateLimited, router]);

  if (isInitialising) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <LoadingState label="Restoring your session" />
      </div>
    );
  }

  if (rateLimited) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-4">
        <ErrorState
          title="Too many requests"
          description="Your session could not be checked because of rate limiting. Wait a moment and try again — you have not been signed out."
          action={
            <Button
              onClick={() => {
                attempted.current = true;
                restore();
              }}
            >
              Try again
            </Button>
          }
        />
      </div>
    );
  }

  if (!user) return null;

  return <>{children}</>;
}

'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState, type ReactNode } from 'react';

import { isApiError } from '@/lib/api-error';

/**
 * TanStack Query provider.
 *
 * The client is created inside `useState` so each browser session gets exactly
 * one, and a server render never shares a cache between requests.
 *
 * It also marks the document as hydrated. Without that signal an automated
 * test can click a server-rendered button before its handler is attached: the
 * form then submits natively and the page reloads, which looks like broken
 * validation but is a race. The effect lives here rather than in a component
 * of its own because an extra client component directly inside the root
 * layout's `<body>` breaks Next.js's `/_global-error` prerender.
 */
export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            gcTime: 5 * 60_000,
            refetchOnWindowFocus: false,
            retry: (failureCount, error) => {
              // Retrying a 4xx just repeats the same rejection. Only transient
              // failures are worth a second attempt, and only twice.
              if (isApiError(error) && error.status < 500 && !error.isRateLimited) return false;
              return failureCount < 2;
            },
          },
          mutations: {
            // A mutation that failed should not be replayed automatically: it
            // may have already had an effect the client cannot see.
            retry: false,
          },
        },
      }),
  );

  useEffect(() => {
    document.documentElement.dataset.hydrated = 'true';
  }, []);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

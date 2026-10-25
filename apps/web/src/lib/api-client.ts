import type { ApiErrorBody } from '@inkvision/shared-types';

import { ApiError, ApiUnreachableError } from './api-error';

export type ApiRequestInit = Omit<RequestInit, 'body' | 'method'> & {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  /** Serialised as JSON. Pass a plain object, not a string. */
  json?: unknown;
  /** Appended as a query string; undefined and empty values are dropped. */
  query?: Record<string, string | number | boolean | undefined | null>;
  /** Access token for admin calls. Held in memory only, never in storage. */
  accessToken?: string | undefined;
  /** Double-submit CSRF token, required for cookie-authenticated writes. */
  csrfToken?: string | undefined;
  /** Abort signal, so a superseded request can be cancelled. */
  signal?: AbortSignal | undefined;
  /** Next.js caching directives. Server-side calls only. */
  next?: { revalidate?: number | false; tags?: string[] };
};

/**
 * The typed API client, shared by server components and browser code.
 *
 * One implementation, two base URLs: the Next.js server reaches the API over
 * `API_BASE_URL` (which may be an internal address), the browser over
 * `NEXT_PUBLIC_API_BASE_URL`. Nothing else differs, so there is no second
 * client to keep in step.
 */
export class ApiClient {
  constructor(
    private readonly baseUrl: string,
    private readonly defaults: { credentials?: RequestCredentials } = {},
  ) {}

  async request<T>(path: string, init: ApiRequestInit = {}): Promise<T> {
    const { json, query, accessToken, csrfToken, next, ...rest } = init;

    const url = new URL(`${this.baseUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`);

    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value === undefined || value === null || value === '') continue;
        url.searchParams.set(key, String(value));
      }
    }

    const headers = new Headers(rest.headers);
    headers.set('Accept', 'application/json');
    if (json !== undefined) headers.set('Content-Type', 'application/json');
    if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
    if (csrfToken) headers.set('X-CSRF-Token', csrfToken);

    let response: Response;

    try {
      response = await fetch(url, {
        ...rest,
        method: rest.method ?? 'GET',
        headers,
        ...(json !== undefined ? { body: JSON.stringify(json) } : {}),
        // Cookies are needed for the admin session; public GETs send none.
        credentials: rest.credentials ?? this.defaults.credentials ?? 'omit',
        ...(next ? { next } : {}),
      } as RequestInit);
    } catch (error) {
      // An aborted request is a caller decision, not a failure to report.
      if (error instanceof DOMException && error.name === 'AbortError') throw error;
      throw new ApiUnreachableError(error);
    }

    if (response.status === 204) return undefined as T;

    const isJson = response.headers.get('content-type')?.includes('application/json') ?? false;

    if (!response.ok) {
      const body = isJson
        ? ((await response.json().catch(() => null)) as ApiErrorBody | null)
        : null;
      throw new ApiError(response.status, body, `Request failed with status ${response.status}`);
    }

    return (isJson ? await response.json() : await response.text()) as T;
  }

  get<T>(path: string, init?: Omit<ApiRequestInit, 'method' | 'json'>): Promise<T> {
    return this.request<T>(path, { ...init, method: 'GET' });
  }

  post<T>(
    path: string,
    json?: unknown,
    init?: Omit<ApiRequestInit, 'method' | 'json'>,
  ): Promise<T> {
    return this.request<T>(path, { ...init, method: 'POST', json });
  }

  patch<T>(
    path: string,
    json?: unknown,
    init?: Omit<ApiRequestInit, 'method' | 'json'>,
  ): Promise<T> {
    return this.request<T>(path, { ...init, method: 'PATCH', json });
  }

  delete<T>(path: string, init?: Omit<ApiRequestInit, 'method' | 'json'>): Promise<T> {
    return this.request<T>(path, { ...init, method: 'DELETE' });
  }
}

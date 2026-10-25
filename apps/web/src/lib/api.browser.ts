'use client';

import { ApiClient } from './api-client';
import { publicEnv } from './env';

/**
 * Browser-side API client for mutations and interactive queries.
 *
 * `credentials: 'include'` is required so the admin session cookies travel with
 * the request. The access token is passed explicitly per call from in-memory
 * state — never read from `localStorage`, which is reachable by any script that
 * manages to run on the page.
 */
export const browserApi = new ApiClient(publicEnv.apiBaseUrl, { credentials: 'include' });

import { createApiApp } from '../dist/bootstrap.js';

/**
 * Vercel entry point.
 *
 * Vercel serves each request from a function rather than a persistent server,
 * so there is no `listen()` here: the configured Express instance underneath
 * Nest is handed the request directly.
 *
 * Two deliberate choices, both the result of things that broke in testing:
 *
 * 1. This file is JavaScript, not TypeScript. Vercel compiles TypeScript
 *    functions with esbuild, which cannot emit `emitDecoratorMetadata` — and
 *    Nest resolves constructor dependencies from exactly that metadata. A
 *    `.ts` entry point here made esbuild re-transpile the application and
 *    every injected dependency failed to resolve. Importing already-compiled
 *    JavaScript keeps the metadata `tsc` emitted during `pnpm build`.
 *
 * 2. The import is from `dist/`, not `src/`, for the same reason: `pnpm build`
 *    has already compiled and type-checked the application by the time this
 *    function is bundled. One build, one artefact.
 *
 * Bootstrapping Nest costs about a second, so the promise is cached in module
 * scope: the first request through a fresh instance pays for it and every
 * later request on that instance does not. `vercel.json` routes every path
 * here, and Express sees the original URL, so `/api/v1/...` reaches the same
 * controllers as it does on a long-lived server.
 *
 * @type {Promise<(req: import('node:http').IncomingMessage, res: import('node:http').ServerResponse) => void> | null}
 */
let instance = null;

async function start() {
  const app = await createApiApp();

  // `listen()` normally does this. Without it the module graph is built but
  // lifecycle hooks — including the database connection — never run.
  await app.init();

  return app.getHttpAdapter().getInstance();
}

/**
 * @param {import('node:http').IncomingMessage} request
 * @param {import('node:http').ServerResponse} response
 */
export default async function handler(request, response) {
  try {
    instance ??= start();
    const express = await instance;
    express(request, response);
  } catch (error) {
    // A failed bootstrap is almost always misconfiguration. Let the next
    // request try again rather than caching a rejected promise forever, and
    // say nothing specific to the caller.
    instance = null;
    console.error('Failed to start the InkVision API:', error);
    response.statusCode = 500;
    response.setHeader('Content-Type', 'application/json');
    response.end(
      JSON.stringify({
        statusCode: 500,
        error: 'INTERNAL_SERVER_ERROR',
        code: 'INTERNAL_ERROR',
        message: 'The service is temporarily unavailable. Please try again.',
        timestamp: new Date().toISOString(),
      }),
    );
  }
}

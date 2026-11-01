import { readFileSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { NestExpressApplication } from '@nestjs/platform-express';

import { createApiApp } from '../../src/bootstrap.js';

/**
 * The Vercel deployment shape.
 *
 * On Vercel there is no `listen()`: the request goes straight into the Express
 * instance underneath Nest after `init()`. This exercises that path, because
 * the two differ in a way that is easy to break — `init()` alone is what runs
 * the lifecycle hooks, the database connection among them, and a refactor that
 * moved setup into the listen path would leave the function serving 500s while
 * every other test still passed.
 */
describe('serverless entry point', () => {
  let app: NestExpressApplication;
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    app = await createApiApp();
    await app.init();

    const express = app.getHttpAdapter().getInstance() as (req: unknown, res: unknown) => void;
    server = createServer((req, res) => express(req, res));
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  }, 60_000);

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await app.close();
  });

  it('serves the liveness probe', async () => {
    const response = await fetch(`${baseUrl}/api/v1/health`);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ status: 'ok' });
  });

  it('reports ready, which proves init() connected the database', async () => {
    const response = await fetch(`${baseUrl}/api/v1/ready`);
    expect(response.status).toBe(200);
  });

  it('still refuses an anonymous admin caller', async () => {
    const response = await fetch(`${baseUrl}/api/v1/admin/enquiries`);
    expect(response.status).toBe(401);
  });

  it('still validates request bodies', async () => {
    const response = await fetch(`${baseUrl}/api/v1/enquiries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    expect(response.status).toBe(400);
  });

  it('answers an unknown route with 404 rather than 500', async () => {
    const response = await fetch(`${baseUrl}/api/v1/nowhere`);
    expect(response.status).toBe(404);
  });

  /**
   * Vercel compiles TypeScript functions with esbuild, which cannot emit the
   * decorator metadata Nest resolves its dependencies from. A `.ts` entry
   * point therefore fails at bootstrap with every injected dependency
   * unresolved. The entry stays JavaScript importing compiled output, and this
   * guards that decision against a well-meaning conversion.
   */
  it('keeps the Vercel entry point as JavaScript importing compiled output', () => {
    const entry = readFileSync(new URL('../../api/index.js', import.meta.url), 'utf8');
    expect(entry).toContain("from '../dist/bootstrap.js'");
  });
});

import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  API,
  createTestHarness,
  resetDatabase,
  seedSiteSettings,
  type TestHarness,
} from './harness.js';

/**
 * Rate limiting, tested with the real guard in place.
 *
 * Every other integration file disables the limiter so its assertions are about
 * behaviour rather than throughput. This file is the exception: it exists
 * precisely to prove the limiter is wired up and tight on the endpoints that
 * matter.
 */
describe('rate limiting', () => {
  let harness: TestHarness;

  beforeAll(async () => {
    harness = await createTestHarness({ rateLimiting: true });
    await resetDatabase(harness.prisma);
    await seedSiteSettings(harness.prisma);
  }, 60_000);

  afterAll(async () => {
    await harness.app.close();
  });

  it('limits repeated enquiry submissions and reports it as 429', async () => {
    const server = harness.app.getHttpServer();
    const statuses: number[] = [];

    // The enquiry endpoint allows five per minute. Each submission carries a
    // different message so the dedupe window is not what stops them.
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const response = await request(server)
        .post(`${API}/enquiries`)
        .send({
          fullName: 'Rate Limit Test',
          workEmail: 'rate@example.com',
          serviceInterest: 'NOT_SURE_YET',
          message: `Submission number ${attempt}, long enough to pass validation checks.`,
          timeline: 'EXPLORING',
          consent: true,
        });

      statuses.push(response.status);
    }

    expect(statuses.filter((status) => status === 429).length).toBeGreaterThan(0);

    const limited = statuses.indexOf(429);
    expect(limited).toBeGreaterThanOrEqual(5);
  });

  it('returns the structured error shape when limiting', async () => {
    const response = await request(harness.app.getHttpServer()).post(`${API}/enquiries`).send({
      fullName: 'Rate Limit Test',
      workEmail: 'rate@example.com',
      serviceInterest: 'NOT_SURE_YET',
      message: 'Another submission that should be refused by the limiter now.',
      timeline: 'EXPLORING',
      consent: true,
    });

    expect(response.status).toBe(429);
    expect(response.body.code).toBe('RATE_LIMITED');
    expect(response.body.message).toMatch(/too many requests/i);
    // No internal detail leaks in a limiter response.
    expect(response.body.stack).toBeUndefined();
  });
});

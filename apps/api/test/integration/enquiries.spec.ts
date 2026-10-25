import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import {
  API,
  createTestHarness,
  resetDatabase,
  seedSiteSettings,
  type TestHarness,
} from './harness.js';

/**
 * The enquiry endpoint is the site's primary conversion path, so these tests
 * check the behaviour the business actually depends on: that a submission is
 * persisted, that a bad one is rejected with usable field errors, and that the
 * anti-abuse measures do not swallow genuine enquiries.
 */
describe('POST /enquiries', () => {
  let harness: TestHarness;

  const validPayload = {
    fullName: 'Adaeze Okonkwo',
    workEmail: 'adaeze@example.com',
    organisationOrRole: 'Director of Operations',
    serviceInterest: 'EXECUTIVE_VISIBILITY',
    message: 'We would like to discuss positioning work ahead of a sector conference next spring.',
    timeline: 'ONE_TO_THREE_MONTHS',
    consent: true,
  };

  beforeAll(async () => {
    harness = await createTestHarness();
  }, 60_000);

  afterAll(async () => {
    await harness.app.close();
  });

  beforeEach(async () => {
    await resetDatabase(harness.prisma);
    await seedSiteSettings(harness.prisma);
  });

  it('persists a valid enquiry and returns a reference', async () => {
    const response = await request(harness.app.getHttpServer())
      .post(`${API}/enquiries`)
      .send(validPayload)
      .expect(201);

    expect(response.body.received).toBe(true);
    expect(response.body.duplicate).toBe(false);
    expect(response.body.reference).toMatch(/^ENQ-[A-Z2-9]{6}$/);

    const stored = await harness.prisma.enquiry.findUnique({
      where: { reference: response.body.reference },
    });

    expect(stored).not.toBeNull();
    expect(stored?.workEmail).toBe('adaeze@example.com');
    expect(stored?.status).toBe('NEW');
    expect(stored?.consentAt).toBeInstanceOf(Date);
  });

  it('records the initial status in the history, so the trail is complete', async () => {
    const response = await request(harness.app.getHttpServer())
      .post(`${API}/enquiries`)
      .send(validPayload)
      .expect(201);

    const enquiry = await harness.prisma.enquiry.findUniqueOrThrow({
      where: { reference: response.body.reference },
      include: { statusHistory: true },
    });

    expect(enquiry.statusHistory).toHaveLength(1);
    expect(enquiry.statusHistory[0]).toMatchObject({ fromStatus: null, toStatus: 'NEW' });
  });

  it('normalises the email address to lower case', async () => {
    const response = await request(harness.app.getHttpServer())
      .post(`${API}/enquiries`)
      .send({ ...validPayload, workEmail: '  Adaeze@EXAMPLE.com  ' })
      .expect(201);

    const stored = await harness.prisma.enquiry.findUniqueOrThrow({
      where: { reference: response.body.reference },
    });
    expect(stored.workEmail).toBe('adaeze@example.com');
  });

  it('stores a pseudonymised client address rather than the raw IP', async () => {
    const response = await request(harness.app.getHttpServer())
      .post(`${API}/enquiries`)
      .set('X-Forwarded-For', '203.0.113.42')
      .send(validPayload)
      .expect(201);

    const stored = await harness.prisma.enquiry.findUniqueOrThrow({
      where: { reference: response.body.reference },
    });

    expect(stored.ipHash).not.toBeNull();
    expect(stored.ipHash).not.toContain('203.0.113.42');
    expect(stored.ipHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('collapses an identical repeat submission instead of duplicating it', async () => {
    const first = await request(harness.app.getHttpServer())
      .post(`${API}/enquiries`)
      .send(validPayload)
      .expect(201);

    const second = await request(harness.app.getHttpServer())
      .post(`${API}/enquiries`)
      .send(validPayload)
      .expect(201);

    expect(second.body.duplicate).toBe(true);
    expect(second.body.reference).toBe(first.body.reference);
    expect(await harness.prisma.enquiry.count()).toBe(1);
  });

  it('treats a different message from the same person as a new enquiry', async () => {
    await request(harness.app.getHttpServer())
      .post(`${API}/enquiries`)
      .send(validPayload)
      .expect(201);
    await request(harness.app.getHttpServer())
      .post(`${API}/enquiries`)
      .send({ ...validPayload, message: 'A separate question about a keynote in the autumn.' })
      .expect(201);

    expect(await harness.prisma.enquiry.count()).toBe(2);
  });

  it('reports every validation failure at once, keyed by field', async () => {
    const response = await request(harness.app.getHttpServer())
      .post(`${API}/enquiries`)
      .send({
        fullName: 'X',
        workEmail: 'not-an-email',
        serviceInterest: 'NOT_A_SERVICE',
        message: 'too short',
        timeline: 'EXPLORING',
        consent: false,
      })
      .expect(400);

    expect(response.body.code).toBe('VALIDATION_FAILED');
    expect(Object.keys(response.body.details)).toEqual(
      expect.arrayContaining(['fullName', 'workEmail', 'serviceInterest', 'message', 'consent']),
    );
  });

  it('refuses a submission without consent', async () => {
    const response = await request(harness.app.getHttpServer())
      .post(`${API}/enquiries`)
      .send({ ...validPayload, consent: false })
      .expect(400);

    expect(response.body.details.consent).toBeDefined();
    expect(await harness.prisma.enquiry.count()).toBe(0);
  });

  it('rejects unknown properties rather than silently dropping them', async () => {
    await request(harness.app.getHttpServer())
      .post(`${API}/enquiries`)
      .send({ ...validPayload, isAdmin: true })
      .expect(400);
  });

  it('silently discards a honeypot submission while reporting success', async () => {
    const response = await request(harness.app.getHttpServer())
      .post(`${API}/enquiries`)
      .send({ ...validPayload, website: 'http://spam.example' })
      .expect(201);

    // The bot is told nothing useful, and nothing reaches the database.
    expect(response.body.received).toBe(true);
    expect(await harness.prisma.enquiry.count()).toBe(0);
  });

  it('never echoes stored data back to the public caller', async () => {
    const response = await request(harness.app.getHttpServer())
      .post(`${API}/enquiries`)
      .send(validPayload)
      .expect(201);

    expect(Object.keys(response.body).sort()).toEqual([
      'duplicate',
      'message',
      'received',
      'reference',
    ]);
  });
});

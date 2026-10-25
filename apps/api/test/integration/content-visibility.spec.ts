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
 * Draft content must never reach the public API. This is the single most
 * consequential content rule in the system — an unpublished case study can
 * contain confidential client material — so it is tested directly against the
 * database rather than inferred from the admin UI.
 */
describe('public content visibility', () => {
  let harness: TestHarness;

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

  async function createArticle(overrides: Record<string, unknown>) {
    return harness.prisma.article.create({
      data: {
        slug: `article-${Math.random().toString(36).slice(2, 10)}`,
        title: 'A title',
        summary: 'A summary long enough to be meaningful for the listing.',
        bodyHtml: '<p>Body</p>',
        bodyText: 'Body',
        ...overrides,
      },
    });
  }

  it('excludes draft articles from the public listing', async () => {
    await createArticle({ status: 'DRAFT' });

    const response = await request(harness.app.getHttpServer()).get(`${API}/articles`).expect(200);
    expect(response.body.data).toHaveLength(0);
    expect(response.body.meta.total).toBe(0);
  });

  it('excludes archived articles', async () => {
    await createArticle({ status: 'ARCHIVED', publishedAt: new Date('2020-01-01') });

    const response = await request(harness.app.getHttpServer()).get(`${API}/articles`).expect(200);
    expect(response.body.data).toHaveLength(0);
  });

  it('includes published articles', async () => {
    const article = await createArticle({
      status: 'PUBLISHED',
      publishedAt: new Date('2024-01-01'),
    });

    const response = await request(harness.app.getHttpServer()).get(`${API}/articles`).expect(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].slug).toBe(article.slug);
  });

  it('hides an article scheduled for the future', async () => {
    await createArticle({
      status: 'SCHEDULED',
      publishedAt: new Date(Date.now() + 86_400_000),
    });

    const response = await request(harness.app.getHttpServer()).get(`${API}/articles`).expect(200);
    expect(response.body.data).toHaveLength(0);
  });

  it('reveals a scheduled article once its moment has passed', async () => {
    await createArticle({
      status: 'SCHEDULED',
      publishedAt: new Date(Date.now() - 60_000),
    });

    const response = await request(harness.app.getHttpServer()).get(`${API}/articles`).expect(200);
    expect(response.body.data).toHaveLength(1);
  });

  it('returns 404 for a draft article fetched directly by slug', async () => {
    const article = await createArticle({ status: 'DRAFT' });

    const response = await request(harness.app.getHttpServer())
      .get(`${API}/articles/${article.slug}`)
      .expect(404);

    expect(response.body.code).toBe('NOT_FOUND');
  });

  it('withholds the client name on a case study without approval', async () => {
    const caseStudy = await harness.prisma.caseStudy.create({
      data: {
        slug: 'confidential-work',
        title: 'Confidential work',
        summary: 'A summary of a piece of commissioned work for a named client.',
        kind: 'COMMISSIONED',
        clientName: 'Meridian Group',
        clientApproved: false,
        status: 'PUBLISHED',
        publishedAt: new Date(),
        challengeHtml: '<p>Challenge</p>',
        challengeText: 'Challenge',
        objectiveHtml: '<p>Objective</p>',
        objectiveText: 'Objective',
        researchApproachHtml: '<p>Research</p>',
        researchApproachText: 'Research',
        editorialApproachHtml: '<p>Editorial</p>',
        editorialApproachText: 'Editorial',
      },
    });

    const response = await request(harness.app.getHttpServer())
      .get(`${API}/case-studies/${caseStudy.slug}`)
      .expect(200);

    expect(response.body.clientName).toBeNull();
    expect(JSON.stringify(response.body)).not.toContain('Meridian Group');
  });

  it('withholds unverified outcomes', async () => {
    await harness.prisma.caseStudy.create({
      data: {
        slug: 'sample-work',
        title: 'Sample work',
        summary: 'A sample created to demonstrate approach and editorial standard.',
        kind: 'SAMPLE',
        outcomes: ['Tripled inbound enquiries'],
        outcomesVerified: false,
        status: 'PUBLISHED',
        publishedAt: new Date(),
        challengeHtml: '<p>Challenge</p>',
        challengeText: 'Challenge',
        objectiveHtml: '<p>Objective</p>',
        objectiveText: 'Objective',
        researchApproachHtml: '<p>Research</p>',
        researchApproachText: 'Research',
        editorialApproachHtml: '<p>Editorial</p>',
        editorialApproachText: 'Editorial',
      },
    });

    const response = await request(harness.app.getHttpServer())
      .get(`${API}/case-studies/sample-work`)
      .expect(200);

    expect(response.body.outcomes).toEqual([]);
    expect(JSON.stringify(response.body)).not.toContain('Tripled');
  });

  it('hides a draft product from the public catalogue', async () => {
    await harness.prisma.product.create({
      data: {
        slug: 'draft-product',
        title: 'Draft product',
        summary: 'A product that has not been published yet, with a long enough summary.',
        descriptionHtml: '<p>Description</p>',
        descriptionText: 'Description',
        intendedAudience: 'Nobody yet, this is a draft.',
        status: 'DRAFT',
      },
    });

    const response = await request(harness.app.getHttpServer()).get(`${API}/products`).expect(200);
    expect(response.body).toHaveLength(0);
  });

  it('never reports a product as purchasable while commerce is disabled', async () => {
    await harness.prisma.product.create({
      data: {
        slug: 'ready-product',
        title: 'Ready product',
        summary: 'A fully configured product, priced and ready for sale once enabled.',
        descriptionHtml: '<p>Description</p>',
        descriptionText: 'Description',
        intendedAudience: 'Corporate professionals who want a structured approach.',
        priceAmountMinor: 950_000,
        currency: 'NGN',
        refundTerms: 'Fourteen days.',
        status: 'ACTIVE',
      },
    });

    const response = await request(harness.app.getHttpServer()).get(`${API}/products`).expect(200);
    expect(response.body[0].purchasable).toBe(false);
  });

  it('returns only approved, published testimonials', async () => {
    await harness.prisma.testimonial.createMany({
      data: [
        {
          quote: 'Approved and published.',
          attributionName: 'A Person',
          isApproved: true,
          status: 'PUBLISHED',
          publishedAt: new Date(),
        },
        {
          quote: 'Published but never approved.',
          attributionName: 'B Person',
          isApproved: false,
          status: 'PUBLISHED',
          publishedAt: new Date(),
        },
        {
          quote: 'Approved but still a draft.',
          attributionName: 'C Person',
          isApproved: true,
          status: 'DRAFT',
        },
      ],
    });

    const response = await request(harness.app.getHttpServer())
      .get(`${API}/testimonials`)
      .expect(200);

    expect(response.body).toHaveLength(1);
    expect(response.body[0].quote).toBe('Approved and published.');
  });
});

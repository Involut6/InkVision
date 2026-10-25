/**
 * Development seed.
 *
 * Idempotent: every write is an upsert keyed on a natural unique column, so
 * running it repeatedly converges on the same state rather than duplicating
 * rows.
 *
 * What this seed deliberately does NOT do:
 *   * It creates no administrator account and no password. The initial operator
 *     is created with `pnpm admin:create`, which generates a credential the
 *     operator sets themselves. Nothing in source control is ever a usable
 *     credential.
 *   * It invents no client names, testimonials, logos, statistics or outcomes.
 *   * It publishes nothing that is not genuinely ready: articles are DRAFT, the
 *     product is COMING_SOON with no price, and the legal pages are flagged as
 *     awaiting review.
 */
import { PrismaPg } from '@prisma/adapter-pg';
import process from 'node:process';

import { PrismaClient } from '../src/generated/prisma/client.js';
import {
  htmlToPlainText,
  prepareRichText,
  estimateReadingTimeMinutes,
} from '../src/common/utils/rich-text.js';
import { randomToken } from '../src/common/utils/crypto.js';
import { SERVICE_SEEDS } from './seed-data/services.js';
import {
  APPROACH_STAGES,
  ARTICLE_CATEGORIES,
  ARTICLE_DRAFTS,
  FAQ_GROUPS,
  LEGAL_PAGES,
  PRODUCT_SEED,
} from './seed-data/content.js';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('DATABASE_URL is not set. Copy .env.example to .env and try again.');
  process.exit(1);
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function seedSiteSettings(): Promise<void> {
  const supportingStatement =
    'Executive visibility, thought leadership and strategic communications for people and organisations with something valuable to say.';

  await prisma.siteSettings.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      siteName: 'InkVision Creatives',
      tagline: 'Make your expertise visible.',
      supportingStatement,
      // Contact details are left unset: the business supplies its real ones.
      // The website renders the enquiry form regardless.
      contactEmail: null,
      contactPhone: null,
      addressLines: [],
      socialProfiles: [],
      newsletterEnabled: true,
      newsletterHeadline: 'Insights on executive visibility',
      newsletterBody:
        'Occasional, considered writing on positioning, thought leadership and communicating expertise. No more often than we have something worth your time.',
      defaultSeoTitle: 'InkVision Creatives — Make your expertise visible.',
      defaultSeoDescription: supportingStatement,
      legalEntityName: null,
    },
    update: { tagline: 'Make your expertise visible.', supportingStatement },
  });

  console.log('  ✓ site settings');
}

async function seedServices(): Promise<void> {
  for (const seed of SERVICE_SEEDS) {
    const problem = prepareRichText(seed.problemHtml);
    const approach = prepareRichText(seed.approachHtml);

    const service = await prisma.service.upsert({
      where: { slug: seed.slug },
      create: {
        slug: seed.slug,
        title: seed.title,
        tagline: seed.tagline,
        businessNeed: seed.businessNeed,
        audience: seed.audience,
        problemHtml: problem.html,
        problemText: problem.text,
        approachHtml: approach.html,
        approachText: approach.text,
        deliverables: seed.deliverables,
        ctaHeadline: seed.ctaHeadline,
        ctaBody: seed.ctaBody,
        icon: seed.icon,
        seoTitle: seed.seoTitle,
        seoDescription: seed.seoDescription,
        status: 'PUBLISHED',
        position: seed.position,
      },
      update: {
        title: seed.title,
        tagline: seed.tagline,
        businessNeed: seed.businessNeed,
        audience: seed.audience,
        problemHtml: problem.html,
        problemText: problem.text,
        approachHtml: approach.html,
        approachText: approach.text,
        deliverables: seed.deliverables,
        ctaHeadline: seed.ctaHeadline,
        ctaBody: seed.ctaBody,
        icon: seed.icon,
        seoTitle: seed.seoTitle,
        seoDescription: seed.seoDescription,
        position: seed.position,
      },
    });

    // Ordered child collections are replaced wholesale so the seed converges
    // rather than accumulating duplicates on a second run.
    await prisma.$transaction([
      prisma.serviceComponent.deleteMany({ where: { serviceId: service.id } }),
      prisma.serviceProcessStage.deleteMany({ where: { serviceId: service.id } }),
      prisma.faqItem.deleteMany({ where: { serviceId: service.id } }),
    ]);

    await prisma.$transaction([
      prisma.serviceComponent.createMany({
        data: seed.components.map((component, index) => ({
          serviceId: service.id,
          title: component.title,
          description: component.description,
          position: index,
        })),
      }),
      prisma.serviceProcessStage.createMany({
        data: seed.processStages.map((stage, index) => ({
          serviceId: service.id,
          title: stage.title,
          summary: stage.summary,
          detail: stage.detail,
          position: index,
        })),
      }),
      prisma.faqItem.createMany({
        data: seed.faqs.map((faq, index) => ({
          serviceId: service.id,
          question: faq.question,
          answer: faq.answer,
          position: index,
        })),
      }),
    ]);
  }

  console.log(`  ✓ ${SERVICE_SEEDS.length} services (published)`);
}

async function seedApproach(): Promise<void> {
  for (const stage of APPROACH_STAGES) {
    const detail = prepareRichText(stage.detailHtml);

    await prisma.approachStage.upsert({
      where: { slug: stage.slug },
      create: {
        slug: stage.slug,
        position: stage.position,
        title: stage.title,
        summary: stage.summary,
        detailHtml: detail.html,
        detailText: detail.text,
        clientRole: stage.clientRole,
      },
      update: {
        position: stage.position,
        title: stage.title,
        summary: stage.summary,
        detailHtml: detail.html,
        detailText: detail.text,
        clientRole: stage.clientRole,
      },
    });
  }

  console.log(`  ✓ ${APPROACH_STAGES.length} approach stages`);
}

async function seedAuthorAndArticles(): Promise<void> {
  /**
   * A single studio author record. The founder's name and biography are not
   * invented here — the brief supplies positioning but not an approved
   * personal biography, so the record carries the studio byline and the About
   * page notes what the business still needs to provide.
   */
  const author = await prisma.author.upsert({
    where: { slug: 'inkvision-creatives' },
    create: {
      slug: 'inkvision-creatives',
      name: 'InkVision Creatives',
      role: 'Editorial team',
      bio: 'Writing on executive visibility, thought leadership and strategic communications.',
    },
    update: {},
  });

  for (const category of ARTICLE_CATEGORIES) {
    await prisma.articleCategory.upsert({
      where: { slug: category.slug },
      create: category,
      update: {
        name: category.name,
        description: category.description,
        position: category.position,
      },
    });
  }

  for (const seed of ARTICLE_DRAFTS) {
    const body = prepareRichText(seed.bodyHtml);
    const category = await prisma.articleCategory.findUnique({
      where: { slug: seed.categorySlug },
    });

    const article = await prisma.article.upsert({
      where: { slug: seed.slug },
      create: {
        slug: seed.slug,
        title: seed.title,
        summary: seed.summary,
        bodyHtml: body.html,
        bodyText: body.text,
        readingTimeMinutes: estimateReadingTimeMinutes(body.text),
        categoryId: category?.id ?? null,
        authorId: author.id,
        // DRAFT, deliberately: these are commissioning briefs, not finished
        // articles, and the public site must not present them as published.
        status: 'DRAFT',
      },
      update: {
        title: seed.title,
        summary: seed.summary,
        bodyHtml: body.html,
        bodyText: body.text,
        readingTimeMinutes: estimateReadingTimeMinutes(body.text),
        categoryId: category?.id ?? null,
      },
    });

    for (const tagName of seed.tags) {
      const slug = tagName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const tag = await prisma.tag.upsert({
        where: { slug },
        create: { slug, name: tagName },
        update: {},
      });
      await prisma.articleTag.upsert({
        where: { articleId_tagId: { articleId: article.id, tagId: tag.id } },
        create: { articleId: article.id, tagId: tag.id },
        update: {},
      });
    }
  }

  console.log(
    `  ✓ ${ARTICLE_CATEGORIES.length} article categories, ${ARTICLE_DRAFTS.length} article drafts (none published)`,
  );
}

async function seedPortfolioCategories(): Promise<void> {
  /**
   * Categories only. No case studies are seeded: the brief supplies no
   * completed, approved work, and inventing a portfolio is exactly what the
   * content rules forbid. The website renders a considered empty state, and the
   * admin portal is where real entries get added.
   */
  const categories = [
    {
      slug: 'executive-positioning',
      name: 'Executive positioning',
      description: 'Positioning, profiles and professional presence work.',
      position: 1,
    },
    {
      slug: 'thought-leadership',
      name: 'Thought leadership',
      description: 'Articles, essays and long-form argument developed with clients.',
      position: 2,
    },
    {
      slug: 'organisational-communications',
      name: 'Organisational communications',
      description: 'Content strategy, message architecture and editorial systems.',
      position: 3,
    },
    {
      slug: 'executive-communications',
      name: 'Executive communications',
      description: 'Keynotes, board papers and high-stakes announcements.',
      position: 4,
    },
  ];

  for (const category of categories) {
    await prisma.portfolioCategory.upsert({
      where: { slug: category.slug },
      create: category,
      update: {
        name: category.name,
        description: category.description,
        position: category.position,
      },
    });
  }

  console.log(`  ✓ ${categories.length} portfolio categories (no case studies — none supplied)`);
}

async function seedFaqs(): Promise<void> {
  for (const group of FAQ_GROUPS) {
    const record = await prisma.faqGroup.upsert({
      where: { slug: group.slug },
      create: { slug: group.slug, title: group.title, position: group.position },
      update: { title: group.title, position: group.position },
    });

    await prisma.faqItem.deleteMany({ where: { groupId: record.id } });
    await prisma.faqItem.createMany({
      data: group.items.map((item, index) => ({
        groupId: record.id,
        question: item.question,
        answer: item.answer,
        position: index,
      })),
    });
  }

  const total = FAQ_GROUPS.reduce((sum, group) => sum + group.items.length, 0);
  console.log(`  ✓ ${FAQ_GROUPS.length} FAQ groups, ${total} entries`);
}

async function seedProduct(): Promise<void> {
  const description = prepareRichText(PRODUCT_SEED.descriptionHtml);

  await prisma.product.upsert({
    where: { slug: PRODUCT_SEED.slug },
    create: {
      slug: PRODUCT_SEED.slug,
      title: PRODUCT_SEED.title,
      subtitle: PRODUCT_SEED.subtitle,
      summary: PRODUCT_SEED.summary,
      descriptionHtml: description.html,
      descriptionText: description.text,
      intendedAudience: PRODUCT_SEED.intendedAudience,
      benefits: [...PRODUCT_SEED.benefits],
      contents: [...PRODUCT_SEED.contents],
      // No price, no currency, no file, no refund terms — none were supplied.
      // The API's purchasability rule therefore reports it as not buyable, which
      // is the truth rather than a placeholder.
      priceAmountMinor: null,
      currency: null,
      fileFormat: PRODUCT_SEED.fileFormat,
      deliveryMethod: PRODUCT_SEED.deliveryMethod,
      refundTerms: null,
      seoTitle: PRODUCT_SEED.seoTitle,
      seoDescription: PRODUCT_SEED.seoDescription,
      status: 'COMING_SOON',
      featured: true,
      position: 1,
    },
    update: {
      title: PRODUCT_SEED.title,
      subtitle: PRODUCT_SEED.subtitle,
      summary: PRODUCT_SEED.summary,
      descriptionHtml: description.html,
      descriptionText: description.text,
      intendedAudience: PRODUCT_SEED.intendedAudience,
      benefits: [...PRODUCT_SEED.benefits],
      contents: [...PRODUCT_SEED.contents],
    },
  });

  console.log('  ✓ 1 resource (COMING_SOON — no price or file supplied, so not purchasable)');
}

async function seedLegalPages(): Promise<void> {
  for (const page of LEGAL_PAGES) {
    const body = prepareRichText(page.bodyHtml);

    await prisma.legalPage.upsert({
      where: { slug: page.slug },
      create: {
        slug: page.slug,
        title: page.title,
        bodyHtml: body.html,
        bodyText: htmlToPlainText(body.html),
        status: 'PUBLISHED',
        // Flagged so the website renders a visible "awaiting review" notice.
        awaitingReview: true,
      },
      update: { title: page.title, bodyHtml: body.html, bodyText: htmlToPlainText(body.html) },
    });
  }

  console.log(`  ✓ ${LEGAL_PAGES.length} legal page templates (all flagged as awaiting review)`);
}

async function seedNewsletterPlaceholderCheck(): Promise<void> {
  // Nothing is seeded into the subscriber table: it would mean storing an
  // address nobody consented to. The token helper is referenced here only so
  // the import stays meaningful for anyone extending the seed.
  void randomToken;
  console.log('  ✓ newsletter subscribers: none seeded (no consent on record)');
}

async function main(): Promise<void> {
  console.log('\nSeeding InkVision Creatives development data\n');

  await seedSiteSettings();
  await seedServices();
  await seedApproach();
  await seedAuthorAndArticles();
  await seedPortfolioCategories();
  await seedFaqs();
  await seedProduct();
  await seedLegalPages();
  await seedNewsletterPlaceholderCheck();

  console.log('\nSeed complete.\n');
  console.log('Deliberately NOT seeded, and why:');
  console.log(
    '  • Administrator account — run `pnpm admin:create` so the password is never in source.',
  );
  console.log('  • Case studies — no completed, client-approved work was supplied.');
  console.log('  • Testimonials — none have been confirmed as authorised for publication.');
  console.log(
    '  • Product price, file and refund terms — not supplied, so the resource is not purchasable.',
  );
  console.log(
    '  • Published articles — the drafts are commissioning briefs, not finished pieces.\n',
  );
}

main()
  .catch((error: unknown) => {
    console.error('\nSeed failed:\n', error);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });

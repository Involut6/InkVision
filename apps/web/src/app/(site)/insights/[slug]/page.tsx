import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { InsightCard } from '@/components/content/insight-card';
import { CardGrid, Section } from '@/components/home/section';
import { JsonLd } from '@/components/json-ld';
import { Breadcrumbs } from '@/components/site/breadcrumbs';
import { ClosingCta } from '@/components/site/closing-cta';
import { NewsletterForm } from '@/components/site/newsletter-form';
import { Badge } from '@/components/ui/badge';
import { RichText } from '@/components/ui/rich-text';
import { Display, Eyebrow, GoldRule, Lead, Meta, SectionHeader } from '@/components/ui/typography';
import { getArticle, getArticles, getSiteSettings } from '@/lib/content';
import { buildMetadata, articleJsonLd } from '@/lib/metadata';
import { formatDate, isoDate, readingTime } from '@/lib/utils';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const articles = await getArticles({ perPage: 50 });
  return articles.data.map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const [article, settings] = await Promise.all([getArticle(slug), getSiteSettings()]);

  if (!article) {
    return { title: 'Article not found', robots: { index: false, follow: false } };
  }

  return buildMetadata({
    title: article.seoTitle ?? article.title,
    description: article.seoDescription ?? article.summary,
    path: `/insights/${article.slug}`,
    settings,
    image: article.ogImage ?? article.featuredImage,
    type: 'article',
    publishedTime: article.publishedAt,
    modifiedTime: article.updatedAt,
    authors: article.author ? [article.author.name] : undefined,
    noIndex: article.noIndex ?? false,
  });
}

export default async function ArticlePage({ params }: PageProps) {
  const { slug } = await params;
  const [article, settings] = await Promise.all([getArticle(slug), getSiteSettings()]);

  if (!article) notFound();

  return (
    <>
      <article>
        <header className="border-border-subtle border-b">
          <div className="page-shell py-12 sm:py-16 lg:py-20">
            <Breadcrumbs
              trail={[
                { label: 'Insights', href: '/insights' },
                { label: article.title, href: `/insights/${article.slug}` },
              ]}
              className="mb-8"
            />

            <div className="max-w-measure-wide flex flex-col gap-5">
              <GoldRule />

              {article.category ? (
                <Eyebrow>
                  <Link
                    href={`/insights?category=${article.category.slug}`}
                    className="hover:text-brand underline-offset-4 hover:underline"
                  >
                    {article.category.name}
                  </Link>
                </Eyebrow>
              ) : null}

              <Display as="h1" className="text-h1">
                {article.title}
              </Display>

              <Lead>{article.summary}</Lead>

              {/* Attribution and dates, as required for editorial credibility. */}
              <div className="border-border-subtle flex flex-wrap items-center gap-x-3 gap-y-1 border-t pt-5">
                {article.author ? (
                  <Meta className="text-content-primary font-sans font-semibold">
                    {article.author.name}
                    {article.author.role ? (
                      <span className="text-content-muted font-normal">
                        {' '}
                        · {article.author.role}
                      </span>
                    ) : null}
                  </Meta>
                ) : null}

                {article.publishedAt ? (
                  <Meta>
                    <time dateTime={isoDate(article.publishedAt)}>
                      {formatDate(article.publishedAt)}
                    </time>
                  </Meta>
                ) : null}

                <Meta aria-hidden="true">·</Meta>
                <Meta>{readingTime(article.readingTimeMinutes)}</Meta>

                {/* Shown only where it differs meaningfully from publication,
                    so a reader knows the piece has been revised. */}
                {article.publishedAt &&
                article.updatedAt &&
                new Date(article.updatedAt).getTime() - new Date(article.publishedAt).getTime() >
                  86_400_000 ? (
                  <>
                    <Meta aria-hidden="true">·</Meta>
                    <Meta>
                      Updated{' '}
                      <time dateTime={isoDate(article.updatedAt)}>
                        {formatDate(article.updatedAt)}
                      </time>
                    </Meta>
                  </>
                ) : null}
              </div>

              {article.tags.length > 0 ? (
                <ul className="flex flex-wrap gap-2">
                  {article.tags.map((tag) => (
                    <li key={tag.id}>
                      <Link href={`/insights?tag=${tag.slug}`}>
                        <Badge tone="neutral">{tag.name}</Badge>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>
        </header>

        <div className="page-shell py-12 lg:py-16">
          <RichText html={article.body.html} />
        </div>
      </article>

      {article.relatedArticles.length > 0 ? (
        <Section tone="sunken" labelledBy="related-heading">
          <SectionHeader
            eyebrow="Related reading"
            heading={<span id="related-heading">More on this</span>}
          />
          <CardGrid className="mt-10">
            {article.relatedArticles.map((related) => (
              <InsightCard key={related.id} article={related} />
            ))}
          </CardGrid>
        </Section>
      ) : null}

      {settings.newsletterEnabled ? (
        <Section labelledBy="article-newsletter-heading">
          <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
            <SectionHeader
              eyebrow="Stay in touch"
              heading={<span id="article-newsletter-heading">{settings.newsletterHeadline}</span>}
              lead={settings.newsletterBody}
            />
            <div className="lg:pt-6">
              <NewsletterForm source="article" />
            </div>
          </div>
        </Section>
      ) : null}

      <ClosingCta />

      <JsonLd
        data={articleJsonLd({
          title: article.title,
          description: article.summary,
          path: `/insights/${article.slug}`,
          publishedAt: article.publishedAt,
          updatedAt: article.updatedAt,
          authorName: article.author?.name ?? settings.siteName,
          image: article.featuredImage,
          siteName: settings.siteName,
        })}
      />
    </>
  );
}

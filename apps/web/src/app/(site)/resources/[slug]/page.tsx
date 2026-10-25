import { Check, FileText } from 'lucide-react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { PurchasePanel } from '@/components/content/purchase-panel';
import { Section } from '@/components/home/section';
import { JsonLd } from '@/components/json-ld';
import { ClosingCta } from '@/components/site/closing-cta';
import { PageHeader } from '@/components/site/page-header';
import { RichText } from '@/components/ui/rich-text';
import { Heading, Meta, SectionHeader } from '@/components/ui/typography';
import { getProduct, getProducts, getSiteSettings } from '@/lib/content';
import { absoluteUrl } from '@/lib/env';
import { buildMetadata } from '@/lib/metadata';
import { formatFileSize } from '@/lib/utils';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const products = await getProducts();
  return products.map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const [product, settings] = await Promise.all([getProduct(slug), getSiteSettings()]);

  if (!product) {
    return { title: 'Resource not found', robots: { index: false, follow: false } };
  }

  return buildMetadata({
    title: product.seoTitle ?? product.title,
    description: product.seoDescription ?? product.summary,
    path: `/resources/${product.slug}`,
    settings,
    image: product.coverImage,
    noIndex: product.noIndex ?? false,
  });
}

export default async function ProductPage({ params }: PageProps) {
  const { slug } = await params;
  const product = await getProduct(slug);

  if (!product) notFound();

  const specifications = [
    product.fileFormat ? { label: 'Format', value: product.fileFormat } : null,
    product.pageCount ? { label: 'Length', value: `${product.pageCount} pages` } : null,
    product.fileSizeBytes
      ? { label: 'File size', value: formatFileSize(product.fileSizeBytes) }
      : null,
    { label: 'Delivery', value: product.deliveryMethod },
  ].filter((entry): entry is { label: string; value: string } => entry !== null);

  return (
    <>
      <PageHeader
        eyebrow="Resource"
        title={product.title}
        lead={product.subtitle ?? product.summary}
        trail={[
          { label: 'Resources', href: '/resources' },
          { label: product.title, href: `/resources/${product.slug}` },
        ]}
      />

      <Section labelledBy="about-resource-heading">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)] lg:gap-16">
          <div className="flex flex-col gap-10">
            <div>
              <SectionHeader
                eyebrow="About this resource"
                heading={<span id="about-resource-heading">What it is</span>}
              />
              <RichText html={product.description.html} className="mt-6" />
            </div>

            <div>
              <Heading level={3} as="h2" className="text-[1.0625rem]">
                Who it is for
              </Heading>
              <p className="max-w-measure-wide text-content-secondary mt-3 text-[0.9375rem] leading-relaxed">
                {product.intendedAudience}
              </p>
            </div>

            {product.benefits.length > 0 ? (
              <div>
                <Heading level={3} as="h2" className="text-[1.0625rem]">
                  What you will come away with
                </Heading>
                <ul className="mt-4 flex flex-col gap-3">
                  {product.benefits.map((benefit) => (
                    <li key={benefit} className="border-border-subtle flex gap-3 border-t pt-3">
                      <Check aria-hidden="true" className="text-accent mt-0.5 size-4 shrink-0" />
                      <span className="text-content-secondary text-[0.9375rem] leading-relaxed">
                        {benefit}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {product.contents.length > 0 ? (
              <div>
                <Heading level={3} as="h2" className="text-[1.0625rem]">
                  What is inside
                </Heading>
                <ol className="mt-4 flex flex-col gap-2.5">
                  {product.contents.map((item, index) => (
                    <li key={item} className="border-border-subtle flex gap-3 border-t pt-2.5">
                      <span
                        aria-hidden="true"
                        className="tabular text-meta text-accent shrink-0 font-sans font-semibold"
                      >
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <span className="text-content-secondary text-[0.9375rem] leading-relaxed">
                        {item}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}
          </div>

          <div className="flex flex-col gap-8 lg:sticky lg:top-28 lg:self-start">
            <PurchasePanel product={product} />

            <dl className="flex flex-col gap-3">
              {specifications.map((spec) => (
                <div
                  key={spec.label}
                  className="border-border-subtle flex items-start justify-between gap-4 border-t pt-3"
                >
                  <dt>
                    <Meta className="font-sans text-[0.6875rem] font-semibold tracking-[0.12em] uppercase">
                      {spec.label}
                    </Meta>
                  </dt>
                  <dd className="text-content-secondary text-right text-sm">{spec.value}</dd>
                </div>
              ))}
            </dl>

            {product.previewImages.length > 0 ? (
              <div>
                <Meta className="font-sans text-[0.6875rem] font-semibold tracking-[0.12em] uppercase">
                  Preview
                </Meta>
                <ul className="mt-3 grid grid-cols-2 gap-3">
                  {product.previewImages.map((image) => (
                    <li key={image.url}>
                      {/* Plain img: these come from the API's media route at an
                          unknown host, which next/image would need configured. */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={image.url}
                        alt={image.alt}
                        width={image.width}
                        height={image.height}
                        loading="lazy"
                        className="ring-border-subtle w-full ring-1"
                      />
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </div>
      </Section>

      {product.refundTerms || product.updatePolicy ? (
        <Section tone="sunken" labelledBy="terms-heading">
          <SectionHeader eyebrow="Terms" heading={<span id="terms-heading">Before you buy</span>} />

          <div className="mt-10 grid gap-10 lg:grid-cols-2 lg:gap-16">
            {product.refundTerms ? (
              <div>
                <Heading level={3} as="h3" className="text-[1.0625rem]">
                  Refunds
                </Heading>
                <p className="max-w-measure text-content-secondary mt-3 text-sm leading-relaxed">
                  {product.refundTerms}
                </p>
              </div>
            ) : null}

            {product.updatePolicy ? (
              <div>
                <Heading level={3} as="h3" className="text-[1.0625rem]">
                  Updates
                </Heading>
                <p className="max-w-measure text-content-secondary mt-3 text-sm leading-relaxed">
                  {product.updatePolicy}
                </p>
              </div>
            ) : null}
          </div>
        </Section>
      ) : (
        // Said plainly rather than left blank: terms must exist before a sale.
        <Section tone="sunken">
          <div className="border-border-accent flex items-start gap-3 border-l-2 pl-6">
            <FileText aria-hidden="true" className="text-accent mt-1 size-4 shrink-0" />
            <p className="max-w-measure-wide text-content-secondary text-sm leading-relaxed">
              Refund terms for this resource have not been published yet. They will appear here, in
              full, before it is offered for sale — we will not take payment for a resource whose
              terms have not been set.
            </p>
          </div>
        </Section>
      )}

      <ClosingCta
        headline="Would an engagement serve you better?"
        body="A workbook is the right tool for some situations and the wrong one for others. If yours needs judgement rather than a framework, tell us about it."
        actionLabel="Discuss your goals"
      />

      {/* Product structured data. `offers` is emitted only for a product that
          is genuinely purchasable — advertising a price for something that
          cannot be bought is a false claim to a search engine. */}
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'Product',
          name: product.title,
          description: product.summary,
          url: absoluteUrl(`/resources/${product.slug}`),
          ...(product.coverImage ? { image: [product.coverImage.url] } : {}),
          brand: { '@type': 'Brand', name: 'InkVision Creatives' },
          ...(product.purchasable && product.price
            ? {
                offers: {
                  '@type': 'Offer',
                  price: (product.price.amountMinor / 100).toFixed(2),
                  priceCurrency: product.price.currency,
                  availability: 'https://schema.org/InStock',
                  url: absoluteUrl(`/resources/${product.slug}`),
                },
              }
            : {}),
        }}
      />
    </>
  );
}

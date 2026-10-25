import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Display, Eyebrow, GoldRule, Meta } from '@/components/ui/typography';

import { AnnotatedDraft } from './annotated-draft';

/**
 * The homepage hero.
 *
 * Deliberately asymmetric: the headline occupies the wider column and the
 * annotated draft sits beside it, slightly offset, so the composition reads as
 * an editorial spread rather than a centred marketing banner.
 */
export function Hero() {
  return (
    <section className="border-border-subtle bg-surface relative overflow-hidden border-b">
      {/* A single very faint royal wash, not a gradient-heavy background. */}
      <div
        aria-hidden="true"
        className="bg-royal-50 pointer-events-none absolute -top-40 -right-40 size-[34rem] rounded-full opacity-70 blur-3xl"
      />

      <div className="page-shell relative py-16 sm:py-20 lg:py-28">
        <div className="grid items-start gap-12 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-16">
          <div className="flex flex-col gap-7">
            <div className="flex flex-col gap-4">
              <GoldRule />
              <Eyebrow>Executive visibility &amp; strategic communications</Eyebrow>
            </div>

            <Display>Make your expertise visible.</Display>

            <p className="text-lead text-content-secondary max-w-[34rem]">
              You have built the experience, developed the ideas and done the work. InkVision
              Creatives helps executives, founders and organisations communicate that expertise with
              a clear point of view, thoughtful content and a public presence that earns attention
              for the right reasons.
            </p>

            <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center">
              <Button asChild size="lg">
                <Link href="/contact">Discuss your goals</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/services">Explore our services</Link>
              </Button>
            </div>

            <Meta className="max-w-[30rem] pt-2">
              Strategy-led. Voice-conscious. Built around what you want to be known for.
            </Meta>
          </div>

          {/* Offset upward on large screens, which is what makes the layout
              read as composed rather than stacked. */}
          <AnnotatedDraft className="lg:-mt-4" />
        </div>
      </div>
    </section>
  );
}

import type { Metadata } from 'next';
import Link from 'next/link';

import { Section } from '@/components/home/section';
import { ClosingCta } from '@/components/site/closing-cta';
import { PageHeader } from '@/components/site/page-header';
import { Button } from '@/components/ui/button';
import { Body, Heading, SectionHeader } from '@/components/ui/typography';
import { getSiteSettings } from '@/lib/content';
import { buildMetadata } from '@/lib/metadata';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();

  return buildMetadata({
    title: 'About',
    description:
      'InkVision Creatives is an executive visibility and strategic communications studio. Our mission, working principles and how we approach the work.',
    path: '/about',
    settings,
  });
}

/**
 * The studio's working principles, taken directly from the brief.
 *
 * Each pairs the principle with what it actually commits us to — a principle
 * without a consequence is decoration.
 */
const PRINCIPLES = [
  {
    title: 'Strategy before content',
    body: 'No writing starts before there is a decision about what you want to be known for and who needs to understand it. A publishing schedule is not a strategy.',
  },
  {
    title: 'Substance over noise',
    body: 'We would rather produce less, better. A smaller body of genuinely considered work outperforms frequent posting, and is sustainable alongside a serious role.',
  },
  {
    title: 'Voice over formula',
    body: 'We work from recorded conversation so the writing starts from your own phrasing. If a sentence does not sound like something you would say, it does not ship.',
  },
  {
    title: 'Evidence over exaggeration',
    body: 'Where a piece needs evidence we cannot substantiate, we say so and change the argument. We will not fill a gap with a plausible-sounding figure.',
  },
  {
    title: 'Visibility with a clear purpose',
    body: 'Presence is built where it serves a goal and declined where it would only add noise. Knowing what not to do is most of the value.',
  },
  {
    title: 'Reliable execution and collaborative review',
    body: 'You see complete drafts, not outlines. Your comments shape the next version, and nothing carrying your name is published without your approval.',
  },
] as const;

export default async function AboutPage() {
  const settings = await getSiteSettings();

  return (
    <>
      <PageHeader
        eyebrow="About"
        title="A studio for people with something valuable to say."
        lead={settings.supportingStatement}
        trail={[{ label: 'About', href: '/about' }]}
      />

      <Section labelledBy="mission-heading">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
          <SectionHeader
            eyebrow="What we do"
            heading={<span id="mission-heading">Our mission</span>}
          />

          <div className="flex flex-col gap-6">
            <Body className="text-lead max-w-none">
              InkVision Creatives exists to close the gap between what people know and what the
              world understands about them.
            </Body>

            <Body className="max-w-none">
              We are a strategic communications partner, not a writing agency. The distinction
              matters: an agency takes a brief and returns copy. We start further back, with a
              decision about position and audience, and the writing follows from it. That is why
              most of our engagements begin with interviews rather than a specification.
            </Body>

            <Body className="max-w-none">
              Our clients are executives, founders, independent professionals and organisations who
              are well regarded by the people who already know them, and largely invisible beyond
              that circle. The expertise is real. What is missing is a clear, public account of it —
              and the time to produce one.
            </Body>

            <div className="border-border-accent mt-2 border-l-2 pl-6">
              <p className="text-content-primary font-serif text-xl leading-relaxed">
                We are not a CV-writing service, and we are not a social-media posting service. If
                that is what you need, we will tell you so.
              </p>
            </div>
          </div>
        </div>
      </Section>

      <Section tone="sunken" labelledBy="principles-heading">
        <SectionHeader
          eyebrow="How we work"
          heading={<span id="principles-heading">Working principles</span>}
          lead="Six commitments that decide how an engagement actually runs — including the parts that occasionally cost us work."
        />

        <div className="[&>*]:ring-border-subtle mt-12 grid gap-px sm:grid-cols-2 lg:grid-cols-3 [&>*]:ring-1">
          {PRINCIPLES.map((principle, index) => (
            <div key={principle.title} className="bg-surface-raised flex flex-col gap-3 p-7">
              <span aria-hidden="true" className="tabular text-accent font-serif text-lg">
                {String(index + 1).padStart(2, '0')}
              </span>
              <Heading level={3} as="h3" className="text-[1.0625rem]">
                {principle.title}
              </Heading>
              <p className="text-content-secondary text-sm leading-relaxed">{principle.body}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* --- Leadership ------------------------------------------------------
          The brief supplies the studio's positioning but no approved founder
          biography or photograph, and inventing either would be a fabrication
          about a real person. The section states what the studio stands for
          and flags the gap in README → "Outstanding business decisions". */}
      <Section labelledBy="leadership-heading">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
          <SectionHeader
            eyebrow="Leadership"
            heading={<span id="leadership-heading">Who you work with</span>}
          />

          <div className="flex flex-col gap-6">
            <Body className="max-w-none">
              InkVision Creatives is a small studio by design. The person who interviews you is the
              person who writes for you — the work depends on hearing how you actually speak, and
              that does not survive being handed down a production line.
            </Body>

            <Body className="max-w-none">
              Engagements involving confidential material are handled directly, under whatever
              agreements your organisation requires. Where additional writers or researchers are
              brought in, you are told who they are and they work to the same editorial standards
              and the same confidentiality.
            </Body>

            <div className="bg-surface-sunken ring-border-subtle p-6 ring-1">
              <Heading level={3} as="h3" className="text-base">
                Want to know who you would be working with?
              </Heading>
              <p className="text-content-secondary mt-2 text-sm leading-relaxed">
                Ask. We would rather have that conversation properly than publish a biography that
                tells you less than five minutes of talking would.
              </p>
              <Button asChild variant="outline" className="mt-4">
                <Link href="/contact">Get in touch</Link>
              </Button>
            </div>
          </div>
        </div>
      </Section>

      <Section tone="sunken" labelledBy="expectations-heading">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <SectionHeader
              eyebrow="What you can expect"
              heading={<span id="expectations-heading">What we will do</span>}
            />
            <ul className="mt-8 flex flex-col gap-3">
              {[
                'Tell you plainly when we think a smaller piece of work would serve you better.',
                'Work from your own words, and calibrate until the voice is unmistakably yours.',
                'Verify what a piece claims before it claims it.',
                'Give you complete drafts and act on your comments.',
                'Keep everything confidential by default.',
              ].map((item) => (
                <li
                  key={item}
                  className="border-border-subtle text-content-secondary border-t pt-3 text-[0.9375rem] leading-relaxed"
                >
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <SectionHeader eyebrow="And what we will not" heading="What we will not do" />
            <ul className="mt-8 flex flex-col gap-3">
              {[
                'Guarantee speaking invitations, coverage or follower growth.',
                'Publish anything under your name without your approval.',
                'Invent statistics, outcomes or testimonials to make a case look stronger.',
                'Present illustrative sample work as a commissioned client engagement.',
                'Recommend a publishing cadence we know you cannot sustain.',
              ].map((item) => (
                <li
                  key={item}
                  className="border-border-subtle text-content-secondary border-t pt-3 text-[0.9375rem] leading-relaxed"
                >
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      <ClosingCta />
    </>
  );
}

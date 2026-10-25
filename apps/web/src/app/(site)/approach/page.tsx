import type { Metadata } from 'next';

import { ApproachStages } from '@/components/home/approach-stages';
import { Section } from '@/components/home/section';
import { ClosingCta } from '@/components/site/closing-cta';
import { PageHeader } from '@/components/site/page-header';
import { EmptyState } from '@/components/ui/states';
import { Body, Heading, SectionHeader } from '@/components/ui/typography';
import { getApproachStages, getSiteSettings } from '@/lib/content';
import { buildMetadata } from '@/lib/metadata';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();

  return buildMetadata({
    title: 'Our Approach',
    description:
      'Strategy before content. How InkVision Creatives moves from discovery and positioning through writing, client review and continuous improvement.',
    path: '/approach',
    settings,
  });
}

export default async function ApproachPage() {
  const stages = await getApproachStages();

  return (
    <>
      <PageHeader
        eyebrow="Our approach"
        title="Strategy before content."
        lead="Most communications work fails upstream of the writing. Before anything is drafted there has to be a decision about what you want to be known for, and who needs to understand it. These five stages are how we get there — and how your expertise and approval stay central throughout."
        trail={[{ label: 'Our Approach', href: '/approach' }]}
      />

      <Section labelledBy="stages-heading">
        <h2 id="stages-heading" className="sr-only">
          The five stages
        </h2>

        {stages.length > 0 ? (
          <ApproachStages stages={stages} />
        ) : (
          <EmptyState
            title="Our approach page is being updated"
            description="It will be back shortly. In the meantime, get in touch and we will talk you through how we work."
          />
        )}
      </Section>

      {/* --- Where the client sits in all of this ---------------------------- */}
      <Section tone="sunken" labelledBy="client-role-heading">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-16">
          <SectionHeader
            eyebrow="Your part in it"
            heading={<span id="client-role-heading">You hold the substance and the final say</span>}
          />

          <div className="flex flex-col gap-6">
            <Body className="max-w-none">
              We are not a service that takes a brief and returns finished copy. The expertise being
              communicated is yours, which means the process has to draw it out of you rather than
              around you — and it means nothing is published without your approval.
            </Body>

            <div className="[&>*]:ring-border-subtle grid gap-px sm:grid-cols-2 [&>*]:ring-1">
              {[
                {
                  title: 'Interviews, not questionnaires',
                  body: 'Recorded conversations are the raw material. Most pieces start as something you said and had not thought to write down.',
                },
                {
                  title: 'Research around what you said',
                  body: 'We verify what a piece claims before it claims it, and change the argument where we cannot substantiate it.',
                },
                {
                  title: 'Complete drafts for review',
                  body: 'You see full drafts, not outlines to approve. Your comments shape the next version.',
                },
                {
                  title: 'Approval before publication',
                  body: 'Nothing carrying your name goes out without your explicit sign-off. That is not negotiable.',
                },
              ].map((item) => (
                <div key={item.title} className="bg-surface-raised p-6">
                  <Heading level={3} as="h3" className="text-base">
                    {item.title}
                  </Heading>
                  <p className="text-content-secondary mt-2 text-sm leading-relaxed">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* --- What improvement actually means --------------------------------- */}
      <Section labelledBy="learning-heading">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-16">
          <SectionHeader
            eyebrow="Learning and improvement"
            heading={
              <span id="learning-heading">Measured honestly, including where it cannot be</span>
            }
          />

          <div className="flex flex-col gap-6">
            <Body className="max-w-none">
              We agree what to look at before the work starts, and it depends on the goal. Some
              indicators are countable: enquiry quality, engagement with a particular argument, how
              people arrive at your profile. Others are observed rather than measured — whether
              colleagues now describe your work accurately, whether the right invitations begin to
              arrive.
            </Body>

            <Body className="max-w-none">
              We report both. Privileging whichever is easier to count would make the reporting
              tidier and considerably less useful, and we would rather tell you that an effect is
              real but not yet measurable than present a number that implies more than it knows.
            </Body>

            <div className="border-border-accent border-l-2 pl-6">
              <p className="text-content-primary font-serif text-lg leading-relaxed">
                What we will not do is guarantee an outcome that depends on other people’s
                decisions. Speaking invitations, media coverage and new business are influenced by
                clear, credible visibility — they are not produced by it on demand.
              </p>
            </div>
          </div>
        </div>
      </Section>

      <ClosingCta
        headline="Does this sound like the way you want to work?"
        body="If it does, tell us what you are working towards. If it does not, that is useful to know early — and we will say so if we think another approach would serve you better."
      />
    </>
  );
}

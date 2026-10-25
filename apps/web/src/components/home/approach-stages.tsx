import { Heading, Meta } from '@/components/ui/typography';
import type { ApproachStage } from '@/lib/content';
import { cn } from '@/lib/utils';

/**
 * The five-stage approach.
 *
 * Numbered and connected by a vertical rule so the sequence is visible at a
 * glance — the sequence is the point, and a row of equal cards would lose it.
 */
export function ApproachStages({
  stages,
  className,
  showClientRole = true,
}: {
  stages: readonly ApproachStage[];
  className?: string;
  showClientRole?: boolean;
}) {
  if (stages.length === 0) return null;

  return (
    <ol className={cn('flex flex-col', className)}>
      {stages.map((stage, index) => (
        <li
          key={stage.id}
          className="border-border-subtle relative grid gap-4 border-t py-8 sm:grid-cols-[4rem_minmax(0,1fr)] sm:gap-8 lg:grid-cols-[5rem_minmax(0,1fr)]"
        >
          <span
            aria-hidden="true"
            className="tabular text-accent font-serif text-[2rem] leading-none sm:text-[2.5rem]"
          >
            {String(index + 1).padStart(2, '0')}
          </span>

          <div className="flex flex-col gap-3">
            <Heading level={3} as="h3">
              {stage.title}
            </Heading>

            <p className="max-w-measure-wide text-content-secondary text-[0.9375rem] leading-relaxed">
              {stage.summary}
            </p>

            {showClientRole ? (
              <div className="border-border-accent mt-1 border-l-2 pl-4">
                <Meta className="font-sans text-[0.6875rem] font-semibold tracking-[0.12em] uppercase">
                  Your part
                </Meta>
                <p className="max-w-measure text-content-secondary mt-1 text-sm leading-relaxed">
                  {stage.clientRole}
                </p>
              </div>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}

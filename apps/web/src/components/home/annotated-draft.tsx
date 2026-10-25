import { cn } from '@/lib/utils';

/**
 * The hero's editorial visual: an annotated draft.
 *
 * This is an original composition rather than stock imagery or a generic
 * corporate graphic. It shows the studio's actual work — a paragraph being
 * revised — using type, rule weights and marginal notes. The "draft" text is
 * InkVision's own positioning copy, so nothing on screen is filler.
 *
 * It is built from text and borders rather than an image so it stays crisp at
 * any size, costs no bytes beyond the markup, and contributes no layout shift.
 * The whole thing is `aria-hidden`: it is decoration that restates the
 * headline beside it, and announcing it would only add noise.
 */
export function AnnotatedDraft({ className }: { className?: string }) {
  return (
    <figure
      className={cn(
        'bg-surface-raised relative isolate shadow-[--shadow-card] select-none',
        className,
      )}
      aria-hidden="true"
    >
      {/* A fine gold rule along the top edge: the accent at its most restrained. */}
      <span className="border-accent absolute inset-x-0 top-0 h-0 border-t-2" />

      <div className="flex flex-col gap-6 px-7 py-8 sm:px-9 sm:py-10">
        <header className="border-border-subtle flex items-baseline justify-between gap-4 border-b pb-4">
          <span className="text-content-muted font-sans text-[0.625rem] font-semibold tracking-[0.18em] uppercase">
            Draft — executive profile
          </span>
          <span className="tabular text-content-muted font-sans text-[0.625rem]">v3</span>
        </header>

        <div className="text-content-secondary relative flex flex-col gap-4 font-serif text-[0.9375rem] leading-[1.9]">
          <p>
            <span className="relative">
              You have built the experience
              {/* A marked phrase: the editorial decision made visible. */}
              <span className="border-gold-300 absolute inset-x-0 -bottom-0.5 h-0 border-b-2" />
            </span>
            , developed the ideas and done the work.
          </p>

          <p>
            {/* A struck phrase, replaced by the one beside it. */}
            <span className="text-content-muted decoration-danger/55 line-through decoration-1">
              We help you build a personal brand
            </span>{' '}
            <span className="text-content-primary">
              InkVision Creatives helps executives, founders and organisations communicate that
              expertise
            </span>{' '}
            with a clear point of view.
          </p>

          <p className="text-content-muted">
            …a public presence that earns attention for the right reasons.
          </p>
        </div>

        {/* Marginal notes, set in the sans face to read as annotation rather
            than copy. */}
        <div className="border-border-strong flex flex-col gap-3 border-t border-dashed pt-5">
          <Annotation index="01" note="Start from what they have actually done." />
          <Annotation index="02" note="“Personal brand” is their language, not ours. Cut it." />
          <Annotation index="03" note="Name the audience. Attention for what?" />
        </div>
      </div>
    </figure>
  );
}

function Annotation({ index, note }: { index: string; note: string }) {
  return (
    <p className="text-content-muted flex gap-3 font-sans text-[0.75rem] leading-relaxed">
      <span className="tabular text-accent shrink-0 font-semibold tracking-[0.1em]">{index}</span>
      <span>{note}</span>
    </p>
  );
}

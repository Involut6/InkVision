import Link from 'next/link';

import { cn } from '@/lib/utils';

/**
 * The wordmark.
 *
 * No logo file was supplied with the brief, so this is a typographic mark built
 * from the brand's own type pairing: the serif name with a fine gold rule and
 * the studio descriptor set in small caps. It is a single component so a
 * supplied SVG can replace it in one place — see README → "Outstanding
 * business decisions".
 */
export function Logo({
  className,
  tone = 'default',
  showDescriptor = true,
}: {
  className?: string;
  tone?: 'default' | 'inverse';
  showDescriptor?: boolean;
}) {
  return (
    <Link
      href="/"
      aria-label="InkVision Creatives — home"
      className={cn('group inline-flex flex-col gap-1', className)}
    >
      <span
        className={cn(
          'font-serif text-[1.3rem] leading-none tracking-[-0.015em] sm:text-[1.45rem]',
          tone === 'inverse' ? 'text-white' : 'text-content-primary',
        )}
      >
        InkVision
        {/* `accent-text` rather than `accent`: gold-500 is 2.5:1 on paper,
            which is fine for a rule and a failure for a word. */}
        <span className={tone === 'inverse' ? 'text-gold-300' : 'text-accent-text'}>
          {' '}
          Creatives
        </span>
      </span>

      {showDescriptor ? (
        <span className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className={cn(
              'block h-0 w-5 border-t transition-[width] duration-300 group-hover:w-8',
              tone === 'inverse' ? 'border-gold-300' : 'border-accent',
            )}
          />
          <span
            className={cn(
              'font-sans text-[0.5625rem] font-semibold tracking-[0.18em] uppercase',
              tone === 'inverse' ? 'text-white/60' : 'text-content-muted',
            )}
          >
            Strategic Communications
          </span>
        </span>
      ) : null}
    </Link>
  );
}

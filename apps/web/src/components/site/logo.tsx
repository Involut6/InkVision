import Image from 'next/image';
import Link from 'next/link';

import logoInverse from '../../../public/logo-inverse.png';
import logo from '../../../public/logo.png';

import { cn } from '@/lib/utils';

/**
 * The supplied logo.
 *
 * Two lockups rather than one: the navy wordmark disappears against the
 * footer's deep navy, so dark surfaces get a version with the lettering in
 * paper white. The yellow is identical in both — it is the constant in the
 * mark, and the thing that has to stay exactly as drawn.
 *
 * Both are flat two-colour art with transparent surrounds, so they sit on the
 * warm paper surfaces without a white box around them.
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
  const source = tone === 'inverse' ? logoInverse : logo;

  return (
    <Link
      href="/"
      aria-label="InkVision Creatives — home"
      className={cn('group inline-flex flex-col gap-1.5', className)}
    >
      <Image
        src={source}
        alt="InkVision Creatives"
        // The header is above the fold on every page, so this is the one image
        // worth loading eagerly.
        priority
        className="h-9 w-auto sm:h-10"
      />

      {showDescriptor ? (
        <span className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className={cn(
              'border-accent block h-0 w-5 border-t-2 transition-[width] duration-300',
              'group-hover:w-8',
            )}
          />
          <span
            className={cn(
              'font-sans text-[0.5625rem] font-semibold tracking-[0.18em] uppercase',
              tone === 'inverse' ? 'text-white/70' : 'text-content-muted',
            )}
          >
            Strategic Communications
          </span>
        </span>
      ) : null}
    </Link>
  );
}

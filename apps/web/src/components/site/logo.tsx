import Image from 'next/image';
import Link from 'next/link';

import logoInverse from '../../../public/logo-inverse.png';
import logo from '../../../public/logo.png';

import { cn } from '@/lib/utils';

/**
 * The supplied logo, unmodified.
 *
 * The artwork exactly as provided, cropped to its own edges and with the white
 * it was supplied on keyed out, so it sits on the page rather than in a box.
 * Its pixels are the supplied ones: nothing is redrawn in flat colour, which
 * thickened the strokes, and nothing is set beside it.
 *
 * The footer version lifts the navy lettering to paper white so it can be read
 * on the dark surface. Only the lettering changes: the yellow and every alpha
 * value are the original's, which is what keeps the edges clean.
 */
export function Logo({
  className,
  tone = 'default',
}: {
  className?: string;
  tone?: 'default' | 'inverse';
}) {
  return (
    <Link href="/" aria-label="InkVision Creatives — home" className={cn('inline-flex', className)}>
      <Image
        src={tone === 'inverse' ? logoInverse : logo}
        alt="InkVision Creatives"
        // The header is above the fold on every page, so this is the one image
        // worth loading eagerly.
        priority
        className="h-9 w-auto sm:h-10"
      />
    </Link>
  );
}

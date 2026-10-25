import { cn } from '@/lib/utils';

/**
 * Renders long-form CMS copy.
 *
 * The HTML has already been sanitised on the server, on write, against a narrow
 * allowlist — see `apps/api/src/common/utils/rich-text.ts`. Sanitising on write
 * rather than on read means the database only ever holds safe markup, so there
 * is exactly one place to audit and no opportunity for a second render path to
 * skip the step.
 */
export function RichText({
  html,
  className,
  as: Component = 'div',
}: {
  html: string;
  className?: string;
  as?: 'div' | 'article' | 'section';
}) {
  if (!html.trim()) return null;

  return (
    <Component
      className={cn('prose-editorial', className)}
      // Safe by construction: see the note above.
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: { default: 'Administration', template: '%s | InkVision Admin' },
  // Belt and braces with the `X-Robots-Tag` header in next.config.ts: the admin
  // area must never appear in an index.
  robots: { index: false, follow: false, nocache: true },
};

/**
 * The admin shell.
 *
 * Deliberately separate from the public site's layout: no site header, no
 * footer, no marketing chrome. The root layout still wraps this, so the query
 * provider and fonts are shared.
 *
 * The authentication guard lives one level down, in the `(workspace)` route
 * group, so the sign-in page is not itself behind the guard — which would
 * redirect to itself forever.
 */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return <div className="bg-surface-sunken min-h-dvh">{children}</div>;
}

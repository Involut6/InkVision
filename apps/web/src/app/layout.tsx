import type { Metadata, Viewport } from 'next';
import { Fraunces, Inter } from 'next/font/google';
import type { ReactNode } from 'react';

import { Providers } from '@/components/providers';
import { publicEnv, siteUrl } from '@/lib/env';

import './globals.css';

/**
 * The editorial type pairing.
 *
 * Fraunces — a contemporary serif with real optical sizing — carries the
 * headlines. Inter handles body copy, navigation, forms and interface text.
 * Both are self-hosted by `next/font`, so there is no third-party request on
 * the critical path and no layout shift as they load.
 */
const fraunces = Fraunces({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-fraunces',
  // Loaded as a variable font so the optical-size axis is available and the
  // whole weight range costs one file rather than three.
  weight: 'variable',
  axes: ['SOFT', 'WONK', 'opsz'],
});

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
  weight: 'variable',
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: 'InkVision Creatives — Make your expertise visible.',
    // Every page supplies its own title; this gives them all one suffix.
    template: `%s | ${publicEnv.siteName}`,
  },
  description:
    'Executive visibility, thought leadership and strategic communications for people and organisations with something valuable to say.',
  applicationName: publicEnv.siteName,
  authors: [{ name: publicEnv.siteName }],
  generator: 'Next.js',
  referrer: 'strict-origin-when-cross-origin',
  formatDetection: { telephone: false, address: false, email: false },
  openGraph: {
    type: 'website',
    siteName: publicEnv.siteName,
    locale: 'en_GB',
    url: siteUrl(),
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Pinch-zoom is never disabled: capping it is a WCAG 1.4.4 failure.
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fdfcf9' },
    { media: '(prefers-color-scheme: dark)', color: '#0b1026' },
  ],
};

/**
 * The root layout.
 *
 * Deliberately minimal: the document shell, the fonts and the query provider,
 * and nothing else. The public site's header and footer live in the `(site)`
 * route group so the administration portal can have its own chrome.
 */
/**
 * Rendered per request, which the Content-Security-Policy requires.
 *
 * The policy in `src/proxy.ts` carries a per-request nonce, and Next.js writes
 * that nonce onto its own script tags as it renders the HTML. A prerendered
 * page bakes in the nonce from build time and is then served from cache while
 * the header carries a fresh one, so the two disagree and the browser refuses
 * every script on the page — no mobile navigation, no enquiry form, no
 * newsletter. `next dev` renders each request, so the nonces matched there and
 * the failure only appeared in a production build. Next.js documents the
 * constraint: a nonce requires dynamic rendering.
 *
 * This costs less than it looks. Every content fetch is still cached and
 * tagged (see `lib/api.server.ts`), so the API is not consulted per request —
 * only the HTML is assembled per request. The alternative, keeping prerendered
 * HTML by allowing `unsafe-inline` scripts, trades a real protection for a
 * saving this site does not need.
 */
export const dynamic = 'force-dynamic';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-GB" className={`${fraunces.variable} ${inter.variable}`}>
      <body className="min-h-dvh">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

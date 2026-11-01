import { existsSync } from 'node:fs';

import type { NextConfig } from 'next';

/**
 * `@inkvision/shared-types` is the compile-time contract between this app and
 * the API, and it resolves to its compiled `dist/`. Running `next build`
 * without having built it first produces a wall of "Can't resolve
 * '@inkvision/shared-types'" errors, one per importing file, which says
 * nothing about the actual cause.
 *
 * `pnpm build` in this directory handles it — the package's `prebuild` script
 * compiles the dependency. A tool that invokes `next build` directly skips
 * that, so the check below fails with one readable sentence instead.
 */
const sharedTypesEntry = new URL('../../packages/shared-types/dist/index.js', import.meta.url);

if (!existsSync(sharedTypesEntry)) {
  throw new Error(
    [
      '@inkvision/shared-types has not been built, so this build cannot resolve it.',
      '',
      '  Build it with:  pnpm --filter @inkvision/shared-types build',
      '  Or build this app the usual way, which does it for you:  pnpm build',
      '',
      'On a host that runs `next build` directly — Vercel with the Next.js preset',
      "does — set the project's build command to `pnpm run build`.",
    ].join('\n'),
  );
}

/**
 * Security headers applied to every response. `Content-Security-Policy` is set
 * per-request in `src/middleware.ts` because it carries a per-response nonce.
 */
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // `standalone` keeps the production container small and avoids shipping the
  // whole monorepo's node_modules. See README → Deployment.
  output: 'standalone',
  outputFileTracingRoot: new URL('../../', import.meta.url).pathname,
  typedRoutes: true,
  images: {
    // Remote patterns are intentionally empty by default: add the object-storage
    // host once STORAGE_DRIVER=s3 is configured, rather than allowing `**`.
    remotePatterns: [],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [360, 480, 640, 768, 1024, 1280, 1536, 1920],
  },
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      // Admin pages must never be indexed or cached by shared proxies.
      {
        source: '/admin/:path*',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' },
          { key: 'Cache-Control', value: 'no-store, max-age=0, must-revalidate' },
        ],
      },
    ];
  },
};

export default nextConfig;

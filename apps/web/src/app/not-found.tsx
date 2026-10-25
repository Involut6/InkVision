import Link from 'next/link';

/**
 * The root not-found boundary, used for routes outside the public site group
 * (for example a bad path under /admin). Public 404s are handled by
 * `(site)/not-found.tsx`, which keeps the site header and footer.
 */
export default function RootNotFound() {
  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <div className="max-w-measure flex flex-col gap-5 text-center">
        <span aria-hidden="true" className="border-accent mx-auto block h-0 w-10 border-t-2" />
        <h1 className="text-h2 text-content-primary font-serif">Page not found</h1>
        <p className="text-content-secondary">
          The link may be out of date, or the page may have moved.
        </p>
        <p>
          <Link href="/" className="text-brand font-semibold underline underline-offset-4">
            Return to the homepage
          </Link>
        </p>
      </div>
    </div>
  );
}

# Public site route group

## Why there is no route-level `loading.tsx` here

A `loading.tsx` at this level wraps every public route in a Suspense boundary.
Next.js then commits the HTTP response — **status 200** — and streams the
loading shell before the page has resolved. By the time a detail page calls
`notFound()`, the status line has already been sent, so a missing article
returned `200 OK` with a loading shimmer: a classic "soft 404" that search
engines will happily index.

Correct status codes matter more here than a loading shimmer, particularly
because every public page is server-rendered from cached, revalidated data and
resolves in a few milliseconds.

If a genuinely slow public page is added later, give **that page** its own
nested `<Suspense>` boundary around the slow part, rather than reintroducing a
route-level `loading.tsx` that changes the status code for every route in the
group.

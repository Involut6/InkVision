# InkVision Creatives

> **Make your expertise visible.**
>
> Executive visibility, thought leadership and strategic communications for
> people and organisations with something valuable to say.

A full-stack website and administration portal for InkVision Creatives: a
public editorial site, a REST API, a PostgreSQL-backed content management
system, enquiry management, and a commerce foundation that stays switched off
until a payment provider has been configured and tested.

---

## Contents

- [What is here](#what-is-here)
- [Architecture](#architecture)
- [Getting started](#getting-started)
- [Everyday commands](#everyday-commands)
- [Project structure](#project-structure)
- [Content model](#content-model)
- [Security](#security)
- [Testing](#testing)
- [Deployment](#deployment)
- [Enabling commerce](#enabling-commerce)
- [Operations](#operations)
- [Outstanding business decisions](#outstanding-business-decisions)

---

## What is here

### The public website

| Route | What it does |
| --- | --- |
| `/` | Homepage: hero, positioning, the four services, the five-stage approach, selected work, insights, resources, closing call to action |
| `/services` | Service overview with engagement guidance |
| `/services/[slug]` | The four service pages: executive visibility, thought leadership & ghostwriting, strategic content & communications, executive communications |
| `/approach` | The five-stage process, and where the client sits in it |
| `/work`, `/work/[slug]` | Portfolio, with commissioned work and illustrative samples clearly distinguished |
| `/insights`, `/insights/[slug]` | Editorial publishing: categories, search, pagination, reading time, author attribution, related reading |
| `/resources`, `/resources/[slug]` | Digital resource catalogue and product pages |
| `/about` | Mission, working principles, how engagements run |
| `/contact` | Enquiry form, persisted to PostgreSQL |
| `/faq` | Grouped, searchable FAQ with structured data |
| `/privacy`, `/terms`, `/refund-policy` | Editable legal templates, flagged as awaiting review |
| `/sitemap.xml`, `/robots.txt` | Generated from published content only |

### The administration portal

Under `/admin`, behind authentication and server-enforced permissions:

- **Dashboard** — enquiry counts by status, content counts, recent activity, date range
- **Enquiries** — search, filter, status workflow, internal notes, status history, CSV export
- **Insights** — create, edit, publish, schedule, unpublish, archive
- **Selected work** — case studies with client-approval gating
- **Services** — editable service copy
- **Resources** — products, with the reason each one is or is not purchasable
- **Newsletter** — subscriber list
- **Team** — invite colleagues, assign roles, reset passwords
- **Settings** — contact details, SEO defaults, newsletter copy, and what the running deployment can actually do

---

## Architecture

```
┌──────────────────┐         ┌──────────────────┐         ┌──────────────┐
│   apps/web       │  HTTPS  │   apps/api       │ Prisma  │  PostgreSQL  │
│   Next.js 16     │ ──────► │   NestJS 12      │ ──────► │     16       │
│   React 19       │         │   /api/v1        │         │              │
└──────────────────┘         └──────────────────┘         └──────────────┘
         │                            │
         │                            ├── Email provider (console | SMTP)
         │                            ├── File storage   (local | S3)
         │                            └── Payments       (none | Paystack | Stripe)
         │
         └── packages/shared-types — the API contract both sides compile against
```

**The website never touches the database.** Every piece of content reaches it
through the API, which means there is one place where "published" is defined
and one place to audit.

### Decisions worth knowing about

**Prisma 7 with a driver adapter.** Prisma 7 moved the connection URL out of
`schema.prisma` into `prisma.config.ts`, and the client now connects through a
driver adapter. The application passes its connection from validated
configuration (`src/prisma/prisma.service.ts`) rather than letting the client
read `process.env` itself.

**The API is a native ESM package.** NestJS 12 ships as ESM only, so `apps/api`
sets `"type": "module"` and every relative import carries an explicit `.js`
extension. Note that `tsx` (and anything else built on esbuild) cannot emit the
decorator metadata NestJS depends on — `nest start` and `nest build` use `tsc`,
and the Vitest config uses SWC for the same reason.

**Public content is server-rendered, interactions are client-side.** Pages are
React Server Components fetching through a cached, tagged `fetch`; forms and the
admin portal are client components using TanStack Query. Zustand appears exactly
once, for the admin session — it is genuinely shared client state rather than a
second copy of the query cache.

**One throttler bucket.** In `@nestjs/throttler` every configured bucket applies
to every route — a named bucket is not opt-in. Registering a strict `enquiry`
bucket alongside the default therefore caps the *entire API* at that limit. The
application configures one bucket and tightens it per handler with
`@Throttle({ default: ... })`. See the note in `apps/api/src/app.module.ts`.

**No route-level `loading.tsx` on the public site.** It would wrap every route in
a Suspense boundary, committing a `200` and streaming a shell before the page
resolves — so a missing article returned `200 OK` instead of `404`, a soft 404
that search engines index. See `apps/web/src/app/(site)/README.md`.

---

## Getting started

### Prerequisites

- **Node.js 22+**
- **pnpm 10+** — `corepack enable && corepack prepare pnpm@latest --activate`
- **PostgreSQL 16** — via Docker Compose, or a local install

### 1. Install

```bash
pnpm install
```

### 2. Configure

```bash
cp .env.example .env
```

Then generate the four secrets the API refuses to start without:

```bash
for key in JWT_ACCESS_SECRET JWT_REFRESH_SECRET CSRF_SECRET DOWNLOAD_LINK_SECRET; do
  echo "$key=$(openssl rand -base64 48)"
done
```

Paste those into `.env`, replacing the `replace-me-…` placeholders. Startup
validation rejects the placeholders by name, so a half-configured deployment
fails immediately rather than at the first request.

### 3. Start PostgreSQL

```bash
pnpm db:up          # docker compose up -d postgres
```

Already running Postgres locally? Point `DATABASE_URL` at it instead.

### 4. Migrate and seed

```bash
pnpm db:migrate     # applies migrations
pnpm db:seed        # services, approach, FAQs, article drafts, legal templates
```

The seed is idempotent. What it deliberately does **not** create, and why:

| Not seeded | Why |
| --- | --- |
| An administrator account | No usable credential should ever live in source control — see the next step |
| Case studies | No completed, client-approved work was supplied, and inventing a portfolio is exactly what the content rules forbid |
| Testimonials | None have been confirmed as authorised for publication |
| Product price, file, refund terms | Not supplied, so the resource is correctly reported as not purchasable |
| Published articles | The seeded drafts are commissioning briefs, not finished pieces |

### 5. Create the first administrator

```bash
pnpm admin:create
```

Prompts for an email, name and password, with the password hidden as you type.
For automated provisioning, pass `--email` and `--name` and supply
`ADMIN_PASSWORD` in the environment.

### 6. Run

```bash
pnpm dev            # website on :3000, API on :4000
```

| | |
| --- | --- |
| Website | http://localhost:3000 |
| Admin portal | http://localhost:3000/admin |
| API | http://localhost:4000/api/v1 |
| API documentation | http://localhost:4000/api/docs |
| Health / readiness | `/api/v1/health`, `/api/v1/ready` |

---

## Everyday commands

From the repository root:

| Command | What it does |
| --- | --- |
| `pnpm dev` | Both applications in watch mode |
| `pnpm build` | Production build of everything |
| `pnpm lint` | ESLint across the workspace |
| `pnpm typecheck` | TypeScript across the workspace |
| `pnpm test` | Unit and component tests |
| `pnpm test:integration` | API tests against a real PostgreSQL |
| `pnpm test:e2e` | Playwright journeys |
| `pnpm verify` | Format, lint, typecheck, test, build — the full gate |
| `pnpm db:migrate` | Create and apply a migration |
| `pnpm db:migrate:deploy` | Apply existing migrations (production) |
| `pnpm db:seed` | Seed development content |
| `pnpm db:reset` | Drop, re-migrate and re-seed — **destroys data** |
| `pnpm db:studio` | Prisma Studio |
| `pnpm admin:create` | Create an administrator |

---

## Project structure

```
inkvision-creatives/
├── apps/
│   ├── api/                      NestJS REST API
│   │   ├── prisma/
│   │   │   ├── schema.prisma     The single schema
│   │   │   ├── migrations/       Versioned SQL
│   │   │   ├── seed.ts           Idempotent development seed
│   │   │   └── seed-data/        Content from the brief
│   │   ├── scripts/
│   │   │   └── create-admin.ts   Secure initial-administrator creation
│   │   ├── src/
│   │   │   ├── common/           Guards, filters, pipes, DTOs, utilities
│   │   │   ├── config/           Environment validation and typed access
│   │   │   ├── mail/             Transport abstraction + templates
│   │   │   ├── storage/          File storage abstraction
│   │   │   ├── prisma/           Database client
│   │   │   └── modules/          One folder per bounded area
│   │   └── test/
│   │       ├── unit/             No database
│   │       └── integration/      Real PostgreSQL
│   └── web/                      Next.js website and admin portal
│       ├── src/
│       │   ├── app/
│       │   │   ├── (site)/       Public routes, with header and footer
│       │   │   └── admin/        Portal, with its own chrome
│       │   ├── components/
│       │   │   ├── ui/           Design-system primitives
│       │   │   ├── site/         Public-site composites
│       │   │   ├── content/      Content cards and panels
│       │   │   ├── home/         Homepage sections
│       │   │   └── admin/        Portal screens
│       │   └── lib/              API clients, content layer, metadata, utils
│       ├── test/                 Component tests (Vitest + Testing Library)
│       └── e2e/                  Playwright journeys
├── packages/
│   └── shared-types/             The API contract
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## Content model

PostgreSQL, through Prisma. The full schema is
`apps/api/prisma/schema.prisma`; what follows is what you need to know to work
with it.

### Conventions

- **Money is never a float.** Prices are an integer count of minor units
  (`priceAmountMinor`) beside an ISO-4217 `currency`. ₦9,500.00 is `950000` and
  `"NGN"`.
- **Timestamps are UTC** `timestamptz`, formatted for display at the edges.
- **Long-form copy is stored twice** — sanitised HTML for rendering, plain text
  for excerpts, search and reading-time estimates.
- **Public content is addressed by a unique slug.**
- **Indexes follow the queries** that exist: enquiry status and date, article
  publication state and date, every public slug, case-study category and kind.

### Entities

**Identity** — `AdminUser`, `RefreshToken`, `AuditLog`
**Enquiries** — `Enquiry`, `EnquiryNote`, `EnquiryStatusChange`
**Services** — `Service`, `ServiceComponent`, `ServiceProcessStage`, `ApproachStage`, `FaqGroup`, `FaqItem`
**Insights** — `Article`, `ArticleCategory`, `Tag`, `ArticleTag`, `Author`, `ArticleService`
**Work** — `CaseStudy`, `CaseStudyExcerpt`, `PortfolioCategory`, `CaseStudyService`
**Resources** — `Product`, `ProductAsset`, `MediaAsset`
**Commerce** — `Order`, `OrderItem`, `PaymentTransaction`, `DigitalProductDelivery`
**Other** — `NewsletterSubscriber`, `Testimonial`, `SiteSettings`, `LegalPage`

### Content-integrity rules, enforced in code

These are the rules the brief treats as non-negotiable, and they live on the
read and write paths rather than in the interface:

1. **Draft content never reaches the public API.** One definition of "published"
   (`publishedContentWhere`) composes into every public query. A scheduled
   article becomes visible when its timestamp passes — no background job needed.
2. **Commissioned client work cannot be published without recorded approval.**
   The publish endpoint refuses it.
3. **A client's name is withheld** unless `clientApproved` is set.
4. **Outcomes are withheld** unless verified — and, for client work, approved.
5. **Illustrative samples are labelled** everywhere they appear, including an
   unmissable banner on the case-study page itself.
6. **Testimonials require both approval and publication** before they are served.
7. **A product is purchasable only** when commerce is enabled, the product is
   active, it has a price and currency, and a deliverable file is attached. The
   browser never decides this.

---

## Security

| Concern | How it is handled |
| --- | --- |
| Passwords | Argon2id, 19 MiB / 2 iterations / 1 lane |
| Sessions | 15-minute access tokens; rotating refresh tokens in HttpOnly cookies |
| Token theft | Replaying a rotated refresh token revokes the whole session family |
| Brute force | Per-IP rate limit on sign-in, plus per-account lockout after 5 failures |
| Authorisation | Server-side permission checks on every admin route; the UI only hides what a user cannot do |
| CSRF | Double-submit token bound to the session, on cookie-authenticated writes |
| XSS | Editor HTML sanitised **on write** against a narrow allowlist; CSP with a per-request nonce |
| SQL injection | Prisma parameterised queries throughout |
| Uploads | Declared MIME type must match the file's magic bytes; SVG is never served publicly |
| Private files | Stored outside any web-served directory; reachable only through signed, authorised routes |
| Rate limiting | Per-IP for anonymous traffic, per-user once authenticated, so an office NAT is not one shared bucket |
| Audit | Every consequential administrative action recorded, with secrets redacted |
| Error responses | One shape, no stack traces, no driver text |
| Logs | Credentials, cookies and personal fields redacted |

**Never** put `DATABASE_URL`, a JWT secret or a payment key in a `NEXT_PUBLIC_*`
variable: those are inlined into the browser bundle.

---

## Testing

```bash
pnpm test                 # 56 API unit + 28 web component tests
pnpm test:integration     # 48 API tests against real PostgreSQL
pnpm test:e2e             # 34 Playwright journeys, desktop and mobile
```

### Integration tests

They need a test database, and they **truncate every table between cases**:

```bash
docker compose --profile test up -d postgres-test
pnpm test:integration
```

The setup file refuses to run unless `TEST_DATABASE_URL` contains `test`, so it
cannot be pointed at a real database by accident.

Rate limiting is disabled by default in these tests — a suite that submits a
dozen enquiries per second is not the traffic it exists to stop — and tested
directly in `test/integration/rate-limiting.spec.ts`.

### End-to-end tests

Both applications must be running. The admin journeys need an account:

```bash
pnpm dev   # in one terminal

ADMIN_E2E_EMAIL=you@example.com \
ADMIN_E2E_PASSWORD='your-password' \
pnpm test:e2e
```

Without those variables the admin journeys skip and everything else still runs.

### What is covered

| Journey | Where |
| --- | --- |
| Browse services, open a detail page | `e2e/visitor-journeys.spec.ts` |
| Submit an enquiry, see the confirmation | `e2e/visitor-journeys.spec.ts` |
| Subscribe to the newsletter | `e2e/visitor-journeys.spec.ts` |
| An unavailable product cannot be purchased | `e2e/visitor-journeys.spec.ts` |
| Admin area unreachable when signed out | `e2e/visitor-journeys.spec.ts` |
| Sign in, review an enquiry, change status | `e2e/admin-journeys.spec.ts` |
| Create an article; confirm the draft stays private | `e2e/admin-journeys.spec.ts` |
| Mobile navigation opens, navigates, closes, restores focus | `e2e/mobile-navigation.spec.ts` |
| Skip link, single `h1`, no horizontal scroll, admin `noindex` | `e2e/visitor-journeys.spec.ts` |
| Unauthorised access to every admin endpoint | `test/integration/auth.spec.ts` |
| Refresh-token rotation and replay detection | `test/integration/auth.spec.ts` |
| Draft, scheduled and archived content stay private | `test/integration/content-visibility.spec.ts` |
| Enquiry persistence, validation, dedupe, honeypot | `test/integration/enquiries.spec.ts` |

### Continuous integration

`.github/workflows/ci.yml` runs the same commands on every pull request, in two
jobs: `verify` (format, lint, typecheck, unit, integration, build) and `e2e`,
which seeds a throwaway database, creates an administrator through
`pnpm admin:create` and drives the Playwright journeys against production
builds of both applications.

The secrets in that file are obviously-fake fixed strings that exist only to
satisfy startup validation. Nothing real belongs there — see
[Configure](#2-configure).

---

## Deployment

The website and the API are deployed independently and **must not be assumed to
share a hostname or port**. Configure them explicitly.

### Which host for which app

The API is a long-lived NestJS process holding a PostgreSQL connection pool. It
belongs on a host that runs a persistent server — Railway, Render, Fly.io,
a container platform, a VPS. It is **not** suited to a serverless or
edge-function host.

The website is a Next.js app and runs anywhere Next.js does, Vercel included.

On a platform that builds one app per project, set the project's **root
directory** to `apps/web` or `apps/api` accordingly, and create two projects
rather than one. Pointing a single project at the repository root, or at the
wrong app, builds the wrong thing.

Each app builds standalone from a fresh clone: its `prebuild` compiles
`@inkvision/shared-types` first, so `pnpm build` inside either app directory is
enough and no particular ordering has to be configured on the host.

### Deploy the API before the website

The website's service, insight, resource and work detail pages are prerendered
from live API data at build time. If the API is unreachable while the website
builds, the build still succeeds — it degrades to empty states rather than
failing — but nothing is prerendered. Those pages then render on demand instead,
and `sitemap.xml` is empty until its first revalidation. Deploy and migrate the
API first, confirm `/api/v1/health`, then build the website against it.

### Database

```bash
# On the production host, with DATABASE_URL set:
pnpm --filter @inkvision/api prisma migrate deploy
```

Use `migrate deploy`, never `db push`: it applies the reviewed migration files
rather than inferring a diff.

### API

```bash
pnpm build:api
NODE_ENV=production node apps/api/dist/main.js
```

Required in production, enforced by startup validation:

- `AUTH_COOKIE_SECURE=true`
- `CORS_ORIGINS` listing the website's exact origin
- `SWAGGER_ENABLED=false`, or `SWAGGER_USER` and `SWAGGER_PASSWORD`
- All four secrets at their real values

Cross-site deployment (website and API on different registrable domains) also
needs `AUTH_COOKIE_SAMESITE=none` with `AUTH_COOKIE_SECURE=true`.

Point your orchestrator's liveness probe at `/api/v1/health` (dependency-free)
and its readiness probe at `/api/v1/ready` (checks the database; reports mail
without failing on it).

### Website

```bash
pnpm build:web
node apps/web/.next/standalone/apps/web/server.js
```

The build produces a standalone output, so the deployed artefact does not carry
the monorepo's `node_modules`.

Set before building, since `NEXT_PUBLIC_*` values are inlined at build time:

- `API_BASE_URL` — how the Next.js **server** reaches the API (may be internal)
- `NEXT_PUBLIC_API_BASE_URL` — how the **browser** reaches it (must be public)
- `NEXT_PUBLIC_SITE_URL` — the canonical site URL, used for canonicals, sitemap and OpenGraph

### Email

The default `EMAIL_PROVIDER=console` logs messages instead of sending them, and
reports `delivered: false` rather than claiming a send that did not happen. For
real delivery set `EMAIL_PROVIDER=smtp` with your provider's SMTP settings
(Postmark, Resend, SES and Mailgun all work), plus `EMAIL_FROM` and
`EMAIL_NOTIFICATIONS_TO`. Locally, `docker compose --profile mail up -d mailpit`
gives you an inbox at http://localhost:8025.

### File storage

`STORAGE_DRIVER=local` keeps files under `STORAGE_LOCAL_ROOT`, outside any
web-served directory, readable only through authorised routes. For S3-compatible
storage the driver is a declared boundary rather than a stub that pretends to
work — see [Outstanding business decisions](#outstanding-business-decisions).

---

## Enabling commerce

Commerce is **off by default**, and the system is honest about it: the storefront
shows resources as "in preparation", the checkout endpoint returns `503`, and no
code path can mark an order paid without verifying with the provider.

To switch it on:

1. **Choose a provider** and obtain test credentials.
   Paystack suits an NGN-first market; Stripe suits GBP/USD.
2. **Complete the integration.** Paystack's webhook signature verification and
   server-side verify call are implemented
   (`apps/api/src/modules/payments/providers/paystack.provider.ts`). Stripe's
   webhook signature verification is implemented; session creation and payment
   verification are not — they are explicit boundaries that throw rather than
   returning a plausible result.
3. **Attach a deliverable** to the product in the admin portal, set a price and
   currency, and publish refund terms. Activation is refused without all four.
4. **Configure the environment:**
   ```
   COMMERCE_ENABLED=true
   PAYMENT_PROVIDER=paystack
   PAYSTACK_SECRET_KEY=sk_test_…
   PAYMENT_CURRENCY=NGN
   DOWNLOAD_LINK_SECRET=…
   NEXT_PUBLIC_COMMERCE_ENABLED=true   # website, at build time
   ```
   Startup validation refuses `COMMERCE_ENABLED=true` without a real provider
   and its credentials.
5. **Point the provider's webhook** at `POST /api/v1/payments/webhook`.
6. **Test end to end in test mode**: a real test-mode payment, a verified
   webhook, an order marked paid, a delivery provisioned, an email sent, and a
   working time-limited download link. Then test the failure paths: a wrong
   amount, a replayed webhook, an expired link, an exhausted download allowance.
7. **Only then** enable it in production.

### What is already guaranteed

- The price is read from the product server-side on every checkout; the request
  body carries no amount at all.
- An order is marked paid only after the provider confirms the amount and
  currency match the stored order.
- Webhook signatures are verified over the **raw** request body.
- Redelivered webhooks are no-ops, enforced by a unique constraint on the
  provider event id.
- Download links are signed, time-limited and attempt-limited; the counter is
  decremented with a conditional update, so two simultaneous requests cannot both
  consume the last attempt.
- Product files are never in a publicly served directory.
- A payment is never simulated. The null provider refuses every operation.

---

## Operations

### Backup and restore

```bash
# Backup
pg_dump --format=custom --no-owner --no-acl "$DATABASE_URL" > inkvision-$(date +%F).dump

# Restore
pg_restore --clean --if-exists --no-owner --no-acl --dbname="$DATABASE_URL" inkvision-2026-01-01.dump
```

Back up the file-storage root alongside the database: product deliverables and
uploaded images live there, and a database restore without them leaves
references to files that no longer exist. Take a backup before every
`migrate deploy` in production, and test a restore into a scratch database on a
schedule — an untested backup is a hope, not a plan.

### Logging

Structured JSON through Pino, pretty-printed in development. Every request gets
a correlation id, returned in the `X-Request-Id` header and in every error body,
so a support conversation ties to a specific log line. Credentials, cookies and
personal fields are redacted before anything reaches a sink. Set `LOG_LEVEL`
(`debug` locally, `info` in production).

### Health checks

- `GET /api/v1/health` — liveness. Touches nothing, so a database blip does not
  cause a restart loop.
- `GET /api/v1/ready` — readiness. Checks the database (required) and mail
  (reported, not required). Returns `503` when not ready.

---

## Outstanding business decisions

Everything below needs a decision or an asset from InkVision Creatives. Each is
built so that supplying the missing piece is a configuration or content change,
not a code change.

### Brand assets

1. **Logo.** No logo file was supplied, so the wordmark is typographic
   (`apps/web/src/components/site/logo.tsx`). Drop in an SVG and replace that one
   component.
2. **Exact brand colours.** The royal blue and gold are cohesive provisional
   values, centralised as CSS variables in `apps/web/src/app/globals.css`.
   Replace the `--color-royal-*` and `--color-gold-*` ramps with the
   authoritative values in one edit.
3. **Photography and imagery.** None supplied. The homepage hero uses an
   original typographic composition — an annotated draft — rather than stock
   imagery or an AI-generated corporate visual.

### Content

4. **Founder biography and photograph.** The brief supplies the studio's
   positioning but no approved personal biography, and inventing one about a
   real person is not acceptable. `/about` describes how the studio works and
   invites the conversation instead. Add an `Author` record and update the
   leadership section once a biography is approved.
5. **Testimonials.** The sample quotes in the strategy document have **not** been
   seeded. The schema requires an explicit `isApproved` flag plus publication,
   and the homepage section renders nothing until both are set. Confirm which
   quotes are authorised, from whom, and in what wording.
6. **Case studies.** None seeded, because none were supplied as completed and
   client-approved. The public page shows a considered empty state. Add real
   work through the portfolio CMS; commissioned work needs recorded client
   approval before it can be published.
7. **Articles.** Seven commissioning briefs are seeded as **drafts**, carrying the
   argument each piece should make. They are not finished articles and the public
   site does not present them as such.

### Commercial

8. **Product pricing, file and refund terms.** The Personal Branding Blueprint is
   listed as `COMING_SOON` with no price, no file and no refund terms, so the
   system correctly reports it as not purchasable. Supply all three, then follow
   [Enabling commerce](#enabling-commerce).
9. **Payment provider.** Not chosen. Paystack is implemented to the point of
   signature verification and server-side verify; Stripe's session creation and
   verification remain declared boundaries.
10. **Service pricing.** No fixed pricing or delivery guarantee was supplied, and
    none is invented. Services are enquiry-based throughout.

### Legal and contact

11. **Registered legal identity.** `legalEntityName` is unset; the footer falls
    back to the trading name. Set it in Settings.
12. **Legal page review.** All three templates are flagged `awaitingReview`, which
    renders a visible notice on each page. They are a workable starting point and
    **are not legal advice**. Placeholders in square brackets need completing, and
    the liability, governing-law and digital-content cancellation sections need a
    qualified adviser — the right answers differ materially between Nigeria, the
    UK and the EU. Clear the flag in the admin portal once reviewed.
13. **Contact details.** No public email, phone or address supplied. The footer
    and contact page adapt, and the enquiry form works regardless.
14. **Social profiles.** None supplied; the footer omits the row and the
    structured data omits `sameAs` rather than asserting profiles that may not
    exist.
15. **Display timezone.** Dates render in `Europe/London`
    (`apps/web/src/lib/utils.ts`). Change it to the studio's own timezone — a
    fixed zone, not the visitor's locale, so server and client renders agree.

### Optional integrations

16. **Scheduling provider.** Set `SCHEDULING_PROVIDER` and `SCHEDULING_EMBED_URL`
    to surface a "book a discovery call" link. Both are required, so the site
    never shows a dead affordance. The enquiry form works independently.
17. **S3-compatible storage.** `apps/api/src/storage/s3.driver.ts` is a declared
    boundary that throws rather than silently losing a file. Install
    `@aws-sdk/client-s3` and implement the five methods; nothing above the driver
    interface needs to change.
18. **Rich-text editing.** Article bodies are edited as HTML in a textarea, and
    sanitised server-side on write. A block editor can be swapped into
    `apps/web/src/components/admin/article-editor.tsx` without touching the API,
    because sanitisation does not depend on the editor.
19. **Breached-password check.** Password strength uses a length floor and a short
    denylist. A Pwned Passwords k-anonymity check in
    `apps/api/src/modules/auth/password.service.ts` would be a worthwhile
    addition.

---

## Licence

Proprietary. © InkVision Creatives.

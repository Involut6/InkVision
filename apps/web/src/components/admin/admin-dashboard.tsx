'use client';

import { useQuery } from '@tanstack/react-query';
import { FileText, Inbox, Mail, Package, ScrollText } from 'lucide-react';
import Link from 'next/link';

import { EnquiryStatusBadge } from '@/components/admin/status-badge';
import { Button } from '@/components/ui/button';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { Heading, Meta } from '@/components/ui/typography';
import { useAdminApi } from '@/lib/admin/use-admin-api';
import { formatDate, formatRelative, pluralise } from '@/lib/utils';
import { ENQUIRY_STATUSES, type AdminDashboardDto } from '@inkvision/shared-types';

import { AdminPage } from './admin-page';

/**
 * The dashboard.
 *
 * All figures come from one aggregate endpoint, so the numbers on screen are
 * internally consistent rather than assembled from several independently-timed
 * requests.
 */
export function AdminDashboard() {
  const call = useAdminApi();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: () => call<AdminDashboardDto>('/admin/dashboard'),
  });

  if (isLoading) {
    return (
      <AdminPage title="Dashboard">
        <LoadingState label="Loading your dashboard" />
      </AdminPage>
    );
  }

  if (error || !data) {
    return (
      <AdminPage title="Dashboard">
        <ErrorState
          description="We could not load the dashboard. The API may be unavailable."
          action={
            <Button variant="outline" onClick={() => void refetch()}>
              Try again
            </Button>
          }
        />
      </AdminPage>
    );
  }

  const openEnquiries = data.enquiries.byStatus.NEW + data.enquiries.byStatus.REVIEWING;

  return (
    <AdminPage
      title="Dashboard"
      description={`Figures for ${formatDate(data.range.from)} to ${formatDate(data.range.to)}.`}
      actions={
        <Button asChild variant="outline">
          <Link href="/admin/enquiries">View all enquiries</Link>
        </Button>
      }
    >
      <div className="flex flex-col gap-10">
        {/* --- Headline figures --------------------------------------------- */}
        <section aria-labelledby="figures-heading">
          <h3 id="figures-heading" className="sr-only">
            Headline figures
          </h3>

          <div className="[&>*]:ring-border-subtle grid gap-px sm:grid-cols-2 lg:grid-cols-4 [&>*]:ring-1">
            <StatTile
              icon={<Inbox className="size-4" />}
              label="Enquiries in range"
              value={data.enquiries.inRange}
              detail={`${data.enquiries.total} in total`}
            />
            <StatTile
              icon={<Inbox className="size-4" />}
              label="Awaiting attention"
              value={openEnquiries}
              detail={openEnquiries === 0 ? 'Nothing waiting' : 'New or under review'}
              emphasis={openEnquiries > 0}
            />
            <StatTile
              icon={<FileText className="size-4" />}
              label="Published articles"
              value={data.content.publishedArticles}
              detail={`${pluralise(data.content.draftArticles, 'draft')}`}
            />
            <StatTile
              icon={<Mail className="size-4" />}
              label="Newsletter subscribers"
              value={data.content.newsletterSubscribers}
              detail="Confirmed and active"
            />
          </div>
        </section>

        {/* --- Enquiries by status ------------------------------------------ */}
        <section aria-labelledby="status-heading">
          <Heading level={3} id="status-heading" className="text-[1.0625rem]">
            Enquiries by status
          </Heading>

          <ul className="[&>*]:ring-border-subtle mt-4 grid gap-px sm:grid-cols-3 lg:grid-cols-6 [&>*]:ring-1">
            {ENQUIRY_STATUSES.map((status) => (
              <li key={status} className="bg-surface-raised p-4">
                <EnquiryStatusBadge status={status} />
                <p className="tabular text-content-primary mt-3 font-serif text-2xl">
                  {data.enquiries.byStatus[status]}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <div className="grid gap-10 lg:grid-cols-2">
          {/* --- Recent enquiries ------------------------------------------- */}
          <section aria-labelledby="recent-heading">
            <Heading level={3} id="recent-heading" className="text-[1.0625rem]">
              Recent enquiries
            </Heading>

            {data.enquiries.recent.length > 0 ? (
              <ul className="[&>*]:ring-border-subtle mt-4 flex flex-col gap-px [&>*]:ring-1">
                {data.enquiries.recent.map((enquiry) => (
                  <li key={enquiry.id}>
                    <Link
                      href={`/admin/enquiries/${enquiry.id}`}
                      className="bg-surface-raised hover:bg-surface-sunken flex items-start justify-between gap-4 p-4 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="text-content-primary truncate text-sm font-semibold">
                          {enquiry.fullName}
                        </p>
                        <Meta className="truncate">{enquiry.workEmail}</Meta>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1.5">
                        <EnquiryStatusBadge status={enquiry.status} />
                        <Meta>{formatRelative(enquiry.createdAt)}</Meta>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                className="mt-4"
                title="No enquiries yet"
                description="New enquiries from the website will appear here as they arrive."
              />
            )}
          </section>

          {/* --- Content and recent activity --------------------------------- */}
          <section aria-labelledby="content-heading">
            <Heading level={3} id="content-heading" className="text-[1.0625rem]">
              Content
            </Heading>

            <dl className="[&>*]:ring-border-subtle mt-4 flex flex-col gap-px [&>*]:ring-1">
              <ContentRow
                icon={<ScrollText className="size-4" />}
                label="Case studies"
                value={`${data.content.publishedCaseStudies} published · ${data.content.draftCaseStudies} draft`}
                href="/admin/work"
              />
              <ContentRow
                icon={<FileText className="size-4" />}
                label="Articles"
                value={`${data.content.publishedArticles} published · ${data.content.draftArticles} draft`}
                href="/admin/insights"
              />
              <ContentRow
                icon={<Package className="size-4" />}
                label="Resources"
                value={`${data.content.activeProducts} available of ${data.content.totalProducts}`}
                href="/admin/resources"
              />
            </dl>

            <Heading level={3} className="mt-8 text-[1.0625rem]">
              Recent activity
            </Heading>

            {data.recentActivity.length > 0 ? (
              <ul className="mt-4 flex flex-col gap-3">
                {data.recentActivity.map((entry) => (
                  <li key={entry.id} className="border-border-subtle border-t pt-3">
                    <p className="text-content-secondary text-sm">{entry.summary}</p>
                    <Meta className="mt-0.5">
                      {entry.actorEmail ? `${entry.actorEmail} · ` : ''}
                      {formatRelative(entry.createdAt)}
                    </Meta>
                  </li>
                ))}
              </ul>
            ) : (
              <Meta className="mt-4">No administrative activity recorded yet.</Meta>
            )}
          </section>
        </div>
      </div>
    </AdminPage>
  );
}

function StatTile({
  icon,
  label,
  value,
  detail,
  emphasis = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  detail: string;
  emphasis?: boolean;
}) {
  return (
    <div className="bg-surface-raised p-5">
      <div className="text-content-muted flex items-center gap-2">
        <span aria-hidden="true" className={emphasis ? 'text-accent' : undefined}>
          {icon}
        </span>
        <span className="text-meta font-semibold tracking-[0.08em] uppercase">{label}</span>
      </div>
      <p className="tabular text-content-primary mt-3 font-serif text-3xl">{value}</p>
      <Meta className="mt-1">{detail}</Meta>
    </div>
  );
}

function ContentRow({
  icon,
  label,
  value,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  href: string;
}) {
  return (
    <div className="bg-surface-raised">
      <Link
        href={href}
        className="hover:bg-surface-sunken flex items-center justify-between gap-4 p-4 transition-colors"
      >
        <dt className="text-content-primary flex items-center gap-2.5 text-sm font-medium">
          <span aria-hidden="true" className="text-content-muted">
            {icon}
          </span>
          {label}
        </dt>
        <dd className="text-content-secondary text-right text-sm">{value}</dd>
      </Link>
    </div>
  );
}

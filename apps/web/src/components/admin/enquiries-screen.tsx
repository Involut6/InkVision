'use client';

import { useQuery } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { AdminDataTable, type Column } from '@/components/admin/admin-data-table';
import { AdminPage } from '@/components/admin/admin-page';
import { EnquiryStatusBadge } from '@/components/admin/status-badge';
import { Button } from '@/components/ui/button';
import { Meta } from '@/components/ui/typography';
import { useAdminApi } from '@/lib/admin/use-admin-api';
import { useAuthStore } from '@/lib/admin/auth-store';
import { publicEnv } from '@/lib/env';
import { formatDate, formatRelative } from '@/lib/utils';
import {
  ENQUIRY_STATUSES,
  ENQUIRY_STATUS_LABELS,
  SERVICE_INTERESTS,
  SERVICE_INTEREST_LABELS,
  type EnquirySummaryDto,
  type EnquiryStatus,
  type Paginated,
  type ServiceInterest,
} from '@inkvision/shared-types';

const PER_PAGE = 20;

export function EnquiriesScreen() {
  const call = useAdminApi();
  const can = useAuthStore((state) => state.can);

  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<EnquiryStatus | ''>('');
  const [service, setService] = useState<ServiceInterest | ''>('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const query = useQuery({
    queryKey: ['admin', 'enquiries', { page, status, service, search }],
    queryFn: () =>
      call<Paginated<EnquirySummaryDto>>('/admin/enquiries', {
        query: {
          page,
          perPage: PER_PAGE,
          status: status || undefined,
          serviceInterest: service || undefined,
          search: search || undefined,
        },
      }),
  });

  const columns: Column<EnquirySummaryDto>[] = [
    {
      key: 'name',
      header: 'Enquirer',
      render: (row) => (
        <Link
          href={`/admin/enquiries/${row.id}`}
          className="text-content-primary decoration-border-strong hover:text-brand font-medium underline underline-offset-4"
        >
          {row.fullName}
          <span className="text-meta text-content-muted mt-0.5 block font-normal">
            {row.workEmail}
          </span>
        </Link>
      ),
    },
    {
      key: 'service',
      header: 'Service',
      hideOnMobile: true,
      render: (row) => (
        <span className="text-content-secondary">
          {SERVICE_INTEREST_LABELS[row.serviceInterest]}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <EnquiryStatusBadge status={row.status} />,
    },
    {
      key: 'reference',
      header: 'Reference',
      hideOnMobile: true,
      render: (row) => <span className="tabular font-mono text-xs">{row.reference}</span>,
    },
    {
      key: 'received',
      header: 'Received',
      render: (row) => (
        <span className="text-content-secondary" title={formatDate(row.createdAt)}>
          {formatRelative(row.createdAt)}
        </span>
      ),
    },
  ];

  /**
   * The CSV export is a plain link to the API rather than a fetch, so the
   * browser handles the download. It carries the current filters, and the
   * endpoint requires the `enquiry:export` permission and records the export
   * in the audit trail.
   */
  const exportUrl = (() => {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (service) params.set('serviceInterest', service);
    const query = params.toString();
    return `${publicEnv.apiBaseUrl}/admin/enquiries/export${query ? `?${query}` : ''}`;
  })();

  return (
    <AdminPage
      title="Enquiries"
      description="Every enquiry submitted through the website, with its status and history."
      actions={
        can('enquiry:export') ? (
          <Button asChild variant="outline">
            <a href={exportUrl} download>
              <Download aria-hidden="true" />
              Export CSV
            </a>
          </Button>
        ) : undefined
      }
    >
      <form
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          setSearch(searchInput.trim());
          setPage(1);
        }}
        className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end"
      >
        <div className="flex min-w-48 flex-1 flex-col gap-1.5">
          <label
            htmlFor="enquiry-search"
            className="text-meta text-content-secondary font-semibold"
          >
            Search
          </label>
          <input
            id="enquiry-search"
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Name, email, organisation or reference"
            className="border-border-strong bg-surface-raised h-11 border px-3.5 text-sm"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="enquiry-status"
            className="text-meta text-content-secondary font-semibold"
          >
            Status
          </label>
          <select
            id="enquiry-status"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as EnquiryStatus | '');
              setPage(1);
            }}
            className="border-border-strong bg-surface-raised h-11 border px-3 text-sm"
          >
            <option value="">All statuses</option>
            {ENQUIRY_STATUSES.map((value) => (
              <option key={value} value={value}>
                {ENQUIRY_STATUS_LABELS[value]}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="enquiry-service"
            className="text-meta text-content-secondary font-semibold"
          >
            Service
          </label>
          <select
            id="enquiry-service"
            value={service}
            onChange={(event) => {
              setService(event.target.value as ServiceInterest | '');
              setPage(1);
            }}
            className="border-border-strong bg-surface-raised h-11 border px-3 text-sm"
          >
            <option value="">All services</option>
            {SERVICE_INTERESTS.map((value) => (
              <option key={value} value={value}>
                {SERVICE_INTEREST_LABELS[value]}
              </option>
            ))}
          </select>
        </div>

        <Button type="submit" variant="outline">
          Apply
        </Button>
      </form>

      {query.data ? (
        <Meta aria-live="polite" className="mt-5">
          {query.data.meta.total === 0
            ? 'No enquiries match these filters.'
            : `${query.data.meta.total} ${query.data.meta.total === 1 ? 'enquiry' : 'enquiries'}.`}
        </Meta>
      ) : null}

      <AdminDataTable
        className="mt-4"
        caption="Enquiries, newest first"
        rows={query.data?.data ?? []}
        columns={columns}
        getRowKey={(row) => row.id}
        isLoading={query.isLoading}
        error={query.error}
        onRetry={() => void query.refetch()}
        emptyTitle="No enquiries yet"
        emptyDescription="Enquiries submitted through the website contact form will appear here."
      />

      {query.data && query.data.meta.totalPages > 1 ? (
        <nav aria-label="Pagination" className="mt-8 flex items-center justify-between gap-4">
          <Button
            variant="outline"
            disabled={!query.data.meta.hasPreviousPage}
            onClick={() => setPage((value) => Math.max(1, value - 1))}
          >
            Previous
          </Button>
          <Meta className="tabular">
            Page {query.data.meta.page} of {query.data.meta.totalPages}
          </Meta>
          <Button
            variant="outline"
            disabled={!query.data.meta.hasNextPage}
            onClick={() => setPage((value) => value + 1)}
          >
            Next
          </Button>
        </nav>
      ) : null}
    </AdminPage>
  );
}

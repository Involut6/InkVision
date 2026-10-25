'use client';

import { useQuery } from '@tanstack/react-query';

import { AdminDataTable, type Column } from '@/components/admin/admin-data-table';
import { AdminPage } from '@/components/admin/admin-page';
import { Badge } from '@/components/ui/badge';
import { Meta } from '@/components/ui/typography';
import { useAdminApi } from '@/lib/admin/use-admin-api';
import { formatDate } from '@/lib/utils';
import type { NewsletterSubscriberDto, Paginated } from '@inkvision/shared-types';

export function NewsletterScreen() {
  const call = useAdminApi();

  const list = useQuery({
    queryKey: ['admin', 'newsletter'],
    queryFn: () =>
      call<Paginated<NewsletterSubscriberDto>>('/admin/newsletter/subscribers', {
        query: { perPage: 50 },
      }),
  });

  const columns: Column<NewsletterSubscriberDto>[] = [
    {
      key: 'email',
      header: 'Email',
      render: (row) => <span className="text-content-primary">{row.email}</span>,
    },
    {
      key: 'name',
      header: 'Name',
      hideOnMobile: true,
      render: (row) => <span className="text-content-secondary">{row.fullName ?? '—'}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <Badge tone={row.status === 'SUBSCRIBED' ? 'success' : 'neutral'}>
          {row.status.charAt(0) + row.status.slice(1).toLowerCase()}
        </Badge>
      ),
    },
    {
      key: 'source',
      header: 'Source',
      hideOnMobile: true,
      render: (row) => <span className="text-content-secondary">{row.source ?? '—'}</span>,
    },
    {
      key: 'subscribed',
      header: 'Subscribed',
      render: (row) => (
        <span className="text-content-secondary">
          {row.subscribedAt ? formatDate(row.subscribedAt) : '—'}
        </span>
      ),
    },
  ];

  return (
    <AdminPage
      title="Newsletter"
      description="Everyone who has consented to receive the newsletter, and when."
    >
      <Meta className="max-w-measure">
        Every subscriber here gave explicit consent through the website, and every email we send
        carries a one-click unsubscribe link. Exporting this list is not available from the portal:
        the list is held to be used from within the system rather than copied out of it.
      </Meta>

      <AdminDataTable
        className="mt-6"
        caption="Newsletter subscribers"
        rows={list.data?.data ?? []}
        columns={columns}
        getRowKey={(row) => row.id}
        isLoading={list.isLoading}
        error={list.error}
        onRetry={() => void list.refetch()}
        emptyTitle="No subscribers yet"
        emptyDescription="People who subscribe through the website will appear here."
      />
    </AdminPage>
  );
}

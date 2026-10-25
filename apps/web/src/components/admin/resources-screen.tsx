'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Info } from 'lucide-react';
import { useState } from 'react';

import { AdminDataTable, type Column } from '@/components/admin/admin-data-table';
import { AdminPage } from '@/components/admin/admin-page';
import { ProductStatusBadge } from '@/components/admin/status-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Meta } from '@/components/ui/typography';
import { useAdminApi } from '@/lib/admin/use-admin-api';
import { useAuthStore } from '@/lib/admin/auth-store';
import { isApiError } from '@/lib/api-error';
import { formatMoney } from '@/lib/utils';
import {
  PRODUCT_STATUSES,
  PRODUCT_STATUS_LABELS,
  type ProductStatus,
  type ProductSummaryDto,
} from '@inkvision/shared-types';

type AdminProductRow = ProductSummaryDto & {
  hasDeliverable: boolean;
  blockedReason: string | null;
};

interface CommerceStatus {
  enabled: boolean;
  provider: string;
  currency: string;
  reason: string | null;
}

/**
 * Resources CMS.
 *
 * The key behaviour is that a product cannot be made ACTIVE until it has a
 * price, a currency, refund terms and an attached deliverable file. The server
 * enforces that; this screen shows the reason so it is actionable rather than a
 * surprise.
 */
export function ResourcesScreen() {
  const call = useAdminApi();
  const queryClient = useQueryClient();
  const can = useAuthStore((state) => state.can);
  const [actionError, setActionError] = useState<string | null>(null);

  const list = useQuery({
    queryKey: ['admin', 'products'],
    queryFn: () => call<AdminProductRow[]>('/admin/products'),
  });

  const commerce = useQuery({
    queryKey: ['admin', 'commerce-status'],
    queryFn: () => call<CommerceStatus>('/commerce/status'),
  });

  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ProductStatus }) =>
      call(`/admin/products/${id}/status`, { method: 'POST', json: { status } }),
    onSuccess: () => {
      setActionError(null);
      void queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
    },
    onError: (error) =>
      setActionError(
        isApiError(error)
          ? Object.values(error.details ?? {})
              .flat()
              .join(' ') || error.userMessage
          : 'That status change could not be completed.',
      ),
  });

  const columns: Column<AdminProductRow>[] = [
    {
      key: 'title',
      header: 'Resource',
      render: (row) => (
        <div>
          <p className="text-content-primary font-medium">{row.title}</p>
          <Meta className="mt-0.5 line-clamp-1">{row.summary}</Meta>
        </div>
      ),
    },
    {
      key: 'price',
      header: 'Price',
      render: (row) =>
        row.price ? (
          <span className="tabular text-content-primary">{formatMoney(row.price)}</span>
        ) : (
          <Meta>Not set</Meta>
        ),
    },
    {
      key: 'file',
      header: 'File',
      hideOnMobile: true,
      render: (row) => (
        <Badge tone={row.hasDeliverable ? 'success' : 'warning'}>
          {row.hasDeliverable ? 'Attached' : 'Missing'}
        </Badge>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <ProductStatusBadge status={row.status} />,
    },
    {
      key: 'purchasable',
      header: 'Purchasable',
      render: (row) =>
        row.purchasable ? (
          <Badge tone="success">Yes</Badge>
        ) : (
          <span title={row.blockedReason ?? undefined}>
            <Badge tone="neutral">No</Badge>
          </span>
        ),
    },
    {
      key: 'actions',
      header: 'Change status',
      className: 'w-px whitespace-nowrap',
      render: (row) =>
        can('product:write') ? (
          <div className="flex flex-wrap gap-1.5">
            {PRODUCT_STATUSES.filter((value) => value !== row.status).map((value) => (
              <Button
                key={value}
                size="sm"
                variant="ghost"
                disabled={setStatus.isPending}
                onClick={() => setStatus.mutate({ id: row.id, status: value })}
              >
                {PRODUCT_STATUS_LABELS[value]}
              </Button>
            ))}
          </div>
        ) : (
          <Meta>—</Meta>
        ),
    },
  ];

  return (
    <AdminPage
      title="Resources"
      description="Digital products for the public storefront. A product only becomes purchasable when it can actually be delivered."
    >
      {/* Commerce state is reported exactly as the running deployment sees it,
          so nobody tries to activate a product on a server that cannot sell. */}
      {commerce.data && !commerce.data.enabled ? (
        <div className="bg-accent-soft ring-border-accent flex items-start gap-3 p-4 ring-1">
          <Info aria-hidden="true" className="text-gold-700 mt-0.5 size-4 shrink-0" />
          <div className="text-gold-700 text-sm leading-relaxed">
            <p className="font-semibold">Commerce is switched off on this deployment.</p>
            <p className="mt-1">
              {commerce.data.reason ?? 'No payment provider is configured.'} Products can still be
              prepared and marked available, but no purchase can complete until a provider is
              configured and tested. See the README section “Enabling commerce”.
            </p>
          </div>
        </div>
      ) : null}

      {actionError ? (
        <p
          role="alert"
          className="bg-danger-soft text-danger ring-danger/25 mt-5 px-4 py-3 text-sm ring-1"
        >
          {actionError}
        </p>
      ) : null}

      <AdminDataTable
        className="mt-6"
        caption="Digital resources"
        rows={list.data ?? []}
        columns={columns}
        getRowKey={(row) => row.id}
        isLoading={list.isLoading}
        error={list.error}
        onRetry={() => void list.refetch()}
        emptyTitle="No resources yet"
        emptyDescription="Digital products will appear here once they have been created."
      />

      {(list.data ?? []).some((row) => row.blockedReason) ? (
        <section aria-labelledby="blocked-heading" className="mt-8">
          <h3 id="blocked-heading" className="text-content-primary text-sm font-semibold">
            Why some resources are not purchasable
          </h3>
          <ul className="mt-3 flex flex-col gap-2">
            {(list.data ?? [])
              .filter((row) => row.blockedReason)
              .map((row) => (
                <li key={row.id} className="border-border-subtle border-t pt-2">
                  <Meta>
                    <strong className="text-content-primary font-semibold">{row.title}</strong> —{' '}
                    {row.blockedReason}
                  </Meta>
                </li>
              ))}
          </ul>
        </section>
      ) : null}
    </AdminPage>
  );
}

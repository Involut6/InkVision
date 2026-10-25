'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle } from 'lucide-react';
import { useState } from 'react';

import { AdminDataTable, type Column } from '@/components/admin/admin-data-table';
import { AdminPage } from '@/components/admin/admin-page';
import { PublicationStatusBadge } from '@/components/admin/status-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Meta } from '@/components/ui/typography';
import { useAdminApi } from '@/lib/admin/use-admin-api';
import { useAuthStore } from '@/lib/admin/auth-store';
import { isApiError } from '@/lib/api-error';
import {
  WORK_KIND_LABELS,
  type CaseStudySummaryDto,
  type Paginated,
  type PublicationStatus,
} from '@inkvision/shared-types';

type AdminCaseStudyRow = CaseStudySummaryDto & {
  status: PublicationStatus;
  clientApproved: boolean;
  outcomesVerified: boolean;
};

/**
 * Portfolio CMS.
 *
 * Publication is refused server-side for commissioned client work without
 * recorded approval. This screen surfaces that state before the attempt, so an
 * editor can see why a row cannot be published rather than discovering it in an
 * error.
 */
export function WorkScreen() {
  const call = useAdminApi();
  const queryClient = useQueryClient();
  const can = useAuthStore((state) => state.can);
  const [actionError, setActionError] = useState<string | null>(null);

  const list = useQuery({
    queryKey: ['admin', 'case-studies'],
    queryFn: () =>
      call<Paginated<AdminCaseStudyRow>>('/admin/case-studies', { query: { perPage: 50 } }),
  });

  const transition = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'publish' | 'unpublish' }) =>
      call(`/admin/case-studies/${id}/${action}`, { method: 'POST', json: {} }),
    onSuccess: () => {
      setActionError(null);
      void queryClient.invalidateQueries({ queryKey: ['admin', 'case-studies'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
    },
    onError: (error) =>
      setActionError(
        isApiError(error)
          ? Object.values(error.details ?? {})
              .flat()
              .join(' ') || error.userMessage
          : 'That action could not be completed.',
      ),
  });

  const blockedReason = (row: AdminCaseStudyRow): string | null => {
    if (row.kind === 'COMMISSIONED' && !row.clientApproved) {
      return 'Client approval has not been recorded.';
    }
    return null;
  };

  const columns: Column<AdminCaseStudyRow>[] = [
    {
      key: 'title',
      header: 'Title',
      render: (row) => (
        <div>
          <p className="text-content-primary font-medium">{row.title}</p>
          <Meta className="mt-0.5 line-clamp-1">{row.summary}</Meta>
        </div>
      ),
    },
    {
      key: 'kind',
      header: 'Type',
      render: (row) => (
        <Badge tone={row.kind === 'COMMISSIONED' ? 'brand' : 'neutral'}>
          {WORK_KIND_LABELS[row.kind]}
        </Badge>
      ),
    },
    {
      key: 'approval',
      header: 'Approval',
      hideOnMobile: true,
      render: (row) =>
        row.kind === 'COMMISSIONED' ? (
          <Badge tone={row.clientApproved ? 'success' : 'warning'}>
            {row.clientApproved ? 'Client approved' : 'Awaiting approval'}
          </Badge>
        ) : (
          <Meta>Not required</Meta>
        ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <PublicationStatusBadge status={row.status} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'w-px whitespace-nowrap',
      render: (row) => {
        if (!can('case_study:publish')) return <Meta>—</Meta>;
        const blocked = blockedReason(row);

        return row.status === 'PUBLISHED' ? (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => transition.mutate({ id: row.id, action: 'unpublish' })}
          >
            Unpublish
          </Button>
        ) : (
          <Button
            size="sm"
            variant="ghost"
            disabled={Boolean(blocked)}
            title={blocked ?? undefined}
            onClick={() => transition.mutate({ id: row.id, action: 'publish' })}
          >
            Publish
          </Button>
        );
      },
    },
  ];

  return (
    <AdminPage
      title="Selected work"
      description="Case studies, samples and concepts. Commissioned client work needs recorded client approval before it can be published."
    >
      <div className="bg-accent-soft ring-border-accent flex items-start gap-3 p-4 ring-1">
        <AlertTriangle aria-hidden="true" className="text-gold-700 mt-0.5 size-4 shrink-0" />
        <p className="text-gold-700 text-sm leading-relaxed">
          Illustrative samples and concepts are labelled as such everywhere they appear on the
          website. Commissioned client work is published only with written approval, and verified
          outcomes are shown only where both the verification and the approval are recorded.
        </p>
      </div>

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
        caption="Case studies and samples"
        rows={list.data?.data ?? []}
        columns={columns}
        getRowKey={(row) => row.id}
        isLoading={list.isLoading}
        error={list.error}
        onRetry={() => void list.refetch()}
        emptyTitle="No case studies yet"
        emptyDescription="None have been created. The public work page shows a considered empty state rather than placeholder projects."
      />
    </AdminPage>
  );
}

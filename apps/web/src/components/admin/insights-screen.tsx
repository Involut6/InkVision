'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useState } from 'react';

import { AdminDataTable, type Column } from '@/components/admin/admin-data-table';
import { AdminPage } from '@/components/admin/admin-page';
import { ArticleEditor, type ArticleDraft } from '@/components/admin/article-editor';
import { PublicationStatusBadge } from '@/components/admin/status-badge';
import { Button } from '@/components/ui/button';
import { Meta } from '@/components/ui/typography';
import { useAdminApi } from '@/lib/admin/use-admin-api';
import { useAuthStore } from '@/lib/admin/auth-store';
import { isApiError } from '@/lib/api-error';
import { formatDate, formatRelative } from '@/lib/utils';
import {
  PUBLICATION_STATUSES,
  type ArticleSummaryDto,
  type Paginated,
  type PublicationStatus,
} from '@inkvision/shared-types';

type AdminArticleRow = ArticleSummaryDto & { status: PublicationStatus };

/**
 * The admin detail shape. The API returns raw database columns here (nullable
 * rather than absent), which is why the SEO fields are re-declared rather than
 * inherited from the public summary type.
 */
interface FullArticle extends Omit<ArticleSummaryDto, 'seoTitle' | 'seoDescription'> {
  status: PublicationStatus;
  bodyHtml: string;
  categoryId: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
}

/**
 * Insights CMS.
 *
 * Create, edit, publish, unpublish and archive. Publication is its own action
 * rather than a field on the form, which is what lets the server attach its own
 * validation (a summary and a non-empty body) and its own audit entry to it.
 */
export function InsightsScreen() {
  const call = useAdminApi();
  const queryClient = useQueryClient();
  const can = useAuthStore((state) => state.can);

  const [status, setStatus] = useState<PublicationStatus | ''>('');
  const [editing, setEditing] = useState<ArticleDraft | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const list = useQuery({
    queryKey: ['admin', 'articles', { status }],
    queryFn: () =>
      call<Paginated<AdminArticleRow>>('/admin/articles', {
        query: { perPage: 50, status: status || undefined },
      }),
  });

  const loadForEdit = useMutation({
    mutationFn: (id: string) => call<FullArticle>(`/admin/articles/${id}`),
    onSuccess: (article) =>
      setEditing({
        id: article.id,
        title: article.title,
        summary: article.summary,
        bodyHtml: article.bodyHtml,
        categoryId: article.categoryId,
        tagNames: article.tags.map((tag) => tag.name),
        seoTitle: article.seoTitle ?? undefined,
        seoDescription: article.seoDescription ?? undefined,
        featured: article.featured,
      }),
  });

  const transition = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'publish' | 'unpublish' | 'archive' }) =>
      call(`/admin/articles/${id}/${action}`, { method: 'POST', json: {} }),
    onSuccess: () => {
      setActionError(null);
      void queryClient.invalidateQueries({ queryKey: ['admin', 'articles'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
    },
    onError: (error) =>
      // Publishing is refused without a summary and body; the server's message
      // says which, so it is shown rather than replaced with a generic one.
      setActionError(
        isApiError(error)
          ? Object.values(error.details ?? {})
              .flat()
              .join(' ') || error.userMessage
          : 'That action could not be completed.',
      ),
  });

  const columns: Column<AdminArticleRow>[] = [
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
      key: 'category',
      header: 'Category',
      hideOnMobile: true,
      render: (row) => <span className="text-content-secondary">{row.category?.name ?? '—'}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <PublicationStatusBadge status={row.status} />,
    },
    {
      key: 'updated',
      header: 'Updated',
      hideOnMobile: true,
      render: (row) => (
        <span className="text-content-secondary" title={formatDate(row.updatedAt)}>
          {formatRelative(row.updatedAt)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'w-px whitespace-nowrap',
      render: (row) => (
        <div className="flex flex-wrap gap-1.5">
          {can('article:write') ? (
            <Button size="sm" variant="ghost" onClick={() => loadForEdit.mutate(row.id)}>
              Edit
            </Button>
          ) : null}

          {can('article:publish') ? (
            row.status === 'PUBLISHED' ? (
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
                onClick={() => transition.mutate({ id: row.id, action: 'publish' })}
              >
                Publish
              </Button>
            )
          ) : null}
        </div>
      ),
    },
  ];

  if (editing) {
    return (
      <AdminPage
        title={editing.id ? 'Edit article' : 'New article'}
        description="Drafts are never visible on the public website."
      >
        <ArticleEditor
          initial={editing}
          onSaved={() => setEditing(null)}
          onCancel={() => setEditing(null)}
        />
      </AdminPage>
    );
  }

  return (
    <AdminPage
      title="Insights"
      description="Articles for the public insights section. Only published pieces appear on the website."
      actions={
        can('article:write') ? (
          <Button
            onClick={() => setEditing({ title: '', summary: '', bodyHtml: '', tagNames: [] })}
          >
            <Plus aria-hidden="true" />
            New article
          </Button>
        ) : undefined
      }
    >
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="article-status"
            className="text-meta text-content-secondary font-semibold"
          >
            Status
          </label>
          <select
            id="article-status"
            value={status}
            onChange={(event) => setStatus(event.target.value as PublicationStatus | '')}
            className="border-border-strong bg-surface-raised h-11 border px-3 text-sm"
          >
            <option value="">All statuses</option>
            {PUBLICATION_STATUSES.map((value) => (
              <option key={value} value={value}>
                {value.charAt(0) + value.slice(1).toLowerCase()}
              </option>
            ))}
          </select>
        </div>
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
        className="mt-5"
        caption="Articles, most recently updated first"
        rows={list.data?.data ?? []}
        columns={columns}
        getRowKey={(row) => row.id}
        isLoading={list.isLoading}
        error={list.error}
        onRetry={() => void list.refetch()}
        emptyTitle="No articles yet"
        emptyDescription="Create a draft to get started. Nothing is published until you publish it."
      />
    </AdminPage>
  );
}

'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useId, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Meta } from '@/components/ui/typography';
import { useAdminApi } from '@/lib/admin/use-admin-api';
import { toFieldErrors } from '@/lib/api-error';
import type { ArticleCategoryDto } from '@inkvision/shared-types';

export interface ArticleDraft {
  id?: string;
  title: string;
  slug?: string;
  summary: string;
  bodyHtml: string;
  categoryId?: string | null;
  tagNames: string[];
  seoTitle?: string;
  seoDescription?: string;
  featured?: boolean;
}

/**
 * The article editor.
 *
 * The body is edited as HTML in a plain textarea rather than through a
 * rich-text widget. That is a deliberate, documented trade-off: a WYSIWYG
 * editor is a substantial dependency with its own sanitisation and
 * accessibility surface, and the markup is sanitised server-side on write
 * either way. See README → "Outstanding business decisions" for swapping in a
 * block editor later.
 */
export function ArticleEditor({
  initial,
  onSaved,
  onCancel,
}: {
  initial?: ArticleDraft;
  onSaved: (articleId: string) => void;
  onCancel: () => void;
}) {
  const call = useAdminApi();
  const queryClient = useQueryClient();
  const ids = {
    title: useId(),
    summary: useId(),
    body: useId(),
    category: useId(),
    tags: useId(),
    seoTitle: useId(),
    seoDescription: useId(),
  };

  const [draft, setDraft] = useState<ArticleDraft>(
    initial ?? { title: '', summary: '', bodyHtml: '', tagNames: [] },
  );
  const [tagsInput, setTagsInput] = useState(initial?.tagNames.join(', ') ?? '');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initial) {
      setDraft(initial);
      setTagsInput(initial.tagNames.join(', '));
    }
  }, [initial]);

  const categories = useQuery({
    queryKey: ['admin', 'article-categories'],
    queryFn: () => call<ArticleCategoryDto[]>('/articles/categories'),
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        title: draft.title,
        summary: draft.summary,
        bodyHtml: draft.bodyHtml,
        ...(draft.categoryId ? { categoryId: draft.categoryId } : {}),
        tagNames: tagsInput
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
        ...(draft.seoTitle ? { seoTitle: draft.seoTitle } : {}),
        ...(draft.seoDescription ? { seoDescription: draft.seoDescription } : {}),
        ...(draft.featured !== undefined ? { featured: draft.featured } : {}),
      };

      return draft.id
        ? call<{ id: string }>(`/admin/articles/${draft.id}`, { method: 'PATCH', json: payload })
        : call<{ id: string }>('/admin/articles', { method: 'POST', json: payload });
    },
    onSuccess: (saved) => {
      setFieldErrors({});
      void queryClient.invalidateQueries({ queryKey: ['admin', 'articles'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
      onSaved(saved.id);
    },
    onError: (error) => setFieldErrors(toFieldErrors(error)),
  });

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        save.mutate();
      }}
      className="flex flex-col gap-5"
    >
      <Field id={ids.title} label="Title" error={fieldErrors.title}>
        <input
          id={ids.title}
          value={draft.title}
          onChange={(event) => setDraft({ ...draft, title: event.target.value })}
          className={inputClass(Boolean(fieldErrors.title))}
        />
      </Field>

      <Field
        id={ids.summary}
        label="Summary"
        hint="Shown in listings, search results and social cards. At least 20 characters."
        error={fieldErrors.summary}
      >
        <textarea
          id={ids.summary}
          rows={2}
          value={draft.summary}
          onChange={(event) => setDraft({ ...draft, summary: event.target.value })}
          className={`${inputClass(Boolean(fieldErrors.summary))} h-auto py-2.5`}
        />
      </Field>

      <Field
        id={ids.body}
        label="Body"
        hint="HTML. Sanitised on the server against a narrow allowlist before it is stored."
        error={fieldErrors.bodyHtml}
      >
        <textarea
          id={ids.body}
          rows={16}
          value={draft.bodyHtml}
          onChange={(event) => setDraft({ ...draft, bodyHtml: event.target.value })}
          className={`${inputClass(Boolean(fieldErrors.bodyHtml))} h-auto py-2.5 font-mono text-xs leading-relaxed`}
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field id={ids.category} label="Category" error={fieldErrors.categoryId}>
          <select
            id={ids.category}
            value={draft.categoryId ?? ''}
            onChange={(event) => setDraft({ ...draft, categoryId: event.target.value || null })}
            className={inputClass(false)}
          >
            <option value="">No category</option>
            {(categories.data ?? []).map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </Field>

        <Field id={ids.tags} label="Tags" hint="Comma separated. Created on demand.">
          <input
            id={ids.tags}
            value={tagsInput}
            onChange={(event) => setTagsInput(event.target.value)}
            className={inputClass(false)}
          />
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          id={ids.seoTitle}
          label="SEO title"
          hint="Up to 70 characters."
          error={fieldErrors.seoTitle}
        >
          <input
            id={ids.seoTitle}
            value={draft.seoTitle ?? ''}
            onChange={(event) => setDraft({ ...draft, seoTitle: event.target.value })}
            maxLength={70}
            className={inputClass(Boolean(fieldErrors.seoTitle))}
          />
        </Field>

        <Field
          id={ids.seoDescription}
          label="SEO description"
          hint="Up to 180 characters."
          error={fieldErrors.seoDescription}
        >
          <input
            id={ids.seoDescription}
            value={draft.seoDescription ?? ''}
            onChange={(event) => setDraft({ ...draft, seoDescription: event.target.value })}
            maxLength={180}
            className={inputClass(Boolean(fieldErrors.seoDescription))}
          />
        </Field>
      </div>

      <div role="alert" aria-live="polite">
        {save.isError && Object.keys(fieldErrors).length === 0 ? (
          <p className="bg-danger-soft text-danger ring-danger/25 px-3 py-2.5 text-sm ring-1">
            We could not save that. Please check the fields and try again.
          </p>
        ) : null}
      </div>

      <div className="border-border-subtle flex flex-wrap items-center gap-3 border-t pt-5">
        <Button type="submit" disabled={save.isPending}>
          {save.isPending ? 'Saving…' : draft.id ? 'Save changes' : 'Create draft'}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Meta>New articles are always created as drafts.</Meta>
      </div>
    </form>
  );
}

function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-content-primary text-sm font-semibold">
        {label}
      </label>
      {hint ? <p className="text-meta text-content-muted">{hint}</p> : null}
      {children}
      {error ? (
        <p role="alert" className="text-meta text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function inputClass(hasError: boolean): string {
  return [
    'h-11 w-full border bg-surface-raised px-3.5 text-sm text-content-primary',
    hasError ? 'border-danger' : 'border-border-strong',
  ].join(' ');
}

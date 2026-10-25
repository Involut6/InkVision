'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { AdminPage } from '@/components/admin/admin-page';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ErrorState, LoadingState } from '@/components/ui/states';
import { Heading, Meta } from '@/components/ui/typography';
import { useAdminApi } from '@/lib/admin/use-admin-api';
import { useAuthStore } from '@/lib/admin/auth-store';
import { toFieldErrors } from '@/lib/api-error';
import type { LegalPageDto, SocialProfile } from '@inkvision/shared-types';

interface AdminSettings {
  siteName: string;
  tagline: string;
  supportingStatement: string;
  contactEmail: string | null;
  contactPhone: string | null;
  addressLines: string[];
  socialProfiles: SocialProfile[];
  newsletterEnabled: boolean;
  newsletterHeadline: string;
  newsletterBody: string;
  notificationEmail: string | null;
  defaultSeoTitle: string;
  defaultSeoDescription: string;
  legalEntityName: string | null;
  /** What the running deployment can actually do, as opposed to what is stored. */
  runtime: {
    commerceEnabled: boolean;
    paymentProvider: string;
    paymentCurrency: string;
    emailProvider: string;
    notificationRecipient: string | null;
    schedulingEnabled: boolean;
    storageDriver: string;
  };
}

export function SettingsScreen() {
  const call = useAdminApi();
  const queryClient = useQueryClient();
  const can = useAuthStore((state) => state.can);

  const settings = useQuery({
    queryKey: ['admin', 'settings'],
    queryFn: () => call<AdminSettings>('/admin/site-settings'),
  });

  const legal = useQuery({
    queryKey: ['admin', 'legal'],
    queryFn: () => call<LegalPageDto[]>('/admin/legal'),
  });

  const [form, setForm] = useState<Partial<AdminSettings>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (settings.data) {
      const { runtime: _runtime, ...editable } = settings.data;
      setForm(editable);
    }
  }, [settings.data]);

  const save = useMutation({
    mutationFn: () =>
      call('/admin/site-settings', {
        method: 'PATCH',
        json: {
          siteName: form.siteName,
          tagline: form.tagline,
          supportingStatement: form.supportingStatement,
          contactEmail: form.contactEmail || null,
          contactPhone: form.contactPhone || null,
          addressLines: form.addressLines ?? [],
          newsletterEnabled: form.newsletterEnabled,
          newsletterHeadline: form.newsletterHeadline,
          newsletterBody: form.newsletterBody,
          notificationEmail: form.notificationEmail || null,
          defaultSeoTitle: form.defaultSeoTitle,
          defaultSeoDescription: form.defaultSeoDescription,
          legalEntityName: form.legalEntityName || null,
        },
      }),
    onSuccess: () => {
      setFieldErrors({});
      void queryClient.invalidateQueries({ queryKey: ['admin', 'settings'] });
    },
    onError: (error) => setFieldErrors(toFieldErrors(error)),
  });

  if (settings.isLoading) {
    return (
      <AdminPage title="Settings">
        <LoadingState label="Loading settings" />
      </AdminPage>
    );
  }

  if (settings.error || !settings.data) {
    return (
      <AdminPage title="Settings">
        <ErrorState
          description="We could not load the site settings."
          action={
            <Button variant="outline" onClick={() => void settings.refetch()}>
              Try again
            </Button>
          }
        />
      </AdminPage>
    );
  }

  const runtime = settings.data.runtime;
  const editable = can('settings:write');

  return (
    <AdminPage
      title="Site settings"
      description="Contact details, SEO defaults, newsletter copy and legal pages."
    >
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)] lg:gap-12">
        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            save.mutate();
          }}
          className="flex flex-col gap-8"
        >
          <Fieldset legend="Identity">
            <TextField
              id="siteName"
              label="Site name"
              value={form.siteName ?? ''}
              onChange={(value) => setForm({ ...form, siteName: value })}
              error={fieldErrors.siteName}
              disabled={!editable}
            />
            <TextField
              id="tagline"
              label="Tagline"
              value={form.tagline ?? ''}
              onChange={(value) => setForm({ ...form, tagline: value })}
              error={fieldErrors.tagline}
              disabled={!editable}
            />
            <TextField
              id="supportingStatement"
              label="Supporting statement"
              multiline
              value={form.supportingStatement ?? ''}
              onChange={(value) => setForm({ ...form, supportingStatement: value })}
              error={fieldErrors.supportingStatement}
              disabled={!editable}
            />
            <TextField
              id="legalEntityName"
              label="Registered legal name"
              hint="Used in the footer copyright line and in the legal pages. Left blank until the business supplies it."
              value={form.legalEntityName ?? ''}
              onChange={(value) => setForm({ ...form, legalEntityName: value })}
              error={fieldErrors.legalEntityName}
              disabled={!editable}
            />
          </Fieldset>

          <Fieldset legend="Contact">
            <TextField
              id="contactEmail"
              label="Public contact email"
              type="email"
              hint="Shown in the footer and on the contact page. The enquiry form works whether or not this is set."
              value={form.contactEmail ?? ''}
              onChange={(value) => setForm({ ...form, contactEmail: value })}
              error={fieldErrors.contactEmail}
              disabled={!editable}
            />
            <TextField
              id="contactPhone"
              label="Public contact phone"
              value={form.contactPhone ?? ''}
              onChange={(value) => setForm({ ...form, contactPhone: value })}
              error={fieldErrors.contactPhone}
              disabled={!editable}
            />
            <TextField
              id="notificationEmail"
              label="Enquiry notification inbox"
              type="email"
              hint="Where new-enquiry notifications go. The EMAIL_NOTIFICATIONS_TO environment variable takes precedence at runtime."
              value={form.notificationEmail ?? ''}
              onChange={(value) => setForm({ ...form, notificationEmail: value })}
              error={fieldErrors.notificationEmail}
              disabled={!editable}
            />
          </Fieldset>

          <Fieldset legend="Newsletter">
            <label className="text-content-primary flex items-center gap-2.5 text-sm">
              <input
                type="checkbox"
                checked={form.newsletterEnabled ?? false}
                onChange={(event) => setForm({ ...form, newsletterEnabled: event.target.checked })}
                disabled={!editable}
                className="size-4 accent-[var(--color-brand)]"
              />
              Show the newsletter sign-up on the website
            </label>
            <TextField
              id="newsletterHeadline"
              label="Headline"
              value={form.newsletterHeadline ?? ''}
              onChange={(value) => setForm({ ...form, newsletterHeadline: value })}
              disabled={!editable}
            />
            <TextField
              id="newsletterBody"
              label="Body"
              multiline
              value={form.newsletterBody ?? ''}
              onChange={(value) => setForm({ ...form, newsletterBody: value })}
              disabled={!editable}
            />
          </Fieldset>

          <Fieldset legend="SEO defaults">
            <TextField
              id="defaultSeoTitle"
              label="Default title"
              hint="Used where a page does not set its own."
              value={form.defaultSeoTitle ?? ''}
              onChange={(value) => setForm({ ...form, defaultSeoTitle: value })}
              error={fieldErrors.defaultSeoTitle}
              disabled={!editable}
            />
            <TextField
              id="defaultSeoDescription"
              label="Default description"
              multiline
              value={form.defaultSeoDescription ?? ''}
              onChange={(value) => setForm({ ...form, defaultSeoDescription: value })}
              error={fieldErrors.defaultSeoDescription}
              disabled={!editable}
            />
          </Fieldset>

          {editable ? (
            <div className="border-border-subtle flex items-center gap-3 border-t pt-5">
              <Button type="submit" disabled={save.isPending}>
                {save.isPending ? 'Saving…' : 'Save settings'}
              </Button>
              {save.isSuccess ? (
                <p role="status" className="text-meta text-success">
                  Saved.
                </p>
              ) : null}
              {save.isError && Object.keys(fieldErrors).length === 0 ? (
                <p role="alert" className="text-meta text-danger">
                  Could not save. Please try again.
                </p>
              ) : null}
            </div>
          ) : (
            <Meta>Your role does not include editing site settings.</Meta>
          )}
        </form>

        <aside className="flex flex-col gap-8">
          {/* What the deployment can actually do. These come from server
              configuration, not the CMS, so an operator can see at a glance
              why a capability is or is not available. */}
          <section
            aria-labelledby="runtime-heading"
            className="bg-surface-raised ring-border-subtle p-5 ring-1"
          >
            <Heading level={3} id="runtime-heading" className="text-[1.0625rem]">
              This deployment
            </Heading>
            <Meta className="mt-1">
              Set by environment configuration, not here. Change these in your deployment and
              restart.
            </Meta>

            <dl className="mt-4 flex flex-col gap-3">
              <RuntimeRow
                label="Commerce"
                value={
                  runtime.commerceEnabled
                    ? `Enabled · ${runtime.paymentProvider} · ${runtime.paymentCurrency}`
                    : 'Disabled'
                }
                tone={runtime.commerceEnabled ? 'success' : 'neutral'}
              />
              <RuntimeRow
                label="Email"
                value={
                  runtime.emailProvider === 'console'
                    ? 'Console (logged, not sent)'
                    : runtime.emailProvider
                }
                tone={runtime.emailProvider === 'console' ? 'warning' : 'success'}
              />
              <RuntimeRow
                label="Notifications to"
                value={runtime.notificationRecipient ?? 'Not configured'}
                tone={runtime.notificationRecipient ? 'success' : 'warning'}
              />
              <RuntimeRow
                label="Scheduling"
                value={runtime.schedulingEnabled ? 'Configured' : 'Not configured'}
                tone={runtime.schedulingEnabled ? 'success' : 'neutral'}
              />
              <RuntimeRow label="File storage" value={runtime.storageDriver} tone="neutral" />
            </dl>
          </section>

          <section aria-labelledby="legal-heading">
            <Heading level={3} id="legal-heading" className="text-[1.0625rem]">
              Legal pages
            </Heading>

            {legal.data ? (
              <ul className="mt-4 flex flex-col gap-3">
                {legal.data.map((page) => (
                  <li key={page.slug} className="border-border-subtle border-t pt-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-content-primary text-sm font-medium">{page.title}</p>
                        <Meta className="mt-0.5 font-mono text-xs">/{page.slug}</Meta>
                      </div>
                      <Badge tone={page.awaitingReview ? 'warning' : 'success'}>
                        {page.awaitingReview ? 'Awaiting review' : 'Reviewed'}
                      </Badge>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <Meta className="mt-3">Loading…</Meta>
            )}

            <Meta className="mt-4">
              Pages flagged “awaiting review” display a visible notice on the website. Clear the
              flag only once the content has been reviewed by the business or its legal adviser.
            </Meta>
          </section>
        </aside>
      </div>
    </AdminPage>
  );
}

function Fieldset({ legend, children }: { legend: string; children: React.ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-4">
      <legend className="text-content-muted mb-2 text-sm font-semibold tracking-[0.08em] uppercase">
        {legend}
      </legend>
      {children}
    </fieldset>
  );
}

function TextField({
  id,
  label,
  value,
  onChange,
  hint,
  error,
  type = 'text',
  multiline = false,
  disabled = false,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  error?: string;
  type?: string;
  multiline?: boolean;
  disabled?: boolean;
}) {
  const className = [
    'w-full border bg-surface px-3.5 text-sm text-content-primary disabled:opacity-60',
    error ? 'border-danger' : 'border-border-strong',
    multiline ? 'py-2.5 leading-relaxed' : 'h-11',
  ].join(' ');

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-content-primary text-sm font-semibold">
        {label}
      </label>
      {hint ? (
        <p id={`${id}-hint`} className="text-meta text-content-muted">
          {hint}
        </p>
      ) : null}

      {multiline ? (
        <textarea
          id={id}
          rows={3}
          value={value}
          disabled={disabled}
          aria-describedby={hint ? `${id}-hint` : undefined}
          aria-invalid={error ? true : undefined}
          onChange={(event) => onChange(event.target.value)}
          className={className}
        />
      ) : (
        <input
          id={id}
          type={type}
          value={value}
          disabled={disabled}
          aria-describedby={hint ? `${id}-hint` : undefined}
          aria-invalid={error ? true : undefined}
          onChange={(event) => onChange(event.target.value)}
          className={className}
        />
      )}

      {error ? (
        <p role="alert" className="text-meta text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function RuntimeRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'success' | 'warning' | 'neutral';
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-content-secondary text-sm">{label}</dt>
      <dd className="text-right">
        <Badge tone={tone}>{value}</Badge>
      </dd>
    </div>
  );
}

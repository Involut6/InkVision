'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { AdminPage } from '@/components/admin/admin-page';
import { Button } from '@/components/ui/button';
import { ErrorState, LoadingState } from '@/components/ui/states';
import { Heading, Meta } from '@/components/ui/typography';
import { useAdminApi } from '@/lib/admin/use-admin-api';
import { useAuthStore } from '@/lib/admin/auth-store';
import { toFieldErrors } from '@/lib/api-error';

interface AdminService {
  id: string;
  slug: string;
  title: string;
  tagline: string;
  businessNeed: string;
  audience: string;
  ctaHeadline: string;
  ctaBody: string;
  deliverables: string[];
  status: string;
}

/**
 * Services CMS.
 *
 * The four service categories are fixed; what is editable is the copy. Each row
 * expands into a form rather than navigating away, because an editor is usually
 * comparing the four against one another while revising them.
 */
export function ServicesScreen() {
  const call = useAdminApi();
  const queryClient = useQueryClient();
  const can = useAuthStore((state) => state.can);

  const [openId, setOpenId] = useState<string | null>(null);

  const list = useQuery({
    queryKey: ['admin', 'services'],
    queryFn: () => call<AdminService[]>('/admin/services'),
  });

  if (list.isLoading) {
    return (
      <AdminPage title="Services">
        <LoadingState label="Loading services" />
      </AdminPage>
    );
  }

  if (list.error || !list.data) {
    return (
      <AdminPage title="Services">
        <ErrorState
          description="We could not load the services. Please try again."
          action={
            <Button variant="outline" onClick={() => void list.refetch()}>
              Try again
            </Button>
          }
        />
      </AdminPage>
    );
  }

  return (
    <AdminPage
      title="Services"
      description="Copy for the four service pages. Changes appear on the website after the content cache refreshes."
    >
      <ul className="flex flex-col gap-4">
        {list.data.map((service) => (
          <li key={service.id} className="bg-surface-raised ring-border-subtle ring-1">
            <div className="flex flex-wrap items-start justify-between gap-4 p-5">
              <div className="min-w-0">
                <Heading level={3} as="h3" className="text-[1.0625rem]">
                  {service.title}
                </Heading>
                <Meta className="mt-1">{service.tagline}</Meta>
                <Meta className="mt-0.5 font-mono text-xs">/services/{service.slug}</Meta>
              </div>

              {can('service:write') ? (
                <Button
                  variant="outline"
                  size="sm"
                  aria-expanded={openId === service.id}
                  onClick={() => setOpenId(openId === service.id ? null : service.id)}
                >
                  {openId === service.id ? 'Close' : 'Edit copy'}
                </Button>
              ) : null}
            </div>

            {openId === service.id ? (
              <div className="border-border-subtle border-t p-5">
                <ServiceForm
                  service={service}
                  onSaved={() => {
                    setOpenId(null);
                    void queryClient.invalidateQueries({ queryKey: ['admin', 'services'] });
                  }}
                />
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </AdminPage>
  );
}

function ServiceForm({ service, onSaved }: { service: AdminService; onSaved: () => void }) {
  const call = useAdminApi();
  const [values, setValues] = useState({
    title: service.title,
    tagline: service.tagline,
    businessNeed: service.businessNeed,
    audience: service.audience,
    ctaHeadline: service.ctaHeadline,
    ctaBody: service.ctaBody,
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const save = useMutation({
    mutationFn: () => call(`/admin/services/${service.id}`, { method: 'PATCH', json: values }),
    onSuccess: () => {
      setFieldErrors({});
      onSaved();
    },
    onError: (error) => setFieldErrors(toFieldErrors(error)),
  });

  const field = (key: keyof typeof values, label: string, hint?: string, multiline = false) => (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={`${service.id}-${key}`}
        className="text-content-primary text-sm font-semibold"
      >
        {label}
      </label>
      {hint ? <p className="text-meta text-content-muted">{hint}</p> : null}
      {multiline ? (
        <textarea
          id={`${service.id}-${key}`}
          rows={3}
          value={values[key]}
          onChange={(event) => setValues({ ...values, [key]: event.target.value })}
          className="border-border-strong bg-surface w-full border px-3.5 py-2.5 text-sm leading-relaxed"
        />
      ) : (
        <input
          id={`${service.id}-${key}`}
          value={values[key]}
          onChange={(event) => setValues({ ...values, [key]: event.target.value })}
          className="border-border-strong bg-surface h-11 w-full border px-3.5 text-sm"
        />
      )}
      {fieldErrors[key] ? (
        <p role="alert" className="text-meta text-danger">
          {fieldErrors[key]}
        </p>
      ) : null}
    </div>
  );

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        save.mutate();
      }}
      className="flex flex-col gap-5"
    >
      {field('title', 'Title')}
      {field('tagline', 'Tagline', 'One line, shown on cards and as the page heading.')}
      {field(
        'businessNeed',
        'Business need',
        'The problem this service addresses, in the client’s own language.',
        true,
      )}
      {field('audience', 'Audience', 'Who this is for.', true)}
      {field('ctaHeadline', 'Closing call to action — headline')}
      {field('ctaBody', 'Closing call to action — body', undefined, true)}

      <div className="border-border-subtle flex items-center gap-3 border-t pt-4">
        <Button type="submit" disabled={save.isPending}>
          {save.isPending ? 'Saving…' : 'Save changes'}
        </Button>
        {save.isError && Object.keys(fieldErrors).length === 0 ? (
          <p role="alert" className="text-meta text-danger">
            Could not save. Please try again.
          </p>
        ) : null}
      </div>
    </form>
  );
}

'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { AdminPage } from '@/components/admin/admin-page';
import { EnquiryStatusBadge } from '@/components/admin/status-badge';
import { Button } from '@/components/ui/button';
import { ErrorState, LoadingState } from '@/components/ui/states';
import { Heading, Meta } from '@/components/ui/typography';
import { useAdminApi } from '@/lib/admin/use-admin-api';
import { useAuthStore } from '@/lib/admin/auth-store';
import { isApiError } from '@/lib/api-error';
import { formatDateTime } from '@/lib/utils';
import {
  ENQUIRY_STATUSES,
  ENQUIRY_STATUS_LABELS,
  ENQUIRY_TIMELINE_LABELS,
  SERVICE_INTEREST_LABELS,
  type EnquiryDto,
  type EnquiryStatus,
} from '@inkvision/shared-types';

export function EnquiryDetailScreen({ enquiryId }: { enquiryId: string }) {
  const call = useAdminApi();
  const queryClient = useQueryClient();
  const can = useAuthStore((state) => state.can);

  const [note, setNote] = useState('');
  const [statusReason, setStatusReason] = useState('');

  const queryKey = ['admin', 'enquiry', enquiryId] as const;

  const query = useQuery({
    queryKey,
    queryFn: () => call<EnquiryDto>(`/admin/enquiries/${enquiryId}`),
  });

  /**
   * Both mutations write the response straight into the cache and invalidate
   * the list and dashboard. The detail view therefore shows the server's own
   * view of the record rather than an optimistic guess that might diverge.
   */
  const updateStatus = useMutation({
    mutationFn: (status: EnquiryStatus) =>
      call<EnquiryDto>(`/admin/enquiries/${enquiryId}`, {
        method: 'PATCH',
        json: { status, ...(statusReason ? { statusReason } : {}) },
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKey, updated);
      void queryClient.invalidateQueries({ queryKey: ['admin', 'enquiries'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
      setStatusReason('');
    },
  });

  const addNote = useMutation({
    mutationFn: (body: string) =>
      call<EnquiryDto>(`/admin/enquiries/${enquiryId}/notes`, {
        method: 'POST',
        json: { body },
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKey, updated);
      setNote('');
    },
  });

  if (query.isLoading) {
    return (
      <AdminPage title="Enquiry">
        <LoadingState label="Loading enquiry" />
      </AdminPage>
    );
  }

  if (query.error || !query.data) {
    const notFound = isApiError(query.error) && query.error.isNotFound;

    return (
      <AdminPage title="Enquiry">
        <ErrorState
          title={notFound ? 'Enquiry not found' : 'Could not load this enquiry'}
          description={
            notFound
              ? 'It may have been deleted, or the link may be out of date.'
              : 'The API may be unavailable. Please try again.'
          }
          action={
            <Button asChild variant="outline">
              <Link href="/admin/enquiries">Back to enquiries</Link>
            </Button>
          }
        />
      </AdminPage>
    );
  }

  const enquiry = query.data;
  const canWrite = can('enquiry:write');

  return (
    <AdminPage
      title={enquiry.fullName}
      description={`Reference ${enquiry.reference} · received ${formatDateTime(enquiry.createdAt)}`}
      actions={
        <Button asChild variant="ghost">
          <Link href="/admin/enquiries">
            <ArrowLeft aria-hidden="true" />
            All enquiries
          </Link>
        </Button>
      }
    >
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)] lg:gap-12">
        <div className="flex flex-col gap-10">
          {/* --- The enquiry itself ---------------------------------------- */}
          <section aria-labelledby="enquiry-detail-heading">
            <Heading level={3} id="enquiry-detail-heading" className="text-[1.0625rem]">
              The enquiry
            </Heading>

            <dl className="[&>*]:ring-border-subtle mt-4 grid gap-px sm:grid-cols-2 [&>*]:ring-1">
              <DetailCell label="Work email">
                <a
                  href={`mailto:${enquiry.workEmail}`}
                  className="text-brand underline underline-offset-4"
                >
                  {enquiry.workEmail}
                </a>
              </DetailCell>
              <DetailCell label="Organisation or role">
                {enquiry.organisationOrRole ?? '—'}
              </DetailCell>
              <DetailCell label="Service of interest">
                {SERVICE_INTEREST_LABELS[enquiry.serviceInterest]}
              </DetailCell>
              <DetailCell label="Timeline">{ENQUIRY_TIMELINE_LABELS[enquiry.timeline]}</DetailCell>
              <DetailCell label="Budget">{enquiry.budgetRange ?? '—'}</DetailCell>
              <DetailCell label="Heard about us via">{enquiry.referralSource ?? '—'}</DetailCell>
            </dl>

            <div className="bg-surface-raised ring-border-subtle mt-6 p-6 ring-1">
              <Meta className="font-sans text-[0.6875rem] font-semibold tracking-[0.1em] uppercase">
                What they wrote
              </Meta>
              <p className="text-content-primary mt-3 text-[0.9375rem] leading-relaxed whitespace-pre-line">
                {enquiry.message}
              </p>
            </div>

            <Meta className="mt-3">
              Consent to be contacted given {formatDateTime(enquiry.consentAt)}.
            </Meta>
          </section>

          {/* --- Internal notes -------------------------------------------- */}
          <section aria-labelledby="notes-heading">
            <Heading level={3} id="notes-heading" className="text-[1.0625rem]">
              Internal notes
            </Heading>
            <Meta className="mt-1">Only visible here. Never shown to the enquirer.</Meta>

            {canWrite ? (
              <form
                className="mt-4 flex flex-col gap-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (note.trim()) addNote.mutate(note.trim());
                }}
              >
                <label htmlFor="enquiry-note" className="sr-only">
                  Add an internal note
                </label>
                <textarea
                  id="enquiry-note"
                  rows={3}
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Add a note for the team…"
                  className="border-border-strong bg-surface-raised w-full border p-3 text-sm leading-relaxed"
                />
                <div className="flex items-center gap-3">
                  <Button type="submit" disabled={!note.trim() || addNote.isPending}>
                    {addNote.isPending ? 'Saving…' : 'Add note'}
                  </Button>
                  {addNote.isError ? (
                    <p role="alert" className="text-meta text-danger">
                      Could not save that note. Please try again.
                    </p>
                  ) : null}
                </div>
              </form>
            ) : null}

            {enquiry.notes.length > 0 ? (
              <ul className="mt-6 flex flex-col gap-4">
                {enquiry.notes.map((entry) => (
                  <li key={entry.id} className="border-border-subtle border-t pt-4">
                    <p className="text-content-primary text-sm leading-relaxed whitespace-pre-line">
                      {entry.body}
                    </p>
                    <Meta className="mt-1.5">
                      {entry.authorName} · {formatDateTime(entry.createdAt)}
                    </Meta>
                  </li>
                ))}
              </ul>
            ) : (
              <Meta className="mt-5">No notes yet.</Meta>
            )}
          </section>
        </div>

        {/* --- Status and history ------------------------------------------ */}
        <aside className="flex flex-col gap-8">
          <section
            aria-labelledby="status-heading"
            className="bg-surface-raised ring-border-subtle p-5 ring-1"
          >
            <Heading level={3} id="status-heading" className="text-[1.0625rem]">
              Status
            </Heading>

            <div className="mt-3">
              <EnquiryStatusBadge status={enquiry.status} />
            </div>

            {canWrite ? (
              <div className="mt-5 flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="status-reason"
                    className="text-meta text-content-secondary font-semibold"
                  >
                    Reason (optional)
                  </label>
                  <input
                    id="status-reason"
                    value={statusReason}
                    onChange={(event) => setStatusReason(event.target.value)}
                    placeholder="Recorded with the change"
                    className="border-border-strong bg-surface h-10 border px-3 text-sm"
                  />
                </div>

                <fieldset className="flex flex-col gap-2">
                  <legend className="text-meta text-content-secondary font-semibold">
                    Move to
                  </legend>
                  <div className="flex flex-wrap gap-2">
                    {ENQUIRY_STATUSES.filter((value) => value !== enquiry.status).map((value) => (
                      <Button
                        key={value}
                        size="sm"
                        variant="outline"
                        disabled={updateStatus.isPending}
                        onClick={() => updateStatus.mutate(value)}
                      >
                        {ENQUIRY_STATUS_LABELS[value]}
                      </Button>
                    ))}
                  </div>
                </fieldset>

                {updateStatus.isError ? (
                  <p role="alert" className="text-meta text-danger">
                    Could not change the status. Please try again.
                  </p>
                ) : null}
              </div>
            ) : (
              <Meta className="mt-4">Your role does not include changing enquiry status.</Meta>
            )}
          </section>

          <section aria-labelledby="history-heading">
            <Heading level={3} id="history-heading" className="text-[1.0625rem]">
              History
            </Heading>

            <ol className="mt-4 flex flex-col gap-4">
              {enquiry.statusHistory.map((change) => (
                <li key={change.id} className="border-border-accent border-l-2 pl-4">
                  <p className="text-content-primary text-sm">
                    {change.fromStatus
                      ? `${ENQUIRY_STATUS_LABELS[change.fromStatus]} → ${ENQUIRY_STATUS_LABELS[change.toStatus]}`
                      : `Received as ${ENQUIRY_STATUS_LABELS[change.toStatus]}`}
                  </p>
                  {change.reason ? (
                    <p className="text-content-secondary mt-0.5 text-sm">{change.reason}</p>
                  ) : null}
                  <Meta className="mt-0.5">
                    {change.changedByName ? `${change.changedByName} · ` : ''}
                    {formatDateTime(change.createdAt)}
                  </Meta>
                </li>
              ))}
            </ol>
          </section>
        </aside>
      </div>
    </AdminPage>
  );
}

function DetailCell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="bg-surface-raised p-4">
      <dt>
        <Meta className="font-sans text-[0.6875rem] font-semibold tracking-[0.1em] uppercase">
          {label}
        </Meta>
      </dt>
      <dd className="text-content-primary mt-1 text-sm">{children}</dd>
    </div>
  );
}

'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Check } from 'lucide-react';
import { useId, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Heading, Meta } from '@/components/ui/typography';
import { browserApi } from '@/lib/api.browser';
import { isApiError, toFieldErrors } from '@/lib/api-error';
import { cn } from '@/lib/utils';
import {
  ENQUIRY_TIMELINES,
  ENQUIRY_TIMELINE_LABELS,
  SERVICE_INTERESTS,
  SERVICE_INTEREST_LABELS,
  type CreateEnquiryResponse,
} from '@inkvision/shared-types';

/**
 * Client-side validation.
 *
 * Mirrors the server's DTO exactly, including the messages, so a visitor sees
 * the same guidance whichever tier catches the problem. The server remains the
 * authority — this only saves a round trip.
 */
const schema = z.object({
  fullName: z.string().trim().min(2, 'Please enter your full name.').max(120),
  workEmail: z
    .string()
    .trim()
    .min(1, 'Please enter your work email address.')
    .email('Please enter a valid work email address.')
    .max(254),
  organisationOrRole: z.string().trim().max(200).optional(),
  serviceInterest: z.enum(SERVICE_INTERESTS, {
    error: 'Please choose the service you are interested in.',
  }),
  message: z
    .string()
    .trim()
    .min(20, 'Please tell us a little more — at least 20 characters.')
    .max(5000, 'Please keep your message under 5,000 characters.'),
  timeline: z.enum(ENQUIRY_TIMELINES, { error: 'Please choose a timeline.' }),
  budgetRange: z.string().trim().max(120).optional(),
  referralSource: z.string().trim().max(200).optional(),
  consent: z.literal(true, {
    error: 'Please confirm you are happy for us to contact you about this enquiry.',
  }),
  /** Honeypot. Hidden from sighted users and assistive technology alike. */
  website: z.string().max(200).optional(),
});

type FormValues = z.input<typeof schema>;

export function EnquiryForm({
  defaultServiceInterest,
  className,
}: {
  defaultServiceInterest?: (typeof SERVICE_INTERESTS)[number];
  className?: string;
}) {
  const ids = {
    fullName: useId(),
    workEmail: useId(),
    organisation: useId(),
    service: useId(),
    message: useId(),
    timeline: useId(),
    budget: useId(),
    referral: useId(),
    consent: useId(),
    honeypot: useId(),
    formError: useId(),
  };

  const successRef = useRef<HTMLDivElement>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName: '',
      workEmail: '',
      organisationOrRole: '',
      serviceInterest: defaultServiceInterest ?? ('' as (typeof SERVICE_INTERESTS)[number]),
      message: '',
      timeline: '' as (typeof ENQUIRY_TIMELINES)[number],
      budgetRange: '',
      referralSource: '',
      consent: false as unknown as true,
      website: '',
    },
  });

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      browserApi.post<CreateEnquiryResponse>('/enquiries', {
        fullName: values.fullName,
        workEmail: values.workEmail,
        ...(values.organisationOrRole ? { organisationOrRole: values.organisationOrRole } : {}),
        serviceInterest: values.serviceInterest,
        message: values.message,
        timeline: values.timeline,
        ...(values.budgetRange ? { budgetRange: values.budgetRange } : {}),
        ...(values.referralSource ? { referralSource: values.referralSource } : {}),
        consent: true,
        ...(values.website ? { website: values.website } : {}),
      }),
    onSuccess: () => {
      // Focus is moved to the confirmation so a screen-reader and keyboard
      // user land on it rather than at the top of a form that has vanished.
      requestAnimationFrame(() => successRef.current?.focus());
    },
    onError: (error) => {
      // Server-side field errors are attached to their inputs, so the visitor
      // is taken to the problem rather than reading a generic banner.
      for (const [field, message] of Object.entries(toFieldErrors(error))) {
        if (field in schema.shape) {
          setError(field as keyof FormValues, { type: 'server', message });
        }
      }
    },
  });

  if (mutation.isSuccess) {
    return (
      <div
        ref={successRef}
        tabIndex={-1}
        role="status"
        aria-live="polite"
        className={cn(
          'bg-success-soft ring-success/25 flex flex-col gap-4 p-8 ring-1 focus:outline-none',
          className,
        )}
      >
        <Check aria-hidden="true" className="text-success size-6" />
        <Heading level={3} as="h2">
          Thank you
        </Heading>
        <p className="max-w-measure text-content-secondary text-[0.9375rem] leading-relaxed">
          {mutation.data.message}
        </p>
        <Meta>
          Your reference is <strong className="font-semibold">{mutation.data.reference}</strong>.
          Please quote it if you need to follow up.
        </Meta>
      </div>
    );
  }

  const serverError =
    mutation.error && !isApiError(mutation.error)
      ? 'We could not send that just now. Please try again shortly.'
      : mutation.error && isApiError(mutation.error) && !mutation.error.isValidationError
        ? mutation.error.userMessage
        : null;

  return (
    <form
      noValidate
      onSubmit={handleSubmit((values) => mutation.mutate(values))}
      className={cn('flex flex-col gap-6', className)}
    >
      {/* Honeypot. `aria-hidden` plus negative tabindex keeps it away from
          assistive technology as well as from sighted users, so only a bot
          that fills every field will trip it. */}
      <div aria-hidden="true" className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
        <label htmlFor={ids.honeypot}>Leave this field empty</label>
        <input
          id={ids.honeypot}
          type="text"
          tabIndex={-1}
          autoComplete="off"
          {...register('website')}
        />
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <Field
          id={ids.fullName}
          label="Full name"
          required
          error={errors.fullName?.message}
          errorId={`${ids.fullName}-error`}
        >
          <input
            id={ids.fullName}
            autoComplete="name"
            aria-required="true"
            aria-invalid={errors.fullName ? true : undefined}
            aria-describedby={errors.fullName ? `${ids.fullName}-error` : undefined}
            {...register('fullName')}
            className={inputClass(Boolean(errors.fullName))}
          />
        </Field>

        <Field
          id={ids.workEmail}
          label="Work email"
          required
          error={errors.workEmail?.message}
          errorId={`${ids.workEmail}-error`}
        >
          <input
            id={ids.workEmail}
            type="email"
            autoComplete="email"
            aria-required="true"
            aria-invalid={errors.workEmail ? true : undefined}
            aria-describedby={errors.workEmail ? `${ids.workEmail}-error` : undefined}
            {...register('workEmail')}
            className={inputClass(Boolean(errors.workEmail))}
          />
        </Field>
      </div>

      <Field
        id={ids.organisation}
        label="Organisation or role"
        error={errors.organisationOrRole?.message}
        errorId={`${ids.organisation}-error`}
      >
        <input
          id={ids.organisation}
          autoComplete="organization"
          {...register('organisationOrRole')}
          className={inputClass(Boolean(errors.organisationOrRole))}
        />
      </Field>

      <div className="grid gap-6 sm:grid-cols-2">
        <Field
          id={ids.service}
          label="Service of interest"
          required
          error={errors.serviceInterest?.message}
          errorId={`${ids.service}-error`}
        >
          <select
            id={ids.service}
            aria-required="true"
            aria-invalid={errors.serviceInterest ? true : undefined}
            aria-describedby={errors.serviceInterest ? `${ids.service}-error` : undefined}
            {...register('serviceInterest')}
            className={inputClass(Boolean(errors.serviceInterest))}
          >
            <option value="">Choose a service…</option>
            {SERVICE_INTERESTS.map((value) => (
              <option key={value} value={value}>
                {SERVICE_INTEREST_LABELS[value]}
              </option>
            ))}
          </select>
        </Field>

        <Field
          id={ids.timeline}
          label="Desired timeline"
          required
          error={errors.timeline?.message}
          errorId={`${ids.timeline}-error`}
        >
          <select
            id={ids.timeline}
            aria-required="true"
            aria-invalid={errors.timeline ? true : undefined}
            aria-describedby={errors.timeline ? `${ids.timeline}-error` : undefined}
            {...register('timeline')}
            className={inputClass(Boolean(errors.timeline))}
          >
            <option value="">Choose a timeline…</option>
            {ENQUIRY_TIMELINES.map((value) => (
              <option key={value} value={value}>
                {ENQUIRY_TIMELINE_LABELS[value]}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field
        id={ids.message}
        label="What are you working towards?"
        required
        hint="The challenge or requirement, in your own words."
        error={errors.message?.message}
        errorId={`${ids.message}-error`}
      >
        <textarea
          id={ids.message}
          rows={6}
          aria-required="true"
          aria-invalid={errors.message ? true : undefined}
          aria-describedby={errors.message ? `${ids.message}-error` : `${ids.message}-hint`}
          {...register('message')}
          className={cn(inputClass(Boolean(errors.message)), 'h-auto py-3 leading-relaxed')}
        />
      </Field>

      <div className="grid gap-6 sm:grid-cols-2">
        <Field
          id={ids.budget}
          label="Approximate budget"
          hint="Free text — we do not impose fixed bands."
          error={errors.budgetRange?.message}
          errorId={`${ids.budget}-error`}
        >
          <input
            id={ids.budget}
            {...register('budgetRange')}
            className={inputClass(Boolean(errors.budgetRange))}
          />
        </Field>

        <Field
          id={ids.referral}
          label="How did you hear about us?"
          error={errors.referralSource?.message}
          errorId={`${ids.referral}-error`}
        >
          <input
            id={ids.referral}
            {...register('referralSource')}
            className={inputClass(Boolean(errors.referralSource))}
          />
        </Field>
      </div>

      <div className="border-border-subtle flex flex-col gap-2 border-t pt-6">
        <div className="flex items-start gap-3">
          <input
            id={ids.consent}
            type="checkbox"
            aria-required="true"
            aria-invalid={errors.consent ? true : undefined}
            aria-describedby={errors.consent ? `${ids.consent}-error` : undefined}
            {...register('consent')}
            className="mt-1 size-4 shrink-0 accent-[var(--color-brand)]"
          />
          <label htmlFor={ids.consent} className="text-content-secondary text-sm leading-relaxed">
            I am happy for InkVision Creatives to contact me about this enquiry using the details
            above. We use them only to respond, and never share or sell them. See our{' '}
            <a href="/privacy" className="text-brand underline underline-offset-4">
              privacy notice
            </a>
            .
          </label>
        </div>

        {errors.consent ? (
          <p id={`${ids.consent}-error`} className="text-meta text-danger">
            {errors.consent.message}
          </p>
        ) : null}
      </div>

      {/* A single live region for form-level failures. */}
      <div id={ids.formError} role="alert" aria-live="assertive">
        {serverError ? (
          <p className="bg-danger-soft text-danger ring-danger/25 px-4 py-3 text-sm ring-1">
            {serverError}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button type="submit" size="lg" disabled={mutation.isPending}>
          {mutation.isPending ? 'Sending…' : 'Send enquiry'}
        </Button>
        <Meta>We read every enquiry ourselves.</Meta>
      </div>
    </form>
  );
}

function Field({
  id,
  label,
  hint,
  required,
  error,
  errorId,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  required?: boolean;
  error?: string;
  errorId: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-content-primary font-sans text-sm font-semibold">
        {label}
        {required ? (
          <span aria-hidden="true" className="text-accent ml-1">
            *
          </span>
        ) : (
          <span className="text-content-muted ml-2 font-normal">(optional)</span>
        )}
      </label>

      {hint ? (
        <p id={`${id}-hint`} className="text-meta text-content-muted">
          {hint}
        </p>
      ) : null}

      {children}

      {error ? (
        <p id={errorId} className="text-meta text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function inputClass(hasError: boolean): string {
  return cn(
    'h-11 w-full border bg-surface-raised px-3.5 font-sans text-sm text-content-primary',
    'placeholder:text-content-muted',
    hasError ? 'border-danger' : 'border-border-strong',
  );
}

'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Check } from 'lucide-react';
import { useId } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { browserApi } from '@/lib/api.browser';
import { isApiError } from '@/lib/api-error';
import { cn } from '@/lib/utils';

import type { NewsletterSubscribeResponse } from '@inkvision/shared-types';

const schema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Enter your email address.')
    .email('Enter a valid email address.'),
  consent: z.literal(true, {
    error: 'Please confirm you would like to receive these emails.',
  }),
});

type FormValues = z.input<typeof schema>;

/**
 * Newsletter subscription.
 *
 * TanStack Query handles the mutation state, so the component holds no
 * duplicate `isLoading`/`error` flags of its own. The success message is in an
 * `aria-live` region, which is what tells a screen-reader user the submission
 * worked — a visual-only confirmation would leave them guessing.
 */
export function NewsletterForm({
  source = 'footer',
  tone = 'default',
  className,
}: {
  source?: string;
  tone?: 'default' | 'inverse';
  className?: string;
}) {
  const emailId = useId();
  const consentId = useId();
  const errorId = useId();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', consent: false as unknown as true },
  });

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      browserApi.post<NewsletterSubscribeResponse>('/newsletter/subscribe', {
        email: values.email,
        consent: true,
        source,
      }),
    onSuccess: () => reset(),
  });

  const inverse = tone === 'inverse';

  if (mutation.isSuccess) {
    return (
      <div
        role="status"
        aria-live="polite"
        className={cn(
          'flex items-start gap-3 border px-4 py-3.5',
          inverse
            ? 'border-gold-300/40 bg-white/5 text-white'
            : 'border-success/25 bg-success-soft text-success',
          className,
        )}
      >
        <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        <p className="text-sm">{mutation.data.message}</p>
      </div>
    );
  }

  const serverError = mutation.error
    ? isApiError(mutation.error)
      ? mutation.error.userMessage
      : 'We could not complete that just now. Please try again shortly.'
    : null;

  return (
    <form
      noValidate
      onSubmit={handleSubmit((values) => mutation.mutate(values))}
      className={cn('flex flex-col gap-3', className)}
    >
      <div className="flex flex-col gap-2">
        <label
          htmlFor={emailId}
          className={cn(
            'text-meta font-sans font-semibold tracking-[0.1em] uppercase',
            inverse ? 'text-white/75' : 'text-content-muted',
          )}
        >
          Email address
        </label>

        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            id={emailId}
            type="email"
            autoComplete="email"
            placeholder="you@organisation.com"
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={errors.email ? errorId : undefined}
            {...register('email')}
            className={cn(
              'h-11 min-w-0 flex-1 border px-3.5 font-sans text-sm',
              'placeholder:text-content-muted',
              inverse
                ? 'border-white/25 bg-white/5 text-white placeholder:text-white/60'
                : 'border-border-strong bg-surface-raised text-content-primary',
              errors.email && 'border-danger',
            )}
          />

          <Button
            type="submit"
            variant={inverse ? 'accent' : 'primary'}
            disabled={isSubmitting || mutation.isPending}
          >
            {mutation.isPending ? 'Subscribing…' : 'Subscribe'}
          </Button>
        </div>
      </div>

      <div className="flex items-start gap-2.5">
        <input
          id={consentId}
          type="checkbox"
          {...register('consent')}
          aria-invalid={errors.consent ? true : undefined}
          aria-describedby={errors.consent ? errorId : undefined}
          className="accent-brand mt-1 size-4 shrink-0"
        />
        <label
          htmlFor={consentId}
          className={cn('text-meta', inverse ? 'text-white/70' : 'text-content-muted')}
        >
          I would like to receive occasional emails from InkVision Creatives. You can unsubscribe at
          any time using the link in any email.
        </label>
      </div>

      {/* One live region for every error on this form, so a screen reader is
          told what went wrong without needing to re-read the whole form. */}
      <div id={errorId} role="alert" aria-live="polite" className="min-h-0">
        {(errors.email?.message ?? errors.consent?.message ?? serverError) ? (
          <p className={cn('text-meta', inverse ? 'text-gold-300' : 'text-danger')}>
            {errors.email?.message ?? errors.consent?.message ?? serverError}
          </p>
        ) : null}
      </div>
    </form>
  );
}

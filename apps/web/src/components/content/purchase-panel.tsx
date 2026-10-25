'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Lock } from 'lucide-react';
import Link from 'next/link';
import { useId } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Heading, Meta } from '@/components/ui/typography';
import { browserApi } from '@/lib/api.browser';
import { isApiError } from '@/lib/api-error';
import { formatMoney } from '@/lib/utils';
import type { CheckoutResponse, ProductDto } from '@inkvision/shared-types';

const schema = z.object({
  customerName: z.string().trim().min(2, 'Enter your name.').max(120),
  customerEmail: z
    .string()
    .trim()
    .min(1, 'Enter your email address.')
    .email('Enter a valid email address so we can deliver your purchase.'),
});

type FormValues = z.infer<typeof schema>;

/**
 * The purchase panel.
 *
 * Note what it does NOT send: no price, no currency, no product id chosen by
 * the browser beyond the slug. The server looks the price up itself, so there
 * is nothing here for a tampered request to change.
 *
 * It renders a purchase form only when the server has reported the product as
 * purchasable. Otherwise it explains the actual state and offers the enquiry
 * route instead.
 */
export function PurchasePanel({ product }: { product: ProductDto }) {
  const nameId = useId();
  const emailId = useId();
  const errorId = useId();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { customerName: '', customerEmail: '' },
  });

  const checkout = useMutation({
    mutationFn: (values: FormValues) =>
      browserApi.post<CheckoutResponse>('/orders/checkout', {
        productSlug: product.slug,
        customerName: values.customerName,
        customerEmail: values.customerEmail,
        // Makes a retried submission safe: the server returns the original
        // order rather than charging twice.
        idempotencyKey: crypto.randomUUID(),
      }),
    onSuccess: (response) => {
      if (response.checkoutUrl) window.location.href = response.checkoutUrl;
    },
  });

  if (!product.purchasable) {
    return (
      <aside className="bg-surface-sunken ring-border-subtle flex flex-col gap-4 p-7 ring-1">
        <Heading level={3} as="h2" className="text-[1.0625rem]">
          {product.status === 'COMING_SOON' ? 'In preparation' : 'Not currently available'}
        </Heading>

        <p className="text-content-secondary text-sm leading-relaxed">
          {product.status === 'COMING_SOON'
            ? 'This resource is being finalised. It will be available to buy once its contents, pricing and delivery are complete and tested.'
            : 'This resource is not available to purchase at the moment.'}
        </p>

        <Button asChild className="mt-1">
          <Link href="/contact">Tell us you are interested</Link>
        </Button>

        <Meta>We will let you know when it is ready. No obligation.</Meta>
      </aside>
    );
  }

  if (checkout.isSuccess && !checkout.data.checkoutUrl) {
    return (
      <aside
        role="status"
        className="bg-surface-sunken ring-border-subtle flex flex-col gap-3 p-7 ring-1"
      >
        <Heading level={3} as="h2" className="text-[1.0625rem]">
          Order created
        </Heading>
        <p className="text-content-secondary text-sm">
          Your reference is <strong>{checkout.data.reference}</strong>. We will email you with the
          next step.
        </p>
      </aside>
    );
  }

  const serverError = checkout.error
    ? isApiError(checkout.error)
      ? checkout.error.userMessage
      : 'We could not start the purchase just now. Please try again shortly.'
    : null;

  return (
    <aside className="bg-surface-raised ring-border-subtle flex flex-col gap-5 p-7 ring-1">
      <div className="flex items-baseline justify-between gap-4">
        <Heading level={3} as="h2" className="text-[1.0625rem]">
          Buy this resource
        </Heading>
        {product.price ? (
          <span className="tabular text-content-primary font-serif text-2xl">
            {formatMoney(product.price)}
          </span>
        ) : null}
      </div>

      <form
        noValidate
        onSubmit={handleSubmit((values) => checkout.mutate(values))}
        className="flex flex-col gap-4"
      >
        <div className="flex flex-col gap-1.5">
          <label htmlFor={nameId} className="text-meta text-content-secondary font-semibold">
            Your name
          </label>
          <input
            id={nameId}
            autoComplete="name"
            aria-invalid={errors.customerName ? true : undefined}
            aria-describedby={errors.customerName ? errorId : undefined}
            {...register('customerName')}
            className="border-border-strong bg-surface h-11 border px-3.5 text-sm"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor={emailId} className="text-meta text-content-secondary font-semibold">
            Email address
          </label>
          <input
            id={emailId}
            type="email"
            autoComplete="email"
            aria-invalid={errors.customerEmail ? true : undefined}
            aria-describedby={errors.customerEmail ? errorId : undefined}
            {...register('customerEmail')}
            className="border-border-strong bg-surface h-11 border px-3.5 text-sm"
          />
          <Meta>Your download link is sent here.</Meta>
        </div>

        <div id={errorId} role="alert" aria-live="polite">
          {(errors.customerName?.message ?? errors.customerEmail?.message ?? serverError) ? (
            <p className="text-meta text-danger">
              {errors.customerName?.message ?? errors.customerEmail?.message ?? serverError}
            </p>
          ) : null}
        </div>

        <Button type="submit" variant="accent" size="lg" disabled={checkout.isPending}>
          {checkout.isPending ? 'Starting checkout…' : 'Continue to payment'}
        </Button>
      </form>

      <Meta className="flex items-start gap-2">
        <Lock aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
        <span>
          Payment is handled by our payment provider. We never see or store your card details.
        </span>
      </Meta>
    </aside>
  );
}

'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect, useId } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Heading, Meta } from '@/components/ui/typography';
import { browserApi } from '@/lib/api.browser';
import { isApiError } from '@/lib/api-error';
import { useAuthStore } from '@/lib/admin/auth-store';
import { cn } from '@/lib/utils';
import type { LoginResponse } from '@inkvision/shared-types';

const schema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Enter your email address.')
    .email('Enter a valid email address.'),
  password: z.string().min(1, 'Enter your password.'),
});

type FormValues = z.infer<typeof schema>;

export function LoginForm() {
  const router = useRouter();
  const emailId = useId();
  const passwordId = useId();
  const errorId = useId();

  const user = useAuthStore((state) => state.user);
  const setSession = useAuthStore((state) => state.setSession);

  useEffect(() => {
    if (user) router.replace('/admin');
  }, [user, router]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  const login = useMutation({
    mutationFn: (values: FormValues) => browserApi.post<LoginResponse>('/admin/auth/login', values),
    onSuccess: (response) => {
      setSession({
        user: response.user,
        accessToken: response.accessToken,
        csrfToken: response.csrfToken,
      });
      router.replace('/admin');
    },
  });

  /**
   * The server answers a wrong password and an unknown account identically, so
   * this message must not distinguish them either — doing so would turn the
   * form into an account-enumeration oracle.
   */
  const serverError = login.error
    ? isApiError(login.error)
      ? login.error.userMessage
      : 'We could not sign you in just now. Please try again shortly.'
    : null;

  return (
    <div className="bg-surface-raised ring-border-subtle w-full max-w-sm p-8 shadow-[--shadow-card] ring-1">
      <span aria-hidden="true" className="border-accent block h-0 w-10 border-t-2" />

      <Heading level={2} className="text-h3 mt-5">
        InkVision Administration
      </Heading>
      <Meta className="mt-2">Sign in to manage enquiries and content.</Meta>

      <form
        noValidate
        onSubmit={handleSubmit((values) => login.mutate(values))}
        className="mt-7 flex flex-col gap-5"
      >
        <div className="flex flex-col gap-1.5">
          <label htmlFor={emailId} className="text-content-primary text-sm font-semibold">
            Email address
          </label>
          <input
            id={emailId}
            type="email"
            autoComplete="username"
            autoFocus
            aria-required="true"
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={errors.email ? errorId : undefined}
            {...register('email')}
            className={inputClass(Boolean(errors.email))}
          />
          {errors.email ? <p className="text-meta text-danger">{errors.email.message}</p> : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor={passwordId} className="text-content-primary text-sm font-semibold">
            Password
          </label>
          <input
            id={passwordId}
            type="password"
            autoComplete="current-password"
            aria-required="true"
            aria-invalid={errors.password ? true : undefined}
            aria-describedby={errors.password ? errorId : undefined}
            {...register('password')}
            className={inputClass(Boolean(errors.password))}
          />
          {errors.password ? (
            <p className="text-meta text-danger">{errors.password.message}</p>
          ) : null}
        </div>

        <div id={errorId} role="alert" aria-live="assertive">
          {serverError ? (
            <p className="bg-danger-soft text-danger ring-danger/25 px-3 py-2.5 text-sm ring-1">
              {serverError}
            </p>
          ) : null}
        </div>

        <Button type="submit" size="lg" disabled={login.isPending}>
          {login.isPending ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>

      <Meta className="border-border-subtle mt-6 border-t pt-5">
        Accounts are created by an administrator. There is no self-service sign-up, and no password
        is ever stored in the repository — the first account is created with{' '}
        <code className="font-mono text-[0.75rem]">pnpm admin:create</code>.
      </Meta>
    </div>
  );
}

function inputClass(hasError: boolean): string {
  return cn(
    'h-11 w-full border bg-surface px-3.5 text-sm text-content-primary',
    hasError ? 'border-danger' : 'border-border-strong',
  );
}

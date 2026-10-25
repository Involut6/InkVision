'use client';

import { Search, X } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useId, useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * Article search.
 *
 * Submits as a normal form and navigates to a URL, so the result is shareable
 * and the page stays server-rendered. The only reason this is a client
 * component is the controlled input and the clear affordance.
 */
export function InsightSearch({ className }: { className?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inputId = useId();

  const [value, setValue] = useState(searchParams.get('search') ?? '');
  const category = searchParams.get('category');

  const submit = (event: FormEvent) => {
    event.preventDefault();

    const params = new URLSearchParams();
    if (category) params.set('category', category);
    const trimmed = value.trim();
    if (trimmed) params.set('search', trimmed);

    const query = params.toString();
    router.push(query ? `/insights?${query}` : '/insights');
  };

  const clear = () => {
    setValue('');
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    const query = params.toString();
    router.push(query ? `/insights?${query}` : '/insights');
  };

  return (
    <form role="search" onSubmit={submit} className={cn('flex gap-2', className)}>
      <label htmlFor={inputId} className="sr-only">
        Search insights
      </label>

      <div className="relative flex-1">
        <Search
          aria-hidden="true"
          className="text-content-muted pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
        />
        <input
          id={inputId}
          type="search"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Search insights"
          className="border-border-strong bg-surface-raised placeholder:text-content-muted h-11 w-full border pr-9 pl-9 text-sm"
        />
        {value ? (
          <button
            type="button"
            onClick={clear}
            aria-label="Clear search"
            className="text-content-muted hover:text-content-primary absolute top-1/2 right-2 flex size-7 -translate-y-1/2 items-center justify-center"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        ) : null}
      </div>

      <Button type="submit" variant="outline">
        Search
      </Button>
    </form>
  );
}

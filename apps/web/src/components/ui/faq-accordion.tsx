'use client';

import * as Accordion from '@radix-ui/react-accordion';
import { Plus } from 'lucide-react';

import type { FaqItemDto } from '@inkvision/shared-types';
import { cn } from '@/lib/utils';

/**
 * FAQ accordion.
 *
 * Radix supplies the keyboard behaviour and the `aria-expanded` /
 * `aria-controls` wiring. `type="multiple"` lets a reader keep several answers
 * open while comparing them, which is how an FAQ is actually read.
 */
export function FaqAccordion({
  items,
  className,
  defaultOpen,
}: {
  items: readonly FaqItemDto[];
  className?: string;
  /** Ids to open initially. */
  defaultOpen?: readonly string[];
}) {
  if (items.length === 0) return null;

  return (
    <Accordion.Root
      type="multiple"
      defaultValue={defaultOpen ? [...defaultOpen] : undefined}
      className={cn('divide-border-subtle border-border-subtle divide-y border-y', className)}
    >
      {items.map((item) => (
        <Accordion.Item key={item.id} value={item.id}>
          <Accordion.Header>
            <Accordion.Trigger
              className={cn(
                'group flex w-full items-start justify-between gap-5 py-5 text-left',
                'text-content-primary font-sans text-[1.0625rem] font-medium',
                'hover:text-brand transition-colors',
              )}
            >
              <span>{item.question}</span>
              <Plus
                aria-hidden="true"
                className={cn(
                  'text-accent mt-1 size-4 shrink-0 transition-transform duration-300',
                  'group-data-[state=open]:rotate-45',
                )}
              />
            </Accordion.Trigger>
          </Accordion.Header>

          <Accordion.Content
            className={cn(
              'overflow-hidden',
              'data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down',
            )}
          >
            <p className="max-w-measure-wide text-content-secondary pb-6 text-[0.9375rem] leading-relaxed">
              {item.answer}
            </p>
          </Accordion.Content>
        </Accordion.Item>
      ))}
    </Accordion.Root>
  );
}

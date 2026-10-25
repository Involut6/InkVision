import type { ComponentProps, ElementType, ReactNode } from 'react';

import { cn } from '@/lib/utils';

/**
 * Editorial typography primitives.
 *
 * These exist so hierarchy is a decision made once rather than re-chosen with
 * ad-hoc utility classes on every page. Each accepts an `as` prop, which keeps
 * the visual level and the semantic heading level independent — a visually
 * large heading can still be an `h2` where the document outline requires it.
 */

export function Eyebrow({
  children,
  className,
  as: Component = 'p',
  ...props
}: {
  children: ReactNode;
  className?: string;
  as?: ElementType;
} & Omit<ComponentProps<'p'>, 'children' | 'className'>) {
  return (
    <Component
      className={cn('text-eyebrow text-content-muted font-sans uppercase', className)}
      {...props}
    >
      {children}
    </Component>
  );
}

export function Display({
  children,
  className,
  as: Component = 'h1',
  ...props
}: {
  children: ReactNode;
  className?: string;
  as?: ElementType;
} & Omit<ComponentProps<'h1'>, 'children' | 'className'>) {
  return (
    <Component className={cn('text-display text-content-primary font-serif', className)} {...props}>
      {children}
    </Component>
  );
}

export function Heading({
  level = 2,
  children,
  className,
  as,
  ...props
}: {
  /** Visual size. */
  level?: 1 | 2 | 3;
  children: ReactNode;
  className?: string;
  /** Semantic element, when it must differ from the visual level. */
  as?: ElementType;
} & Omit<ComponentProps<'h2'>, 'children' | 'className'>) {
  const Component = as ?? (`h${level}` as ElementType);
  const sizes = { 1: 'text-h1', 2: 'text-h2', 3: 'text-h3' } as const;

  return (
    <Component
      className={cn('text-content-primary font-serif', sizes[level], className)}
      {...props}
    >
      {children}
    </Component>
  );
}

export function Lead({ children, className, ...props }: ComponentProps<'p'>) {
  return (
    <p className={cn('max-w-measure-wide text-lead text-content-secondary', className)} {...props}>
      {children}
    </p>
  );
}

export function Body({ children, className, ...props }: ComponentProps<'p'>) {
  return (
    <p className={cn('max-w-measure text-content-secondary', className)} {...props}>
      {children}
    </p>
  );
}

export function Meta({ children, className, ...props }: ComponentProps<'p'>) {
  return (
    <p className={cn('text-meta text-content-muted', className)} {...props}>
      {children}
    </p>
  );
}

/** The scarce gold rule that marks a section opening. */
export function GoldRule({ className }: { className?: string }) {
  return <span aria-hidden="true" className={cn('gold-rule', className)} />;
}

/**
 * A section heading group: eyebrow, heading and optional lead, spaced
 * consistently wherever it appears.
 */
export function SectionHeader({
  eyebrow,
  heading,
  lead,
  level = 2,
  align = 'start',
  className,
}: {
  eyebrow?: string;
  heading: ReactNode;
  lead?: ReactNode;
  level?: 1 | 2 | 3;
  align?: 'start' | 'center';
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-4',
        align === 'center' && 'items-center text-center',
        className,
      )}
    >
      <GoldRule />
      {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
      <Heading level={level} className={cn(align === 'center' && 'mx-auto')}>
        {heading}
      </Heading>
      {lead ? <Lead className={cn(align === 'center' && 'mx-auto')}>{lead}</Lead> : null}
    </div>
  );
}

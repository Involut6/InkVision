import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 whitespace-nowrap border px-2.5 py-1 font-sans text-[0.6875rem] font-semibold uppercase tracking-[0.1em]',
  {
    variants: {
      tone: {
        neutral: 'border-border-subtle bg-surface-sunken text-content-secondary',
        brand: 'border-royal-200 bg-brand-soft text-royal-700',
        accent: 'border-border-accent bg-accent-soft text-gold-700',
        success: 'border-success/25 bg-success-soft text-success',
        warning: 'border-warning/25 bg-warning-soft text-warning',
        danger: 'border-danger/25 bg-danger-soft text-danger',
        inverse: 'border-white/25 bg-white/5 text-gold-300',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
);

export type BadgeProps = ComponentProps<'span'> & VariantProps<typeof badgeVariants>;

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}

export { badgeVariants };

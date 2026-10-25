import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils';

/**
 * The button system.
 *
 * Gold appears only on the `accent` variant, which is reserved for the single
 * most important action on a page. Touch targets are at least 44px tall at the
 * default size so they are comfortable on a phone.
 */
const buttonVariants = cva(
  cn(
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-control)]',
    'font-sans text-sm font-semibold tracking-[0.01em]',
    'transition-[background-color,color,border-color,box-shadow] duration-200',
    'disabled:pointer-events-none disabled:opacity-55',
    '[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  ),
  {
    variants: {
      variant: {
        primary: 'bg-brand text-content-inverse hover:bg-brand-strong',
        /** The scarce gold call to action. */
        accent: 'bg-accent text-royal-950 hover:bg-gold-600 hover:text-white',
        outline:
          'border border-border-strong bg-transparent text-content-primary hover:border-brand hover:text-brand',
        subtle: 'bg-surface-sunken text-content-primary hover:bg-paper-dim',
        ghost: 'text-content-primary hover:bg-surface-sunken',
        link: 'h-auto p-0 text-brand underline decoration-1 underline-offset-4 hover:decoration-2',
        danger: 'bg-danger text-white hover:brightness-90',
        inverse:
          'border border-white/25 bg-transparent text-white hover:border-accent hover:text-gold-300',
      },
      size: {
        sm: 'h-9 px-3.5 text-[0.8125rem]',
        md: 'h-11 px-5',
        lg: 'h-13 px-7 text-base',
        icon: 'size-11',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export type ButtonProps = ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    /** Renders the child element instead of a `button`, e.g. a `Link`. */
    asChild?: boolean;
  };

export function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Component = asChild ? Slot : 'button';

  return (
    <Component
      data-slot="button"
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export { buttonVariants };

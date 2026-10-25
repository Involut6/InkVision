'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { Menu, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { PRIMARY_NAV, isActivePath } from '@/lib/navigation';
import { cn } from '@/lib/utils';

import { Logo } from './logo';

/**
 * Mobile navigation.
 *
 * Built on Radix Dialog, which supplies the accessibility behaviour this needs
 * and which is tedious to get right by hand: focus is moved into the panel and
 * trapped there, the page behind is marked inert for assistive technology,
 * Escape closes, and focus returns to the trigger on close.
 */
export function MobileNavigation() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close on navigation. Without this the panel stays open over the new page.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open the main menu">
          <Menu aria-hidden="true" />
        </Button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="bg-royal-950/40 data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=open]:animate-in data-[state=open]:fade-in fixed inset-0 z-50 backdrop-blur-sm" />

        <Dialog.Content
          className={cn(
            'fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col',
            'bg-surface-raised shadow-[--shadow-raised]',
            'focus:outline-none',
          )}
        >
          <Dialog.Title className="sr-only">Main menu</Dialog.Title>
          <Dialog.Description className="sr-only">
            Links to every section of the InkVision Creatives website.
          </Dialog.Description>

          <div className="border-border-subtle flex items-center justify-between border-b px-5 py-4">
            <Logo showDescriptor={false} />
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon" aria-label="Close the main menu">
                <X aria-hidden="true" />
              </Button>
            </Dialog.Close>
          </div>

          <nav aria-label="Main" className="flex-1 overflow-y-auto overscroll-contain px-5 py-6">
            <ul className="flex flex-col gap-1">
              {PRIMARY_NAV.map((item) => {
                const active = isActivePath(pathname, item.href);

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        // 48px minimum touch target.
                        'flex min-h-12 items-center rounded-[var(--radius-control)] px-3 py-2.5',
                        'font-sans text-base font-medium',
                        active
                          ? 'bg-brand-soft text-royal-700'
                          : 'text-content-primary hover:bg-surface-sunken',
                      )}
                    >
                      {item.label}
                    </Link>

                    {item.children ? (
                      <ul className="border-border-subtle mt-1 mb-2 ml-3 flex flex-col gap-0.5 border-l pl-4">
                        {item.children.map((child) => (
                          <li key={child.href}>
                            <Link
                              href={child.href}
                              aria-current={pathname === child.href ? 'page' : undefined}
                              className={cn(
                                'flex min-h-11 items-center py-2 text-sm',
                                pathname === child.href
                                  ? 'text-brand'
                                  : 'text-content-secondary hover:text-brand',
                              )}
                            >
                              {child.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="border-border-subtle border-t px-5 py-5">
            <Button asChild variant="primary" size="lg" className="w-full">
              <Link href="/contact">Discuss your goals</Link>
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

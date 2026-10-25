'use client';

import { ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { PRIMARY_NAV, isActivePath } from '@/lib/navigation';
import { cn } from '@/lib/utils';

import { Logo } from './logo';
import { MobileNavigation } from './mobile-navigation';

/**
 * The site header.
 *
 * Persistent across every page, with the enquiry call to action always
 * reachable. It is a client component for three reasons: the active-path
 * highlight, the services submenu, and the condensed state on scroll.
 */
export function SiteHeader() {
  const pathname = usePathname();
  const [condensed, setCondensed] = useState(false);

  useEffect(() => {
    const onScroll = () => setCondensed(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={cn(
        'bg-surface/92 sticky top-0 z-40 border-b backdrop-blur-md',
        'transition-[border-color,box-shadow] duration-300',
        condensed
          ? 'border-border-subtle shadow-[0_1px_12px_-6px_rgb(21_23_28/0.18)]'
          : 'border-transparent',
      )}
    >
      <div className="page-shell flex h-[4.5rem] items-center justify-between gap-6 lg:h-20">
        <Logo />

        <nav aria-label="Main" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {PRIMARY_NAV.map((item) =>
              item.children ? (
                <ServicesMenu key={item.href} item={item} pathname={pathname} />
              ) : (
                <li key={item.href}>
                  <NavLink href={item.href} active={isActivePath(pathname, item.href)}>
                    {item.label}
                  </NavLink>
                </li>
              ),
            )}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <Button asChild variant="primary" size="sm" className="hidden sm:inline-flex">
            <Link href="/contact">Discuss your goals</Link>
          </Button>
          <MobileNavigation />
        </div>
      </div>
    </header>
  );
}

function NavLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'relative inline-flex h-10 items-center px-3 font-sans text-sm font-medium transition-colors',
        active ? 'text-brand' : 'text-content-secondary hover:text-content-primary',
      )}
    >
      {children}
      {/* The active marker is the scarce gold accent at its smallest. */}
      {active ? (
        <span
          aria-hidden="true"
          className="border-accent absolute inset-x-3 bottom-1 h-0 border-t-2"
        />
      ) : null}
    </Link>
  );
}

/**
 * The services submenu.
 *
 * Implemented as a disclosure button rather than a hover menu: a hover-only
 * menu is unusable by keyboard and unreliable on touch. It opens on click or
 * Enter, closes on Escape or an outside click, and the trigger carries
 * `aria-expanded` so its state is announced.
 */
function ServicesMenu({
  item,
  pathname,
}: {
  item: (typeof PRIMARY_NAV)[number];
  pathname: string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLLIElement>(null);
  const active = isActivePath(pathname, item.href);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <li ref={containerRef} className="relative">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          'relative inline-flex h-10 items-center gap-1.5 px-3 font-sans text-sm font-medium transition-colors',
          active ? 'text-brand' : 'text-content-secondary hover:text-content-primary',
        )}
      >
        {item.label}
        <ChevronDown
          aria-hidden="true"
          className={cn('size-3.5 transition-transform duration-200', open && 'rotate-180')}
        />
        {active ? (
          <span
            aria-hidden="true"
            className="border-accent absolute inset-x-3 bottom-1 h-0 border-t-2"
          />
        ) : null}
      </button>

      {open ? (
        <div
          className={cn(
            'border-border-subtle absolute top-full left-0 z-50 mt-1 w-[26rem] border',
            'bg-surface-raised p-2 shadow-[--shadow-raised]',
          )}
        >
          <ul className="flex flex-col">
            <li>
              <Link
                href={item.href}
                className="hover:bg-surface-sunken flex flex-col gap-0.5 px-3 py-2.5"
              >
                <span className="text-content-primary font-sans text-sm font-semibold">
                  All services
                </span>
                <span className="text-meta text-content-muted">
                  How we can help, and which engagement fits
                </span>
              </Link>
            </li>

            <li aria-hidden="true" className="border-border-subtle my-1.5 border-t" />

            {item.children?.map((child) => (
              <li key={child.href}>
                <Link
                  href={child.href}
                  aria-current={pathname === child.href ? 'page' : undefined}
                  className="hover:bg-surface-sunken flex flex-col gap-0.5 px-3 py-2.5"
                >
                  <span className="text-content-primary font-sans text-sm font-semibold">
                    {child.label}
                  </span>
                  {child.description ? (
                    <span className="text-meta text-content-muted">{child.description}</span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </li>
  );
}

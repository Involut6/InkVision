'use client';

import {
  FileText,
  Inbox,
  LayoutDashboard,
  LogOut,
  Mail,
  Package,
  ScrollText,
  Settings,
  Users,
  Wrench,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { browserApi } from '@/lib/api.browser';
import { useAuthStore } from '@/lib/admin/auth-store';
import { cn } from '@/lib/utils';
import type { Permission } from '@inkvision/shared-types';

interface NavEntry {
  label: string;
  href: string;
  icon: typeof Inbox;
  /** Hidden when the signed-in user lacks this. Server enforcement is separate. */
  permission: Permission;
}

const NAV: readonly NavEntry[] = [
  { label: 'Dashboard', href: '/admin', icon: LayoutDashboard, permission: 'enquiry:read' },
  { label: 'Enquiries', href: '/admin/enquiries', icon: Inbox, permission: 'enquiry:read' },
  { label: 'Insights', href: '/admin/insights', icon: FileText, permission: 'article:read' },
  { label: 'Selected work', href: '/admin/work', icon: ScrollText, permission: 'case_study:read' },
  { label: 'Services', href: '/admin/services', icon: Wrench, permission: 'service:read' },
  { label: 'Resources', href: '/admin/resources', icon: Package, permission: 'product:read' },
  { label: 'Newsletter', href: '/admin/newsletter', icon: Mail, permission: 'newsletter:read' },
  { label: 'Team', href: '/admin/team', icon: Users, permission: 'user:read' },
  { label: 'Settings', href: '/admin/settings', icon: Settings, permission: 'settings:read' },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const can = useAuthStore((state) => state.can);
  const clearSession = useAuthStore((state) => state.clearSession);

  const signOut = async () => {
    // The server revokes the refresh token and clears the cookies; clearing
    // local state alone would leave a usable session behind.
    await browserApi.post('/admin/auth/logout').catch(() => undefined);
    clearSession();
    router.replace('/admin/login');
  };

  const visible = NAV.filter((entry) => can(entry.permission));

  return (
    <aside className="border-border-subtle bg-surface-raised flex w-full flex-col border-b lg:h-dvh lg:w-64 lg:shrink-0 lg:border-r lg:border-b-0">
      <div className="border-border-subtle border-b px-5 py-5">
        <Link href="/admin" className="text-content-primary font-serif text-lg leading-none">
          InkVision <span className="text-accent">Admin</span>
        </Link>
        {user ? (
          <p className="text-meta text-content-muted mt-2 truncate" title={user.email}>
            {user.fullName} · {user.role.replace('_', ' ').toLowerCase()}
          </p>
        ) : null}
      </div>

      <nav aria-label="Administration" className="flex-1 overflow-y-auto p-3">
        <ul className="flex flex-col gap-0.5">
          {visible.map((entry) => {
            const active =
              entry.href === '/admin' ? pathname === '/admin' : pathname.startsWith(entry.href);
            const Icon = entry.icon;

            return (
              <li key={entry.href}>
                <Link
                  href={entry.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex min-h-11 items-center gap-3 px-3 text-sm font-medium transition-colors',
                    active
                      ? 'bg-brand-soft text-royal-700'
                      : 'text-content-secondary hover:bg-surface-sunken hover:text-content-primary',
                  )}
                >
                  <Icon aria-hidden="true" className="size-4 shrink-0" />
                  {entry.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-border-subtle border-t p-3">
        <Link
          href="/"
          className="text-content-secondary hover:text-brand flex min-h-11 items-center gap-3 px-3 text-sm"
        >
          View the website
        </Link>
        <Button variant="ghost" onClick={signOut} className="mt-1 w-full justify-start gap-3 px-3">
          <LogOut aria-hidden="true" />
          Sign out
        </Button>
      </div>
    </aside>
  );
}

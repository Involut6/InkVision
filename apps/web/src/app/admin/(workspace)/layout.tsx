import type { ReactNode } from 'react';

import { AdminGuard } from '@/components/admin/admin-guard';
import { AdminSidebar } from '@/components/admin/admin-sidebar';

/**
 * The authenticated workspace.
 *
 * Everything inside this route group requires a session. The sign-in page sits
 * outside it so it is reachable when there is none.
 */
export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  return (
    <AdminGuard>
      <div className="flex min-h-dvh flex-col lg:flex-row">
        <AdminSidebar />
        <main className="min-w-0 flex-1 overflow-x-hidden">{children}</main>
      </div>
    </AdminGuard>
  );
}

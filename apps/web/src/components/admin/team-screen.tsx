'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, Plus } from 'lucide-react';
import { useState } from 'react';

import { AdminDataTable, type Column } from '@/components/admin/admin-data-table';
import { AdminPage } from '@/components/admin/admin-page';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Heading, Meta } from '@/components/ui/typography';
import { useAdminApi } from '@/lib/admin/use-admin-api';
import { useAuthStore } from '@/lib/admin/auth-store';
import { toFieldErrors } from '@/lib/api-error';
import { formatDate } from '@/lib/utils';
import { ADMIN_ROLES, type AdminRole, type AdminUserDto } from '@inkvision/shared-types';

type TeamMember = AdminUserDto & { mustChangePassword: boolean };

const ROLE_DESCRIPTIONS: Readonly<Record<AdminRole, string>> = {
  OWNER: 'Everything, including managing the team.',
  ADMIN: 'Everything except managing the team.',
  EDITOR: 'Content: articles, case studies, services and resources.',
  ENQUIRY_MANAGER: 'Enquiries and the newsletter list only.',
};

/**
 * Team management.
 *
 * An administrator never chooses another person's password. The API generates
 * a single-use temporary one, returns it exactly once, and forces a change at
 * first sign-in — so no credential is ever transmitted twice or stored by us.
 */
export function TeamScreen() {
  const call = useAdminApi();
  const queryClient = useQueryClient();
  const can = useAuthStore((state) => state.can);
  const currentUser = useAuthStore((state) => state.user);

  const [inviting, setInviting] = useState(false);
  const [temporaryPassword, setTemporaryPassword] = useState<{
    email: string;
    password: string;
  } | null>(null);

  const list = useQuery({
    queryKey: ['admin', 'team'],
    queryFn: () => call<TeamMember[]>('/admin/users'),
  });

  const columns: Column<TeamMember>[] = [
    {
      key: 'name',
      header: 'Name',
      render: (row) => (
        <div>
          <p className="text-content-primary font-medium">
            {row.fullName}
            {row.id === currentUser?.id ? (
              <span className="text-meta text-content-muted ml-2 font-normal">(you)</span>
            ) : null}
          </p>
          <Meta className="mt-0.5">{row.email}</Meta>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      render: (row) => (
        <div>
          <Badge tone="brand">{row.role.replace('_', ' ').toLowerCase()}</Badge>
          <Meta className="mt-1 hidden md:block">{ROLE_DESCRIPTIONS[row.role]}</Meta>
        </div>
      ),
    },
    {
      key: 'state',
      header: 'State',
      render: (row) => (
        <div className="flex flex-wrap gap-1.5">
          <Badge tone={row.isActive ? 'success' : 'neutral'}>
            {row.isActive ? 'Active' : 'Deactivated'}
          </Badge>
          {row.mustChangePassword ? <Badge tone="warning">Password change due</Badge> : null}
        </div>
      ),
    },
    {
      key: 'lastLogin',
      header: 'Last signed in',
      hideOnMobile: true,
      render: (row) => (
        <span className="text-content-secondary">
          {row.lastLoginAt ? formatDate(row.lastLoginAt) : 'Never'}
        </span>
      ),
    },
  ];

  return (
    <AdminPage
      title="Team"
      description="Who can sign in, and what each role may do. Permissions are enforced by the API, not by this interface."
      actions={
        can('user:write') ? (
          <Button onClick={() => setInviting(true)}>
            <Plus aria-hidden="true" />
            Invite a colleague
          </Button>
        ) : undefined
      }
    >
      {temporaryPassword ? (
        <div
          role="status"
          className="bg-accent-soft ring-border-accent mb-6 flex flex-col gap-3 p-5 ring-1"
        >
          <Heading level={3} as="p" className="text-gold-700 text-[1.0625rem]">
            Temporary password for {temporaryPassword.email}
          </Heading>
          <p className="text-gold-700 text-sm">
            Shown once and never again. Send it to them through a channel you trust — they must
            change it at first sign-in.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <code className="bg-surface-raised ring-border-subtle px-3 py-2 font-mono text-sm break-all ring-1">
              {temporaryPassword.password}
            </code>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void navigator.clipboard?.writeText(temporaryPassword.password)}
            >
              <Copy aria-hidden="true" />
              Copy
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setTemporaryPassword(null)}>
              Dismiss
            </Button>
          </div>
        </div>
      ) : null}

      {inviting ? (
        <div className="bg-surface-raised ring-border-subtle mb-6 p-5 ring-1">
          <InviteForm
            onCancel={() => setInviting(false)}
            onInvited={(result) => {
              setInviting(false);
              setTemporaryPassword(result);
              void queryClient.invalidateQueries({ queryKey: ['admin', 'team'] });
            }}
          />
        </div>
      ) : null}

      <AdminDataTable
        caption="Administration accounts"
        rows={list.data ?? []}
        columns={columns}
        getRowKey={(row) => row.id}
        isLoading={list.isLoading}
        error={list.error}
        onRetry={() => void list.refetch()}
        emptyTitle="No team members"
        emptyDescription="Accounts are created here or with the `pnpm admin:create` script."
      />
    </AdminPage>
  );
}

function InviteForm({
  onInvited,
  onCancel,
}: {
  onInvited: (result: { email: string; password: string }) => void;
  onCancel: () => void;
}) {
  const call = useAdminApi();
  const [values, setValues] = useState({ email: '', fullName: '', role: 'EDITOR' as AdminRole });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const invite = useMutation({
    mutationFn: () =>
      call<{ user: AdminUserDto; temporaryPassword: string }>('/admin/users', {
        method: 'POST',
        json: values,
      }),
    onSuccess: (result) =>
      onInvited({ email: result.user.email, password: result.temporaryPassword }),
    onError: (error) => setFieldErrors(toFieldErrors(error)),
  });

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        invite.mutate();
      }}
      className="flex flex-col gap-4"
    >
      <Heading level={3} as="h2" className="text-[1.0625rem]">
        Invite a colleague
      </Heading>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="invite-name" className="text-content-primary text-sm font-semibold">
            Full name
          </label>
          <input
            id="invite-name"
            value={values.fullName}
            onChange={(event) => setValues({ ...values, fullName: event.target.value })}
            className="border-border-strong bg-surface h-11 border px-3.5 text-sm"
          />
          {fieldErrors.fullName ? (
            <p className="text-meta text-danger">{fieldErrors.fullName}</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="invite-email" className="text-content-primary text-sm font-semibold">
            Email address
          </label>
          <input
            id="invite-email"
            type="email"
            value={values.email}
            onChange={(event) => setValues({ ...values, email: event.target.value })}
            className="border-border-strong bg-surface h-11 border px-3.5 text-sm"
          />
          {fieldErrors.email ? <p className="text-meta text-danger">{fieldErrors.email}</p> : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="invite-role" className="text-content-primary text-sm font-semibold">
            Role
          </label>
          <select
            id="invite-role"
            value={values.role}
            onChange={(event) => setValues({ ...values, role: event.target.value as AdminRole })}
            className="border-border-strong bg-surface h-11 border px-3 text-sm"
          >
            {ADMIN_ROLES.map((role) => (
              <option key={role} value={role}>
                {role.replace('_', ' ').toLowerCase()}
              </option>
            ))}
          </select>
        </div>
      </div>

      <Meta>{ROLE_DESCRIPTIONS[values.role]}</Meta>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={invite.isPending}>
          {invite.isPending ? 'Creating…' : 'Create account'}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        {invite.isError && Object.keys(fieldErrors).length === 0 ? (
          <p role="alert" className="text-meta text-danger">
            Could not create that account. Please try again.
          </p>
        ) : null}
      </div>
    </form>
  );
}

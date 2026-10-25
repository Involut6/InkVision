import type { Metadata } from 'next';

import { TeamScreen } from '@/components/admin/team-screen';

export const metadata: Metadata = { title: 'Team' };

export default function AdminTeamPage() {
  return <TeamScreen />;
}

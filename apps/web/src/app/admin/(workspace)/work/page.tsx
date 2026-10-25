import type { Metadata } from 'next';

import { WorkScreen } from '@/components/admin/work-screen';

export const metadata: Metadata = { title: 'Selected work' };

export default function AdminWorkPage() {
  return <WorkScreen />;
}

import type { Metadata } from 'next';

import { ResourcesScreen } from '@/components/admin/resources-screen';

export const metadata: Metadata = { title: 'Resources' };

export default function AdminResourcesPage() {
  return <ResourcesScreen />;
}

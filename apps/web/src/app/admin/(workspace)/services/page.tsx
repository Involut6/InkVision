import type { Metadata } from 'next';

import { ServicesScreen } from '@/components/admin/services-screen';

export const metadata: Metadata = { title: 'Services' };

export default function AdminServicesPage() {
  return <ServicesScreen />;
}

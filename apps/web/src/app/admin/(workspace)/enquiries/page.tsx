import type { Metadata } from 'next';

import { EnquiriesScreen } from '@/components/admin/enquiries-screen';

export const metadata: Metadata = { title: 'Enquiries' };

export default function AdminEnquiriesPage() {
  return <EnquiriesScreen />;
}

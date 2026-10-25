import type { Metadata } from 'next';

import { EnquiryDetailScreen } from '@/components/admin/enquiry-detail-screen';

export const metadata: Metadata = { title: 'Enquiry' };

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminEnquiryPage({ params }: PageProps) {
  const { id } = await params;
  return <EnquiryDetailScreen enquiryId={id} />;
}

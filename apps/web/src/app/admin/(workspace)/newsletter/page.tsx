import type { Metadata } from 'next';

import { NewsletterScreen } from '@/components/admin/newsletter-screen';

export const metadata: Metadata = { title: 'Newsletter' };

export default function AdminNewsletterPage() {
  return <NewsletterScreen />;
}

import type { Metadata } from 'next';

import { InsightsScreen } from '@/components/admin/insights-screen';

export const metadata: Metadata = { title: 'Insights' };

export default function AdminInsightsPage() {
  return <InsightsScreen />;
}

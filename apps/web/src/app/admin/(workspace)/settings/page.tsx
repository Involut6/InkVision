import type { Metadata } from 'next';

import { SettingsScreen } from '@/components/admin/settings-screen';

export const metadata: Metadata = { title: 'Settings' };

export default function AdminSettingsPage() {
  return <SettingsScreen />;
}

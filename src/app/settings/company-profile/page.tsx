import { getSettings } from '@/actions/settings';
import { Metadata } from 'next';
import { CompanyProfileClientPage } from './company-profile-client-page';

export const metadata: Metadata = {
  title: 'Firma Profili',
  description: 'Şirket bilgilerinizi yönetin.',
};

export default async function CompanyProfilePage() {
  const { data: settings } = await getSettings();
  return <CompanyProfileClientPage initialSettings={settings} />;
}

import { Metadata } from 'next';
import { MasterAnalyticsClientPage } from './master-analytics-client-page';

export const metadata: Metadata = {
  title: 'Master Karlılık Analizi',
};

export default function AnalyticsPage() {
  return <MasterAnalyticsClientPage />;
}

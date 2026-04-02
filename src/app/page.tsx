import { Metadata } from 'next';
import { DashboardView } from '@/components/dashboard/dashboard-view';

export const metadata: Metadata = {
  title: 'Yönetim Paneli',
};

export default async function HomePage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const resolvedSearchParams = await searchParams;
  const filter = (resolvedSearchParams?.filter && typeof resolvedSearchParams.filter === 'string') ? resolvedSearchParams.filter : 'thisMonth';
  return (
    <DashboardView filter={filter} />
  );
}

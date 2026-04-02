import { DashboardView } from '@/components/dashboard/dashboard-view';

interface PageProps {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function DashboardPage({ searchParams }: PageProps) {
    const resolvedSearchParams = await searchParams;
    const filter = typeof resolvedSearchParams?.filter === 'string' ? resolvedSearchParams.filter : 'thisMonth';

    return <DashboardView filter={filter} />;
}
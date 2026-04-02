import { Suspense } from 'react';
import { getProjects } from '@/actions/projects';
import { ProjectsClientPage } from './projects-client-page';
import { Skeleton } from '@/components/ui/skeleton';

async function ProjectsData({ q, status }: { q: string, status: string }) {
    const result = await getProjects({ q, status: status as any });

    const projects = result.success ? result.data?.projects : [];
    const allProjects = result.success ? result.data?.allProjects : [];

    return <ProjectsClientPage projects={projects || []} allProjects={allProjects || []} />;
}

interface PageProps {
    searchParams: Promise<{ [key: string]: string | undefined }>;
}

export default async function ProjectsPage({ searchParams }: PageProps) {
    const resolvedSearchParams = await searchParams;
    const q = resolvedSearchParams?.q || '';
    const status = resolvedSearchParams?.status || 'Ongoing';

    return (
        <Suspense fallback={<div className="p-8"><Skeleton className="w-full h-96" /></div>}>
            <ProjectsData q={q} status={status} />
        </Suspense>
    );
}

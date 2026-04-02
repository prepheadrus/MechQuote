import React from 'react';
import { getProject } from '@/actions/projects';
import ProjectDetailClientPage from './project-detail-client-page';

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const result = await getProject(id);

    return (
        <ProjectDetailClientPage
            projectId={id}
            initialProject={result.success ? result.data : null}
            serverError={!result.success ? (result.error || 'Proje sunucuda bulunamadı') : null}
        />
    );
}

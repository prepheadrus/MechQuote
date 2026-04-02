
import { Suspense } from 'react';
import TemplatesClientPage from './templates-client-page';
import { getTemplates } from '@/actions/templates';

export const dynamic = 'force-dynamic';

async function TemplatesPageContent() {
    const { data: templates } = await getTemplates();
    return <TemplatesClientPage initialTemplates={templates || []} />;
}

export default function TemplatesPage() {
    return (
        <div className="flex-1 h-full overflow-hidden">
            <Suspense fallback={<div className="p-8">Yükleniyor...</div>}>
                <TemplatesPageContent />
            </Suspense>
        </div>
    );
}

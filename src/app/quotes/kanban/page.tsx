import React from 'react';
import { KanbanClientPage } from './kanban-client-page';
import { Button } from '@/components/ui/button';
import { PlusIcon, LayoutListIcon } from 'lucide-react';
import Link from 'next/link';
import { getProposals } from '@/actions/proposals';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Teklif Panosu',
};

export default async function KanbanPage() {
    const result = await getProposals();
    const proposals = result.success ? (result.data || []) : [];

    return (
        <div className="h-[calc(100vh-4rem)] flex flex-col p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Teklif Panosu</h1>
                    <p className="text-sm text-slate-500">Tekliflerinizi sürükle-bırak yöntemiyle yönetin.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Link href="/quotes">
                        <Button variant="outline" size="sm" className="gap-2">
                            <LayoutListIcon className="w-4 h-4" />
                            Liste Görünümü
                        </Button>
                    </Link>
                    <Link href="/quotes/new">
                        <Button size="sm" className="gap-2 bg-blue-600 hover:bg-blue-700 text-white">
                            <PlusIcon className="w-4 h-4" />
                            Yeni Teklif
                        </Button>
                    </Link>
                </div>
            </div>

            <div className="flex-1 overflow-hidden">
                <KanbanClientPage initialProposals={proposals as any} />
            </div>
        </div>
    );
}

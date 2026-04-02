'use client';

import React from 'react';
import { Proposal } from '@prisma/client';
import { ProposalKanbanBoard } from '@/components/kanban/ProposalKanbanBoard';
import { updateProposalStatus, deleteProposal } from '@/actions/proposals';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

interface KanbanClientPageProps {
    initialProposals: Proposal[];
}

export function KanbanClientPage({ initialProposals }: KanbanClientPageProps) {
    const router = useRouter();
    const { toast } = useToast();
    const [proposals, setProposals] = React.useState<Proposal[]>(initialProposals || []);

    const handleStatusChange = async (id: string, newStatus: string) => {
        // Optimistic update
        const oldProposals = [...proposals];
        setProposals(prev => prev.map(p => p.id === id ? { ...p, status: newStatus as any } : p));

        const result = await updateProposalStatus(id, newStatus as any);
        if (result.success) {
            toast({
                title: 'Başarılı',
                description: 'Teklif durumu güncellendi',
            });
        } else {
            toast({
                title: 'Hata',
                description: result.error || 'Güncelleme başarısız',
                variant: 'destructive',
            });
            setProposals(oldProposals);
        }
    };

    const handleViewClick = (e: React.MouseEvent, id: string) => {
        e.preventDefault();
        router.push(`/quotes/${id}`);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Bu teklifi silmek istediğinize emin misiniz?')) return;

        const result = await deleteProposal(id);
        if (result.success) {
            toast({
                title: 'Başarılı',
                description: 'Teklif silindi',
            });
            setProposals(prev => prev.filter(p => p.id !== id));
        } else {
            toast({
                title: 'Hata',
                description: result.error || 'Silme işlemi başarısız',
                variant: 'destructive',
            });
        }
    };

    return (
        <ProposalKanbanBoard
            proposals={proposals}
            onStatusChange={handleStatusChange}
            onViewClick={handleViewClick}
            onDelete={handleDelete}
            onDuplicate={() => toast({ title: 'Bilgi', description: 'Kopyalama özelliği liste görünümünden kullanılabilir' })}
            onPrint={() => toast({ title: 'Bilgi', description: 'Yazdırma özelliği teklif detayından kullanılabilir' })}
        />
    );
}

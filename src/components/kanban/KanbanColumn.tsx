import React, { useMemo } from 'react';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Proposal } from '@prisma/client';
import { KanbanCard } from './KanbanCard';
import { formatCurrency } from '@/lib/formatters';
import { Button } from '@/components/ui/button';
import { Plus, X, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface KanbanColumnProps {
    column: {
        id: string; // 'Draft' | 'Sent' | 'Approved' | 'Rejected'
        title: string;
    };
    proposals: Proposal[];
    onViewClick: (e: React.MouseEvent, id: string) => void;
    onDuplicate: (proposal: Proposal) => void;
    onDelete: (id: string, rootId: string) => void;
    onPrint: (proposal: Proposal) => void;
}

export function KanbanColumn({ column, proposals, onViewClick, onDuplicate, onDelete, onPrint }: KanbanColumnProps) {
    const proposalIds = useMemo(() => (proposals || []).map((p) => p.id!), [proposals]);

    const { isOver, setNodeRef } = useSortable({
        id: column.id,
        data: {
            type: 'Column',
            column,
        },
    });

    const getStatusColor = (id: string) => {
        switch (id) {
            case 'Draft': return 'bg-slate-100 text-slate-700 border-slate-200';
            case 'Sent': return 'bg-blue-50 text-blue-700 border-blue-200';
            case 'Approved': return 'bg-green-50 text-green-700 border-green-200';
            case 'Rejected': return 'bg-red-50 text-red-700 border-red-200';
            default: return 'bg-slate-100';
        }
    };



    return (
        <div
            ref={setNodeRef}
            className={`
        flex flex-col h-full flex-1 min-w-[300px] rounded-xl border bg-slate-50/50 
        ${isOver ? 'ring-2 ring-primary/20 bg-primary/5' : 'border-slate-200'}
      `}
        >
            {/* Column Header */}
            <div className={`p-4 border-b flex items-center justify-between sticky top-0 bg-inherit rounded-t-xl z-10 backdrop-blur-sm`}>
                <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-sm text-slate-900 uppercase tracking-tight">{column.title}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusColor(column.id)}`}>
                        {proposals.length}
                    </span>
                </div>
                <div className="text-xs font-bold text-slate-600 tabular-nums">
                    {formatCurrency(proposals.reduce((sum, p) => sum + (p.totalAmount || 0), 0))}
                </div>
            </div>

            {/* Column Content (Droppable Area) */}
            <div className="flex-1 p-2 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 hover:scrollbar-thumb-slate-300">
                <SortableContext items={proposalIds} strategy={verticalListSortingStrategy}>
                    {proposals.map((proposal) => (
                        <KanbanCard
                            key={proposal.id}
                            proposal={proposal}
                            onViewClick={onViewClick}
                            onDuplicate={onDuplicate}
                            onDelete={onDelete}
                            onPrint={onPrint}
                        />
                    ))}
                </SortableContext>


                {proposals.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 p-4 text-center border-2 border-dashed border-slate-200 rounded-lg m-2 bg-slate-50/50">
                        <span className="text-xs">Bu aşamada teklif yok</span>
                    </div>
                )}
            </div>


        </div>
    );
}

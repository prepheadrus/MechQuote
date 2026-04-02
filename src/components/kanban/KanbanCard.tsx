import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Proposal } from '@prisma/client';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/lib/formatters';
import { CalendarIcon, UserIcon, FileTextIcon } from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

import { Button } from '@/components/ui/button';
import { Eye, Copy, Trash2, Printer } from 'lucide-react';

interface KanbanCardProps {
    proposal: Proposal;
    onViewClick: (e: React.MouseEvent, id: string) => void;
    onDuplicate: (proposal: Proposal) => void;
    onDelete: (id: string, rootId: string) => void;
    onPrint: (proposal: Proposal) => void;
}

export function KanbanCard({ proposal, onViewClick, onDuplicate, onDelete, onPrint }: KanbanCardProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: proposal.id,
        data: {
            type: 'Proposal',
            proposal,
        },
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    // Logic for High Value and Overdue
    const isHighValue = proposal.totalAmount > 100000;
    const isOverdue = React.useMemo(() => {
        if (!proposal.createdAt) return false;
        if (proposal.status === 'Approved' || proposal.status === 'Rejected') return false;

        const daysDiff = (new Date().getTime() - new Date(proposal.createdAt).getTime()) / (1000 * 3600 * 24);
        return daysDiff > 7; // consider overdue if older than 7 days and still in Draft/Sent
    }, [proposal.createdAt, proposal.status]);

    if (isDragging) {
        return (
            <div
                ref={setNodeRef}
                style={style}
                className="opacity-50 bg-slate-100 rounded-lg h-[140px] border-2 border-dashed border-slate-300"
            />
        );
    }

    // Format currency helper if not imported
    const formatMoney = (amount: number) => {
        return new Intl.NumberFormat('tr-TR', {
            style: 'currency',
            currency: 'TRY', // Assuming base is TRY, or use proposal currency logical
        }).format(amount);
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="mb-3 group touch-none relative">
            <Card
                className={`
                    bg-white hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing shadow-sm relative overflow-hidden
                    ${isHighValue ? 'border-amber-400 border-2' : 'border-slate-200'}
                    ${isOverdue ? 'ring-2 ring-red-100' : ''}
                `}
                onClick={(e) => onViewClick(e, proposal.id)}
            >
                {/* Status Indicator Strip */}
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${proposal.status === 'Approved' ? 'bg-green-500' :
                    proposal.status === 'Rejected' ? 'bg-red-500' :
                        proposal.status === 'Sent' ? 'bg-blue-500' :
                            'bg-slate-400'
                    }`} />

                <CardContent className="p-3 pl-4 space-y-2">
                    {/* Header: Number & Date */}
                    <div className="flex justify-between items-start">
                        <div className="flex items-center gap-1.5 text-xs font-mono text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded">
                            <FileTextIcon className="w-3 h-3" />
                            <span>{proposal.quoteNumber}</span>
                        </div>
                        {proposal.createdAt && (
                            <div className={`flex items-center gap-1 text-[10px] ${isOverdue ? 'text-red-500 font-bold' : 'text-slate-400'}`}>
                                <CalendarIcon className="w-3 h-3" />
                                <span>{format(new Date(proposal.createdAt), 'dd MMM', { locale: tr })}</span>
                            </div>
                        )}
                    </div>

                    {/* Customer & Project */}
                    <div>
                        <h4 className="font-semibold text-slate-900 text-sm leading-tight line-clamp-1" title={proposal.customerName}>
                            {proposal.customerName}
                        </h4>
                        {proposal.projectName && (
                            <p className="text-xs text-slate-500 mt-0.5 line-clamp-1" title={proposal.projectName}>
                                {proposal.projectName}
                            </p>
                        )}

                        {/* Tags */}
                        {proposal.tags && proposal.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                                {proposal.tags.split(',').map(tag => (
                                    <span key={tag} className="px-1.5 py-0.5 rounded-md text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-100 font-medium">
                                        {tag.trim()}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Amount and Actions */}
                    <div className="pt-2 border-t border-slate-100 flex justify-between items-center mt-2">
                        <span className="font-bold text-slate-900 text-sm">
                            {formatCurrency(proposal.totalAmount)}
                        </span>

                        {/* Quick Actions - Visible on Hover (or always visible on mobile/tablet if preferred) */}
                        <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                            {/* Print */}
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-slate-400 hover:text-slate-800"
                                title="Yazdır"
                                onClick={(e) => { e.stopPropagation(); onPrint(proposal); }}
                            >
                                <Printer className="w-3.5 h-3.5" />
                            </Button>

                            {/* Duplicate */}
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-slate-400 hover:text-blue-600"
                                title="Kopyala"
                                onClick={(e) => { e.stopPropagation(); onDuplicate(proposal); }}
                            >
                                <Copy className="w-3.5 h-3.5" />
                            </Button>

                            {/* Delete */}
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-slate-400 hover:text-red-600"
                                title="Sil"
                                onClick={(e) => { e.stopPropagation(); onDelete(proposal.id!, proposal.id!); }}
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

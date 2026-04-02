import React from 'react';
import { DndContext, DragEndEvent, DragOverlay, useSensor, useSensors, PointerSensor, TouchSensor } from '@dnd-kit/core';
import { Proposal } from '@prisma/client';
import { KanbanColumn } from './KanbanColumn';
import { KanbanCard } from './KanbanCard';
import { createPortal } from 'react-dom';

interface ProposalKanbanBoardProps {
    proposals: Proposal[];
    onStatusChange: (id: string, newStatus: Proposal['status']) => void;
    onViewClick: (e: React.MouseEvent, id: string) => void;
    onDuplicate: (proposal: Proposal) => void;
    onDelete: (id: string, rootId: string) => void;
    onPrint: (proposal: Proposal) => void;
}

const COLUMNS: { id: Proposal['status'], title: string }[] = [
    { id: 'Draft', title: 'Hazırlanıyor' },
    { id: 'Sent', title: 'Gönderildi' },
    { id: 'Approved', title: 'Onaylandı' },
    { id: 'Rejected', title: 'Reddedildi' },
];

export function ProposalKanbanBoard({ proposals, onStatusChange, onViewClick, onDuplicate, onDelete, onPrint }: ProposalKanbanBoardProps) {
    const [mounted, setMounted] = React.useState(false);
    const [activeProposal, setActiveProposal] = React.useState<Proposal | null>(null);

    React.useEffect(() => {
        setMounted(true);
    }, []);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(TouchSensor)
    );

    const handleDragStart = (event: any) => {
        setActiveProposal(event.active.data.current?.proposal || null);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveProposal(null);

        if (!over) return;

        const proposalId = active.id as string;
        const newStatus = over.id as Proposal['status'];
        const currentStatus = active.data.current?.proposal?.status;

        if (currentStatus !== newStatus) {
            onStatusChange(proposalId, newStatus);
        }
    };

    // Group proposals by status
    const columns = React.useMemo(() => {
        const grouped: Record<string, Proposal[]> = {
            Draft: [],
            Sent: [],
            Approved: [],
            Rejected: [],
        };

        // Sort logic is not strictly required here if we don't care about order within column yet, 
        // but preserving some order (like date desc) is good.
        // Respect the order of the passed 'proposals' prop (which is already sorted by the main page logic)
        proposals.forEach(p => {
            if (grouped[p.status]) {
                grouped[p.status].push(p);
            }
        });

        return grouped;
    }, [proposals]);

    if (!mounted) return null;

    return (
        <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div className="flex h-full w-full gap-4 overflow-x-auto pb-4 items-start">
                {COLUMNS.map(col => (
                    <KanbanColumn
                        key={col.id}
                        column={col}
                        proposals={columns[col.id] || []}
                        onViewClick={onViewClick}
                        onDuplicate={onDuplicate}
                        onDelete={onDelete}
                        onPrint={onPrint}
                    />
                ))}
            </div>

            {createPortal(
                <DragOverlay>
                    {activeProposal ? (
                        <KanbanCard
                            proposal={activeProposal}
                            onViewClick={() => { }}
                            onDuplicate={() => { }}
                            onDelete={() => { }}
                            onPrint={() => { }}
                        />
                    ) : null}
                </DragOverlay>,
                document.body
            )}
        </DndContext>
    );
}

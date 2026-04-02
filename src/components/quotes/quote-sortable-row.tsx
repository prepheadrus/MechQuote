/**
 * Quote Sortable Row Component
 * 
 * Sürüklenebilir teklif satırı
 */

'use client';

import React from 'react';
import { TableRow, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { GripVertical } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';

interface SortableItemRowProps {
    id: string;
    index: number;
    item: any;
    children: React.ReactNode;
    isChecked?: boolean;
    isCompact?: boolean;
}

export function SortableItemRow({ 
    id, 
    index, 
    item, 
    children, 
    isChecked = false, 
    isCompact = false 
}: SortableItemRowProps) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id,
        data: {
            originalIndex: index,
            groupName: item.groupName,
            type: 'item',
        },
    });

    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 10 : 'auto',
        position: 'relative',
    };

    return (
        <TableRow 
            ref={setNodeRef} 
            style={style} 
            className={cn(
                isChecked && "bg-green-50/50 dark:bg-green-900/10 transition-colors duration-300"
            )}
        >
            <TableCell className="py-1 px-2 bg-slate-50 dark:bg-slate-800/50">
                <Button 
                    variant="ghost" 
                    size="icon" 
                    {...attributes} 
                    {...listeners} 
                    className="cursor-grab h-8 w-8"
                >
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                </Button>
            </TableCell>
            {children}
        </TableRow>
    );
}

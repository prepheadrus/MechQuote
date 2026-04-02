'use client';

import React from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Copy, Eye, Pencil } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { getStatusBadge, formatCurrency, formatDate } from '@/lib/formatters';
import { Proposal } from '@prisma/client';

import { useWorkspace } from '@/components/workspace/workspace-context';

export interface QuoteListFlatViewProps {
    proposals: Proposal[];
    selectedIds: Set<string>;
    isRevising: string | null;
    onToggleSelection: (id: string, isChecked: boolean) => void;
    onViewClick: (e: React.MouseEvent, id: string) => void;
    onDuplicateProposal: (proposal: Proposal) => void;
    onPrint: (proposal: Proposal) => void;
    onRenameProposal: (proposal: Proposal) => void;
}

export function QuoteListFlatView({
    proposals,
    selectedIds,
    isRevising,
    onToggleSelection,
    onViewClick,
    onDuplicateProposal,
    onPrint,
    onRenameProposal
}: QuoteListFlatViewProps) {
    const { openTab } = useWorkspace();

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead className="w-12 px-4">
                        <Checkbox
                            checked={proposals.length > 0 && proposals.every(v => v.id && selectedIds.has(v.id))}
                            onCheckedChange={(checked) => {
                                proposals.forEach(v => {
                                    if (v.id) onToggleSelection(v.id, !!checked);
                                });
                            }}
                        />
                    </TableHead>
                    <TableHead>Teklif No</TableHead>
                    <TableHead>Cari Hesap</TableHead>
                    <TableHead>Proje</TableHead>
                    <TableHead className="text-right">Tutar</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead>Versiyon</TableHead>
                    <TableHead>Tarih</TableHead>
                    <TableHead className="text-right">İşlemler</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {proposals.length > 0 ? (
                    proposals.map(v => (
                        <TableRow key={v.id || Math.random()} data-state={v.id && selectedIds.has(v.id) ? 'selected' : undefined}>
                            <TableCell className="px-4 py-2">
                                <Checkbox
                                    checked={!!v.id && selectedIds.has(v.id)}
                                    onCheckedChange={(checked) => v.id && onToggleSelection(v.id, !!checked)}
                                />
                            </TableCell>
                            <TableCell className="font-medium py-2">{v.quoteNumber}</TableCell>
                            <TableCell className="text-muted-foreground py-2">{v.customerName}</TableCell>
                            <TableCell className="py-2">
                                <div className="flex items-center group/title">
                                    <div className="truncate max-w-[200px]" title={v.projectName}>{v.projectName}</div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 ml-1 opacity-0 group-hover/title:opacity-100 transition-opacity"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onRenameProposal(v);
                                        }}
                                    >
                                        <Pencil className="h-3 w-3 text-muted-foreground" />
                                    </Button>
                                </div>
                                {v.versionNote && (
                                    <div className="text-xs text-muted-foreground mt-0.5 truncate max-w-[200px]" title={v.versionNote}>
                                        {v.versionNote}
                                    </div>
                                )}
                            </TableCell>
                            <TableCell className="text-right font-semibold py-2">{formatCurrency(v.totalAmount)}</TableCell>
                            <TableCell className="py-2">{getStatusBadge(v.status)}</TableCell>
                            <TableCell className="py-2"><Badge variant="secondary">v{v.version}</Badge></TableCell>
                            <TableCell className="py-2 text-sm text-muted-foreground whitespace-nowrap">{formatDate(v.createdAt)}</TableCell>
                            <TableCell className="text-right py-2">
                                <div className="flex items-center justify-end gap-1">
                                    <Button variant="outline" size="sm" onClick={() => v.id && openTab(`/quotes/${v.id}`, `${v.customerName || 'Müşteri'} - ${v.quoteNumber}`)}>
                                        <Eye className="mr-2 h-4 w-4" /> Görüntüle
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={() => onPrint(v)}>
                                        <Eye className="mr-2 h-4 w-4" /> Yazdır
                                    </Button>
                                </div>
                            </TableCell>
                        </TableRow>
                    ))
                ) : (
                    <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground p-12">
                            Bu filtrelerle eşleşen teklif bulunamadı.
                        </TableCell>
                    </TableRow>
                )}
            </TableBody>
        </Table>
    );
}

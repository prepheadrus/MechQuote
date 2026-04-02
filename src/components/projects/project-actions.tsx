/**
 * Project Actions Component
 * 
 * Proje işlem butonları ve hızlı aksiyonlar
 */

'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Printer, History, MoreVertical, FileText, Users, Receipt } from 'lucide-react';

interface ProjectActionsProps {
    projectId: string;
    customerId: string;
    onPrintProposal: (proposalId: string) => void;
    onViewHistory: () => void;
    onManageTeam: () => void;
    onAddTransaction: () => void;
    proposals?: Array<{ id: string; quoteNumber: string }>;
}

export function ProjectActions({
    projectId,
    customerId,
    onPrintProposal,
    onViewHistory,
    onManageTeam,
    onAddTransaction,
    proposals = [],
}: ProjectActionsProps) {
    return (
        <div className="flex items-center gap-2">
            {/* Teklif Yazdır */}
            {proposals.length > 0 && (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="gap-2">
                            <Printer className="h-4 w-4" />
                            Teklif Yazdır
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        {proposals.map((proposal) => (
                            <DropdownMenuItem
                                key={proposal.id}
                                onClick={() => onPrintProposal(proposal.id)}
                            >
                                <FileText className="h-4 w-4 mr-2" />
                                {proposal.quoteNumber}
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
            )}

            {/* Geçmiş */}
            <Button variant="outline" onClick={onViewHistory} className="gap-2">
                <History className="h-4 w-4" />
                Geçmiş
            </Button>

            {/* Hızlı İşlemler */}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon">
                        <MoreVertical className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={onManageTeam}>
                        <Users className="h-4 w-4 mr-2" />
                        Ekip Yönet
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={onAddTransaction}>
                        <Receipt className="h-4 w-4 mr-2" />
                        İşlem Ekle
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}

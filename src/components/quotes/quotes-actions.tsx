/**
 * Quotes Actions Component
 * 
 * Toplu işlem aksiyonları - Seçili teklifler için işlemler
 */

'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    CheckSquare,
    MoreHorizontal,
    FileText,
    Trash2,
    Copy,
    Download,
    Mail,
    User,
} from 'lucide-react';

interface QuotesActionsProps {
    selectedCount: number;
    onSelectAll: (checked: boolean) => void;
    onBulkStatusChange: (status: string) => void;
    onBulkDelete: () => void;
    onBulkExport: () => void;
    onBulkEmail: () => void;
    onBulkConvert: () => void;
}

export function QuotesActions({
    selectedCount,
    onSelectAll,
    onBulkStatusChange,
    onBulkDelete,
    onBulkExport,
    onBulkEmail,
    onBulkConvert,
}: QuotesActionsProps) {
    if (selectedCount === 0) {
        return (
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                <CheckSquare className="h-4 w-4" />
                Toplu işlem için teklif seçin
            </div>
        );
    }

    return (
        <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-3">
                <input
                    type="checkbox"
                    checked={selectedCount > 0}
                    onChange={(e) => onSelectAll(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="font-semibold text-blue-700 dark:text-blue-400">
                    {selectedCount} teklif seçili
                </span>
            </div>

            <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={onBulkExport}>
                    <Download className="h-4 w-4 mr-2" />
                    Excel
                </Button>
                <Button variant="outline" size="sm" onClick={onBulkEmail}>
                    <Mail className="h-4 w-4 mr-2" />
                    E-posta
                </Button>
                <Button variant="outline" size="sm" onClick={onBulkConvert}>
                    <User className="h-4 w-4 mr-2" />
                    Projeye Çevir
                </Button>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Toplu İşlemler</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => onBulkStatusChange('Draft')}>
                            <FileText className="h-4 w-4 mr-2" />
                            Taslak Olarak İşaretle
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onBulkStatusChange('Sent')}>
                            <Mail className="h-4 w-4 mr-2" />
                            Gönderildi Olarak İşaretle
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onBulkStatusChange('Approved')}>
                            <CheckSquare className="h-4 w-4 mr-2" />
                            Onaylandı Olarak İşaretle
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={onBulkDelete} className="text-red-600">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Sil
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
}

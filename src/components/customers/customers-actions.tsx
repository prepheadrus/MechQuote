/**
 * Customers Actions Component
 * 
 * Müşteri toplu işlem aksiyonları
 */

'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckSquare, Mail, Trash2, FileSpreadsheet } from 'lucide-react';

interface CustomersActionsProps {
    selectedCount: number;
    onSelectAll: (checked: boolean) => void;
    onBulkEmail: () => void;
    onBulkDelete: () => void;
    onBulkExport: () => void;
}

export function CustomersActions({
    selectedCount,
    onSelectAll,
    onBulkEmail,
    onBulkDelete,
    onBulkExport,
}: CustomersActionsProps) {
    if (selectedCount === 0) {
        return (
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                <CheckSquare className="h-4 w-4" />
                Toplu işlem için müşteri seçin
            </div>
        );
    }

    return (
        <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-3">
                <Badge variant="default" className="h-6">
                    {selectedCount}
                </Badge>
                <span className="font-semibold text-blue-700 dark:text-blue-400">
                    müşteri seçili
                </span>
            </div>

            <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={onBulkExport} className="gap-2">
                    <FileSpreadsheet className="h-4 w-4" />
                    Excel
                </Button>
                <Button variant="outline" size="sm" onClick={onBulkEmail} className="gap-2">
                    <Mail className="h-4 w-4" />
                    E-posta
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={onBulkDelete}
                    className="gap-2 text-red-600 hover:text-red-700"
                >
                    <Trash2 className="h-4 w-4" />
                    Sil
                </Button>
            </div>
        </div>
    );
}

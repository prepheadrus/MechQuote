/**
 * Quotes Pagination Component
 * 
 * Teklif listesi sayfalama kontrolleri
 */

'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface QuotesPaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}

export function QuotesPagination({
    currentPage,
    totalPages,
    onPageChange,
}: QuotesPaginationProps) {
    if (totalPages <= 1) return null;

    return (
        <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800 px-4 py-4">
            <div className="text-sm text-muted-foreground">
                Sayfa <span className="font-medium">{currentPage}</span> / <span className="font-medium">{totalPages}</span>
            </div>
            <div className="flex items-center gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="gap-1"
                >
                    <ChevronLeft className="h-4 w-4" />
                    Önceki
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="gap-1"
                >
                    Sonraki
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}

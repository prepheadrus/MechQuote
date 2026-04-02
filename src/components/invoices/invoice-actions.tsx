/**
 * Invoice Actions Component
 * 
 * Fatura işlemleri - Yükleme, önizleme ve kaydetme
 */

'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Check, Eye, Save } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InvoiceActionsProps {
    isUploading: boolean;
    isPreviewOpen: boolean;
    hasPreview: boolean;
    isSaving: boolean;
    onPreview: () => void;
    onSave: () => void;
    onCancel: () => void;
}

export function InvoiceActions({
    isUploading,
    isPreviewOpen,
    hasPreview,
    isSaving,
    onPreview,
    onSave,
    onCancel,
}: InvoiceActionsProps) {
    return (
        <div className="flex items-center justify-end gap-4 border-t border-slate-200 dark:border-slate-800 pt-4 mt-6">
            {hasPreview && !isPreviewOpen && (
                <Button
                    variant="outline"
                    onClick={onPreview}
                    className="gap-2"
                >
                    <Eye className="h-4 w-4" />
                    Önizle
                </Button>
            )}

            {isUploading && (
                <Button variant="outline" onClick={onCancel} className="gap-2">
                    İptal
                </Button>
            )}

            {hasPreview && (
                <Button
                    onClick={onSave}
                    disabled={isSaving || isUploading}
                    className={cn(
                        "gap-2",
                        isSaving && "bg-green-600 hover:bg-green-700"
                    )}
                >
                    {isSaving ? (
                        <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Kaydediliyor...
                        </>
                    ) : (
                        <>
                            <Save className="h-4 w-4" />
                            Kaydet ve Devam Et
                        </>
                    )}
                </Button>
            )}
        </div>
    );
}

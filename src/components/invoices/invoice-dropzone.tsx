/**
 * Invoice Dropzone Component
 * 
 * Fatura yükleme alanı - Drag & drop
 */

'use client';

import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface InvoiceDropzoneProps {
    onFileAccepted: (file: File) => void;
    disabled?: boolean;
}

export function InvoiceDropzone({ onFileAccepted, disabled = false }: InvoiceDropzoneProps) {
    const [isUploading, setIsUploading] = useState(false);

    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles.length > 0) {
            setIsUploading(true);
            onFileAccepted(acceptedFiles[0]);
        }
    }, [onFileAccepted]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'application/pdf': ['.pdf'],
            'image/*': ['.png', '.jpg', '.jpeg'],
            'text/xml': ['.xml'],
            'application/xml': ['.xml'],
        },
        maxFiles: 1,
        disabled,
    });

    return (
        <div
            {...getRootProps()}
            className={cn(
                "border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors",
                isDragActive
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                    : "border-slate-300 dark:border-slate-700 hover:border-blue-400 hover:bg-slate-50 dark:hover:bg-slate-800",
                disabled && "opacity-50 cursor-not-allowed"
            )}
        >
            <input {...getInputProps()} />
            
            {isUploading ? (
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
                    <div>
                        <p className="text-lg font-semibold">Dosya Yükleniyor...</p>
                        <p className="text-sm text-muted-foreground">Lütfen bekleyin</p>
                    </div>
                </div>
            ) : isDragActive ? (
                <div className="flex flex-col items-center gap-4">
                    <Upload className="h-12 w-12 text-blue-600" />
                    <div>
                        <p className="text-lg font-semibold">Dosyayı Bırakın...</p>
                        <p className="text-sm text-muted-foreground">PDF, XML veya Resim</p>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col items-center gap-4">
                    <div className="h-16 w-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                        <FileText className="h-8 w-8 text-blue-600" />
                    </div>
                    <div>
                        <p className="text-lg font-semibold">Fatura Yükleyin</p>
                        <p className="text-sm text-muted-foreground mt-1">
                            Sürükleyin veya <span className="text-blue-600 underline">göz atın</span>
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                            PDF, XML, PNG, JPG (Maks. 10MB)
                        </p>
                    </div>
                    <Button variant="outline" className="mt-2">
                        <Upload className="h-4 w-4 mr-2" />
                        Dosya Seç
                    </Button>
                </div>
            )}
        </div>
    );
}

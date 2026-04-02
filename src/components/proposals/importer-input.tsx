/**
 * Importer Input Component
 * 
 * Teklif metni girişi ve dosya yükleme
 */

'use client';

import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, FileText, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImporterInputProps {
    value: string;
    onChange: (value: string) => void;
    onFileUpload: (file: File) => Promise<void>;
    isUploading: boolean;
}

export function ImporterInput({
    value,
    onChange,
    onFileUpload,
    isUploading,
}: ImporterInputProps) {
    const [activeTab, setActiveTab] = useState('text');

    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        if (acceptedFiles.length > 0) {
            await onFileUpload(acceptedFiles[0]);
        }
    }, [onFileUpload]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'application/pdf': ['.pdf'],
            'image/*': ['.png', '.jpg', '.jpeg'],
            'text/plain': ['.txt'],
        },
        maxFiles: 1,
        disabled: isUploading,
    });

    return (
        <div className="space-y-4">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="text" className="gap-2">
                        <FileText className="h-4 w-4" />
                        Metin
                    </TabsTrigger>
                    <TabsTrigger value="file" className="gap-2">
                        <Upload className="h-4 w-4" />
                        Dosya
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="text" className="mt-4">
                    <Textarea
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder="Teklif metnini buraya yapıştırın..."
                        className="min-h-[400px] font-mono text-sm"
                    />
                </TabsContent>

                <TabsContent value="file" className="mt-4">
                    <div
                        {...getRootProps()}
                        className={cn(
                            "border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors",
                            isDragActive
                                ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                                : "border-slate-300 dark:border-slate-700 hover:border-blue-400 hover:bg-slate-50 dark:hover:bg-slate-800",
                            isUploading && "opacity-50 cursor-not-allowed"
                        )}
                    >
                        <input {...getInputProps()} />
                        
                        {isUploading ? (
                            <div className="flex flex-col items-center gap-4">
                                <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
                                <div>
                                    <p className="text-lg font-semibold">Dosya İşleniyor...</p>
                                    <p className="text-sm text-muted-foreground">Lütfen bekleyin</p>
                                </div>
                            </div>
                        ) : isDragActive ? (
                            <div className="flex flex-col items-center gap-4">
                                <Upload className="h-12 w-12 text-blue-600" />
                                <div>
                                    <p className="text-lg font-semibold">Dosyayı Bırakın...</p>
                                    <p className="text-sm text-muted-foreground">PDF, Resim veya Metin</p>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-4">
                                <div className="h-16 w-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                    <FileText className="h-8 w-8 text-blue-600" />
                                </div>
                                <div>
                                    <p className="text-lg font-semibold">Dosya Yükleyin</p>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        Sürükleyin veya <span className="text-blue-600 underline">göz atın</span>
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-2">
                                        PDF, PNG, JPG, TXT (Maks. 10MB)
                                    </p>
                                </div>
                                <Button variant="outline" className="mt-2">
                                    <Upload className="h-4 w-4 mr-2" />
                                    Dosya Seç
                                </Button>
                            </div>
                        )}
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}

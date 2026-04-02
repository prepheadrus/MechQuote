/**
 * Progress Overlay Component
 * 
 * OCR, PDF ve AI işlemleri için ilerleme göstergesi
 * Düşük konfigürasyonlu makinelerde kullanıcıya görsel geri bildirim sağlar
 */

'use client';

import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, CheckCircle2, AlertCircle, FileText, Cpu, Database } from 'lucide-react';

interface ProgressOverlayProps {
    status: 'idle' | 'loading' | 'recognizing' | 'processing' | 'done' | 'error';
    progress: number;
    message: string;
    currentPage?: number;
    totalPages?: number;
    isVisible: boolean;
    onClose?: () => void;
}

const statusIcons = {
    idle: null,
    loading: Loader2,
    recognizing: FileText,
    processing: Cpu,
    done: CheckCircle2,
    error: AlertCircle,
};

const statusColors = {
    idle: 'bg-gray-100 dark:bg-gray-800',
    loading: 'bg-blue-100 dark:bg-blue-900',
    recognizing: 'bg-purple-100 dark:bg-purple-900',
    processing: 'bg-orange-100 dark:bg-orange-900',
    done: 'bg-green-100 dark:bg-green-900',
    error: 'bg-red-100 dark:bg-red-900',
};

export function ProgressOverlay({
    status,
    progress,
    message,
    currentPage,
    totalPages,
    isVisible,
    onClose,
}: ProgressOverlayProps) {
    if (!isVisible || status === 'idle') {
        return null;
    }

    const Icon = statusIcons[status];
    const bgColor = statusColors[status];

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
            <Card className="w-full max-w-md mx-4 shadow-2xl">
                <CardContent className="pt-6">
                    <div className="space-y-4">
                        {/* Icon ve Başlık */}
                        <div className="flex items-center gap-3">
                            {Icon && (
                                <Icon
                                    className={`w-8 h-8 ${
                                        status === 'error'
                                            ? 'text-red-500'
                                            : status === 'done'
                                            ? 'text-green-500'
                                            : 'text-blue-500 animate-spin'
                                    }`}
                                />
                            )}
                            <h3 className="text-lg font-semibold">
                                {status === 'loading' && 'Yükleniyor...'}
                                {status === 'recognizing' && 'OCR Yapılıyor...'}
                                {status === 'processing' && 'İşleniyor...'}
                                {status === 'done' && 'Tamamlandı'}
                                {status === 'error' && 'Hata'}
                            </h3>
                        </div>

                        {/* İlerleme Çubuğu */}
                        <div className="space-y-2">
                            <Progress value={progress * 100} className="h-2" />
                            <div className="flex justify-between text-sm text-gray-500">
                                <span>{message}</span>
                                <span>{(progress * 100).toFixed(0)}%</span>
                            </div>
                        </div>

                        {/* Sayfa Bilgisi */}
                        {currentPage !== undefined && totalPages !== undefined && (
                            <div className={`text-sm ${bgColor} rounded-md p-2 text-center`}>
                                Sayfa {currentPage} / {totalPages}
                            </div>
                        )}

                        {/* Hata Mesajı */}
                        {status === 'error' && (
                            <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-md p-2">
                                {message}
                            </div>
                        )}

                        {/* Kapatma Butonu (Tamamlandı veya Hata) */}
                        {(status === 'done' || status === 'error') && onClose && (
                            <button
                                onClick={onClose}
                                className="w-full mt-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                            >
                                {status === 'error' ? 'Kapat' : 'Tamam'}
                            </button>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

/**
 * Mini Progress Bar Component
 * Inline işlemler için kompakt versiyon
 */
interface MiniProgressBarProps {
    progress: number;
    message?: string;
    status?: 'loading' | 'recognizing' | 'processing' | 'done' | 'error';
}

export function MiniProgressBar({ progress, message, status = 'loading' }: MiniProgressBarProps) {
    if (status === 'done' || status === 'error') {
        return null;
    }

    return (
        <div className="w-full space-y-1">
            <Progress value={progress * 100} className="h-1" />
            {message && (
                <p className="text-xs text-gray-500 text-center">{message}</p>
            )}
        </div>
    );
}

/**
 * Batch Progress Component
 * AI batch işlemler için özel progress
 */
interface BatchProgressProps {
    processed: number;
    total: number;
    currentBatch: number;
    totalBatches: number;
    message?: string;
}

export function BatchProgress({
    processed,
    total,
    currentBatch,
    totalBatches,
    message,
}: BatchProgressProps) {
    const progress = processed / total;

    return (
        <Card className="w-full">
            <CardContent className="pt-4">
                <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">
                            {message || 'AI eşleştirme'}
                        </span>
                        <span className="font-medium">
                            {currentBatch}/{totalBatches} grup
                        </span>
                    </div>
                    
                    <Progress value={progress * 100} className="h-2" />
                    
                    <div className="flex justify-between text-xs text-gray-500">
                        <span>{processed}/{total} ürün</span>
                        <span>{(progress * 100).toFixed(0)}%</span>
                    </div>

                    <div className="flex gap-1 flex-wrap">
                        {Array.from({ length: totalBatches }).map((_, i) => (
                            <div
                                key={i}
                                className={`h-2 flex-1 rounded-full transition-colors ${
                                    i < currentBatch
                                        ? 'bg-green-500'
                                        : i === currentBatch - 1
                                        ? 'bg-blue-500 animate-pulse'
                                        : 'bg-gray-200 dark:bg-gray-700'
                                }`}
                            />
                        ))}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

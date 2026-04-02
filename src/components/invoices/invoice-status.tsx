/**
 * Invoice Status Component
 * 
 * Fatura işleme durumu göstergesi
 */

'use client';

import React from 'react';
import { CheckCircle, AlertCircle, Loader2, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

type InvoiceStatusType = 'idle' | 'processing' | 'success' | 'error';

interface InvoiceStatusProps {
    status: InvoiceStatusType;
    message?: string;
    details?: string;
}

interface StatusConfig {
    icon: React.ElementType;
    color: string;
    bgColor: string;
    animate?: boolean;
}

export function InvoiceStatus({ status, message, details }: InvoiceStatusProps) {
    if (status === 'idle') {
        return null;
    }

    const statusConfig: Record<InvoiceStatusType, StatusConfig> = {
        idle: {
            icon: FileText,
            color: 'text-slate-400',
            bgColor: 'bg-slate-100 dark:bg-slate-800',
        },
        processing: {
            icon: Loader2,
            color: 'text-blue-600',
            bgColor: 'bg-blue-50 dark:bg-blue-900/20',
            animate: true,
        },
        success: {
            icon: CheckCircle,
            color: 'text-green-600',
            bgColor: 'bg-green-50 dark:bg-green-900/20',
        },
        error: {
            icon: AlertCircle,
            color: 'text-red-600',
            bgColor: 'bg-red-50 dark:bg-red-900/20',
        },
    };

    const config = statusConfig[status];
    const Icon = config.icon;

    return (
        <div className={cn(
            "rounded-lg p-4 border",
            config.bgColor,
            status === 'processing' && 'border-blue-200 dark:border-blue-800',
            status === 'success' && 'border-green-200 dark:border-green-800',
            status === 'error' && 'border-red-200 dark:border-red-800'
        )}>
            <div className="flex items-start gap-3">
                <Icon className={cn(
                    "h-5 w-5 shrink-0 mt-0.5",
                    config.color,
                    config.animate && 'animate-spin'
                )} />
                <div className="flex-1">
                    {message && (
                        <p className={cn(
                            "font-semibold",
                            config.color
                        )}>
                            {message}
                        </p>
                    )}
                    {details && (
                        <p className="text-sm text-muted-foreground mt-1">
                            {details}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}

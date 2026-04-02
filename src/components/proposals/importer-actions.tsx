/**
 * Importer Actions Component
 * 
 * Teklif import işlem butonları
 */

'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Wand2, Check, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImporterActionsProps {
    step: 'input' | 'match' | 'review';
    canProceed: boolean;
    isProcessing: boolean;
    processingType?: 'extract' | 'match' | 'create';
    onNextStep: () => void;
    onPrevStep?: () => void;
    onComplete: () => void;
}

export function ImporterActions({
    step,
    canProceed,
    isProcessing,
    processingType,
    onNextStep,
    onPrevStep,
    onComplete,
}: ImporterActionsProps) {
    const isLastStep = step === 'review';

    const getButtonText = () => {
        if (!isProcessing) {
            if (isLastStep) return 'Teklifi Oluştur';
            if (step === 'input') return 'Kalemleri Çıkar';
            return 'Sonraki Adım';
        }

        switch (processingType) {
            case 'extract':
                return 'Çıkarılıyor...';
            case 'match':
                return 'Eşleştiriliyor...';
            case 'create':
                return 'Oluşturuluyor...';
            default:
                return 'İşleniyor...';
        }
    };

    const getButtonIcon = () => {
        if (isProcessing) return <Loader2 className="h-4 w-4 animate-spin" />;
        if (isLastStep) return <Check className="h-4 w-4" />;
        return <ArrowRight className="h-4 w-4" />;
    };

    return (
        <div className="flex items-center justify-between gap-4 border-t border-slate-200 dark:border-slate-800 pt-4 mt-6">
            {onPrevStep && step !== 'input' && (
                <Button
                    variant="outline"
                    onClick={onPrevStep}
                    disabled={isProcessing}
                >
                    Önceki
                </Button>
            )}

            <div className="flex-1" />

            <Button
                onClick={isLastStep ? onComplete : onNextStep}
                disabled={!canProceed || isProcessing}
                className={cn(
                    "gap-2 min-w-[150px]",
                    isLastStep && !isProcessing && "bg-green-600 hover:bg-green-700"
                )}
            >
                {!isProcessing && step === 'input' && <Wand2 className="h-4 w-4" />}
                {getButtonIcon()}
                {getButtonText()}
            </Button>
        </div>
    );
}

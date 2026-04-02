/**
 * Smart Proposal Importer Header Component
 * 
 * Teklif import başlığı ve durum göstergesi
 */

'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Wand2, FileText, ArrowRight, X, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImporterHeaderProps {
    step: 'input' | 'match' | 'review';
    isOpen: boolean;
    onClose: () => void;
    onNextStep: () => void;
    onPrevStep?: () => void;
    canProceed: boolean;
}

export function ImporterHeader({
    step,
    isOpen,
    onClose,
    onNextStep,
    onPrevStep,
    canProceed,
}: ImporterHeaderProps) {
    const steps = [
        { id: 'input', label: 'Metin Girişi', icon: FileText },
        { id: 'match', label: 'Eşleştirme', icon: Wand2 },
        { id: 'review', label: 'Önizleme', icon: ArrowRight },
    ];

    const currentStepIndex = steps.findIndex(s => s.id === step);

    return (
        <div className="border-b border-slate-200 dark:border-slate-800 p-6">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h2 className="text-xl font-bold">Akıllı Teklif İçe Aktarma</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        Teklif metnini yapıştırın veya dosya yükleyin, AI ile eşleştirin
                    </p>
                </div>
                <Button variant="ghost" size="icon" onClick={onClose}>
                    <X className="h-5 w-5" />
                </Button>
            </div>

            {/* Progress Steps */}
            <div className="flex items-center gap-2">
                {steps.map((stepItem, index) => {
                    const StepIcon = stepItem.icon;
                    const isActive = index === currentStepIndex;
                    const isCompleted = index < currentStepIndex;

                    return (
                        <React.Fragment key={stepItem.id}>
                            <div className="flex items-center gap-2">
                                <div className={cn(
                                    "flex items-center gap-2 px-3 py-2 rounded-lg transition-colors",
                                    isActive && "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
                                    isCompleted && "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
                                    !isActive && !isCompleted && "text-slate-400"
                                )}>
                                    {isCompleted ? (
                                        <Check className="h-4 w-4" />
                                    ) : (
                                        <StepIcon className="h-4 w-4" />
                                    )}
                                    <span className="text-sm font-medium">{stepItem.label}</span>
                                </div>
                            </div>
                            {index < steps.length - 1 && (
                                <div className="w-8 h-px bg-slate-200 dark:bg-slate-800" />
                            )}
                        </React.Fragment>
                    );
                })}
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center justify-end gap-2 mt-4">
                {onPrevStep && currentStepIndex > 0 && (
                    <Button variant="outline" onClick={onPrevStep}>
                        Önceki
                    </Button>
                )}
                <Button
                    onClick={onNextStep}
                    disabled={!canProceed}
                    className="gap-2"
                >
                    {currentStepIndex === steps.length - 1 ? 'Tamamla' : 'Sonraki'}
                    <ArrowRight className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}

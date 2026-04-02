/**
 * Quote Header Component
 * 
 * Teklif başlığı, müşteri ve proje bilgileri
 */

'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { SarrafDisplay } from '@/components/quotes/quote-utils';
import {
    ArrowLeft,
    Edit,
    Users,
    Briefcase,
    CalendarClock,
    History,
    FileText,
    Wand2,
} from 'lucide-react';

interface QuoteHeaderProps {
    proposal: {
        quoteNumber: string;
        version: number;
        createdAt: Date | { seconds: number };
        customerName: string;
        projectName: string;
        totalAmount: number;
        status: string;
        rootProposalId: string | null;
        hasPreviousVersions: boolean;
    };
    customer: {
        name: string;
        email?: string;
        phone?: string;
    };
    onBack: () => void;
    onEditCustomer: () => void;
    onEditProject: () => void;
    onImportAnalysis: () => void;
}

export function QuoteHeader({
    proposal,
    customer,
    onBack,
    onEditCustomer,
    onEditProject,
    onImportAnalysis,
}: QuoteHeaderProps) {
    const formatDate = (date: Date | { seconds: number }) => {
        if ('seconds' in date) {
            return new Date(date.seconds * 1000).toLocaleDateString('tr-TR');
        }
        return date.toLocaleDateString('tr-TR');
    };

    return (
        <div className="bg-card border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40 shadow-sm">
            <div className="max-w-[1920px] mx-auto p-6">
                {/* Üst Satır: Navigasyon ve Aksiyonlar */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onBack}
                            className="h-10 w-10 rounded-full"
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                                    {proposal.quoteNumber}
                                </h1>
                                <Badge variant={proposal.status === 'Approved' ? 'default' : 'secondary'}>
                                    {proposal.status === 'Draft' && 'Hazırlanıyor'}
                                    {proposal.status === 'Sent' && 'Gönderildi'}
                                    {proposal.status === 'Approved' && 'Onaylandı'}
                                    {proposal.status === 'Rejected' && 'Reddedildi'}
                                </Badge>
                                {proposal.version > 1 && (
                                    <Badge variant="outline" className="gap-1">
                                        <History className="h-3 w-3" />
                                        v{proposal.version}
                                    </Badge>
                                )}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                                Oluşturulma: {formatDate(proposal.createdAt)}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {proposal.hasPreviousVersions && (
                            <Button variant="outline" size="sm" className="gap-2">
                                <History className="h-4 w-4" />
                                Versiyonlar
                            </Button>
                        )}
                        <Button variant="outline" size="sm" className="gap-2" onClick={onImportAnalysis}>
                            <Wand2 className="h-4 w-4" />
                            AI Analizi
                        </Button>
                    </div>
                </div>

                {/* Alt Satır: Müşteri ve Proje Bilgileri */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Müşteri */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                <Users className="h-3 w-3 inline mr-1" />
                                Müşteri
                            </Label>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={onEditCustomer}
                            >
                                <Edit className="h-3 w-3" />
                            </Button>
                        </div>
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                            {customer.name}
                        </div>
                        {customer.email && (
                            <div className="text-xs text-muted-foreground">{customer.email}</div>
                        )}
                        {customer.phone && (
                            <div className="text-xs text-muted-foreground">{customer.phone}</div>
                        )}
                    </div>

                    {/* Proje */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                <Briefcase className="h-3 w-3 inline mr-1" />
                                Proje
                            </Label>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={onEditProject}
                            >
                                <Edit className="h-3 w-3" />
                            </Button>
                        </div>
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                            {proposal.projectName}
                        </div>
                    </div>

                    {/* Toplam Tutar */}
                    <div className="space-y-2">
                        <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                            <FileText className="h-3 w-3 inline mr-1" />
                            Toplam
                        </Label>
                        <SarrafDisplay
                            amount={proposal.totalAmount}
                            size="lg"
                            className="text-blue-700 dark:text-blue-400 font-black"
                        />
                    </div>

                    {/* Versiyon Bilgisi */}
                    <div className="space-y-2">
                        <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                            <CalendarClock className="h-3 w-3 inline mr-1" />
                            Versiyon
                        </Label>
                        <div className="text-sm text-muted-foreground">
                            {proposal.rootProposalId ? (
                                <span>Bu teklif bir revizyondur</span>
                            ) : (
                                <span>Orijinal teklif</span>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

import React from 'react';
import { Badge } from "@/components/ui/badge";

// Define a minimal type for what the status badge needs
export type ProposalStatus = 'Draft' | 'Sent' | 'Approved' | 'Rejected';

export const getProjectStatusLabel = (status: string) => {
    switch (status) {
        case 'SOZLESME_ASAMASI': return 'Sözleşme Aşaması';
        case 'PROJE_PLANLAMA': return 'Proje Planlama';
        case 'MALZEME_TEDARIK': return 'Malzeme Tedarik';
        case 'SAHA_MOBILIZASYONU': return 'Saha Mobilizasyonu';
        case 'MONTAJ_VE_IMALAT': return 'Montaj ve İmalat';
        case 'TEST_VE_DEVREYE_ALMA': return 'Test ve Devreye Alma';
        case 'GECICI_KABUL': return 'Geçici Kabul';
        case 'EKSIK_GIDERME': return 'Eksik Giderme';
        case 'PROJE_TAMAMLANDI': return 'Proje Tamamlandı';
        case 'FATURALANDIRILDI_VE_KAPANDI': return 'Faturalandırıldı ve Kapandı';
        case 'ASKIYA_ALINDI': return 'Askıya Alındı';
        case 'IPTAL_EDILDI': return 'İptal Edildi';
        // Legacy support
        case 'Ongoing': return 'Devam Eden';
        case 'Completed': return 'Tamamlanan';
        case 'Pending': return 'Beklemede';
        default: return status || 'Bilinmiyor';
    }
};

export const getProjectStatusBadge = (status: string) => {
    const label = getProjectStatusLabel(status);

    // Grouping logic for styles
    if (['IPTAL_EDILDI', 'Rejected'].includes(status)) {
        return <Badge variant="destructive">{label}</Badge>;
    }

    if (['PROJE_TAMAMLANDI', 'FATURALANDIRILDI_VE_KAPANDI', 'Completed'].includes(status)) {
        return <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">{label}</Badge>;
    }

    if (['ASKIYA_ALINDI', 'Pending'].includes(status)) {
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">{label}</Badge>;
    }

    // Default for all ongoing statuses (Blue/Default)
    return <Badge className="bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200">{label}</Badge>;
};

export const getStatusBadge = (status: string) => {
    switch (status) {
        case 'Approved':
        case 'Ödendi':
            return <Badge className="bg-green-100 text-green-800 border-green-200 hover:bg-green-100/80">{status === 'Approved' ? 'Onaylandı' : 'Ödendi'}</Badge>;
        case 'Sent':
            return <Badge className="bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100/80">Gönderildi</Badge>;
        case 'Rejected':
            return <Badge variant="destructive">Reddedildi</Badge>;
        case 'Kısmi Ödendi':
            return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-100/80">Kısmi Ödendi</Badge>;
        case 'Ödenmedi':
            return <Badge variant="outline" className="border-red-200 text-red-700 bg-red-50">Ödenmedi</Badge>;
        case 'Draft':
        default:
            return <Badge variant="outline">{status === 'Draft' ? 'Taslak' : status}</Badge>;
    }
};

export const formatCurrency = (amount: number | null | undefined, currency = 'TRY'): string => {
    if (amount == null) {
        return '-';
    }
    const validCurrency = currency.toUpperCase() === 'TL' ? 'TRY' : currency;
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: validCurrency }).format(amount);
};

export const CurrencyDisplay = ({ amount, currency = 'TRY', className = "" }: { amount: number | null | undefined, currency?: string, className?: string }) => {
    // Split symbol and number for better styling
    const parts = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: currency === 'TL' ? 'TRY' : currency }).formatToParts(amount || 0);

    return (
        <span className={`inline-flex items-center gap-0.5 tabular-nums font-medium ${className}`}>
            {parts.map((part, i) => (
                <span key={i} className={part.type === 'currency' ? 'text-[0.85em] opacity-60 font-normal order-last ml-0.5' : ''}>
                    {part.value}
                </span>
            ))}
        </span>
    );
};

export const formatDate = (dateInput?: any): string => {
    if (!dateInput) return '-';

    let date: Date;

    if (dateInput instanceof Date) {
        date = dateInput;
    } else if (typeof dateInput === 'string' || typeof dateInput === 'number') {
        date = new Date(dateInput);
    } else if (dateInput && typeof dateInput === 'object' && 'seconds' in dateInput) {
        // Handle legacy Firebase timestamps if they still exist in some data
        date = new Date(dateInput.seconds * 1000);
    } else {
        return '-';
    }

    if (isNaN(date.getTime())) return '-';

    return date.toLocaleDateString('tr-TR');
};

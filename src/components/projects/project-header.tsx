/**
 * Project Header Component
 * 
 * Proje başlığı, durum ve temel bilgiler
 */

'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    ArrowLeft,
    Edit,
    MoreVertical,
    Calendar,
    Building2,
    Users,
    FileText,
} from 'lucide-react';
import { getProjectStatusBadge, getProjectStatusLabel } from '@/lib/formatters';
import { ProjeDurumu } from '@prisma/client';

interface ProjectHeaderProps {
    project: {
        id: string;
        name: string;
        contractAmount: number;
        status: ProjeDurumu;
        createdAt: Date | string;
        customer?: {
            name: string;
        };
    };
    onEdit: () => void;
    onStatusChange: (status: ProjeDurumu) => void;
    onBack: () => void;
}

export function ProjectHeader({
    project,
    onEdit,
    onStatusChange,
    onBack,
}: ProjectHeaderProps) {
    const router = useRouter();

    const formatDate = (date: Date | string) => {
        if (!date) return '-';
        return new Date(date).toLocaleDateString('tr-TR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    const statusOptions: { value: ProjeDurumu; label: string }[] = [
        { value: 'SOZLESME_ASAMASI', label: 'Sözleşme Aşaması' },
        { value: 'PROJE_PLANLAMA', label: 'Proje Planlama' },
        { value: 'MALZEME_TEDARIK', label: 'Malzeme Tedarik' },
        { value: 'SAHA_MOBILIZASYONU', label: 'Saha Mobilizasyonu' },
        { value: 'MONTAJ_VE_IMALAT', label: 'Montaj ve İmalat' },
        { value: 'TEST_VE_DEVREYE_ALMA', label: 'Test ve Devreye Alma' },
        { value: 'GECICI_KABUL', label: 'Geçici Kabul' },
        { value: 'EKSIK_GIDERME', label: 'Eksik Giderme' },
        { value: 'PROJE_TAMAMLANDI', label: 'Proje Tamamlandı' },
        { value: 'FATURALANDIRILDI_VE_KAPANDI', label: 'Faturalandırıldı ve Kapandı' },
        { value: 'ASKIYA_ALINDI', label: 'Askıya Alındı' },
        { value: 'IPTAL_EDILDI', label: 'İptal Edildi' },
    ];

    return (
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={onBack}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <h1 className="text-2xl font-bold">{project.name}</h1>
                        {getProjectStatusBadge(project.status)}
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                            <Building2 className="h-4 w-4" />
                            <span>{project.customer?.name || 'Müşteri yok'}</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            <span>Başlangıç: {formatDate(project.createdAt)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <FileText className="h-4 w-4" />
                            <span>Sözleşme: {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(project.contractAmount)}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-2">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="gap-2">
                            <MoreVertical className="h-4 w-4" />
                            Durum Değiştir
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-64">
                        {statusOptions.map((option) => (
                            <DropdownMenuItem
                                key={option.value}
                                onClick={() => onStatusChange(option.value)}
                                className={project.status === option.value ? 'bg-accent' : ''}
                            >
                                {option.label}
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>

                <Button variant="outline" onClick={onEdit} className="gap-2">
                    <Edit className="h-4 w-4" />
                    Düzenle
                </Button>
            </div>
        </div>
    );
}

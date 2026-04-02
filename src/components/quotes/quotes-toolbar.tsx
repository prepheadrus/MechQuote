/**
 * Quotes Toolbar Component
 * 
 * Teklif araç çubuğu - View mode ve aksiyon kontrolleri
 */

'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuCheckboxItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Search, LayoutGrid, List, ChevronDown, PlusCircle, FileSpreadsheet } from 'lucide-react';
import { Proposal } from '@prisma/client';
import { cn } from '@/lib/utils';

interface QuotesToolbarProps {
    searchTerm: string;
    onSearchChange: (value: string) => void;
    viewMode: 'list' | 'kanban';
    onViewModeChange: (mode: 'list' | 'kanban') => void;
    statusFilter: Proposal['status'] | 'All';
    onStatusFilterChange: (value: Proposal['status'] | 'All') => void;
    dateFilter: 'all' | 'last30days' | 'last90days';
    onDateFilterChange: (value: 'all' | 'last30days' | 'last90days') => void;
    onNewQuote: () => void;
    onExport: () => void;
    statusOptions: { label: string; value: Proposal['status'] | 'All' }[];
}

export function QuotesToolbar({
    searchTerm,
    onSearchChange,
    viewMode,
    onViewModeChange,
    statusFilter,
    onStatusFilterChange,
    dateFilter,
    onDateFilterChange,
    onNewQuote,
    onExport,
    statusOptions,
}: QuotesToolbarProps) {
    return (
        <div className="flex flex-col gap-4 mb-6">
            {/* Üst Satır: Arama ve Aksiyonlar */}
            <div className="flex items-center justify-between gap-4">
                {/* Arama */}
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Teklif, müşteri veya proje ara..."
                        value={searchTerm}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="pl-8"
                    />
                </div>

                {/* Aksiyon Butonları */}
                <div className="flex items-center gap-2">
                    <Button onClick={onNewQuote} className="gap-2">
                        <PlusCircle className="h-4 w-4" />
                        Yeni Teklif
                    </Button>
                    <Button variant="outline" onClick={onExport} className="gap-2">
                        <FileSpreadsheet className="h-4 w-4" />
                        Excel İndir
                    </Button>
                </div>
            </div>

            {/* Alt Satır: Filtreler ve View Mode */}
            <div className="flex items-center justify-between gap-4">
                {/* Filtreler */}
                <div className="flex items-center gap-2">
                    {/* Durum Filtresi */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="gap-2">
                                Durum: {statusFilter === 'All' ? 'Tümü' : statusFilter}
                                <ChevronDown className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-52">
                            <DropdownMenuLabel>Durum Seçin</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {statusOptions.map((option) => (
                                <DropdownMenuCheckboxItem
                                    key={option.value}
                                    checked={statusFilter === option.value}
                                    onCheckedChange={() => onStatusFilterChange(option.value)}
                                >
                                    {option.label}
                                </DropdownMenuCheckboxItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Tarih Filtresi */}
                    <Select value={dateFilter} onValueChange={(val: any) => onDateFilterChange(val)}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Tarih Aralığı" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Tümü</SelectItem>
                            <SelectItem value="last30days">Son 30 Gün</SelectItem>
                            <SelectItem value="last90days">Son 90 Gün</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* View Mode Toggle */}
                <div className="flex items-center border rounded-md p-1">
                    <Button
                        variant={viewMode === 'list' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => onViewModeChange('list')}
                        className="gap-2"
                    >
                        <List className="h-4 w-4" />
                        Liste
                    </Button>
                    <Button
                        variant={viewMode === 'kanban' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => onViewModeChange('kanban')}
                        className="gap-2"
                    >
                        <LayoutGrid className="h-4 w-4" />
                        Kanban
                    </Button>
                </div>
            </div>
        </div>
    );
}

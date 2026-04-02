/**
 * Customers Filters Component
 * 
 * Müşteri filtreleme ve arama
 */

'use client';

import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuCheckboxItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Search, Filter, ChevronDown } from 'lucide-react';

interface CustomersFiltersProps {
    searchTerm: string;
    onSearchChange: (value: string) => void;
    statusFilter: string[];
    onStatusFilterChange: (value: string[]) => void;
    tagFilter: string[];
    onTagFilterChange: (value: string[]) => void;
    onExport: () => void;
    onImport: () => void;
}

export function CustomersFilters({
    searchTerm,
    onSearchChange,
    statusFilter,
    onStatusFilterChange,
    tagFilter,
    onTagFilterChange,
    onExport,
    onImport,
}: CustomersFiltersProps) {
    const statusOptions = [
        { value: 'Aktif', label: 'Aktif' },
        { value: 'Pasif', label: 'Pasif' },
    ];

    const tags = ['VIP', 'Kurumsal', 'Bireysel', 'Potansiyel', 'Eski'];

    return (
        <div className="flex flex-col gap-4 mb-6">
            {/* Arama ve Aksiyonlar */}
            <div className="flex items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Müşteri, e-posta veya telefon ara..."
                        value={searchTerm}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="pl-8"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={onImport} className="gap-2">
                        İçe Aktar
                    </Button>
                    <Button variant="outline" onClick={onExport} className="gap-2">
                        Dışa Aktar
                    </Button>
                </div>
            </div>

            {/* Filtreler */}
            <div className="flex items-center gap-2">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="gap-2">
                            <Filter className="h-4 w-4" />
                            Durum
                            <ChevronDown className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-52">
                        <DropdownMenuLabel>Durum Seçin</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {statusOptions.map((option) => (
                            <DropdownMenuCheckboxItem
                                key={option.value}
                                checked={statusFilter.includes(option.value)}
                                onCheckedChange={(checked) => {
                                    const newFilter = checked
                                        ? [...statusFilter, option.value]
                                        : statusFilter.filter((f) => f !== option.value);
                                    onStatusFilterChange(newFilter);
                                }}
                            >
                                {option.label}
                            </DropdownMenuCheckboxItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="gap-2">
                            <Filter className="h-4 w-4" />
                            Etiketler
                            <ChevronDown className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-52">
                        <DropdownMenuLabel>Etiket Seçin</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {tags.map((tag) => (
                            <DropdownMenuCheckboxItem
                                key={tag}
                                checked={tagFilter.includes(tag)}
                                onCheckedChange={(checked) => {
                                    const newFilter = checked
                                        ? [...tagFilter, tag]
                                        : tagFilter.filter((f) => f !== tag);
                                    onTagFilterChange(newFilter);
                                }}
                            >
                                {tag}
                            </DropdownMenuCheckboxItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
}

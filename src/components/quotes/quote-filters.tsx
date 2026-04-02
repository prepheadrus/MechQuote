/**
 * Quote Filters Component
 * 
 * Teklif filtreleme ve görünüm ayarları
 */

'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuCheckboxItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, LayoutGrid, List, ChevronDown } from 'lucide-react';
import { Proposal } from '@prisma/client';

interface QuoteFiltersProps {
    searchTerm: string;
    onSearchChange: (value: string) => void;
    statusFilter: string[];
    onStatusFilterChange: (value: string[]) => void;
    dateFilter: 'all' | 'last30days' | 'last90days';
    onDateFilterChange: (value: 'all' | 'last30days' | 'last90days') => void;
    viewMode: 'grouped' | 'flat' | 'kanban';
    onViewModeChange: (value: 'grouped' | 'flat' | 'kanban') => void;
    showOnlyAssigned: boolean;
    onShowOnlyAssignedChange: (value: boolean) => void;
    statusOptions: { label: string; value: Proposal['status'] | 'All' }[];
}

export function QuoteFilters({
    searchTerm,
    onSearchChange,
    statusFilter,
    onStatusFilterChange,
    dateFilter,
    onDateFilterChange,
    viewMode,
    onViewModeChange,
    showOnlyAssigned,
    onShowOnlyAssignedChange,
    statusOptions,
}: QuoteFiltersProps) {
    return (
        <div className="flex flex-col gap-4">
            {/* Search Bar */}
            <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Teklif, müşteri veya proje ara..."
                    value={searchTerm}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="pl-8"
                />
            </div>

            {/* Filters Row */}
            <div className="flex flex-wrap gap-3">
                {/* Status Filter */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="gap-2">
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

                {/* Date Filter */}
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

                {/* View Mode */}
                <div className="flex items-center gap-2 border rounded-md p-1">
                    <Button
                        variant={viewMode === 'grouped' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => onViewModeChange('grouped')}
                        className="h-8"
                    >
                        <LayoutGrid className="h-4 w-4" />
                    </Button>
                    <Button
                        variant={viewMode === 'flat' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => onViewModeChange('flat')}
                        className="h-8"
                    >
                        <List className="h-4 w-4" />
                    </Button>
                </div>

                {/* Assigned Filter */}
                <div className="flex items-center gap-2 border rounded-md px-3 py-2">
                    <Checkbox
                        id="show-only-assigned"
                        checked={showOnlyAssigned}
                        onCheckedChange={(checked) => onShowOnlyAssignedChange(checked as boolean)}
                    />
                    <Label htmlFor="show-only-assigned" className="text-sm cursor-pointer">
                        Sadece Atananlar
                    </Label>
                </div>
            </div>
        </div>
    );
}

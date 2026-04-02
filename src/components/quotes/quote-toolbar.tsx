/**
 * Quote Toolbar Component
 * 
 * Teklif araç çubuğu - Tab switching ve view mode kontrolleri
 */

'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LayoutGrid, List, BarChart, Calculator } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuoteToolbarProps {
    activeTab: string;
    onTabChange: (value: string) => void;
    viewMode: 'grouped' | 'flat';
    onViewModeChange: (mode: 'grouped' | 'flat') => void;
    isCheckMode: boolean;
    onCheckModeChange: (value: boolean) => void;
    isCompact: boolean;
    onCompactChange: (value: boolean) => void;
}

export function QuoteToolbar({
    activeTab,
    onTabChange,
    viewMode,
    onViewModeChange,
    isCheckMode,
    onCheckModeChange,
    isCompact,
    onCompactChange,
}: QuoteToolbarProps) {
    return (
        <div className="flex items-center justify-between gap-4 mb-6">
            {/* Sol: Tab Navigation */}
            <Tabs value={activeTab} onValueChange={onTabChange} className="flex-1">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="items" className="gap-2">
                        <LayoutGrid className="h-4 w-4" />
                        Kalemler
                    </TabsTrigger>
                    <TabsTrigger value="comparison" className="gap-2">
                        <BarChart className="h-4 w-4" />
                        Karşılaştırma
                    </TabsTrigger>
                    <TabsTrigger value="analytics" className="gap-2">
                        <Calculator className="h-4 w-4" />
                        Analiz
                    </TabsTrigger>
                </TabsList>
            </Tabs>

            {/* Sağ: View Controls */}
            <div className="flex items-center gap-2">
                {/* View Mode Toggle */}
                <div className="flex items-center border rounded-md p-1">
                    <Button
                        variant={viewMode === 'grouped' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => onViewModeChange('grouped')}
                        className="h-8 gap-2"
                    >
                        <LayoutGrid className="h-4 w-4" />
                        Gruplu
                    </Button>
                    <Button
                        variant={viewMode === 'flat' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => onViewModeChange('flat')}
                        className="h-8 gap-2"
                    >
                        <List className="h-4 w-4" />
                        Düz Liste
                    </Button>
                </div>

                {/* Check Mode Toggle */}
                <Button
                    variant={isCheckMode ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => onCheckModeChange(!isCheckMode)}
                    className="h-8"
                >
                    Seçim Modu
                </Button>

                {/* Compact Mode Toggle */}
                <Button
                    variant={isCompact ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => onCompactChange(!isCompact)}
                    className="h-8"
                >
                    {isCompact ? 'Geniş' : 'Kompakt'}
                </Button>
            </div>
        </div>
    );
}

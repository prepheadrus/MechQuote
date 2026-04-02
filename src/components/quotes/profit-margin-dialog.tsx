/**
 * Profit Margin Dialog Component
 * 
 * Grup bazlı kâr marjı uygulama dialog'u
 */

'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

interface ProfitMarginDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    groupName: string;
    allGroups: [string, any[]][];
    onApply: (margin: number, mode: 'percentage' | 'fixed', targetGroups: 'all' | 'current') => void;
}

export function ProfitMarginDialog({
    isOpen,
    onOpenChange,
    groupName,
    allGroups,
    onApply,
}: ProfitMarginDialogProps) {
    const [margin, setMargin] = useState<number>(20);
    const [mode, setMode] = useState<'percentage' | 'fixed'>('percentage');
    const [targetGroups, setTargetGroups] = useState<'all' | 'current'>('current');

    const handleApply = () => {
        onApply(margin, mode, targetGroups);
        // Reset state
        setMargin(20);
        setMode('percentage');
        setTargetGroups('current');
        onOpenChange(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Kâr Marjı Uygula</DialogTitle>
                    <DialogDescription>
                        {groupName === '__ALL__' 
                            ? 'Tüm gruplara uygulanacak kâr marjını seçin.' 
                            : `"${groupName}" grubuna uygulanacak kâr marjını seçin.`}
                    </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Marj Tipi</Label>
                        <Select value={mode} onValueChange={(val: any) => setMode(val)}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="percentage">Yüzde (%)</SelectItem>
                                <SelectItem value="fixed">Sabit Tutar (TL)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>
                            {mode === 'percentage' ? 'Kâr Marjı (%)' : 'Kâr Tutarı (TL)'}
                        </Label>
                        <Input
                            type="number"
                            value={margin}
                            onChange={(e) => setMargin(Number(e.target.value))}
                            step="0.1"
                        />
                    </div>

                    {groupName === '__ALL__' && (
                        <div className="space-y-2">
                            <Label>Uygulanacak Gruplar</Label>
                            <Select value={targetGroups} onValueChange={(val: any) => setTargetGroups(val)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="current">Sadece Mevcut Grup</SelectItem>
                                    <SelectItem value="all">Tüm Gruplar</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        İptal
                    </Button>
                    <Button onClick={handleApply}>
                        Uygula
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

/**
 * Discount Dialog Component
 * 
 * Grup bazlı iskonto uygulama dialog'u
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

interface DiscountDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    groupName: string;
    onApply: (discount: number, mode: 'percentage' | 'fixed', targetGroups: 'all' | 'current') => void;
}

export function DiscountDialog({
    isOpen,
    onOpenChange,
    groupName,
    onApply,
}: DiscountDialogProps) {
    const [discount, setDiscount] = useState<number>(10);
    const [mode, setMode] = useState<'percentage' | 'fixed'>('percentage');
    const [targetGroups, setTargetGroups] = useState<'all' | 'current'>('current');

    const handleApply = () => {
        onApply(discount, mode, targetGroups);
        // Reset state
        setDiscount(10);
        setMode('percentage');
        setTargetGroups('current');
        onOpenChange(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>İskonto Uygula</DialogTitle>
                    <DialogDescription>
                        {groupName === '__ALL__' 
                            ? 'Tüm gruplara uygulanacak iskonto oranını seçin.' 
                            : `"${groupName}" grubuna uygulanacak iskonto oranını seçin.`}
                    </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>İskonto Tipi</Label>
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
                            {mode === 'percentage' ? 'İskonto Oranı (%)' : 'İskonto Tutarı (TL)'}
                        </Label>
                        <Input
                            type="number"
                            value={discount}
                            onChange={(e) => setDiscount(Number(e.target.value))}
                            step="0.1"
                            min="0"
                            max={mode === 'percentage' ? 100 : undefined}
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

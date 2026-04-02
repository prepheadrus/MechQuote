/**
 * Importer Item List Component
 * 
 * Çıkarılan ürün listesi ve eşleştirme durumu
 */

'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle, Pencil, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Item {
    id: string;
    rawText: string;
    quantity: number;
    unit: string;
    matchedProductName?: string;
    isMatched: boolean;
}

interface ImporterItemListProps {
    items: Item[];
    onEditItem: (itemId: string) => void;
    onRemoveItem: (itemId: string) => void;
}

export function ImporterItemList({
    items,
    onEditItem,
    onRemoveItem,
}: ImporterItemListProps) {
    const matchedCount = items.filter(i => i.isMatched).length;
    const totalCount = items.length;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="font-semibold">Çıkarılan Kalemler</h3>
                    <p className="text-sm text-muted-foreground">
                        {matchedCount} / {totalCount} eşleştirildi
                    </p>
                </div>
                <Badge variant={matchedCount === totalCount ? 'default' : 'secondary'}>
                    {matchedCount === totalCount ? (
                        <><CheckCircle className="h-3 w-3 mr-1" /> Tamamlandı</>
                    ) : (
                        <><AlertCircle className="h-3 w-3 mr-1" /> Bekliyor</>
                    )}
                </Badge>
            </div>

            <div className="border rounded-lg">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[50px]">#</TableHead>
                            <TableHead>Metin</TableHead>
                            <TableHead className="w-[100px]">Miktar</TableHead>
                            <TableHead className="w-[150px]">Eşleşen Ürün</TableHead>
                            <TableHead className="w-[100px]">Durum</TableHead>
                            <TableHead className="w-[80px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {items.map((item, index) => (
                            <TableRow key={item.id}>
                                <TableCell className="font-mono text-xs">{index + 1}</TableCell>
                                <TableCell className="max-w-[300px]">
                                    <div className="truncate text-sm" title={item.rawText}>
                                        {item.rawText}
                                    </div>
                                </TableCell>
                                <TableCell className="font-mono text-sm">
                                    {item.quantity} {item.unit}
                                </TableCell>
                                <TableCell>
                                    {item.isMatched ? (
                                        <div className="flex items-center gap-2">
                                            <CheckCircle className="h-4 w-4 text-green-600" />
                                            <span className="text-sm">{item.matchedProductName}</span>
                                        </div>
                                    ) : (
                                        <span className="text-sm text-muted-foreground">-</span>
                                    )}
                                </TableCell>
                                <TableCell>
                                    {item.isMatched ? (
                                        <Badge variant="default" className="gap-1">
                                            <CheckCircle className="h-3 w-3" />
                                            Eşleşti
                                        </Badge>
                                    ) : (
                                        <Badge variant="secondary" className="gap-1">
                                            <AlertCircle className="h-3 w-3" />
                                            Bekliyor
                                        </Badge>
                                    )}
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-1 justify-end">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={() => onEditItem(item.id)}
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-red-600 hover:text-red-700"
                                            onClick={() => onRemoveItem(item.id)}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}

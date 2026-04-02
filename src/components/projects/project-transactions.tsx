/**
 * Project Transactions Component
 * 
 * Proje işlem listesi ve yönetimi
 */

'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Receipt, Plus } from 'lucide-react';

interface Transaction {
    id: string;
    type: string;
    category: string;
    amount: number;
    date: Date | string;
    description?: string;
}

interface ProjectTransactionsProps {
    transactions: Transaction[];
    onAddTransaction: () => void;
}

export function ProjectTransactions({ transactions, onAddTransaction }: ProjectTransactionsProps) {
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('tr-TR', {
            style: 'currency',
            currency: 'TRY',
        }).format(amount);
    };

    const formatDate = (date: Date | string) => {
        if (!date) return '-';
        return new Date(date).toLocaleDateString('tr-TR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    const income = transactions.filter(t => t.type === 'Income').reduce((sum, t) => sum + t.amount, 0);
    const expense = transactions.filter(t => t.type !== 'Income').reduce((sum, t) => sum + t.amount, 0);
    const balance = income - expense;

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Receipt className="h-5 w-5 text-muted-foreground" />
                        <div>
                            <CardTitle>İşlemler</CardTitle>
                            <CardDescription>
                                {transactions.length} işlem kaydedildi
                            </CardDescription>
                        </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={onAddTransaction} className="gap-2">
                        <Plus className="h-4 w-4" />
                        Ekle
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                {/* Özet */}
                <div className="grid gap-4 md:grid-cols-3 mb-6">
                    <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20">
                        <div className="text-sm text-muted-foreground">Gelir</div>
                        <div className="text-lg font-bold text-green-600">
                            {formatCurrency(income)}
                        </div>
                    </div>
                    <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20">
                        <div className="text-sm text-muted-foreground">Gider</div>
                        <div className="text-lg font-bold text-red-600">
                            {formatCurrency(expense)}
                        </div>
                    </div>
                    <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                        <div className="text-sm text-muted-foreground">Bakiye</div>
                        <div className={`text-lg font-bold ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrency(balance)}
                        </div>
                    </div>
                </div>

                {/* İşlem Listesi */}
                {transactions.length > 0 ? (
                    <div className="space-y-2">
                        {transactions.slice(0, 10).map((t) => (
                            <div
                                key={t.id}
                                className="flex items-center justify-between p-3 border rounded-lg"
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                                        t.type === 'Income'
                                            ? 'bg-green-100 dark:bg-green-900/30'
                                            : 'bg-red-100 dark:bg-red-900/30'
                                    }`}>
                                        <Receipt className={`h-4 w-4 ${
                                            t.type === 'Income' ? 'text-green-600' : 'text-red-600'
                                        }`} />
                                    </div>
                                    <div>
                                        <div className="font-medium text-sm">{t.description || t.category}</div>
                                        <div className="text-xs text-muted-foreground">
                                            {formatDate(t.date)}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className={`font-bold ${
                                        t.type === 'Income' ? 'text-green-600' : 'text-red-600'
                                    }`}>
                                        {t.type === 'Income' ? '+' : '-'}{formatCurrency(t.amount)}
                                    </div>
                                    <Badge variant="outline" className="text-xs">
                                        {t.category}
                                    </Badge>
                                </div>
                            </div>
                        ))}
                        {transactions.length > 10 && (
                            <div className="text-center text-sm text-muted-foreground py-4">
                                ...ve {transactions.length - 10} işlem daha
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="text-center py-8 text-muted-foreground">
                        <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Henüz işlem kaydedilmemiş</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

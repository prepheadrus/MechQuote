'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { getCustomerTransactions, deleteTransaction } from '@/actions/customer-transactions';
import { TransactionDialog } from './transaction-dialog';
import { toast } from '@/hooks/use-toast';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from '@/lib/utils';

interface TransactionHistoryProps {
    customerId: string;
}

export function TransactionHistory({ customerId }: TransactionHistoryProps) {
    const [transactions, setTransactions] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const fetchTransactions = async () => {
        setIsLoading(true);
        const data = await getCustomerTransactions(customerId);
        setTransactions(data);
        setIsLoading(false);
    };

    useEffect(() => {
        fetchTransactions();
    }, [customerId]);

    const handleDelete = async (id: string) => {
        const result = await deleteTransaction(id);
        if (result.success) {
            toast({ title: 'Başarılı', description: 'İşlem silindi.' });
            fetchTransactions();
        } else {
            toast({ title: 'Hata', description: 'İşlem silinemedi.', variant: 'destructive' });
        }
    }

    const getBadgeVariant = (type: string) => {
        switch (type) {
            case 'Debt': return 'destructive'; // Borç (Kırmızı)
            case 'Payment': return 'success'; // Tahsilat (Yeşil) - custom variant needed or use default/secondary
            case 'Credit': return 'secondary';
            default: return 'outline';
        }
    };

    // Custom logic for badge style since 'success' isn't standard in shadcn default
    const getBadgeStyle = (type: string) => {
        switch (type) {
            case 'Debt': return 'bg-red-100 text-red-800 hover:bg-red-100';
            case 'Payment': return 'bg-green-100 text-green-800 hover:bg-green-100';
            case 'Credit': return 'bg-blue-100 text-blue-800 hover:bg-blue-100';
            case 'Opening': return 'bg-gray-100 text-gray-800 hover:bg-gray-100';
            default: return '';
        }
    };

    const getTypeLabel = (t: any) => {
        const { type, category, description } = t;
        const isReturn = description?.toLowerCase().includes('iade');

        if (type === 'Debt') {
            if (category === 'Purchase' || isReturn) return 'İade (Alış)';
            return 'Borç / Satış';
        }
        if (type === 'Credit') {
            if (category === 'Sales' || isReturn) return 'İade (Satış)';
            return 'Alacak / Satın Alma';
        }
        if (type === 'Payment') return 'Tahsilat / Ödeme';
        if (type === 'Opening') return 'Açılış Bakiyesi';
        return type;
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Hesap Hareketleri</CardTitle>
                    <CardDescription>Cari hesap bakiye geçmişi.</CardDescription>
                </div>
                <Button onClick={() => setIsDialogOpen(true)} size="sm">
                    <Plus className="h-4 w-4 mr-2" /> Tahsilat / İşlem Ekle
                </Button>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Tarih</TableHead>
                                <TableHead>Tür</TableHead>
                                <TableHead>Açıklama</TableHead>
                                <TableHead className="text-right">Tutar</TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {transactions.length > 0 ? (
                                transactions.map((t) => (
                                    <TableRow key={t.id}>
                                        <TableCell>{formatDate(t.date)}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={cn(getBadgeStyle(t.type))}>
                                                {getTypeLabel(t)}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">{t.description || '-'}</TableCell>
                                        <TableCell className={cn("text-right font-mono font-medium", t.amount < 0 ? "text-green-600" : "text-red-600")}>
                                            {formatCurrency(t.amount)}
                                        </TableCell>
                                        <TableCell>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-600">
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>İşlemi Sil</AlertDialogTitle>
                                                        <AlertDialogDescription>Bu işlemi silmek istediğinize emin misiniz? Bakiye yeniden hesaplanacak.</AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>İptal</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleDelete(t.id)} className="bg-destructive hover:bg-destructive/90">Sil</AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>

                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">İşlem kaydı bulunamadı.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                )}
            </CardContent>

            <TransactionDialog
                open={isDialogOpen}
                onOpenChange={(open) => {
                    setIsDialogOpen(open);
                    if (!open) fetchTransactions(); // Refresh on close
                }}
                customerId={customerId}
            />
        </Card>
    );
}

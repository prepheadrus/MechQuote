'use client';

import { formatCurrency } from "@/lib/formatters";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Trash2, ArrowUpCircle, ArrowDownCircle, Edit2 } from "lucide-react";
import { useState } from "react";
import { deleteTransaction } from "@/actions/transactions";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { TransactionDialog } from "./transaction-dialog";


interface Transaction {
    id: string;
    description: string;
    amount: number;
    date: Date | string;
    category: string;
    projectId: string;
    type?: string;
}

interface TransactionListProps {
    transactions: Transaction[];
    projectId: string;
}

export function TransactionList({ transactions, projectId }: TransactionListProps) {
    const { toast } = useToast();
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const handleDelete = async (id: string) => {
        if (!confirm('Bu işlemi silmek istediğinize emin misiniz?')) return;

        setDeletingId(id);
        const result = await deleteTransaction(id, projectId);

        if (!result.success) {
            toast({
                variant: 'destructive',
                title: 'Hata',
                description: result.error
            });
        } else {
            toast({
                title: 'Başarılı',
                description: 'İşlem silindi.'
            });
        }
        setDeletingId(null);
    };

    if (transactions.length === 0) {
        return <div className="text-center py-8 text-muted-foreground w-full">Henüz kasa işlemi (gelir/gider) eklenmemiş.</div>;
    }

    return (
        <div className="border rounded-md">
            <table className="w-full text-sm">
                <thead className="bg-muted/50">
                    <tr className="text-left border-b">
                        <th className="p-3 font-medium w-[50px]"></th>
                        <th className="p-3 font-medium">Tarih</th>
                        <th className="p-3 font-medium">Kategori</th>
                        <th className="p-3 font-medium">Açıklama</th>
                        <th className="p-3 font-medium text-right">Tutar</th>
                        <th className="p-3 font-medium w-[80px]"></th>
                    </tr>
                </thead>
                <tbody>
                    {transactions.map((t: any) => {
                        // Handle both old 'expenses' (no type) and new 'transactions'
                        const isIncome = t.type === 'Income';
                        return (
                            <tr key={t.id} className="border-b last:border-0 hover:bg-muted/10">
                                <td className="p-3 text-center">
                                    {isIncome ? (
                                        <ArrowUpCircle className="h-4 w-4 text-green-600 mx-auto" />
                                    ) : (
                                        <ArrowDownCircle className="h-4 w-4 text-red-600 mx-auto" />
                                    )}
                                </td>
                                <td className="p-3">
                                    {format(new Date(t.date), "d MMM yyyy", { locale: tr })}
                                </td>
                                <td className="p-3">
                                    <span className={cn(
                                        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent",
                                        isIncome ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                                    )}>
                                        {t.category}
                                    </span>
                                </td>
                                <td className="p-3 text-muted-foreground">
                                    {t.description}
                                </td>
                                <td className={cn("p-3 text-right font-medium", isIncome ? "text-green-600" : "text-red-600")}>
                                    {isIncome ? '+' : '-'}{formatCurrency(t.amount)}
                                </td>
                                <td className="p-3 text-right flex justify-end gap-1">
                                    {/* Edit Button */}
                                    <TransactionDialog
                                        projectId={projectId}
                                        transaction={t}
                                        trigger={
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary">
                                                <Edit2 className="h-4 w-4" />
                                            </Button>
                                        }
                                    />

                                    {/* Delete Button */}
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                        disabled={deletingId === t.id}
                                        onClick={() => handleDelete(t.id)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

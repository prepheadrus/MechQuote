'use client';

import { useState } from "react";
import { formatCurrency } from "@/lib/formatters";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createPayment, deletePayment } from "@/actions/payment-actions";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Plus, Calendar as CalendarIcon, Wallet, CreditCard, Banknote } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

interface Payment {
    id: string;
    amount: number;
    date: Date | string;
    note?: string | null;
    method: string;
}

interface PaymentListProps {
    invoiceId: string;
    payments: Payment[];
    totalAmount: number;
    currency: string;
    projectId?: string;
}

export function PaymentList({ invoiceId, payments, totalAmount, currency, projectId }: PaymentListProps) {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [isAdding, setIsAdding] = useState(false);

    // Form State
    const [amount, setAmount] = useState("");
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [method, setMethod] = useState("Bank Transfer");
    const [note, setNote] = useState("");

    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    const remaining = totalAmount - totalPaid;
    const isPaid = remaining <= 0.01; // Tolerance for float errors

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!amount) return;

        setLoading(true);
        const result = await createPayment({
            invoiceId,
            amount: parseFloat(amount),
            date,
            method,
            description: note,
            projectId
        });
        setLoading(false);

        if (result.success) {
            toast({ title: "Başarılı", description: "Ödeme eklendi." });
            setIsAdding(false);
            setAmount("");
            setNote("");
        } else {
            toast({ variant: "destructive", title: "Hata", description: result.error });
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Bu ödemeyi silmek istediğinize emin misiniz?")) return;

        const result = await deletePayment(id, invoiceId, projectId);
        if (result.success) {
            toast({ title: "Başarılı", description: "Ödeme silindi." });
        } else {
            toast({ variant: "destructive", title: "Hata", description: result.error });
        }
    };

    return (
        <div className="space-y-6">
            {/* Summary Card */}
            <div className="grid grid-cols-3 gap-4">
                <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-4">
                    <div className="text-sm font-medium text-muted-foreground">Toplam Tutar</div>
                    <div className="text-xl font-bold">{formatCurrency(totalAmount)} {currency}</div>
                </div>
                <div className="rounded-lg border bg-green-50/50 text-card-foreground shadow-sm p-4">
                    <div className="text-sm font-medium text-green-600">Ödenen (Tahsil Edilen)</div>
                    <div className="text-xl font-bold text-green-700">{formatCurrency(totalPaid)} {currency}</div>
                </div>
                <div className={cn(
                    "rounded-lg border shadow-sm p-4",
                    isPaid ? "bg-muted/50" : "bg-red-50/50"
                )}>
                    <div className="text-sm font-medium text-muted-foreground">Kalan Bakiye</div>
                    <div className={cn("text-xl font-bold", isPaid ? "text-gray-500" : "text-red-600")}>
                        {formatCurrency(remaining > 0 ? remaining : 0)} {currency}
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end">
                {!isAdding ? (
                    <Button onClick={() => setIsAdding(true)} disabled={isPaid} className="gap-2">
                        <Plus className="h-4 w-4" /> Ödeme Ekle
                    </Button>
                ) : (
                    <Button variant="ghost" onClick={() => setIsAdding(false)}>iptal</Button>
                )}
            </div>

            {/* Add Form */}
            {isAdding && (
                <form onSubmit={handleCreate} className="rounded-lg border p-4 bg-muted/30 grid gap-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label>Tutar ({currency})</Label>
                            <Input
                                type="number"
                                step="0.01"
                                value={amount}
                                onChange={e => setAmount(e.target.value)}
                                max={remaining + 1} // Allow slight overflow fix or just loose
                                required
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label>Tarih</Label>
                            <Input
                                type="date"
                                value={date}
                                onChange={e => setDate(e.target.value)}
                                required
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label>Ödeme Yöntemi</Label>
                            <Select value={method} onValueChange={setMethod}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Bank Transfer">Banka Havalesi (EFT)</SelectItem>
                                    <SelectItem value="Cash">Nakit (Elden)</SelectItem>
                                    <SelectItem value="Credit Card">Kredi Kartı</SelectItem>
                                    <SelectItem value="Check">Çek / Senet</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label>Not / Açıklama</Label>
                            <Input
                                value={note}
                                onChange={e => setNote(e.target.value)}
                                placeholder="Opsiyonel..."
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button type="submit" disabled={loading}>{loading ? 'Kaydediliyor...' : 'Kaydet'}</Button>
                    </div>
                </form>
            )}

            {/* List */}
            <div className="rounded-md border">
                {payments.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground text-sm">
                        Henüz ödeme kaydı bulunmuyor.
                    </div>
                ) : (
                    <table className="w-full text-sm">
                        <thead className="bg-muted/50 border-b">
                            <tr className="text-left">
                                <th className="p-3 font-medium">Tarih</th>
                                <th className="p-3 font-medium">Yöntem</th>
                                <th className="p-3 font-medium">Not</th>
                                <th className="p-3 font-medium text-right">Tutar</th>
                                <th className="p-3 w-[50px]"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {payments.map(p => (
                                <tr key={p.id} className="border-b last:border-0 hover:bg-muted/10">
                                    <td className="p-3">
                                        {format(new Date(p.date), "d MMM yyyy", { locale: tr })}
                                    </td>
                                    <td className="p-3">
                                        <div className="flex items-center gap-2">
                                            {p.method === 'Cash' ? <Wallet className="h-3 w-3" /> :
                                                p.method === 'Credit Card' ? <CreditCard className="h-3 w-3" /> :
                                                    <Banknote className="h-3 w-3" />}
                                            {p.method === 'Bank Transfer' ? 'Havale/EFT' :
                                                p.method === 'Cash' ? 'Nakit' :
                                                    p.method === 'Credit Card' ? 'Kredi Kartı' : p.method}
                                        </div>
                                    </td>
                                    <td className="p-3 text-muted-foreground">{p.note || '-'}</td>
                                    <td className="p-3 text-right font-medium text-green-600">
                                        {formatCurrency(p.amount)} {currency}
                                    </td>
                                    <td className="p-3 text-right">
                                        <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)} className="h-8 w-8 text-muted-foreground hover:text-destructive">
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}

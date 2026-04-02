'use client';

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { createTransaction, updateTransaction } from "@/actions/transactions";
import { Plus, ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const EXPENSE_CATEGORIES = [
    "Yemek",
    "Ulaşım",
    "Konaklama",
    "Malzeme (Nakit)",
    "İşçilik (Elden)",
    "Diğer Gider"
];

const INCOME_CATEGORIES = [
    "İş Avansı",
    "Elden Ödeme",
    "Diğer Gelir"
];

interface Transaction {
    id: string;
    description: string;
    amount: number;
    date: Date | string;
    category: string;
    projectId: string;
    type?: string;
}

interface TransactionDialogProps {
    projectId: string;
    transaction?: Transaction | null; // If present, edit mode
    trigger?: React.ReactNode; // Custom trigger
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}

export function TransactionDialog({ projectId, transaction, trigger, open: controlledOpen, onOpenChange }: TransactionDialogProps) {
    const { toast } = useToast();
    const [internalOpen, setInternalOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const isControlled = controlledOpen !== undefined;
    const openState = isControlled ? controlledOpen : internalOpen;
    const setOpenState = isControlled ? onOpenChange : setInternalOpen;

    // Form State
    const [type, setType] = useState<'Expense' | 'Income'>('Expense');
    const [description, setDescription] = useState("");
    const [amount, setAmount] = useState("");
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [category, setCategory] = useState("");

    // Initialize/Reset form
    useEffect(() => {
        if (openState) {
            if (transaction) {
                setType((transaction.type as 'Income' | 'Expense') || 'Expense');
                setDescription(transaction.description);
                setAmount(transaction.amount.toString());
                setDate(new Date(transaction.date).toISOString().split('T')[0]);
                setCategory(transaction.category);
            } else {
                // Reset for Add mode
                setType('Expense');
                setDescription("");
                setAmount("");
                setDate(new Date().toISOString().split('T')[0]);
                setCategory("");
            }
        }
    }, [openState, transaction]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!description || !amount || !category) {
            toast({ variant: "destructive", title: "Hata", description: "Lütfen tüm alanları doldurun." });
            return;
        }

        setLoading(true);
        try {
            let result;

            if (transaction) {
                // UPDATE
                result = await updateTransaction(transaction.id, {
                    description,
                    amount: parseFloat(amount),
                    date,
                    category,
                    type,
                    projectId
                });
            } else {
                // CREATE
                result = await createTransaction({
                    description,
                    amount: parseFloat(amount),
                    date,
                    category,
                    projectId,
                    type
                });
            }

            if (result.success) {
                toast({ title: "Başarılı", description: transaction ? "İşlem güncellendi." : `${type === 'Income' ? 'Gelir' : 'Gider'} eklendi.` });
                setOpenState && setOpenState(false);
                if (!transaction) {
                    setDescription("");
                    setAmount("");
                    setCategory("");
                }
            } else {
                toast({ variant: "destructive", title: "Hata", description: result.error });
            }
        } catch (error) {
            toast({ variant: "destructive", title: "Hata", description: "Beklenmeyen bir hata oluştu." });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={openState} onOpenChange={setOpenState}>
            {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
            {!trigger && !isControlled && (
                <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 gap-1">
                        <Plus className="h-3.5 w-3.5" />
                        <span>İşlem Ekle</span>
                    </Button>
                </DialogTrigger>
            )}

            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{transaction ? 'İşlemi Düzenle' : 'Yeni Kasa İşlemi Ekle'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                    {/* TYPE SELECTION */}
                    <div className="grid grid-cols-2 gap-2">
                        <div
                            onClick={() => { setType('Income'); setCategory(''); }}
                            className={cn(
                                "cursor-pointer rounded-md border-2 p-4 flex flex-col items-center gap-2 transition-all",
                                type === 'Income' ? "border-green-500 bg-green-50 text-green-700" : "border-transparent bg-muted hover:bg-muted/80"
                            )}
                        >
                            <ArrowUpCircle className="h-6 w-6" />
                            <span className="font-semibold text-sm">Gelir (Giriş)</span>
                        </div>
                        <div
                            onClick={() => { setType('Expense'); setCategory(''); }}
                            className={cn(
                                "cursor-pointer rounded-md border-2 p-4 flex flex-col items-center gap-2 transition-all",
                                type === 'Expense' ? "border-red-500 bg-red-50 text-red-700" : "border-transparent bg-muted hover:bg-muted/80"
                            )}
                        >
                            <ArrowDownCircle className="h-6 w-6" />
                            <span className="font-semibold text-sm">Gider (Çıkış)</span>
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label>Tarih</Label>
                        <Input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            required
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label>Kategori</Label>
                        <Select value={category} onValueChange={setCategory} required>
                            <SelectTrigger>
                                <SelectValue placeholder="Kategori Seçin" />
                            </SelectTrigger>
                            <SelectContent>
                                {(type === 'Income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map(cat => (
                                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid gap-2">
                        <Label>Açıklama</Label>
                        <Input
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder={type === 'Income' ? "Örn: Müşteriden elden alınan" : "Örn: Yemek fişi"}
                            required
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label>Tutar (TL)</Label>
                        <Input
                            type="number"
                            step="0.01"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="0.00"
                            required
                        />
                    </div>

                    <Button type="submit" disabled={loading} className={cn(type === 'Income' ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700")}>
                        {loading ? "Kaydediliyor..." : (transaction ? "Güncelle" : "Kaydet")}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}

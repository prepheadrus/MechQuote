'use client';

import { useEffect, useMemo, useState } from 'react';
import { JobAssignment } from '@prisma/client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, PlusCircle, Trash2, Edit, WalletCards } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { updateJobAssignmentPayment } from '@/actions/job-assignments';
import { Card, CardContent } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { ScrollArea } from '../ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { CalendarIcon } from 'lucide-react';
import { Calendar } from '../ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { formatCurrency } from '@/lib/formatters';


export type Payment = {
  amount: number;
  date: Date;
  note?: string;
}

interface ManagePaymentsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  assignment: any | null; // Changed to any for flexibility with server data
  onSuccess: () => void;
}

const createPaymentSchema = (maxAmount: number) => z.object({
  amount: z.coerce
    .number()
    .min(0.01, 'Tutar 0\'dan büyük olmalıdır.')
    .max(maxAmount, `Ödeme tutarı kalan bakiyeyi (${formatCurrency(maxAmount)}) geçemez.`),
  date: z.date({ required_error: 'Ödeme tarihi zorunludur.' }),
  note: z.string().optional(),
});

type PaymentFormValues = z.infer<ReturnType<typeof createPaymentSchema>>;

export function ManagePaymentsDialog({
  isOpen,
  onOpenChange,
  assignment,
  onSuccess,
}: ManagePaymentsDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingPaymentIndex, setEditingPaymentIndex] = useState<number | null>(null);

  const maxPayableAmount = useMemo(() => {
    if (!assignment) return 0;
    const currentPaymentAmount = (editingPaymentIndex !== null && assignment.paymentHistory)
      ? assignment.paymentHistory[editingPaymentIndex].amount
      : 0;
    // Max amount that can be paid is what's remaining plus the amount of the item being edited.
    // Add a small epsilon to avoid floating point precision issues.
    return (assignment.remainingBalance) + currentPaymentAmount + 0.001;
  }, [assignment, editingPaymentIndex]);

  const paymentSchema = useMemo(() => createPaymentSchema(maxPayableAmount), [maxPayableAmount]);

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      amount: 0,
      date: new Date(),
      note: '',
    },
  });

  useEffect(() => {
    if (!isOpen) {
      form.reset();
      setEditingPaymentIndex(null);
    }
  }, [isOpen, form]);

  const handleEditClick = (payment: Payment, index: number) => {
    setEditingPaymentIndex(index);
    form.reset({
      amount: payment.amount,
      date: payment.date, // Dexie stores Date, simple assignment
      note: payment.note || '',
    });
  };

  const cancelEdit = () => {
    setEditingPaymentIndex(null);
    form.reset({ amount: 0, date: new Date(), note: '' });
  }

  const onPaymentSubmit = async (values: PaymentFormValues) => {
    if (!assignment) return;
    setIsSubmitting(true);

    try {
      if (!assignment.id) throw new Error("Atama ID'si bulunamadı");

      const newPaymentHistory: Payment[] = [...(assignment.paymentHistory || [])];

      const paymentData: Payment = {
        amount: values.amount,
        date: values.date,
        note: values.note,
      };

      if (editingPaymentIndex !== null) {
        // Update existing payment
        newPaymentHistory[editingPaymentIndex] = paymentData;
      } else {
        // Add new payment
        newPaymentHistory.push(paymentData);
      }

      const newTotalPaid = newPaymentHistory.reduce((sum, p) => sum + p.amount, 0);
      let newStatus: JobAssignment['paymentStatus'] = 'Kısmi Ödendi';
      // Use a small epsilon for floating point comparison
      if (newTotalPaid >= assignment.assignedAmount - 0.001) {
        newStatus = 'Ödendi';
      } else if (newTotalPaid <= 0) {
        newStatus = 'Ödenmedi';
      }

      const result = await updateJobAssignmentPayment(assignment.id, {
        paymentHistory: newPaymentHistory,
        paymentStatus: newStatus
      });

      toast({
        title: 'Başarılı!',
        description: `Ödeme kaydı ${editingPaymentIndex !== null ? 'güncellendi' : 'eklendi'}.`,
      });

      cancelEdit();
      onSuccess();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Hata', description: `İşlem başarısız: ${error.message}` });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePayment = async (paymentIndex: number) => {
    if (!assignment || !assignment.paymentHistory) return;

    const updatedHistory = [...assignment.paymentHistory];
    updatedHistory.splice(paymentIndex, 1);

    try {
      if (!assignment.id) throw new Error("Atama ID'si bulunamadı");

      const newTotalPaid = updatedHistory.reduce((sum, p) => sum + p.amount, 0);
      let newStatus: JobAssignment['paymentStatus'] = 'Kısmi Ödendi';
      if (newTotalPaid >= assignment.assignedAmount - 0.001) {
        newStatus = 'Ödendi';
      } else if (newTotalPaid <= 0) {
        newStatus = 'Ödenmedi';
      }

      const result = await updateJobAssignmentPayment(assignment.id, {
        paymentHistory: updatedHistory,
        paymentStatus: newStatus
      });

      toast({ title: 'Başarılı', description: 'Ödeme kaydı silindi.' });
      onSuccess();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Hata', description: `Ödeme silinemedi: ${error.message}` });
    }
  };

  if (!assignment) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Ödeme Yönetimi: {assignment.personnelName}</DialogTitle>
          <DialogDescription>
            Proje: "{assignment.projectName}" için yapılan ödemeleri yönetin.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-4 my-4">
          <Card className="bg-slate-50 dark:bg-slate-800"><CardContent className="pt-6">
            <div className="text-sm font-medium text-muted-foreground">Toplam Hakediş</div>
            <div className="text-2xl font-bold">{formatCurrency(assignment.assignedAmount)}</div>
          </CardContent></Card>
          <Card className="bg-green-50 dark:bg-green-900/50 border-green-200 dark:border-green-800"><CardContent className="pt-6">
            <div className="text-sm font-medium text-green-700 dark:text-green-300">Toplam Ödenen</div>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{formatCurrency(assignment.totalPaid)}</div>
          </CardContent></Card>
          <Card className="bg-red-50 dark:bg-red-900/50 border-red-200 dark:border-red-800"><CardContent className="pt-6">
            <div className="text-sm font-medium text-red-700 dark:text-red-300">Kalan Bakiye</div>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">{formatCurrency(assignment.remainingBalance)}</div>
          </CardContent></Card>
        </div>

        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2">
            <h4 className="font-semibold mb-2">Ödeme Geçmişi</h4>
            <ScrollArea className="h-64 border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tarih</TableHead>
                    <TableHead>Not</TableHead>
                    <TableHead className="text-right">Tutar</TableHead>
                    <TableHead className="w-24 text-right">Eylemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(assignment.paymentHistory || []).length > 0 ? (
                    assignment.paymentHistory?.map((p: any, index: number) => (
                      <TableRow key={index}>
                        <TableCell>{format(p.date, 'dd MMMM yyyy', { locale: tr })}</TableCell>
                        <TableCell className="text-muted-foreground">{p.note}</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(p.amount)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end">
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-600" onClick={() => handleEditClick(p, index)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => handleDeletePayment(index)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">
                        Bu iş için henüz ödeme kaydedilmemiş.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
          <div>
            <h4 className="font-semibold mb-2">{editingPaymentIndex !== null ? 'Ödemeyi Düzenle' : 'Yeni Ödeme Ekle'}</h4>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onPaymentSubmit)} className="space-y-4 rounded-md border p-4">
                <FormField control={form.control} name="amount" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ödeme Tutarı (TL)</FormLabel>
                    <div className="flex items-center gap-2">
                      <FormControl>
                        <Input type="number" step="any" {...field} />
                      </FormControl>
                      <Button
                        type="button"
                        variant="secondary"
                        className="whitespace-nowrap px-3"
                        onClick={() => {
                          const currentPaymentAmount = (editingPaymentIndex !== null && assignment?.paymentHistory) ? assignment.paymentHistory[editingPaymentIndex].amount : 0;
                          const maxPayable = (assignment?.remainingBalance ?? 0) + currentPaymentAmount;
                          form.setValue('amount', parseFloat(maxPayable.toFixed(2)), { shouldValidate: true })
                        }}
                        disabled={maxPayableAmount <= 0.01}
                      >
                        <WalletCards className="mr-2 h-4 w-4" /> Kalanı Öde
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="date" render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Ödeme Tarihi</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                          >
                            {field.value ? format(field.value, "PPP", { locale: tr }) : <span>Tarih seç</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                          initialFocus
                          locale={tr}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="note" render={({ field }) => (
                  <FormItem><FormLabel>Not (Opsiyonel)</FormLabel><FormControl><Input placeholder="İş avansı" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <div className="space-y-2">
                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : editingPaymentIndex !== null ? <Edit className="mr-2 h-4 w-4" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                    {editingPaymentIndex !== null ? 'Güncelle' : 'Ödemeyi Kaydet'}
                  </Button>
                  {editingPaymentIndex !== null && (
                    <Button type="button" variant="outline" className="w-full" onClick={cancelEdit}>
                      İptal et ve Yeni Kayda Geç
                    </Button>
                  )}
                </div>
              </form>
            </Form>
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Kapat</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

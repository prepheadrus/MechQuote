'use client';

import { useState, useMemo, useEffect, useCallback, Fragment } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MoreHorizontal, Edit, Trash2, Search, Mail, Phone, UserPlus, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Skeleton } from '@/components/ui/skeleton';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { getAvatarFallback } from '@/lib/placeholder-images';
import { cn } from "@/lib/utils";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Progress } from "@/components/ui/progress";
import {
  Briefcase,
  Calendar,
  ChevronDown,
  ChevronUp,
  History,
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PersonnelStatement } from '@/components/personnel/personnel-statement';
import { getPersonnel, createPersonnel, updatePersonnel, deletePersonnel } from '@/actions/personnel';
import type { Personnel } from '@prisma/client';
import { usePersonnel } from '@/hooks/use-personnel';

const formatCurrency = (amount: number | null | undefined) => {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(amount || 0);
};

const formatDateLocal = (date: Date | string) => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' });
};

// --- Types ---
const personnelSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, "İsim en az 2 karakter olmalıdır."),
  role: z.string().min(2, "Rol en az 2 karakter olmalıdır."),
  phone: z.string().optional(),
  email: z.string().email("Geçerli bir e-posta adresi girin.").optional().or(z.literal('')),
  status: z.enum(['Aktif', 'Pasif']),
  dailyRate: z.coerce.number().optional(),
});

type PersonnelFormValues = z.infer<typeof personnelSchema>;

export function PersonnelPageContent() {
  const { toast } = useToast();

  // React Query ile personel listesini çek
  const { 
    personnel: queryPersonnel, 
    isLoading: isLoadingQuery,
    deletePersonnel: deletePersonnelMutation,
  } = usePersonnel();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPersonnel, setEditingPersonnel] = useState<Personnel | null>(null);
  const [expandedPersonnelId, setExpandedPersonnelId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Fallback: Eğer query boşsa manuel yükle
  const personnelList = queryPersonnel.length > 0 ? queryPersonnel : [];

  const filteredPersonnel = useMemo(() => {
    const searchTerms = searchTerm.toLocaleLowerCase('tr-TR').split(' ').filter(term => term.length > 0);
    if (searchTerms.length === 0) return personnelList;

    return personnelList.filter(p => {
      const personnelText = `${p.name} ${p.role}`.toLocaleLowerCase('tr-TR');
      return searchTerms.every(term => personnelText.includes(term));
    });
  }, [personnelList, searchTerm]);

  const handleOpenAddDialog = () => {
    setEditingPersonnel(null);
    setIsDialogOpen(true);
  };

  const handleOpenEditDialog = (p: Personnel) => {
    setEditingPersonnel(p);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deletePersonnelMutation(id);
      toast({ title: "Personel Silindi", description: "Personel başarıyla silindi." });
    } catch (error) {
      console.error(error);
      toast({ variant: "destructive", title: "Hata", description: "Silme işlemi başarısız." });
    }
  };

  const handleFormSuccess = async () => {
    setIsDialogOpen(false);
  }

  return (
    <div className="flex flex-col gap-4 p-8">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Ekipler</h2>
          <p className="text-muted-foreground">Ekibinizi yönetin ve iş atamaları yapın.</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={handleOpenAddDialog}>
            <UserPlus className="mr-2 h-4 w-4" />
            Yeni Ekip Üyesi Ekle
          </Button>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Ekip Listesi</CardTitle>
          <div className="pt-4">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="İsim veya role göre ara..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="w-[300px]">Personel / Ekip</TableHead>
                <TableHead className="hidden md:table-cell">Durum</TableHead>
                <TableHead className="text-center">Projeler</TableHead>
                <TableHead className="text-right">Toplam Hakediş</TableHead>
                <TableHead className="text-right">Ödenen</TableHead>
                <TableHead className="text-right">Bakiye</TableHead>
                <TableHead className="w-[100px] text-right">İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingQuery ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={7}><Skeleton className="h-12 w-full" /></TableCell>
                  </TableRow>
                ))
              ) : filteredPersonnel.length > 0 ? (
                filteredPersonnel.map((p: any) => {
                  let totalHakedis = 0;
                  let totalPaid = 0;
                  const activeAssignments = p.assignments || [];

                  activeAssignments.forEach((a: any) => {
                    totalHakedis += a.assignedAmount || 0;
                    const history = a.paymentHistory ? JSON.parse(a.paymentHistory) : [];
                    totalPaid += history.reduce((sum: number, pay: any) => sum + pay.amount, 0);
                  });

                  const projectCount = new Set(activeAssignments.map((a: any) => a.proposal?.projectId || a.proposalId)).size;
                  const progress = totalHakedis > 0 ? Math.min((totalPaid / totalHakedis) * 100, 100) : 0;

                  // Synthesize Transactions: Combine real transactions with job assignments
                  const transactions = [
                    ...activeAssignments.map((a: any) => ({
                      id: `assign-${a.id}`,
                      amount: -(a.assignedAmount || 0), // Credit/Earning (Negative increases what we owe)
                      type: 'Earning',
                      category: 'Sözleşme',
                      description: `${a.proposal?.projectName || 'Proje'} - İş Ataması (Anlaşılan Tutar)`,
                      date: a.assignedAt || p.createdAt,
                      project: a.proposal ? { name: a.proposal.projectName } : (a.project ? { name: a.project.name } : null)
                    })),
                    ...((p as any).transactions || [])
                  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                  // Correct Balance: sum of all synthesized movements
                  // Negative values are "We owe them" (Hakediş), Positive are "We paid them" (Payment)
                  // So a negative sum means "They have an outstanding credit" (Total Hakediş > Total Paid)
                  const runningTotal = transactions.reduce((sum, t) => sum + t.amount, 0);
                  const balance = Math.abs(runningTotal); // Display absolute value for clarity, color by sign

                  const isExpanded = expandedPersonnelId === p.id;

                  return (
                    <Fragment key={p.id}>
                      <TableRow
                        className={cn(
                          "group cursor-pointer hover:bg-muted/40 transition-colors border-b",
                          isExpanded && "bg-muted/30 border-b-0"
                        )}
                        onClick={() => setExpandedPersonnelId(isExpanded ? null : p.id)}
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-3 w-full px-4 py-3">
                            <Avatar className="h-10 w-10 border shadow-sm">
                              <AvatarFallback className="bg-primary/5 text-primary text-xs font-bold">{getAvatarFallback(p.name)}</AvatarFallback>
                            </Avatar>
                            <div className="text-left">
                              <div className="font-bold text-sm flex items-center gap-2">
                                {p.name}
                                {isExpanded ? <ChevronUp className="h-3 w-3 text-muted-foreground" /> : <ChevronDown className="h-3 w-3 text-muted-foreground" />}
                              </div>
                              <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">{p.role}</div>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell className="hidden md:table-cell">
                          <Badge variant={p.status === 'Aktif' ? 'secondary' : 'outline'} className={cn(
                            "text-[10px] uppercase px-1.5 py-0",
                            p.status === 'Aktif' ? 'bg-green-50 text-green-700 border-green-200' : ''
                          )}>
                            {p.status}
                          </Badge>
                        </TableCell>

                        <TableCell className="text-center">
                          <div className="inline-flex items-center justify-center bg-primary/10 text-primary rounded-full px-2 py-0.5 text-xs font-bold min-w-[24px]">
                            {projectCount}
                          </div>
                        </TableCell>

                        <TableCell className="text-right font-mono text-sm font-semibold">
                          {formatCurrency(totalHakedis)}
                        </TableCell>

                        <TableCell className="text-right font-mono text-sm text-green-600 font-medium">
                          {formatCurrency(totalPaid)}
                        </TableCell>

                        <TableCell className="text-right font-mono text-sm">
                          <div className={cn("font-bold", runningTotal < 0 ? "text-red-500" : "text-green-600")}>
                            {formatCurrency(balance)}
                          </div>
                        </TableCell>

                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>İşlemler</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => handleOpenEditDialog(p)}>
                                <Edit className="mr-2 h-4 w-4" /> Düzenle
                              </DropdownMenuItem>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-600 focus:bg-red-100 focus:text-red-700">
                                    <Trash2 className="mr-2 h-4 w-4" /> Sil
                                  </DropdownMenuItem>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Emin misiniz?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Bu işlem geri alınamaz. "{p.name}" adlı ekip üyesi kalıcı olarak silinecektir.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>İptal</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDelete(p.id)} className="bg-destructive hover:bg-destructive/90">
                                      Evet, Sil
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>

                      {isExpanded && (
                        <TableRow className="bg-muted/20 border-b-2 border-primary/10">
                          <TableCell colSpan={7} className="p-0">
                            <Tabs defaultValue="overview" className="w-full">
                              <div className="px-6 pt-4 border-b bg-muted/30">
                                <TabsList className="h-9 justify-start bg-transparent p-0 gap-4">
                                  <TabsTrigger value="overview" className="rounded-none border-b-2 border-transparent data-[state=active]:bg-transparent data-[state=active]:border-primary data-[state=active]:shadow-none px-2 h-9">Genel Bakış</TabsTrigger>
                                  <TabsTrigger value="statement" className="rounded-none border-b-2 border-transparent data-[state=active]:bg-transparent data-[state=active]:border-primary data-[state=active]:shadow-none px-2 h-9">Hesap Ekstresi</TabsTrigger>
                                </TabsList>
                              </div>

                              <TabsContent value="overview" className="m-0">
                                <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in slide-in-from-top-2 duration-300">
                                  {/* Left Side: Personnel Info & Stats */}
                                  <div className="lg:col-span-4 space-y-4 border-r pr-6">
                                    <div className="space-y-3">
                                      <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                        <TrendingUp className="h-3.5 w-3.5" /> Genel Ödeme İlerlemesi
                                      </h4>
                                      <div className="space-y-1.5">
                                        <div className="flex justify-between text-sm font-bold">
                                          <span>Tamamlanan</span>
                                          <span className="text-primary">%{Math.round(progress)}</span>
                                        </div>
                                        <Progress value={progress} className="h-2.5" />
                                      </div>
                                      <div className="grid grid-cols-2 gap-2 mt-4">
                                        <div className="bg-background p-3 rounded-xl border shadow-sm">
                                          <div className="text-[10px] text-muted-foreground font-bold uppercase">Hakediş</div>
                                          <div className="text-sm font-black mt-1">{formatCurrency(totalHakedis)}</div>
                                        </div>
                                        <div className="bg-background p-3 rounded-xl border shadow-sm">
                                          <div className="text-[10px] text-red-500 font-bold uppercase">Bakiye</div>
                                          <div className="text-sm font-black mt-1 text-red-600">{formatCurrency(balance)}</div>
                                        </div>
                                      </div>
                                    </div>

                                    <div className="pt-4 space-y-3">
                                      <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                        <History className="h-3.5 w-3.5" /> İletişim Bilgileri
                                      </h4>
                                      <div className="space-y-2">
                                        {p.email && (
                                          <div className="flex items-center gap-3 p-2 rounded-lg bg-background border text-sm">
                                            <div className="h-7 w-7 rounded bg-blue-50 flex items-center justify-center text-blue-600"><Mail className="h-3.5 w-3.5" /></div>
                                            <span className="font-medium">{p.email}</span>
                                          </div>
                                        )}
                                        {p.phone && (
                                          <div className="flex items-center gap-3 p-2 rounded-lg bg-background border text-sm">
                                            <div className="h-7 w-7 rounded bg-green-50 flex items-center justify-center text-green-600"><Phone className="h-3.5 w-3.5" /></div>
                                            <span className="font-medium">{p.phone}</span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Right Side: Job Assignments List */}
                                  <div className="lg:col-span-8 space-y-4">
                                    <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                      <Briefcase className="h-3.5 w-3.5" /> Güncel İş Atamaları ve Projeler
                                    </h4>

                                    {activeAssignments.length > 0 ? (
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                        {activeAssignments.map((a: any) => {
                                          const projPaid = (a.paymentHistory ? JSON.parse(a.paymentHistory) : []).reduce((s: number, py: any) => s + py.amount, 0);
                                          const projBalance = (a.assignedAmount || 0) - projPaid;
                                          const isPaid = projBalance <= 0 && a.assignedAmount > 0;

                                          return (
                                            <div key={a.id} className="bg-background border rounded-xl p-4 shadow-sm hover:border-primary/30 transition-colors">
                                              <div className="flex justify-between items-start mb-2">
                                                <div className="overflow-hidden">
                                                  <div className="font-bold text-sm truncate">{a.proposal?.projectName || 'İsimsiz Proje'}</div>
                                                  <div className="text-[10px] text-muted-foreground truncate uppercase">{a.proposal?.customer?.name || 'Müşteri Bilgisi Yok'}</div>
                                                </div>
                                                {isPaid ? (
                                                  <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                                                ) : (
                                                  <Clock className="h-4 w-4 text-amber-500 flex-shrink-0" />
                                                )}
                                              </div>

                                              <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-dashed">
                                                <div>
                                                  <div className="text-[9px] text-muted-foreground uppercase font-bold">Hakediş</div>
                                                  <div className="text-xs font-bold">{formatCurrency(a.assignedAmount)}</div>
                                                </div>
                                                <div className="text-right">
                                                  <div className="text-[9px] text-red-400 uppercase font-bold">Borç</div>
                                                  <div className="text-xs font-bold text-red-600">{formatCurrency(projBalance)}</div>
                                                </div>
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    ) : (
                                      <div className="h-32 flex flex-col items-center justify-center bg-background border border-dashed rounded-2xl text-muted-foreground italic text-sm">
                                        <Briefcase className="h-8 w-8 mb-2 opacity-10" />
                                        Henüz bir iş ataması bulunmuyor.
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </TabsContent>

                              <TabsContent value="statement" className="m-0 p-6">
                                <PersonnelStatement
                                  personnelName={p.name}
                                  transactions={transactions}
                                  rawBalance={runningTotal}
                                />
                              </TabsContent>
                            </Tabs>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground italic">
                    <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-20" />
                    Henüz ekip üyesi eklenmemiş veya aramanızla eşleşen sonuç yok.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <PersonnelFormDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSuccess={handleFormSuccess}
        existingPersonnel={editingPersonnel}
      />
    </div >
  );
}

function PersonnelFormDialog({ isOpen, onOpenChange, onSuccess, existingPersonnel }: { isOpen: boolean; onOpenChange: (open: boolean) => void; onSuccess: () => void; existingPersonnel: Personnel | null }) {
  const { toast } = useToast();
  const form = useForm<PersonnelFormValues>({
    resolver: zodResolver(personnelSchema),
  });

  useEffect(() => {
    if (isOpen) {
      if (existingPersonnel) {
        form.reset({
          id: existingPersonnel.id,
          name: existingPersonnel.name,
          role: existingPersonnel.role,
          phone: existingPersonnel.phone || '',
          email: existingPersonnel.email || '',
          status: existingPersonnel.status as 'Aktif' | 'Pasif',
          dailyRate: existingPersonnel.dailyRate ? Number(existingPersonnel.dailyRate) : undefined
        });
      } else {
        form.reset({ name: '', role: '', phone: '', email: '', status: 'Aktif', dailyRate: undefined });
      }
    }
  }, [isOpen, existingPersonnel, form]);

  const onSubmit = async (values: PersonnelFormValues) => {
    const { id, ...data } = values;
    let result;

    // Convert undefined to null for Prisma if needed, but Prisma usually handles undefined as 'do not update'
    // For creation, we want to ensure we don't send undefined for required fields
    const formattedData = {
      ...data,
      phone: data.phone || null,
      email: data.email || null,
      dailyRate: data.dailyRate || null,
    } as any;

    if (id) {
      result = await updatePersonnel(id, formattedData);
    } else {
      result = await createPersonnel(formattedData);
    }

    if (result.success) {
      toast({ title: "Başarılı", description: `Ekip üyesi ${id ? 'güncellendi' : 'eklendi'}.` });
      onSuccess();
    } else {
      toast({ variant: "destructive", title: "Hata", description: result.error || 'İşlem başarısız oldu' });
    }
  };

  const isEditMode = !!existingPersonnel;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Ekip Üyesini Düzenle' : 'Yeni Ekip Üyesi Ekle'}</DialogTitle>
          <DialogDescription>
            Ekip üyesinin bilgilerini giriniz.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem><FormLabel>Ad Soyad / Ekip Adı</FormLabel><FormControl><Input placeholder="Örn: Ahmet Yılmaz veya Montaj Ekibi A" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="role" render={({ field }) => (
              <FormItem><FormLabel>Rol / Unvan</FormLabel><FormControl><Input placeholder="Tesisat Ustası" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="phone" render={({ field }) => (
              <FormItem><FormLabel>Telefon</FormLabel><FormControl><Input type="tel" placeholder="(5xx) xxx xx xx" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="email" render={({ field }) => (
              <FormItem><FormLabel>E-posta</FormLabel><FormControl><Input type="email" placeholder="ahmet@example.com" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="dailyRate" render={({ field }) => (
              <FormItem><FormLabel>Günlük Ücret (Opsiyonel)</FormLabel><FormControl><Input type="number" placeholder="0" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="status" render={({ field }) => (
              <FormItem><FormLabel>Durum</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="Aktif">Aktif</SelectItem>
                    <SelectItem value="Pasif">Pasif</SelectItem>
                  </SelectContent>
                </Select><FormMessage />
              </FormItem>
            )} />
            <DialogFooter>
              <DialogClose asChild><Button type="button" variant="outline">İptal</Button></DialogClose>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditMode ? 'Güncelle' : 'Kaydet'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
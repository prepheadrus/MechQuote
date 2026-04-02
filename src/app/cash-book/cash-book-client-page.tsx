'use client';

/**
 * Cash Book Client Page - React Query Version
 * 
 * Kasa Defteri - React Query ile
 */

import { useState, useMemo, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
    DollarSign, ArrowUpRight, ArrowDownLeft, Search,
    Wallet, Building2, User2, Briefcase, Plus,
    Loader2, Pencil, Trash2
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    Dialog, DialogContent, DialogDescription, DialogFooter,
    DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { formatCurrency, formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { useWorkspace } from '@/components/workspace/workspace-context';
import { useToast } from '@/hooks/use-toast';
import { getCashBookFormData } from '@/actions/cash-book';
import { useCashBookEntries, useAddCashEntry, useUpdateCashEntry, useDeleteCashEntry } from '@/hooks/use-cash-book';

interface CashBookClientPageProps {
    initialEntries: any[];
}

const COMMON_CATEGORIES = {
    IN: ['Hakediş Tahsilatı', 'Avans Tahsilatı', 'Müşteri Ödemesi', 'Ekstra İş Tahsilatı', 'Geri Ödeme', 'Diğer Tahsilat'],
    OUT: ['Malzeme Alımı', 'Saha Gideri', 'İşçilik Ödemesi', 'Lojistik / Nakliye', 'Maaş / Avans', 'Akaryakıt / Yol', 'Yemek / Konaklama', 'Ofis Gideri', 'Vergi / Harç', 'Kira Ödemesi', 'Diğer Gider']
};

function TruckIcon({ className }: { className?: string }) {
    return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 17h4V5H2v12h3m20-11V8a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v11m1-11h-9a2 2 0 0 0-2 2v6m14 0h2a2 2 0 0 0 2-2v-5a2 2 0 0 0-2-2h-2m-6 0H6a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h2m-4 0h20" /></svg>;
}

export function CashBookClientPage({ initialEntries }: CashBookClientPageProps) {
    const { openTab } = useWorkspace();
    const { toast } = useToast();
    
    // ✅ YENİ: React Query
    const { data: entries, isLoading, refetch } = useCashBookEntries();
    const addMutation = useAddCashEntry();
    const updateMutation = useUpdateCashEntry();
    const deleteMutation = useDeleteCashEntry();
    
    const [searchQuery, setSearchQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState<'ALL' | 'IN' | 'OUT'>('ALL');
    const [sourceFilter, setSourceFilter] = useState<string>('ALL');

    // Add Entry Form State
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isManualCategory, setIsManualCategory] = useState(false);
    const [formData, setFormData] = useState({
        type: 'IN' as 'IN' | 'OUT',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        description: '',
        category: '',
        linkType: 'None' as 'None' | 'Project' | 'Customer' | 'Personnel' | 'Supplier',
        entityId: '',
        supplierId: ''
    });

    // Entity Data for Form
    const [entities, setEntities] = useState<{
        customers: any[];
        projects: any[];
        personnel: any[];
        suppliers: any[];
    }>({ customers: [], projects: [], personnel: [], suppliers: [] });

    useEffect(() => {
        if (isAddOpen) {
            getCashBookFormData().then(res => {
                if (res.success) {
                    setEntities({
                        customers: res.customers || [],
                        projects: res.projects || [],
                        personnel: res.personnel || [],
                        suppliers: (res as any).suppliers || []
                    });
                }
            });
        }
    }, [isAddOpen]);

    // ✅ YENİ: Edit & Delete States
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedEntry, setSelectedEntry] = useState<any | null>(null);
    const [editData, setEditData] = useState({
        amount: '',
        date: '',
        description: '',
        category: ''
    });

    // ✅ YENİ: Ek bağlam alanları (opsiyonel)
    const [contextData, setContextData] = useState({
        projectId: '', // Hangi proje için? (Personel/Müşteri için opsiyonel)
        invoiceId: ''  // Hangi fatura için? (Tedarikçi için opsiyonel)
    });

    const filteredEntries = useMemo(() => {
        if (!entries) return [];
        
        return entries.filter(entry => {
            const matchesSearch =
                entry.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (entry.entityName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                entry.category.toLowerCase().includes(searchQuery.toLowerCase());

            const matchesType = typeFilter === 'ALL' || entry.type === typeFilter;
            const matchesSource = sourceFilter === 'ALL' || entry.source === sourceFilter;

            return matchesSearch && matchesType && matchesSource;
        });
    }, [entries, searchQuery, typeFilter, sourceFilter]);

    const stats = useMemo(() => {
        if (!entries) return { totalIn: 0, totalOut: 0, net: 0 };
        
        const totalIn = filteredEntries.filter(e => e.type === 'IN').reduce((sum, e) => sum + e.amount, 0);
        const totalOut = filteredEntries.filter(e => e.type === 'OUT').reduce((sum, e) => sum + e.amount, 0);
        return {
            totalIn,
            totalOut,
            net: totalIn - totalOut
        };
    }, [filteredEntries]);

    const handleSubmit = async () => {
        if (!formData.amount || !formData.description) {
            toast({ variant: "destructive", title: "Eksik Bilgi", description: "Tutar ve açıklama zorunlu." });
            return;
        }

        // ✅ YENİ: Bağlam bilgilerini açıklamaya ekle
        let fullDescription = formData.description;
        if (contextData.projectId && formData.linkType !== 'Project') {
            const project = entities.projects.find(p => p.id === contextData.projectId);
            if (project) {
                fullDescription += ` (${project.name} için)`;
            }
        }
        if (contextData.invoiceId && formData.linkType === 'Supplier') {
            fullDescription += ` (Fatura: ${contextData.invoiceId})`;
        }

        addMutation.mutate({
            ...formData,
            description: fullDescription,
            amount: parseFloat(formData.amount),
            // ✅ YENİ: Bağlam bilgilerini gönder
            projectId: contextData.projectId,
            metadata: JSON.stringify({
                projectId: contextData.projectId,
                invoiceId: contextData.invoiceId
            })
        }, {
            onSuccess: () => {
                setIsAddOpen(false);
                setFormData({
                    type: 'IN',
                    amount: '',
                    date: new Date().toISOString().split('T')[0],
                    description: '',
                    category: '',
                    linkType: 'None',
                    entityId: '',
                    supplierId: ''
                });
                setContextData({
                    projectId: '',
                    invoiceId: ''
                });
            }
        });
    };

    const handleRowClick = (entry: any) => {
        if (!entry.relatedId) return;

        switch (entry.relatedType) {
            case 'Project':
                openTab(`/projects/${entry.relatedId}`, entry.entityName || 'Proje');
                break;
            case 'Customer':
                openTab(`/customers/${entry.relatedId}`, entry.entityName || 'Müşteri');
                break;
            case 'Personnel':
                openTab(`/personnel`, 'Ekipler');
                break;
            case 'Invoice':
                openTab(`/invoices`, 'Faturalar');
                break;
            case 'Supplier':
                openTab(`/warehouse`, 'Depo / Stok');
                break;
        }
    };
    
    // ✅ YENİ: Edit Handler
    const handleEdit = (entry: any) => {
        setSelectedEntry(entry);
        setEditData({
            amount: entry.amount.toString(),
            date: new Date(entry.date).toISOString().split('T')[0],
            description: entry.description,
            category: entry.category
        });
        setIsEditOpen(true);
    };
    
    const handleEditSubmit = () => {
        if (!selectedEntry) return;
        
        updateMutation.mutate({
            entryId: selectedEntry.id,
            data: editData
        }, {
            onSuccess: () => {
                setIsEditOpen(false);
                setSelectedEntry(null);
            }
        });
    };
    
    // ✅ YENİ: Delete Handler
    const handleDelete = (entry: any) => {
        setSelectedEntry(entry);
        setIsDeleteDialogOpen(true);
    };
    
    const handleDeleteConfirm = () => {
        if (!selectedEntry) return;
        
        deleteMutation.mutate(selectedEntry.id, {
            onSuccess: () => {
                setIsDeleteDialogOpen(false);
                setSelectedEntry(null);
            }
        });
    };

    if (isLoading) {
        return (
            <div className="flex flex-col flex-1 h-full overflow-hidden bg-slate-50/50 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground mt-2">Kasa defteri yükleniyor...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col flex-1 h-full overflow-hidden bg-slate-50/50">
            {/* Header Area */}
            <div className="p-6 border-b bg-white space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
                            <Wallet className="h-6 w-6 text-primary" />
                            KASA DEFTERİ
                        </h1>
                        <p className="text-muted-foreground text-sm font-medium">
                            Tüm projeler, personel ödemeleri ve müşteri tahsilatlarının merkezi dökümü.
                        </p>
                    </div>

                    <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                        <DialogTrigger asChild>
                            <Button className="gap-2 font-bold shadow-lg shadow-primary/20">
                                <Plus className="h-4 w-4" /> YENİ İŞLEM
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[450px]">
                            <DialogHeader>
                                <DialogTitle>Yeni Kasa Hareketi</DialogTitle>
                                <DialogDescription>Kasaya para girişi veya harcama kaydı ekleyin.</DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Hareket Türü</Label>
                                        <Select
                                            value={formData.type}
                                            onValueChange={(v: any) => {
                                                setFormData({ ...formData, type: v, category: '' });
                                                setIsManualCategory(false);
                                            }}
                                        >
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="IN">Giriş (Tahsilat)</SelectItem>
                                                <SelectItem value="OUT">Çıkış (Harcama)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Tutar (TL)</Label>
                                        <Input
                                            type="number"
                                            placeholder="0.00"
                                            value={formData.amount}
                                            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>İlişkilendirme (Nereye İşlesin?)</Label>
                                    <Select value={formData.linkType} onValueChange={(v: any) => setFormData({ ...formData, linkType: v, entityId: '', supplierId: '' })}>
                                        <SelectTrigger><SelectValue placeholder="Seçiniz..." /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="None">İlişkilendirme Yok (Genel)</SelectItem>
                                            <SelectItem value="Project">Bir Projeye Bağla (Maliyet/Hasılat)</SelectItem>
                                            <SelectItem value="Customer">Müşteri Cari Hesabı (Direkt)</SelectItem>
                                            <SelectItem value="Supplier">Tedarikçi Cari Hesabı (Direkt)</SelectItem>
                                            <SelectItem value="Personnel">Personel Ödemesi (Maaş/Avans)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {formData.linkType !== 'None' && (
                                    <div className="space-y-2">
                                        <Label>
                                            {formData.linkType === 'Project' ? 'Proje Seçin' :
                                                formData.linkType === 'Customer' ? 'Müşteri Seçin' :
                                                    formData.linkType === 'Supplier' ? 'Tedarikçi Seçin' : 'Personel Seçin'}
                                        </Label>
                                        <Select value={formData.entityId} onValueChange={(v) => setFormData({ ...formData, entityId: v })}>
                                            <SelectTrigger><SelectValue placeholder="Seçiniz..." /></SelectTrigger>
                                            <SelectContent>
                                                {formData.linkType === 'Project' && entities.projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                                                {formData.linkType === 'Customer' && entities.customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                                {formData.linkType === 'Supplier' && entities.suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                                                {formData.linkType === 'Personnel' && entities.personnel.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}

                                {/* ✅ YENİ: Ek Bağlam Alanları (Opsiyonel) */}
                                {formData.linkType === 'Personnel' && formData.entityId && (
                                    <div className="space-y-2">
                                        <Label className="text-amber-600">
                                            <span className="text-xs">📋 Opsiyonel:</span> Hangi Proje İçin?
                                        </Label>
                                        <Select value={contextData.projectId} onValueChange={(v) => setContextData({ ...contextData, projectId: v })}>
                                            <SelectTrigger><SelectValue placeholder="Seçiniz... (Opsiyonel)" /></SelectTrigger>
                                            <SelectContent>
                                                {entities.projects.map(p => (
                                                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <p className="text-xs text-muted-foreground">
                                            Personel bu proje kapsamında çalıştıysa seçin.
                                        </p>
                                    </div>
                                )}

                                {formData.linkType === 'Customer' && formData.entityId && (
                                    <div className="space-y-2">
                                        <Label className="text-amber-600">
                                            <span className="text-xs">📋 Opsiyonel:</span> Hangi Proje İçin Tahsilat?
                                        </Label>
                                        <Select value={contextData.projectId} onValueChange={(v) => setContextData({ ...contextData, projectId: v })}>
                                            <SelectTrigger><SelectValue placeholder="Seçiniz... (Opsiyonel)" /></SelectTrigger>
                                            <SelectContent>
                                                {entities.projects.map(p => (
                                                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <p className="text-xs text-muted-foreground">
                                            Müşteri bu proje için ödeme yaptıysa seçin.
                                        </p>
                                    </div>
                                )}

                                {formData.linkType === 'Supplier' && formData.entityId && (
                                    <div className="space-y-2">
                                        <Label className="text-amber-600">
                                            <span className="text-xs">📋 Opsiyonel:</span> Hangi Proje İçin?
                                        </Label>
                                        <Select value={contextData.projectId} onValueChange={(v) => setContextData({ ...contextData, projectId: v })}>
                                            <SelectTrigger><SelectValue placeholder="Seçiniz... (Opsiyonel)" /></SelectTrigger>
                                            <SelectContent>
                                                {entities.projects.map(p => (
                                                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <p className="text-xs text-muted-foreground">
                                            Tedarikçi bu proje için mal/hizmet verdiyse seçin.
                                        </p>
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <Label>Açıklama</Label>
                                    <Textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        placeholder="Bu hareketin açıklamasını girin..."
                                        rows={3}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label>Kategori</Label>
                                    {!isManualCategory ? (
                                        <div className="flex gap-2">
                                            <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                                                <SelectTrigger><SelectValue placeholder="Seçiniz..." /></SelectTrigger>
                                                <SelectContent>
                                                    {COMMON_CATEGORIES[formData.type].map(cat => (
                                                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    setFormData({ ...formData, category: '' });
                                                    setIsManualCategory(true);
                                                }}
                                            >
                                                Manuel
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="flex gap-2">
                                            <Input
                                                value={formData.category}
                                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                                placeholder="Kategori yazın..."
                                            />
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    setFormData({ ...formData, category: '' });
                                                    setIsManualCategory(false);
                                                }}
                                            >
                                                İptal
                                            </Button>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label>Tarih</Label>
                                    <Input
                                        type="date"
                                        value={formData.date}
                                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsAddOpen(false)} disabled={addMutation.isPending}>İptal</Button>
                                <Button onClick={handleSubmit} disabled={addMutation.isPending}>
                                    {addMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Kaydet
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>

                {/* Stat Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                    <Card className="bg-emerald-50/50 border-emerald-100 shadow-sm">
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="p-3 bg-emerald-100 rounded-xl text-emerald-600">
                                <ArrowDownLeft className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-[10px] uppercase font-black text-emerald-700/60 tracking-wider">Toplam Tahsilat</p>
                                <p className="text-xl font-black text-emerald-700">{formatCurrency(stats.totalIn)}</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-red-50/50 border-red-100 shadow-sm">
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="p-3 bg-red-100 rounded-xl text-red-600">
                                <ArrowUpRight className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-[10px] uppercase font-black text-red-700/60 tracking-wider">Toplam Ödeme</p>
                                <p className="text-xl font-black text-red-700">{formatCurrency(stats.totalOut)}</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className={cn(
                        "shadow-sm",
                        stats.net >= 0 ? "bg-blue-50/50 border-blue-100" : "bg-amber-50/50 border-amber-100"
                    )}>
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className={cn(
                                "p-3 rounded-xl",
                                stats.net >= 0 ? "bg-blue-100 text-blue-600" : "bg-amber-100 text-amber-600"
                            )}>
                                <DollarSign className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-[10px] uppercase font-black tracking-wider opacity-60">Net Kasa Durumu</p>
                                <p className={cn(
                                    "text-xl font-black",
                                    stats.net >= 0 ? "text-blue-700" : "text-amber-700"
                                )}>
                                    {formatCurrency(stats.net)}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Filters & Content Area */}
            <div className="flex-1 overflow-hidden flex flex-col p-6 gap-4">
                <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl shadow-sm border border-slate-200/60">
                    <div className="flex flex-1 items-center gap-3 w-full">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Açıklama, müşteri veya personel ara..."
                                className="pl-9 bg-slate-50/50 border-none transition-all focus:bg-white focus:ring-1 focus:ring-primary shadow-inner"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <Select value={typeFilter} onValueChange={(v: any) => setTypeFilter(v)}>
                            <SelectTrigger className="w-[140px] bg-slate-50 border-none text-xs font-bold">
                                <SelectValue placeholder="İşlem Tipi" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">Tüm Hareketler</SelectItem>
                                <SelectItem value="IN">Girişler (+)</SelectItem>
                                <SelectItem value="OUT">Çıkışlar (-)</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={sourceFilter} onValueChange={setSourceFilter}>
                            <SelectTrigger className="w-[140px] bg-slate-50 border-none text-xs font-bold">
                                <SelectValue placeholder="Kaynak" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">Tüm Kaynaklar</SelectItem>
                                <SelectItem value="Müşteri">Müşteriler</SelectItem>
                                <SelectItem value="Proje">Projeler</SelectItem>
                                <SelectItem value="Personel">Personel</SelectItem>
                                <SelectItem value="Tedarikçi">Tedarikçiler</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200/60 overflow-hidden flex flex-col">
                    <div className="overflow-y-auto flex-1">
                        <Table>
                            <TableHeader className="sticky top-0 bg-white z-10 shadow-sm">
                                <TableRow className="hover:bg-transparent border-b">
                                    <TableHead className="w-[120px] text-[10px] font-black uppercase tracking-widest">Tarih</TableHead>
                                    <TableHead className="w-[100px] text-[10px] font-black uppercase tracking-widest text-center">Tür</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase tracking-widest">Açıklama / Detay</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase tracking-widest">Kaynak</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-right">Tutar</TableHead>
                                    <TableHead className="w-[100px] text-[10px] font-black uppercase tracking-widest text-center">İşlemler</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredEntries.length > 0 ? (
                                    filteredEntries.map((entry) => (
                                        <TableRow
                                            key={entry.id}
                                            className="group hover:bg-slate-50/80 cursor-pointer transition-colors"
                                            onClick={() => handleRowClick(entry)}
                                        >
                                            <TableCell className="py-2.5 font-medium text-xs text-muted-foreground">
                                                {formatDate(entry.date)}
                                            </TableCell>
                                            <TableCell className="py-2.5 text-center">
                                                {entry.type === 'IN' ? (
                                                    <Badge variant="outline" className="text-[10px] border-emerald-200 bg-emerald-50 text-emerald-700 py-0 h-5 font-black uppercase">GİRİŞ</Badge>
                                                ) : (
                                                    <Badge variant="outline" className="text-[10px] border-red-200 bg-red-50 text-red-700 py-0 h-5 font-black uppercase">ÇIKIŞ</Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="py-2.5">
                                                <div className="text-sm font-bold leading-tight group-hover:text-primary transition-colors">
                                                    {entry.description}
                                                </div>
                                                <div className="text-[10px] text-muted-foreground font-medium uppercase mt-0.5 opacity-60">
                                                    {entry.category}
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-2.5">
                                                <div className="flex items-center gap-2">
                                                    <div className="p-1.5 bg-slate-100 rounded text-slate-500 group-hover:bg-slate-200 transition-colors">
                                                        {entry.source === 'Personel' && <User2 className="h-3 w-3" />}
                                                        {entry.source === 'Müşteri' && <Building2 className="h-3 w-3" />}
                                                        {entry.source === 'Proje' && <Briefcase className="h-3 w-3" />}
                                                        {entry.source === 'Tedarikçi' && <TruckIcon className="h-3 w-3" />}
                                                    </div>
                                                    <div>
                                                        <div className="text-xs font-bold text-slate-700">{entry.entityName || '-'}</div>
                                                        <div className="text-[9px] font-black text-muted-foreground uppercase tracking-wider">{entry.source}</div>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className={cn(
                                                "py-2.5 text-right font-black text-sm font-mono whitespace-nowrap",
                                                entry.type === 'IN' ? "text-emerald-700" : "text-red-700"
                                            )}>
                                                {entry.type === 'OUT' ? '-' : '+'}{formatCurrency(entry.amount)}
                                            </TableCell>
                                            {/* ✅ YENİ: Action Buttons */}
                                            <TableCell className="py-2.5">
                                                <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-blue-600 hover:bg-blue-50"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleEdit(entry);
                                                        }}
                                                        title="Düzenle"
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-red-600 hover:bg-red-50"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDelete(entry);
                                                        }}
                                                        title="Sil"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-64 text-center">
                                            <div className="flex flex-col items-center justify-center space-y-2 opacity-20">
                                                <Wallet className="h-12 w-12" />
                                                <p className="text-sm font-bold uppercase tracking-widest">Henüz kasa hareketi bulunmuyor.</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            </div>
            
            {/* ✅ YENİ: Edit Dialog */}
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent className="sm:max-w-[450px]">
                    <DialogHeader>
                        <DialogTitle>Kasa Kaydını Düzenle</DialogTitle>
                        <DialogDescription>Kasa hareketi bilgilerini güncelleyin.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label>Tutar (TL)</Label>
                            <Input
                                type="number"
                                placeholder="0.00"
                                value={editData.amount}
                                onChange={(e) => setEditData({ ...editData, amount: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Tarih</Label>
                            <Input
                                type="date"
                                value={editData.date}
                                onChange={(e) => setEditData({ ...editData, date: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Açıklama</Label>
                            <Textarea
                                value={editData.description}
                                onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Kategori</Label>
                            <Input
                                value={editData.category}
                                onChange={(e) => setEditData({ ...editData, category: e.target.value })}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditOpen(false)} disabled={updateMutation.isPending}>İptal</Button>
                        <Button onClick={handleEditSubmit} disabled={updateMutation.isPending}>
                            {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Güncelle
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            
            {/* ✅ YENİ: Delete Dialog */}
            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle>Kasa Kaydını Sil</DialogTitle>
                        <DialogDescription>
                            Bu kasa kaydını silmek üzeresiniz. Bu işlem geri alınamaz.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-sm font-bold text-red-700">
                                {selectedEntry?.description}
                            </p>
                            <p className="text-xs text-red-600 mt-1">
                                Tutar: {formatCurrency(selectedEntry?.amount || 0)}
                            </p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} disabled={deleteMutation.isPending}>İptal</Button>
                        <Button variant="destructive" onClick={handleDeleteConfirm} disabled={deleteMutation.isPending}>
                            {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Sil
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

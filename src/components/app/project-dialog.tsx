"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Check, ChevronsUpDown, Search } from 'lucide-react';
import { addOrUpdateProject } from '@/actions/projects';
import { getCustomers } from '@/actions/customers';
import { Project } from '@prisma/client';
import { cn } from "@/lib/utils";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";

// Simplified props, we only need data, not full objects
interface ProjectDialogProps {
    isOpen: boolean;
    onClose: () => void;
    proposalData?: {
        id: string;
        projectName: string;
        customerName: string;
        customerId: string;
        totalAmount: number;
    };
    projectToEdit?: Project;
    onProjectSaved?: (projectId: string) => void;
}

export function ProjectDialog({ isOpen, onClose, proposalData, projectToEdit, onProjectSaved }: ProjectDialogProps) {
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const isEditing = !!projectToEdit;

    // Form States
    const [projectName, setProjectName] = useState('');
    const [status, setStatus] = useState<string>('MONTAJ_VE_IMALAT');
    const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState<string>('');
    const [address, setAddress] = useState('');
    const [notes, setNotes] = useState('');
    const [customerName, setCustomerName] = useState('');
    const [customerId, setCustomerId] = useState('');
    const [customers, setCustomers] = useState<any[]>([]);
    const [openCustomerSelect, setOpenCustomerSelect] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (projectToEdit) {
                setProjectName(projectToEdit.name);
                setStatus((projectToEdit as any).status || 'MONTAJ_VE_IMALAT');
                setStartDate(projectToEdit.startDate ? new Date(projectToEdit.startDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
                setEndDate(projectToEdit.endDate ? new Date(projectToEdit.endDate).toISOString().split('T')[0] : '');
                setAddress(projectToEdit.address || '');
                setNotes(projectToEdit.notes || '');
                // We need customer name on the project model for this to work in edit mode
                setCustomerName((projectToEdit as any).customerName || 'Bilinmiyor');
                setCustomerId(projectToEdit.customerId);
            } else if (proposalData) {
                setProjectName(proposalData.projectName || '');
                setStatus('MONTAJ_VE_IMALAT');
                setStartDate(new Date().toISOString().split('T')[0]);
                setEndDate('');
                setAddress('');
                setNotes('');
                setCustomerName(proposalData.customerName);
                setCustomerId(proposalData.customerId);
            } else {
                // New Project Mode - Fetch Customers
                getCustomers().then(res => {
                    if (res.success && res.data) {
                        setCustomers(res.data);
                    }
                });
            }
        }
    }, [isOpen, projectToEdit, proposalData]);

    const handleSave = async () => {
        if (!projectName.trim()) {
            toast({ variant: 'destructive', title: 'Hata', description: 'Proje adı zorunludur.' });
            return;
        }
        if (!customerId && !proposalData && !projectToEdit) {
            toast({ variant: 'destructive', title: 'Hata', description: 'Lütfen bir müşteri seçiniz.' });
            return;
        }
        setIsSubmitting(true);

        const projectPayload = {
            id: projectToEdit?.id,
            name: projectName,
            status: status,
            startDate: new Date(startDate),
            endDate: endDate ? new Date(endDate) : undefined,
            address: address,
            notes: notes,
            customerId: customerId,
            customerName: customerName,
            contractAmount: projectToEdit?.contractAmount || proposalData?.totalAmount,
            linkedProposalId: proposalData?.id,
        };

        try {
            const result = await addOrUpdateProject(projectPayload as any);
            if (result.success) {
                toast({
                    title: isEditing ? 'Proje Güncellendi' : 'Proje Oluşturuldu',
                    description: `"${projectName}" başarıyla kaydedildi.`,
                });
                if (onProjectSaved && result.data) {
                    onProjectSaved(result.data.id);
                }
                onClose();
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            console.error(error);
            toast({
                variant: 'destructive',
                title: 'Hata',
                description: `İşlem sırasında bir sorun oluştu: ${error.message}`,
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{isEditing ? 'Projeyi Düzenle' : 'Projeye Dönüştür'}</DialogTitle>
                    <DialogDescription>
                        {isEditing ? 'Proje bilgilerini güncelleyin.' : 'Onaylanan bu teklifi takip edilebilir bir projeye dönüştürün.'}
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">Proje Adı</Label>
                        <Input id="name" value={projectName} onChange={(e) => setProjectName(e.target.value)} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="customer" className="text-right">Firma/Cari</Label>
                        {isEditing || proposalData ? (
                            <Input id="customer" value={customerName} disabled className="col-span-3 bg-muted" />
                        ) : (
                            <Popover open={openCustomerSelect} onOpenChange={setOpenCustomerSelect}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        role="combobox"
                                        aria-expanded={openCustomerSelect}
                                        className="col-span-3 justify-between font-normal"
                                    >
                                        {customerName || "Müşteri Seçiniz..."}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[350px] p-0">
                                    <Command>
                                        <CommandInput placeholder="Müşteri ara..." />
                                        <CommandList>
                                            <CommandEmpty>Müşteri bulunamadı.</CommandEmpty>
                                            <CommandGroup>
                                                {customers.map((customer) => (
                                                    <CommandItem
                                                        key={customer.id}
                                                        value={customer.name}
                                                        onSelect={() => {
                                                            setCustomerName(customer.name);
                                                            setCustomerId(customer.id);
                                                            setOpenCustomerSelect(false);
                                                        }}
                                                    >
                                                        <Check className={cn("mr-2 h-4 w-4", customerId === customer.id ? "opacity-100" : "opacity-0")} />
                                                        {customer.name}
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        )}
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="status" className="text-right">Durum</Label>
                        <Select value={status} onValueChange={(val: any) => setStatus(val)}>
                            <SelectTrigger className="col-span-3"><SelectValue placeholder="Durum Seçiniz" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="SOZLESME_ASAMASI">Sözleşme Aşamasında</SelectItem>
                                <SelectItem value="MONTAJ_VE_IMALAT">Montaj ve İmalat (Devam Ediyor)</SelectItem>
                                <SelectItem value="PROJE_TAMAMLANDI">Tamamlandı</SelectItem>
                                <SelectItem value="ASKIYA_ALINDI">Askıya Alındı</SelectItem>
                                <SelectItem value="IPTAL_EDILDI">İptal Edildi</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="start-date" className="text-right">Başlangıç</Label>
                        <Input id="start-date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="end-date" className="text-right">Bitiş (Ops.)</Label>
                        <Input id="end-date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="address" className="text-right">Adres/Konum</Label>
                        <Textarea id="address" value={address} onChange={(e) => setAddress(e.target.value)} className="col-span-3" placeholder="Şantiye adresi veya lokasyon bilgisi..." />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="notes" className="text-right">Notlar</Label>
                        <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} className="col-span-3" placeholder="Proje ile ilgili kısa notlar..." />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isSubmitting}>İptal</Button>
                    <Button onClick={handleSave} disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isEditing ? 'Değişiklikleri Kaydet' : 'Proje Oluştur'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

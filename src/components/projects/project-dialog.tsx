'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { createProject, updateProject } from '@/actions/projects';
import { Loader2, Plus } from "lucide-react";

interface ProjectDialogProps {
    customerId: string;
    project?: any; // If provided, it's edit mode
    trigger?: React.ReactNode;
    onSuccess?: () => void;
}

export function ProjectDialog({ customerId, project, trigger, onSuccess }: ProjectDialogProps) {
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    // Form State
    const [formData, setFormData] = useState({
        name: project?.name || '',
        description: project?.description || '',
        address: project?.address || '',
        status: project?.status || 'Ongoing',
        contractAmount: project?.contractAmount?.toString() || project?.budget?.toString() || '',
        estimatedMaterialCost: project?.estimatedMaterialCost?.toString() || '',
        estimatedLaborCost: project?.estimatedLaborCost?.toString() || ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const payload = {
                name: formData.name,
                description: formData.description,
                address: formData.address,
                status: formData.status,
                contractAmount: formData.contractAmount ? parseFloat(formData.contractAmount) : undefined,
                estimatedMaterialCost: formData.estimatedMaterialCost ? parseFloat(formData.estimatedMaterialCost) : undefined,
                estimatedLaborCost: formData.estimatedLaborCost ? parseFloat(formData.estimatedLaborCost) : undefined,
                customerId
            };

            let result;
            if (project) {
                result = await updateProject(project.id, payload);
            } else {
                result = await createProject(payload);
            }

            if (result.success) {
                toast({
                    title: "Başarılı",
                    description: `Proje ${project ? 'güncellendi' : 'oluşturuldu'}.`,
                });
                setOpen(false);
                onSuccess?.();
                if (!project) {
                    setFormData({ name: '', description: '', address: '', status: 'Ongoing', contractAmount: '', estimatedMaterialCost: '', estimatedLaborCost: '' });
                }
            } else {
                toast({
                    variant: "destructive",
                    title: "Hata",
                    description: result.error,
                });
            }
        } catch (error) {
            console.error(error);
            toast({
                variant: "destructive",
                title: "Hata",
                description: "Bir hata oluştu.",
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        Yeni Proje
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{project ? 'Projeyi Düzenle' : 'Yeni Proje Oluştur'}</DialogTitle>
                    <DialogDescription>
                        {project ? 'Proje detaylarını güncelleyin.' : 'Bu müşteri için yeni bir proje (şantiye) tanımlayın.'}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Proje Adı <span className="text-red-500">*</span></Label>
                        <Input
                            id="name"
                            required
                            placeholder="Örn: Ahmet Bey Villa Şantiyesi"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Açıklama</Label>
                        <Textarea
                            id="description"
                            placeholder="Proje hakkında notlar..."
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="address">Şantiye Adresi</Label>
                        <Textarea
                            id="address"
                            className="resize-none"
                            placeholder="Adres bilgisi..."
                            value={formData.address}
                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="status">Durum</Label>
                            <Select
                                value={formData.status}
                                onValueChange={(val) => setFormData({ ...formData, status: val })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Ongoing">Devam Eden</SelectItem>
                                    <SelectItem value="Completed">Tamamlandı</SelectItem>
                                    <SelectItem value="Cancelled">İptal Edildi</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="contractAmount">Sözleşme Tutarı</Label>
                            <Input
                                id="contractAmount"
                                type="number"
                                placeholder="0.00"
                                value={formData.contractAmount}
                                onChange={(e) => setFormData({ ...formData, contractAmount: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="estimatedMaterialCost">Öngörülen Malzeme Maliyeti</Label>
                            <Input
                                id="estimatedMaterialCost"
                                type="number"
                                placeholder="0.00"
                                value={formData.estimatedMaterialCost}
                                onChange={(e) => setFormData({ ...formData, estimatedMaterialCost: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="estimatedLaborCost">Öngörülen İşçilik Maliyeti</Label>
                            <Input
                                id="estimatedLaborCost"
                                type="number"
                                placeholder="0.00"
                                value={formData.estimatedLaborCost}
                                onChange={(e) => setFormData({ ...formData, estimatedLaborCost: e.target.value })}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>İptal</Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {project ? 'Güncelle' : 'Oluştur'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

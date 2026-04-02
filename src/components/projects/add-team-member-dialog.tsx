'use client';

import React, { useState, useEffect } from 'react';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Users, Search, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getActivePersonnel } from "@/actions/personnel";
import { createJobAssignment } from "@/actions/job-assignments";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface AddTeamMemberDialogProps {
    projectId: string;
    onSuccess: () => void;
}

export function AddTeamMemberDialog({ projectId, onSuccess }: AddTeamMemberDialogProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [personnel, setPersonnel] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const { toast } = useToast();

    // Form settings
    const [selectedPersonnelId, setSelectedPersonnelId] = useState("");
    const [assignedAmount, setAssignedAmount] = useState("");
    const [notes, setNotes] = useState("");

    useEffect(() => {
        if (open) {
            fetchPersonnel();
        }
    }, [open]);

    const fetchPersonnel = async () => {
        setLoading(true);
        const res = await getActivePersonnel();
        if (res.success) {
            setPersonnel(res.data || []);
        }
        setLoading(false);
    };

    const handleAdd = async () => {
        if (!selectedPersonnelId) {
            toast({ variant: "destructive", title: "Hata", description: "Lütfen bir personel seçin." });
            return;
        }

        setLoading(true);
        try {
            const res = await createJobAssignment({
                personnelId: selectedPersonnelId,
                projectId: projectId, // This is technically (data as any).projectId in the action
                assignedAmount: parseFloat(assignedAmount) || 0,
                notes: notes,
                proposalId: "" // Optional now
            } as any);

            if (res.success) {
                toast({ title: "Başarılı", description: "Ekip üyesi projeye eklendi." });
                setOpen(false);
                onSuccess();
                // Reset form
                setSelectedPersonnelId("");
                setAssignedAmount("");
                setNotes("");
            } else {
                toast({ variant: "destructive", title: "Hata", description: res.error });
            }
        } catch (error) {
            toast({ variant: "destructive", title: "Hata", description: "Bir hata oluştu." });
        } finally {
            setLoading(false);
        }
    };

    const filteredPersonnel = personnel.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.role.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Ekip Üyesi Ekle
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Yeni Ekip Üyesi Ata</DialogTitle>
                    <DialogDescription>
                        Bu projede çalışacak bir ekip seçin ve anlaşılan hakediş tutarını girin.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label>Personel / Ekip Seçimi</Label>
                        <Select value={selectedPersonnelId} onValueChange={setSelectedPersonnelId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Personel Seçin" />
                            </SelectTrigger>
                            <SelectContent>
                                {loading && (
                                    <div className="flex items-center justify-center p-4">
                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                        Yükleniyor...
                                    </div>
                                )}
                                {filteredPersonnel.map(p => (
                                    <SelectItem key={p.id} value={p.id}>
                                        <div className="flex flex-col">
                                            <span>{p.name}</span>
                                            <span className="text-[10px] text-muted-foreground">{p.role}</span>
                                        </div>
                                    </SelectItem>
                                ))}
                                {!loading && filteredPersonnel.length === 0 && (
                                    <div className="p-4 text-center text-xs text-muted-foreground">
                                        Personel bulunamadı.
                                    </div>
                                )}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="amount">Anlaşılan Hakediş Tutarı (TL)</Label>
                        <Input
                            id="amount"
                            type="number"
                            value={assignedAmount}
                            onChange={(e) => setAssignedAmount(e.target.value)}
                            placeholder="0.00"
                        />
                        <p className="text-[10px] text-muted-foreground">
                            Bu tutar ekibin hakedişine (alacağına) yazılacaktır.
                        </p>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="notes">Notlar</Label>
                        <Input
                            id="notes"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Örn: Sadece kaba inşaat işçiliği"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>İptal</Button>
                    <Button onClick={handleAdd} disabled={loading}>
                        {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                        Projeye Ekle
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

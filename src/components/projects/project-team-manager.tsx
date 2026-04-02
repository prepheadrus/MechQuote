'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger
} from "@/components/ui/dialog";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
    Users, Plus, CreditCard, History as HistoryIcon, Edit, Trash2,
    CheckCircle2, AlertCircle, Clock, Loader2, Calendar
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { getProjectTeam, deleteProject } from "@/actions/projects";
import { updateJobAssignment, updateJobAssignmentPayment, deleteJobAssignment } from "@/actions/job-assignments";
import { AddTeamMemberDialog } from "./add-team-member-dialog";
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

interface ProjectTeamManagerProps {
    projectId: string;
}

export function ProjectTeamManager({ projectId }: ProjectTeamManagerProps) {
    const [team, setTeam] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();
    const [selectedMember, setSelectedMember] = useState<any>(null);
    const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

    // Form states for editing assignment
    const [editAmount, setEditAmount] = useState("");
    const [editNotes, setEditNotes] = useState("");
    const [editStatus, setEditStatus] = useState("");

    // Form states for adding payment
    const [paymentAmount, setPaymentAmount] = useState("");
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
    const [paymentNote, setPaymentNote] = useState("");

    const fetchTeam = async () => {
        setLoading(true);
        try {
            const res = await getProjectTeam(projectId);
            if (res.success && res.data) {
                setTeam(res.data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTeam();
    }, [projectId]);

    const handleEditAssignment = async () => {
        if (!selectedMember) return;

        try {
            const res = await updateJobAssignment(selectedMember.assignmentId, {
                assignedAmount: parseFloat(editAmount),
                notes: editNotes,
                paymentStatus: editStatus
            });

            if (res.success) {
                toast({ title: "Başarılı", description: "Ekip üyesi bilgileri güncellendi." });
                setIsEditDialogOpen(false);
                fetchTeam();
            } else {
                toast({ variant: "destructive", title: "Hata", description: res.error });
            }
        } catch (error) {
            toast({ variant: "destructive", title: "Hata", description: "Bir hata oluştu." });
        }
    };

    const handleAddPayment = async () => {
        if (!selectedMember) return;

        const newPaymentId = crypto.randomUUID();
        const newPayment = {
            id: newPaymentId,
            amount: parseFloat(paymentAmount),
            date: paymentDate,
            note: paymentNote
        };

        const updatedHistory = [...(selectedMember.paymentHistory || []), newPayment];

        // Calculate status automatically?
        const totalPaid = updatedHistory.reduce((sum, p) => sum + p.amount, 0);
        let newStatus = selectedMember.paymentStatus;
        if (totalPaid >= selectedMember.assignedAmount) {
            newStatus = "Ödendi";
        } else if (totalPaid > 0) {
            newStatus = "Kısmi Ödendi";
        }

        try {
            const res = await updateJobAssignmentPayment(selectedMember.assignmentId, {
                paymentHistory: updatedHistory,
                paymentStatus: newStatus
            });

            if (res.success) {
                toast({ title: "Başarılı", description: "Ödeme kaydı eklendi." });
                setIsPaymentDialogOpen(false);
                setPaymentAmount("");
                setPaymentNote("");
                fetchTeam();
            } else {
                toast({ variant: "destructive", title: "Hata", description: res.error });
            }
        } catch (error) {
            toast({ variant: "destructive", title: "Hata", description: "Bir hata oluştu." });
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(amount || 0);
    };

    if (loading && team.length === 0) {
        return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Ekip Hakediş ve Ödemeleri</CardTitle>
                        <CardDescription>Personel bazlı anlaşılan tutarlar ve ödeme geçmişi</CardDescription>
                    </div>
                    <AddTeamMemberDialog projectId={projectId} onSuccess={fetchTeam} />
                </CardHeader>
                <CardContent className="pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {team.map((member) => {
                            const totalPaid = member.paymentHistory?.reduce((sum: number, p: any) => sum + p.amount, 0) || 0;
                            const remaining = member.assignedAmount - totalPaid;
                            const progress = Math.min((totalPaid / (member.assignedAmount || 1)) * 100, 100);

                            return (
                                <div key={member.id} className="group relative bg-card border rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col">
                                    {/* Header Area */}
                                    <div className="p-4 bg-muted/40 border-b flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary text-lg font-bold border border-primary/20 rotate-3 group-hover:rotate-0 transition-transform">
                                                {member.name.substring(0, 2).toUpperCase()}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-base leading-tight">{member.name}</h3>
                                                <p className="text-[11px] text-muted-foreground uppercase tracking-widest font-semibold mt-0.5">{member.role}</p>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            <div className="flex items-center gap-1">
                                                <Badge variant={
                                                    member.paymentStatus === 'Ödendi' ? 'default' :
                                                        member.paymentStatus === 'Kısmi Ödendi' ? 'secondary' : 'outline'
                                                } className="text-[10px] px-2 py-0">
                                                    {member.paymentStatus || 'Ödenmedi'}
                                                </Badge>
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-red-500">
                                                            <Trash2 className="h-3 w-3" />
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Ekip Üyesini Kaldır</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                <b>{member.name}</b> isimli ekip üyesini bu projeden kaldırmak istediğinize emin misiniz?
                                                                {totalPaid > 0 && (
                                                                    <div className="mt-2 p-2 bg-amber-50 text-amber-900 text-xs rounded border border-amber-200">
                                                                        Dikkat: Bu ekip üyesine toplam <b>{formatCurrency(totalPaid)}</b> ödeme yapılmış.
                                                                        Atamayı silseniz bile bu ödemeler ekibin genel ekstresinde <b>borç</b> olarak kalacaktır.
                                                                    </div>
                                                                )}
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>İptal</AlertDialogCancel>
                                                            <AlertDialogAction
                                                                className="bg-red-600 hover:bg-red-700"
                                                                onClick={async () => {
                                                                    const res = await deleteJobAssignment(member.assignmentId);
                                                                    if (res.success) {
                                                                        toast({ title: "Başarılı", description: "Ekip üyesi kaldırıldı." });
                                                                        fetchTeam();
                                                                    } else {
                                                                        toast({ variant: "destructive", title: "Hata", description: res.error });
                                                                    }
                                                                }}
                                                            >
                                                                Kaldır
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </div>
                                            <div className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                                                <Calendar className="h-3 w-3" />
                                                {member.assignedAt ? new Date(member.assignedAt).toLocaleDateString('tr-TR') : '-'}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Financial Summary */}
                                    <div className="p-5 flex-1 space-y-5">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">Hakediş</span>
                                                <div className="text-lg font-black text-foreground">{formatCurrency(member.assignedAmount)}</div>
                                            </div>
                                            <div className="space-y-1 text-right">
                                                <span className="text-[10px] text-red-500 uppercase font-bold tracking-tighter">Kalan Bakiye</span>
                                                <div className="text-lg font-black text-red-600">{formatCurrency(remaining)}</div>
                                            </div>
                                        </div>

                                        {/* Progress Bar */}
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-[11px] font-bold">
                                                <span className="text-muted-foreground">Ödeme Tamamlanma</span>
                                                <span className="text-primary">{formatCurrency(totalPaid)} (%{Math.round(progress)})</span>
                                            </div>
                                            <div className="h-2 w-full bg-muted rounded-full overflow-hidden border">
                                                <div
                                                    className={cn(
                                                        "h-full transition-all duration-700 ease-in-out",
                                                        progress === 100 ? "bg-green-500" : "bg-primary"
                                                    )}
                                                    style={{ width: `${progress}%` }}
                                                />
                                            </div>
                                            {/* Global Balance Note */}
                                            <div className={cn(
                                                "p-2 rounded-lg text-[10px] font-bold border flex items-center justify-between",
                                                member.balance > 0 ? "bg-red-50 border-red-200 text-red-700" :
                                                    member.balance < 0 ? "bg-green-50 border-green-200 text-green-700" : "bg-muted border-muted text-muted-foreground"
                                            )}>
                                                <span>GENEL MUTABAKAT:</span>
                                                <span>
                                                    {member.balance > 0 ? `${formatCurrency(member.balance)} (Borçlu)` :
                                                        member.balance < 0 ? `${formatCurrency(Math.abs(member.balance))} (Alacaklı)` : '0.00 TL'}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Payment History Miniature */}
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[11px] text-muted-foreground uppercase font-bold flex items-center gap-1">
                                                    <HistoryIcon className="h-3.5 w-3.5" /> Ödeme Geçmişi
                                                </span>
                                            </div>
                                            <div className="space-y-2 max-h-[120px] overflow-y-auto pr-1">
                                                {member.paymentHistory && member.paymentHistory.length > 0 ? (
                                                    [...member.paymentHistory].reverse().map((p: any, idx: number) => (
                                                        <div key={idx} className="flex justify-between items-center p-2 rounded-lg bg-muted/40 border-l-2 border-l-green-500 text-xs shadow-sm">
                                                            <div>
                                                                <div className="font-bold">{formatCurrency(p.amount)}</div>
                                                                <div className="text-[9px] text-muted-foreground">
                                                                    {new Date(p.date).toLocaleDateString('tr-TR')} • {p.note || 'Ödeme'}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="text-[11px] text-muted-foreground italic text-center py-4 bg-muted/20 rounded-lg border border-dashed">
                                                        Henüz ödeme kaydı yok
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="p-4 bg-muted/20 border-t flex gap-2">
                                        <Button
                                            variant="outline"
                                            className="flex-1 h-9 rounded-xl gap-2 font-bold text-xs"
                                            onClick={() => {
                                                setSelectedMember(member);
                                                setIsPaymentDialogOpen(true);
                                            }}
                                        >
                                            <CreditCard className="h-4 w-4" /> Ödeme Ekle
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-9 w-9 rounded-xl hover:bg-primary/10 hover:text-primary transition-colors"
                                            onClick={() => {
                                                setSelectedMember(member);
                                                setEditAmount(member.assignedAmount.toString());
                                                setEditNotes(member.notes || "");
                                                setEditStatus(member.paymentStatus || "Ödenmedi");
                                                setIsEditDialogOpen(true);
                                            }}
                                        >
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>

            {/* Edit Assignment Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Görev Detaylarını Düzenle</DialogTitle>
                        <DialogDescription>{selectedMember?.name} için anlaşılan tutar ve çalışma notları</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="amount">Anlaşılan Toplam Tutar</Label>
                            <Input
                                id="amount"
                                type="number"
                                value={editAmount}
                                onChange={(e) => setEditAmount(e.target.value)}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="status">Ödeme Durumu</Label>
                            <Select value={editStatus} onValueChange={setEditStatus}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Ödenmedi">Ödenmedi</SelectItem>
                                    <SelectItem value="Kısmi Ödendi">Kısmi Ödendi</SelectItem>
                                    <SelectItem value="Ödendi">Ödendi</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="notes">Notlar</Label>
                            <Input
                                id="notes"
                                value={editNotes}
                                onChange={(e) => setEditNotes(e.target.value)}
                                placeholder="Örn: Hafta sonu mesaisi dahil"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>İptal</Button>
                        <Button onClick={handleEditAssignment}>Güncelle</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Payment History & Add Payment Dialog */}
            <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Ödeme İşlemleri</DialogTitle>
                        <DialogDescription>{selectedMember?.name} personeline ait ödeme kayıtları</DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6 py-4">
                        {/* Add New Payment */}
                        <div className="bg-muted/30 p-4 rounded-lg border space-y-3">
                            <h4 className="text-sm font-semibold flex items-center gap-1.5">
                                <Plus className="h-4 w-4" /> Yeni Ödeme Kaydı
                            </h4>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label className="text-xs">Tarih</Label>
                                    <Input
                                        type="date"
                                        value={paymentDate}
                                        onChange={(e) => setPaymentDate(e.target.value)}
                                        className="h-8 text-sm"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs">Tutar</Label>
                                    <Input
                                        type="number"
                                        value={paymentAmount}
                                        onChange={(e) => setPaymentAmount(e.target.value)}
                                        placeholder="0.00"
                                        className="h-8 text-sm"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs">Açıklama</Label>
                                <Input
                                    value={paymentNote}
                                    onChange={(e) => setPaymentNote(e.target.value)}
                                    placeholder="Nakit, havale vb."
                                    className="h-8 text-sm"
                                />
                            </div>
                            <Button className="w-full h-8" size="sm" onClick={handleAddPayment}>
                                Ödemeyi Kaydet
                            </Button>
                        </div>

                        {/* Payment History List */}
                        <div className="space-y-3">
                            <h4 className="text-sm font-semibold flex items-center gap-1.5">
                                <HistoryIcon className="h-4 w-4" /> Ödeme Geçmişi
                            </h4>
                            <div className="max-h-[200px] overflow-y-auto space-y-2 pr-1">
                                {selectedMember?.paymentHistory && selectedMember.paymentHistory.length > 0 ? (
                                    selectedMember.paymentHistory.map((p: any, idx: number) => (
                                        <div key={idx} className="flex justify-between items-center p-2 rounded border text-sm bg-background">
                                            <div>
                                                <div className="font-medium">{formatCurrency(p.amount)}</div>
                                                <div className="text-[10px] text-muted-foreground">
                                                    {new Date(p.date).toLocaleDateString('tr-TR')} • {p.note || 'Açıklama yok'}
                                                </div>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7 text-red-500"
                                                onClick={async () => {
                                                    const updated = selectedMember.paymentHistory.filter((_: any, i: number) => i !== idx);
                                                    const totalPaid = updated.reduce((sum: number, x: any) => sum + x.amount, 0);
                                                    let newStatus = selectedMember.paymentStatus;
                                                    if (totalPaid === 0) newStatus = "Ödenmedi";
                                                    else if (totalPaid < selectedMember.assignedAmount) newStatus = "Kısmi Ödendi";

                                                    const res = await updateJobAssignmentPayment(selectedMember.assignmentId, {
                                                        paymentHistory: updated,
                                                        paymentStatus: newStatus
                                                    });
                                                    if (res.success) {
                                                        toast({ title: "Silindi", description: "Ödeme kaydı kaldırıldı." });
                                                        fetchTeam();
                                                    }
                                                }}
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-6 text-muted-foreground text-sm italic border-2 border-dashed rounded-lg">
                                        Henüz ödeme kaydı bulunmuyor.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

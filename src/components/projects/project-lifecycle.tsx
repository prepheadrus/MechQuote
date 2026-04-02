'use client';

import * as React from 'react';
import { ProjeDurumu } from '@prisma/client';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import {
    CheckCircle2,
    Circle,
    Clock,
    Plus,
    History,
    StickyNote,
    Calendar as CalendarIcon,
    ChevronRight,
    Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { getProjectStatusLabel, getProjectStatusBadge } from '@/lib/formatters';
import { addProjectStatusHistory } from '@/actions/projects';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

interface ProjectStatusHistory {
    id: string;
    status: ProjeDurumu;
    note: string | null;
    date: Date;
    createdAt: Date;
}

interface ProjectLifecycleViewProps {
    projectId: string;
    currentStatus: ProjeDurumu;
    history: ProjectStatusHistory[];
}

export function ProjectLifecycleView({ projectId, currentStatus, history }: ProjectLifecycleViewProps) {
    const { toast } = useToast();
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [newStatus, setNewStatus] = React.useState<ProjeDurumu>(currentStatus);
    const [note, setNote] = React.useState('');
    const [date, setDate] = React.useState<Date>(new Date());

    const allStatuses = Object.values(ProjeDurumu);

    // Sort history by date descending
    const sortedHistory = [...history].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const handleAddHistory = async () => {
        setIsSubmitting(true);
        try {
            const result = await addProjectStatusHistory(projectId, {
                status: newStatus,
                note,
                date
            });

            if (result.success) {
                toast({ title: "Başarılı", description: "Proje aşaması güncellendi." });
                setNote('');
                setDate(new Date());
                router.refresh();
            } else {
                toast({ variant: "destructive", title: "Hata", description: result.error || "İşlem başarısız." });
            }
        } catch (error) {
            toast({ variant: "destructive", title: "Hata", description: "Bir hata oluştu." });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Left Column: Form to update status */}
            <div className="md:col-span-1 space-y-6">
                <Card className="border-primary/20 shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Plus className="h-5 w-5 text-primary" />
                            Aşama Güncelle
                        </CardTitle>
                        <CardDescription>Projenin ilerlemesini kaydedin.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Yeni Aşama</Label>
                            <Select value={newStatus} onValueChange={(val) => setNewStatus(val as ProjeDurumu)}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Durum seçin" />
                                </SelectTrigger>
                                <SelectContent>
                                    {allStatuses.map((s, idx) => (
                                        <SelectItem key={s} value={s}>
                                            <span className="flex items-center justify-between w-full gap-4">
                                                <span>{getProjectStatusLabel(s)}</span>
                                                <span className="text-[10px] opacity-50 uppercase font-bold">Aşama {idx + 1}</span>
                                            </span>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>İşlem Tarihi</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant={"outline"}
                                        className={cn(
                                            "w-full justify-start text-left font-normal",
                                            !date && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {date ? format(date, "d MMMM yyyy", { locale: tr }) : <span>Tarih seçin</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <Calendar
                                        mode="single"
                                        selected={date}
                                        onSelect={(d) => d && setDate(d)}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>

                        <div className="space-y-2">
                            <Label>Not / Açıklama</Label>
                            <Textarea
                                placeholder="Bu aşama hakkında kısa bir not ekleyin..."
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                className="min-h-[100px]"
                            />
                        </div>

                        <Button
                            className="w-full gap-2"
                            onClick={handleAddHistory}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                            Durumu Güncelle
                        </Button>
                    </CardContent>
                </Card>

                <div className="bg-muted/30 p-4 rounded-lg border border-dashed text-xs text-muted-foreground space-y-2">
                    <p className="font-semibold flex items-center gap-1"><Clock className="h-3 w-3" /> Bilgilendirme</p>
                    <p>Proje aşaması güncellendiğinde bu işlem tarihçeye kaydedilir ve projenin genel durumu otomatik olarak güncellenir.</p>
                </div>
            </div>

            {/* Right Column: Timeline */}
            <div className="md:col-span-2">
                <Card className="h-full">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <History className="h-5 w-5 text-muted-foreground" />
                            Proje Akışı & Zaman Çizelgesi
                        </CardTitle>
                        <CardDescription>Projenin başlangıcından bugüne tüm aşama değişimleri.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {sortedHistory.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                <History className="h-12 w-12 opacity-10 mb-4" />
                                <p>Henüz bir aşama kaydı bulunmuyor.</p>
                                <p className="text-xs">Sol taraftaki formdan ilk kaydı oluşturabilirsiniz.</p>
                            </div>
                        ) : (
                            <div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                                {sortedHistory.map((item, index) => (
                                    <div key={item.id} className="relative flex items-start gap-6 group">
                                        {/* Dot */}
                                        <div className={cn(
                                            "absolute left-0 w-10 h-10 rounded-full border-4 border-white flex items-center justify-center z-10 shadow-sm transition-transform group-hover:scale-110",
                                            index === 0 ? "bg-primary" : "bg-slate-100"
                                        )}>
                                            {index === 0 ? (
                                                <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                                            ) : (
                                                <div className="w-2 h-2 rounded-full bg-slate-400" />
                                            )}
                                        </div>

                                        <div className="flex-1 ml-12 pt-1">
                                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-2">
                                                <div className="flex items-center gap-2">
                                                    {getProjectStatusBadge(item.status)}
                                                    {index === 0 && <Badge variant="outline" className="text-[10px] uppercase font-bold text-primary border-primary/20 bg-primary/5">Güncel</Badge>}
                                                </div>
                                                <time className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                                    <CalendarIcon className="h-3 w-3" />
                                                    {format(new Date(item.date), "d MMMM yyyy", { locale: tr })}
                                                </time>
                                            </div>

                                            {item.note && (
                                                <div className="bg-slate-50 border border-slate-100 p-3 rounded-lg text-sm text-slate-600 relative">
                                                    <StickyNote className="h-3 w-3 absolute -top-1.5 -left-1.5 text-slate-300" />
                                                    {item.note}
                                                </div>
                                            )}

                                            {index < sortedHistory.length - 1 && (
                                                <div className="mt-4 flex items-center gap-2 text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                                                    <span className="w-4 h-px bg-slate-200" />
                                                    Önceki Aşama
                                                    <ChevronRight className="h-3 w-3" />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

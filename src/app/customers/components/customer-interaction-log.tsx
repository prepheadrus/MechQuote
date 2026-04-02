
import { useState, useEffect } from 'react';
import { createInteraction, getInteractions } from '@/actions/interactions';
import { CustomerInteraction } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Phone, Mail, StickyNote, Users, Send, Calendar, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { getAvatarFallback } from '@/lib/placeholder-images';

interface CustomerInteractionLogProps {
    customerId: string;
}

const TYPE_ICONS = {
    'note': StickyNote,
    'phone': Phone,
    'email': Mail,
    'meeting': Users,
};

const TYPE_COLORS = {
    'note': 'bg-yellow-100 text-yellow-700 border-yellow-200',
    'phone': 'bg-blue-100 text-blue-700 border-blue-200',
    'email': 'bg-purple-100 text-purple-700 border-purple-200',
    'meeting': 'bg-green-100 text-green-700 border-green-200',
};

const TYPE_LABELS = {
    'note': 'Not',
    'phone': 'Telefon',
    'email': 'E-posta',
    'meeting': 'Toplantı',
};

export function CustomerInteractionLog({ customerId }: CustomerInteractionLogProps) {
    const { toast } = useToast();
    const [newNote, setNewNote] = useState('');
    const [interactionType, setInteractionType] = useState<CustomerInteraction['type'] | 'meeting'>('note');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [interactions, setInteractions] = useState<CustomerInteraction[]>([]);

    const fetchInteractions = async () => {
        const result = await getInteractions(customerId);
        if (result.success) {
            setInteractions(result.data as CustomerInteraction[]);
        }
    };

    useEffect(() => {
        fetchInteractions();
    }, [customerId]);

    const handleAddInteraction = async () => {
        if (!newNote.trim()) return;

        setIsSubmitting(true);
        try {
            const result = await createInteraction({
                customerId,
                content: newNote,
                type: interactionType,
                authorName: 'Siz',
            });
            if (!result.success) throw new Error(result.error);

            setNewNote('');
            fetchInteractions();
            toast({ title: 'Başarılı', description: 'Not eklendi.' });
        } catch (error) {
            console.error('Failed to add interaction:', error);
            toast({ variant: 'destructive', title: 'Hata', description: 'Eklenemedi.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full">
            {/* Left: Input Area */}
            <div className="lg:col-span-1 space-y-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Yeni Etkileşim</CardTitle>
                        <CardDescription>Müşteri ile ilgili not veya görüşme kaydedin.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Etkileşim Türü</label>
                            <Select value={interactionType} onValueChange={(v: any) => setInteractionType(v)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="note"><div className="flex items-center"><StickyNote className="w-4 h-4 mr-2" /> Not</div></SelectItem>
                                    <SelectItem value="phone"><div className="flex items-center"><Phone className="w-4 h-4 mr-2" /> Telefon Görüşmesi</div></SelectItem>
                                    <SelectItem value="email"><div className="flex items-center"><Mail className="w-4 h-4 mr-2" /> E-posta</div></SelectItem>
                                    <SelectItem value="meeting"><div className="flex items-center"><Users className="w-4 h-4 mr-2" /> Toplantı / Ziyaret</div></SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">İçerik</label>
                            <Textarea
                                placeholder="Görüşme detayları, alınan notlar..."
                                className="min-h-[150px] resize-none"
                                value={newNote}
                                onChange={(e) => setNewNote(e.target.value)}
                            />
                        </div>

                        <Button className="w-full" onClick={handleAddInteraction} disabled={isSubmitting || !newNote.trim()}>
                            <Send className="w-4 h-4 mr-2" />
                            Kaydet
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {/* Right: Timeline */}
            <div className="lg:col-span-2">
                <Card className="h-full">
                    <CardHeader>
                        <CardTitle>Geçmiş</CardTitle>
                        <CardDescription>Son etkileşimler ve notlar.</CardDescription>
                    </CardHeader>
                    <CardContent className="px-6 relative">
                        {/* Vertical Line */}
                        <div className="absolute left-9 top-6 bottom-6 w-px bg-slate-200 dark:bg-slate-800" />

                        <div className="space-y-8">
                            {interactions?.map((interaction) => {
                                // Safe icon lookup
                                const Icon = TYPE_ICONS[interaction.type as keyof typeof TYPE_ICONS] || StickyNote;
                                const colorClass = TYPE_COLORS[interaction.type as keyof typeof TYPE_COLORS] || 'bg-slate-100 text-slate-700';
                                const label = TYPE_LABELS[interaction.type as keyof typeof TYPE_LABELS] || 'Not';

                                return (
                                    <div key={interaction.id} className="relative pl-10 group">
                                        {/* Icon Dot */}
                                        <div className={cn(
                                            "absolute left-0 top-0 w-8 h-8 rounded-full flex items-center justify-center border-2 border-white dark:border-slate-950 z-10 shadow-sm transition-transform group-hover:scale-110",
                                            colorClass
                                        )}>
                                            <Icon className="w-4 h-4" />
                                        </div>

                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-semibold text-sm text-slate-900 border px-2 py-0.5 rounded-full bg-slate-50 text-xs">
                                                        {label}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground flex items-center">
                                                        <Clock className="w-3 h-3 mr-1" />
                                                        {format(interaction.createdAt, 'HH:mm')}
                                                    </span>
                                                </div>
                                                <span className="text-xs text-muted-foreground flex items-center">
                                                    <Calendar className="w-3 h-3 mr-1" />
                                                    {format(interaction.createdAt, 'd MMMM yyyy (EEEE)', { locale: tr })}
                                                </span>
                                            </div>

                                            <div className="mt-2 bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                                                {interaction.content}
                                            </div>

                                            <div className="mt-1 flex items-center gap-2">
                                                <Avatar className="h-4 w-4">
                                                    <AvatarFallback className="text-[9px] bg-slate-200">
                                                        {getAvatarFallback(interaction.authorName)}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <span className="text-[10px] text-muted-foreground">
                                                    {interaction.authorName || 'Bilinmeyen'} tarafından eklendi
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}

                            {(!interactions || interactions.length === 0) && (
                                <div className="text-center py-12 text-muted-foreground italic pl-6">
                                    Henüz kayıtlı bir etkileşim yok.
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

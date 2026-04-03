'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Plus, Trash2, Edit, ClipboardList, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import { createTemplate, deleteTemplate, createProposalFromTemplate, type TemplateItem } from '@/actions/templates';
import { getProposalList } from '@/actions/proposals';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useWorkspace } from '@/components/workspace/workspace-context';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

type Template = {
    id: string;
    name: string;
    description: string | null;
    items: any; // JsonValue
    createdAt: Date;
};

export default function TemplatesClientPage({ initialTemplates }: { initialTemplates: Template[] }) {
    const [templates, setTemplates] = useState<Template[]>(initialTemplates);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isUseTemplateOpen, setIsUseTemplateOpen] = useState(false);
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();
    const router = useRouter();
    const { openTab } = useWorkspace();

    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [previewTemplate, setPreviewTemplate] = useState<any>(null);

    const [newTemplate, setNewTemplate] = useState({
        name: '',
        description: '',
        sourceProposalId: ''
    });

    const [useTemplateData, setUseTemplateData] = useState({
        customerId: '',
        projectName: ''
    });

    const [proposals, setProposals] = useState<any[]>([]);

    const handleOpenCreate = async () => {
        setIsCreateOpen(true);
        const result = await getProposalList();
        if (result.success && result.data) {
            setProposals(result.data);
        }
    };

    const handleCreate = async () => {
        if (!newTemplate.name) {
            toast({ variant: 'destructive', title: 'Hata', description: 'Şablon adı zorunludur.' });
            return;
        }
        setIsLoading(true);

        try {
            // Sunucu tarafındaki (Server Action) yeni mantığı kullanıyoruz
            const result = await createTemplate({
                name: newTemplate.name,
                description: newTemplate.description,
                sourceProposalId: newTemplate.sourceProposalId
            });

            if (result.success && result.data) {
                setTemplates([result.data as any, ...templates]);
                setIsCreateOpen(false);
                setNewTemplate({ name: '', description: '', sourceProposalId: '' });
                toast({ title: 'Başarılı', description: 'Şablon başarıyla oluşturuldu.' });
                router.refresh();
            } else {
                toast({ variant: 'destructive', title: 'Hata', description: result.error });
            }
        } catch (error) {
            console.error('Template creation error:', error);
            toast({ variant: 'destructive', title: 'Hata', description: 'Şablon oluşturulurken bir hata oluştu.' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Bu şablonu silmek istediğinize emin misiniz?')) return;

        try {
            const result = await deleteTemplate(id);
            if (result.success) {
                setTemplates(templates.filter(t => t.id !== id));
                toast({ title: 'Başarılı', description: 'Şablon silindi.' });
            } else {
                toast({ variant: 'destructive', title: 'Hata', description: result.error });
            }
        } catch (error) {
            toast({ variant: 'destructive', title: 'Hata', description: 'Bir hata oluştu.' });
        }
    };

    const handleOpenPreview = (template: any) => {
        try {
            const parsed = JSON.parse(template.items);
            const items = Array.isArray(parsed) ? parsed : [];
            setPreviewTemplate({ ...template, parsedItems: items });
            setIsPreviewOpen(true);
        } catch (e) {
            toast({ variant: 'destructive', title: 'Hata', description: 'Şablon içeriği okunamadı.' });
        }
    };

    const handleUseTemplate = async () => {
        if (!useTemplateData.customerId || !useTemplateData.projectName) {
            toast({ variant: 'destructive', title: 'Hata', description: 'Lütfen tüm alanları doldurun.' });
            return;
        }

        setIsLoading(true);
        try {
            const result = await createProposalFromTemplate(
                selectedTemplateId,
                useTemplateData.customerId,
                useTemplateData.projectName
            );

            if (result.success && result.data) {
                toast({ title: 'Başarılı', description: 'Teklif şablondan oluşturuldu.' });
                setIsUseTemplateOpen(false);
                // Open the new proposal
                if (openTab) {
                    openTab(`/quotes/${result.data.id}`, `${result.data.quoteNumber} - ${result.data.projectName}`);
                } else {
                    router.push(`/quotes/${result.data.id}`);
                }
            } else {
                toast({ variant: 'destructive', title: 'Hata', description: result.error });
            }
        } catch (error) {
            toast({ variant: 'destructive', title: 'Hata', description: 'Bir hata oluştu.' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Teklif Şablonları</h1>
                    <p className="text-muted-foreground">Mevcut şablonlarınızı yönetin ve yeni teklifler oluşturun.</p>
                </div>
                <Button onClick={handleOpenCreate}>
                    <Plus className="mr-2 h-4 w-4" /> Yeni Şablon
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {templates.map((template) => {
                    let itemCount = 0;
                    try {
                        const parsed = JSON.parse(template.items);
                        itemCount = Array.isArray(parsed) ? parsed.length : 0;
                    } catch (e) {
                        itemCount = 0;
                    }

                    return (
                        <Card key={template.id} className="flex flex-col">
                            <CardHeader>
                                <div className="flex justify-between items-start">
                                    <div className="space-y-1">
                                        <CardTitle className="text-lg font-bold">{template.name}</CardTitle>
                                        <CardDescription>{template.description || 'Açıklama yok'}</CardDescription>
                                    </div>
                                    <Button variant="ghost" size="icon" onClick={() => handleDelete(template.id)} className="text-destructive h-8 w-8">
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="flex-grow">
                                <div className="flex items-center space-x-2 text-2xl font-bold">
                                    <ClipboardList className="h-6 w-6 text-primary" />
                                    <span>{itemCount} Kalem</span>
                                </div>
                                <p className="text-xs text-muted-foreground mt-2">
                                    {new Date(template.createdAt).toLocaleDateString('tr-TR')} tarihinde oluşturuldu
                                </p>
                            </CardContent>
                            <CardFooter className="flex gap-2 border-t pt-4">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="flex-shrink-0"
                                    onClick={() => handleOpenPreview(template)}
                                >
                                    <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                    className="w-full"
                                    onClick={() => {
                                        setSelectedTemplateId(template.id);
                                        setIsUseTemplateOpen(true);
                                    }}
                                >
                                    <Plus className="mr-2 h-4 w-4" /> Kullan
                                </Button>
                            </CardFooter>
                        </Card>
                    )
                })}
            </div>

            {/* Create Template Dialog */}
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Yeni Şablon Oluştur</DialogTitle>
                        <DialogDescription>
                            Mevcut bir tekliften veya boş bir şablon oluşturun.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="name" className="text-right font-medium">
                                Şablon Adı
                            </Label>
                            <Input
                                id="name"
                                value={newTemplate.name}
                                onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                                className="col-span-3"
                                placeholder="Örn: Standart Kurulum Şablonu"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="description" className="text-right font-medium">
                                Açıklama
                            </Label>
                            <Textarea
                                id="description"
                                value={newTemplate.description}
                                onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
                                className="col-span-3"
                                placeholder="Şablon hakkında kısa bilgi..."
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="source" className="text-right font-medium">
                                Kaynak Teklif
                            </Label>
                            <div className="col-span-3 space-y-2">
                                <Select
                                    value={newTemplate.sourceProposalId}
                                    onValueChange={(val) => {
                                        setNewTemplate({ ...newTemplate, sourceProposalId: val });
                                    }}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Bir teklif seçin (İsteğe bağlı)" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">-- Boş Şablon --</SelectItem>
                                        {proposals.map(p => (
                                            <SelectItem key={p.id} value={p.id}>
                                                {p.quoteNumber} - {p.projectName} ({p.items?.length || 0} Kalem)
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {newTemplate.sourceProposalId && newTemplate.sourceProposalId !== 'none' && (
                                    <p className="text-[11px] text-blue-600 font-medium italic animate-pulse">
                                        ✨ Seçilen teklifte {proposals.find(p => p.id === newTemplate.sourceProposalId)?.items?.length || 0} ürün kalemi tespit edildi.
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateOpen(false)}>İptal</Button>
                        <Button onClick={handleCreate} disabled={isLoading}>
                            {isLoading ? 'Oluşturuluyor...' : 'Şablonu Oluştur'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Use Template Dialog */}
            <Dialog open={isUseTemplateOpen} onOpenChange={setIsUseTemplateOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Şablonu Kullan</DialogTitle>
                        <DialogDescription>
                            Bu şablonu kullanarak yeni bir teklif oluşturun.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="projectName" className="text-right font-medium">
                                Proje Adı
                            </Label>
                            <Input
                                id="projectName"
                                value={useTemplateData.projectName}
                                onChange={(e) => setUseTemplateData({ ...useTemplateData, projectName: e.target.value })}
                                className="col-span-3"
                                placeholder="Yeni projenin adı..."
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="customer" className="text-right font-medium">
                                Müşteri
                            </Label>
                            <div className="col-span-3">
                                <Select
                                    onValueChange={(val) => setUseTemplateData({ ...useTemplateData, customerId: val })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Müşteri seçin..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {templates.length > 0 && (
                                            <div className="p-2 text-xs text-muted-foreground italic">
                                                Lütfen müşteri listesinin yüklenmesini bekleyin...
                                            </div>
                                        )}
                                        {/* Customers are loaded via workspace or common action */}
                                        <SelectItem value="none" disabled>Müşteri listesi yükleniyor...</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsUseTemplateOpen(false)}>İptal</Button>
                        <Button onClick={handleUseTemplate} disabled={isLoading}>
                            {isLoading ? 'Oluşturuluyor...' : 'Teklifi Oluştur'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Preview Dialog */}
            <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
                <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0">
                    <DialogHeader className="p-6 pb-2">
                        <DialogTitle>{previewTemplate?.name} - Şablon İçeriği</DialogTitle>
                        <DialogDescription>
                            Şablonun içindeki ürün kalemleri.
                        </DialogDescription>
                    </DialogHeader>

                    <ScrollArea className="flex-grow px-6 pb-6">
                        <div className="border rounded-md">
                            <table className="w-full text-sm border-collapse">
                                <thead className="bg-muted font-medium sticky top-0 z-10 shadow-sm">
                                    <tr>
                                        <th className="p-3 text-left bg-muted">Grup</th>
                                        <th className="p-3 text-left bg-muted">Ürün / İsim</th>
                                        <th className="p-3 text-left bg-muted">Marka / Model</th>
                                        <th className="p-3 text-right bg-muted">Miktar</th>
                                        <th className="p-3 text-right bg-muted">Liste Fiyatı</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y bg-background">
                                    {previewTemplate?.parsedItems && previewTemplate.parsedItems.length > 0 ? (
                                        previewTemplate.parsedItems.map((item: any, idx: number) => (
                                            <tr key={idx} className="hover:bg-muted/30 transition-colors">
                                                <td className="p-3 text-muted-foreground whitespace-nowrap">{item.groupName || '-'}</td>
                                                <td className="p-3 font-medium">{item.name}</td>
                                                <td className="p-3 text-muted-foreground">{item.brand} {item.model}</td>
                                                <td className="p-3 text-right whitespace-nowrap font-medium">{item.quantity} {item.unit}</td>
                                                <td className="p-3 text-right font-mono whitespace-nowrap">
                                                    {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: item.currency || 'TRY' }).format(item.listPrice)}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={5} className="p-8 text-center text-muted-foreground italic">
                                                Bu şablonda hiç kalem bulunamadı.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </ScrollArea>
                </DialogContent>
            </Dialog>
        </div>
    );
}
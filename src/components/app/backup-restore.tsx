'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Database, Download, Upload, AlertTriangle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRef } from 'react';
import { getFullSystemData, restoreSystemData } from '@/actions/backup';

export function BackupRestore() {
    const { toast } = useToast();
    const [isExporting, setIsExporting] = useState(false);
    const [isRestoring, setIsRestoring] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleExport = async () => {
        setIsExporting(true);
        try {
            // Tam kapsamlı sistem verisini çek (Server Action)
            const res = await getFullSystemData();

            if (!res.success || !res.data) {
                throw new Error(res.error || 'Veriler çekilemedi.');
            }

            const data = res.data;

            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `mechquote-backup-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            toast({ title: 'Yedek İndirildi', description: 'Sunucu veritabanı yedeği başarıyla oluşturuldu.' });
        } catch (error: any) {
            console.error('Export error:', error);
            toast({ variant: 'destructive', title: 'Hata', description: `Yedek oluşturulamadı: ${error.message}` });
        } finally {
            setIsExporting(false);
        }
    };

    const handleRestoreClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const confirmRestore = window.confirm(
            'DİKKAT: Geri yükleme işlemi mevcut tüm verileri silecek ve yedek dosyasındaki verileri yükleyecektir. Bu işlem geri alınamaz. Devam etmek istiyor musunuz?'
        );

        if (!confirmRestore) {
            event.target.value = '';
            return;
        }

        setIsRestoring(true);
        try {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const content = e.target?.result as string;
                    const jsonData = JSON.parse(content);

                    const result = await restoreSystemData(jsonData);

                    if (result.success) {
                        toast({
                            title: 'Başarılı',
                            description: 'Sistem verileri başarıyla geri yüklendi. Sayfa yenileniyor...',
                        });
                        setTimeout(() => window.location.reload(), 2000);
                    } else {
                        toast({
                            variant: 'destructive',
                            title: 'Hata',
                            description: (result as any).error || 'Geri yükleme başarısız oldu.',
                        });
                    }
                } catch (err: any) {
                    toast({
                        variant: 'destructive',
                        title: 'Hata',
                        description: 'Dosya okunurken veya ayrıştırılırken hata oluştu: ' + err.message,
                    });
                } finally {
                    setIsRestoring(false);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                }
            };
            reader.readAsText(file);
        } catch (error: any) {
            console.error('Restore error:', error);
            toast({ variant: 'destructive', title: 'Hata', description: `Geri yükleme başlatılamadı: ${error.message}` });
            setIsRestoring(false);
        }
    };

    return (
        <Card className="border-blue-200 dark:border-blue-800">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                    <Database className="w-5 h-5" />
                    Yedekleme ve Veri Aktarımı
                </CardTitle>
                <CardDescription>
                    Sunucu verilerinizi tam kapsamlı olarak yönetin.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Export Section */}
                    <div className="space-y-4 p-4 border rounded-md bg-slate-50 dark:bg-slate-900/50">
                        <div className="flex items-center gap-2 font-semibold">
                            <Download className="w-5 h-5 text-green-500" />
                            <h3>Verileri Dışa Aktar</h3>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            Tüm sunucu verilerini (Ürünler, Teklifler, Faturalar, Ayarlar vb.) tek bir JSON dosyası olarak indirin.
                        </p>
                        <Button onClick={handleExport} disabled={isExporting} variant="outline" className="w-full">
                            {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                            Yedeği İndir (.json)
                        </Button>
                    </div>

                    {/* Import Section */}
                    <div className="space-y-4 p-4 border rounded-md bg-orange-50/30 dark:bg-orange-950/10">
                        <div className="flex items-center gap-2 font-semibold">
                            <Upload className="w-5 h-5 text-orange-500" />
                            <h3>Verileri Geri Yükle</h3>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            Daha önce aldığınız bir yedeği sisteme geri yükleyin. <strong>Mevcut veriler silinecektir!</strong>
                        </p>
                        <input
                            type="file"
                            accept=".json"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            className="hidden"
                        />
                        <Button
                            onClick={handleRestoreClick}
                            disabled={isRestoring || isExporting}
                            variant="secondary"
                            className="w-full border-orange-200 hover:bg-orange-100 dark:border-orange-900"
                        >
                            {isRestoring ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                            Yedekten Geri Yükle (.json)
                        </Button>
                    </div>
                </div>

                <div className="bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-400 p-3 rounded">
                    <div className="flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-800 dark:text-amber-400">
                            <strong>Dikkat:</strong> Geri yükleme işlemi veritabanını tamamen temizler ve yedek dosyasındaki verileri üzerine yazar.
                            İşlem sırasında internet bağlantınızı kesmeyin ve tarayıcıyı kapatmayın.
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

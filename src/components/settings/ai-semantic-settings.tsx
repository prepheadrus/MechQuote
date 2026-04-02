/**
 * AI Semantic Matching Settings Component
 * Allows users to enable/disable AI-powered semantic matching
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Settings, Sparkles, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from '@/hooks/use-toast';

const STORAGE_KEY = 'mechquote_ai_semantic_enabled';

export function AISemanticSettings() {
    const [open, setOpen] = useState(false);
    const [enabled, setEnabled] = useState(false);
    const [isTesting, setIsTesting] = useState(false);
    const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
    const { toast } = useToast();

    // Load setting from localStorage on mount
    useEffect(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        setEnabled(stored === 'true');
    }, []);

    // Save setting to localStorage
    const handleToggle = (checked: boolean) => {
        setEnabled(checked);
        localStorage.setItem(STORAGE_KEY, checked.toString());
        
        toast({
            title: checked ? "AI Semantic Etkin" : "AI Semantic Devre Dışı",
            description: checked 
                ? "Eş anlamlı kelimeler artık eşleşecek" 
                : "Sadece string matching kullanılıyor",
            duration: 3000,
        });
    };

    // Test AI connection
    const handleTest = async () => {
        setIsTesting(true);
        setTestResult(null);

        try {
            // Simple test: Try to match a common product
            const testProduct = "Çelik Boru";
            const response = await fetch('/api/ai/test-semantic', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ productName: testProduct }),
            });

            const result = await response.json();

            if (result.success) {
                setTestResult('success');
                toast({
                    title: "AI Test Başarılı",
                    description: "Gemini API çalışıyor",
                });
            } else {
                setTestResult('error');
                toast({
                    title: "AI Test Başarısız",
                    description: result.error || "API hatası",
                    variant: "destructive",
                });
            }
        } catch (error) {
            setTestResult('error');
            toast({
                title: "AI Test Başarısız",
                description: "Bağlantı hatası",
                variant: "destructive",
            });
        } finally {
            setIsTesting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                    <Sparkles className="h-4 w-4" />
                    AI Ayarları
                    {enabled && (
                        <Badge variant="default" className="ml-1 bg-green-600">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Aktif
                        </Badge>
                    )}
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5" />
                        AI Semantic Eşleştirme Ayarları
                    </DialogTitle>
                    <DialogDescription>
                        Eş anlamlı kelimeleri anlaması için AI'ı etkinleştirin
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Enable/Disable Toggle */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">AI Semantic Eşleştirme</CardTitle>
                            <CardDescription>
                                Eş anlamlı kelimeleri anlamak için yapay zeka kullan
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between space-x-2">
                                <Label htmlFor="ai-semantic-toggle" className="flex flex-col space-y-1">
                                    <span className="font-normal">
                                        {enabled ? "Etkin" : "Devre Dışı"}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                        {enabled
                                            ? "AI eşleştirme aktif - daha doğru sonuçlar"
                                            : "Sadece string matching - daha hızlı"}
                                    </span>
                                </Label>
                                <Switch
                                    id="ai-semantic-toggle"
                                    checked={enabled}
                                    onCheckedChange={handleToggle}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Benefits */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Faydalar</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <div className="flex items-start gap-2">
                                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                                <p className="text-sm">
                                    <strong>Eş anlamlı kelimeler:</strong> "Çelik Boru" = "Metal Boru"
                                </p>
                            </div>
                            <div className="flex items-start gap-2">
                                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                                <p className="text-sm">
                                    <strong>Kısaltmalar:</strong> "PRC" = "Pirinç", "İST" = "İstanbul"
                                </p>
                            </div>
                            <div className="flex items-start gap-2">
                                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                                <p className="text-sm">
                                    <strong>Yanlış yazımlar:</strong> "Vana" = "Valve"
                                </p>
                            </div>
                            <div className="flex items-start gap-2">
                                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                                <p className="text-sm">
                                    <strong>Doğruluk:</strong> %85-95 → %95-98
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Trade-offs */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Dikkat Edilmesi Gerekenler</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <div className="flex items-start gap-2">
                                <XCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
                                <p className="text-sm">
                                    <strong>Hız:</strong> +10-15 saniye (sadece düşük confidence'da)
                                </p>
                            </div>
                            <div className="flex items-start gap-2">
                                <XCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
                                <p className="text-sm">
                                    <strong>API Kullanımı:</strong> Gemini API kotası kullanır
                                </p>
                            </div>
                            <div className="flex items-start gap-2">
                                <XCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
                                <p className="text-sm">
                                    <strong>Maliyet:</strong> Ücretsiz kota aşımında ücretli
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Test Connection */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Bağlantıyı Test Et</CardTitle>
                            <CardDescription>
                                AI API bağlantısını kontrol et
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-4">
                                <Button
                                    onClick={handleTest}
                                    disabled={isTesting}
                                    variant="outline"
                                >
                                    {isTesting ? (
                                        <>
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            Test Ediliyor...
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="h-4 w-4 mr-2" />
                                            Test Et
                                        </>
                                    )}
                                </Button>
                                {testResult === 'success' && (
                                    <Badge variant="default" className="bg-green-600">
                                        <CheckCircle className="h-3 w-3 mr-1" />
                                        Başarılı
                                    </Badge>
                                )}
                                {testResult === 'error' && (
                                    <Badge variant="destructive">
                                        <XCircle className="h-3 w-3 mr-1" />
                                        Başarısız
                                    </Badge>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* How It Works */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Nasıl Çalışır?</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ol className="space-y-2 text-sm list-decimal list-inside">
                                <li>
                                    <strong>String Matching:</strong> Önce hızlı kelime eşleştirme
                                </li>
                                <li>
                                    <strong>Confidence Check:</strong> Güven &gt; 80%? → Kabul
                                </li>
                                <li>
                                    <strong>AI Fallback:</strong> Güven düşük? → AI'a sor
                                </li>
                                <li>
                                    <strong>AI Match:</strong> Anlamsal eşleşme bul
                                </li>
                                <li>
                                    <strong>Result:</strong> En iyi eşleşmeyi döndür
                                </li>
                            </ol>
                        </CardContent>
                    </Card>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>
                        Kapat
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

/**
 * Invoice AI Settings Component
 * 
 * AI ayarları ve API key yönetimi
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Key, Wand2, RefreshCw, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface InvoiceAISettingsProps {
    useAI: boolean;
    onUseAIChange: (value: boolean) => void;
    useEnsemble: boolean;
    onUseEnsembleChange: (value: boolean) => void;
}

export function InvoiceAISettings({
    useAI,
    onUseAIChange,
    useEnsemble,
    onUseEnsembleChange,
}: InvoiceAISettingsProps) {
    const [showApiKeyDialog, setShowApiKeyDialog] = useState(false);
    const [apiKey, setApiKey] = useState('');
    const [qwenApiKey, setQwenApiKey] = useState('');
    const [glmApiKey, setGlmApiKey] = useState('');
    const [kimiApiKey, setKimiApiKey] = useState('');
    const [deepseekApiKey, setDeepseekApiKey] = useState('');
    const [workingModel, setWorkingModel] = useState('gemini-2.0-flash');
    const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
    const [testMessage, setTestMessage] = useState('');

    const { toast } = useToast();

    // Load API Key from LocalStorage on mount
    useEffect(() => {
        const storedKey = localStorage.getItem('GEMINI_API_KEY');
        const storedQwenKey = localStorage.getItem('QWEN_API_KEY');
        const storedGlmKey = localStorage.getItem('GLM_API_KEY');
        const storedKimiKey = localStorage.getItem('KIMI_API_KEY');
        const storedDeepseekKey = localStorage.getItem('DEEPSEEK_API_KEY');
        const storedModel = localStorage.getItem('GEMINI_MODEL');

        if (storedKey) setApiKey(storedKey);
        if (storedQwenKey) setQwenApiKey(storedQwenKey);
        if (storedGlmKey) setGlmApiKey(storedGlmKey);
        if (storedKimiKey) setKimiApiKey(storedKimiKey);
        if (storedDeepseekKey) setDeepseekApiKey(storedDeepseekKey);
        if (storedModel) setWorkingModel(storedModel);
    }, []);

    const saveApiKey = () => {
        if (apiKey.trim()) localStorage.setItem('GEMINI_API_KEY', apiKey.trim());
        if (qwenApiKey.trim()) localStorage.setItem('QWEN_API_KEY', qwenApiKey.trim());
        if (glmApiKey.trim()) localStorage.setItem('GLM_API_KEY', glmApiKey.trim());
        if (kimiApiKey.trim()) localStorage.setItem('KIMI_API_KEY', kimiApiKey.trim());
        if (deepseekApiKey.trim()) localStorage.setItem('DEEPSEEK_API_KEY', deepseekApiKey.trim());

        localStorage.setItem('GEMINI_MODEL', workingModel);
        setShowApiKeyDialog(false);
        onUseAIChange(true);

        const backups = [];
        if (qwenApiKey) backups.push('Qwen');
        if (glmApiKey) backups.push('GLM-4');
        if (kimiApiKey) backups.push('Kimi');
        if (deepseekApiKey) backups.push('DeepSeek');
        const backupText = backups.length > 0 ? `Yedek: ${backups.join(', ')}` : 'Yedek: Yok';

        toast({ title: "Ayarlar Kaydedildi", description: `AI Modeli: ${workingModel} (${backupText})` });
    };

    const testConnection = async () => {
        if (!apiKey) {
            setTestStatus('error');
            setTestMessage('API Anahtarı girilmedi.');
            return;
        }

        setTestStatus('testing');
        setTestMessage('En uygun model aranıyor ve test ediliyor...');

        // Simple test implementation
        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
            if (response.ok) {
                setTestStatus('success');
                setTestMessage('Bağlantı başarılı!');
            } else {
                setTestStatus('error');
                setTestMessage('API anahtarı geçersiz.');
            }
        } catch (e: any) {
            setTestStatus('error');
            setTestMessage(`Bağlantı hatası: ${e.message}`);
        }
    };

    return (
        <>
            <div className="flex items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-2">
                    <Switch
                        checked={useAI}
                        onCheckedChange={onUseAIChange}
                        id="use-ai"
                    />
                    <Label htmlFor="use-ai" className="cursor-pointer">
                        <div className="flex items-center gap-2">
                            <Wand2 className="h-4 w-4 text-purple-600" />
                            <span className="font-semibold">AI ile Ayrıştır</span>
                        </div>
                    </Label>
                </div>

                {useAI && (
                    <div className="flex items-center gap-2">
                        <Switch
                            checked={useEnsemble}
                            onCheckedChange={onUseEnsembleChange}
                            id="use-ensemble"
                        />
                        <Label htmlFor="use-ensemble" className="cursor-pointer">
                            <div className="flex items-center gap-2">
                                <RefreshCw className="h-4 w-4 text-blue-600" />
                                <span className="font-semibold">Ensemble Mode</span>
                            </div>
                        </Label>
                    </div>
                )}

                {useAI && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowApiKeyDialog(true)}
                        className="gap-2"
                    >
                        <Key className="h-4 w-4" />
                        API Ayarları
                    </Button>
                )}
            </div>

            {/* API Key Dialog */}
            <Dialog open={showApiKeyDialog} onOpenChange={setShowApiKeyDialog}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>AI API Ayarları</DialogTitle>
                        <DialogDescription>
                            API anahtarlarınızı girin ve bağlantıyı test edin.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        {/* Gemini API Key */}
                        <div className="space-y-2">
                            <Label>Gemini API Key</Label>
                            <div className="flex gap-2">
                                <Input
                                    type="password"
                                    value={apiKey}
                                    onChange={(e) => setApiKey(e.target.value)}
                                    placeholder="AIzaSy..."
                                />
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={testConnection}
                                    disabled={testStatus === 'testing'}
                                >
                                    {testStatus === 'testing' ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : testStatus === 'success' ? (
                                        <CheckCircle className="h-4 w-4 text-green-600" />
                                    ) : testStatus === 'error' ? (
                                        <AlertCircle className="h-4 w-4 text-red-600" />
                                    ) : (
                                        <RefreshCw className="h-4 w-4" />
                                    )}
                                </Button>
                            </div>
                            {testMessage && (
                                <p className={`text-xs ${testStatus === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                                    {testMessage}
                                </p>
                            )}
                        </div>

                        {/* Backup API Keys */}
                        <div className="space-y-2">
                            <Label>Yedek API Anahtarları (Opsiyonel)</Label>
                            <Input
                                type="password"
                                value={qwenApiKey}
                                onChange={(e) => setQwenApiKey(e.target.value)}
                                placeholder="Qwen API Key"
                            />
                            <Input
                                type="password"
                                value={glmApiKey}
                                onChange={(e) => setGlmApiKey(e.target.value)}
                                placeholder="GLM API Key"
                            />
                            <Input
                                type="password"
                                value={kimiApiKey}
                                onChange={(e) => setKimiApiKey(e.target.value)}
                                placeholder="Kimi API Key"
                            />
                            <Input
                                type="password"
                                value={deepseekApiKey}
                                onChange={(e) => setDeepseekApiKey(e.target.value)}
                                placeholder="DeepSeek API Key"
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowApiKeyDialog(false)}>
                            İptal
                        </Button>
                        <Button onClick={saveApiKey}>
                            Kaydet
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

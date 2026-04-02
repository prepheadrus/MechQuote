'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Loader2, Play, Square, RefreshCw, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface MLServiceStatus {
  running: boolean;
  url: string;
  pid?: number;
  error?: string;
}

export function MLServiceSettings() {
  const [status, setStatus] = useState<MLServiceStatus>({ running: false, url: '' });
  const [loading, setLoading] = useState(false);
  const [autoStart, setAutoStart] = useState(true);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/ml/status');
      if (!response.ok) {
        throw new Error('Service not available');
      }
      const data = await response.json();
      console.log('[ML Settings] Fetched status:', data);
      setStatus(data);
    } catch (error) {
      console.error('Failed to fetch ML status:', error);
      setStatus({
        running: false,
        url: '',
        error: 'Service not available'
      });
    }
  };

  const handleStart = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/ml/status?action=start', {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error('Failed to start');
      }

      const result = await response.json();

      if (result.success) {
        toast({
          title: 'ML Service Başlatıldı',
          description: 'Python ML service başarıyla başlatıldı',
        });
        fetchStatus();
      } else {
        toast({
          title: 'Başlatılamadı',
          description: result.error || 'Python bulunamadı',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Hata',
        description: 'ML service başlatılamadı',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStop = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/ml/status?action=stop', {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error('Failed to stop');
      }

      await response.json();
      toast({
        title: 'ML Service Durduruldu',
        description: 'Python ML service durduruldu',
      });
      fetchStatus();
    } catch (error) {
      toast({
        title: 'Hata',
        description: 'ML service durdurulamadı',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAutoStartChange = (checked: boolean) => {
    setAutoStart(checked);
    localStorage.setItem('ml-auto-start', checked ? 'true' : 'false');
    toast({
      title: checked ? 'Otomatik Başlatma Açık' : 'Otomatik Başlatma Kapalı',
      description: checked 
        ? 'Uygulama başlarken ML service otomatik başlatılacak' 
        : 'ML service manuel başlatılacak',
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          AI Matching Service
          {status.running && (
            <Badge variant="default" className="gap-1 bg-green-600">
              <CheckCircle2 className="h-3 w-3" />
              Aktif
            </Badge>
          )}
          {!status.running && (
            <Badge variant="secondary" className="gap-1">
              <XCircle className="h-3 w-3" />
              Pasif
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Python ML Service - Akıllı ürün eşleştirme için makine öğrenimi servisi
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Service Durumu</p>
            <p className="text-xs text-muted-foreground">
              {status.running 
                ? `Çalışıyor - ${status.url}` 
                : status.error 
                  ? `Hata: ${status.error}` 
                  : 'Durduruldu'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!status.running && (
              <Button
                size="sm"
                onClick={handleStart}
                disabled={loading}
                className="gap-2"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                Başlat
              </Button>
            )}
            {status.running && (
              <Button
                size="sm"
                variant="destructive"
                onClick={handleStop}
                disabled={loading}
                className="gap-2"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Square className="h-4 w-4" />
                )}
                Durdur
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={fetchStatus}
              disabled={loading}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Yenile
            </Button>
          </div>
        </div>

        {/* Auto-start Toggle */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Otomatik Başlatma</p>
            <p className="text-xs text-muted-foreground">
              Uygulama başlarken ML service otomatik başlatılsın
            </p>
          </div>
          <Switch
            checked={autoStart}
            onCheckedChange={handleAutoStartChange}
          />
        </div>

        {/* Info */}
        <div className="rounded-lg bg-muted p-4 text-sm">
          <p className="font-medium mb-2">ℹ️ Bilgi</p>
          <ul className="space-y-1 text-muted-foreground">
            <li>• Python 3.9+ kurulu olmalıdır</li>
            <li>• ML service yoksa rule-based matching kullanılır</li>
            <li>• Matching accuracy: %90+ (ML) vs %50-60 (rule-based)</li>
            <li>• API Docs: <a href="http://localhost:8001/docs" target="_blank" className="text-primary hover:underline">http://localhost:8001/docs</a></li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Brain, CheckCircle2, XCircle, Edit2, TrendingUp, Database } from 'lucide-react';

interface TrainingStats {
  total: number;
  approved: number;
  corrected: number;
  rejected: number;
  byMethod: Array<{ method: string; _count: number }>;
}

interface RecentFeedback {
  id: string;
  invoiceItemName: string;
  productName: string;
  type: string;
  confidence: number;
  method: string;
  createdAt: string;
}

export function MLTrainingStats() {
  const [stats, setStats] = useState<TrainingStats | null>(null);
  const [recent, setRecent] = useState<RecentFeedback[]>([]);
  const [readyForTraining, setReadyForTraining] = useState(false);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTrainingStats();
    const interval = setInterval(fetchTrainingStats, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchTrainingStats = async () => {
    try {
      const response = await fetch('/api/ml/training-stats');
      const data = await response.json();
      
      setStats(data.stats);
      setRecent(data.recent);
      setReadyForTraining(data.readyForTraining);
      setProgress(data.progress);
    } catch (error) {
      console.error('Failed to fetch training stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            ML Training İstatistikleri
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Brain className="h-4 w-4 animate-spin" />
            Yükleniyor...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            ML Training İstatistikleri
          </CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={fetchTrainingStats}
            className="gap-2"
          >
            <TrendingUp className="h-4 w-4" />
            Yenile
          </Button>
        </div>
        <CardDescription>
          Toplanan training data istatistikleri
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress to Training */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Training Progress</span>
            <Badge variant={readyForTraining ? 'default' : 'secondary'}>
              {readyForTraining ? (
                <>
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Training Ready!
                </>
              ) : (
                <>
                  <Database className="h-3 w-3 mr-1" />
                  {stats?.total || 0}/100 samples
                </>
              )}
            </Badge>
          </div>
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-muted-foreground">
            {readyForTraining
              ? '✅ Model training için yeterli data toplandı!'
              : `📊 ${100 - (stats?.total || 0)} eşleşme daha gerekli`}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Toplam</p>
            <p className="text-2xl font-bold">{stats?.total || 0}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Onaylandı</p>
            <p className="text-2xl font-bold text-green-600">{stats?.approved || 0}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Düzeltildi</p>
            <p className="text-2xl font-bold text-blue-600">{stats?.corrected || 0}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Reddedildi</p>
            <p className="text-2xl font-bold text-red-600">{stats?.rejected || 0}</p>
          </div>
        </div>

        {/* By Method */}
        {stats?.byMethod && stats.byMethod.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Eşleşme Yöntemleri</p>
            <div className="flex flex-wrap gap-2">
              {stats.byMethod.map((m, idx) => (
                <Badge key={idx} variant="outline">
                  {(m.method as string) || 'unknown'}: {m._count}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Recent Feedback */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Son Eşleşmeler</p>
          <ScrollArea className="h-[300px]">
            <div className="space-y-2">
              {recent.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start justify-between p-3 border rounded-lg"
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      {item.type === 'approved' && (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      )}
                      {item.type === 'corrected' && (
                        <Edit2 className="h-4 w-4 text-blue-600" />
                      )}
                      {item.type === 'rejected' && (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )}
                      <p className="text-sm font-medium">{item.invoiceItemName}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      → {item.productName || 'N/A'}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="secondary" className="text-xs">
                        {item.method || 'unknown'}
                      </Badge>
                      <span>Confidence: {(item.confidence * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(item.createdAt).toLocaleString('tr-TR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}
